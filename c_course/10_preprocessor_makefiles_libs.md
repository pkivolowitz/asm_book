# Module 10: How a C Program Is Built

Fuzzing tutorials often say "build the target with instrumentation" and then
show a command such as:

```text
CC=clang CFLAGS="-g -O1 -fsanitize=fuzzer-no-link,address" make clean all
clang -g -O1 -fsanitize=fuzzer,address fuzz_parser.c libparser.a -o fuzz_parser
```

Each part of those two lines depends on how C programs are built:
separate compilation, headers, the preprocessor, libraries and `make`. This
chapter explains those pieces from the beginning, then puts them together in
[section 6](#6-what-instrumenting-a-fuzzing-target-means) to show what
instrumentation actually is.

You only need [Module 1](./01_machine_model_tooling.md) (the four build
stages) before starting. Examples marked **C project** open in the C sandbox
with one tab per file, so you can break them and see the errors yourself.

---

## 1. The big picture: compile each file, then link

A real program is spread across many `.c` files. The compiler never sees them
all at once. It compiles **one `.c` file at a time** into an object file
(`.o`). Then the **linker** joins the object files into one program.

```text
  greet.c ──compile──▶ greet.o ─┐
                                ├──link──▶ hello  (the program)
  main.c  ──compile──▶ main.o  ─┘
```

```text
gcc -c greet.c        # compile only: greet.c -> greet.o
gcc -c main.c         # compile only: main.c  -> main.o
gcc greet.o main.o -o hello    # link the two objects into a program
```

One `.c` file, together with everything it `#include`s, is called a
**translation unit**. Two facts follow from this design, and the rest of the
chapter builds on them:

1. **While compiling `main.c`, the compiler knows nothing about `greet.c`.**
   If `main.c` calls `greet()`, something has to tell the compiler that
   `greet` exists and what arguments it takes. That is the job of a header.
2. **Compiler options apply to the files compiled with them.** Building one
   file with `-fsanitize=address` adds checks to that file only. This is
   why instrumentation flags have to reach every file of the target.

---

## 2. Declarations, definitions and headers

A **definition** creates something: it holds the function's code or reserves
the variable's memory. A **declaration** only promises that the thing
exists somewhere and says what type it has.

```c
void greet(const char *name);          // declaration (a promise)
void greet(const char *name) { ... }   // definition (the real thing)

extern int greet_count;                // declaration of a variable
int greet_count = 0;                   // definition of the variable
```

A header file (`.h`) is a list of promises that several `.c` files need to
share. Each `.c` file that uses `greet` includes the header. Exactly one `.c`
file contains the definition.

```c
// file: greet.h
#ifndef GREET_H
#define GREET_H

void greet(const char *name);   // declaration: "greet exists somewhere"
extern int greet_count;         // declaration of a variable

#endif
// file: greet.c
#include <stdio.h>
#include "greet.h"

int greet_count = 0;            // definition: the variable lives here

void greet(const char *name) {  // definition: the code lives here
    greet_count++;
    printf("Hello, %s!\n", name);
}
// file: main.c
#include <stdio.h>
#include "greet.h"

int main(void) {
    greet("Ada");
    greet("Linus");
    printf("greet() ran %d times\n", greet_count);
    return 0;
}
```

Open it in the sandbox and run it. Then break it in each of these ways and
read the error. Knowing **which stage** an error comes from tells you where
to look for the fix:

| What you change | Error you get | Stage | What it means |
| --- | --- | --- | --- |
| Delete `#include "greet.h"` from `main.c` | `call to undeclared function 'greet'` | Compiler | `main.c` uses a name it was never told about. Include the header. |
| Delete the `greet.c` tab | `undefined reference to 'greet'` | Linker | Everything compiled, but no object file contains the definition. Add the missing `.c` file (or library) to the build. |
| Move `int greet_count = 0;` into `greet.h` | `multiple definition of 'greet_count'` | Linker | The header is included in two `.c` files, so two objects define the variable. Headers hold declarations; definitions go in exactly one `.c` file. |

"Undefined reference" and "multiple definition" are **linker** errors. You
will see both when you build fuzzing harnesses, so it pays to recognize
them now.

> **The rule:** headers contain declarations (function prototypes, `struct`
> and `typedef` definitions, `#define`s, `extern` variables). `.c` files
> contain definitions. Each function and global variable is defined in exactly
> one `.c` file.

---

## 3. The preprocessor: a text editor that runs first

Before the compiler proper sees your code, the **preprocessor** rewrites the
text. Lines starting with `#` are instructions to it. It knows nothing about
C types or functions. It only copies, pastes and deletes text.

### `#include` pastes a file

`#include "greet.h"` is replaced by the entire contents of `greet.h`. That is
all it does. Quotes (`"greet.h"`) search your project directory first; angle
brackets (`<stdio.h>`) search the system's include directories.

You can see the result with `gcc -E main.c`. On a Linux machine,
`#include <stdio.h>` alone expands to several hundred lines of declarations.

### `#define` replaces text

```c
#define BUF_SIZE 64
#define SQUARE(x) ((x) * (x))
```

Every `BUF_SIZE` after this line becomes `64`, and `SQUARE(n + 1)` becomes
`((n + 1) * (n + 1))`. The parentheses matter, because the substitution is
plain text. [Module 1's challenge](./01_machine_model_tooling.md#lesson-exercises--challenges)
shows what goes wrong without them.

### Include guards stop a header from being pasted twice

Headers include other headers, so one `.c` file can easily include the same
header twice: once directly and once through another header. If that header
defines a `struct`, the compiler sees the definition twice and stops:

```c
// file: point.h
struct point { int x, y; };
// file: shape.h
#include "point.h"
struct rect { struct point corner; int w, h; };
// file: main.c
#include <stdio.h>
#include "point.h"
#include "shape.h"     // pastes point.h a second time

int main(void) {
    struct rect r = { {1, 2}, 3, 4 };
    printf("%d\n", r.corner.x + r.w);
    return 0;
}
```

Running it gives `redefinition of 'struct point'`. The fix is an **include
guard**, the three lines you saw in `greet.h`:

```c
#ifndef POINT_H      // if POINT_H is not defined yet...
#define POINT_H      // ...define it, and keep the header's contents
struct point { int x, y; };
#endif               // the second paste finds POINT_H defined and skips all of this
```

Add them to `point.h` in the sandbox and the program builds. Every header you
write should have a guard. `#pragma once` at the top of the header does the
same thing and is supported by GCC and Clang.

### `#ifdef` builds different programs from the same source

`#ifdef NAME` keeps the following lines only if `NAME` is defined. This is how
one source tree produces a debug build, a release build and a fuzzing build:

```c
#include <stdio.h>

#define DEBUG   // delete this line to build the "release" version

#ifdef DEBUG
#define LOG(msg) printf("[debug] %s\n", msg)
#else
#define LOG(msg) ((void)0)
#endif

int main(void) {
    LOG("starting");
    printf("2 + 2 = %d\n", 2 + 2);
    LOG("done");
    return 0;
}
```

Run it, delete the `#define DEBUG` line, and run it again. The `LOG` lines
did not just stop printing. In the second build they are not in the program at
all: look for the `printf` calls in the **Assembly** tab.

Real projects do not edit a `#define` line to switch builds. They pass
**`-D` on the command line**, which defines the name as if `#define` were the
first line of the file:

```text
gcc -DDEBUG -c main.c            # same as "#define DEBUG" at the top
gcc -DBUF_SIZE=128 -c main.c     # same as "#define BUF_SIZE 128"
```

Some switches you will meet:

| Name | Who uses it | Effect |
| --- | --- | --- |
| `NDEBUG` | the C standard library | `assert()` checks are removed from the program |
| `DEBUG`, `VERBOSE` | many projects (by convention) | extra logging |
| `FUZZING_BUILD_MODE_UNSAFE_FOR_PRODUCTION` | fuzzing builds such as OSS-Fuzz pass it with `-D` | projects skip checks a fuzzer cannot pass, such as checksums and signatures, so it can reach the code behind them |

Remember fact 2 from section 1: a `#define` at the top of `main.c` affects
`main.c` only. To switch the behaviour of a whole project, the `-D` option has
to be given when **every** file is compiled. That is why build systems keep
flags in one variable, which brings us to libraries and `make`.

---

## 4. Libraries: bundles of object files

A library is compiled code packaged for reuse, so other programs can link
against it without recompiling its source.

**A static library (`.a`)** is an archive of `.o` files. Linking against it
copies the object files your program needs into the program:

```text
gcc -c parser.c utils.c                  # parser.o utils.o
ar rcs libparser.a parser.o utils.o      # bundle them into libparser.a
gcc main.c libparser.a -o app            # link main.c against the library
gcc main.c -L. -lparser -o app           # the same: -L = where, -lparser = libparser.a
```

Put libraries **after** the files that use them. The linker reads its
inputs left to right and only takes what is needed at that point, so
`gcc -L. -lparser main.c` can fail with "undefined reference" even though
the library contains the function.

**A shared library (`.so`)** is loaded when the program starts (or later,
with `dlopen`). The program stores only the library's name, and the dynamic
linker finds and loads it at run time:

```text
gcc -shared -fPIC parser.c utils.c -o libparser.so
gcc main.c -L. -lparser -o app
LD_LIBRARY_PATH=. ./app          # tell the dynamic linker where to look
```

| | Static (`libparser.a`) | Shared (`libparser.so`) |
| --- | --- | --- |
| What it is | an archive of `.o` files | a loadable binary |
| When it is joined to the program | at link time (copied in) | at run time (by the dynamic linker) |
| Program size | larger | smaller; the library is shared by every process |
| In a disassembler | its functions are inside the program | calls go through the PLT and GOT |
| On Android | rare in apps | every app's native code: `lib/arm64-v8a/*.so` |

**Why fuzzing cares.** A fuzzing harness is a small file with its own entry
point (`LLVMFuzzerTestOneInput`) that calls the code you want to test. You
build it by linking the harness against the **library**, not against the
program's own `main.c`. If you link both, you have two `main`s (libFuzzer
provides one) and the linker reports `multiple definition of 'main'`. That
is why fuzzing guides build the project as a library first. For closed-source
Android `.so` files, the harness loads the library with `dlopen` instead, see
[Fuzzing native code](../section_6_mobile/04_fuzzing_native_code.md).

---

## 5. Make: remembering the commands for you

Typing every `gcc` command by hand works for two files. Real projects have
hundreds, and recompiling all of them after a one-line change is slow. `make`
solves both problems. A `Makefile` lists **what each file is built from**
and **the command that builds it**. `make` then rebuilds only files whose
inputs changed.

### A rule

```makefile
greet.o: greet.c greet.h
	gcc -c greet.c -o greet.o
```

Read it as: "`greet.o` is made from `greet.c` and `greet.h`. If either is
newer than `greet.o` (or `greet.o` does not exist), run this command." The
first line is the **target** and its **prerequisites**. The command line
underneath **must start with a Tab character**, not spaces. Spaces give the
famous `*** missing separator. Stop.` error.

### A complete small Makefile

```makefile
CC     = gcc
CFLAGS = -Wall -Wextra -g -O0

hello: main.o greet.o
	$(CC) $(CFLAGS) main.o greet.o -o hello

main.o: main.c greet.h
	$(CC) $(CFLAGS) -c main.c -o main.o

greet.o: greet.c greet.h
	$(CC) $(CFLAGS) -c greet.c -o greet.o

clean:
	rm -f hello *.o

.PHONY: clean
```

What happens when you type `make`:

1. `make` builds the **first target** in the file, `hello`.
2. `hello` needs `main.o` and `greet.o`, so `make` checks their rules first and
   compiles whichever is missing or older than its `.c` or `.h` files.
3. It then links `hello` if any `.o` is newer than it.
4. Run `make` again without changing anything: `'hello' is up to date.` Edit
   `greet.c` and run it again: only `greet.o` and `hello` are rebuilt.

`make clean` runs the `clean` rule, which deletes the build output.
`.PHONY` says `clean` is a command name, not a file to create.

**Variables** such as `CC` (the compiler) and `CFLAGS` (compiler options)
keep the settings in one place. `$(CC)` is replaced by the variable's value.

### Shorter rules: patterns and automatic variables

Writing one rule per `.c` file gets repetitive. A **pattern rule** says how
to make any `.o` from the `.c` of the same name:

```makefile
CC      = gcc
CFLAGS  = -Wall -Wextra -g -O0
OBJS    = main.o greet.o

hello: $(OBJS)
	$(CC) $(CFLAGS) $^ -o $@

%.o: %.c greet.h
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f hello $(OBJS)

.PHONY: clean
```

| Symbol | Means | In the `hello` rule |
| --- | --- | --- |
| `$@` | the target being built | `hello` |
| `$^` | all prerequisites | `main.o greet.o` |
| `$<` | the first prerequisite | (in the `%.o` rule: the `.c` file) |
| `%` | "any name" in a pattern rule | `greet.o` is made from `greet.c` |

### Overriding variables from the command line

This is the part fuzzing guides rely on. A variable given on the command line
**overrides** the Makefile's value:

```text
make CC=clang CFLAGS="-g -O1 -fsanitize=address"
```

Every compile command now runs `clang` with AddressSanitizer, and you did not
edit the Makefile. Some Makefiles read variables from the environment
instead, written `CC=clang make`. Projects that use `./configure` or CMake
generate their Makefiles, and you pass the compiler and flags to that step:

```text
CC=clang CFLAGS="-g -O1 -fsanitize=address" ./configure && make
cmake -DCMAKE_C_COMPILER=clang -DCMAKE_C_FLAGS="-g -O1 -fsanitize=address" .. && make
```

> **The trap:** `make` decides what to rebuild by comparing file
> **timestamps**. It does not notice that `CFLAGS` changed. If `greet.o` was
> built yesterday without sanitizers, `make CFLAGS=-fsanitize=address` will
> happily link the old, uninstrumented `greet.o`. Run `make clean` whenever you
> change the compiler or flags. This is why fuzzing commands say
> `make clean all`.

Two more things trip people up:

- `CC ?= gcc` means "set `CC` only if it is not set yet". `make` already
  sets `CC` to `cc` by default, so this line usually does nothing. Use
  `CC = gcc`, and override it from the command line when you need to.
- A Makefile that hard-codes `gcc` in its commands instead of using `$(CC)`
  ignores your `CC=clang` override. If your flags seem to have no effect,
  run `make clean && make` and read the printed commands. `make` shows
  every command before running it.

---

## 6. What "instrumenting a fuzzing target" means

**Instrumentation** is extra code that the compiler adds to every function it
compiles, so the program can report on itself while it runs. Fuzzing uses two
kinds:

- **Coverage instrumentation** records which branches each input reached.
  This is the fuzzer's feedback: an input that reaches new code is kept and
  mutated further, and the others are thrown away.
- **Sanitizer instrumentation** (such as AddressSanitizer) adds a check before
  memory accesses. A one-byte overflow then crashes immediately at the faulty
  line instead of silently corrupting memory.

### See it working: a fuzzer in 50 lines

This project instruments its target **by hand**, using the preprocessor. Every
interesting spot in `check_packet` is marked with `COV(n)`. When `INSTRUMENT`
is defined, `COV(n)` records that spot `n` was reached. When it is not
defined, `COV(n)` expands to nothing. The fuzzer in `main.c` keeps any input
that reaches a spot no earlier input reached, and mutates the kept inputs
further.

```c
// file: cov.h
#ifndef COV_H
#define COV_H

#define NUM_EDGES 6
extern unsigned char cov_map[NUM_EDGES];

// Comment out the next line to build the target WITHOUT instrumentation.
#define INSTRUMENT

#ifdef INSTRUMENT
#define COV(id) (cov_map[(id)] = 1)   // record "this spot was reached"
#else
#define COV(id) ((void)0)             // expands to nothing useful
#endif

#endif
// file: target.h
#ifndef TARGET_H
#define TARGET_H

int check_packet(const unsigned char *buf, int len);

#endif
// file: target.c
#include "cov.h"
#include "target.h"

int check_packet(const unsigned char *buf, int len) {
    COV(0);
    if (len < 4) { COV(1); return 0; }
    if (buf[0] == 'F') {
        COV(2);
        if (buf[1] == 'U') {
            COV(3);
            if (buf[2] == 'Z') {
                COV(4);
                if (buf[3] == 'Z') {
                    COV(5);
                    return 1;   // pretend the bug lives here
                }
            }
        }
    }
    return 0;
}
// file: main.c
#include <stdio.h>
#include <string.h>
#include "cov.h"
#include "target.h"

unsigned char cov_map[NUM_EDGES];       // the one definition of the map

static unsigned int seed = 12345;
static unsigned int next_rand(void) {   // xorshift: small, deterministic
    seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
    return seed;
}

#define MAX_TRIES  5000
#define MAX_CORPUS 16
static unsigned char corpus[MAX_CORPUS][4];  // inputs worth keeping
static int corpus_size = 1;
static unsigned char seen[NUM_EDGES];        // every spot reached so far

int main(void) {
    memcpy(corpus[0], "AAAA", 4);
    for (int tries = 1; tries <= MAX_TRIES; tries++) {
        unsigned char input[4];
        memcpy(input, corpus[next_rand() % corpus_size], 4); // start from a kept input
        input[next_rand() % 4] = 'A' + next_rand() % 26;     // change one letter

        memset(cov_map, 0, sizeof cov_map);
        if (check_packet(input, 4)) {
            printf("try %5d: %.4s reaches the bug!\n", tries, (char *)input);
            return 0;
        }
        int new_spots = 0;
        for (int e = 0; e < NUM_EDGES; e++)
            if (cov_map[e] && !seen[e]) { seen[e] = 1; new_spots++; }
        if (new_spots && corpus_size < MAX_CORPUS) {
            memcpy(corpus[corpus_size++], input, 4);
            printf("try %5d: %.4s reached new code, kept it\n", tries, (char *)input);
        }
    }
    printf("gave up after %d tries\n", MAX_TRIES);
    return 0;
}
```

Run it. The instrumented build finds the bug in a few hundred tries:

```text
try     1: AAAY reached new code, kept it
try    80: FAAY reached new code, kept it
try   518: FUAY reached new code, kept it
try   659: FUZY reached new code, kept it
try   897: FUZZ reaches the bug!
```

Each kept input got one letter closer, because the fuzzer could **see** that
`F` reached a new spot. Now comment out `#define INSTRUMENT` in `cov.h` and
run it again. Without feedback the fuzzer is guessing all four letters at once
(1 chance in 26⁴ = 456,976 per try), and it prints `gave up after 5000 tries`.
The target code is identical in both builds. Only the instrumentation
differs.

### What the real compiler does instead

You will never write `COV()` by hand. Clang inserts the equivalent
automatically, at **every** branch of **every** function in the files it
compiles with the right flags:

| Flag | What Clang adds |
| --- | --- |
| `-fsanitize=fuzzer-no-link` | coverage counters at every branch, plus comparison tracing (so the fuzzer learns which bytes a comparison wanted). Use it for the library files. |
| `-fsanitize=fuzzer` | the same instrumentation, **and** it links libFuzzer, which provides `main()` and calls your `LLVMFuzzerTestOneInput` in a loop. Use it for the harness and the final link. |
| `-fsanitize=address` | AddressSanitizer: a check before each memory access, plus a malloc that surrounds every block with poisoned "redzones". |
| `-g -O1` | debug info for readable crash reports, and light optimization that keeps the code fast but recognizable |

AddressSanitizer's check is conceptually just a few instructions added before
each load or store:

```c
// what the compiler conceptually adds before "x = *p;"
if (is_poisoned(p, sizeof *p))     // a lookup in ASan's "shadow memory"
    report_error_and_abort(p);     // the heap-buffer-overflow report
x = *p;
```

The C sandbox's heap checker works on the same idea, which is why it can
point at the exact line of an overflow.

### The tutorial's commands, line by line

```text
CC=clang CFLAGS="-g -O1 -fsanitize=fuzzer-no-link,address" make clean all
```

- `CC=clang`: libFuzzer and these flags come with Clang, not GCC.
- `CFLAGS=...`: every file of the library is compiled with coverage and
  ASan instrumentation (section 3: flags must reach every file).
- `fuzzer-no-link`: instrument, but do not add libFuzzer's `main()`. The
  library is not a program.
- `make clean all`: throw away old, uninstrumented objects first (the
  timestamp trap from section 5), then build everything. Here that produces
  `libparser.a`.

```text
clang -g -O1 -fsanitize=fuzzer,address fuzz_parser.c libparser.a -o fuzz_parser
```

- Compile the harness `fuzz_parser.c`, and link it with the library after it
  (section 4: libraries go after the files that use them).
- `-fsanitize=fuzzer` links libFuzzer, which supplies `main`. The project's
  own `main.c` is not in the library, so there is no second `main`.
- `-fsanitize=...,address` again at the link step, so the ASan runtime is
  linked in.

For AFL++ the idea is the same with a different compiler wrapper, for example
`CC=afl-clang-fast make clean all`, and `AFL_USE_ASAN=1` to add ASan.

### Checking that instrumentation really happened

- When libFuzzer starts, it prints a line like
  `INFO: Loaded 1 modules (1234 inline 8-bit counters)`. That number is how
  many coverage points it found. If it is tiny, only the harness is
  instrumented and the library was built without the flags.
- `nm fuzz_parser | grep -c __sanitizer_cov` and
  `nm fuzz_parser | grep -c __asan` should both be well above zero.
- If libFuzzer warns that no interesting inputs were found and asks whether the
  code is instrumented, treat it as a build problem first.

### When the build fails

| Message or symptom | Usual cause | Fix |
| --- | --- | --- |
| `undefined reference to 'LLVMFuzzerTestOneInput'` | the harness is not in the link, or is C++ and the name was mangled | add the harness file; in a `.cc` harness write `extern "C" int LLVMFuzzerTestOneInput(...)` |
| `multiple definition of 'main'` | the project's `main.o` was linked along with libFuzzer's `main` | leave `main.o` out of the fuzzing build (link the library only) |
| `undefined reference to '__asan_report_load4'` (or other `__asan_` names) | objects were compiled with `-fsanitize=address` but the final link was not | use the same `-fsanitize=` flags at the link step |
| coverage stays tiny, no new inputs | the library was built without the flags (stale objects, or a Makefile that ignores `CC`/`CFLAGS`) | `make clean`, rebuild, and read the printed compile commands |
| coverage stops at a checksum or magic value | the fuzzer cannot guess the check | build with `-DFUZZING_BUILD_MODE_UNSAFE_FOR_PRODUCTION` if the project supports it, or fix up the checksum in the harness |

---

## Lesson exercises and challenges

### Challenge 1: Name the stage (sandbox)

Open the `greet` project. Break it the three ways from the table in section 2,
plus one of your own (for example, call `greet()` with two arguments). For
each one, write down the message, the stage that produced it (preprocessor,
compiler or linker) and the fix.

### Challenge 2: What the feedback is worth (sandbox)

In the fuzzer project:

1. Change `memcpy(input, corpus[next_rand() % corpus_size], 4);` to always use
   `corpus[0]`. The fuzzer still collects coverage but never builds on what it
   kept. Predict what happens, then run it.
2. Restore it, then make the target check for `"FUZZY"` (five letters). You
   need to change `NUM_EDGES`, the input size and the loop. How many more
   tries does it need?

### Challenge 3: A Makefile and a static library (Linux)

Split the `greet` project into `greet.c` (built into `libgreet.a` with `ar`)
and `main.c`. Write a Makefile with `all` and `clean` targets that builds the
library and links `hello` against it. Then:

1. run `make`, then `make CFLAGS="-g -fsanitize=address"`, and notice that
   nothing is rebuilt;
2. run `make clean` and the same command again, and confirm with
   `nm hello | grep -c __asan` that ASan is now inside.

### Challenge 4: Your first real instrumented build (Linux, Clang)

Write `fuzz_greet.c` with an `LLVMFuzzerTestOneInput` that copies the
input into a NUL-terminated buffer and calls `greet()`. Build `libgreet.a`
with `-fsanitize=fuzzer-no-link,address`, link the harness with
`-fsanitize=fuzzer,address`, and run it for a few seconds. Then rebuild the
library **without** the flags and compare the `Loaded 1 modules (N ...)`
line. Continue with [Fuzzing native code](../section_6_mobile/04_fuzzing_native_code.md).
