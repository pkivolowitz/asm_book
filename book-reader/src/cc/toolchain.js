// compile -> link -> run for C programs in the browser.
//
//   const build = compileC({ 'main.c': src, 'kv.h': hdr, 'kv.c': impl });
//   if (build.ok) { const r = runC(build, { stdin, args, files }); }
//
// Each .c file is a separate translation unit (static names stay private),
// then all units are linked into one assembly program for the simulator.

import { Preprocessor } from './preprocessor.js';
import { Parser } from './parser.js';
import { CodeGen } from './codegen.js';
import { CError } from './lexer.js';
import { SYSTEM_HEADERS, PRELUDE } from './headers.js';
import { ARM64Simulator, CRT_FUNCTIONS, DEFAULT_MAX_STEPS } from '../simulator/arm64Engine.js';

const PRELUDE_NAME = '<libc-prelude>.c';

function compileUnit(name, files, warnings, defines) {
  const pp = new Preprocessor(files, SYSTEM_HEADERS, { predefined: defines });
  const toks = pp.run(name);
  warnings.push(...pp.warnings);
  const parser = new Parser(toks, { fileName: name, warnings });
  const globals = parser.parse();
  return globals;
}

const fmtErr = (e) => ({ file: e.file, line: e.line, col: e.col, message: e.message });

export function compileC(files, { defines = {} } = {}) {
  const warnings = [];
  const errors = [];
  const units = [];
  const cFiles = Object.keys(files).filter(f => /\.c$/.test(f));
  const asmFiles = Object.keys(files).filter(f => /\.(s|S|asm)$/.test(f));
  if (!cFiles.length && !asmFiles.length) return { ok: false, errors: [{ message: 'no .c or .s files to build' }], warnings };
  // Symbols defined by hand-written assembly files (labels, .global, the book's macros).
  const asmDefined = new Set();
  for (const f of asmFiles) {
    const src = files[f];
    for (const m of src.matchAll(/^\s*([A-Za-z_][\w.$]*)\s*:/gm)) asmDefined.add(m[1].replace(/^_/, ''));
    for (const m of src.matchAll(/^\s*(?:\.globl|\.global|GLABEL)\s+([A-Za-z_][\w.$]*)/gm)) asmDefined.add(m[1].replace(/^_/, ''));
    if (/^\s*MAIN\b/m.test(src)) asmDefined.add('main');
  }
  const allFiles = { ...files, [PRELUDE_NAME]: PRELUDE };
  for (const name of [...cFiles, PRELUDE_NAME]) {
    try {
      units.push({ name, globals: compileUnit(name, allFiles, name === PRELUDE_NAME ? [] : warnings, defines) });
    } catch (e) {
      if (e instanceof CError) errors.push(fmtErr(e));
      else { console.error(e); errors.push({ file: name, message: `internal compiler error: ${e.message}` }); }
    }
  }
  if (errors.length) return { ok: false, errors, warnings };

  // ---- link: give static symbols unit-private names, check definitions ----
  const defined = new Map(); // name -> { unit, obj }
  units.forEach((u, idx) => {
    for (const g of u.globals) {
      if (!g.name) continue;
      if (g.isStatic) { g.asmName = g.asmName === g.name ? `${g.name}.u${idx}` : g.asmName; continue; }
      if (!g.isDefinition) continue;
      const prev = defined.get(g.name);
      if (prev) {
        errors.push({ file: u.name, line: g.tok?.line, col: g.tok?.col, message: `multiple definition of '${g.name}' (first defined in ${prev.unit})` });
        continue;
      }
      defined.set(g.name, { unit: u.name, obj: g });
    }
  });
  // unify extern declarations with their definitions in other units
  for (const u of units) for (const g of u.globals) {
    if (g.name && !g.isStatic && !g.isDefinition && defined.has(g.name)) {
      const d = defined.get(g.name).obj;
      if (!!g.isFunction !== !!d.isFunction) errors.push({ file: u.name, line: g.tok?.line, col: g.tok?.col, message: `'${g.name}' is declared as a ${g.isFunction ? 'function' : 'variable'} here but defined as a ${d.isFunction ? 'function' : 'variable'} elsewhere` });
      g.asmName = d.asmName;
    }
  }
  const lines = [];
  const referenced = new Set();
  units.forEach((u, idx) => {
    try {
      const cg = new CodeGen({ unitName: `u${idx}` });
      lines.push(...cg.generate(u.globals));
      for (const o of cg.referenced) referenced.add(o);
    } catch (e) {
      if (e instanceof CError) errors.push(fmtErr(e)); else { console.error(e); errors.push({ file: u.name, message: `internal compiler error: ${e.message}` }); }
    }
  });
  for (const o of referenced) {
    if (o.isDefinition || o.isLiteral) continue;
    if (o.isStatic && o.isFunction) { errors.push({ file: o.tok?.file, line: o.tok?.line, col: o.tok?.col, message: `static function '${o.name}' is used but never defined` }); continue; }
    if (defined.has(o.name) || asmDefined.has(o.name)) continue;
    if (o.isFunction && CRT_FUNCTIONS.includes(o.name)) continue;
    errors.push({ file: o.tok?.file, line: o.tok?.line, col: o.tok?.col, message: `undefined reference to '${o.name}' (declared but never defined${o.isFunction ? '; is the .c file that defines it part of the build?' : ''})` });
  }
  if (!defined.has('main') && !asmDefined.has('main') && !errors.length) errors.push({ message: "undefined reference to 'main' (every program needs an int main(void) or int main(int argc, char **argv))" });
  if (errors.length) return { ok: false, errors, warnings };
  for (const f of asmFiles) {
    lines.push({ text: '', file: null }, { text: `// ---- ${f} ----`, file: null }, { text: '    .text', file: null });
    files[f].replace(/\r\n?/g, '\n').split('\n').forEach((text, i) => lines.push({ text, file: f, line: i + 1 }));
  }
  const asm = lines.map(l => l.text).join('\n') + '\n';
  // keep the prelude's line info out of the user's view
  const lineMap = lines.map(l => (l.file && l.file !== PRELUDE_NAME && SYSTEM_HEADERS[l.file] === undefined ? { file: l.file, line: l.line } : null));
  return { ok: true, asm, lineMap, warnings, errors: [] };
}

