// ARM64 Foundations: a graded, level-by-level practice track.
//
// Each level is checked by the simulator against several generated inputs
// (see src/lib/grader.js), so a solution has to be correct in general, not
// just for one hard-coded value. Every level is verified by `npm test`:
// the reference solution must pass every case and the starter must fail.

const COND_BRANCHES = ['eq', 'ne', 'cs', 'hs', 'cc', 'lo', 'mi', 'pl', 'vs', 'vc', 'hi', 'ls', 'ge', 'lt', 'gt', 'le']
  .flatMap(c => [`b.${c}`, `b${c}`]).concat(['cbz', 'cbnz', 'tbz', 'tbnz']);

const EXIT = `
    mov x8, #93         // exit(x0)
    svc #0`;

const U64 = (rng) => (BigInt(rng.int(0, 0xFFFFFFFF)) << 32n) | BigInt(rng.int(0, 0xFFFFFFFF));
const reg = (r, v, d) => ({ type: 'register', reg: r, expected: BigInt(v), radix: 'dec', description: d });
const hexReg = (r, v, d) => ({ type: 'register', reg: r, expected: BigInt(v), radix: 'hex', description: d });

export const LEVELS = [
  {
    id: 'lvl-01-set-register',
    title: 'Set a register',
    difficulty: 'Beginner',
    concept: 'mov with an immediate',
    reference: 'section_1/kickstart.md',
    description: 'Put the value 0x1337 into X0. (The program then exits with exit(x0), so the exit status is the low byte, 0x37 = 55.)',
    starterCode: `.global _start
.text
_start:
    // your code here
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    mov x0, #0x1337
${EXIT}
`,
    hints: ['mov x0, #0x1337'],
    tests: [hexReg('x0', 0x1337, 'X0 = 0x1337')],
  },
  {
    id: 'lvl-02-large-value',
    title: 'Build a 64-bit constant',
    difficulty: 'Beginner',
    concept: 'movz / movk, 16 bits at a time',
    reference: 'section_1/regs/widths.md',
    description: 'Put 0xDEADBEEFCAFE1337 into X1 without using ldr. A single mov cannot encode this value; real ARM64 code builds it with movz and up to three movk instructions.',
    starterCode: `.global _start
.text
_start:
    mov x1, #0xDEADBEEFCAFE1337    // the assembler rejects this - fix it
    mov x0, #0
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    movz x1, #0x1337
    movk x1, #0xCAFE, lsl #16
    movk x1, #0xBEEF, lsl #32
    movk x1, #0xDEAD, lsl #48
    mov x0, #0
${EXIT}
`,
    hints: ['movz sets 16 bits and zeroes the rest; movk keeps the other bits.', 'movk x1, #0xCAFE, lsl #16 writes bits 16-31.'],
    tests: [hexReg('x1', 0xDEADBEEFCAFE1337n, 'X1 = 0xDEADBEEFCAFE1337'), { type: 'forbid', ops: ['ldr'], description: 'No ldr (build it in registers)' }],
  },
  {
    id: 'lvl-03-arithmetic',
    title: 'Multiply-add',
    difficulty: 'Beginner',
    concept: 'mul, add, madd',
    reference: 'section_1/kickstart.md',
    description: 'X1, X2 and X3 hold inputs. Compute X0 = X1 * X2 + X3. Bonus: do it in one instruction.',
    starterCode: `.global _start
.text
_start:
    // x1, x2, x3 are set by the grader
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    madd x0, x1, x2, x3
${EXIT}
`,
    hints: ['mul x0, x1, x2 then add x0, x0, x3', 'madd xd, xn, xm, xa computes xa + xn*xm'],
    cases: (rng) => Array.from({ length: 4 }, () => {
      const a = rng.int(0, 100000); const b = rng.int(0, 100000); const c = rng.int(0, 100000);
      return { name: `${a}*${b}+${c}`, setup: { regs: { x1: a, x2: b, x3: c } }, tests: [reg('x0', BigInt(a) * BigInt(b) + BigInt(c), `X0 = ${BigInt(a) * BigInt(b) + BigInt(c)}`)] };
    }),
  },
  {
    id: 'lvl-04-shift-multiply',
    title: 'Multiply by 9 without mul',
    difficulty: 'Beginner',
    concept: 'shifted register operands',
    reference: 'section_3/bitfields/README.md',
    description: 'Set X0 = X1 * 9 without mul/madd. Compilers do this all the time: x*9 = x + (x << 3). ARM64 lets the second operand of add carry a shift for free.',
    starterCode: `.global _start
.text
_start:
    mul x0, x1, x2     // not allowed - rewrite without mul
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    add x0, x1, x1, lsl #3
${EXIT}
`,
    hints: ['add x0, x1, x1, lsl #3'],
    cases: (rng) => [0, 1, rng.int(2, 1 << 30), rng.int(2, 1 << 30)].map(v => ({
      name: `x1=${v}`, setup: { regs: { x1: v, x2: 9 } },
      tests: [reg('x0', BigInt(v) * 9n, `X0 = ${v} * 9`), { type: 'forbid', ops: ['mul', 'madd', 'msub', 'mneg', 'smull', 'umull'], description: 'No multiply instructions' }, { type: 'maxInstructions', expected: 3, description: 'At most 3 instructions executed' }],
    })),
  },
  {
    id: 'lvl-05-modulo',
    title: 'Modulo',
    difficulty: 'Beginner',
    concept: 'udiv + msub (there is no mod instruction)',
    reference: 'macros/README.md',
    description: 'X1 and X2 hold unsigned numbers (X2 is never 0). Set X0 = X1 % X2. ARM64 has no remainder instruction: divide, then subtract quotient*divisor.',
    starterCode: `.global _start
.text
_start:
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    udiv x3, x1, x2
    msub x0, x3, x2, x1
${EXIT}
`,
    hints: ['udiv x3, x1, x2 gives the quotient', 'msub xd, xn, xm, xa computes xa - xn*xm'],
    cases: (rng) => [[10, 3], [7, 7], [5, 9], [rng.int(0, 1e9), rng.int(1, 1000)]].map(([a, b]) => ({
      name: `${a} % ${b}`, setup: { regs: { x1: a, x2: b } }, tests: [reg('x0', a % b, `X0 = ${a % b}`)],
    })),
  },
  {
    id: 'lvl-06-bitfield',
    title: 'Extract a bitfield',
    difficulty: 'Beginner',
    concept: 'ubfx / lsr + and',
    reference: 'section_3/bitfields/README.md',
    description: 'X1 holds a packed 64-bit value. Put bits 12 through 19 (8 bits) of X1 into X0, shifted down to bit 0. Packed fields like this appear in every binary file format and hardware register.',
    starterCode: `.global _start
.text
_start:
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    ubfx x0, x1, #12, #8
${EXIT}
`,
    hints: ['ubfx xd, xn, #lsb, #width', 'Or: lsr x0, x1, #12 then and x0, x0, #0xff'],
    cases: (rng) => [0n, 0xFFFFFFFFFFFFFFFFn, 0xAB000n, U64(rng)].map(v => ({
      name: `x1=0x${v.toString(16)}`, setup: { regs: { x1: v } }, tests: [hexReg('x0', (v >> 12n) & 0xFFn, `X0 = 0x${((v >> 12n) & 0xFFn).toString(16)}`)],
    })),
  },
  {
    id: 'lvl-07-sign-extend',
    title: 'Widen a signed int',
    difficulty: 'Beginner',
    concept: 'W vs X registers, sxtw',
    reference: 'section_1/regs/widths.md',
    description: 'W1 holds a signed 32-bit int (the upper half of X1 is garbage). Put the same value, sign-extended to 64 bits, into X0. This is what `long y = (long)x;` compiles to.',
    starterCode: `.global _start
.text
_start:
    mov x0, x1      // wrong: copies the garbage too
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    sxtw x0, w1
${EXIT}
`,
    hints: ['sxtw x0, w1'],
    cases: (rng) => [-1, 5, -2147483648, rng.int(-2e9, 2e9)].map(v => {
      const x1 = (BigInt(rng.int(1, 0xFFFF)) << 32n) | BigInt.asUintN(32, BigInt(v));
      return { name: `w1=${v}`, setup: { regs: { x1 } }, tests: [reg('x0', BigInt.asUintN(64, BigInt(v)), `X0 = ${v} (64-bit)`)] };
    }),
  },
  {
    id: 'lvl-08-load-store',
    title: 'Load, modify, store',
    difficulty: 'Beginner',
    concept: 'ldr / str with offsets',
    reference: 'section_1/regs/ldr.md',
    description: 'The 8-byte value at `slots` is set by the grader. Load it, add 1, and store the result into the second slot (slots + 8).',
    starterCode: `.global _start
.text
_start:
    adr x1, slots
    // load [x1], add 1, store to [x1, #8]
    mov x0, #0
${EXIT}

.data
.p2align 3
slots: .quad 0, 0
`,
    solutionCode: `.global _start
.text
_start:
    adr x1, slots
    ldr x2, [x1]
    add x2, x2, #1
    str x2, [x1, #8]
    mov x0, #0
${EXIT}

.data
.p2align 3
slots: .quad 0, 0
`,
    hints: ['ldr x2, [x1]', 'str x2, [x1, #8]'],
    cases: (rng) => [0n, 41n, U64(rng)].map(v => ({
      name: `slots[0]=${v}`, setup: { memory: [{ label: 'slots', values: [v, 0n] }] },
      tests: [{ type: 'memory', label: 'slots', offset: 8, size: 8, expected: BigInt.asUintN(64, v + 1n), radix: 'dec', description: `slots[1] = ${BigInt.asUintN(64, v + 1n)}` }],
    })),
  },
  {
    id: 'lvl-09-pairs',
    title: 'Swap with load/store pair',
    difficulty: 'Intermediate',
    concept: 'ldp / stp',
    reference: 'section_1/funcs/README.md',
    description: 'Swap the two 8-byte values at `pair` in memory using exactly one ldp and one stp.',
    starterCode: `.global _start
.text
_start:
    adr x0, pair
    mov x0, #0
${EXIT}

.data
.p2align 3
pair: .quad 0, 0
`,
    solutionCode: `.global _start
.text
_start:
    adr x0, pair
    ldp x1, x2, [x0]
    stp x2, x1, [x0]
    mov x0, #0
${EXIT}

.data
.p2align 3
pair: .quad 0, 0
`,
    hints: ['ldp x1, x2, [x0] loads two consecutive quads', 'store them back in the other order'],
    cases: (rng) => [[1n, 2n], [U64(rng), U64(rng)]].map(([a, b]) => ({
      name: `pair = {${a}, ${b}}`, setup: { memory: [{ label: 'pair', values: [a, b] }] },
      tests: [
        { type: 'memory', label: 'pair', offset: 0, expected: b, radix: 'dec', description: 'pair[0] = old pair[1]' },
        { type: 'memory', label: 'pair', offset: 8, expected: a, radix: 'dec', description: 'pair[1] = old pair[0]' },
        { type: 'require', ops: ['ldp', 'stp'], description: 'Uses ldp and stp' },
      ],
    })),
  },
  {
    id: 'lvl-10-xor-swap',
    title: 'Swap without a temporary',
    difficulty: 'Intermediate',
    concept: 'eor',
    reference: 'section_1/regs/README.md',
    description: 'Swap X1 and X2 using only those two registers: no other registers, no memory. (Exclusive-or is its own inverse.)',
    starterCode: `.global _start
.text
_start:
    mov x0, #0
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    eor x1, x1, x2
    eor x2, x1, x2
    eor x1, x1, x2
    mov x0, #0
${EXIT}
`,
    hints: ['a ^= b; b ^= a; a ^= b'],
    cases: (rng) => [[3n, 9n], [U64(rng), U64(rng)]].map(([a, b]) => ({
      name: `x1=${a}, x2=${b}`, setup: { regs: { x1: a, x2: b } },
      tests: [reg('x1', b, 'X1 = old X2'), reg('x2', a, 'X2 = old X1'), { type: 'forbid', ops: ['str', 'stp', 'ldr', 'ldp'], description: 'No memory access' }],
    })),
  },
  {
    id: 'lvl-11-array-sum',
    title: 'Sum an array',
    difficulty: 'Intermediate',
    concept: 'loops, post-indexed loads',
    reference: 'section_1/for/README.md',
    description: '`array` holds X1 signed 64-bit numbers (X1 can be 0). Put their sum in X0.',
    starterCode: `.global _start
.text
_start:
    adr x2, array
    mov x0, #0
    // loop x1 times, adding each element
${EXIT}

.data
.p2align 3
array: .space 8 * 32
`,
    solutionCode: `.global _start
.text
_start:
    adr x2, array
    mov x0, #0
    cbz x1, done
loop:
    ldr x3, [x2], #8
    add x0, x0, x3
    subs x1, x1, #1
    b.ne loop
done:
${EXIT}

.data
.p2align 3
array: .space 8 * 32
`,
    hints: ['ldr x3, [x2], #8 loads and advances the pointer', 'Handle X1 = 0 before entering the loop'],
    cases: (rng) => [0, 1, 5, 32].map(n => {
      const vals = Array.from({ length: n }, () => BigInt(rng.int(-1e6, 1e6)));
      const sum = vals.reduce((a, b) => a + b, 0n);
      return { name: `n=${n}`, setup: { regs: { x1: n }, memory: [{ label: 'array', values: vals }] }, tests: [reg('x0', BigInt.asUintN(64, sum), `X0 = ${sum}`)] };
    }),
  },
  {
    id: 'lvl-12-strlen',
    title: 'strlen',
    difficulty: 'Intermediate',
    concept: 'byte loads, null terminators',
    reference: 'more/strlen_for_c/README.md',
    description: 'Write strlen: count the bytes before the 0 terminator of the string at `str`, result in X0. Empty strings happen.',
    starterCode: `.global _start
.text
_start:
    adr x1, str
${EXIT}

.data
str: .space 64
`,
    solutionCode: `.global _start
.text
_start:
    adr x1, str
    mov x0, #0
1:  ldrb w2, [x1, x0]
    cbz w2, 2f
    add x0, x0, #1
    b 1b
2:
${EXIT}

.data
str: .space 64
`,
    hints: ['ldrb w2, [x1, x0] loads the byte at str + x0', 'cbz w2, done stops at the terminator'],
    cases: (rng) => ['', 'a', 'hello, world', Array.from({ length: rng.int(20, 60) }, () => String.fromCharCode(rng.int(97, 122))).join('')].map(s => ({
      name: JSON.stringify(s.length > 16 ? s.slice(0, 16) + '...' : s),
      setup: { memory: [{ label: 'str', bytes: [...new TextEncoder().encode(s), 0] }] },
      tests: [reg('x0', s.length, `X0 = ${s.length}`)],
    })),
  },
  {
    id: 'lvl-13-branchless-abs',
    title: 'Branchless absolute value',
    difficulty: 'Intermediate',
    concept: 'cmp + cneg / csel',
    reference: 'section_1/if/README.md',
    description: 'Set X0 = |X1| (X1 is a signed 64-bit number) without any conditional branch. Compilers prefer conditional-select instructions because they do not stall the pipeline on a misprediction.',
    starterCode: `.global _start
.text
_start:
    mov x0, x1
    cmp x1, #0
    b.ge 1f
    neg x0, x1
1:
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    cmp x1, #0
    cneg x0, x1, lt
${EXIT}
`,
    hints: ['cneg xd, xn, cond negates when cond is true', 'cmp x1, #0 then cneg x0, x1, lt'],
    cases: (rng) => [0, 5, -5, rng.int(-1e9, -1)].map(v => ({
      name: `x1=${v}`, setup: { regs: { x1: BigInt.asUintN(64, BigInt(v)) } },
      tests: [reg('x0', Math.abs(v), `X0 = ${Math.abs(v)}`), { type: 'forbid', ops: COND_BRANCHES, description: 'No conditional branches' }],
    })),
  },
  {
    id: 'lvl-14-function',
    title: 'Write a function: max3',
    difficulty: 'Intermediate',
    concept: 'AAPCS64: args in x0-x2, result in x0, bl / ret',
    reference: 'section_1/funcs/README.md',
    description: '_start calls max3(x0, x1, x2) with signed inputs. Implement max3 so it returns the largest in X0 and returns with ret.',
    starterCode: `.global _start
.text
_start:
    bl max3
    mov x19, x0
    mov x0, #0
${EXIT}

max3:
    // return the max of x0, x1, x2 in x0
    ret
`,
    solutionCode: `.global _start
.text
_start:
    bl max3
    mov x19, x0
    mov x0, #0
${EXIT}

max3:
    cmp x0, x1
    csel x0, x0, x1, gt
    cmp x0, x2
    csel x0, x0, x2, gt
    ret
`,
    hints: ['cmp then csel x0, x0, x1, gt keeps the larger', 'Do it twice'],
    cases: (rng) => [[1, 2, 3], [3, 2, 1], [-1, -5, -3], [rng.int(-1e6, 1e6), rng.int(-1e6, 1e6), rng.int(-1e6, 1e6)]].map(([a, b, c]) => ({
      name: `max3(${a}, ${b}, ${c})`, setup: { regs: { x0: BigInt.asUintN(64, BigInt(a)), x1: BigInt.asUintN(64, BigInt(b)), x2: BigInt.asUintN(64, BigInt(c)) } },
      tests: [reg('x19', BigInt.asUintN(64, BigInt(Math.max(a, b, c))), `returns ${Math.max(a, b, c)}`), { type: 'exitCode', expected: 0, description: 'Returns to _start and exits normally' }],
    })),
  },
  {
    id: 'lvl-15-save-lr',
    title: 'A function that calls a function',
    difficulty: 'Intermediate',
    concept: 'saving x30 (the link register) in a stack frame',
    reference: 'section_1/funcs/README2.md',
    description: 'greet calls puts, but bl overwrites X30, so greet\'s own ret goes to the wrong place and the program never exits. Add a proper prologue and epilogue (stp/ldp of x29, x30) so greet returns to _start.',
    starterCode: `.global _start
.text
_start:
    bl greet
    mov x0, #0
${EXIT}

greet:
    adr x0, msg
    bl puts
    ret

.data
msg: .asciz "frame saved"
`,
    solutionCode: `.global _start
.text
_start:
    bl greet
    mov x0, #0
${EXIT}

greet:
    stp x29, x30, [sp, #-16]!
    mov x29, sp
    adr x0, msg
    bl puts
    ldp x29, x30, [sp], #16
    ret

.data
msg: .asciz "frame saved"
`,
    hints: ['stp x29, x30, [sp, #-16]! on entry', 'ldp x29, x30, [sp], #16 before ret', 'The stack must stay 16-byte aligned'],
    maxSteps: 20000,
    tests: [{ type: 'stdout', expected: 'frame saved\n', exact: true, description: 'Prints "frame saved" exactly once' }, { type: 'exitCode', expected: 0, description: 'Exits with status 0' }],
  },
  {
    id: 'lvl-16-fib',
    title: 'Fibonacci',
    difficulty: 'Intermediate',
    concept: 'loops or recursion',
    reference: 'section_1/recursion/README.md',
    description: 'Set X0 = fib(X1), where fib(0) = 0, fib(1) = 1 and X1 is between 0 and 90.',
    starterCode: `.global _start
.text
_start:
${EXIT}
`,
    solutionCode: `.global _start
.text
_start:
    mov x2, #0          // fib(i)
    mov x3, #1          // fib(i+1)
    cbz x1, 2f
1:  add x4, x2, x3
    mov x2, x3
    mov x3, x4
    subs x1, x1, #1
    b.ne 1b
2:  mov x0, x2
${EXIT}
`,
    hints: ['Keep two running values and step n times', 'An iterative loop is much faster than naive recursion for n = 90'],
    cases: (rng) => [0, 1, 2, 10, 90, rng.int(3, 89)].map(n => {
      let a = 0n; let b = 1n; for (let i = 0; i < n; i++) [a, b] = [b, a + b];
      return { name: `fib(${n})`, setup: { regs: { x1: n } }, tests: [reg('x0', a, `X0 = ${a}`)] };
    }),
  },
  {
    id: 'lvl-17-endianness',
    title: 'Parse a big-endian header field',
    difficulty: 'Intermediate',
    concept: 'rev, endianness',
    reference: 'section_3/endian/README.md',
    description: 'Network protocols and many file formats store integers big-endian, but ARM64 loads little-endian. `hdr` holds a 4-byte big-endian length field. Load it and put its numeric value in X0.',
    starterCode: `.global _start
.text
_start:
    adr x1, hdr
    ldr w0, [x1]        // loads the bytes in the wrong order
${EXIT}

.data
.p2align 2
hdr: .space 4
`,
    solutionCode: `.global _start
.text
_start:
    adr x1, hdr
    ldr w0, [x1]
    rev w0, w0
${EXIT}

.data
.p2align 2
hdr: .space 4
`,
    hints: ['rev w0, w0 reverses the four bytes'],
    cases: (rng) => [0x00000102, 0x12345678, rng.int(0x10000000, 0x7FFFFFFF)].map(v => ({
      name: `field = 0x${v.toString(16)}`,
      setup: { memory: [{ label: 'hdr', bytes: [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255] }] },
      tests: [hexReg('x0', v, `X0 = 0x${v.toString(16)}`)],
    })),
  },
  {
    id: 'lvl-18-pac',
    title: 'Sign the return address (PAC)',
    difficulty: 'Advanced',
    concept: 'ARMv8.3 pointer authentication',
    reference: 'section_6_mobile/02_arm64_mitigations.md',
    description: 'Modern iOS (arm64e) and Android builds sign return addresses. Add paciasp at the start of `work` and autiasp right before its ret. The program must still print and exit normally. Then try the experiment in the hints: change x30 between the two instructions and watch it crash.',
    starterCode: `.global _start
.text
_start:
    bl work
    mov x0, #0
${EXIT}

work:
    stp x29, x30, [sp, #-16]!
    mov x29, sp
    adr x0, msg
    bl puts
    ldp x29, x30, [sp], #16
    ret

.data
msg: .asciz "signed and verified"
`,
    solutionCode: `.global _start
.text
_start:
    bl work
    mov x0, #0
${EXIT}

work:
    paciasp
    stp x29, x30, [sp, #-16]!
    mov x29, sp
    adr x0, msg
    bl puts
    ldp x29, x30, [sp], #16
    autiasp
    ret

.data
msg: .asciz "signed and verified"
`,
    hints: [
      'paciasp signs x30 using sp as the modifier, so sp must be the same at autiasp',
      'Experiment: add "add x30, x30, #4" just before autiasp and run - authentication fails and ret faults',
    ],
    tests: [{ type: 'require', ops: ['paciasp', 'autiasp'], description: 'Uses paciasp and autiasp' }, { type: 'stdout', expected: 'signed and verified\n', exact: true, description: 'Prints the message' }, { type: 'exitCode', expected: 0, description: 'Exits with status 0' }],
  },
  {
    id: 'lvl-19-crackme',
    title: 'Reverse the check',
    difficulty: 'Advanced',
    concept: 'reading code you did not write',
    reference: 'section_5_exploitation/debugging_with_gdb.md',
    description: '`check` returns 1 in X0 only for one 32-bit key passed in W0. Read (or step through) check, work out the key, and set W0 to it before the call. Do not modify check.',
    starterCode: `.global _start
.text
_start:
    mov w0, #0              // TODO: the right key
    bl check
    mov x19, x0
    mov x0, #0
${EXIT}

// --- do not modify below ---
check:
    movz w3, #0x5a5a
    eor w1, w0, w3
    ror w1, w1, #8
    movz w2, #0x5a00, lsl #16
    movk w2, #0x7a5d
    sub w1, w1, w2
    cmp w1, #0x1d
    cset x0, eq
    ret
`,
    solutionCode: `.global _start
.text
_start:
    movz w0, #0x2000
    movk w0, #0x7a, lsl #16
    bl check
    mov x19, x0
    mov x0, #0
${EXIT}

// --- do not modify below ---
check:
    movz w3, #0x5a5a
    eor w1, w0, w3
    ror w1, w1, #8
    movz w2, #0x5a00, lsl #16
    movk w2, #0x7a5d
    sub w1, w1, w2
    cmp w1, #0x1d
    cset x0, eq
    ret
`,
    hints: ['Work backwards: w1 must equal 0x1d after the sub', 'Undo each step in reverse order: add, rotate the other way, eor again'],
    tests: [reg('x19', 1, 'check() returned 1'), { type: 'exitCode', expected: 0, description: 'Exits with status 0' }],
  },
];

// Each sanity value above is checked by tests/engine.test.js, so a typo in a
// reference solution or a check routine fails CI instead of confusing a learner.

export function getLevel(id) {
  return LEVELS.find(l => l.id === id);
}
