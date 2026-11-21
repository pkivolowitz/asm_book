# Building a Mobile Research Lab

Most of the time lost when starting mobile research goes to the environment,
not the material. This chapter lists the setups that work and, more
importantly, **the specific ways each one fails**, so a problem takes
minutes to diagnose instead of an evening.

## Pick your host

| Host | ARM64 userland (run/debug ARM64 Linux binaries) | Android emulator with ARM64 system image | Cuttlefish / kernel work |
| ---- | ------------------------------------------------ | ---------------------------------------- | ------------------------ |
| Windows x86-64 + WSL2 | Yes: `qemu-user` inside WSL2 | No native ARM64 images; x86_64 images only | Possible in WSL2 with nested virtualization, often painful |
| Linux x86-64 | Yes: `qemu-user` | No; x86_64 images only | Yes, the supported host for Cuttlefish |
| Apple Silicon Mac | Yes: native, in a Linux VM (UTM, Lima, OrbStack) | Yes: native ARM64 images | Linux VM, no KVM-accelerated Cuttlefish |
| ARM64 Linux (Raspberry Pi 5, ARM cloud VM) | Yes: native | Depends on KVM support | Yes, on ARM64 hosts with KVM |
| Physical Android phone | Yes: real hardware | n/a | Kernel work needs an unlockable bootloader |

**The edge case that catches most people:** on an x86-64 host, the Android
emulator does not offer ARM64 system images. x86_64 images run ARM apps
through a translation layer, so an app's `lib/arm64-v8a/*.so` executes, but
under translation: you cannot single-step its ARM64 instructions the way you
would on hardware. For native-code work on an x86 host, use `qemu-user` for
Linux-style binaries and a **physical ARM64 device** (any used Pixel is a good
choice) for real Android behaviour.

## Stage 1: run and debug ARM64 Linux binaries (any host)

On Windows, do all of this inside WSL2 (Ubuntu), not in PowerShell.

```text
sudo apt update
sudo apt install gcc-aarch64-linux-gnu qemu-user qemu-user-static gdb-multiarch
```

Build and run:

```text
aarch64-linux-gnu-gcc -g -static -o hello hello.c
qemu-aarch64 ./hello
```

Debug: start the program paused with a gdb stub, then attach from a second
terminal.

```text
qemu-aarch64 -g 1234 ./hello            # terminal 1: waits for gdb
gdb-multiarch ./hello                   # terminal 2
(gdb) target remote localhost:1234
(gdb) break main
(gdb) continue
```

This is the same workflow pwn.college's ARM dojo uses on its x86-64 machines.

### Why it fails

- **`qemu-aarch64: Could not open '/lib/ld-linux-aarch64.so.1'`**: you built a
  dynamic binary and the ARM64 loader is not where QEMU looks. Either build
  with `-static`, or point QEMU at the cross sysroot:
  `qemu-aarch64 -L /usr/aarch64-linux-gnu ./hello`.
- **gdb shows x86 registers or garbage**: you ran plain `gdb`, not
  `gdb-multiarch`, or gdb did not get the binary path. Pass the binary to
  `gdb-multiarch` and run `set architecture aarch64` if needed.
- **`Connection refused` on `target remote`**: QEMU was not started with
  `-g 1234`, or it has already exited. Start QEMU first; it should hang
  waiting for the debugger.
- **Breakpoints never hit with PIE binaries**: in user-mode QEMU the load base
  can differ from what gdb assumes. Break on a symbol (`break main`) rather
  than a raw address, or build with `-no-pie` while learning.
- **Files under `/mnt/c/...` are slow, or execute bits get lost**: work inside
  the WSL filesystem (`~/lab`), not on the Windows drive.
- **`exec format error` running the binary directly**: binfmt_misc is not
  registered for ARM64. Run it through `qemu-aarch64` explicitly, or install
  `qemu-user-static` and `binfmt-support`.

## Stage 2: Android tooling

Install the Android SDK platform-tools (`adb`) and the **NDK**. The NDK gives
you clang targeting Android plus the sysroot with bionic's headers.

