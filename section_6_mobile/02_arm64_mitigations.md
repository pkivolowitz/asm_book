# ARM64 Mitigations: PAC, BTI, MTE and Friends

A memory-safety bug on a modern phone does not exist on its own. It lives
inside layers of hardware and software mitigations, and most of the work in
mobile vulnerability research is understanding those layers. This chapter
explains what each mitigation does, what it looks like in ARM64 disassembly,
and how it shows up when something goes wrong.

You can try pointer authentication yourself in the simulator: practice level
**"Sign the return address (PAC)"**.

## Quick reference: how to recognize them

| Mitigation | Architecture / platform | What you see in disassembly |
| ---------- | ----------------------- | --------------------------- |
| Pointer Authentication (PAC) | ARMv8.3+. iOS arm64e everywhere; recent Android builds for return addresses | `paciasp` ... `autiasp; ret`, or `retaa`; `blraa`/`braa`; `pacia`/`autda` on data pointers (iOS) |
| Branch Target Identification (BTI) | ARMv8.5+ | `bti c` / `bti j` / `bti jc` at function starts and jump-table targets |
| Memory Tagging (MTE) | ARMv8.5+. Shipping on Pixel 8 and later | `irg`, `stg`, `st2g`, `addg`/`subg`, tagged pointers (top byte not zero) |
| Stack canaries | Compiler (`-fstack-protector-strong`) | Load from TLS (bionic) or `__stack_chk_guard` (glibc), compare in the epilogue, `bl __stack_chk_fail` |
| ShadowCallStack | Clang, used by Android | `str x30, [x18], #8` in the prologue, `ldr x30, [x18, #-8]!` in the epilogue |
| Control-flow integrity (CFI, kCFI) | Clang; Android media stack and kernel | Type-hash checks before indirect calls, branching to a trap on mismatch |
| Hardened allocator (Scudo) | Android 11+ default allocator | Not visible in your code: aborts with "corrupted chunk header" and similar messages |
| ASLR, NX, PIE, RELRO | Everywhere | Position-independent code (`adrp`/`add`), no writable+executable pages |

## Pointer Authentication (PAC)

A 64-bit pointer has more bits than the virtual address needs. On a system
with 39- or 48-bit virtual addresses, the unused upper bits can hold a
**pointer authentication code**: a short cryptographic MAC computed from the
pointer, a 64-bit *modifier* (context) and a secret per-process key that
software cannot read.

```text
func:
    paciasp                     // sign x30 with key IA, modifier = sp
    stp     x29, x30, [sp, #-16]!
    mov     x29, sp
    ...
    ldp     x29, x30, [sp], #16
    autiasp                     // verify x30 with the same key and modifier
    ret
```

- `paciasp` replaces the upper bits of `x30` with a PAC.
- `autiasp` recomputes it. If the pointer or the modifier (`sp`) changed, the
  result is a **non-canonical** pointer (on CPUs without FEAT_FPAC), so `ret`
  faults. With FEAT_FPAC the `aut` instruction faults immediately.
- `paciasp`/`autiasp` are encoded in the HINT space, so older CPUs execute
  them as NOPs. A binary built with PAC still runs on ARMv8.0 hardware, just
  without the protection. `retaa` is **not** a hint and faults on CPUs without
  PAC.

What this means for a memory-corruption bug: overwriting a saved return
address with a chosen value is no longer enough, because the value also has
to carry a valid PAC for that exact stack position. This is why PAC-era
research focuses on other things: data-only corruption, signing gadgets,
pointers that are left unsigned, and leaks of already-signed pointers.

**iOS (arm64e)** goes much further than return addresses. It signs function
pointers, C++ vtable pointers, Objective-C method caches and some data
pointers, with different keys (IA, IB, DA, DB, GA) and modifiers that include
the storage address. Seeing `blraa x8, x9` or `autda` in an iOS binary is
normal.

**In the simulator:** after `paciasp`, look at the top 16 bits of X30 in the
register view. Corrupt X30 before `autiasp` and the program faults with a
"non-canonical address" message, the same failure you would see in a real
crash log.

## Branch Target Identification (BTI)

BTI restricts where indirect branches (`br`, `blr`) may land. In pages mapped
as *guarded*, an indirect branch must land on a `bti` instruction of the
right kind, or the CPU raises a fault:

