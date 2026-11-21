// Challenge grader shared by the UI and the Node test suite.
//
// Every grading run assembles the *current* source from scratch (so stale
// state from stepping, or edits that were never re-assembled, cannot leak in)
// and runs it once per test case. Challenges can supply several cases with
// different starting registers / memory / stdin, which stops "solutions"
// that hard-code the expected answer (mov x0, #100) from passing.

import { ARM64Simulator, DEFAULT_MAX_STEPS } from '../simulator/arm64Engine.js';

// Small deterministic PRNG so case generation is reproducible in tests.
export function makeRng(seed = Date.now()) {
  let s = (Number(seed) >>> 0) || 0x9E3779B9;
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 0x100000000; };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

const toBig = (v) => (typeof v === 'bigint' ? v : BigInt(v));
const fmtVal = (v, radix) => {
  const b = BigInt.asUintN(64, toBig(v));
  if (radix === 'hex') return `0x${b.toString(16)}`;
  const signed = BigInt.asIntN(64, b);
  return signed.toString();
};

function resolveCases(challenge, rng) {
  let cases = challenge.cases;
  if (typeof cases === 'function') cases = cases(rng);
  if (!cases || cases.length === 0) cases = [{ name: 'default' }];
  return cases.map((c, i) => ({ name: c.name || `case ${i + 1}`, ...c, tests: c.tests || challenge.tests || [] }));
}

function applySetup(sim, setup = {}) {
  if (setup.regs) {
    for (const [r, v] of Object.entries(setup.regs)) sim.setReg(r, toBig(v));
  }
  if (setup.memory) {
    for (const m of setup.memory) {
      const base = m.label ? sim.symbols.get(m.label) : toBig(m.addr);
      if (base === undefined) throw new Error(`grader: label '${m.label}' not found - did you rename or delete it?`);
      let addr = base + toBig(m.offset || 0);
      if (m.bytes) { for (const b of m.bytes) { sim.writeByte(addr, b); addr += 1n; } }
      if (m.values) {
        const size = m.size || 8;
        for (const v of m.values) {
          let x = BigInt.asUintN(size * 8, toBig(v));
          for (let k = 0; k < size; k++) { sim.writeByte(addr + BigInt(k), Number(x & 0xFFn)); x >>= 8n; }
          addr += BigInt(size);
        }
      }
    }
  }
}

function evalTest(sim, t, runResult) {
  const res = { description: t.description || t.type, passed: false, actual: '', expected: '' };
  switch (t.type) {
    case 'register': {
      const bits = /^w/i.test(t.reg) ? 32 : 64;
      const val = sim.getReg(t.reg);
      const exp = BigInt.asUintN(bits, toBig(t.expected));
      res.actual = fmtVal(val, t.radix); res.expected = fmtVal(exp, t.radix);
      res.passed = BigInt.asUintN(bits, val) === exp;
      break;
    }
    case 'flag': {
      res.actual = String(sim.flags[t.flag]); res.expected = String(t.expected);
      res.passed = sim.flags[t.flag] === Number(t.expected);
      break;
    }
    case 'stdout': {
      const out = sim.stdout;
      res.actual = JSON.stringify(out.length > 200 ? out.slice(0, 200) + '...' : out);
      res.expected = (t.exact ? '' : 'contains ') + JSON.stringify(t.expected);
      res.passed = t.exact ? out === t.expected : out.includes(t.expected);
      break;
    }
    case 'exitCode': {
      res.actual = String(sim.exitCode); res.expected = String(t.expected);
      res.passed = sim.isTerminated && !sim.fault && sim.exitCode === Number(t.expected);
      break;
    }
    case 'memory': {
      const base = t.label ? sim.symbols.get(t.label) : toBig(t.addr);
      if (base === undefined) { res.actual = `label '${t.label}' missing`; res.expected = '-'; break; }
      const addr = base + toBig(t.offset || 0);
      const size = t.size || 8;
      const v = sim.peek(addr, size);
      const exp = BigInt.asUintN(size * 8, toBig(t.expected));
      res.actual = fmtVal(v, t.radix); res.expected = fmtVal(exp, t.radix);
      res.passed = v === exp;
      break;
    }
    case 'fault': {
      // Expect a specific signal (used by "make it crash safely" lessons).
      res.actual = sim.fault ? sim.fault.signal : 'no fault';
      res.expected = t.expected;
      res.passed = !!sim.fault && sim.fault.signal === t.expected;
      break;
    }
    case 'maxInstructions': {
      res.actual = String(sim.cycleCount); res.expected = `<= ${t.expected}`;
      res.passed = sim.cycleCount <= Number(t.expected);
      break;
    }
    case 'staticInstructions': {
      res.actual = String(sim.instructions.length); res.expected = `<= ${t.expected}`;
      res.passed = sim.instructions.length <= Number(t.expected);
      break;
    }
    case 'require': {
      const ops = new Set(sim.instructions.map(i => i.op));
      const missing = t.ops.filter(o => !ops.has(o));
      res.actual = missing.length ? `missing ${missing.join(', ')}` : 'present';
      res.expected = `uses ${t.ops.join(', ')}`;
      res.passed = missing.length === 0;
      break;
    }
    case 'forbid': {
      // Forbid mnemonics, e.g. ['mul'] in a "multiply with shifts" challenge.
      const used = sim.instructions.map(i => i.op).filter(op => t.ops.includes(op));
      res.actual = used.length ? `uses ${[...new Set(used)].join(', ')}` : 'not used';
      res.expected = `no ${t.ops.join('/')}`;
      res.passed = used.length === 0;
      break;
    }
    default:
      res.actual = 'unknown test type'; res.expected = t.type;
  }
  void runResult;
  return res;
}

export function gradeChallenge(challenge, source, { includes = {}, seed, maxSteps = DEFAULT_MAX_STEPS } = {}) {
  const rng = makeRng(seed ?? Date.now());
  const cases = resolveCases(challenge, rng);
  const results = [];
  for (const c of cases) {
    const sim = new ARM64Simulator({ includes, stdin: c.stdin || '' });
    const asm = sim.assemble(source);
    if (!asm.success) {
      return { passed: false, assembleError: asm.error, cases: [] };
    }
    let run;
    try {
      applySetup(sim, c.setup);
      run = sim.run(c.maxSteps || challenge.maxSteps || maxSteps, { ignoreBreakpoints: true });
    } catch (err) {
      results.push({ name: c.name, passed: false, message: err.message, tests: [] });
      continue;
    }
    const expectsFault = c.tests.some(t => t.type === 'fault');
    let message = null;
    if (run.status === 'timeout') message = run.message;
    else if (sim.fault && !expectsFault) message = `Program crashed: ${sim.lastError}`;
    else if (run.fellOff) message = 'Program ran past its last instruction without exiting (add an exit syscall or ret from main)';
    const tests = c.tests.map(t => evalTest(sim, t, run));
    const passed = !message && tests.every(t => t.passed);
    results.push({ name: c.name, passed, message, tests, setup: c.setup, stdout: sim.stdout });
  }
  return { passed: results.length > 0 && results.every(r => r.passed), cases: results };
}