// Format diagnostics like clang: "main.c:3:5: error: ..."
export function formatDiagnostics(build) {
  const out = [];
  for (const e of build.errors || []) out.push(`${e.file ? `${e.file}:${e.line ?? '?'}:${e.col ?? '?'}: ` : ''}error: ${e.message}`);
  for (const w of build.warnings || []) out.push(`${w.file ? `${w.file}:${w.line ?? '?'}:${w.col ?? '?'}: ` : ''}warning: ${w.message}`);
  return out.join('\n');
}

export function runC(build, { stdin = '', args = [], files = {}, asan = true, leakCheck = true, maxSteps = DEFAULT_MAX_STEPS, includes = {} } = {}) {
  const sim = new ARM64Simulator({ stdin, args, files, asan, leakCheck, includes });
  const a = sim.assemble(build.asm);
  if (!a.success) {
    const li = a.errors?.[0]?.line;
    const loc = li != null ? build.lineMap[li] : null;
    const where = loc ? `${loc.file}:${loc.line}: ` : '';
    return { status: 'error', assembleError: true, message: a.error, stdout: '', stderr: `${where}assembler error: ${a.error.replace(/^Line \d+[^:]*: /, '')}`, exitCode: null, fault: null, leaks: [], instructions: 0, files: {}, sim };
  }
  const r = sim.run(maxSteps, { ignoreBreakpoints: true });
  const at = sim.fault && sim.fault.line != null ? build.lineMap[sim.fault.line] : null;
  // Walk the saved frame pointers to give a C-level backtrace.
  const backtrace = [];
  if (sim.fault) {
    const pcLine = (pc) => { const li = sim.pcToLineIndex.get(pc); return li != null ? build.lineMap[li] : null; };
    let fp = sim.x[29];
    for (let i = 0; i < 16 && fp; i++) {
      let lr;
      try { lr = sim.peek(fp + 8n, 8); fp = sim.peek(fp, 8); } catch { break; }
      if (!lr) break;
      const loc = pcLine(lr - 4n);
      if (loc) backtrace.push(loc);
      if (fp < 0x7C0000n || fp >= 0x800000n) break;
    }
  }
  // The engine reports faults at assembly lines; C users want the C line.
  let stderr = sim.stderr;
  if (sim.fault) {
    const cWhere = at ? ` at ${at.file}:${at.line}` : '';
    stderr = stderr.replace(/ at line \d+ \(`[^`]*`\)/, cWhere);
  }
  return {
    status: r.status, // 'terminated' | 'error' | 'timeout'
    message: r.message,
    stdout: sim.stdout,
    stderr,
    exitCode: sim.exitCode,
    fault: sim.fault ? { ...sim.fault, cLocation: at, backtrace } : null,
    leaks: sim.leaks || [],
    instructions: sim.cycleCount,
    files: Object.fromEntries(sim.libc.listFiles().map(f => [f, new TextDecoder().decode(sim.fileContents(f))])),
    fileBytes: (path) => sim.fileContents(path),
    sim,
  };
}

// Convenience: compile and run in one call.
export function buildAndRun(files, opts = {}) {
  const build = compileC(files, opts);
  if (!build.ok) return { build, run: null };
  return { build, run: runC(build, opts) };
}
