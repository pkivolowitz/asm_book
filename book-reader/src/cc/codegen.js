// AST -> AArch64 assembly for the in-browser simulator.
//
// Code is deliberately -O0 style (like gcc/clang without optimization) so it
// is easy to read next to the C source: every expression is computed into x0
// (integers, pointers) or d0 (floating point), temporaries are pushed on the
// stack 16 bytes at a time, and locals live at negative offsets from x29.
//
// Register value invariant: an integer value in x0 is always correctly
// sign- or zero-extended to 64 bits according to its C type.

import { isInteger, isFlonum, T } from './types.js';
import { isMovEncodable } from '../simulator/arm64Engine.js';
import { CError } from './lexer.js';

const alignTo = (n, a) => Math.ceil(n / a) * a;
const isAgg = (t) => t.kind === 'struct' || t.kind === 'union';

export class CodeGen {
  constructor({ unitName }) {
    this.unitName = unitName;
    this.lines = [];       // { text, file, line }
    this.loc = null;
    this.depth = 0;
    this.referenced = new Set(); // objects referenced (for the linker)
    this.n = 0;
  }

  emit(text) { this.lines.push({ text, file: this.loc?.file, line: this.loc?.line }); }
  ins(text) { this.emit(`    ${text}`); }
  label(name) { this.emit(`${name}:`); }
  lbl(kind) { return `.L.${kind}.${this.unitName}.${++this.n}`; }
  at(tok) { if (tok && tok.line) this.loc = tok; }

