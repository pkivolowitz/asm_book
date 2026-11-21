// ARM64 (AArch64) user-mode simulator for learning and step-debugging.
//
// Design goals:
//   * Never run code wrongly without saying so. Unknown mnemonics, undefined
//     symbols, bad registers, unencodable immediates and out-of-range offsets
//     are reported at assemble time with a line number, the way GNU as does.
//   * Behave like a real Linux AArch64 process where it matters for learning:
//     memory is split into mapped regions with permissions, so a bad pointer
//     faults with SIGSEGV; SP must be 16-byte aligned when used as a base
//     register (SIGBUS); writing a W register zeroes the upper half; returning
//     from main exits with w0 & 0xff.
//   * Run the book's own sources: C-preprocessor conditionals, #include of the
//     apple-linux-convergence.S macro file, .macro/.endm, local labels (1f/1b),
//     .equ/.set, :lo12: relocations and ldr =literal.
//
// This is an interpreter, not a binary emulator: instructions are not encoded
// into machine words, so self-modifying code and jumping into data are not
// supported (execution faults instead).

import { Fault, ExitSignal } from './faults.js';
import { LibC, CRT_FUNCTIONS, HEAP_BASE, HEAP_SIZE, LIBC_BASE, LIBC_SIZE } from './libc.js';

export { CRT_FUNCTIONS, HEAP_BASE };

const M64 = 0xFFFFFFFFFFFFFFFFn;
const M32 = 0xFFFFFFFFn;

export const DEFAULT_PC = 0x00400000n;
export const DEFAULT_DATA_ADDR = 0x00410000n;
// Read-only data (.rodata, string literals) lives just below .text, within adr range.
export const RODATA_ADDR = 0x003E0000n;
const RODATA_MAX = 0x10000;
export const STACK_TOP = 0x00800000n;
export const DEFAULT_SP = 0x007FFF00n;
// main() is entered with x30 pointing here; returning to it exits the process.
export const EXIT_SENTINEL = 0x00000000003FFFF0n;

const TEXT_MAX = 0x10000;          // 64 KiB of text (16384 instructions)
const DATA_MAX = 0x100000;         // 1 MiB of data/bss
const STACK_SIZE = 0x40000;        // 256 KiB stack
export const DEFAULT_MAX_STEPS = 5_000_000;

const CONDS = ['eq', 'ne', 'cs', 'hs', 'cc', 'lo', 'mi', 'pl', 'vs', 'vc', 'hi', 'ls', 'ge', 'lt', 'gt', 'le', 'al', 'nv'];


export class AsmError extends Error {}


const mask = (bits) => (bits === 64 ? M64 : bits === 32 ? M32 : (1n << BigInt(bits)) - 1n);

function signExtend(v, bits) {
  const m = mask(bits);
  v &= m;
  const sign = 1n << BigInt(bits - 1);
  return (v & sign) ? v - (1n << BigInt(bits)) : v;
}

// ---------------------------------------------------------------------------
// Immediate encodability checks (what the real assembler accepts)
// ---------------------------------------------------------------------------

export function isBitmaskImmediate(value, bits) {
  const m = mask(bits);
  const v = value & m;
  if (v === 0n || v === m) return false;
  for (let size = 2; size <= bits; size *= 2) {
    const em = mask(size);
    const elem = v & em;
    let rep = 0n;
    for (let i = 0; i < bits; i += size) rep |= elem << BigInt(i);
    if (rep !== v) continue;
    if (elem === 0n || elem === em) return false;
    // A rotated run of ones has exactly two bit transitions around the circle.
    let transitions = 0;
    for (let i = 0; i < size; i++) {
      const a = (elem >> BigInt(i)) & 1n;
      const b = (elem >> BigInt((i + 1) % size)) & 1n;
      if (a !== b) transitions++;
    }
    return transitions === 2;
  }
  return false;
}

function movWideShift(value, bits) {
  // Returns the shift if value is a single 16-bit chunk, else -1.
  const v = value & mask(bits);
  for (let sh = 0; sh < bits; sh += 16) {
    if ((v & ~(0xFFFFn << BigInt(sh)) & mask(bits)) === 0n) return sh;
  }
  return -1;
}

export function isMovEncodable(value, bits) {
  const m = mask(bits);
  const v = value & m;
  return movWideShift(v, bits) >= 0 || movWideShift(~v & m, bits) >= 0 || isBitmaskImmediate(v, bits);
}

// ---------------------------------------------------------------------------
// Expression evaluation (GAS-like): numbers, symbols, . , :lo12:, @PAGE
// ---------------------------------------------------------------------------

function tokenizeExpr(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (src.startsWith(':lo12:', i)) { toks.push({ t: 'lo12' }); i += 6; continue; }
    if (src.startsWith(':pg_hi21:', i)) { toks.push({ t: 'page' }); i += 9; continue; }
    if (src.startsWith(':got:', i)) { i += 5; continue; }
    if (src.startsWith(':got_lo12:', i)) { toks.push({ t: 'lo12' }); i += 10; continue; }
    if (c === "'") {
      // 'A' or 'A (GAS) or '\n'
      let ch; let j = i + 1;
      if (src[j] === '\\') {
        const e = src[j + 1];
        ch = ({ n: 10, t: 9, r: 13, '0': 0, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11 })[e];
        if (ch === undefined) ch = e.charCodeAt(0);
        j += 2;
      } else { ch = src.charCodeAt(j); j += 1; }
      if (src[j] === "'") j++;
      toks.push({ t: 'num', v: BigInt(ch) });
      i = j; continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|[0-9]+[fb](?![0-9A-Za-z_])|[0-9]+)/.exec(src.slice(i));
      const s = m[1].replace(/_/g, '');
      if (/^[0-9]+[fb]$/.test(s)) toks.push({ t: 'local', v: s });
      else if (/^0[0-7]+$/.test(s)) toks.push({ t: 'num', v: BigInt('0o' + s.slice(1)) });
      else if (/^0[0-9]+$/.test(s)) throw new AsmError(`invalid octal constant '${s}'`);
      else toks.push({ t: 'num', v: BigInt(s) });
      i += m[1].length; continue;
    }
    if (/[A-Za-z_.$]/.test(c)) {
      const m = /^[A-Za-z_.$][\w.$]*(@[A-Za-z]+)?/.exec(src.slice(i));
      let name = m[0]; let reloc = null;
      const at = name.indexOf('@');
      if (at >= 0) { reloc = name.slice(at + 1).toUpperCase(); name = name.slice(0, at); }
      toks.push({ t: 'sym', v: name, reloc });
      i += m[0].length; continue;
    }
    const two = src.slice(i, i + 2);
    if (['<<', '>>', '&&', '||', '==', '!=', '<=', '>='].includes(two)) { toks.push({ t: 'op', v: two }); i += 2; continue; }
    if ('+-*/%&|^~!()<>'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    throw new AsmError(`unexpected character '${c}' in expression '${src}'`);
  }
  return toks;
}

const BIN_PREC = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };

export function evalExpr(src, resolve) {
  const toks = tokenizeExpr(String(src));
  if (toks.length === 0) throw new AsmError('missing expression');
  let p = 0;
  const peek = () => toks[p];
  function primary() {
    const t = toks[p++];
    if (!t) throw new AsmError(`incomplete expression '${src}'`);
    if (t.t === 'num') return t.v;
    if (t.t === 'local') return resolve({ kind: 'local', name: t.v });
    if (t.t === 'sym') {
      const v = resolve({ kind: 'sym', name: t.v });
      if (t.reloc === 'PAGE' || t.reloc === 'GOTPAGE') return v & ~0xFFFn;
      if (t.reloc === 'PAGEOFF' || t.reloc === 'GOTPAGEOFF') return v & 0xFFFn;
      if (t.reloc) throw new AsmError(`unsupported relocation @${t.reloc}`);
      return v;
    }
    if (t.t === 'lo12') return unary() & 0xFFFn;
    if (t.t === 'page') return unary() & ~0xFFFn;
    if (t.t === 'op' && t.v === '(') {
      const v = binary(0);
      if (!peek() || peek().v !== ')') throw new AsmError(`missing ')' in '${src}'`);
      p++;
      return v;
    }
    throw new AsmError(`unexpected '${t.v ?? t.t}' in expression '${src}'`);
  }
  function unary() {
    const t = peek();
    if (t && t.t === 'op' && ['-', '~', '!', '+'].includes(t.v)) {
      p++;
      const v = unary();
      if (t.v === '-') return -v;
      if (t.v === '~') return ~v;
      if (t.v === '!') return v === 0n ? 1n : 0n;
      return v;
    }
    return primary();
  }
  function binary(minPrec) {
    let lhs = unary();
    for (;;) {
      const t = peek();
      if (!t || t.t !== 'op' || !(t.v in BIN_PREC) || BIN_PREC[t.v] < minPrec) return lhs;
      p++;
      const rhs = binary(BIN_PREC[t.v] + 1);
      switch (t.v) {
        case '+': lhs = lhs + rhs; break;
        case '-': lhs = lhs - rhs; break;
        case '*': lhs = lhs * rhs; break;
        case '/': if (rhs === 0n) throw new AsmError('division by zero in expression'); lhs = lhs / rhs; break;
        case '%': if (rhs === 0n) throw new AsmError('division by zero in expression'); lhs = lhs % rhs; break;
        case '<<': lhs = lhs << rhs; break;
        case '>>': lhs = lhs >> rhs; break;
        case '&': lhs = lhs & rhs; break;
        case '|': lhs = lhs | rhs; break;
        case '^': lhs = lhs ^ rhs; break;
        case '&&': lhs = (lhs !== 0n && rhs !== 0n) ? 1n : 0n; break;
        case '||': lhs = (lhs !== 0n || rhs !== 0n) ? 1n : 0n; break;
        case '==': lhs = lhs === rhs ? 1n : 0n; break;
        case '!=': lhs = lhs !== rhs ? 1n : 0n; break;
        case '<': lhs = lhs < rhs ? 1n : 0n; break;
        case '>': lhs = lhs > rhs ? 1n : 0n; break;
        case '<=': lhs = lhs <= rhs ? 1n : 0n; break;
        case '>=': lhs = lhs >= rhs ? 1n : 0n; break;
      }
    }
  }
  const v = binary(0);
  if (p !== toks.length) throw new AsmError(`unexpected '${toks[p].v ?? toks[p].t}' in expression '${src}'`);
  return v;
}

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

// Remove /* */ comments (keeping newlines so line numbers stay correct).
function stripBlockComments(src) {
  let out = ''; let inStr = false; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      out += c;
      if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue; }
      if (c === '"') inStr = false;
      i++; continue;
    }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    if (c === '\n') { inStr = false; }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const chunk = end === -1 ? src.slice(i) : src.slice(i, end + 2);
      out += chunk.replace(/[^\n]/g, ' ');
      i += chunk.length; continue;
    }
    out += c; i++;
  }
  return out;
}

// Strip a // comment and split on ';' (GAS statement separator), respecting strings.
function splitStatements(line, semicolonComments = false) {
  const stmts = []; let cur = ''; let inStr = false; let inChr = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) { cur += c; if (c === '\\') { cur += line[++i] ?? ''; } else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; cur += c; continue; }
    if (c === "'" && !inChr) {
      // character literal like 'A' or '\n'
      const m = /^'(\\.|.)'?/.exec(line.slice(i));
      if (m) { cur += m[0]; i += m[0].length - 1; continue; }
    }
    if (c === '/' && line[i + 1] === '/') break;
    if (c === ';') { if (semicolonComments) break; stmts.push(cur); cur = ''; continue; }
    cur += c;
  }
  stmts.push(cur);
  return stmts.map(s => s.trim()).filter(Boolean);
}

// Split operands on commas that are not inside [] {} () or quotes.
export function splitOperands(text) {
  const out = []; let cur = ''; let depth = 0; let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) { cur += c; if (c === '\\') cur += text[++i] ?? ''; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; cur += c; continue; }
    if (c === '[' || c === '{' || c === '(') depth++;
    if (c === ']' || c === '}' || c === ')') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim() || out.length) out.push(cur.trim());
  return out;
}

function parseStringLiteral(s) {
  // Returns { bytes, rest } for a leading "..." literal.
  s = s.trim();
  if (s[0] !== '"') throw new AsmError(`expected a quoted string, got '${s}'`);
  const bytes = [];
  let i = 1;
  for (;;) {
    if (i >= s.length) throw new AsmError('unterminated string literal');
    const c = s[i];
    if (c === '"') { i++; break; }
    if (c === '\\') {
      const e = s[i + 1];
      if (e === 'x' || e === 'X') {
        const m = /^[0-9a-fA-F]{1,2}/.exec(s.slice(i + 2));
        if (!m) throw new AsmError('bad \\x escape');
        bytes.push(parseInt(m[0], 16)); i += 2 + m[0].length; continue;
      }
      if (/[0-7]/.test(e)) {
        const m = /^[0-7]{1,3}/.exec(s.slice(i + 1));
        bytes.push(parseInt(m[0], 8) & 0xFF); i += 1 + m[0].length; continue;
      }
      const map = { n: 10, t: 9, r: 13, '\\': 92, '"': 34, "'": 39, a: 7, b: 8, f: 12, v: 11, e: 27 };
      if (!(e in map)) throw new AsmError(`unknown escape '\\${e}' in string`);
      bytes.push(map[e]); i += 2; continue;
    }
    // Encode non-ASCII characters as UTF-8.
    const cp = s.codePointAt(i);
    const enc = new TextEncoder().encode(String.fromCodePoint(cp));
    bytes.push(...enc);
    i += cp > 0xFFFF ? 2 : 1;
  }
  return { bytes, rest: s.slice(i).trim() };
}

// ---------------------------------------------------------------------------
// Register parsing
// ---------------------------------------------------------------------------

