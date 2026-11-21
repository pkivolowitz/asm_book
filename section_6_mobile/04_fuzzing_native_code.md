# Fuzzing Native Code

Fuzzing means running a target with millions of generated inputs while a
sanitizer watches for memory errors. It is how most memory-safety bugs in
mobile platforms are found today, by vendors and by researchers. This chapter
gets you to a working fuzzing loop on code you wrote, which is the foundation
the Mobile Hacking Lab fuzzing course builds on.

## The pieces

| Piece | Job | Tools |
| ----- | --- | ----- |
| Harness | Feeds fuzzer bytes into the code under test | `LLVMFuzzerTestOneInput` |
| Engine | Mutates inputs, keeps the ones that reach new code | libFuzzer, AFL++ |
| Sanitizer | Turns silent corruption into an immediate, precise crash | ASan, HWASan, UBSan, MTE |
| Corpus | Valid seed inputs to start from | Real files, unit-test vectors |
| Triage | Minimizes and deduplicates crashes, finds root cause | `-minimize_crash`, `afl-tmin`, a debugger |

A sanitizer matters as much as the fuzzer. Without one, a 1-byte heap overflow
usually corrupts something silently and the run continues, so you never
learn the bug was there.

## Your first harness: the C course protocol parser

[Capstone 2](../c_course/12_capstone_binary_protocol_parser.md) has you write
a parser for a binary database format: a 16-byte header with a
`record_count` and `file_size`, followed by 48-byte records. A parser like
this is exactly the kind of code that has bugs when the header lies about
its sizes.

Refactor your parser so it has a function that parses a memory buffer
instead of a file:

```c
// parser.h
int db_parse(const uint8_t *buf, size_t len, struct db *out);
void db_free(struct db *db);
```

Then the harness is a few lines:

```c
// fuzz_parser.c
#include <stddef.h>
#include <stdint.h>
#include "parser.h"

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    struct db db;
    if (db_parse(data, size, &db) == 0)
        db_free(&db);
    return 0;  // never abort on bad input - the fuzzer only wants crashes
}
```

Build it with libFuzzer and AddressSanitizer (clang, on your Linux VM or
WSL2):

```text
clang -g -O1 -fsanitize=fuzzer,address,undefined fuzz_parser.c parser.c -o fuzz_parser
mkdir corpus && cp valid_db_files/* corpus/
./fuzz_parser corpus/ -max_len=4096
```

### Plant a bug, then find it

Before trusting the setup, prove it works. Temporarily make `db_parse` trust
`record_count` without checking it against `len`, so it reads records past
the end of the buffer. A correct setup finds this within seconds and prints
an ASan report:

```text
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x...
READ of size 4 at 0x... thread T0
    #0 in db_parse parser.c:57
    #1 in LLVMFuzzerTestOneInput fuzz_parser.c:7
0x... is located 0 bytes after 64-byte region
```

Read it in this order: **what** (heap-buffer-overflow, READ of size 4),
**where** (`parser.c:57`), **whose memory** (0 bytes after a 64-byte region,
so just past the input). Then minimize the input and fix the bug:

```text
./fuzz_parser -minimize_crash=1 -runs=10000 crash-<hash>
```

A fix is not done until the minimized crash input runs cleanly and becomes a
regression test.

### Edge cases that make a harness useless

- **The harness exits or aborts on invalid input.** Then the fuzzer stops at
  the first malformed byte. Always return 0 for rejected input.
- **Global state leaks between runs.** libFuzzer calls the function millions
  of times in one process. Static caches or a leaked allocation give
  crashes that cannot be reproduced from a single input. Reset state on every
  call, and run the crash input on its own to confirm it reproduces.
- **A checksum or magic value blocks every input.** A random mutation almost
  never produces a valid checksum, so coverage stops at the check. Either
  skip the check in fuzzing builds
  (`#ifdef FUZZING_BUILD_MODE_UNSAFE_FOR_PRODUCTION`) or compute it inside the
  harness. Seed the corpus with valid files so the magic bytes are present.
- **Coverage flatlines.** Look at which branch it cannot pass
  (`-print_coverage=1`, or build with `-fprofile-instr-generate` and view the
  report). The fix is usually a dictionary (`-dict=`) of format keywords or a
  better seed.
- **Timeouts and OOMs drown real crashes.** Set `-timeout=` and
  `-rss_limit_mb=` deliberately, and treat a reproducible timeout as a real bug
  (often an infinite loop on a length field).

## AFL++ and closed-source libraries

libFuzzer needs source code you can recompile with instrumentation. For a
closed-source `.so` (the usual case on Android), the options are:

- **AFL++ QEMU mode** (`-Q`): instruments ARM64 binaries at run time under
  `qemu-user`. Slower, but needs no source.
- **AFL++ Frida mode** (`-O`): instruments with Frida instead of QEMU, and
  can run on Android devices.
- **A harness that loads the library** with `dlopen`, resolves the target
  function with `dlsym` and calls it with fuzzer data. You write the harness
  in C, compile it with the NDK, and fuzz on a device or under emulation.
  Getting the target's arguments right (struct layouts, object state set up by
  earlier calls) is the real work. That is reverse engineering, which is why
  the ARM64 reading skills come first.

## Beyond byte mutation

- **Structure-aware fuzzing**: for inputs with a grammar or schema (an
  animation format, a protocol), generate structured inputs and serialize
  them, for example with libprotobuf-mutator, instead of mutating raw
  bytes that the parser rejects immediately.
- **JNI targets**: when the interesting code is only reachable through
  `Java_...` entry points, either write a native harness that fakes the
  `JNIEnv` calls the function makes, or instrument the real process with AFL++
  Frida mode.
- **Real-world practice**: open-source libraries that ship inside apps
  (image decoders, libxml2, font and animation parsers) are good first
  targets. They build with clang, have sanitizers, and have public bug
  histories to compare against.

## Sanitizers on Android

- **HWASan** (hardware-assisted ASan) uses Top Byte Ignore to tag pointers in
  software. It is cheaper than ASan on ARM64 and is what Android's own
  platform fuzzing uses. Build with `-fsanitize=hwaddress` and run it on a
  device or system image that supports it.
- **MTE** on Pixel 8 and later finds the same bug classes at near-native speed
  on real hardware, see [ARM64 mitigations](./02_arm64_mitigations.md).

## Exercises

1. Write the parser harness above, seed it with three valid files, and run it
   for 10 minutes. Record the coverage (`cov:` in the status line) as it
   plateaus.
2. Plant two different bugs (an out-of-bounds read from `record_count` and an
   integer overflow in `record_count * 48`). Confirm the fuzzer finds both, and
   that the ASan reports differ.
3. Add a dictionary with the magic bytes and compare how quickly coverage
   grows with and without it.
4. Cross-compile the same harness with the NDK (`-fsanitize=fuzzer,hwaddress`)
   and run it on an ARM64 device from `/data/local/tmp`.