  // ---------------- small helpers ----------------
  loadImm(reg, value) {
    const v = BigInt.asUintN(64, BigInt(value));
    const w = reg.replace(/^x/, 'w');
    if (v <= 0xFFFFn) { this.ins(`mov ${reg}, #${v}`); return; }
    if (isMovEncodable(v, 64)) { this.ins(`mov ${reg}, #0x${v.toString(16)}`); return; }
    if (v <= 0xFFFFFFFFn && isMovEncodable(v, 32)) { this.ins(`mov ${w}, #0x${v.toString(16)}`); return; }
    let first = true;
    for (let sh = 0n; sh < 64n; sh += 16n) {
      const chunk = (v >> sh) & 0xFFFFn;
      if (chunk === 0n) continue;
      this.ins(`${first ? 'movz' : 'movk'} ${reg}, #0x${chunk.toString(16)}${sh ? `, lsl #${sh}` : ''}`);
      first = false;
    }
  }

  // dst = src + imm (imm may be negative / large); clobbers x17 for big values
  addImm(dst, src, imm) {
    const v = Number(imm);
    if (v === 0) { if (dst !== src) this.ins(`mov ${dst}, ${src}`); return; }
    if (v > 0 && v <= 4095) { this.ins(`add ${dst}, ${src}, #${v}`); return; }
    if (v < 0 && v >= -4095) { this.ins(`sub ${dst}, ${src}, #${-v}`); return; }
    this.loadImm('x17', Math.abs(v));
    this.ins(`${v > 0 ? 'add' : 'sub'} ${dst}, ${src}, x17`);
  }

  push() { this.ins('str x0, [sp, #-16]!'); this.depth++; }
  pop(reg) { this.ins(`ldr ${reg}, [sp], #16`); this.depth--; }
  pushf() { this.ins('str d0, [sp, #-16]!'); this.depth++; }
  popf(reg) { this.ins(`ldr ${reg}, [sp], #16`); this.depth--; }

  // Re-establish the register invariant after an operation of type ty.
  normalize(ty) {
    if (ty.kind === 'bool') return;
    if (!isInteger(ty) && ty.kind !== 'enum') return;
    switch (ty.size) {
      case 1: this.ins(ty.unsigned ? 'and x0, x0, #0xff' : 'sxtb x0, w0'); break;
      case 2: this.ins(ty.unsigned ? 'and x0, x0, #0xffff' : 'sxth x0, w0'); break;
      case 4: this.ins(ty.unsigned ? 'mov w0, w0' : 'sxtw x0, w0'); break;
      default: break;
    }
  }

  roundFloat() { this.ins('fcvt s0, d0'); this.ins('fcvt d0, s0'); }

  cmpZero(ty) {
    if (isFlonum(ty)) this.ins('fcmp d0, #0.0');
    else this.ins('cmp x0, #0');
  }

  // load the value at address x0 into x0/d0
  load(ty) {
    switch (ty.kind) {
      case 'array': case 'struct': case 'union': case 'func': return; // value is the address
      case 'float': this.ins('ldr s0, [x0]'); this.ins('fcvt d0, s0'); return;
      case 'double': this.ins('ldr d0, [x0]'); return;
      default: break;
    }
    switch (ty.size) {
      case 1: this.ins(ty.unsigned ? 'ldrb w0, [x0]' : 'ldrsb x0, [x0]'); return;
      case 2: this.ins(ty.unsigned ? 'ldrh w0, [x0]' : 'ldrsh x0, [x0]'); return;
      case 4: this.ins(ty.unsigned ? 'ldr w0, [x0]' : 'ldrsw x0, [x0]'); return;
      default: this.ins('ldr x0, [x0]');
    }
  }

  // store x0/d0 to the address on top of the push stack
  store(ty) {
    this.pop('x1');
    if (isAgg(ty)) { this.copyMem('x1', 'x0', ty.size); this.ins('mov x0, x1'); return; }
    switch (ty.kind) {
      case 'float': this.ins('fcvt s1, d0'); this.ins('str s1, [x1]'); return;
      case 'double': this.ins('str d0, [x1]'); return;
      default: break;
    }
    switch (ty.size) {
      case 1: this.ins('strb w0, [x1]'); return;
      case 2: this.ins('strh w0, [x1]'); return;
      case 4: this.ins('str w0, [x1]'); return;
      default: this.ins('str x0, [x1]');
    }
  }

  // copy n bytes from [src] to [dst] (registers); clobbers x13-x15 only, so
  // it is safe while argument registers are live
  copyMem(dst, src, n) {
    if (n > 64) {
      const loop = this.lbl('copy');
      this.ins('mov x13, #0');
      this.loadImm('x14', n);
      this.label(loop);
      this.ins(`ldrb w15, [${src}, x13]`);
      this.ins(`strb w15, [${dst}, x13]`);
      this.ins('add x13, x13, #1');
      this.ins('cmp x13, x14');
      this.ins(`b.ne ${loop}`);
      return;
    }
    let i = 0;
    for (; i + 8 <= n; i += 8) { this.ins(`ldr x15, [${src}, #${i}]`); this.ins(`str x15, [${dst}, #${i}]`); }
    for (; i + 4 <= n; i += 4) { this.ins(`ldr w15, [${src}, #${i}]`); this.ins(`str w15, [${dst}, #${i}]`); }
    for (; i < n; i++) { this.ins(`ldrb w15, [${src}, #${i}]`); this.ins(`strb w15, [${dst}, #${i}]`); }
  }

  // ---------------- addresses ----------------
  globalAddr(reg, obj) {
    this.referenced.add(obj);
    this.ins(`adrp ${reg}, ${obj.asmName}`);
    this.ins(`add ${reg}, ${reg}, :lo12:${obj.asmName}`);
  }

  genAddr(n) {
    this.at(n.tok);
    switch (n.kind) {
      case 'var':
        if (n.obj.isLocal) { this.addImm('x0', 'x29', -n.obj.offset); return; }
        this.globalAddr('x0', n.obj);
        return;
      case 'deref': this.genExpr(n.lhs); return;
      case 'comma': this.genExpr(n.lhs); this.genAddr(n.rhs); return;
      case 'member': this.genAddr(n.lhs); this.addImm('x0', 'x0', n.offset); return;
      case 'call': case 'assign': case 'cond':
        if (isAgg(n.ty)) { this.genExpr(n); return; }
        break;
      default: break;
    }
    throw new CError('expression is not an lvalue', n.tok);
  }

  // ---------------- casts ----------------
  castOp(from, to) {
    if (to.kind === 'void') return;
    const f = (from.kind === 'array' || from.kind === 'func' || from.kind === 'ptr') ? T.ulong : from;
    const t = to.kind === 'ptr' ? T.ulong : to;
    if (isAgg(t) || isAgg(f)) return;
    if (t.kind === 'bool') { this.cmpZero(f); this.ins('cset x0, ne'); return; }
    if (isFlonum(f) && isFlonum(t)) { if (t.kind === 'float' && f.kind === 'double') this.roundFloat(); return; }
    if (isFlonum(f)) {
      this.ins(t.unsigned ? 'fcvtzu x0, d0' : 'fcvtzs x0, d0');
      this.normalize(t);
      return;
    }
    if (isFlonum(t)) {
      this.ins(f.unsigned ? 'ucvtf d0, x0' : 'scvtf d0, x0');
      if (t.kind === 'float') this.roundFloat();
      return;
    }
    if (t.size < 8 && (t.size < f.size || t.unsigned !== f.unsigned || f.kind === 'bool')) this.normalize(t);
  }

  // ---------------- expressions ----------------
  genExpr(n) {
    this.at(n.tok);
    switch (n.kind) {
      case 'num': {
        if (n.fval !== undefined) {
          if (n.fval === 0 && !Object.is(n.fval, -0)) { this.ins('fmov d0, xzr'); return; }
          const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, n.fval, true);
          this.loadImm('x0', dv.getBigUint64(0, true));
          this.ins('fmov d0, x0');
          return;
        }
        if (isFlonum(n.ty)) { this.genExpr({ ...n, fval: Number(n.val), val: undefined }); return; }
        this.loadImm('x0', n.val);
        return;
      }
      case 'var': case 'member': case 'deref':
        this.genAddr(n); this.load(n.ty); return;
      case 'addr': this.genAddr(n.lhs); return;
      case 'assign': {
        this.genAddr(n.lhs); this.push();
        this.genExpr(n.rhs);
        this.store(n.ty);
        return;
      }
      case 'comma': this.genExpr(n.lhs); this.genExpr(n.rhs); return;
      case 'cast': this.genExpr(n.lhs); this.castOp(n.lhs.ty, n.ty); return;
      case 'memzero': {
        const size = n.obj.ty.size;
        if (size <= 64) {
          let i = 0;
          this.addImm('x0', 'x29', -n.obj.offset);
          for (; i + 8 <= size; i += 8) this.ins(`str xzr, [x0, #${i}]`);
          for (; i + 4 <= size; i += 4) this.ins(`str wzr, [x0, #${i}]`);
          for (; i < size; i++) this.ins(`strb wzr, [x0, #${i}]`);
        } else {
          this.addImm('x0', 'x29', -n.obj.offset);
          this.ins('mov w1, #0');
          this.loadImm('x2', size);
          this.ins('bl memset');
        }
        return;
      }
      case 'cond': {
        const els = this.lbl('else'); const end = this.lbl('end');
        this.genExpr(n.cond); this.cmpZero(n.cond.ty); this.ins(`b.eq ${els}`);
        this.genExpr(n.then); this.ins(`b ${end}`);
        this.label(els); this.genExpr(n.els);
        this.label(end);
        return;
      }
      case 'not': this.genExpr(n.lhs); this.cmpZero(n.lhs.ty); this.ins('cset x0, eq'); return;
      case 'bnot': this.genExpr(n.lhs); this.ins('mvn x0, x0'); this.normalize(n.ty); return;
      case 'neg':
        this.genExpr(n.lhs);
        if (isFlonum(n.ty)) { this.ins('fneg d0, d0'); return; }
        this.ins('neg x0, x0'); this.normalize(n.ty); return;
      case 'logand': case 'logor': {
        const short = this.lbl(n.kind === 'logand' ? 'false' : 'true'); const end = this.lbl('end');
        const br = n.kind === 'logand' ? 'b.eq' : 'b.ne';
        this.genExpr(n.lhs); this.cmpZero(n.lhs.ty); this.ins(`${br} ${short}`);
        this.genExpr(n.rhs); this.cmpZero(n.rhs.ty); this.ins(`${br} ${short}`);
        this.ins(`mov x0, #${n.kind === 'logand' ? 1 : 0}`); this.ins(`b ${end}`);
        this.label(short); this.ins(`mov x0, #${n.kind === 'logand' ? 0 : 1}`);
        this.label(end);
        return;
      }
      case 'call': this.genCall(n); return;
      default: break;
    }

    // binary operators
    const opTy = n.cmpTy || n.lhs.ty;
    if (isFlonum(opTy)) {
      this.genExpr(n.rhs); this.pushf();
      this.genExpr(n.lhs); this.popf('d1');
      this.at(n.tok);
      const fop = { add: 'fadd', sub: 'fsub', mul: 'fmul', div: 'fdiv' }[n.kind];
      if (fop) { this.ins(`${fop} d0, d0, d1`); if (n.ty.kind === 'float') this.roundFloat(); return; }
      const cond = { eq: 'eq', ne: 'ne', lt: 'mi', le: 'ls' }[n.kind];
      if (cond) { this.ins('fcmp d0, d1'); this.ins(`cset x0, ${cond}`); return; }
      throw new CError(`invalid floating point operation '${n.tok.s}'`, n.tok);
    }
    this.genExpr(n.rhs); this.push();
    this.genExpr(n.lhs); this.pop('x1');
    this.at(n.tok);
    const u = opTy.unsigned || opTy.kind === 'ptr';
    switch (n.kind) {
      case 'add': this.ins('add x0, x0, x1'); break;
      case 'sub': this.ins('sub x0, x0, x1'); break;
      case 'mul': this.ins('mul x0, x0, x1'); break;
      case 'div': this.ins(u ? 'udiv x0, x0, x1' : 'sdiv x0, x0, x1'); break;
      case 'mod': this.ins(u ? 'udiv x2, x0, x1' : 'sdiv x2, x0, x1'); this.ins('msub x0, x2, x1, x0'); break;
      case 'band': this.ins('and x0, x0, x1'); break;
      case 'bor': this.ins('orr x0, x0, x1'); break;
      case 'bxor': this.ins('eor x0, x0, x1'); break;
      case 'shl': this.ins('lsl x0, x0, x1'); break;
      case 'shr': this.ins(u ? 'lsr x0, x0, x1' : 'asr x0, x0, x1'); break;
      case 'eq': case 'ne': case 'lt': case 'le': {
        const cond = { eq: 'eq', ne: 'ne', lt: u ? 'lo' : 'lt', le: u ? 'ls' : 'le' }[n.kind];
        this.ins('cmp x0, x1'); this.ins(`cset x0, ${cond}`);
        return;
      }
      default: throw new CError(`unsupported operator '${n.tok.s}'`, n.tok);
    }
    if (['add', 'sub', 'mul', 'div', 'mod', 'shl'].includes(n.kind)) this.normalize(n.ty);
  }

