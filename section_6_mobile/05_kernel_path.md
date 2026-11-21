# The Kernel Path

On Android, the Linux kernel is the most privileged code an app can reach
directly. Drivers (GPU, camera, binder, vendor modules) are reachable through
system calls and `ioctl`s from sandboxed processes, and a memory-safety bug
there undermines every userland mitigation. Kernel research builds on
everything earlier: ARM64 fluency, C, mitigations and fuzzing, applied in an
environment where a crash takes down the whole machine.

This chapter prepares you for a kernel fuzzing course: build a debuggable
kernel, boot it, crash it on purpose, and read the report.

## Concepts to have first

- **Exception levels.** EL0 is userland, EL1 is the kernel, EL2 is the
  hypervisor (Android uses pKVM at EL2 on recent devices). `svc #0` traps from
  EL0 to EL1. That is the instruction you have been executing in the
  simulator for every `write` and `exit`.
- **User and kernel address split.** User and kernel addresses live in
  separate halves of the address space (TTBR0 and TTBR1). Kernel code must use
  `copy_from_user` / `copy_to_user` to touch user memory. PAN (Privileged
  Access Never) makes direct access fault.
- **GKI.** Modern Android devices run a Generic Kernel Image from Google plus
  vendor modules. Bugs split into "core kernel / GKI" and "vendor driver".
- **Binder.** Android's IPC mechanism is a kernel driver
  (`/dev/binder`) that every app talks to. It is a classic example of a
  complex, reachable, reference-counted kernel subsystem.

- **Kernel allocators.** The page allocator hands out physical pages; the
  slab allocator (SLUB) carves them into fixed-size caches such as
  `kmalloc-64`. KASAN reports name the cache, so knowing this vocabulary is
  what makes the reports readable.
- **Kernel mitigations.** KASLR randomizes the kernel base; PAN and PXN stop
  the kernel from accessing or executing user memory; PAC and (k)CFI protect
  return addresses and indirect calls. Each one changes which bugs are
  exploitable, but none of them removes the bug.

## Build and boot an arm64 kernel with KASAN

On a Linux host or VM (an ARM64 host is much faster; x86 hosts emulate the
CPU in software):

```text
sudo apt install gcc-aarch64-linux-gnu qemu-system-arm flex bison bc libssl-dev libelf-dev
git clone --depth=1 https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git
cd linux
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig
./scripts/config -e KASAN -e KASAN_GENERIC -e DEBUG_INFO_DWARF5 -e KCOV -e DEBUG_KERNEL
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- olddefconfig
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- -j"$(nproc)" Image
```

Boot it with a small root filesystem (buildroot, or a Debian image built for
syzkaller):

```text
qemu-system-aarch64 -M virt -cpu max -smp 2 -m 2G -nographic \
  -kernel arch/arm64/boot/Image \
  -append "console=ttyAMA0 root=/dev/vda rw" \
  -drive file=rootfs.ext4,if=virtio,format=raw \
  -s
```

`-s` opens a gdb stub on port 1234. Attach with
`gdb-multiarch vmlinux -ex "target remote :1234"` to debug the kernel the same
way you debugged userland binaries under `qemu-aarch64`.

## Crash it on purpose: write a buggy module

The safest way to learn KASAN reports is to write the bug yourself. Build a
tiny out-of-tree module that exposes a `/proc` or `/dev` file whose `write`
handler copies user data into a heap buffer **without checking the length**.
Load it in your VM, write too many bytes, and read what KASAN prints:

```text
BUG: KASAN: slab-out-of-bounds in demo_write+0x9c/0x120 [demo]
Write of size 96 at addr ffff000004c3e140 by task sh/171
...
The buggy address belongs to the object at ffff000004c3e100
 which belongs to the cache kmalloc-64 of size 64
The buggy address is located 64 bytes inside of
 64-byte region [ffff000004c3e100, ffff000004c3e140)
```

Read it the same way as an ASan report: the bug type, the access size, the
function plus offset, and which allocation it hit. Then use
`./scripts/faddr2line vmlinux demo_write+0x9c` (or gdb) to find the source
line, and fix the module.

## syzkaller: coverage-guided syscall fuzzing

syzkaller is the standard kernel fuzzer. It generates sequences of system
calls described in its *syzlang* format, uses KCOV for coverage, and runs them
inside many VMs, reproducing and minimizing every crash it finds. Its
interface descriptions are also a readable map of a subsystem's attack
surface: reading the description of a driver tells you which `ioctl`s
exist and what structures they take.

A first campaign:

1. build a kernel with `KCOV`, `KASAN` and debug info (above);
2. build a disk image with syzkaller's `create-image.sh`;
3. write a `syz-manager` config pointing at the kernel, image and QEMU
   (`"target": "linux/arm64"`);
4. run `syz-manager` and open its web dashboard to watch coverage and crashes;
5. add a syzlang description for **your own buggy module** and watch
   syzkaller find the bug you planted.

Step 5 is the kernel equivalent of the planted parser bug in the fuzzing
chapter. It proves the whole pipeline works before you point it at real code.

### Why it fails

- **No coverage (`cov: 0`)**: the kernel was built without `KCOV`, or the
  VM boots a different kernel than the one you configured.
- **VMs keep "lost connection"**: the image has no SSH key matching the
  config, or networking in QEMU is not configured. Boot the VM by hand first.
- **Painfully slow on x86**: cross-architecture emulation. Use an ARM64
  cloud VM with KVM for real campaigns, and x86 only for learning the
  workflow.

## LKL: fuzzing kernel code in user space

The Linux Kernel Library (LKL) builds kernel code as a library that runs in
a normal process. A driver's logic can then be fuzzed with libFuzzer-style
harnesses at user-space speed, with no VM. It is a useful second technique
next to syzkaller, especially for parsers inside the kernel.

## Where to go next

- Read real KASAN and syzbot reports on the syzbot dashboard. It is public,
  and each report links to the fix commit. Explaining a fix from the report
  is excellent practice.
- Read Android Security Bulletins. They list fixed kernel and driver bugs each
  month, with links to patches.
- Then take a dedicated Android kernel fuzzing and exploitation course with
  its prepared targets.
