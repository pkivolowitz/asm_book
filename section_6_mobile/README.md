# Section 6 - Mobile Security Foundations

This section connects the ARM64 material in this book to mobile
vulnerability research: Android and iOS userland, native libraries, fuzzing
and the kernel. It is a **roadmap plus foundations**, written to be read
alongside dedicated courses such as Mobile Hacking Lab's *Android Fuzzing &
Exploitation* and *Android Kernel Fuzzing & Exploitation*, and Low Level
Academy's C, ARM and Ghidra courses.

Phones are ARM64 machines. Almost every serious mobile bug (in a media codec,
a font parser, a GPU driver, binder) is a memory-safety bug in C or C++
compiled for AArch64. Researchers who are effective here share three habits:
they read ARM64 disassembly fluently, they understand what the platform's
mitigations do to a bug, and they find bugs with fuzzers instead of waiting
for luck. Those three habits are what this section and the
[daily practice track](/practice) train.

## The roadmap

Each stage has a checkpoint. Do not move on until you can do the checkpoint
without notes.

| Stage | Focus | Checkpoint |
| ----- | ----- | ---------- |
| 0 | ARM64 fluency: Sections 1-3 of this book plus the **daily practice levels** | Solve every practice level from a blank editor in one sitting |
| 1 | C for systems and RE: the [C course](../c_course/README.md) | Finish both capstones; explain every byte of the binary format you designed |
| 2 | Memory corruption fundamentals: [Section 5](../section_5_exploitation/debugging_with_gdb.md) on a Linux ARM64 VM | Explain, from a crash and a disassembly, which bytes overwrote what |
| 3 | [Lab setup](./01_lab_setup.md) | Run and debug an ARM64 binary under QEMU or on a device, with gdb attached |
| 4 | [ARM64 mitigations](./02_arm64_mitigations.md): PAC, BTI, MTE, canaries, CFI, Scudo | Point at each mitigation in a real Android library's disassembly |
| 5 | [Android native internals](./03_android_native_internals.md): bionic, the linker, JNI | Find the JNI entry points of an app's `.so` and call one with Frida |
| 6 | [Fuzzing native code](./04_fuzzing_native_code.md): libFuzzer, sanitizers, AFL++ | Fuzz the C-course protocol parser, find a planted bug, and minimize the crash |
| 7 | [The kernel path](./05_kernel_path.md): building, booting, syzkaller, KASAN | Boot a KASAN arm64 kernel in QEMU and read a KASAN report end to end |

Stages 6 and 7 are where the Mobile Hacking Lab fuzzing and kernel courses
pick up. The [course prep map](./06_course_prep_map.md) lists, module by
module, what to be able to do before starting each one. Arriving with stages 0-5 done means you spend the course on the
course material instead of on toolchain problems and unreadable disassembly.

## A daily routine that compounds

The routine is small on purpose. A short session every day beats a long one
every two weeks.

1. **10 minutes: one practice level** at [/practice](/practice). New level if
   you have one; otherwise the review the page picks for you, typed from a
   blank editor. This keeps your streak.
2. **20 minutes: read real disassembly.** Pick one function from a real
   ARM64 binary (an Android system library or an app's `lib/arm64-v8a/*.so`)
   and write, in a comment, what it does in C. Name every register's role.
3. **20 minutes: the current stage** of the roadmap above.
4. **Weekly:** write one paragraph about something you got wrong this week.
   That list becomes your personal checklist.

## How to tell you are on track

- You can predict NZCV after `cmp`/`subs` without running the code, including
  signed versus unsigned conditions (`b.lt` versus `b.lo`).
- You recognize a function prologue/epilogue, a PAC-protected return
  (`paciasp`/`autiasp`), a stack-canary check and a jump table at a glance.
- Given a crash (fault address, PC, registers), you can say which instruction
  faulted and why, before opening a debugger.
- You can write a fuzzing harness for a function you have never seen, in under
  an hour.

## Chapters

| Chapter | Markdown |
| ------- | -------- |
| 0 | [Roadmap (this page)](./README.md) |
| 1 | [Building a mobile research lab](./01_lab_setup.md) |
| 2 | [ARM64 mitigations: PAC, BTI, MTE and friends](./02_arm64_mitigations.md) |
| 3 | [Android native internals: bionic, the linker and JNI](./03_android_native_internals.md) |
| 4 | [Fuzzing native code](./04_fuzzing_native_code.md) |
| 5 | [The kernel path](./05_kernel_path.md) |
| 6 | [Course prep map: Mobile Hacking Lab and Low Level Academy, module by module](./06_course_prep_map.md) |

All testing described here is meant for your own code, your own devices,
emulators, and deliberately vulnerable training targets. Apps and services you
do not own are only in scope under a bug bounty or written permission.