  genCall(n) {
    const args = n.args;
    // classify arguments (AAPCS64: x0-x7 / d0-d7, then the stack)
    let gp = 0; let fp = 0; let stackSlots = 0;
    const where = args.map(a => {
      if (isFlonum(a.ty)) return fp < 8 ? { reg: `d${fp++}` } : { slot: stackSlots++, fp: true };
      return gp < 8 ? { reg: `x${gp++}` } : { slot: stackSlots++ };
    });
    const stackBytes = alignTo(stackSlots * 8, 16);
    if (stackBytes) this.ins(`sub sp, sp, #${stackBytes}`);
    args.forEach((a, i) => {
      if (isAgg(a.ty)) {
        // pass a pointer to a private copy (by-value semantics)
        const tmp = n.argTemps[i];
        this.addImm('x0', 'x29', -tmp.offset); this.push();
        this.genExpr(a);
        this.pop('x1');
        this.copyMem('x1', 'x0', a.ty.size);
        this.ins('mov x0, x1');
        this.push();
        return;
      }
      this.genExpr(a);
      if (isFlonum(a.ty)) this.pushf(); else this.push();
    });
    this.at(n.tok);
    const direct = n.fn.kind === 'var' && n.fn.obj.isFunction;
    if (!direct) { this.genExpr(n.fn); this.ins('mov x16, x0'); }
    if (n.retBuf) this.addImm('x8', 'x29', -n.retBuf.offset);
    for (let i = args.length - 1; i >= 0; i--) {
      const w = where[i];
      if (w.reg) { if (w.reg[0] === 'd') this.popf(w.reg); else this.pop(w.reg); continue; }
      const off = 16 * i + w.slot * 8;
      if (w.fp) { this.popf('d16'); this.ins(`str d16, [sp, #${off}]`); } else { this.pop('x17'); this.ins(`str x17, [sp, #${off}]`); }
    }
    if (direct) { this.referenced.add(n.fn.obj); this.ins(`bl ${n.fn.obj.asmName}`); } else this.ins('blr x16');
    if (stackBytes) this.ins(`add sp, sp, #${stackBytes}`);
    if (n.retBuf) { this.addImm('x0', 'x29', -n.retBuf.offset); return; }
    if (isInteger(n.ty) && n.ty.size < 8) this.normalize(n.ty);
  }

