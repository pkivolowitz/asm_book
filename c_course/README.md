# C Programming for Reverse Engineering & Systems Programming

> **Welcome to the C Systems & Reverse Engineering Course!**
> 
> Inspired by [Low Level Academy](https://lowlevel.academy/) and professional vulnerability research practices, this course teaches you the C programming language from the ground up—not just as high-level syntax, but as the direct abstraction over machine hardware, memory, and CPU execution.

---

## Why Learn C for Reverse Engineering?

Every reverse engineer, security researcher, and low-level developer eventually confronts an unavoidable reality:
* **Operating Systems are written in C:** The Linux kernel, macOS XNU, Windows NT, and embedded firmware are all authored in C.
* **Compilers target C semantics:** When IDA Pro, Ghidra, or Binary Ninja decompile stripped machine code, their output is pseudo-C. If you don't know C memory models, pointer arithmetic, and struct layouts inside and out, reading decompilation is like reading a foreign language without a dictionary.
* **Vulnerabilities stem from C semantics:** Memory corruption bugs (buffer overflows, integer overflows, use-after-free, type confusion) exist because C provides raw access to pointers and memory without automatic safety checks.

---

## Course Curriculum

| Module | Title | Core Focus |
|---|---|---|
| **01** | [The Machine Model, Tooling & Compilation Pipeline](./01_machine_model_tooling.md) | GCC stages (`-E`, `-S`, `-c`), `objdump`, `readelf`, ELF binary layout |
| **02** | [Data Types, Memory Representation & Bitwise Logic](./02_types_memory_bitwise.md) | Two's complement, Endianness, IEEE 754 floats, Bitwise masking, Integer overflow |
| **03** | [Control Flow, Stack Frames & Calling Conventions](./03_control_flow_stack_frames.md) | If/else branching, Jump tables, Stack layout, AAPCS & System V ABI |
| **04** | [Pointers, Memory Addressing & Pointer Arithmetic](./04_pointers_and_memory.md) | Dereferencing, Pointer arithmetic, Array decay, Void pointers, Type punning |
| **05** | [Strings, Buffers & Memory Safety](./05_strings_and_memory_safety.md) | Null-terminated byte arrays, Buffer overflows, Format string vulnerabilities |
| **06** | [Structs, Unions, Alignment & Data Structures](./06_structs_unions_alignment.md) | Alignment rules, Struct padding, `#pragma pack`, Reversing unknown structs |
| **07** | [Dynamic Memory & Heap Internals](./07_heap_dynamic_memory.md) | `malloc`/`free`, Heap chunks, Memory leaks, Double-free, Use-After-Free (UAF) |
| **08** | [Function Pointers, Callbacks & Dynamic Dispatch](./08_function_pointers_callbacks.md) | Function pointers, Callbacks, C vtables, Indirect branch hijacking |
| **09** | [POSIX Systems Programming & System Calls](./09_posix_system_calls.md) | Kernel boundary, File descriptors, `open`/`read`/`write`, `stat`, `errno` |
| **10** | [How a C Program Is Built](./10_preprocessor_makefiles_libs.md) | Separate compilation, headers, the preprocessor and `-D`, static and shared libraries, Make, and what instrumenting a fuzzing target means |
| **11** | [Capstone 1: In-Memory Key-Value Store](./11_capstone_kv_store.md) | Hash tables, Linear probing, Tombstones, Valgrind leak checking |
| **12** | [Capstone 2: Binary File Header Parser & CLI Tool](./12_capstone_binary_protocol_parser.md) | Magic bytes, Protocol serialization, `getopt()`, Binary reversing |

---

## Interactive Practice

Each lesson in this course includes:
1. **Under the Hood / Disassembly Insights:** Side-by-side analysis of how the C code compiles into ARM64 and x86_64 assembly.
2. **Reverse Engineering Takeaways:** Real-world vulnerability patterns and how decompilers interpret the code.
3. **Interactive Exercises & Challenges:** Hands-on exercises you can practice and test directly.