function parseRegName(name, aliases) {
  let n = name.trim().toLowerCase();
  if (aliases && aliases.has(n)) n = aliases.get(n);
  if (n === 'sp') return { cls: 'gp', bits: 64, sp: true, name: 'sp' };
  if (n === 'wsp') return { cls: 'gp', bits: 32, sp: true, name: 'wsp' };
  if (n === 'xzr') return { cls: 'gp', bits: 64, zr: true, name: 'xzr' };
  if (n === 'wzr') return { cls: 'gp', bits: 32, zr: true, name: 'wzr' };
  if (n === 'lr') n = 'x30';
  if (n === 'fp') n = 'x29';
  if (n === 'ip0') n = 'x16';
  if (n === 'ip1') n = 'x17';
  let m = /^([xw])([0-9]{1,2})$/.exec(n);
  if (m) {
    const idx = Number(m[2]);
    if (idx > 30) return null;
    return { cls: 'gp', bits: m[1] === 'x' ? 64 : 32, n: idx, name: n };
  }
  m = /^([ds])([0-9]{1,2})$/.exec(n);
  if (m) {
    const idx = Number(m[2]);
    if (idx > 31) return null;
    return { cls: 'fp', bits: m[1] === 'd' ? 64 : 32, n: idx, name: n };
  }
  return null;
}

const f64ToBits = (f) => { const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, f, true); return dv.getBigUint64(0, true); };
const bitsToF64 = (b) => { const dv = new DataView(new ArrayBuffer(8)); dv.setBigUint64(0, BigInt.asUintN(64, b), true); return dv.getFloat64(0, true); };
const f32ToBits = (f) => { const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, f, true); return BigInt(dv.getUint32(0, true)); };
const bitsToF32 = (b) => { const dv = new DataView(new ArrayBuffer(4)); dv.setUint32(0, Number(b & M32), true); return dv.getFloat32(0, true); };

// ---------------------------------------------------------------------------
// The simulator
// ---------------------------------------------------------------------------

export class ARM64Simulator {
  constructor(options = {}) {
    this.options = options;
    this.includes = options.includes || {};
    this.libc = new LibC(this, options);
    this.reset();
  }

  reset() {
    this.x = new Array(31).fill(0n);
    this.v = new Array(32).fill(0n); // raw 64-bit FP register bits (d0-d31; s = low 32)
    this.sp = DEFAULT_SP;
    this.pc = DEFAULT_PC;
    this.flags = { N: 0, Z: 1, C: 0, V: 0 };
    this.regions = [];
    this.memory = { size: 0 }; // kept for backwards compatibility with older UI code
    this.instructions = [];
    this.instMap = new Map();
    this.labels = new Map();
    this.dataLabels = new Map();
    this.symbols = new Map();
    this.sourceLines = [];
    this.pcToLineIndex = new Map();
    this.lineToPc = new Map();
    this.isAssembled = false;
    this.isTerminated = false;
    this.exitCode = null;
    this.cycleCount = 0;
    this.changedRegisters = new Set();
    this.stdout = '';
    this.stderr = '';
    this.stdin = this.options.stdin || '';
    this.stdinPos = 0;
    this.lastError = null;
    this.fault = null;
    this.errors = [];
    this.warnings = [];
    this.breakpoints = this.breakpoints || new Set();
    this.leaks = [];
    this.errnoAddr = LIBC_BASE;
    this.pacKey = BigInt(Math.floor(Math.random() * 0xFFFF) | 1);
    this.callDepth = 0;
  }

  // ---------------- memory ----------------

  mapRegion(name, start, size, perm) {
    const r = { name, start, end: start + BigInt(size), data: new Uint8Array(size), perm };
    this.regions.push(r);
    return r;
  }

  findRegion(addr, size) {
    for (const r of this.regions) {
      if (addr >= r.start && addr + BigInt(size) <= r.end) return r;
    }
    return null;
  }

  regionFor(addr) {
    for (const r of this.regions) if (addr >= r.start && addr < r.end) return r;
    return null;
  }

  // Linux enables Top Byte Ignore for user data addresses: bits 56-63 of a
  // data pointer are ignored (Android uses this for pointer tagging / MTE).
  dataAddr(addr) {
    const a = BigInt.asUintN(64, addr) & 0x00FFFFFFFFFFFFFFn;
    if (a >> 48n) {
      throw new Fault('SIGSEGV', `non-canonical address 0x${BigInt.asUintN(64, addr).toString(16)} (bits 48-55 set${this.looksPacSigned(addr) ? ' - is this a PAC-signed pointer that was never authenticated?' : ''})`);
    }
    return a;
  }

  load(addr, size, what = 'read') {
    const a = this.dataAddr(addr);
    const r = this.findRegion(a, size);
    if (!r) throw new Fault('SIGSEGV', `${size}-byte ${what} of unmapped address 0x${a.toString(16)}${a < 0x1000n ? ' (NULL pointer dereference?)' : ''}`);
    if (r.heap) this.libc.checkHeapAccess(a, size, false);
    const off = Number(a - r.start);
    let v = 0n;
    for (let i = size - 1; i >= 0; i--) v = (v << 8n) | BigInt(r.data[off + i]);
    return v;
  }

  store(addr, size, value) {
    const a = this.dataAddr(addr);
    const r = this.findRegion(a, size);
    if (!r) throw new Fault('SIGSEGV', `${size}-byte write to unmapped address 0x${a.toString(16)}${a < 0x1000n ? ' (NULL pointer dereference?)' : ''}`);
    if (!r.perm.includes('w')) throw new Fault('SIGSEGV', `${size}-byte write to read-only ${r.name} at 0x${a.toString(16)}${r.name === '.rodata' ? ' (string literals and const data cannot be modified)' : ''}`);
    if (r.heap) this.libc.checkHeapAccess(a, size, true);
    const off = Number(a - r.start);
    let v = BigInt.asUintN(size * 8, value);
    for (let i = 0; i < size; i++) { r.data[off + i] = Number(v & 0xFFn); v >>= 8n; }
  }