  // ---------------- statements ----------------
  genStmt(n) {
    this.at(n.tok);
    switch (n.kind) {
      case 'block': for (const s of n.body) this.genStmt(s); return;
      case 'expr': this.genExpr(n.expr); return;
      case 'return': {
        if (n.expr) {
          this.genExpr(n.expr);
          if (isAgg(n.expr.ty)) {
            // copy the result into the caller's buffer (address saved from x8)
            this.ins('mov x1, x0');
            this.addImm('x0', 'x29', -this.fn.retBufPtr.offset);
            this.ins('ldr x0, [x0]');
            this.copyMem('x0', 'x1', n.expr.ty.size);
          }
        }
        this.ins(`b ${this.returnLabel}`);
        return;
      }
      case 'if': {
        const els = this.lbl('else'); const end = this.lbl('end');
        this.genExpr(n.cond); this.cmpZero(n.cond.ty); this.ins(`b.eq ${els}`);
        this.genStmt(n.then); this.ins(`b ${end}`);
        this.label(els);
        if (n.els) this.genStmt(n.els);
        this.label(end);
        return;
      }
      case 'for': {
        const begin = this.lbl('begin');
        if (n.init) this.genStmt(n.init);
        this.label(begin);
        if (n.cond) { this.at(n.cond.tok); this.genExpr(n.cond); this.cmpZero(n.cond.ty); this.ins(`b.eq ${n.brk}`); }
        this.genStmt(n.body);
        this.label(n.cont);
        if (n.inc) { this.at(n.inc.tok); this.genExpr(n.inc); }
        this.ins(`b ${begin}`);
        this.label(n.brk);
        return;
      }
      case 'do': {
        const begin = this.lbl('begin');
        this.label(begin);
        this.genStmt(n.body);
        this.label(n.cont);
        this.at(n.cond.tok);
        this.genExpr(n.cond); this.cmpZero(n.cond.ty); this.ins(`b.ne ${begin}`);
        this.label(n.brk);
        return;
      }
      case 'switch': {
        this.genExpr(n.cond);
        const ty = n.cond.ty;
        for (const c of n.cases) {
          const v = ty.unsigned ? BigInt.asUintN(ty.size * 8, c.val) : BigInt.asIntN(ty.size * 8, c.val);
          if (v >= 0n && v <= 4095n) this.ins(`cmp x0, #${v}`);
          else { this.loadImm('x1', v); this.ins('cmp x0, x1'); }
          this.ins(`b.eq ${c.label}`);
        }
        this.ins(`b ${n.dflt || n.brk}`);
        this.genStmt(n.body);
        this.label(n.brk);
        return;
      }
      case 'label': this.label(n.label); this.genStmt(n.body); return;
      case 'goto': this.ins(`b ${n.label}`); return;
      default: throw new CError(`internal: unknown statement ${n.kind}`, n.tok);
    }
  }

