// Grader for C labs. A lab supplies the learner-editable files (starter),
// optional hidden files (usually a test harness main.c that calls the
// learner's functions), and test cases that run the linked program with
// given stdin / argv / input files and check the result.
//
// Every run uses AddressSanitizer-style heap checking and leak detection, so
// "it printed the right thing" is not enough: it also has to be memory-safe.

import { compileC, runC, formatDiagnostics } from '../cc/toolchain.js';
import { makeRng } from './grader.js';

const dec = new TextDecoder();

function resolveCases(lab, rng) {
  let cases = typeof lab.cases === 'function' ? lab.cases(rng) : lab.cases;
  if (!cases || !cases.length) cases = [{ name: 'default' }];
  return cases.map((c, i) => ({ name: c.name || `case ${i + 1}`, ...c, tests: [...(lab.tests || []), ...(c.tests || [])] }));
}

function check(t, r, build) {
  const res = { description: t.description || t.type, passed: false, actual: '', expected: '' };
  const show = (s) => JSON.stringify(s.length > 300 ? `${s.slice(0, 300)}...` : s);
  switch (t.type) {
    case 'stdout':
      res.expected = (t.exact === false ? 'contains ' : '') + show(t.expected);
      res.actual = show(r.stdout);
      res.passed = t.exact === false ? r.stdout.includes(t.expected) : r.stdout === t.expected;
      break;
    case 'stdoutMatch':
      res.expected = String(t.pattern); res.actual = show(r.stdout);
      res.passed = new RegExp(t.pattern).test(r.stdout);
      break;
    case 'stderr':
      res.expected = `contains ${show(t.expected)}`; res.actual = show(r.stderr);
      res.passed = r.stderr.includes(t.expected);
      break;
    case 'stderrNotEmpty':
      res.expected = 'an error message on stderr'; res.actual = show(r.stderr);
      res.passed = r.stderr.trim().length > 0;
      break;
    case 'exitCode':
      res.expected = String(t.expected); res.actual = String(r.exitCode);
      res.passed = !r.fault && r.exitCode === t.expected;
      break;
    case 'exitNonZero':
      res.expected = 'non-zero exit status'; res.actual = String(r.exitCode);
      res.passed = !r.fault && r.exitCode !== 0 && r.exitCode !== null;
      break;
    case 'noLeaks':
      res.expected = 'no leaked allocations';
      res.actual = r.leaks.length ? `${r.leaks.length} leak(s), ${r.leaks.reduce((a, l) => a + l.size, 0n)} bytes` : 'none';
      res.passed = r.leaks.length === 0;
      break;
    case 'file': {
      const bytes = r.fileBytes(t.path);
      res.expected = `${t.path} = ${show(t.expected)}`;
      res.actual = bytes ? show(dec.decode(bytes)) : 'file does not exist';
      res.passed = !!bytes && dec.decode(bytes) === t.expected;
      break;
    }
    case 'noWarnings':
      res.expected = 'compiles without warnings';
      res.actual = build.warnings.length ? `${build.warnings.length} warning(s): ${build.warnings[0].message}` : 'clean';
      res.passed = build.warnings.length === 0;
      break;
    case 'maxInstructions':
      res.expected = `<= ${t.expected} instructions`; res.actual = String(r.instructions);
      res.passed = r.instructions <= t.expected;
      break;
    default:
      res.actual = 'unknown test'; res.expected = t.type;
  }
  return res;
}

// files: the learner's files { name: text }
export function gradeCLab(lab, files, { seed, includes = {} } = {}) {
  const rng = makeRng(seed ?? Date.now());
  const cases = resolveCases(lab, rng);
  const results = [];
  let lastBuild = null;
  for (const c of cases) {
    const all = { ...files, ...(lab.hiddenFiles || {}), ...(c.hiddenFiles || {}) };
    const build = compileC(all);
    lastBuild = build;
    if (!build.ok) return { passed: false, compileError: formatDiagnostics(build), cases: [], build };
    const r = runC(build, { stdin: c.stdin || '', args: c.args || [], files: c.files || {}, includes, maxSteps: lab.maxSteps || 5_000_000 });
    let message = null;
    if (r.assembleError) message = r.stderr;
    else if (r.status === 'timeout') message = `${r.message} (infinite loop?)`;
    else if (r.fault) {
      const loc = r.fault.cLocation ? ` at ${r.fault.cLocation.file}:${r.fault.cLocation.line}` : '';
      message = `${r.fault.signal === 'ASAN' ? 'AddressSanitizer' : r.fault.signal}${loc}: ${r.fault.message.split('\n')[0]}`;
    }
    const tests = c.tests.map(t => check(t, r, build));
    results.push({ name: c.name, passed: !message && tests.every(t => t.passed), message, tests, stdout: r.stdout, stderr: r.stderr });
  }
  return { passed: results.every(r => r.passed), cases: results, build: lastBuild, warnings: lastBuild?.warnings || [] };
}
