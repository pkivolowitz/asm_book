// Run with: npm test   (Node's built-in test runner, no extra dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARM64Simulator, isBitmaskImmediate } from '../src/simulator/arm64Engine.js';
import { SAMPLE_PROGRAMS } from '../src/simulator/samplePrograms.js';
import { LESSON_EXERCISES } from '../src/data/lessonExercises.js';
import { gradeChallenge } from '../src/lib/grader.js';
import { LEVELS } from '../src/data/levels.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const MACROS = fs.readFileSync(path.join(here, '../../macros/apple-linux-convergence.S'), 'utf8');
const includes = { 'apple-linux-convergence.S': MACROS };

function run(src, opts = {}) {
  const sim = new ARM64Simulator({ includes, ...opts });
  const a = sim.assemble(src);
  if (!a.success) return { sim, asmError: a.error };
  const r = sim.run(1_000_000, { ignoreBreakpoints: true });
  return { sim, r };
}
const exitProg = (body, data = '') => `.global _start\n.text\n_start:\n${body}\n    mov x8, #93\n    svc #0\n${data ? '.data\n' + data : ''}`;
const asmErr = (src) => { const { asmError } = run(src); assert.ok(asmError, 'expected an assembly error'); return asmError; };

test('every sample program assembles and exits cleanly', () => {
  for (const p of SAMPLE_PROGRAMS) {
    const { sim, r, asmError } = run(p.code);
    assert.equal(asmError, undefined, `${p.id}: ${asmError}`);
    assert.ok(!sim.fault, `${p.id} faulted: ${sim.lastError}`);
    assert.equal(r.status, 'terminated', `${p.id}: ${r.message}`);
    assert.ok(!r.fellOff, `${p.id} fell off the end`);
  }
});

const allExercises = [];
for (const list of Object.values(LESSON_EXERCISES)) allExercises.push(...list);

export function checkChallenge(ex) {
  for (const seed of [1, 42, 9999]) {
    const good = gradeChallenge(ex, ex.solutionCode, { includes, seed });
    assert.equal(good.assembleError, undefined, `solution does not assemble: ${good.assembleError}`);
    for (const c of good.cases) assert.ok(c.passed, `solution fails ${c.name} (seed ${seed}): ${c.message || JSON.stringify(c.tests.filter(t => !t.passed))}`);
  }
  const starter = gradeChallenge(ex, ex.starterCode, { includes, seed: 42 });
  assert.equal(starter.passed, false, 'starter code already passes - the challenge checks nothing');
}

for (const lvl of LEVELS) {
  test(`level ${lvl.id}: solution passes, starter does not`, () => checkChallenge(lvl));
}

for (const ex of allExercises) {
  test(`exercise ${ex.id}: solution passes, starter does not`, () => checkChallenge(ex));
}

test('W writes zero-extend; X keeps 64 bits', () => {
  const { sim } = run(exitProg('    mov x0, #-1\n    mov w0, #0x1234\n    mov x1, #-1\n    add w2, w1, #1'));
  assert.equal(sim.x[0], 0x1234n);
  assert.equal(sim.x[2], 0n);
});

test('flags: signed/unsigned compares and overflow', () => {
  const { sim } = run(exitProg('    mov x0, #0x7fffffffffffffff\n    adds x1, x0, #1'));
  assert.deepEqual(sim.flags, { N: 1, Z: 0, C: 0, V: 1 });
  const { sim: s2 } = run(exitProg('    mov x0, #0\n    subs x1, x0, #1'));
  assert.deepEqual(s2.flags, { N: 1, Z: 0, C: 0, V: 0 });
  const { sim: s3 } = run(exitProg('    mov x0, #5\n    cmp x0, #5'));
  assert.deepEqual(s3.flags, { N: 0, Z: 1, C: 1, V: 0 });
});

test('rejects things GNU as rejects', () => {
  assert.match(asmErr(exitProg('    mov x0, #0x12345678')), /movz|movk/);
  assert.match(asmErr(exitProg('    add x0, x1, #5000')), /out of range/);
  assert.match(asmErr(exitProg('    frobnicate x0')), /unknown instruction/);
  assert.match(asmErr(exitProg('    b nowhere')), /undefined symbol/);
  assert.match(asmErr(exitProg('    bl not_a_function')), /undefined function/);
  assert.match(asmErr(exitProg('    add x0, w1, w2')), /sizes do not match/);
  assert.match(asmErr(exitProg('    and x0, x1, #5')), /bitmask/);
  assert.match(asmErr(exitProg('    ldr x0, [x1, #4097]')), /out of range/);
  assert.match(asmErr(exitProg('    mov x0, msg', 'msg: .asciz "hi"')), /adr/);
  assert.match(asmErr(exitProg('    mov x31, #1')), /not a valid register/);
  assert.match(asmErr('.text\n_start:\n  .bogus 1\n'), /unknown or unsupported directive/);
});

test('bitmask immediate encoder agrees with known values', () => {
  for (const v of [0xFFn, 0x5555555555555555n, 0xFFFF0000FFFF0000n, 0x7FFFFFFFFFFFFFFFn, 0x00000000FFFFFFFFn]) assert.ok(isBitmaskImmediate(v, 64), v.toString(16));
  for (const v of [0n, 0xFFFFFFFFFFFFFFFFn, 5n, 0x1234n]) assert.ok(!isBitmaskImmediate(v, 64), v.toString(16));
});

