// Lesson-specific practice challenges and exercises for Assembly Book & Systems courses

export const LESSON_EXERCISES = {
  // Section 1 - Kickstart
  'section_1/kickstart.md': [
    {
      id: 'kickstart-ex1',
      title: 'Exercise 1: Register Arithmetic & Initializing X0-X2',
      difficulty: 'Beginner',
      description: 'Write ARM64 instructions to put the decimal value 45 into X0, 55 into X1, and add them together into X2.',
      starterCode: `.global _start
.text

_start:
    // TODO: Put 45 into X0
    // TODO: Put 55 into X1
    // TODO: Add X0 and X1, saving result into X2

    // Exit
    mov x8, #93
    svc #0
`,
      solutionCode: `.global _start
.text

_start:
    mov x0, #45
    mov x1, #55
    add x2, x0, x1

    mov x8, #93
    svc #0
`,
      hints: [
        'Use the MOV instruction with immediate values: mov x0, #45',
        'Use the ADD instruction: add xd, xn, xm'
      ],
      tests: [
        { type: 'register', reg: 'x2', expected: 100n, radix: 'dec', description: 'X2 should contain 100 (45 + 55)' },
        { type: 'register', reg: 'x0', expected: 45n, radix: 'dec', description: 'X0 should contain 45' },
        { type: 'register', reg: 'x1', expected: 55n, radix: 'dec', description: 'X1 should contain 55' }
      ]
    }
  ],

  // Section 1 - Hello World
  'section_1/hello_world/README.md': [
    {
      id: 'hello-world-ex1',
      title: 'Exercise: Customized AArch64 Hello World',
      difficulty: 'Beginner',
      description: 'Modify the program to output "ARM64 Hacker!\\n" to stdout using Linux syscall 64 (sys_write), followed by clean exit (sys_exit with status 0).',
      starterCode: `.global _start
.text

_start:
    // Linux sys_write(fd=1, buf=msg, count=?)
    mov x0, #1          // stdout
    adr x1, msg         // pointer to string
    mov x2, #6          // TODO: set the correct length for your new string
    mov x8, #64         // sys_write syscall number
    svc #0

    // sys_exit(0)
    mov x0, #0
    mov x8, #93
    svc #0

.data
msg:
    .asciz "Hello\\n"    // TODO: change the text
`,
      solutionCode: `.global _start
.text

_start:
    mov x0, #1
    adr x1, msg
    mov x2, #14
    mov x8, #64
    svc #0

    mov x0, #0
    mov x8, #93
    svc #0

.data
msg:
    .asciz "ARM64 Hacker!\\n"
`,
      hints: [
        'Check the length of "ARM64 Hacker!\\n" - 13 text characters plus newline = 14 bytes',
        'Make sure x0 is set to 1 for stdout and x8 is set to 64 for sys_write'
      ],
      tests: [
        { type: 'stdout', expected: 'ARM64 Hacker!\n', exact: true, description: 'stdout is exactly "ARM64 Hacker!\\n" (a wrong length prints too much or too little)' },
        { type: 'exitCode', expected: 0, description: 'Process exits with status 0' }
      ]
    }
  ],

  // Section 1 - If Statements
  'section_1/if/README.md': [
    {
      id: 'if-ex1',
      title: 'Exercise: Maximum of Two Numbers',
      difficulty: 'Beginner',
      description: 'X0 and X1 hold two signed 64-bit numbers (the grader tries several pairs, including negatives and equal values). Place the larger one in X2 using CMP and conditional branches (B.GT / B.LE).',
      starterCode: `.global _start
.text

_start:
    // X0 and X1 are already set by the grader (try: mov x0, #78 / mov x1, #92 while testing)

    // TODO: Compare X0 and X1
    // If X0 > X1, branch to x0_is_max
    // Otherwise put X1 into X2 and jump to done

x0_is_max:
    // TODO

done:
    mov x8, #93
    svc #0
`,
      solutionCode: `.global _start
.text

_start:
    cmp x0, x1
    b.gt x0_is_max
    mov x2, x1
    b done

x0_is_max:
    mov x2, x0

done:
    mov x8, #93
    svc #0
`,
      hints: [
        'Use `cmp x0, x1` to compare the two values',
        'Use `b.gt label` to jump if X0 is strictly greater than X1',
        'Remember to branch unconditionally to `done` after handling the false case to avoid falling through!'
      ],
      cases: (rng) => {
        const pairs = [[78, 92], [92, 78], [-5, -9], [7, 7], [rng.int(-1000, 1000), rng.int(-1000, 1000)]];
        return pairs.map(([a, b]) => ({
          name: `x0=${a}, x1=${b}`,
          setup: { regs: { x0: a, x1: b } },
          tests: [{ type: 'register', reg: 'x2', expected: BigInt(Math.max(a, b)), radix: 'dec', description: `X2 = max(${a}, ${b}) = ${Math.max(a, b)}` }]
        }));
      }
    }
  ],

  // Section 1 - While Loops
  'section_1/while/README.md': [
    {
      id: 'while-ex1',
      title: 'Exercise: Compute 5! (Factorial)',
      difficulty: 'Intermediate',
      description: 'X1 holds n (the grader tries n = 0, 1, 5 and a random value up to 20). Implement a while loop that computes n! into X0. Remember 0! = 1.',
      starterCode: `.global _start
.text

_start:
    mov x0, #1      // accumulator (result = 1)
    // x1 = n is set by the grader

loop:
    // TODO: Compare counter with 1
    // While x1 > 1:
    //   x0 = x0 * x1
    //   x1 = x1 - 1
    // Else branch to done

done:
    mov x8, #93
    svc #0
`,
      solutionCode: `.global _start
.text

_start:
    mov x0, #1

loop:
    cmp x1, #1
    b.le done
    mul x0, x0, x1
    sub x1, x1, #1
    b loop

done:
    mov x8, #93
    svc #0
`,
      hints: [
        'Use `cmp x1, #1` and `b.le done` to terminate when counter reaches 1',
        'Use `mul x0, x0, x1` to multiply',
        'Use `sub x1, x1, #1` to decrement and `b loop` to repeat'
      ],
      cases: (rng) => [0, 1, 5, rng.int(6, 20)].map(n => {
        let f = 1n; for (let i = 2n; i <= BigInt(n); i++) f *= i;
        return { name: `n=${n}`, setup: { regs: { x1: n } }, tests: [{ type: 'register', reg: 'x0', expected: f, radix: 'dec', description: `X0 = ${n}! = ${f}` }] };
      })
    }
  ],

  // Section 1 - For Loops
  'section_1/for/README.md': [
    {
      id: 'for-ex1',
      title: 'Exercise: Sum of Even Numbers',
      difficulty: 'Intermediate',
      description: 'Compute the sum of all even numbers from 2 to 10 (2 + 4 + 6 + 8 + 10 = 30) using a for-loop structure. Place the total in X0.',
      starterCode: `.global _start
.text

_start:
    mov x0, #0      // total sum = 0
    mov x1, #2      // i = 2
    mov x2, #10     // limit = 10

for_loop:
    // TODO: Check if i > 10, if so branch to done
    // TODO: Add i to sum (x0)
    // TODO: Increment i by 2
    // TODO: Jump back to for_loop

done:
    mov x8, #93
    svc #0
`,
      solutionCode: `.global _start
.text

_start:
    mov x0, #0
    mov x1, #2
    mov x2, #10

for_loop:
    cmp x1, x2
    b.gt done
    add x0, x0, x1
    add x1, x1, #2
    b for_loop

done:
    mov x8, #93
    svc #0
`,
      hints: [
        'Check termination condition first with `cmp x1, x2` followed by `b.gt done`',
        'Step counter by 2 with `add x1, x1, #2`'
      ],
      tests: [
        { type: 'register', reg: 'x0', expected: 30n, radix: 'dec', description: 'X0 should contain 30 (2 + 4 + 6 + 8 + 10)' }
      ]
    }
  ],

  // Section 1 - Registers & Widths
  'section_1/regs/widths.md': [
    {
      id: 'widths-ex1',
      title: 'Exercise: 32-bit vs 64-bit Zero Extension',
      difficulty: 'Beginner',
      description: 'Set every bit of X0 (mov x0, #-1). Then write 0x1234 into W0. Observe how writing to the 32-bit W0 register automatically zeros out the upper 32 bits of X0 in AArch64!',
      starterCode: `.global _start
.text

_start:
    // Set all 64 bits of X0
    mov x0, #-1

    // TODO: Write 0x1234 into W0
    // Notice what happens to the upper 32 bits of X0!

    mov x8, #93
    svc #0
`,
      solutionCode: `.global _start
.text

_start:
    mov x0, #-1
    mov w0, #0x1234

    mov x8, #93
    svc #0
`,
      hints: [
        'AArch64 rule: all 32-bit instructions targeting Wd automatically clear bits 32-63 of the destination Xd register.'
      ],
      tests: [
        { type: 'register', reg: 'x0', expected: 0x1234n, radix: 'hex', description: 'X0 is exactly 0x1234 (upper bits zeroed out)' }
      ]
    }
  ],

  // Section 1 - Load & Store
  'section_1/regs/ldr.md': [
    {
      id: 'ldr-ex1',
      title: 'Exercise: Load, Multiply and Store',
      difficulty: 'Intermediate',
      description: 'Load two 64-bit numbers from memory (val_a and val_b), multiply them, and store the result into the memory location labeled `result`.',
      starterCode: `.global _start
.text

_start:
    adr x1, val_a
    ldr x2, [x1]        // x2 = val_a

    adr x1, val_b
    ldr x3, [x1]        // x3 = val_b

    // TODO: Multiply x2 and x3 into x4
    // TODO: Store x4 into memory address labeled 'result'

    mov x8, #93
    svc #0

.data
val_a:  .quad 7
val_b:  .quad 9
result: .quad 0
`,
      solutionCode: `.global _start
.text

_start:
    adr x1, val_a
    ldr x2, [x1]

    adr x1, val_b
    ldr x3, [x1]

    mul x4, x2, x3
    adr x1, result
    str x4, [x1]

    mov x8, #93
    svc #0

.data
val_a:  .quad 7
val_b:  .quad 9
result: .quad 0
`,
      hints: [
        'Use `mul x4, x2, x3`',
        'Load the address of result using `adr x1, result`',
        'Store with `str x4, [x1]`'
      ],
      tests: [
        { type: 'register', reg: 'x4', expected: 63n, radix: 'dec', description: 'X4 contains 63 (7 * 9)' }
      ]
    }
  ],

  // Section 1 - Functions
  'section_1/funcs/README.md': [
    {
      id: 'funcs-ex1',
      title: 'Exercise: Function Call with Stack Frame',
      difficulty: 'Intermediate',
      description: 'Write a subroutine `cube(x)` that calculates x * x * x. Pass argument 4 in X0, save FP/LR with STP, and return result in X0 using RET.',
      starterCode: `.global _start
.text

_start:
    mov x0, #4          // Argument: 4
    bl cube             // Call cube(4)

    // Result in X0 should be 64
    mov x8, #93
    svc #0

cube:
    // TODO: Function Prologue (save x29, x30 on stack)
    // TODO: Calculate x0 = x0 * x0 * x0
    // TODO: Function Epilogue (restore x29, x30 from stack)
    // TODO: Return with ret
`,
      solutionCode: `.global _start
.text

_start:
    mov x0, #4
    bl cube

    mov x8, #93
    svc #0

cube:
    stp x29, x30, [sp, #-16]!
    mov x29, sp

    mul x1, x0, x0
    mul x0, x1, x0

    ldp x29, x30, [sp], #16
    ret
`,
      hints: [
        'Prologue: `stp x29, x30, [sp, #-16]!`',
        'Epilogue: `ldp x29, x30, [sp], #16`',
        'Use `mul` twice to get the cube, and end with `ret`'
      ],
      tests: [
        { type: 'register', reg: 'x0', expected: 64n, radix: 'dec', description: 'X0 contains 64 (4^3)' }
      ]
    }
  ],

  // Section 3 - Bitfields
  'section_3/bitfields/with.md': [
    {
      id: 'bitfields-ex1',
      title: 'Exercise: Packing Bitfields with UBFIZ',
      difficulty: 'Advanced',
      description: 'Given red=5 (bits 0-3), green=10 (bits 4-7), and blue=3 (bits 8-11). Pack these values into a single 16-bit color register X0 using UBFIZ and ORR.',
      starterCode: `.global _start
.text

_start:
    mov x1, #5      // Red: 5
    mov x2, #10     // Green: 10
    mov x3, #3      // Blue: 3

    // TODO: Use ubfiz to place Red at bits 0-3 of X0
    // TODO: Use ubfiz to place Green at bits 4-7 of X4, then ORR into X0
    // TODO: Use ubfiz to place Blue at bits 8-11 of X5, then ORR into X0

    mov x8, #93
    svc #0
`,
      solutionCode: `.global _start
.text

_start:
    mov x1, #5
    mov x2, #10
    mov x3, #3

    ubfiz x0, x1, #0, #4
    ubfiz x4, x2, #4, #4
    orr x0, x0, x4
    ubfiz x5, x3, #8, #4
    orr x0, x0, x5

    mov x8, #93
    svc #0
`,
      hints: [
        'ubfiz Xd, Xn, #lsb, #width',
        'Green: `ubfiz x4, x2, #4, #4` then `orr x0, x0, x4`',
        'Blue: `ubfiz x5, x3, #8, #4` then `orr x0, x0, x5`'
      ],
      tests: [
        { type: 'register', reg: 'x0', expected: 0x3A5n, radix: 'hex', description: 'X0 is 0x3A5 (Blue=3, Green=0xA, Red=5)' }
      ]
    }
  ],

  // C Course - Module 2: Bitwise Logic & Memory
  'c_course/02_types_memory_bitwise.md': [
    {
      id: 'c-bitwise-ex1',
      title: 'Exercise: Bitmask Permission Flag Checker',
      difficulty: 'Beginner',
      description: 'Given user permissions `0b00000111` (Read, Write, Execute). Implement the bitwise check in ARM64 or C to test if Write (bit 1) is active. Place 1 in X0 if active, 0 otherwise.',
      starterCode: `.global _start
.text

_start:
    mov x1, #0b00000111     // User permissions
    mov x2, #0b00000010     // FLAG_WRITE (bit 1)

    // TODO: Test if bit 1 is set using TST or AND
    // Place 1 in X0 if set, 0 if not set

    mov x8, #93
    svc #0
`,
      solutionCode: `.global _start
.text

_start:
    mov x1, #0b00000111
    mov x2, #0b00000010

    and x3, x1, x2
    cmp x3, #0
    b.eq not_set
    mov x0, #1
    b done

not_set:
    mov x0, #0

done:
    mov x8, #93
    svc #0
`,
      hints: [
        'Use `and x3, x1, x2` to isolate the bit',
        'Compare `cmp x3, #0` and branch conditionally'
      ],
      tests: [
        { type: 'register', reg: 'x0', expected: 1n, radix: 'dec', description: 'X0 is 1 (Write permission is active)' }
      ]
    }
  ],

  // C Course - Module 4: Pointers & Scaled Indexing
  'c_course/04_pointers_and_memory.md': [
    {
      id: 'c-ptr-ex1',
      title: 'Exercise: Pointer Dereferencing & Array Striding',
      difficulty: 'Intermediate',
      description: 'An array of four 64-bit integers resides at `numbers`. Use indexed addressing to load the 3rd element (index 2) into X0.',
      starterCode: `.global _start
.text

_start:
    adr x1, numbers     // Base pointer
    mov x2, #2          // Index 2

    // TODO: Load numbers[2] into X0 using ldr with scaled register offset

    mov x8, #93
    svc #0

.data
numbers:
    .quad 100
    .quad 200
    .quad 300
    .quad 400
`,
      solutionCode: `.global _start
.text

_start:
    adr x1, numbers
    mov x2, #2

    ldr x0, [x1, x2, lsl #3]

    mov x8, #93
    svc #0

.data
numbers:
    .quad 100
    .quad 200
    .quad 300
    .quad 400
`,
      hints: [
        'Use `ldr x0, [x1, x2, lsl #3]` since each element is 8 bytes (2^3)'
      ],
      tests: [
        { type: 'register', reg: 'x0', expected: 300n, radix: 'dec', description: 'X0 contains 300 (numbers[2])' }
      ]
    }
  ],

  // C Course - Module 6: Struct Member Offsets
  'c_course/06_structs_unions_alignment.md': [
    {
      id: 'c-struct-ex1',
      title: 'Exercise: Loading Struct Fields from Disassembly',
      difficulty: 'Intermediate',
      description: 'A struct pointer is passed in X0. Field `id` (32-bit) is at offset 0, and `salary` (64-bit) is at offset 8. Load `id` into W1 and `salary` into X2, then add salary into X3.',
      starterCode: `.global _start
.text

_start:
    adr x0, mock_struct

    // TODO: Load 32-bit 'id' into W1 from offset 0
    // TODO: Load 64-bit 'salary' into X2 from offset 8
    // TODO: Move salary into X3

    mov x8, #93
    svc #0

.data
mock_struct:
    .word 42            // id at offset 0
    .word 0             // 4 bytes padding
    .quad 75000         // salary at offset 8
`,
      solutionCode: `.global _start
.text

_start:
    adr x0, mock_struct

    ldr w1, [x0, #0]
    ldr x2, [x0, #8]
    mov x3, x2

    mov x8, #93
    svc #0

.data
mock_struct:
    .word 42
    .word 0
    .quad 75000
`,
      hints: [
        'Use `ldr w1, [x0, #0]` for 32-bit field',
        'Use `ldr x2, [x0, #8]` for 64-bit field'
      ],
      tests: [
        { type: 'register', reg: 'x1', expected: 42n, radix: 'dec', description: 'W1 contains 42 (struct id)' },
        { type: 'register', reg: 'x3', expected: 75000n, radix: 'dec', description: 'X3 contains 75000 (struct salary)' }
      ]
    }
  ]
};

export function getExercisesForChapter(chapterPath) {
  if (!chapterPath) return [];
  const clean = chapterPath.split('#')[0].replace(/^\.\//, '');
  return LESSON_EXERCISES[clean] || [];
}