```text
$NDK/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android34-clang -g -o hello hello.c
adb push hello /data/local/tmp/
adb shell /data/local/tmp/hello
```

The number in `aarch64-linux-android34-clang` is the minimum API level. Use
one no higher than the Android version on your device.

### Why it fails

- **`adb: no devices/emulators found`**: USB debugging is off, the RSA prompt
  on the phone was not accepted, or (on Windows) the OEM USB driver is
  missing. `adb kill-server && adb devices` after accepting the prompt. From
  WSL2, plain USB passthrough does not work by default. Run the Windows `adb.exe`,
  or forward the device with `usbipd`.
- **`Permission denied` running from `/sdcard`**: shared storage is mounted
  `noexec`. Use `/data/local/tmp`.
- **`CANNOT LINK EXECUTABLE ... not found`**: you built with a glibc
  cross-compiler (`aarch64-linux-gnu-gcc`). Android uses bionic, not glibc.
  Build with the NDK's clang.
- **Binary runs on one phone but not another**: the API level is higher than
  that device's Android version, or the device is 32-bit only. Check
  `adb shell getprop ro.product.cpu.abilist`.
- **Behaviour differs from the textbook**: SELinux. Run `adb shell getenforce`.
  A shell user is confined. Denials appear in `adb logcat | grep avc`.

## Stage 3: debugging on a device

The NDK ships `lldb-server`. Recent Android Studio versions automate this. By
hand:

```text
adb push $NDK/toolchains/llvm/prebuilt/linux-x86_64/lib/clang/*/lib/linux/aarch64/lldb-server /data/local/tmp/
adb shell chmod +x /data/local/tmp/lldb-server
adb shell /data/local/tmp/lldb-server platform --listen "*:5039" --server
# on the host:
lldb
(lldb) platform select remote-android
(lldb) platform connect connect://<device-serial>:5039
```

Debugging another app's process requires that app to be debuggable, or a
rooted device or `userdebug` build. A spare, unlockable device that you are
happy to wipe is the right tool for this. Never experiment on your daily
phone.

## Stage 4: dynamic instrumentation with Frida

Frida injects a JavaScript engine into a process so you can hook functions,
read arguments and trace native calls without recompiling. It is the fastest
way to see what an app's native library actually does with its inputs.

### Why it fails

- **Version mismatch**: the `frida` Python package on the host and
  `frida-server` on the device must be exactly the same version.
- **`frida-server` exits immediately**: wrong architecture build. Use the
  `android-arm64` asset for a 64-bit phone.
- **Hooks never fire**: the library is not loaded yet when your script runs.
  Hook `android_dlopen_ext` (or spawn with `-f` and wait for the module), then
  attach to the function.
- **The app crashes as soon as Frida attaches**: the app has anti-tamper
  checks. Practise on your own builds and on deliberately vulnerable training
  apps first.

## Stage 5: kernel lab (later)

Kernel work needs an ARM64 kernel built with KASAN and debug info, booted
under QEMU (`qemu-system-aarch64 -M virt -cpu max`) or as Cuttlefish.
[The kernel path](./05_kernel_path.md) covers it. Expect these failures:

- **Cuttlefish refuses to start**: KVM is unavailable. On WSL2, nested
  virtualization must be enabled and `/dev/kvm` must exist. Check with
  `ls -l /dev/kvm` and confirm your user is in the `kvm` group.
- **`qemu-system-aarch64` is extremely slow on x86**: there is no KVM
  acceleration across architectures, so everything is emulated (TCG). That is
  fine for learning and too slow for serious fuzzing. Use an ARM64 host
  or cloud VM for real syzkaller campaigns.
- **The kernel boots and then the console stays silent**: wrong console
  argument. For `-M virt`, use `console=ttyAMA0`.

## Checkpoint

You are done with this chapter when you can, from a clean terminal:

1. cross-compile a C file for ARM64, run it under `qemu-aarch64`, and stop at
   `main` in `gdb-multiarch`;
2. build the same file with the NDK, run it on a device from
   `/data/local/tmp`, and read its output;
3. explain why the same binary cannot simply be copied between the two.