- `bti c`: valid target for calls (`blr`), and for `br x16`/`br x17`;
- `bti j`: valid target for jumps (`br`), for example jump-table cases;
- `bti jc`: both.

`paciasp` also acts as an implicit `bti c`, so PAC-protected functions often
have no separate `bti` at their start. Together, PAC and BTI make
return-oriented and jump-oriented techniques much harder: you can no longer
jump into the middle of a function.

## Memory Tagging Extension (MTE)

MTE attaches a 4-bit **tag** to every 16-byte granule of memory, and puts a
4-bit tag in bits 56-59 of pointers (which works because of Top Byte Ignore).
Every load and store compares the two. A mismatch is a tag check fault,
reported synchronously (precise, slower) or asynchronously (cheap, reported
later).

```text
irg     x0, x0          // insert a random tag into pointer x0
stg     x0, [x0]        // set the memory tag of the granule at x0
```

Allocators retag memory on `free` and on reuse, so a dangling pointer to a
freed or reallocated chunk usually carries the wrong tag. That turns many
use-after-free and linear overflow bugs into immediate crashes with a precise
report. Android uses MTE through its Scudo allocator on supported hardware;
on Pixel 8 and later it can be enabled from Developer Options.

When reading crash logs from such devices, a `SEGV_MTESERR` (synchronous) or
`SEGV_MTEAERR` (asynchronous) signal code means an MTE tag mismatch, not a
classic unmapped-address fault.

## Stack canaries

```text
// bionic (Android): the canary lives in thread-local storage
mrs     x8, tpidr_el0
ldr     x8, [x8, #0x28]       // TLS slot for the stack guard
str     x8, [sp, #0x38]       // store it below the saved frame
...
ldr     x9, [sp, #0x38]
mrs     x8, tpidr_el0
ldr     x8, [x8, #0x28]
cmp     x8, x9
b.ne    .Lfail                // -> bl __stack_chk_fail
```

glibc on Linux reads the canary from the global `__stack_chk_guard` instead
of TLS. Either way, a linear overflow that reaches the saved registers has to
pass through the canary first. `__stack_chk_fail` aborts with
`stack smashing detected` (glibc) or `stack corruption detected` (bionic).
The simulator models the glibc form when compiler output references
`__stack_chk_guard`.

## ShadowCallStack and x18

Android builds parts of the platform (and the kernel) with Clang's
ShadowCallStack. Return addresses are pushed to a separate stack pointed to by
**x18**, whose location is not known to an attacker who can only write to the
normal stack. This is one reason the AAPCS64 calls x18 the *platform
register*. Android and iOS reserve it, so portable code must not use x18.

## Control-flow integrity (CFI)

Clang CFI and the kernel's kCFI check, before each indirect call, that the
target's type matches the call site's expected function type (a hash stored
beside the function). An attacker who controls a function pointer can then
only redirect it to functions with a compatible signature. Android enables
CFI in security-sensitive components such as the media stack, and kCFI in its
kernels.

## The allocator: Scudo

Android's default native allocator (Android 11 and later) is **Scudo**, not
glibc's ptmalloc, so the glibc heap techniques in
[Section 5](../section_5_exploitation/heap_glibc_implementation.md) do not
transfer directly. Scudo:

- separates allocations into size-class regions, with randomized placement;
- keeps a checksummed header in front of each chunk and aborts on
  corruption, invalid `free`, double `free` or size mismatch;
- can delay reuse of freed chunks (quarantine) and integrates with MTE.

Older Android versions used jemalloc, and iOS uses its own allocators
(libmalloc zones, and `kalloc_type` in the kernel). Learning *what each
allocator checks* is more useful than memorizing any single technique.

## Exercises

1. Solve the PAC practice level. Then make it fail on purpose three
   different ways (modify x30, change sp between sign and auth, sign with
   `pacibsp` and authenticate with `autiasp`) and read each fault message.
2. Disassemble a system library from an Android device
   (`adb pull /system/lib64/libc.so`, then `llvm-objdump -d`) and find one
   example each of `paciasp`, `bti`, and a stack-canary check.
3. In your own C code, compile the same function with and without
   `-mbranch-protection=standard` and `-fstack-protector-strong`, and diff the
   disassembly.