  // ---------------- functions and data ----------------
  genFunction(fn) {
    // assign stack slots
    let off = 0;
    for (const v of [...fn.locals].reverse()) {
      off = alignTo(off + v.ty.size, Math.max(v.ty.align, 1));
      v.offset = off;
    }
    const frame = alignTo(off, 16);
    this.fn = fn;
    this.returnLabel = `.L.return.${fn.asmName}`;
    this.at(fn.tok);
    this.emit('');
    this.emit('    .text');
    if (!fn.isStatic) this.emit(`    .global ${fn.asmName}`);
    this.emit('    .p2align 2');
    this.label(fn.asmName);
    this.ins('stp x29, x30, [sp, #-16]!');
    this.ins('mov x29, sp');
    if (frame) this.addImm('sp', 'sp', -frame);
    // spill incoming parameters into their stack slots
    let gp = 0; let fpr = 0; let stackOff = 16;
    if (fn.retBufPtr) { this.addImm('x17', 'x29', -fn.retBufPtr.offset); this.ins('str x8, [x17]'); }
    fn.paramObjs.forEach(p => {
      const t = p.ty;
      this.addImm('x17', 'x29', -p.offset);
      if (isFlonum(t)) {
        let src;
        if (fpr < 8) src = `d${fpr++}`;
        else { this.ins(`ldr d16, [x29, #${stackOff}]`); src = 'd16'; stackOff += 8; }
        if (t.kind === 'float') { const s = src.replace('d', 's'); this.ins(`fcvt ${s}, ${src}`); this.ins(`str ${s}, [x17]`); }
        else this.ins(`str ${src}, [x17]`);
        return;
      }
      let src;
      if (gp < 8) src = `x${gp++}`;
      else { this.ins(`ldr x16, [x29, #${stackOff}]`); src = 'x16'; stackOff += 8; }
      if (isAgg(t)) { this.copyMem('x17', src, t.size); return; } // incoming pointer to the caller's copy
      const w = src.replace('x', 'w');
      if (t.size === 1) this.ins(`strb ${w}, [x17]`);
      else if (t.size === 2) this.ins(`strh ${w}, [x17]`);
      else if (t.size === 4) this.ins(`str ${w}, [x17]`);
      else this.ins(`str ${src}, [x17]`);
    });
    this.genStmt(fn.body);
    if (this.depth !== 0) throw new CError(`internal: unbalanced stack in ${fn.name}`, fn.tok);
    this.at(fn.endTok || fn.tok);
    if (fn.name === 'main') this.ins('mov x0, #0'); // C99: reaching the end of main returns 0
    this.label(this.returnLabel);
    this.ins('mov sp, x29');
    this.ins('ldp x29, x30, [sp], #16');
    this.ins('ret');
  }

