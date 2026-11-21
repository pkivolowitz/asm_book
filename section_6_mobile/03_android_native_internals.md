# Android Native Internals: bionic, the Linker and JNI

Android apps are mostly Java or Kotlin, but anything performance-sensitive
(codecs, image and font parsing, crypto, game engines, DRM, anti-tamper)
is native ARM64 code in a shared library. Those libraries are the main
memory-corruption attack surface in userland, and the same ARM64 you have been
practising is what you read when you open one.

## Where native code lives

An APK is a zip file. Its native libraries are in `lib/<abi>/`:

```text
unzip -l app.apk | grep '\.so$'
  lib/arm64-v8a/libnative-lib.so
  lib/armeabi-v7a/libnative-lib.so      # 32-bit ARM build, if shipped
```

`arm64-v8a` is the AArch64 build. Platform libraries live on the device in
`/system/lib64`, `/apex/*/lib64` and `/vendor/lib64`. The vendor partition is
where many GPU, camera and modem bugs live.

## bionic is not glibc

Android's C library is **bionic**. The ARM64 instruction set is the same, and
the Linux system call numbers are the same (`write` = 64, `exit` = 93, the
same numbers this book's simulator uses). Other details differ in ways that
matter when you read disassembly or port code:

| Topic | glibc (desktop Linux) | bionic (Android) |
| ----- | --------------------- | ---------------- |
| Dynamic linker | `/lib/ld-linux-aarch64.so.1` | `/system/bin/linker64` |
| Stack canary | global `__stack_chk_guard` | TLS slot read via `tpidr_el0` |
| `errno` | `__errno_location()` | `__errno()` |
| Fortify | `__printf_chk` etc. | `__strlen_chk`, `__memcpy_chk` etc., with Android-specific messages |
| Allocator | ptmalloc | Scudo (Android 11+), jemalloc before |
| Abort messages | stderr | `logcat` and tombstones in `/data/tombstones` |

When a native crash happens on Android, `debuggerd` writes a **tombstone**:
signal, fault address, all registers, a backtrace and memory near the
registers. Reading tombstones fluently is the Android version of reading a
core dump, and it is exactly the skill the simulator's fault messages train.

```text
signal 11 (SIGSEGV), code 1 (SEGV_MAPERR), fault addr 0x0000000000000008
    x0  0000000000000000  x1  0000007fe3a1c2b0  ...
    lr  00000072c4a1b2d4  sp  0000007fe3a1c1e0  pc  00000072c4a1b2e8
backtrace:
    #00 pc 000000000001b2e8  /data/app/.../lib/arm64/libnative-lib.so (parse_header+40)
```

`fault addr 0x8` with `x0 = 0` means "loaded from a NULL struct pointer at
offset 8". The `pc` offset (`0x1b2e8`) is what you look up in the library's
disassembly.

## ELF and the dynamic linker in two minutes

- `readelf -d lib.so` lists `NEEDED` libraries, so you can see what the
  library depends on.
- `readelf -Ws --dyn-syms lib.so` lists exported symbols. JNI functions show
  up here when they are exported by name.
- Calls to other libraries go through the PLT: `adrp x16, ...; ldr x17,
  [x16, ...]; br x17`. That is why x16 and x17 are the intra-procedure-call
  scratch registers (IP0/IP1) in the calling convention.
- Full RELRO makes the GOT read-only after relocation, so it is not a
  writable table of function pointers.

## JNI: how Java calls native code

A Java method declared `native` is implemented in C. Its ARM64 calling
convention is the normal AAPCS64 with two extra leading arguments:

```c
// Java: package com.example; class Parser { native int parse(byte[] data); }
JNIEXPORT jint JNICALL
Java_com_example_Parser_parse(JNIEnv *env, jobject thiz, jbyteArray data);
//                           x0            x1           x2
```

- `x0` = `JNIEnv *`, a pointer to a table of function pointers
  (`GetArrayLength`, `GetByteArrayElements`, `NewStringUTF`, ...);
- `x1` = `this` (or the `jclass` for static methods);
- `x2` onward = the Java arguments.

In disassembly, JNI calls look like loads from the `JNIEnv` table followed
by `blr`:

```text
ldr   x8, [x0]              // x8 = env->functions
ldr   x8, [x8, #0x558]      // one entry of the JNI function table
mov   x1, x2                // the jbyteArray
blr   x8                    // e.g. GetArrayLength(env, data)
```

The offset identifies the function: each entry is 8 bytes, in the order
defined in `jni.h`. Ghidra and other tools can apply the `JNIEnv` type so
these become readable names.

Libraries can also register natives at load time from `JNI_OnLoad` with
`RegisterNatives`, in which case there is no `Java_...` symbol. Find
`JNI_OnLoad`, then follow the `JNINativeMethod` array (name, signature,
function pointer) it passes in.

**Why this matters for research:** every `jbyteArray` or `jstring` that
reaches native code is attacker-influenced input crossing from a memory-safe
language into C. The interesting bugs are in what the native code assumes
about that input: its length, its encoding, and whether lengths stored inside
the data agree with the array's real size.

## Tools

- **Ghidra** (free) or another disassembler: load the `.so`, let it analyze,
  apply `jni.h` types, rename as you understand.
- **`llvm-objdump -d --no-show-raw-insn`** from the NDK, for quick looks.
- **Frida** for dynamic tracing: hook a native function, log its arguments
  and return value, or call it directly with your own inputs. That last ability
  is the bridge to fuzzing in the next chapter.

## Exercises

1. Build a small NDK project (Android Studio's "Native C++" template) with one
   JNI function that takes a `byte[]` and returns its checksum. Find the
   function in the built `.so` and annotate every instruction.
2. Change it to use `RegisterNatives` instead of the `Java_` naming scheme,
   and find it again starting from `JNI_OnLoad`.
3. Hook it with Frida and log every call's array length.
4. Trigger a NULL dereference in it on purpose, pull the tombstone, and
   explain the fault address from the registers alone.
