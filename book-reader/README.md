# Low-Level Lab (book reader)

An interactive reader for this book: lessons, an in-browser ARM64 simulator
("CPULator"), graded lesson exercises, and a daily practice track.

```text
npm install
npm run dev        # http://localhost:5173
npm test           # simulator + every exercise/level (Node's test runner)
npm run scan       # assemble every .s/.S file in the book with the simulator
npm run scan:c     # compile and run every .c file / C course example
npm run lint
npm run build      # static site in dist/, lessons copied to dist/content
```

## How lesson content is served

Lessons are the Markdown files in the repository root (`section_1/`,
`c_course/`, `section_6_mobile/`, ...). `vite.config.js` serves them at
`/content/...` in development and copies them into `dist/content` at build
time. There are no symlinks, because git on Windows checks symlinks out as
plain text files by default (`core.symlinks=false`), which broke every lesson.
To add a top-level content directory, add it to `CONTENT_DIRS` in
`vite.config.js` and add its chapters to `src/manifest.json`.

A lesson file is shown at a clean URL: `section_1/regs/ldr.md` is
`/read/section_1/regs/ldr`, a folder's `README.md` is the folder
(`/read/section_1/if`), and anchors are a normal `#hash`. Build links with
`lessonUrl()` from `src/lib/routes.js`. Old links of the form
`/read/section_1%2Fkickstart.md` are redirected to the clean form.

`dist/404.html` is a copy of `index.html`, so client-side routes such as
`/practice` work on static hosts like GitHub Pages.

## The simulator (`src/simulator/arm64Engine.js`)

An interpreter for user-mode AArch64 Linux programs. It is strict on purpose:
anything the GNU assembler would reject (unknown mnemonics, undefined labels,
immediates that cannot be encoded, out-of-range offsets, mixed `x`/`w`
operands) is an assembly error with a line number, never silently ignored.

Supported:

- integer, bitfield, conditional-select, load/store (all addressing modes,
  pairs, sign-extending loads), branches, exclusive loads/stores, scalar
  floating point (`d`/`s` registers), and pointer authentication (a simplified
  model);
- `#include "apple-linux-convergence.S"` (the book's macros), `#if`/`#ifdef`,
  `.macro`, `.rept`, `.equ`/`.set`, `.struct`, local labels (`1f`/`1b`),
  `:lo12:` and `@PAGE`/`@PAGEOFF`, `ldr x0, =value`;
- Linux syscalls `read`, `write`, `exit`, `exit_group`, `getpid` and a few
  others, plus a small C runtime (`printf`, `puts`, `malloc`/`free`,
  `strlen`, `memcpy`, ...);
- a process-like memory map. Unmapped access is SIGSEGV, writes to `.text`
  fault, a misaligned SP used as a base register is SIGBUS, and `ret` from
  `main` exits with `w0 & 0xff`.

Not supported: NEON/SIMD vector instructions, multiple threads, real
instruction encodings (so self-modifying code and jumping into data fault).

## The C toolchain (`src/cc/`)

The C sandbox and the C labs use a real compiler, not an interpreter:
`preprocessor.js` -> `parser.js` (typed AST) -> `codegen.js` (unoptimized
AArch64 assembly, like `gcc -O0`) -> the simulator. Programs therefore have a
real stack, heap, calling convention and memory layout, and the Assembly tab
shows the code that actually runs, with each block next to its C line.

- C11 subset: all integer and floating types (plain `char` is unsigned, as
  on AArch64 Linux), pointers, arrays, structs/unions/enums, typedef, function
  pointers, initializers (including designated ones), `switch`/`goto`, static
  and extern linkage across multiple `.c` files, `.s` files linked with C, and
  the full preprocessor. Not supported yet: bit-fields, VLAs, user-defined
  variadic functions (`va_list`), `long double` as a distinct type.
- Headers: `stdio.h`, `stdlib.h`, `string.h`, `ctype.h`, `stdint.h`,
  `inttypes.h`, `stdbool.h`, `stddef.h`, `limits.h`, `float.h`, `math.h`,
  `errno.h`, `assert.h`, `time.h`, `unistd.h` (including `getopt`), `fcntl.h`,
  `sys/stat.h`, `sys/types.h` (see `src/cc/headers.js`).
- Runtime (`src/simulator/libc.js`): stdio streams, an in-memory filesystem
  (non-source tabs in the sandbox are files the program can `fopen`),
  `argv`/stdin, AddressSanitizer-style heap checking (overflow,
  use-after-free, double free) and leak detection.
- Diagnostics in clang's format, including `-Wformat`-style printf/scanf
  checks, implicit-declaration errors and link errors.

## Challenges and grading (`src/lib/grader.js`, `src/lib/cGrader.js`)

C labs (`src/data/cLabs.js`) give the learner's files, optional hidden files
(usually a test `main.c` that calls the learner's functions), and cases with
stdin/argv/input files. Their checks include exact stdout, stderr, exit status,
file contents, no leaks and no compiler warnings.

An assembly challenge (lesson exercise in `src/data/lessonExercises.js`, or practice level
in `src/data/levels.js`) has a starter, a reference solution, hints, and
either `tests` or `cases`. `cases` can be a function of a seeded RNG that
returns several `{ setup, tests }` inputs, so hard-coded answers fail.

Test types: `register`, `flag`, `stdout` (`exact` optional), `exitCode`,
`memory`, `fault`, `maxInstructions`, `staticInstructions`, `require` and
`forbid` (mnemonics).

Every grading run re-assembles the current editor contents from scratch.
`npm test` checks every challenge: the solution must pass under several seeds
and the starter must fail. Add a challenge, run `npm test`, and a mistake in it
shows up immediately.

## Progress

Solved challenges, daily streaks and in-progress drafts are stored in the
browser's `localStorage` (`src/lib/progress.js`). They are per browser and
per device. Use Export/Import on the Practice page to move them.