  genData(obj) {
    this.at(obj.tok);
    const size = obj.ty.size;
    this.emit('');
    this.emit(obj.isRodata ? '    .section .rodata' : '    .data');
    if (!obj.isStatic && !obj.isLiteral) this.emit(`    .global ${obj.asmName}`);
    const align = Math.max(1, Math.min(obj.ty.align, 16));
    if (align > 1) this.emit(`    .p2align ${Math.log2(align)}`);
    this.label(obj.asmName);
    const data = obj.initData;
    if (!data && !(obj.relocs && obj.relocs.length)) { if (size) this.ins(`.zero ${size}`); return; }
    if (obj.isLiteral) {
      const s = Array.from(data.subarray(0, data.length - 1)).map(b => (b === 34 ? '\\"' : b === 92 ? '\\\\' : b >= 32 && b < 127 ? String.fromCharCode(b) : `\\${b.toString(8).padStart(3, '0')}`)).join('');
      this.ins(`.asciz "${s}"`);
      return;
    }
    const relocs = [...(obj.relocs || [])].sort((a, b) => a.offset - b.offset);
    let pos = 0;
    const flushBytes = (end) => {
      while (pos < end) {
        const chunk = data.subarray(pos, Math.min(end, pos + 16));
        if (chunk.every(b => b === 0)) {
          let z = pos; while (z < end && data[z] === 0) z++;
          this.ins(`.zero ${z - pos}`); pos = z; continue;
        }
        this.ins(`.byte ${Array.from(chunk).join(', ')}`);
        pos += chunk.length;
      }
    };
    for (const r of relocs) {
      flushBytes(r.offset);
      const name = typeof r.label === 'string' ? r.label : r.label.asmName;
      if (typeof r.label !== 'string') this.referenced.add(r.label);
      this.ins(`.quad ${name}${r.addend ? (r.addend > 0n ? `+${r.addend}` : `${r.addend}`) : ''}`);
      pos = r.offset + 8;
    }
    flushBytes(size);
  }

  generate(globals) {
    for (const g of globals) {
      if (g.isFunction) { if (g.isDefinition) this.genFunction(g); continue; }
      if (g.isDefinition) this.genData(g);
    }
    return this.lines;
  }
}