  // Non-faulting accessors used by the UI memory viewer and graders.
  readByte(addr) {
    try {
      const a = BigInt(addr);
      const r = this.regionFor(a);
      return r ? r.data[Number(a - r.start)] : 0;
    } catch { return 0; }
  }
  isMapped(addr) { return !!this.regionFor(BigInt(addr)); }
  writeByte(addr, val) {
    const a = BigInt(addr); const r = this.regionFor(a);
    if (r) r.data[Number(a - r.start)] = Number(val) & 0xFF;
  }
  peek(addr, size) {
    let v = 0n;
    for (let i = size - 1; i >= 0; i--) v = (v << 8n) | BigInt(this.readByte(BigInt(addr) + BigInt(i)));
    return v;
  }
  readHalfword(addr) { return this.peek(addr, 2); }
  readWord(addr) { return this.peek(addr, 4); }
  readQuad(addr) { return this.peek(addr, 8); }
  readString(addr, maxLen = 4096) {
    const bytes = [];
    for (let i = 0; i < maxLen; i++) {
      const b = Number(this.load(BigInt(addr) + BigInt(i), 1));
      if (b === 0) break;
      bytes.push(b);
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  writeBytes(addr, bytes) { for (let i = 0; i < bytes.length; i++) this.store(BigInt(addr) + BigInt(i), 1, BigInt(bytes[i])); }

  // ---------------- registers ----------------

  readR(r) {
    if (r.cls === 'fp') return this.v[r.n] & mask(r.bits);
    if (r.zr) return 0n;
    if (r.sp) return this.sp & mask(r.bits);
    return this.x[r.n] & mask(r.bits);
  }

  writeR(r, val) {
    const v = BigInt.asUintN(r.bits, val);
    if (r.cls === 'fp') { this.v[r.n] = v; this.changedRegisters.add(`${r.bits === 64 ? 'd' : 's'}${r.n}`); return; }
    if (r.zr) return;
    if (r.sp) { this.sp = v; this.changedRegisters.add('sp'); return; }
    this.x[r.n] = v; // W writes zero-extend into X
    this.changedRegisters.add(`x${r.n}`);
  }

  // Public by-name accessors (used by graders and the UI).
  getReg(name) {
    const n = String(name).toLowerCase();
    if (n === 'pc') return this.pc;
    const r = parseRegName(n);
    return r ? this.readR(r) : 0n;
  }
  setReg(name, val) {
    const n = String(name).toLowerCase();
    if (n === 'pc') { this.pc = BigInt.asUintN(64, BigInt(val)); return; }
    const r = parseRegName(n);
    if (r) this.writeR(r, BigInt(val));
  }
  getDouble(n) { return bitsToF64(this.v[n]); }
  getFloat(n) { return bitsToF32(this.v[n]); }

  toSigned64(v) { return signExtend(BigInt(v), 64); }
  toSigned32(v) { return signExtend(BigInt(v), 32); }

  setNZCV(n, z, c, v) { this.flags = { N: n ? 1 : 0, Z: z ? 1 : 0, C: c ? 1 : 0, V: v ? 1 : 0 }; }

  // ARM pseudocode AddWithCarry.
  addWithCarry(a, b, carry, bits) {
    const m = mask(bits);
    a &= m; b &= m;
    const usum = a + b + BigInt(carry);
    const ssum = signExtend(a, bits) + signExtend(b, bits) + BigInt(carry);
    const result = usum & m;
    const n = (result >> BigInt(bits - 1)) & 1n;
    return { result, N: n === 1n, Z: result === 0n, C: usum !== result, V: signExtend(result, bits) !== ssum };
  }

  evalCondition(cond) {
    const { N, Z, C, V } = this.flags;
    switch (cond) {
      case 'eq': return Z === 1;
      case 'ne': return Z === 0;
      case 'cs': case 'hs': return C === 1;
      case 'cc': case 'lo': return C === 0;
      case 'mi': return N === 1;
      case 'pl': return N === 0;
      case 'vs': return V === 1;
      case 'vc': return V === 0;
      case 'hi': return C === 1 && Z === 0;
      case 'ls': return !(C === 1 && Z === 0);
      case 'ge': return N === V;
      case 'lt': return N !== V;
      case 'gt': return Z === 0 && N === V;
      case 'le': return !(Z === 0 && N === V);
      default: return true; // al, nv
    }
  }

  // ---------------- pointer authentication (simplified) ----------------
  // A 16-bit PAC is stored in bits 48-63 of the pointer. Real hardware uses
  // QARMA with secret per-process keys and a VA-size-dependent PAC width;
  // this model is only meant to show *behaviour*: a pointer modified after
  // signing fails authentication and faults when used.

  pacOf(ptr, modifier, key) {
    let h = (BigInt.asUintN(48, ptr) ^ (BigInt.asUintN(64, modifier) * 0x9E3779B97F4A7C15n) ^ (this.pacKey * key)) & M64;
    h ^= h >> 29n; h = (h * 0xBF58476D1CE4E5B9n) & M64; h ^= h >> 32n;
    const pac = h & 0xFFFFn;
    return pac === 0n ? 1n : pac;
  }
  pacSign(ptr, modifier, key) { return BigInt.asUintN(48, ptr) | (this.pacOf(ptr, modifier, key) << 48n); }
  pacAuth(ptr, modifier, key) {
    const low = BigInt.asUintN(48, ptr);
    if ((ptr >> 48n) === this.pacOf(low, modifier, key)) return low;
    // Authentication failure: produce a non-canonical pointer (pre-FPAC behaviour).
    return low | (0x2000n << 48n) | (key << 61n);
  }
  looksPacSigned(ptr) { return (BigInt.asUintN(64, ptr) >> 48n) !== 0n; }

  // ======================================================================
  // Assembler
  // ======================================================================

  preprocess(source, fileName = '<input>', depth = 0, defines = null, outLines = [], originLine = null) {
    if (depth > 8) throw new AsmError('#include nested too deeply');
    defines = defines || new Map([['__linux__', '1'], ['__aarch64__', '1'], ['__ASSEMBLER__', '1']]);
    if (this.options.apple) { defines.delete('__linux__'); defines.set('__APPLE__', '1'); }
    const lines = stripBlockComments(source.replace(/\r\n?/g, '\n')).split('\n');
    const stack = []; // { active, taken, parentActive }
    const active = () => stack.every(s => s.active);
    const evalCond = (expr, lineNo) => {
      let e = expr.replace(/defined\s*\(\s*(\w+)\s*\)/g, (_, n) => (defines.has(n) ? '1' : '0'))
        .replace(/defined\s+(\w+)/g, (_, n) => (defines.has(n) ? '1' : '0'));
      e = e.replace(/\b[A-Za-z_]\w*\b/g, (n) => (defines.has(n) ? (defines.get(n) || '1') : '0'));
      try { return evalExpr(e, () => 0n) !== 0n; } catch (err) { throw this.lineError(lineNo, `bad #if expression: ${err.message}`, fileName); }
    };
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();
      const origin = originLine ?? i;
      const pm = /^#\s*(\w+)\s*(.*)$/.exec(line);
      if (pm) {
        const [, dir, rest] = pm;
        switch (dir) {
          case 'if': stack.push({ active: active() && evalCond(rest, i), taken: false }); stack[stack.length - 1].taken = stack[stack.length - 1].active; continue;
          case 'ifdef': { const a = defines.has(rest.trim()); stack.push({ active: a, taken: a }); continue; }
          case 'ifndef': { const a = !defines.has(rest.trim()); stack.push({ active: a, taken: a }); continue; }
          case 'elif': {
            const top = stack[stack.length - 1];
            if (!top) throw this.lineError(i, '#elif without #if', fileName);
            if (top.taken) top.active = false; else { top.active = evalCond(rest, i); top.taken = top.active; }
            continue;
          }
          case 'else': {
            const top = stack[stack.length - 1];
            if (!top) throw this.lineError(i, '#else without #if', fileName);
            top.active = !top.taken; top.taken = true; continue;
          }
          case 'endif': if (!stack.pop()) throw this.lineError(i, '#endif without #if', fileName); continue;
          default: break;
        }
        if (!active()) continue;
        if (dir === 'define') {
          const dm = /^(\w+)(\(.*?\))?\s*(.*)$/.exec(rest);
          if (dm && dm[2]) { this.warnings.push(`line ${i + 1}: function-like #define ${dm[1]} is not supported and was ignored`); continue; }
          if (dm) defines.set(dm[1], dm[3].trim());
          continue;
        }
        if (dir === 'undef') { defines.delete(rest.trim()); continue; }
        if (dir === 'include') {
          const im = /^["<]([^">]+)[">]/.exec(rest.trim());
          const name = im ? im[1].split('/').pop() : '';
          const inc = this.includes[name];
          if (inc === undefined) throw this.lineError(i, `#include file "${name}" is not available in the simulator`, fileName);
          this.preprocess(inc, name, depth + 1, defines, outLines, origin);
          continue;
        }
        if (dir === 'error') throw this.lineError(i, `#error ${rest}`, fileName);
        if (dir === 'warning' || dir === 'pragma' || dir === 'line') continue;
        // Any other line starting with # is a comment to GAS.
        continue;
      }
      if (line.startsWith('#')) continue; // '# comment'
      if (!active()) continue;
      let text = raw;
      if (defines.size) {
        text = text.replace(/\b[A-Za-z_]\w*\b/g, (n) => {
          if (!defines.has(n) || ['__linux__', '__aarch64__', '__ASSEMBLER__', '__APPLE__'].includes(n)) return n;
          const v = defines.get(n);
          return v === '' ? n : v;
        });
      }
      outLines.push({ text, line: origin, file: fileName });
    }
    if (stack.length && depth === 0) throw new AsmError(`unterminated #if (missing #endif) in ${fileName}`);
    return outLines;
  }

  lineError(lineIdx, msg, file) {
    const e = new AsmError(msg);
    e.line = lineIdx;
    e.file = file;
    return e;
  }

  // Expand .macro / .rept into a flat list of statements.
  expandMacros(lines) {
    const macros = new Map();
    const out = [];
    let uniq = 0;
    const self = this;
    function run(list, depth) {
      if (depth > 40) throw new AsmError('macro expansion nested too deeply (recursive macro?)');
      for (let i = 0; i < list.length; i++) {
        const { text, line, file } = list[i];
        const stmts = splitStatements(text, self.appleFlavor);
        for (let s = 0; s < stmts.length; s++) {
          const stmt = stmts[s];
          const mdef = /^\.macro\s+([A-Za-z_.$][\w.$]*)\s*,?\s*(.*)$/i.exec(stmt);
          if (mdef) {
            const params = mdef[2].trim() ? mdef[2].split(/\s*,\s*|\s+/).filter(Boolean).map(p => {
              const [nameq, def] = p.split('=');
              const [name, qual] = nameq.split(':');
              return { name, def: def ?? '', vararg: qual === 'vararg', req: qual === 'req' };
            }) : [];
            const body = [];
            let nest = 0;
            i++;
            for (; i < list.length; i++) {
              const t = list[i].text.trim().replace(/\/\/.*$/, '').trim();
              if (/^\.macro\b/i.test(t)) nest++;
              if (/^\.endm\b/i.test(t)) { if (nest === 0) break; nest--; }
              body.push(list[i]);
            }
            if (i >= list.length) throw self.lineError(line, `.macro ${mdef[1]} has no matching .endm`, file);
            macros.set(mdef[1].toLowerCase(), { params, body });
            break; // rest of the .macro line is ignored
          }
          const rept = /^\.rept\s+(.+)$/i.exec(stmt);
          if (rept) {
            const count = Number(evalExpr(rept[1], ({ name }) => { if (self.symbols.has(name)) return self.symbols.get(name); throw new AsmError(`undefined symbol '${name}' in .rept`); }));
            const body = []; let nest = 0; i++;
            for (; i < list.length; i++) {
              const t = list[i].text.trim();
              if (/^\.(rept|irp)\b/i.test(t)) nest++;
              if (/^\.endr\b/i.test(t)) { if (nest === 0) break; nest--; }
              body.push(list[i]);
            }
            if (count > 10000) throw self.lineError(line, '.rept count too large', file);
            for (let k = 0; k < count; k++) run(body.map(b => ({ ...b, line })), depth + 1);
            break;
          }
          const head = /^([A-Za-z_.$][\w.$]*)\s*(.*)$/.exec(stmt);
          // A label prefix ("foo: MACRO a, b") must be peeled first.
          const lab = /^((?:[A-Za-z_.$][\w.$]*|[0-9]+)\s*:\s*)+(.*)$/.exec(stmt);
          if (lab && lab[2] && macros.has(lab[2].split(/\s+/)[0].toLowerCase())) {
            out.push({ text: stmt.slice(0, stmt.length - lab[2].length), line, file });
            run([{ text: lab[2], line, file }], depth);
            continue;
          }
          if (head && !/^\s*:/.test(head[2]) && macros.has(head[1].toLowerCase())) {
            const m = macros.get(head[1].toLowerCase());
            let args = head[2].trim() ? splitOperands(head[2]) : [];
            if (args.length === 1 && m.params.length > 1 && !head[2].includes(',')) args = head[2].trim().split(/\s+/);
            const values = new Map();
            m.params.forEach((p, idx) => {
              let v = p.vararg ? args.slice(idx).join(', ') : args[idx];
              if (v === undefined || v === '') v = p.def;
              if (p.req && !v) throw self.lineError(line, `missing required macro argument '${p.name}' for ${head[1]}`, file);
              if (typeof v === 'string' && /^".*"$/s.test(v.trim())) v = v.trim().slice(1, -1);
              values.set(p.name, v);
            });
            if (args.length > m.params.length && !m.params.some(p => p.vararg)) {
              throw self.lineError(line, `too many arguments to macro ${head[1]} (expected ${m.params.length})`, file);
            }
            uniq++;
            const body = m.body.map(b => ({
              text: b.text.replace(/\\([A-Za-z_][\w]*)(\(\))?/g, (all, name) => (values.has(name) ? values.get(name) : all))
                .replace(/\\@/g, String(uniq)).replace(/\\\(\)/g, ''),
              line, file,
            }));
            run(body, depth + 1);
            continue;
          }
          out.push({ text: stmt, line, file });
        }
      }
    }
    run(lines, 0);
    return out;
  }

  assemble(sourceCode) {
    const keepBreakpoints = this.breakpoints || new Set();
    this.reset();
    this.breakpoints = keepBreakpoints;
    this.sourceLines = String(sourceCode ?? '').replace(/\r\n?/g, '\n').split('\n');
    try {
      this.assembleInner(String(sourceCode ?? ''));
    } catch (err) {
      if (!(err instanceof AsmError)) { console.error(err); }
      const e = { line: err.line ?? null, message: err.message, file: err.file };
      this.errors.push(e);
    }
    if (this.errors.length) {
      this.isAssembled = false;
      const first = this.errors[0];
      const where = first.line != null ? `Line ${first.line + 1}${first.file && first.file !== '<input>' ? ` (in ${first.file})` : ''}: ` : '';
      return { success: false, error: `${where}${first.message}`, errors: this.errors, warnings: this.warnings };
    }
    this.isAssembled = true;
    return { success: true, instructionCount: this.instructions.length, entryPc: this.pc, warnings: this.warnings };
  }

  assembleInner(source) {
    // Apple (Mach-O) assembly uses ';' for comments; GNU as on Linux uses it to separate statements.
    this.appleFlavor = !!this.options.apple || /__TEXT,|@PAGE|@GOTPAGE|\.build_version|\.subsections_via_symbols/.test(source);
    const pre = this.preprocess(source);
    const stmts = this.expandMacros(pre);

    // ---------- pass 1: layout ----------
    const sections = { text: { base: DEFAULT_PC, off: 0, bytes: [] }, data: { base: DEFAULT_DATA_ADDR, off: 0, bytes: [] }, rodata: { base: RODATA_ADDR, off: 0, bytes: [] } };
    // Compiler output built with -fstack-protector reads the canary from __stack_chk_guard.
    this.canary = undefined;
    if (/_stack_chk_guard/.test(source)) {
      const hi = BigInt(Math.floor(Math.random() * 2 ** 32)); const lo = BigInt(Math.floor(Math.random() * 2 ** 32));
      this.canary = ((hi << 32n) | lo) & ~0xFFn; // low byte zero, like glibc
      for (const n of ['__stack_chk_guard', '___stack_chk_guard']) { this.symbols.set(n, DEFAULT_DATA_ADDR); this.dataLabels.set(n, DEFAULT_DATA_ADDR); }
      sections.data.off = 8;
    }
    let cur = 'text';
    const aliases = new Map();
    const items = []; // { kind: 'inst'|'data', ... }
    const localDefs = new Map(); // "1" -> [{ pos, addr }]
    const symbols = this.symbols;
    const symbolSection = new Map();
    const dot = () => sections[cur].base + BigInt(sections[cur].off);
    let pos = 0;
    const errors = this.errors;
    const fail = (st, msg) => errors.push({ line: st.line, message: msg, file: st.file });

    const resolverAt = (p, st, allowUndefined = false) => ({ kind, name }) => {
      if (kind === 'local') {
        const num = name.slice(0, -1); const dir = name.slice(-1);
        const defs = localDefs.get(num) || [];
        const hit = dir === 'b' ? [...defs].reverse().find(d => d.pos <= p) : defs.find(d => d.pos > p);
        if (!hit) throw new AsmError(`local label '${name}' has no ${dir === 'b' ? 'earlier' : 'later'} definition '${num}:'`);
        return hit.addr;
      }
      if (name === '.') return st && st.dot !== undefined ? st.dot : dot();
      if (symbols.has(name)) return symbols.get(name);
      if (allowUndefined) return 0n;
      throw new AsmError(`undefined symbol '${name}'`);
    };

    const alignTo = (n) => {
      const s = sections[cur];
      while (s.off % n) s.off++;
    };

    const dataSize = { '.byte': 1, '.hword': 2, '.short': 2, '.2byte': 2, '.half': 2, '.word': 4, '.long': 4, '.int': 4, '.4byte': 4, '.quad': 8, '.xword': 8, '.dword': 8, '.8byte': 8 };
    const IGNORED = new Set(['.global', '.globl', '.type', '.size', '.file', '.ident', '.arch', '.cpu', '.extern', '.weak', '.hidden',
      '.loc', '.attribute', '.end', '.func', '.endfunc', '.private_extern', '.subsections_via_symbols', '.build_version',
      '.ltorg', '.pool', '.text_start', '.local', '.protected', '.addrsig', '.addrsig_sym', '.ios_version_min', '.macosx_version_min', '.previous', '.popsection', '.pushsection_ignore']);

    for (const st of stmts) {
      let text = st.text.trim();
      if (!text) continue;
      pos++;
      try {
        // Labels (possibly several) at the start of the statement.
        for (;;) {
          const lm = /^([A-Za-z_.$][\w.$]*|[0-9]+)\s*:(?!:)\s*(.*)$/.exec(text);
          if (!lm) break;
          const name = lm[1];
          if (/^[0-9]+$/.test(name)) {
            if (!localDefs.has(name)) localDefs.set(name, []);
            localDefs.get(name).push({ pos, addr: dot() });
          } else {
            if (symbols.has(name)) throw new AsmError(`symbol '${name}' is already defined`);
            symbols.set(name, dot());
            symbolSection.set(name, cur);
            if (cur !== 'abs') (cur === 'text' ? this.labels : this.dataLabels).set(name, dot());
          }
          text = lm[2].trim();
        }
        if (!text) continue;

        // name .req reg
        const req = /^([A-Za-z_]\w*)\s+\.req\s+(\w+)$/i.exec(text);
        if (req) { aliases.set(req[1].toLowerCase(), req[2].toLowerCase()); continue; }
        // sym = expr
        const assign = /^([A-Za-z_.$][\w.$]*)\s*=\s*(.+)$/.exec(text);
        if (assign && !assign[1].startsWith('.')) {
          symbols.set(assign[1], evalExpr(assign[2], resolverAt(pos, null)));
          continue;
        }

        if (text.startsWith('.')) {
          const dm = /^(\.[\w.]+)\s*(.*)$/.exec(text);
          const dir = dm[1].toLowerCase();
          const arg = dm[2].trim();
          if (dir === '.struct') {
            sections.abs = { base: 0n, off: Number(evalExpr(arg || '0', resolverAt(pos, null))), bytes: [] };
            cur = 'abs'; continue;
          }
          if (dir === '.text') { cur = 'text'; continue; }
          if (dir === '.data' || dir === '.bss') { cur = 'data'; continue; }
          if (dir === '.rodata') { cur = 'rodata'; continue; }
          if (dir === '.section' || dir === '.pushsection') {
            const name = arg.split(/[\s,]/)[0].replace(/"/g, '');
            cur = /rodata|__const|__cstring|literal/i.test(name) ? 'rodata' : /text/i.test(name) && !/data|bss/i.test(name) ? 'text' : 'data';
            continue;
          }
          if (dir === '.equ' || dir === '.set' || dir === '.equiv') {
            const parts = splitOperands(arg);
            if (parts.length !== 2 || !parts[0]) throw new AsmError(`${dir} needs 'symbol, value'`);
            if (dir === '.equiv' && symbols.has(parts[0])) throw new AsmError(`symbol '${parts[0]}' is already defined`);
            symbols.set(parts[0], evalExpr(parts[1], resolverAt(pos, null)));
            continue;
          }
          if (IGNORED.has(dir) || dir.startsWith('.cfi_') || dir.startsWith('.seh_') || dir === '.pushsection') continue;
          if (dir === '.align' || dir === '.p2align') {
            const n = Number(evalExpr(splitOperands(arg)[0] || '0', resolverAt(pos, null)));
            if (n > 16) throw new AsmError(`${dir} ${n} is too large`);
            alignTo(2 ** n); continue;
          }
          if (dir === '.balign') {
            const n = Number(evalExpr(splitOperands(arg)[0] || '1', resolverAt(pos, null)));
            if (n <= 0 || (n & (n - 1))) throw new AsmError('.balign needs a power of two');
            alignTo(n); continue;
          }
          if (dir === '.ascii' || dir === '.asciz' || dir === '.string') {
            let rest = arg;
            if (!rest) throw new AsmError(`${dir} needs a string`);
            for (;;) {
              const { bytes, rest: r } = parseStringLiteral(rest);
              if (dir !== '.ascii') bytes.push(0);
              items.push({ kind: 'bytes', section: cur, off: sections[cur].off, bytes });
              sections[cur].off += bytes.length;
              if (!r) break;
              if (r[0] !== ',') throw new AsmError(`unexpected '${r}' after string`);
              rest = r.slice(1);
            }
            continue;
          }
          if (dir in dataSize) {
            const size = dataSize[dir];
            for (const e of splitOperands(arg)) {
              if (!e) throw new AsmError(`empty value in ${dir}`);
              items.push({ kind: 'value', section: cur, off: sections[cur].off, size, expr: e, st, pos, dot: dot() });
              sections[cur].off += size;
            }
            continue;
          }
          if (dir === '.float' || dir === '.single' || dir === '.double') {
            const size = dir === '.double' ? 8 : 4;
            for (const e of splitOperands(arg)) {
              const f = Number(e);
              if (Number.isNaN(f) && e.trim().toLowerCase() !== 'nan') throw new AsmError(`bad floating point constant '${e}'`);
              const bits = size === 8 ? f64ToBits(f) : f32ToBits(f);
              const bytes = []; let b = bits;
              for (let k = 0; k < size; k++) { bytes.push(Number(b & 0xFFn)); b >>= 8n; }
              items.push({ kind: 'bytes', section: cur, off: sections[cur].off, bytes });
              sections[cur].off += size;
            }
            continue;
          }
          if (dir === '.space' || dir === '.skip' || dir === '.zero' || dir === '.fill') {
            const parts = splitOperands(arg);
            let count; let fill = 0;
            if (dir === '.fill') {
              const rep = Number(evalExpr(parts[0], resolverAt(pos, null)));
              const sz = parts[1] ? Number(evalExpr(parts[1], resolverAt(pos, null))) : 1;
              const val = parts[2] ? evalExpr(parts[2], resolverAt(pos, null)) : 0n;
              const bytes = [];
              for (let r = 0; r < rep; r++) { let v = val; for (let k = 0; k < Math.min(sz, 8); k++) { bytes.push(Number(v & 0xFFn)); v >>= 8n; } }
              if (bytes.length > DATA_MAX) throw new AsmError('.fill is too large');
              items.push({ kind: 'bytes', section: cur, off: sections[cur].off, bytes });
              sections[cur].off += bytes.length;
              continue;
            }
            count = Number(evalExpr(parts[0], resolverAt(pos, null)));
            if (parts[1]) fill = Number(evalExpr(parts[1], resolverAt(pos, null))) & 0xFF;
            if (count < 0 || count > DATA_MAX) throw new AsmError(`${dir} size ${count} is out of range`);
            if (fill) items.push({ kind: 'bytes', section: cur, off: sections[cur].off, bytes: new Array(count).fill(fill) });
            sections[cur].off += count;
            continue;
          }
          if (dir === '.comm' || dir === '.lcomm') {
            const parts = splitOperands(arg);
            const size = Number(evalExpr(parts[1], resolverAt(pos, null)));
            const save = cur; cur = 'data'; alignTo(8);
            symbols.set(parts[0], dot()); this.dataLabels.set(parts[0], dot()); symbolSection.set(parts[0], 'data');
            sections.data.off += size; cur = save;
            continue;
          }
          if (dir === '.uleb128' || dir === '.sleb128') {
            for (const e of splitOperands(arg)) {
              let v = evalExpr(e, resolverAt(pos, null)); const bytes = [];
              for (;;) {
                let b = Number(v & 0x7Fn); v >>= 7n;
                const done = dir === '.uleb128' ? v === 0n : ((v === 0n && !(b & 0x40)) || (v === -1n && (b & 0x40)));
                if (!done) b |= 0x80;
                bytes.push(b);
                if (done) break;
              }
              items.push({ kind: 'bytes', section: cur, off: sections[cur].off, bytes });
              sections[cur].off += bytes.length;
            }
            continue;
          }
          if (dir === '.inst') {
            throw new AsmError('.inst (raw machine words) is not supported by this simulator; write the instruction mnemonic instead');
          }
          throw new AsmError(`unknown or unsupported directive '${dir}'`);
        }

        // An instruction.
        if (cur === 'abs') throw new AsmError('instructions are not allowed inside .struct (end it with .text or .data)');
        if (cur !== 'text') throw new AsmError(`instruction '${text.split(/\s+/)[0]}' is in a data section (missing .text?)`);
        alignTo(4);
        const pc = dot();
        items.push({ kind: 'inst', pc, text, st, pos, aliases: new Map(aliases) });
        sections.text.off += 4;
      } catch (err) {
        if (err instanceof AsmError) fail(st, err.message); else throw err;
      }
    }
    if (errors.length) return;

    if (sections.text.off > TEXT_MAX) throw new AsmError(`program text is too large (${sections.text.off} bytes; limit ${TEXT_MAX})`);
    if (sections.data.off > DATA_MAX) throw new AsmError(`data section is too large (${sections.data.off} bytes; limit ${DATA_MAX})`);
    if (sections.rodata.off > RODATA_MAX) throw new AsmError(`read-only data is too large (${sections.rodata.off} bytes; limit ${RODATA_MAX})`);

    // ---------- map memory ----------
    const textSize = Math.max(4096, Math.ceil((sections.text.off + 4) / 4096) * 4096);
    const textR = this.mapRegion('.text', DEFAULT_PC, textSize, 'rx');
    const dataSizeBytes = Math.max(4096, Math.ceil(sections.data.off / 4096) * 4096 + 4096);
    const dataR = this.mapRegion('.data', DEFAULT_DATA_ADDR, dataSizeBytes, 'rw');
    const rodataR = this.mapRegion('.rodata', RODATA_ADDR, Math.max(4096, Math.ceil(sections.rodata.off / 4096) * 4096), 'r');
    this.mapRegion('heap', HEAP_BASE, HEAP_SIZE, 'rw').heap = true;
    this.mapRegion('libc', LIBC_BASE, LIBC_SIZE, 'rw');
    const stackR = this.mapRegion('stack', STACK_TOP - BigInt(STACK_SIZE), STACK_SIZE, 'rw');
    const regionOf = { text: textR, data: dataR, rodata: rodataR };

    if (this.canary !== undefined) { let c = this.canary; for (let k = 0; k < 8; k++) { dataR.data[k] = Number(c & 0xFFn); c >>= 8n; } }

    // ---------- pass 2: values and instructions ----------
    for (const it of items) {
      try {
        if (it.section === 'abs') continue;
        if (it.kind === 'bytes') regionOf[it.section].data.set(it.bytes, it.off);
        else if (it.kind === 'value') {
          const v = evalExpr(it.expr, resolverAt(it.pos, it));
          let b = BigInt.asUintN(it.size * 8, v);
          for (let k = 0; k < it.size; k++) { regionOf[it.section].data[it.off + k] = Number(b & 0xFFn); b >>= 8n; }
        } else if (it.kind === 'inst') {
          const exec = this.compileInstruction(it.text, {
            resolve: resolverAt(it.pos, { dot: it.pc }),
            aliases: it.aliases,
            pc: it.pc,
          });
          const inst = { pc: it.pc, lineIndex: it.st.line, rawText: it.text, op: exec.op, args: exec.args, exec: exec.fn };
          this.instructions.push(inst);
          this.instMap.set(it.pc, inst);
          if (!this.pcToLineIndex.has(it.pc)) this.pcToLineIndex.set(it.pc, it.st.line);
          if (!this.lineToPc.has(it.st.line)) this.lineToPc.set(it.st.line, it.pc);
        }
      } catch (err) {
        if (err instanceof AsmError) fail(it.st || { line: null }, err.message); else throw err;
      }
    }
    if (errors.length) return;
    if (this.instructions.length === 0) throw new AsmError('no instructions found (is your code under a .text section?)');

    // ---------- process start-up state ----------
    // Lay out argc/argv/envp like the Linux kernel does at _start.
    const argvStrings = ['./a.out', ...(this.options.args || []).map(String)];
    let strAddr = STACK_TOP - 16n;
    const argPtrs = [];
    for (let i = argvStrings.length - 1; i >= 0; i--) {
      const b = new TextEncoder().encode(argvStrings[i] + '\0');
      strAddr -= BigInt(b.length);
      stackR.data.set(b, Number(strAddr - stackR.start));
      argPtrs.unshift(strAddr);
    }
    this.sp = (strAddr - BigInt(8 * (argPtrs.length + 4)) - 64n) & ~0xFn;
    const put = (addr, v) => { let b = v; for (let k = 0; k < 8; k++) { stackR.data[Number(addr - stackR.start) + k] = Number(b & 0xFFn); b >>= 8n; } };
    put(this.sp, BigInt(argPtrs.length));                                   // argc
    argPtrs.forEach((ptr, i) => put(this.sp + 8n + BigInt(8 * i), ptr));    // argv[i]
    put(this.sp + 8n + BigInt(8 * argPtrs.length), 0n);                     // argv[argc] = NULL
    put(this.sp + 16n + BigInt(8 * argPtrs.length), 0n);                    // envp[0] = NULL
    this.libc.reset();

    const entry = ['_start', 'main', '_main'].find(n => this.labels.has(n));
    if (entry) {
      this.pc = this.labels.get(entry);
      this.entryName = entry;
    } else {
      this.pc = this.instructions[0].pc;
      this.entryName = null;
      this.warnings.push('no _start or main label: running the first instruction as a function (ret ends the program)');
    }
    if (entry !== '_start') {
      // Entered as if called by the C runtime.
      this.x[0] = BigInt(argPtrs.length); this.x[1] = this.sp + 8n; this.x[2] = this.sp + 16n + BigInt(8 * argPtrs.length);
      this.x[30] = EXIT_SENTINEL;
    }
    this.initialSp = this.sp;
  }

  // ======================================================================
  // Instruction compiler: text -> closure. All validation happens here.
  // ======================================================================

  compileInstruction(text, ctx) {
    const sp = text.search(/\s/);
    let op = (sp === -1 ? text : text.slice(0, sp)).toLowerCase();
    const argText = sp === -1 ? '' : text.slice(sp + 1).trim();
    const args = argText ? splitOperands(argText) : [];
    if (args.some(a => a === '')) throw new AsmError(`empty operand in '${text}'`);
    const aliases = ctx.aliases;

    // ---------- operand helpers ----------
    const reg = (s, opts = {}) => {
      const r = parseRegName(s, aliases);
      if (!r) {
        if (/^#/.test(s.trim()) || /^-?\d/.test(s.trim())) throw new AsmError(`operand '${s}' must be a register in '${text}'`);
        throw new AsmError(`'${s}' is not a valid register in '${text}'`);
      }
      if (opts.cls && r.cls !== opts.cls) throw new AsmError(`'${s}' must be a ${opts.cls === 'gp' ? 'general-purpose (x/w)' : 'floating-point (d/s)'} register in '${text}'`);
      if (opts.bits && r.bits !== opts.bits) throw new AsmError(`'${s}' must be a ${opts.bits}-bit register here (operand sizes must match) in '${text}'`);
      if (opts.noSp && r.sp) throw new AsmError(`sp is not allowed as an operand of '${op}' (use xzr for the zero register)`);
      if (opts.noZr && r.zr) throw new AsmError(`${r.name} is not allowed here in '${text}'`);
      return r;
    };
    const isReg = (s) => !!parseRegName(s || '', aliases);
    const imm = (s) => {
      let t = s.trim();
      if (t.startsWith('#')) t = t.slice(1);
      if (t.startsWith('=')) throw new AsmError(`'=' literals are only valid with ldr`);
      return evalExpr(t, ctx.resolve);
    };
    const need = (n, form) => { if (args.length !== n) throw new AsmError(`'${op}' expects ${n} operand${n === 1 ? '' : 's'}${form ? ` (${form})` : ''}, got ${args.length}`); };
    const needRange = (lo, hi, form) => { if (args.length < lo || args.length > hi) throw new AsmError(`'${op}' expects ${lo === hi ? lo : `${lo}-${hi}`} operands (${form}), got ${args.length}`); };
    const sameBits = (...rs) => { const b = rs[0].bits; for (const r of rs) if (r.bits !== b) throw new AsmError(`operand sizes do not match in '${text}' (mixing x and w registers)`); return b; };
    const shiftOp = (s) => {
      const m = /^(lsl|lsr|asr|ror)\s*#?\s*(.+)$/i.exec(s.trim());
      if (!m) return null;
      return { type: m[1].toLowerCase(), amount: Number(imm(m[2])) };
    };
    const extendOp = (s) => {
      const m = /^(uxtb|uxth|uxtw|uxtx|sxtb|sxth|sxtw|sxtx)\s*(?:#?\s*(.+))?$/i.exec(s.trim());
      if (!m) return null;
      return { type: m[1].toLowerCase(), amount: m[2] ? Number(imm(m[2])) : 0 };
    };
    const applyShift = (v, sh, bits) => {
      const m = mask(bits); const a = BigInt(sh.amount);
      switch (sh.type) {
        case 'lsl': return (v << a) & m;
        case 'lsr': return (v & m) >> a;
        case 'asr': return BigInt.asUintN(bits, signExtend(v, bits) >> a);
        case 'ror': { const n = BigInt(sh.amount % bits); return ((v >> n) | (v << (BigInt(bits) - n))) & m; }
      }
      return v;
    };
    const applyExtend = (v, ex, bits) => {
      const t = ex.type;
      let w = t.endsWith('b') ? 8 : t.endsWith('h') ? 16 : t.endsWith('w') ? 32 : 64;
      let r = v & mask(w);
      if (t[0] === 's') r = BigInt.asUintN(64, signExtend(r, w));
      return (r << BigInt(ex.amount)) & mask(bits);
    };
    const cond = (s) => {
      const c = s.trim().toLowerCase();
      if (!CONDS.includes(c)) throw new AsmError(`'${s}' is not a condition code (eq, ne, lt, ge, ...)`);
      return c;
    };
    const target = (s) => {
      const t = s.trim();
      if (isReg(t)) throw new AsmError(`'${op}' takes a label, not a register (use br/blr to jump to an address in a register)`);
      return BigInt.asUintN(64, evalExpr(t.replace(/^#/, ''), ctx.resolve));
    };
    const shiftLimit = (sh, bits, allowRor) => {
      if (!allowRor && sh.type === 'ror') throw new AsmError(`ror is not a valid operand shift for '${op}'`);
      if (sh.amount < 0 || sh.amount >= bits) throw new AsmError(`shift amount ${sh.amount} out of range 0-${bits - 1}`);
    };

    // Flexible second operand for arithmetic (add/sub/cmp): imm{, lsl #12} | reg{, shift} | reg, extend
    const arithOp2 = (rest, bits, rn) => {
      const s = rest[0];
      if (isReg(s)) {
        const rm = parseRegName(s, aliases);
        if (rm.cls !== 'gp') throw new AsmError(`'${s}' must be a general-purpose register`);
        if (rm.sp) throw new AsmError(`sp cannot be the second source operand of '${op}'`);
        if (rest[1]) {
          const ex = extendOp(rest[1]);
          if (ex) {
            if (ex.amount > 4) throw new AsmError('extend shift must be 0-4');
            return (sim2) => applyExtend(sim2.readR(rm), ex, bits);
          }
          const sh = shiftOp(rest[1]);
          if (!sh) throw new AsmError(`bad shift/extend '${rest[1]}'`);
          shiftLimit(sh, bits, false);
          if (rm.bits !== bits) throw new AsmError(`operand sizes do not match in '${text}'`);
          return (sim2) => applyShift(sim2.readR(rm), sh, bits);
        }
        if (rm.bits !== bits) {
          if (bits === 64 && rm.bits === 32 && rn && rn.sp) return (sim2) => sim2.readR(rm); // add x0, sp, w1 (uxtw)
          throw new AsmError(`operand sizes do not match in '${text}' (mixing x and w registers)`);
        }
        if (rn && rn.sp) return (sim2) => sim2.readR(rm);
        return (sim2) => sim2.readR(rm);
      }
      let v = imm(s);
      let shift = 0n;
      if (rest[1]) {
        const sh = shiftOp(rest[1]);
        if (!sh || sh.type !== 'lsl' || (sh.amount !== 0 && sh.amount !== 12)) throw new AsmError('immediate shift must be lsl #0 or lsl #12');
        shift = BigInt(sh.amount);
      }
      return { imm: v, shift };
    };

    // Logical second operand: bitmask imm | reg{, shift incl ror}
    const logicOp2 = (rest, bits, invertForCheck = false) => {
      const s = rest[0];
      if (isReg(s)) {
        const rm = reg(s, { cls: 'gp', noSp: true });
        if (rm.bits !== bits) throw new AsmError(`operand sizes do not match in '${text}' (mixing x and w registers)`);
        let sh = null;
        if (rest[1]) { sh = shiftOp(rest[1]); if (!sh) throw new AsmError(`bad shift '${rest[1]}'`); shiftLimit(sh, bits, true); }
        return (sim2) => (sh ? applyShift(sim2.readR(rm), sh, bits) : sim2.readR(rm));
      }
      if (rest[1]) throw new AsmError(`unexpected '${rest[1]}' after immediate`);
      const v = BigInt.asUintN(bits, imm(s));
      const chk = invertForCheck ? (~v & mask(bits)) : v;
      if (!isBitmaskImmediate(chk, bits)) {
        throw new AsmError(`immediate 0x${v.toString(16)} cannot be encoded as a logical (bitmask) immediate for '${op}'. Load it into a register first (mov/movk).`);
      }
      return () => v;
    };

    // Memory operand: [base], [base, #imm], [base, #imm]!, [base, Xm{, lsl #n}], [base, Wm, sxtw #n], [base], #imm (post)
    const memOperand = (s, post, size, opts = {}) => {
      const t = s.trim();
      const m = /^\[([^\]]*)\](!?)$/.exec(t);
      if (!m) throw new AsmError(`bad memory operand '${s}' (expected something like [x0, #8])`);
      const parts = splitOperands(m[1]);
      const base = reg(parts[0], { cls: 'gp' });
      if (base.bits !== 64) throw new AsmError(`base register must be a 64-bit X register or sp, not '${parts[0]}'`);
      if (base.zr) throw new AsmError('xzr cannot be a base register');
      const pre = m[2] === '!';
      let offset = 0n; let idxReg = null; let ext = null;
      if (parts[1] !== undefined) {
        if (isReg(parts[1])) {
          if (pre || post !== undefined) throw new AsmError('register offsets cannot use writeback');
          idxReg = reg(parts[1], { cls: 'gp', noSp: true });
          const scale = Math.log2(size);
          if (parts[2]) {
            const ex = extendOp(parts[2]) || (() => { const sh = shiftOp(parts[2]); return sh && sh.type === 'lsl' ? { type: 'lsl', amount: sh.amount } : null; })();
            if (!ex) throw new AsmError(`bad index extend/shift '${parts[2]}'`);
            if (ex.amount !== 0 && ex.amount !== scale) throw new AsmError(`index shift must be #0 or #${scale} for a ${size}-byte access`);
            if (ex.type === 'lsl' && idxReg.bits !== 64) throw new AsmError('lsl index needs an X register (use uxtw/sxtw for W)');
            if ((ex.type === 'uxtw' || ex.type === 'sxtw') && idxReg.bits !== 32) throw new AsmError(`${ex.type} index needs a W register`);
            ext = ex;
          } else if (idxReg.bits !== 64) throw new AsmError('a W index register needs uxtw or sxtw');
        } else {
          offset = imm(parts[1]);
        }
      }
      if (parts.length > 3 || (parts.length === 3 && !idxReg)) throw new AsmError(`bad memory operand '${s}'`);
      if (post !== undefined) {
        if (pre) throw new AsmError('cannot combine pre-index (!) and post-index');
        if (parts.length > 1) throw new AsmError('post-indexed form is [base], #imm');
        offset = imm(post);
      }
      const mode = pre ? 'pre' : post !== undefined ? 'post' : 'offset';
      // Range checks the real assembler enforces.
      const off = offset;
      if (opts.pair) {
        if (off % BigInt(size) !== 0n || off < BigInt(-64 * size) || off > BigInt(63 * size)) {
          throw new AsmError(`pair offset ${off} must be a multiple of ${size} in range ${-64 * size}..${63 * size}`);
        }
      } else if (!idxReg) {
        if (mode === 'offset') {
          const scaledOk = off >= 0n && off % BigInt(size) === 0n && off <= BigInt(4095 * size);
          const unscaledOk = off >= -256n && off <= 255n;
          if (opts.unscaled ? !unscaledOk : !(scaledOk || unscaledOk)) {
            throw new AsmError(`offset ${off} out of range for a ${size}-byte ${opts.unscaled ? 'unscaled ' : ''}access (${opts.unscaled ? '-256..255' : `-256..255, or a multiple of ${size} up to ${4095 * size}`})`);
          }
        } else if (off < -256n || off > 255n) {
          throw new AsmError(`writeback offset ${off} out of range -256..255`);
        }
      }
      return { base, offset, idxReg, ext, mode };
    };

    const effAddr = (s2, mo) => {
      const b = s2.readR(mo.base);
      if (mo.base.sp && (b & 0xFn) !== 0n) throw new Fault('SIGBUS', `stack pointer 0x${b.toString(16)} is not 16-byte aligned when used as a base register`);
      if (mo.idxReg) {
        let iv = s2.readR(mo.idxReg);
        if (mo.ext) iv = mo.ext.type === 'lsl' ? (iv << BigInt(mo.ext.amount)) : applyExtend(iv, mo.ext, 64);
        return BigInt.asUintN(64, b + iv);
      }
      return BigInt.asUintN(64, mo.mode === 'post' ? b : b + mo.offset);
    };
    const writeback = (s2, mo) => {
      if (mo.mode === 'offset') return;
      s2.writeR(mo.base, BigInt.asUintN(64, s2.readR(mo.base) + mo.offset));
    };

    // ---------- the instruction table ----------
    const R = (s2, r) => s2.readR(r);
    let fn;
    let base = op;

    // b.cond / bcond legacy aliases
    const bc = /^b\.?([a-z]{2})$/.exec(op);
    if (bc && CONDS.includes(bc[1]) && op !== 'bl') {
      need(1, 'label');
      const c = bc[1]; const t = target(args[0]);
      return { op, args, fn: (s2) => (s2.evalCondition(c) ? t : undefined) };
    }

    const arith = (setFlags, isSub) => {
      needRange(3, 4, 'rd, rn, op2');
      const rd = reg(args[0], { cls: 'gp' });
      const rn = reg(args[1], { cls: 'gp' });
      if (setFlags && rd.sp) throw new AsmError(`'${op}' cannot write sp (flag-setting forms use xzr there)`);
      if (rn.zr && !setFlags) throw new AsmError(`${rn.name} is not valid as the first source of '${op}' (that encoding means sp)`);
      const bits = sameBits(rd, rn);
      const o2 = arithOp2(args.slice(2), bits, rn);
      let get;
      let sub = isSub;
      if (typeof o2 === 'function') {
        if ((rd.sp || rn.sp) && args[3] && shiftOp(args[3])) throw new AsmError('shifted-register form cannot use sp');
        get = o2;
      } else {
        let v = o2.imm;
        if (v < 0n && o2.shift === 0n) { v = -v; sub = !sub; } // GAS turns add #-n into sub #n
        if (v < 0n || v > 4095n) {
          if (o2.shift === 0n && v % 4096n === 0n && v / 4096n <= 4095n) { /* encodable via lsl #12 */ }
          else throw new AsmError(`immediate ${o2.imm} out of range for '${op}' (0-4095, optionally lsl #12). Put larger values in a register.`);
        }
        const val = v << o2.shift;
        get = () => val;
      }
      return (s2) => {
        const a = R(s2, rn); const b = get(s2);
        const r = sub ? s2.addWithCarry(a, ~b, 1, bits) : s2.addWithCarry(a, b, 0, bits);
        s2.writeR(rd, r.result);
        if (setFlags) s2.setNZCV(r.N, r.Z, r.C, r.V);
      };
    };

    const cmpLike = (isSub) => {
      needRange(2, 3, 'rn, op2');
      const rn = reg(args[0], { cls: 'gp' });
      const o2 = arithOp2(args.slice(1), rn.bits, rn);
      let get; let sub = isSub;
      if (typeof o2 === 'function') get = o2;
      else {
        let v = o2.imm;
        if (v < 0n && o2.shift === 0n) { v = -v; sub = !sub; }
        if (v > 4095n && !(o2.shift === 0n && v % 4096n === 0n && v / 4096n <= 4095n)) throw new AsmError(`immediate ${o2.imm} out of range for '${op}' (0-4095, optionally lsl #12)`);
        const val = v << o2.shift; get = () => val;
      }
      const bits = rn.bits;
      return (s2) => {
        const a = R(s2, rn); const b = get(s2);
        const r = sub ? s2.addWithCarry(a, ~b, 1, bits) : s2.addWithCarry(a, b, 0, bits);
        s2.setNZCV(r.N, r.Z, r.C, r.V);
      };
    };

    const logic = (opfn, setFlags, invertImmCheck = false) => {
      needRange(3, 4, 'rd, rn, op2');
      const rd = reg(args[0], { cls: 'gp' });
      const rn = reg(args[1], { cls: 'gp', noSp: true });
      if (setFlags && rd.sp) throw new AsmError(`'${op}' cannot write sp`);
      if (!isReg(args[2]) && rd.zr && !setFlags) throw new AsmError(`${rd.name} destination with immediate means sp; use the register form`);
      if (isReg(args[2]) && rd.sp) throw new AsmError('register-form logical ops cannot write sp');
      const bits = sameBits(rd, rn);
      const get = logicOp2(args.slice(2), bits, invertImmCheck);
      return (s2) => {
        const r = opfn(R(s2, rn), get(s2), bits) & mask(bits);
        s2.writeR(rd, r);
        if (setFlags) s2.setNZCV((r >> BigInt(bits - 1)) & 1n, r === 0n, 0, 0);
      };
    };

    const shiftInst = (type) => {
      need(3, 'rd, rn, #amount | rm');
      const rd = reg(args[0], { cls: 'gp', noSp: true });
      const rn = reg(args[1], { cls: 'gp', noSp: true });
      const bits = sameBits(rd, rn);
      if (isReg(args[2])) {
        const rm = reg(args[2], { cls: 'gp', noSp: true, bits });
        return (s2) => s2.writeR(rd, applyShift(R(s2, rn), { type, amount: Number(R(s2, rm) % BigInt(bits)) }, bits));
      }
      const amt = Number(imm(args[2]));
      if (amt < 0 || amt >= bits) throw new AsmError(`shift amount ${amt} out of range 0-${bits - 1}`);
      return (s2) => s2.writeR(rd, applyShift(R(s2, rn), { type, amount: amt }, bits));
    };

    const loadStore = (isLoad, size, signed, unscaled) => {
      needRange(2, 3, 'rt, [address]');
      const rt = reg(args[0]);
      if (rt.sp) throw new AsmError('sp cannot be the transfer register (use xzr / move sp through another register)');
      let sz = size ?? rt.bits / 8;
      if (signed && rt.cls !== 'gp') throw new AsmError(`'${op}' needs a general-purpose destination`);
      if (size && rt.cls === 'fp') throw new AsmError(`'${op}' transfers a byte/halfword; use ldr/str with d or s registers`);
      if (op === 'ldrsw' && rt.bits !== 64) throw new AsmError('ldrsw needs an X destination');
      const a1 = args[1].trim();
      // ldr x0, =value  (literal pool pseudo-instruction)
      if (a1.startsWith('=')) {
        if (!isLoad || op !== 'ldr' || rt.cls !== 'gp') throw new AsmError(`'=' literals only work with ldr into an x/w register`);
        const v = BigInt.asUintN(rt.bits, evalExpr(a1.slice(1), ctx.resolve));
        return (s2) => s2.writeR(rt, v);
      }
      // ldr x0, label  (PC-relative literal load)
      if (!a1.startsWith('[')) {
        if (!isLoad || !(op === 'ldr' || op === 'ldrsw')) throw new AsmError(`'${op}' needs a memory operand like [x0] (PC-relative literals only work with ldr/ldrsw)`);
        if (isReg(a1)) throw new AsmError(`memory operands need brackets: [${a1}]`);
        const addr = BigInt.asUintN(64, evalExpr(a1, ctx.resolve));
        if (addr % 4n) throw new AsmError('literal address must be 4-byte aligned');
        return (s2) => { const v = s2.load(addr, sz); s2.writeR(rt, signed ? BigInt.asUintN(64, signExtend(v, sz * 8)) : v); };
      }
      const mo = memOperand(args[1], args[2], sz, { unscaled });
      if (mo.mode !== 'offset' && !mo.base.sp && rt.cls === 'gp' && !rt.zr && rt.n === mo.base.n && isLoad) {
        throw new AsmError(`'${text}' is unpredictable: writeback base is also the destination`);
      }
      if (isLoad) {
        return (s2) => {
          const a = effAddr(s2, mo);
          let v = s2.load(a, sz);
          if (signed) v = BigInt.asUintN(rt.bits, signExtend(v, sz * 8));
          s2.writeR(rt, v);
          writeback(s2, mo);
        };
      }
      return (s2) => {
        const a = effAddr(s2, mo);
        s2.store(a, sz, R(s2, rt));
        writeback(s2, mo);
      };
    };

    const pair = (isLoad, signedW = false) => {
      needRange(3, 4, 'rt1, rt2, [address]');
      const r1 = reg(args[0]); const r2 = reg(args[1]);
      if (r1.sp || r2.sp) throw new AsmError('sp cannot be a transfer register in ldp/stp');
      if (r1.cls !== r2.cls || r1.bits !== r2.bits) throw new AsmError(`'${op}' registers must be the same size and kind`);
      if (isLoad && r1.cls === r2.cls && !r1.zr && r1.n === r2.n) throw new AsmError(`'${text}' is unpredictable: both destinations are the same register`);
      const sz = signedW ? 4 : r1.bits / 8;
      const mo = memOperand(args[2], args[3], sz, { pair: true });
      if (isLoad && mo.mode !== 'offset' && !mo.base.sp && r1.cls === 'gp' && (r1.n === mo.base.n || r2.n === mo.base.n)) {
        throw new AsmError(`'${text}' is unpredictable: writeback base is also a destination`);
      }
      return (s2) => {
        const a = effAddr(s2, mo);
        if (isLoad) {
          let v1 = s2.load(a, sz); let v2 = s2.load(a + BigInt(sz), sz);
          if (signedW) { v1 = BigInt.asUintN(64, signExtend(v1, 32)); v2 = BigInt.asUintN(64, signExtend(v2, 32)); }
          s2.writeR(r1, v1); s2.writeR(r2, v2);
        } else {
          s2.store(a, sz, R(s2, r1)); s2.store(a + BigInt(sz), sz, R(s2, r2));
        }
        writeback(s2, mo);
      };
    };

    const fp3 = (f) => {
      need(3, 'fd, fn, fm');
      const d = reg(args[0], { cls: 'fp' }); const n = reg(args[1], { cls: 'fp', bits: d.bits }); const m = reg(args[2], { cls: 'fp', bits: d.bits });
      return (s2) => s2.writeFp(d, f(s2.readFp(n), s2.readFp(m)));
    };
    const fp2 = (f) => {
      need(2, 'fd, fn');
      const d = reg(args[0], { cls: 'fp' }); const n = reg(args[1], { cls: 'fp', bits: d.bits });
      return (s2) => s2.writeFp(d, f(s2.readFp(n)));
    };
    const fcvtToInt = (round, unsigned) => {
      need(2, 'rd, fn');
      const d = reg(args[0], { cls: 'gp', noSp: true }); const n = reg(args[1], { cls: 'fp' });
      return (s2) => {
        let f = s2.readFp(n);
        if (Number.isNaN(f)) { s2.writeR(d, 0n); return; }
        f = round(f);
        const bits = d.bits;
        const lo = unsigned ? 0n : -(1n << BigInt(bits - 1));
        const hi = unsigned ? (1n << BigInt(bits)) - 1n : (1n << BigInt(bits - 1)) - 1n;
        let v;
        if (f === Infinity) v = hi; else if (f === -Infinity) v = lo; else { v = BigInt(f); if (v < lo) v = lo; if (v > hi) v = hi; }
        s2.writeR(d, BigInt.asUintN(bits, v));
      };
    };
    const roundEven = (f) => { const r = Math.round(f); return (Math.abs(f % 1) === 0.5 && r % 2 !== 0) ? r - 1 : r; };
    const roundAway = (f) => (f < 0 ? -Math.round(-f) : Math.round(f));

    switch (op) {
      case 'nop': case 'bti': case 'hint': case 'isb': case 'dsb': case 'dmb': case 'yield': case 'csdb': case 'sevl': case 'wfe': case 'wfi':
        fn = () => {}; break;

      case 'mov': {
        need(2, 'rd, rn | #imm');
        const rd = reg(args[0]);
        if (rd.cls === 'fp') throw new AsmError(`use fmov for floating-point registers`);
        if (isReg(args[1])) {
          const rn = reg(args[1], { cls: 'gp' });
          sameBits(rd, rn);
          fn = (s2) => s2.writeR(rd, R(s2, rn));
        } else {
          const t = args[1].trim().replace(/^#/, '');
          if (/^[A-Za-z_.$][\w.$]*$/.test(t) && (this.labels.has(t) || this.dataLabels.has(t))) {
            throw new AsmError(`'mov ${args[0]}, ${t}' does not load a label's address. Use 'adr ${args[0]}, ${t}' or 'ldr ${args[0]}, =${t}'`);
          }
          const v = imm(args[1]);
          const bits = rd.bits;
          const lo = -(1n << BigInt(bits)); const hi = (1n << BigInt(bits)) - 1n;
          if (v < lo || v > hi) throw new AsmError(`immediate ${v} does not fit in ${bits} bits`);
          const uv = BigInt.asUintN(bits, v);
          if (!isMovEncodable(uv, bits)) {
            throw new AsmError(`immediate 0x${uv.toString(16)} cannot be loaded by a single mov. Build it with movz + movk (16 bits at a time), or use ldr ${args[0]}, =0x${uv.toString(16)}`);
          }
          if (rd.sp && !isBitmaskImmediate(uv, bits)) throw new AsmError('mov to sp only accepts bitmask immediates; move through another register');
          fn = (s2) => s2.writeR(rd, uv);
        }
        break;
      }
      case 'movz': case 'movn': case 'movk': {
        needRange(2, 3, 'rd, #imm16{, lsl #shift}');
        const rd = reg(args[0], { cls: 'gp', noSp: true });
        let v = imm(args[1]);
        let shift = 0;
        if (args[2]) {
          const sh = shiftOp(args[2]);
          if (!sh || sh.type !== 'lsl' || sh.amount % 16 || sh.amount >= rd.bits) throw new AsmError(`shift must be lsl #0/16${rd.bits === 64 ? '/32/48' : ''}`);
          shift = sh.amount;
        } else if (v > 0xFFFFn && op !== 'movk') {
          const s = movWideShift(BigInt.asUintN(rd.bits, v), rd.bits);
          if (s > 0) { shift = s; v >>= BigInt(s); }
        }
        if (v < 0n || v > 0xFFFFn) throw new AsmError(`${op} immediate must be 0-65535 (0x0-0xffff), got ${v}. Use multiple movk instructions for wider values.`);
        const sv = v << BigInt(shift); const bits = rd.bits;
        if (op === 'movz') fn = (s2) => s2.writeR(rd, sv);
        else if (op === 'movn') fn = (s2) => s2.writeR(rd, ~sv & mask(bits));
        else { const clear = ~(0xFFFFn << BigInt(shift)) & mask(bits); fn = (s2) => s2.writeR(rd, (R(s2, rd) & clear) | sv); }
        break;
      }
      case 'mvn': {
        needRange(2, 3, 'rd, rm{, shift}');
        const rd = reg(args[0], { cls: 'gp', noSp: true });
        const rm = reg(args[1], { cls: 'gp', noSp: true });
        const bits = sameBits(rd, rm);
        const sh = args[2] ? shiftOp(args[2]) : null;
        if (args[2] && !sh) throw new AsmError(`bad shift '${args[2]}'`);
        fn = (s2) => s2.writeR(rd, ~(sh ? applyShift(R(s2, rm), sh, bits) : R(s2, rm)) & mask(bits));
        break;
      }
      case 'adr': case 'adrp': {
        need(2, 'xd, label');
        const rd = reg(args[0], { cls: 'gp', bits: 64, noSp: true });
        let a = BigInt.asUintN(64, evalExpr(args[1].replace(/^#/, ''), ctx.resolve));
        if (op === 'adrp') a &= ~0xFFFn;
        const dist = a - ctx.pc;
        if (op === 'adr' && (dist < -(1n << 20n) || dist >= (1n << 20n))) throw new AsmError('adr target is out of range (+/-1MB)');
        fn = (s2) => s2.writeR(rd, a);
        break;
      }

      case 'add': fn = arith(false, false); break;
      case 'adds': fn = arith(true, false); break;
      case 'sub': fn = arith(false, true); break;
      case 'subs': fn = arith(true, true); break;
      case 'cmp': fn = cmpLike(true); break;
      case 'cmn': fn = cmpLike(false); break;
      case 'adc': case 'adcs': case 'sbc': case 'sbcs': {
        need(3, 'rd, rn, rm');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rn = reg(args[1], { cls: 'gp', noSp: true }); const rm = reg(args[2], { cls: 'gp', noSp: true });
        const bits = sameBits(rd, rn, rm); const isSub = op.startsWith('sbc'); const setF = op.endsWith('s');
        fn = (s2) => {
          const b = isSub ? ~R(s2, rm) : R(s2, rm);
          const r = s2.addWithCarry(R(s2, rn), b, s2.flags.C, bits);
          s2.writeR(rd, r.result);
          if (setF) s2.setNZCV(r.N, r.Z, r.C, r.V);
        };
        break;
      }
      case 'neg': case 'negs': {
        needRange(2, 3, 'rd, rm{, shift}');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rm = reg(args[1], { cls: 'gp', noSp: true });
        const bits = sameBits(rd, rm);
        const sh = args[2] ? shiftOp(args[2]) : null;
        fn = (s2) => {
          const b = sh ? applyShift(R(s2, rm), sh, bits) : R(s2, rm);
          const r = s2.addWithCarry(0n, ~b, 1, bits);
          s2.writeR(rd, r.result);
          if (op === 'negs') s2.setNZCV(r.N, r.Z, r.C, r.V);
        };
        break;
      }
      case 'tst': {
        needRange(2, 3, 'rn, op2');
        const rn = reg(args[0], { cls: 'gp', noSp: true });
        const get = logicOp2(args.slice(1), rn.bits);
        const bits = rn.bits;
        fn = (s2) => { const r = R(s2, rn) & get(s2); s2.setNZCV((r >> BigInt(bits - 1)) & 1n, r === 0n, 0, 0); };
        break;
      }
      case 'and': fn = logic((a, b) => a & b, false); break;
      case 'ands': fn = logic((a, b) => a & b, true); break;
      case 'orr': fn = logic((a, b) => a | b, false); break;
      case 'eor': fn = logic((a, b) => a ^ b, false); break;
      case 'bic': case 'bics': case 'orn': case 'eon': {
        if (!isReg(args[2] || '')) throw new AsmError(`'${op}' takes a register second operand`);
        const f = op === 'orn' ? (a, b, bits) => a | (~b & mask(bits)) : op === 'eon' ? (a, b, bits) => a ^ (~b & mask(bits)) : (a, b, bits) => a & (~b & mask(bits));
        fn = logic(f, op === 'bics');
        break;
      }

      case 'lsl': fn = shiftInst('lsl'); break;
      case 'lsr': fn = shiftInst('lsr'); break;
      case 'asr': fn = shiftInst('asr'); break;
      case 'ror': fn = shiftInst('ror'); break;
      case 'lslv': case 'lsrv': case 'asrv': case 'rorv': fn = shiftInst(op.slice(0, 3)); break;
      case 'extr': {
        need(4, 'rd, rn, rm, #lsb');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rn = reg(args[1], { cls: 'gp', noSp: true }); const rm = reg(args[2], { cls: 'gp', noSp: true });
        const bits = sameBits(rd, rn, rm); const lsb = BigInt(imm(args[3]));
        if (lsb < 0n || lsb >= BigInt(bits)) throw new AsmError(`lsb out of range 0-${bits - 1}`);
        fn = (s2) => s2.writeR(rd, (((R(s2, rn) << BigInt(bits)) | R(s2, rm)) >> lsb) & mask(bits));
        break;
      }

      case 'mul': case 'mneg': case 'madd': case 'msub': {
        const four = op === 'madd' || op === 'msub';
        need(four ? 4 : 3, four ? 'rd, rn, rm, ra' : 'rd, rn, rm');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rn = reg(args[1], { cls: 'gp', noSp: true }); const rm = reg(args[2], { cls: 'gp', noSp: true });
        const ra = four ? reg(args[3], { cls: 'gp', noSp: true }) : null;
        const bits = sameBits(rd, rn, rm, ...(ra ? [ra] : []));
        fn = (s2) => {
          const p = R(s2, rn) * R(s2, rm);
          let r;
          if (op === 'mul') r = p; else if (op === 'mneg') r = -p; else if (op === 'madd') r = R(s2, ra) + p; else r = R(s2, ra) - p;
          s2.writeR(rd, BigInt.asUintN(bits, r));
        };
        break;
      }
      case 'smull': case 'umull': case 'smaddl': case 'umaddl': case 'smsubl': case 'umsubl': case 'smnegl': case 'umnegl': {
        const four = /addl|subl/.test(op);
        need(four ? 4 : 3, four ? 'xd, wn, wm, xa' : 'xd, wn, wm');
        const rd = reg(args[0], { cls: 'gp', bits: 64, noSp: true }); const rn = reg(args[1], { cls: 'gp', bits: 32 }); const rm = reg(args[2], { cls: 'gp', bits: 32 });
        const ra = four ? reg(args[3], { cls: 'gp', bits: 64 }) : null;
        const s = op[0] === 's';
        fn = (s2) => {
          const a = s ? signExtend(R(s2, rn), 32) : R(s2, rn); const b = s ? signExtend(R(s2, rm), 32) : R(s2, rm);
          let r = a * b;
          if (/addl/.test(op)) r = R(s2, ra) + r; else if (/subl/.test(op)) r = R(s2, ra) - r; else if (/negl/.test(op)) r = -r;
          s2.writeR(rd, BigInt.asUintN(64, r));
        };
        break;
      }
      case 'smulh': case 'umulh': {
        need(3, 'xd, xn, xm');
        const rd = reg(args[0], { cls: 'gp', bits: 64 }); const rn = reg(args[1], { cls: 'gp', bits: 64 }); const rm = reg(args[2], { cls: 'gp', bits: 64 });
        const s = op === 'smulh';
        fn = (s2) => {
          const a = s ? signExtend(R(s2, rn), 64) : R(s2, rn); const b = s ? signExtend(R(s2, rm), 64) : R(s2, rm);
          s2.writeR(rd, BigInt.asUintN(64, (a * b) >> 64n));
        };
        break;
      }
      case 'sdiv': case 'udiv': {
        need(3, 'rd, rn, rm');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rn = reg(args[1], { cls: 'gp', noSp: true }); const rm = reg(args[2], { cls: 'gp', noSp: true });
        if (!isReg(args[2])) throw new AsmError(`'${op}' has no immediate form: put the divisor in a register`);
        const bits = sameBits(rd, rn, rm);
        fn = (s2) => {
          let a = R(s2, rn); let b = R(s2, rm);
          if (op === 'sdiv') { a = signExtend(a, bits); b = signExtend(b, bits); }
          s2.writeR(rd, b === 0n ? 0n : BigInt.asUintN(bits, a / b)); // ARM: x/0 == 0, no trap
        };
        break;
      }

      case 'ubfx': case 'sbfx': case 'ubfiz': case 'sbfiz': case 'bfi': case 'bfxil': {
        need(4, 'rd, rn, #lsb, #width');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rn = reg(args[1], { cls: 'gp', noSp: true });
        const bits = sameBits(rd, rn);
        const lsb = Number(imm(args[2])); const width = Number(imm(args[3]));
        if (lsb < 0 || lsb >= bits) throw new AsmError(`lsb ${lsb} out of range 0-${bits - 1}`);
        if (width < 1 || lsb + width > bits) throw new AsmError(`width ${width} out of range (lsb + width must be 1..${bits})`);
        const wm = mask(width); const L = BigInt(lsb); const W = width;
        fn = (s2) => {
          const src = R(s2, rn); let r;
          switch (op) {
            case 'ubfx': r = (src >> L) & wm; break;
            case 'sbfx': r = BigInt.asUintN(bits, signExtend((src >> L) & wm, W)); break;
            case 'ubfiz': r = (src & wm) << L; break;
            case 'sbfiz': r = BigInt.asUintN(bits, signExtend(src & wm, W) << L); break;
            case 'bfi': r = (R(s2, rd) & ~(wm << L)) | ((src & wm) << L); break;
            case 'bfxil': r = (R(s2, rd) & ~wm) | ((src >> L) & wm); break;
          }
          s2.writeR(rd, r & mask(bits));
        };
        break;
      }
      case 'sxtb': case 'sxth': case 'sxtw': case 'uxtb': case 'uxth': {
        need(2, 'rd, wn');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rn = reg(args[1], { cls: 'gp', bits: 32 });
        if (op === 'sxtw' && rd.bits !== 64) throw new AsmError('sxtw needs an X destination');
        const w = op.endsWith('b') ? 8 : op.endsWith('h') ? 16 : 32; const s = op[0] === 's';
        fn = (s2) => { const v = R(s2, rn) & mask(w); s2.writeR(rd, s ? BigInt.asUintN(rd.bits, signExtend(v, w)) : v); };
        break;
      }
      case 'clz': case 'cls': case 'rbit': case 'rev': case 'rev16': case 'rev32': {
        need(2, 'rd, rn');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rn = reg(args[1], { cls: 'gp', noSp: true });
        const bits = sameBits(rd, rn);
        if (op === 'rev32' && bits !== 64) throw new AsmError('rev32 needs X registers');
        fn = (s2) => {
          const v = R(s2, rn); let r = 0n;
          if (op === 'clz') { let n = 0; for (let i = bits - 1; i >= 0 && !((v >> BigInt(i)) & 1n); i--) n++; r = BigInt(n); }
          else if (op === 'cls') { const top = (v >> BigInt(bits - 1)) & 1n; let n = 0; for (let i = bits - 2; i >= 0 && ((v >> BigInt(i)) & 1n) === top; i--) n++; r = BigInt(n); }
          else if (op === 'rbit') { for (let i = 0; i < bits; i++) if ((v >> BigInt(i)) & 1n) r |= 1n << BigInt(bits - 1 - i); }
          else {
            const chunk = op === 'rev' ? bits : op === 'rev16' ? 16 : 32;
            for (let c = 0; c < bits; c += chunk) {
              const part = (v >> BigInt(c)) & mask(chunk);
              let rp = 0n;
              for (let b = 0; b < chunk; b += 8) rp |= ((part >> BigInt(b)) & 0xFFn) << BigInt(chunk - 8 - b);
              r |= rp << BigInt(c);
            }
          }
          s2.writeR(rd, r);
        };
        break;
      }

      case 'csel': case 'csinc': case 'csinv': case 'csneg': {
        need(4, 'rd, rn, rm, cond');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rn = reg(args[1], { cls: 'gp', noSp: true }); const rm = reg(args[2], { cls: 'gp', noSp: true });
        const bits = sameBits(rd, rn, rm); const c = cond(args[3]);
        fn = (s2) => {
          if (s2.evalCondition(c)) { s2.writeR(rd, R(s2, rn)); return; }
          const m = R(s2, rm);
          const r = op === 'csel' ? m : op === 'csinc' ? m + 1n : op === 'csinv' ? ~m : -m;
          s2.writeR(rd, BigInt.asUintN(bits, r));
        };
        break;
      }
      case 'cset': case 'csetm': {
        need(2, 'rd, cond');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const c = cond(args[1]);
        if (c === 'al' || c === 'nv') throw new AsmError(`'${op}' cannot use condition ${c}`);
        const bits = rd.bits;
        fn = (s2) => s2.writeR(rd, s2.evalCondition(c) ? (op === 'cset' ? 1n : mask(bits)) : 0n);
        break;
      }
      case 'cinc': case 'cinv': case 'cneg': {
        need(3, 'rd, rn, cond');
        const rd = reg(args[0], { cls: 'gp', noSp: true }); const rn = reg(args[1], { cls: 'gp', noSp: true });
        const bits = sameBits(rd, rn); const c = cond(args[2]);
        if (c === 'al' || c === 'nv') throw new AsmError(`'${op}' cannot use condition ${c}`);
        fn = (s2) => {
          const v = R(s2, rn);
          if (!s2.evalCondition(c)) { s2.writeR(rd, v); return; }
          s2.writeR(rd, BigInt.asUintN(bits, op === 'cinc' ? v + 1n : op === 'cinv' ? ~v : -v));
        };
        break;
      }
      case 'ccmp': case 'ccmn': {
        need(4, 'rn, rm|#imm5, #nzcv, cond');
        const rn = reg(args[0], { cls: 'gp', noSp: true }); const bits = rn.bits;
        let get;
        if (isReg(args[1])) { const rm = reg(args[1], { cls: 'gp', noSp: true, bits }); get = (s2) => R(s2, rm); }
        else { const v = imm(args[1]); if (v < 0n || v > 31n) throw new AsmError(`${op} immediate must be 0-31`); get = () => v; }
        const nzcv = Number(imm(args[2])); if (nzcv < 0 || nzcv > 15) throw new AsmError('nzcv must be 0-15');
        const c = cond(args[3]);
        fn = (s2) => {
          if (s2.evalCondition(c)) {
            const b = get(s2);
            const r = op === 'ccmp' ? s2.addWithCarry(R(s2, rn), ~b, 1, bits) : s2.addWithCarry(R(s2, rn), b, 0, bits);
            s2.setNZCV(r.N, r.Z, r.C, r.V);
          } else s2.setNZCV(nzcv & 8, nzcv & 4, nzcv & 2, nzcv & 1);
        };
        break;
      }

      case 'b': {
        need(1, 'label');
        const t = target(args[0]);
        fn = () => t;
        break;
      }
      case 'bl': {
        need(1, 'label');
        const name = args[0].trim();
        if (isReg(name)) throw new AsmError('bl takes a label; use blr to call through a register');
        if (!this.symbols.has(name)) {
          // Exact name first (__printf_chk), then without Apple's leading underscore (_printf -> printf).
          const crt = CRT_FUNCTIONS.includes(name) ? name : name.replace(/^_/, '');
          if (CRT_FUNCTIONS.includes(crt)) {
            fn = (s2, pc) => { s2.x[30] = pc + 4n; s2.changedRegisters.add('x30'); s2.callCrt(crt); };
            break;
          }
          throw new AsmError(`undefined function or label '${name}'. The simulator's C runtime provides: ${CRT_FUNCTIONS.filter(f => !f.startsWith('_')).join(', ')}`);
        }
        const t = target(name);
        fn = (s2, pc) => { s2.x[30] = pc + 4n; s2.changedRegisters.add('x30'); s2.callDepth++; return t; };
        break;
      }
      case 'br': case 'blr': case 'ret': {
        if (op === 'ret') needRange(0, 1, '{xn}'); else need(1, 'xn');
        const rn = args[0] ? reg(args[0], { cls: 'gp', bits: 64, noSp: true }) : parseRegName('x30');
        fn = (s2, pc) => {
          const t = R(s2, rn);
          if (op === 'blr') { s2.x[30] = pc + 4n; s2.changedRegisters.add('x30'); s2.callDepth++; }
          if (op === 'ret') s2.callDepth = Math.max(0, s2.callDepth - 1);
          return t;
        };
        break;
      }
      case 'retaa': case 'retab': {
        need(0);
        const key = op === 'retaa' ? 1n : 2n;
        fn = (s2) => { s2.callDepth = Math.max(0, s2.callDepth - 1); return s2.pacAuth(s2.x[30], s2.sp, key); };
        break;
      }
      case 'cbz': case 'cbnz': {
        need(2, 'rt, label');
        const rt = reg(args[0], { cls: 'gp', noSp: true }); const t = target(args[1]);
        fn = (s2) => ((R(s2, rt) === 0n) === (op === 'cbz') ? t : undefined);
        break;
      }
      case 'tbz': case 'tbnz': {
        need(3, 'rt, #bit, label');
        const rt = reg(args[0], { cls: 'gp', noSp: true }); const bit = Number(imm(args[1]));
        if (bit < 0 || bit >= rt.bits) throw new AsmError(`bit number ${bit} out of range 0-${rt.bits - 1}`);
        const t = target(args[2]); const B = BigInt(bit);
        fn = (s2) => ((((R(s2, rt) >> B) & 1n) === 0n) === (op === 'tbz') ? t : undefined);
        break;
      }

      case 'ldr': fn = loadStore(true, null, false, false); break;
      case 'str': fn = loadStore(false, null, false, false); break;
      case 'ldur': fn = loadStore(true, null, false, true); break;
      case 'stur': fn = loadStore(false, null, false, true); break;
      case 'ldrb': case 'ldurb': fn = loadStore(true, 1, false, op === 'ldurb'); break;
      case 'strb': case 'sturb': fn = loadStore(false, 1, false, op === 'sturb'); break;
      case 'ldrh': case 'ldurh': fn = loadStore(true, 2, false, op === 'ldurh'); break;
      case 'strh': case 'sturh': fn = loadStore(false, 2, false, op === 'sturh'); break;
      case 'ldrsb': case 'ldursb': fn = loadStore(true, 1, true, op === 'ldursb'); break;
      case 'ldrsh': case 'ldursh': fn = loadStore(true, 2, true, op === 'ldursh'); break;
      case 'ldrsw': case 'ldursw': fn = loadStore(true, 4, true, op === 'ldursw'); break;
      case 'ldp': fn = pair(true); break;
      case 'stp': fn = pair(false); break;
      case 'ldpsw': fn = pair(true, true); break;

      case 'svc': {
        need(1, '#imm');
        const v = imm(args[0]);
        if (v < 0n || v > 0xFFFFn) throw new AsmError('svc immediate must be 0-65535');
        if (v !== 0n) this.warnings.push(`svc #${v}: Linux ignores the immediate (use svc #0); macOS uses svc #0x80`);
        fn = (s2) => s2.syscall();
        break;
      }
      case 'brk': case 'udf': case 'hlt': {
        needRange(0, 1, '#imm');
        fn = () => { throw new Fault(op === 'udf' ? 'SIGILL' : 'SIGTRAP', `${op} instruction executed`); };
        break;
      }

      // ----- pointer authentication (ARMv8.3) -----
      case 'paciasp': case 'pacibsp': case 'autiasp': case 'autibsp': case 'paciaz': case 'autiaz': case 'pacibz': case 'autibz': {
        need(0);
        const key = op.includes('ia') ? 1n : 2n; const sign = op.startsWith('pac'); const useSp = op.endsWith('sp');
        fn = (s2) => {
          const mod = useSp ? s2.sp : 0n;
          s2.x[30] = sign ? s2.pacSign(s2.x[30], mod, key) : s2.pacAuth(s2.x[30], mod, key);
          s2.changedRegisters.add('x30');
        };
        break;
      }
      case 'pacia': case 'pacib': case 'autia': case 'autib': case 'pacda': case 'pacdb': case 'autda': case 'autdb': {
        need(2, 'xd, xn|sp');
        const rd = reg(args[0], { cls: 'gp', bits: 64, noSp: true }); const rn = reg(args[1], { cls: 'gp', bits: 64 });
        const key = { pacia: 1n, autia: 1n, pacib: 2n, autib: 2n, pacda: 3n, autda: 3n, pacdb: 4n, autdb: 4n }[op];
        const sign = op.startsWith('pac');
        fn = (s2) => s2.writeR(rd, sign ? s2.pacSign(R(s2, rd), R(s2, rn), key) : s2.pacAuth(R(s2, rd), R(s2, rn), key));
        break;
      }
      case 'xpaclri': need(0); fn = (s2) => { s2.x[30] = BigInt.asUintN(48, s2.x[30]); s2.changedRegisters.add('x30'); }; break;
      case 'xpaci': case 'xpacd': { need(1, 'xd'); const rd = reg(args[0], { cls: 'gp', bits: 64, noSp: true }); fn = (s2) => s2.writeR(rd, BigInt.asUintN(48, R(s2, rd))); break; }

      // ----- floating point (scalar d/s only) -----
      case 'fmov': {
        need(2, 'fd, fn | fd, xn | xd, fn | fd, #imm');
        const d = reg(args[0]);
        if (isReg(args[1])) {
          const n = reg(args[1]);
          if (d.bits !== n.bits) throw new AsmError('fmov operands must be the same size (d<->x, s<->w)');
          fn = (s2) => s2.writeR(d, R(s2, n));
        } else {
          if (d.cls !== 'fp') throw new AsmError('fmov immediate needs a d or s register');
          const f = Number(args[1].trim().replace(/^#/, ''));
          if (Number.isNaN(f)) throw new AsmError(`bad floating point immediate '${args[1]}'`);
          const bitsv = d.bits === 64 ? f64ToBits(f) : f32ToBits(f);
          fn = (s2) => s2.writeR(d, bitsv);
        }
        break;
      }
      case 'fadd': fn = fp3((a, b) => a + b); break;
      case 'fsub': fn = fp3((a, b) => a - b); break;
      case 'fmul': fn = fp3((a, b) => a * b); break;
      case 'fdiv': fn = fp3((a, b) => a / b); break;
      case 'fmax': fn = fp3((a, b) => Math.max(a, b)); break;
      case 'fmin': fn = fp3((a, b) => Math.min(a, b)); break;
      case 'fneg': fn = fp2((a) => -a); break;
      case 'fabs': fn = fp2((a) => Math.abs(a)); break;
      case 'fsqrt': fn = fp2((a) => Math.sqrt(a)); break;
      case 'frintp': fn = fp2(Math.ceil); break;
      case 'frintm': fn = fp2(Math.floor); break;
      case 'frintz': fn = fp2(Math.trunc); break;
      case 'frinta': fn = fp2(roundAway); break;
      case 'frintn': case 'frintx': case 'frinti': fn = fp2(roundEven); break;
      case 'fmadd': case 'fmsub': case 'fnmadd': case 'fnmsub': {
        need(4, 'fd, fn, fm, fa');
        const d = reg(args[0], { cls: 'fp' }); const n = reg(args[1], { cls: 'fp', bits: d.bits }); const m = reg(args[2], { cls: 'fp', bits: d.bits }); const a = reg(args[3], { cls: 'fp', bits: d.bits });
        fn = (s2) => {
          const p = s2.readFp(n) * s2.readFp(m); const av = s2.readFp(a);
          s2.writeFp(d, op === 'fmadd' ? av + p : op === 'fmsub' ? av - p : op === 'fnmadd' ? -av - p : -av + p);
        };
        break;
      }
      case 'fcmp': case 'fcmpe': {
        need(2, 'fn, fm|#0.0');
        const n = reg(args[0], { cls: 'fp' });
        let get;
        if (isReg(args[1])) { const m = reg(args[1], { cls: 'fp', bits: n.bits }); get = (s2) => s2.readFp(m); }
        else { if (Number(args[1].replace(/^#/, '')) !== 0) throw new AsmError('fcmp immediate must be #0.0'); get = () => 0; }
        fn = (s2) => {
          const a = s2.readFp(n); const b = get(s2);
          if (Number.isNaN(a) || Number.isNaN(b)) s2.setNZCV(0, 0, 1, 1);
          else if (a === b) s2.setNZCV(0, 1, 1, 0);
          else if (a < b) s2.setNZCV(1, 0, 0, 0);
          else s2.setNZCV(0, 0, 1, 0);
        };
        break;
      }
      case 'fcsel': {
        need(4, 'fd, fn, fm, cond');
        const d = reg(args[0], { cls: 'fp' }); const n = reg(args[1], { cls: 'fp', bits: d.bits }); const m = reg(args[2], { cls: 'fp', bits: d.bits }); const c = cond(args[3]);
        fn = (s2) => s2.writeR(d, s2.evalCondition(c) ? R(s2, n) : R(s2, m));
        break;
      }
      case 'fcvt': {
        need(2, 'dd, sn | sd, dn');
        const d = reg(args[0], { cls: 'fp' }); const n = reg(args[1], { cls: 'fp' });
        if (d.bits === n.bits) throw new AsmError('fcvt converts between d and s registers');
        fn = (s2) => s2.writeFp(d, s2.readFp(n));
        break;
      }
      case 'scvtf': case 'ucvtf': {
        need(2, 'fd, rn');
        const d = reg(args[0], { cls: 'fp' }); const n = reg(args[1], { cls: 'gp', noSp: true });
        fn = (s2) => { const v = R(s2, n); s2.writeFp(d, Number(op === 'scvtf' ? signExtend(v, n.bits) : v)); };
        break;
      }
      case 'fcvtzs': fn = fcvtToInt(Math.trunc, false); break;
      case 'fcvtzu': fn = fcvtToInt(Math.trunc, true); break;
      case 'fcvtns': fn = fcvtToInt(roundEven, false); break;
      case 'fcvtnu': fn = fcvtToInt(roundEven, true); break;
      case 'fcvtas': fn = fcvtToInt(roundAway, false); break;
      case 'fcvtau': fn = fcvtToInt(roundAway, true); break;
      case 'fcvtps': fn = fcvtToInt(Math.ceil, false); break;
      case 'fcvtpu': fn = fcvtToInt(Math.ceil, true); break;
      case 'fcvtms': fn = fcvtToInt(Math.floor, false); break;
      case 'fcvtmu': fn = fcvtToInt(Math.floor, true); break;

      default: {
        const exm = /^(ldxr|ldaxr|ldar|stxr|stlxr|stlr)([bh]?)$/.exec(op);
        if (exm) {
          const isLoad = exm[1].startsWith('ld'); const status = exm[1] === 'stxr' || exm[1] === 'stlxr';
          need(status ? 3 : 2, status ? 'ws, rt, [xn]' : 'rt, [xn]');
          const ws = status ? reg(args[0], { cls: 'gp', bits: 32 }) : null;
          const rt = reg(args[status ? 1 : 0], { cls: 'gp', noSp: true });
          const sz = exm[2] === 'b' ? 1 : exm[2] === 'h' ? 2 : rt.bits / 8;
          const mo = memOperand(args[status ? 2 : 1], undefined, sz, {});
          if (mo.offset !== 0n || mo.idxReg) throw new AsmError(`'${op}' only takes [xn] (no offset)`);
          fn = (s2) => {
            const a = effAddr(s2, mo);
            if (a % BigInt(sz)) throw new Fault('SIGBUS', `unaligned ${sz}-byte exclusive access at 0x${a.toString(16)}`);
            if (isLoad) { s2.writeR(rt, s2.load(a, sz)); if (exm[1] !== 'ldar') s2.exclusive = a; }
            else { s2.store(a, sz, R(s2, rt)); if (ws) { s2.writeR(ws, s2.exclusive === a ? 0n : 1n); s2.exclusive = null; } }
          };
          break;
        }
        if (op === 'clrex') { fn = (s2) => { s2.exclusive = null; }; break; }
        if (/^(ldadd|swp|cas|ldclr|ldset|ldeor)/.test(op)) {
          throw new AsmError(`atomic/exclusive instruction '${op}' is not supported by this single-threaded simulator`);
        }
        if (/^(ld|st)[1-4]$/.test(op) || /^[us]?(addv|addp|dup|ins|umov|smov|movi|cnt|ext|zip|uzp|trn|tbl)$/.test(op)) {
          throw new AsmError(`NEON/SIMD instruction '${op}' is not supported by this simulator`);
        }
        throw new AsmError(`unknown instruction '${op}'`);
      }
    }
    return { op: base, args, fn };
  }

  readFp(r) { return r.bits === 64 ? bitsToF64(this.v[r.n]) : bitsToF32(this.v[r.n]); }
  writeFp(r, f) { this.writeR(r, r.bits === 64 ? f64ToBits(f) : f32ToBits(f)); }

  // ======================================================================
  // Execution
  // ======================================================================

  step() {
    if (!this.isAssembled) return { status: 'error', message: 'Program is not assembled' };
    if (this.isTerminated) return { status: 'terminated', message: this.exitMessage || 'Program has terminated' };

    this.changedRegisters.clear();
    const pc = this.pc;
    if (pc === EXIT_SENTINEL) {
      return this.terminate(Number(this.x[0] & 0xFFn), `${this.entryName || 'function'} returned (x0 = ${this.toSigned64(this.x[0])})`);
    }
    const inst = this.instMap.get(pc);
    if (!inst) {
      return this.raise(new Fault('SIGSEGV', this.describeBadPc(pc)), null);
    }
    try {
      const next = inst.exec(this, pc);
      this.cycleCount++;
      this.pc = next === undefined ? pc + 4n : BigInt.asUintN(64, next);
    } catch (err) {
      if (err instanceof Fault) return this.raise(err, inst);
      if (err instanceof ExitSignal) { this.cycleCount++; return this.terminate(err.code, err.message); }
      return this.raise(new Fault('SIGILL', `internal simulator error: ${err.message}`), inst);
    }
    if (this.isTerminated) return { status: 'terminated', message: this.exitMessage };

    if (this.pc !== EXIT_SENTINEL && !this.instMap.has(this.pc)) {
      // Running off the end of the code: report clearly instead of silently stopping.
      const last = this.instructions[this.instructions.length - 1];
      if (last && this.pc === last.pc + 4n && pc === last.pc) {
        this.isTerminated = true;
        this.exitMessage = 'Execution ran past the last instruction without calling exit (on real hardware this would crash)';
        return { status: 'terminated', message: this.exitMessage, fellOff: true };
      }
    }
    const nextLine = this.pcToLineIndex.get(this.pc);
    if (nextLine !== undefined && this.breakpoints.has(nextLine)) return { status: 'breakpoint', line: nextLine };
    return { status: 'ok', currentLine: nextLine };
  }

  describeBadPc(pc) {
    const hex = `0x${pc.toString(16)}`;
    if (pc >> 48n) return `PC jumped to non-canonical address ${hex} - a PAC-signed return address that failed authentication (or was never authenticated) crashes here`;
    const last = this.instructions[this.instructions.length - 1];
    if (last && pc === last.pc + 4n) return `PC reached 0x${pc.toString(16)}, just past the last instruction (a label at the very end of the code has nothing after it - add an exit)`;
    if (pc === 0n) return 'PC jumped to 0x0 (returned through a zeroed x30, or called a NULL function pointer)';
    if (pc % 4n) return `PC ${hex} is not 4-byte aligned`;
    const r = this.regionFor(pc);
    if (r && r.name !== '.text') return `PC jumped to ${hex} in ${r.name}, which is not executable (NX)`;
    return `PC jumped to ${hex}, which is not an instruction`;
  }

  raise(fault, inst) {
    this.isTerminated = true;
    const where = inst ? ` at line ${inst.lineIndex + 1} (\`${inst.rawText}\`)` : '';
    const message = fault.signal === 'ASAN' ? `AddressSanitizer: ${fault.message}${where}` : `${fault.signal}: ${fault.message}${where}`;
    this.fault = { signal: fault.signal, message: fault.message, line: inst ? inst.lineIndex : null, pc: this.pc };
    this.lastError = message;
    this.exitCode = fault.signal === 'ASAN' ? 1 : fault.signal === 'SIGSEGV' ? 139 : fault.signal === 'SIGBUS' ? 135 : fault.signal === 'SIGILL' ? 132 : fault.signal === 'SIGABRT' ? 134 : 133;
    this.exitMessage = message;
    this.stderr += message + '\n';
    return { status: 'error', message, fault: this.fault };
  }

  terminate(code, message) {
    this.isTerminated = true;
    this.exitCode = code & 0xFF;
    this.exitMessage = message || `exited with code ${this.exitCode}`;
    if (this.libc.leakCheck) {
      this.leaks = this.libc.leaks();
      if (this.leaks.length) this.stderr += this.libc.leakReport();
    }
    return { status: 'terminated', message: `Program exited with code ${this.exitCode}`, exitCode: this.exitCode };
  }

  // Run until exit, fault, breakpoint, or the step budget runs out.
  run(maxSteps = DEFAULT_MAX_STEPS, { ignoreBreakpoints = false } = {}) {
    let res = { status: 'ok' };
    let steps = 0;
    while (!this.isTerminated && steps < maxSteps) {
      res = this.step();
      steps++;
      if (res.status === 'breakpoint' && !ignoreBreakpoints) return res;
      if (res.status !== 'ok' && res.status !== 'breakpoint') return res;
    }
    if (!this.isTerminated) return { status: 'timeout', message: `Stopped after ${steps.toLocaleString()} instructions - possible infinite loop`, steps };
    return res;
  }

  // ---------------- OS and C library (see libc.js) ----------------
  syscall() { return this.libc.syscall(); }

  callCrt(name) {
    this.libc.call(name);
    // Caller-saved registers are clobbered by real calls; poison a few so code
    // that wrongly relies on them after a call fails visibly.
    for (const r of [9, 10, 11, 12, 13, 14, 15]) this.x[r] = 0xDEADBEEFn + BigInt(r);
  }

  // Bytes of a file in the simulated filesystem (null if it does not exist).
  fileContents(path) { return this.libc.fileContents(path); }

  toggleBreakpoint(lineIndex) {
    if (this.breakpoints.has(lineIndex)) { this.breakpoints.delete(lineIndex); return false; }
    this.breakpoints.add(lineIndex); return true;
  }

  getCurrentLineIndex() {
    return this.pcToLineIndex.get(this.pc) ?? -1;
  }

  // Symbolize an address for the UI: "main+8", "msg", "stack".
  symbolize(addr) {
    const a = BigInt(addr);
    let best = null;
    for (const [name, v] of this.symbols) {
      if (!(this.labels.has(name) || this.dataLabels.has(name))) continue;
      if (v <= a && (!best || v > best[1])) best = [name, v];
    }
    if (best && a - best[1] < 0x1000n) return a === best[1] ? best[0] : `${best[0]}+${a - best[1]}`;
    const r = this.regionFor(a);
    return r ? r.name : null;
  }
}

