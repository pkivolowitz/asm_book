# Course Prep Map: Mobile Hacking Lab and Low Level Academy

This chapter maps each module of the courses you are preparing for onto the
parts of this book, the [practice levels and C labs](/practice), and the
skills you should be able to demonstrate **before** you start that module.
The module lists come from the public course pages (Mobile Hacking Lab:
*Android Fuzzing & Exploitation* and *Android Kernel Fuzzing &
Exploitation*; Low Level Academy: *Fundamentals of C Programming v2*), so
check them for changes.

Use it like a checklist. If you cannot do the "ready when" column without
notes, spend another week on the "prepare with" column first. The paid
courses then go much further, faster.

## Low Level Academy: Fundamentals of C Programming v2

The course runs from Getting Started to a hash-table key-value store built in
five graded labs. The C labs here follow the same arc with different
exercises, so you get a second set of reps on every topic.

| Course section | Prepare with (this book) | Ready when you can... |
| -------------- | ------------------------ | --------------------- |
| Getting Started, Variables and Types | C labs 01-03; [C course 01-02](../c_course/01_machine_model_tooling.md) | explain why `printf("%d", long_value)` prints garbage on ARM64 (which register it reads) |
| Control Flow and Functions | C labs 04-05; [C course 03](../c_course/03_control_flow_stack_frames.md) | write a `switch` with grouped cases and predict its compiled branches |
| Arrays, Pointers and Strings | C labs 06-08; [C course 04-05](../c_course/04_pointers_and_memory.md) | fix an off-by-one from an AddressSanitizer report alone |
| Structs and Memory Management | C labs 09-11; [C course 06-07](../c_course/06_structs_unions_alignment.md) | say who owns every allocation in a program, and prove it with a clean leak check |
| The Standard Library, File I/O | C lab 12; [C course 09](../c_course/09_posix_system_calls.md) | handle every error path of `fopen`/`read` and report it with `perror` |
| Multi-File Programs and Build Systems | C sandbox multi-file samples; [C course 10](../c_course/10_preprocessor_makefiles_libs.md) | split a program into `.h`/`.c` with include guards and fix "undefined reference" errors |
| Project: A Key-Value Store | C labs 14-15; [Capstone 1](../c_course/11_capstone_kv_store.md) | implement linear probing with tombstones and explain why deletion needs them |

Low Level Academy teaches on x86-64. Everything here compiles to ARM64, so
you see the same C on both architectures. Comparing them is the fastest
way to understand calling conventions.

## Mobile Hacking Lab: Android Fuzzing & Exploitation (Part 1: RE & Fuzzing)

| Module | Prepare with | Ready when you can... |
| ------ | ------------ | --------------------- |
| Lab setup (VM, NDK, device) | [Lab setup](./01_lab_setup.md) | build with the NDK, `adb push`, run from `/data/local/tmp`, and attach a debugger |
| 1. Android security (sandbox, permissions, Binder, SELinux, verified boot) | [Native internals](./03_android_native_internals.md); Android docs on the platform security model | explain what an app's UID and SELinux domain stop it from doing |
| 2. ARM assembly (registers, stack, calling convention, branching, shellcode) | Sections 1-3; **ARM64 levels 1-19**; [Section 5 shellcode](../section_5_exploitation/writing_arm64_shellcode.md) | solve every practice level from a blank editor; hand-write a function with a correct frame |
| 3. Reverse engineering native components (Ghidra, NDK, JADX, Frida) | [Native internals](./03_android_native_internals.md); level 19 (reverse the check); C sandbox Assembly tab | find a JNI function in a `.so` and describe its arguments from the disassembly |
| 4. Fuzzing and crash analysis (libFuzzer, AFL++ QEMU/Frida modes, structure-aware fuzzing) | [Fuzzing native code](./04_fuzzing_native_code.md); C lab 13 (untrusted header) | write a harness for a parser, find a planted bug, and minimize the crash |

## Mobile Hacking Lab: Android Fuzzing & Exploitation (Part 2: Userland Exploitation)

Part 2 turns crashes into exploits. The foundation it assumes is a precise
mental model of memory: stack frames, saved registers, allocator behaviour
and mitigations.

| Module | Prepare with | Ready when you can... |
| ------ | ------------ | --------------------- |
| 1. Exploitation lab and tools (gdb, GEF, Ropper) | [Debugging with GDB](../section_5_exploitation/debugging_with_gdb.md); [Lab setup](./01_lab_setup.md) | remote-debug an ARM64 process and inspect its memory map |
| 2. Memory info leaks | C lab 13; [Process memory](../section_5_exploitation/process_memory_corruption.md) | explain why one leaked pointer defeats ASLR for a whole library |
| 3. Stack overflows with ASLR + NX | [Section 5 stack chapters](../section_5_exploitation/stack_overflow.md); levels 14-15 (frames, saved x30); [mitigations](./02_arm64_mitigations.md) | draw an ARM64 stack frame and say exactly where x29/x30 are saved and why PAC changes things |
| 4. Userland heap (jemalloc) | [Glibc heap chapters](../section_5_exploitation/heap_glibc_implementation.md) for concepts; C labs 09-11 | explain size classes, and why use-after-free bugs depend on what is allocated next |
| 5. Userland heap (Scudo) | [Mitigations: Scudo](./02_arm64_mitigations.md#the-allocator-scudo) | list what Scudo checks (headers, double free, quarantine) and what it does not |

## Mobile Hacking Lab: Android Kernel Fuzzing & Exploitation

| Module | Prepare with | Ready when you can... |
| ------ | ------------ | --------------------- |
| Kernel fundamentals (emulation, user/kernel space, memory management, drivers, debugging, page and slab allocators) | [The kernel path](./05_kernel_path.md) | build an arm64 kernel, boot it in QEMU, and attach gdb |
| Vulnerability discovery: KASAN, syzkaller (black box and white box), LKL | [The kernel path](./05_kernel_path.md) (planted-bug module plus syzkaller) | read a KASAN report and name the bug class, the object cache and the faulting function |
| RE and vulnerability discovery (kernel modules, real CVEs) | Level 19; the C sandbox Assembly tab; public syzbot reports | read a kernel module's `ioctl` handler in a disassembler and list its inputs |
| Kernel exploit mitigations (KASLR, isolation, heap protections, PAN/UXN/PXN, PAC and CFI) | [ARM64 mitigations](./02_arm64_mitigations.md); [kernel path](./05_kernel_path.md) | explain each mitigation in one sentence and say which bug classes it does not stop |
| Exploitation techniques | Everything above | take the course |

## The daily routine, mapped

- **Weeks 1-6:** ARM64 levels plus C labs 01-08, one each per day. Read Sections 1-3 and the C course alongside.
- **Weeks 7-10:** C labs 09-17 (memory ownership, untrusted input, hash tables), Section 5 on a Linux ARM64 VM, and the [lab setup](./01_lab_setup.md).
- **Weeks 11-14:** [mitigations](./02_arm64_mitigations.md), [native internals](./03_android_native_internals.md), [fuzzing](./04_fuzzing_native_code.md). Fuzz your own C lab solutions: the harness from the fuzzing chapter works on lab 13.
- **Then:** MHL Part 1, MHL Part 2, then the kernel course, with [The kernel path](./05_kernel_path.md) as warm-up.

Keep the daily review going through all of it. One practice level from
memory each day keeps the fundamentals fresh while the courses add depth.