test('book macros, local labels and :lo12: work', () => {
  const src = `#include "apple-linux-convergence.S"
        GLABEL main
        .text
        .p2align 2
MAIN
        PUSH_P  x29, x30
        mov     x29, sp
        mov     x0, #3
        mov     x1, #9
        MAX     x0, x1, x2
        cmp     x0, x1
        b.lt    1f
        mov     x3, #111
1:      adrp    x4, msg
        add     x4, x4, :lo12:msg
        LLD_ADDR x0, fmt
        mov     x1, x2
        CRT     printf
        mov     x0, x4
        CRT     puts
        POP_P   x29, x30
        mov     w0, #7
        ret
        .data
fmt:    .asciz  "max=%ld\\n"
msg:    .asciz  "hello"
`;
  const { sim, r, asmError } = run(src);
  assert.equal(asmError, undefined, asmError);
  assert.equal(r.status, 'terminated', r.message);
  assert.equal(sim.stdout, 'max=9\nhello\n');
  assert.equal(sim.x[3], 0n, 'branch to 1f should skip the mov');
  assert.equal(sim.exitCode, 7, 'ret from main exits with w0');
});

test('memory faults are reported like a real process', () => {
  const { sim } = run(exitProg('    mov x1, #0\n    ldr x0, [x1]'));
  assert.equal(sim.fault.signal, 'SIGSEGV');
  assert.match(sim.lastError, /NULL/);
  const { sim: s2 } = run(exitProg('    sub sp, sp, #8\n    str x0, [sp]'));
  assert.equal(s2.fault.signal, 'SIGBUS');
  const { sim: s3 } = run(exitProg('    adr x1, _start\n    str x0, [x1]'));
  assert.match(s3.lastError, /read-only/);
});

test('stack frames, pre/post index and ldp/stp offsets', () => {
  const { sim, r } = run(`.text
_start:
    mov x0, #5
    bl  square
    mov x8, #93
    svc #0
square:
    stp x29, x30, [sp, #-32]!
    mov x29, sp
    str x0, [sp, #16]
    ldr x1, [sp, #16]
    mul x0, x1, x1
    ldp x29, x30, [sp], #32
    ret
`);
  assert.equal(r.status, 'terminated', r.message);
  assert.equal(sim.x[0], 25n);
  assert.equal(sim.sp, sim.initialSp);
});

test('printf formats', () => {
  const { sim } = run(exitProg(`    adr x0, f
    mov x1, #-5
    mov x2, #255
    adr x3, s
    mov x4, #65
    mov x5, #-1
    mov x6, #-5
    mov x7, #7
    bl printf`, 'f: .asciz "%d|%04x|%s|%c|%lu|%5d|%-3d|%%\\n"\ns: .asciz "str"'));
  assert.equal(sim.stdout, '-5|00ff|str|A|18446744073709551615|   -5|7  |%\n');
});

test('read syscall and stdin', () => {
  const { sim } = run(exitProg(`    mov x0, #0
    adr x1, buf
    mov x2, #16
    mov x8, #63
    svc #0
    mov x2, x0
    mov x0, #1
    adr x1, buf
    mov x8, #64
    svc #0
    mov x0, #0`, 'buf: .space 16'), { stdin: 'abc\n' });
  assert.equal(sim.stdout, 'abc\n');
});

test('PAC: modified return address faults on ret', () => {
  const { sim } = run(`.text
_start:
    bl f
    mov x8, #93
    svc #0
f:
    paciasp
    add x30, x30, #4
    autiasp
    ret
`);
  assert.ok(sim.fault, 'expected a fault');
  assert.match(sim.lastError, /PAC|non-canonical/);
  const { sim: ok } = run(`.text
_start:
    bl f
    mov x8, #93
    svc #0
f:
    paciasp
    autiasp
    ret
`);
  assert.ok(!ok.fault, ok.lastError);
});

test('infinite loops are stopped', () => {
  const sim = new ARM64Simulator();
  sim.assemble('.text\n_start:\n b _start\n');
  const r = sim.run(10000);
  assert.equal(r.status, 'timeout');
});

test('falling off the end is reported', () => {
  const { r } = run('.text\n_start:\n mov x0, #1\n');
  assert.ok(r.fellOff);
});

test('strings: escapes, commas and semicolons inside quotes', () => {
  const { sim } = run(exitProg(`    adr x0, s
    bl puts
    mov x0, #0`, 's: .asciz "a; b // c, \\"q\\" \\x41\\101"'));
  assert.equal(sim.stdout, 'a; b // c, "q" AA\n');
});

test('.equ, . and expressions', () => {
  const { sim } = run(exitProg(`    mov x0, #1
    adr x1, msg
    mov x2, #len
    mov x8, #64
    svc #0
    mov x3, #(1 << 4) | 3`, 'msg: .ascii "hello!"\n.equ len, . - msg'));
  assert.equal(sim.stdout, 'hello!');
  assert.equal(sim.x[3], 19n);
});

test('floating point basics', () => {
  const { sim } = run(exitProg(`    fmov d0, #1.5
    fmov d1, #2.0
    fmul d2, d0, d1
    fcvtzs x0, d2
    adr x1, val
    ldr d3, [x1]
    fadd d3, d3, d0
    fcmp d3, d2`, '.p2align 3\nval: .double 2.25'));
  assert.equal(sim.x[0], 3n);
  assert.equal(sim.getDouble(3), 3.75);
  assert.equal(sim.flags.N, 0);
});

test('breakpoints survive re-assembly', () => {
  const sim = new ARM64Simulator();
  sim.toggleBreakpoint(3);
  sim.assemble('.text\n_start:\n mov x0, #1\n mov x1, #2\n mov x8, #93\n svc #0\n');
  assert.ok(sim.breakpoints.has(3));
  const r = sim.run(100);
  assert.equal(r.status, 'breakpoint');
});
