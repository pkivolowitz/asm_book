// C parser: tokens -> typed AST. Modeled on the structure of chibicc
// (Rui Ueyama's small C compiler), rewritten for this project.

import { CError } from './lexer.js';
import {
  T, isInteger, isFlonum, isNumeric, isPtrLike, isScalar, pointerTo, arrayOf, funcType, enumType, structType,
  sameType, typeName, promote, commonType,
} from './types.js';

let uniq = 0;
const uid = () => ++uniq;

// ---------------------------------------------------------------------------
// node helpers (every node gets its type at construction)
// ---------------------------------------------------------------------------

function decay(t) {
  if (t.kind === 'array') return pointerTo(t.base);
  if (t.kind === 'func') return pointerTo(t);
  return t;
}

export class Parser {
  constructor(tokens, { fileName, warnings }) {
    this.toks = tokens;
    this.p = 0;
    this.fileName = fileName;
    this.warnings = warnings;
    this.scopes = [{ vars: new Map(), tags: new Map() }];
    this.globals = [];       // all global objects (vars + functions + string literals)
    this.globalMap = new Map();
    this.fn = null;          // function being parsed
    this.brk = null; this.cont = null; this.sw = null;
    this.gotoLabels = null;
  }

  // ---------------- token helpers ----------------
  get tok() { return this.toks[this.p]; }
  peek(n = 1) { return this.toks[this.p + n]; }
  is(s) { const t = this.tok; return (t.k === 'p' || t.k === 'kw') && t.s === s; }
  isAt(t, s) { return (t.k === 'p' || t.k === 'kw') && t.s === s; }
  next() { return this.toks[this.p++]; }
  consume(s) { if (this.is(s)) { this.p++; return true; } return false; }
  expect(s, what) {
    if (!this.is(s)) throw new CError(`expected '${s}'${what ? ` ${what}` : ''}${this.tok.k === 'eof' ? ' before end of file' : ` before '${this.tok.s}'`}`, this.tok);
    return this.next();
  }
  err(msg, tok = this.tok) { return new CError(msg, tok); }
  warn(msg, tok) { this.warnings.push({ file: tok?.file, line: tok?.line, col: tok?.col, message: msg }); }

  // ---------------- scopes ----------------
  enterScope() { this.scopes.push({ vars: new Map(), tags: new Map() }); }
  leaveScope() { this.scopes.pop(); }
  findVar(name) { for (let i = this.scopes.length - 1; i >= 0; i--) { const v = this.scopes[i].vars.get(name); if (v) return v; } return null; }
  findTag(name) { for (let i = this.scopes.length - 1; i >= 0; i--) { const v = this.scopes[i].tags.get(name); if (v) return v; } return null; }
  pushVar(name, entry) { this.scopes[this.scopes.length - 1].vars.set(name, entry); return entry; }

  newLocal(name, ty, tok) {
    if (ty.kind === 'void') throw this.err(`variable '${name}' has incomplete type 'void'`, tok);
    const obj = { name, ty, isLocal: true, offset: 0, tok };
    this.fn.locals.push(obj);
    if (name) this.pushVar(name, { obj });
    return obj;
  }

  newGlobal(name, ty, { isStatic = false, isDefinition = true, tok, asmName } = {}) {
    const obj = { name, ty, isLocal: false, isStatic, isDefinition, tok, asmName: asmName || name, initData: null, relocs: [] };
    this.globals.push(obj);
    return obj;
  }

  newStringLiteral(bytes, tok) {
    const ty = arrayOf(T.char, bytes.length + 1);
    const obj = this.newGlobal(null, ty, { isStatic: true, tok, asmName: `.L.str.${uid()}` });
    obj.initData = Uint8Array.from([...bytes, 0]);
    obj.isRodata = true;
    obj.isLiteral = true;
    return obj;
  }

  // ---------------- node constructors ----------------
  num(v, tok, ty = T.int) { return { kind: 'num', val: BigInt(v), ty, tok }; }
  fnum(v, tok, ty = T.double) { return { kind: 'num', fval: v, ty, tok }; }
  varNode(obj, tok) { return { kind: 'var', obj, ty: obj.ty, tok }; }

  cast(node, ty, tok = node.tok) {
    if (sameType(node.ty, ty) && node.ty.kind !== 'array') return node;
    return { kind: 'cast', lhs: node, ty, tok };
  }

  checkScalar(n, what) {
    if (n.ty.kind === 'struct' || n.ty.kind === 'union') throw this.err(`invalid operands to ${what} (have '${typeName(n.ty)}')`, n.tok);
    if (n.ty.kind === 'void') throw this.err(`void value not ignored as it ought to be`, n.tok);
  }

  // binary arithmetic with usual conversions
  arith(kind, lhs, rhs, tok) {
    this.checkScalar(lhs, `binary ${tok.s}`); this.checkScalar(rhs, `binary ${tok.s}`);
    if (!isNumeric(lhs.ty) || !isNumeric(rhs.ty)) throw this.err(`invalid operands to binary ${tok.s} (have '${typeName(lhs.ty)}' and '${typeName(rhs.ty)}')`, tok);
    if ((kind === 'mod' || kind === 'band' || kind === 'bor' || kind === 'bxor') && (isFlonum(lhs.ty) || isFlonum(rhs.ty))) {
      throw this.err(`invalid operands to binary ${tok.s} (have '${typeName(lhs.ty)}' and '${typeName(rhs.ty)}')`, tok);
    }
    const ty = commonType(lhs.ty, rhs.ty);
    return { kind, lhs: this.cast(lhs, ty), rhs: this.cast(rhs, ty), ty, tok };
  }

  compare(kind, lhs, rhs, tok) {
    this.checkScalar(lhs, `binary ${tok.s}`); this.checkScalar(rhs, `binary ${tok.s}`);
    if (isNumeric(lhs.ty) && isNumeric(rhs.ty)) {
      const ty = commonType(lhs.ty, rhs.ty);
      if (isInteger(lhs.ty) && isInteger(rhs.ty) && promote(lhs.ty).unsigned !== promote(rhs.ty).unsigned && ty.unsigned && kind !== 'eq' && kind !== 'ne') {
        const neg = (n) => n.kind === 'num' && n.val < 0n;
        if (neg(lhs) || neg(rhs)) this.warn(`comparison of a negative constant with an unsigned value is always ${kind === 'lt' || kind === 'le' ? 'true/false' : 'surprising'}: the constant is converted to unsigned`, tok);
      }
      return { kind, lhs: this.cast(lhs, ty), rhs: this.cast(rhs, ty), ty: T.int, cmpTy: ty, tok };
    }
    // pointers (or pointer vs 0)
    const l = decay(lhs.ty); const r = decay(rhs.ty);
    if (l.kind === 'ptr' && r.kind !== 'ptr' && !(rhs.kind === 'num' && rhs.val === 0n)) this.warn(`comparison between pointer and integer ('${typeName(l)}' and '${typeName(rhs.ty)}')`, tok);
    if (r.kind === 'ptr' && l.kind !== 'ptr' && !(lhs.kind === 'num' && lhs.val === 0n)) this.warn(`comparison between pointer and integer ('${typeName(lhs.ty)}' and '${typeName(r)}')`, tok);
    return { kind, lhs: this.cast(lhs, T.ulong), rhs: this.cast(rhs, T.ulong), ty: T.int, cmpTy: T.ulong, tok };
  }

  add(lhs, rhs, tok) {
    this.checkScalar(lhs, 'binary +'); this.checkScalar(rhs, 'binary +');
    if (isNumeric(lhs.ty) && isNumeric(rhs.ty)) return this.arith('add', lhs, rhs, tok);
    if (isPtrLike(lhs.ty) && isPtrLike(rhs.ty)) throw this.err(`invalid operands to binary + (have '${typeName(lhs.ty)}' and '${typeName(rhs.ty)}')`, tok);
    if (!isPtrLike(lhs.ty) && lhs.ty.kind !== 'func') [lhs, rhs] = [rhs, lhs];
    const pty = decay(lhs.ty);
    if (!isInteger(rhs.ty)) throw this.err(`invalid operands to binary + (have '${typeName(lhs.ty)}' and '${typeName(rhs.ty)}')`, tok);
    const size = this.elemSize(pty, tok);
    const off = { kind: 'mul', lhs: this.cast(rhs, T.long), rhs: this.num(size, tok, T.long), ty: T.long, tok };
    return { kind: 'add', lhs: this.cast(lhs, pty), rhs: off, ty: pty, tok, ptrArith: true };
  }

  sub(lhs, rhs, tok) {
    this.checkScalar(lhs, 'binary -'); this.checkScalar(rhs, 'binary -');
    if (isNumeric(lhs.ty) && isNumeric(rhs.ty)) return this.arith('sub', lhs, rhs, tok);
    if (isPtrLike(lhs.ty) && isInteger(rhs.ty)) {
      const pty = decay(lhs.ty); const size = this.elemSize(pty, tok);
      const off = { kind: 'mul', lhs: this.cast(rhs, T.long), rhs: this.num(size, tok, T.long), ty: T.long, tok };
      return { kind: 'sub', lhs: this.cast(lhs, pty), rhs: off, ty: pty, tok, ptrArith: true };
    }
    if (isPtrLike(lhs.ty) && isPtrLike(rhs.ty)) {
      const lt = decay(lhs.ty); const rt = decay(rhs.ty);
      if (!sameType(lt.base, rt.base) && lt.base.kind !== 'void' && rt.base.kind !== 'void') this.warn(`subtracting pointers to different types ('${typeName(lt)}' and '${typeName(rt)}')`, tok);
      const size = this.elemSize(lt, tok);
      const diff = { kind: 'sub', lhs: this.cast(lhs, T.long), rhs: this.cast(rhs, T.long), ty: T.long, tok };
      return { kind: 'div', lhs: diff, rhs: this.num(size, tok, T.long), ty: T.long, tok };
    }
    throw this.err(`invalid operands to binary - (have '${typeName(lhs.ty)}' and '${typeName(rhs.ty)}')`, tok);
  }

  elemSize(pty, tok) {
    const b = pty.base;
    if (b.kind === 'void') return 1; // GNU extension: void* arithmetic as char*
    if (b.kind === 'func') return 1;
    if ((b.kind === 'struct' || b.kind === 'union') && !b.complete) throw this.err(`arithmetic on a pointer to an incomplete type '${typeName(b)}'`, tok);
    return b.size;
  }

  deref(n, tok) {
    const t = n.ty;
    if (t.kind === 'func') return n;
    if (!isPtrLike(t)) throw this.err(`indirection requires pointer operand ('${typeName(t)}' invalid)`, tok);
    if (t.base.kind === 'void') throw this.err(`dereferencing a 'void *' pointer (cast it to a real type first)`, tok);
    return { kind: 'deref', lhs: n, ty: t.base, tok };
  }

  addr(n, tok) {
    if (n.kind === 'member' && n.mem.bitfield) throw this.err('cannot take the address of a bit-field', tok);
    if (!['var', 'deref', 'member', 'comma'].includes(n.kind) && n.ty.kind !== 'func') throw this.err('cannot take the address of an rvalue', tok);
    if (n.kind === 'var' && n.obj.isRegister) throw this.err(`address of register variable '${n.obj.name}' requested`, tok);
    if (n.ty.kind === 'array') return { kind: 'addr', lhs: n, ty: pointerTo(n.ty), tok };
    return { kind: 'addr', lhs: n, ty: pointerTo(n.ty), tok };
  }

  isLvalue(n) { return ['var', 'deref', 'member'].includes(n.kind); }

  assign(lhs, rhs, tok) {
    if (!this.isLvalue(lhs)) throw this.err('expression is not assignable', tok);
    if (lhs.ty.kind === 'array') throw this.err(`array type '${typeName(lhs.ty)}' is not assignable (copy elements, or use memcpy/strcpy)`, tok);
    if (lhs.ty.isConst) throw this.err(`cannot assign to ${lhs.kind === 'var' ? `variable '${lhs.obj.name}'` : 'a location'} with const-qualified type '${typeName(lhs.ty)}'`, tok);
    if (lhs.kind === 'var' && lhs.obj.isLiteral) throw this.err('cannot assign to a string literal', tok);
    this.checkAssignable(lhs.ty, rhs, tok, 'assigning to');
    const r = (lhs.ty.kind === 'struct' || lhs.ty.kind === 'union') ? rhs : this.cast(rhs, lhs.ty);
    return { kind: 'assign', lhs, rhs: r, ty: lhs.ty, tok };
  }

  // Diagnostics for implicit conversions in assignment / argument passing / return.
  checkAssignable(to, rhs, tok, ctx) {
    const from = rhs.ty;
    if (to.kind === 'struct' || to.kind === 'union') {
      if ((from.origin || from) !== (to.origin || to) && !sameType(from, to)) throw this.err(`${ctx} '${typeName(to)}' from incompatible type '${typeName(from)}'`, tok);
      return;
    }
    if (from.kind === 'struct' || from.kind === 'union') throw this.err(`${ctx} '${typeName(to)}' from incompatible type '${typeName(from)}'`, tok);
    if (from.kind === 'void') throw this.err('void value not ignored as it ought to be', tok);
    const fd = decay(from);
    if (to.kind === 'ptr') {
      if (fd.kind === 'ptr') {
        const a = to.base; const b = fd.base;
        if (a.kind !== 'void' && b.kind !== 'void' && !sameType(a, b) && !(isInteger(a) && isInteger(b) && a.size === b.size && a.size === 1)) {
          this.warn(`incompatible pointer types ${ctx} '${typeName(to)}' from '${typeName(fd)}'`, tok);
        } else if (b.isConst && !a.isConst) {
          this.warn(`${ctx} '${typeName(to)}' from '${typeName(fd)}' discards const qualifier`, tok);
        }
      } else if (isInteger(fd) && !(rhs.kind === 'num' && rhs.val === 0n) && !(rhs.kind === 'cast' && rhs.lhs.kind === 'num' && rhs.lhs.val === 0n)) {
        this.warn(`incompatible integer to pointer conversion ${ctx} '${typeName(to)}' from '${typeName(from)}'`, tok);
      } else if (isFlonum(fd)) throw this.err(`${ctx} '${typeName(to)}' from incompatible type '${typeName(from)}'`, tok);
    } else if (isInteger(to) && fd.kind === 'ptr' && to.kind !== 'bool') {
      this.warn(`incompatible pointer to integer conversion ${ctx} '${typeName(to)}' from '${typeName(fd)}'`, tok);
    } else if (isFlonum(to) && fd.kind === 'ptr') {
      throw this.err(`${ctx} '${typeName(to)}' from incompatible type '${typeName(fd)}'`, tok);
    } else if (isInteger(to) && rhs.kind === 'num' && rhs.val !== undefined && to.size < 8 && to.kind !== 'bool') {
      const bits = BigInt(to.size * 8);
      const min = to.unsigned ? 0n : -(1n << (bits - 1n)); const max = to.unsigned ? (1n << bits) - 1n : (1n << (bits - 1n)) - 1n;
      if (rhs.val < min || rhs.val > max) this.warn(`implicit conversion from '${typeName(from)}' to '${typeName(to)}' changes value from ${rhs.val} to ${BigInt.asIntN(Number(bits), rhs.val) === rhs.val ? rhs.val : (to.unsigned ? BigInt.asUintN(Number(bits), rhs.val) : BigInt.asIntN(Number(bits), rhs.val))}`, tok);
    }
  }

  // x op= y   ->   ({ T *tmp = &x; *tmp = *tmp op y; })
  compoundAssign(kind, lhs, rhs, tok) {
    if (!this.isLvalue(lhs)) throw this.err('expression is not assignable', tok);
    const tmp = this.newLocal(null, pointerTo(lhs.ty), tok);
    const set = { kind: 'assign', lhs: this.varNode(tmp, tok), rhs: this.addr(lhs, tok), ty: tmp.ty, tok };
    const cur = this.deref(this.varNode(tmp, tok), tok);
    let val;
    const opTok = { ...tok, s: tok.s.slice(0, -1) };
    if (kind === 'add') val = this.add(cur, rhs, opTok);
    else if (kind === 'sub') val = this.sub(cur, rhs, opTok);
    else if (kind === 'shl' || kind === 'shr') val = this.shift(kind, cur, rhs, opTok);
    else val = this.arith(kind, cur, rhs, opTok);
    const asg = this.assign(this.deref(this.varNode(tmp, tok), tok), val, tok);
    return { kind: 'comma', lhs: set, rhs: asg, ty: asg.ty, tok };
  }

  shift(kind, lhs, rhs, tok) {
    if (!isInteger(lhs.ty) || !isInteger(rhs.ty)) throw this.err(`invalid operands to binary ${tok.s} (have '${typeName(lhs.ty)}' and '${typeName(rhs.ty)}')`, tok);
    const ty = promote(lhs.ty);
    if (rhs.kind === 'num' && (rhs.val < 0n || rhs.val >= BigInt(ty.size * 8))) this.warn(`shift count ${rhs.val < 0n ? 'is negative' : `>= width of type (${ty.size * 8})`}: undefined behavior`, tok);
    return { kind, lhs: this.cast(lhs, ty), rhs: this.cast(rhs, T.long), ty, tok };
  }

  // x++  ->  (x += 1) - 1   (with the right type)
  incdec(n, delta, post, tok) {
    if (!isScalar(n.ty) && n.ty.kind !== 'array') throw this.err(`cannot increment value of type '${typeName(n.ty)}'`, tok);
    const one = this.num(1, tok);
    const pre = this.compoundAssign(delta > 0 ? 'add' : 'sub', n, one, { ...tok, s: delta > 0 ? '+=' : '-=' });
    if (!post) return pre;
    const back = delta > 0 ? this.sub(pre, this.num(1, tok), tok) : this.add(pre, this.num(1, tok), tok);
    const res = this.cast(back, n.ty);
    // when the value is discarded (x++; or the increment of a for loop) use the simpler pre form
    return { ...res, discardable: pre };
  }

  // ======================================================================
  // declarations
  // ======================================================================

  isTypename(t = this.tok) {
    if (t.k === 'kw') {
      return ['void', '_Bool', 'char', 'short', 'int', 'long', 'float', 'double', 'struct', 'union', 'enum', 'typedef', 'static',
        'extern', 'signed', 'unsigned', 'const', 'volatile', 'auto', 'register', 'restrict', '__restrict', 'inline', '__inline',
        '_Noreturn', '_Alignas', '__attribute__', '__const', '_Thread_local', 'typeof', '__typeof__'].includes(t.s);
    }
    if (t.k === 'id') { const v = this.findVar(t.s); return !!(v && v.typedef); }
    return false;
  }

  skipAttribute() {
    while (this.is('__attribute__')) {
      this.next(); this.expect('('); this.expect('(');
      let depth = 2;
      while (depth > 0) { const t = this.next(); if (t.k === 'eof') throw this.err('unterminated __attribute__', t); if (t.s === '(') depth++; if (t.s === ')') depth--; }
    }
  }

  declspec(attr) {
    // Counting technique for type specifier combinations.
    const VOID = 1 << 0, BOOL = 1 << 2, CHAR = 1 << 4, SHORT = 1 << 6, INT = 1 << 8, LONG = 1 << 10, FLOAT = 1 << 12, DOUBLE = 1 << 14, OTHER = 1 << 16, SIGNED = 1 << 17, UNSIGNED = 1 << 18;
    let ty = T.int; let counter = 0; let isConst = false;
    const start = this.tok;
    while (this.isTypename()) {
      const t = this.tok;
      if (['typedef', 'static', 'extern', 'inline', '__inline', '_Thread_local'].includes(t.s) && t.k === 'kw') {
        if (!attr) throw this.err(`storage class specifier '${t.s}' is not allowed here`, t);
        if (t.s === 'typedef') attr.isTypedef = true;
        else if (t.s === 'static') attr.isStatic = true;
        else if (t.s === 'extern') attr.isExtern = true;
        else attr.isInline = true;
        if ((attr.isTypedef ? 1 : 0) + (attr.isStatic ? 1 : 0) + (attr.isExtern ? 1 : 0) > 1) throw this.err('cannot combine typedef, static and extern', t);
        this.next(); continue;
      }
      if (t.k === 'kw' && ['volatile', 'auto', 'restrict', '__restrict', '_Noreturn'].includes(t.s)) { this.next(); continue; }
      if (t.k === 'kw' && t.s === 'register') { if (attr) attr.isRegister = true; this.next(); continue; }
      if (t.k === 'kw' && (t.s === 'const' || t.s === '__const')) { isConst = true; this.next(); continue; }
      if (t.s === '__attribute__') { this.skipAttribute(); continue; }
      if (t.s === '_Alignas') { this.next(); this.expect('('); if (this.isTypename()) this.typename(); else this.constExpr(); this.expect(')'); continue; }
      const v = t.k === 'id' ? this.findVar(t.s) : null;
      if (t.s === 'struct' || t.s === 'union' || t.s === 'enum' || t.s === 'typeof' || t.s === '__typeof__' || (v && v.typedef)) {
        if (counter) break;
        if (t.s === 'struct' || t.s === 'union') { this.next(); ty = this.structUnionDecl(t.s); }
        else if (t.s === 'enum') { this.next(); ty = this.enumSpecifier(); }
        else if (t.s === 'typeof' || t.s === '__typeof__') {
          this.next(); this.expect('(');
          ty = this.isTypename() ? this.typename() : this.expr().ty;
          this.expect(')');
        } else { ty = v.typedef; this.next(); }
        counter += OTHER;
        continue;
      }
      switch (t.s) {
        case 'void': counter += VOID; break; case '_Bool': counter += BOOL; break; case 'char': counter += CHAR; break;
        case 'short': counter += SHORT; break; case 'int': counter += INT; break; case 'long': counter += LONG; break;
        case 'float': counter += FLOAT; break; case 'double': counter += DOUBLE; break;
        case 'signed': counter |= SIGNED; break; case 'unsigned': counter |= UNSIGNED; break;
        default: throw this.err(`unexpected '${t.s}'`, t);
      }
      this.next();
      switch (counter) {
        case VOID: ty = T.void; break;
        case BOOL: ty = T.bool; break;
        case CHAR: ty = T.char; break;
        case SIGNED + CHAR: ty = T.schar; break;
        case UNSIGNED + CHAR: ty = T.uchar; break;
        case SHORT: case SHORT + INT: case SIGNED + SHORT: case SIGNED + SHORT + INT: ty = T.short; break;
        case UNSIGNED + SHORT: case UNSIGNED + SHORT + INT: ty = T.ushort; break;
        case INT: case SIGNED: case SIGNED + INT: ty = T.int; break;
        case UNSIGNED: case UNSIGNED + INT: ty = T.uint; break;
        case LONG: case LONG + INT: case SIGNED + LONG: case SIGNED + LONG + INT: ty = T.long; break;
        case LONG + LONG: case LONG + LONG + INT: case SIGNED + LONG + LONG: case SIGNED + LONG + LONG + INT: ty = T.llong; break;
        case UNSIGNED + LONG: case UNSIGNED + LONG + INT: ty = T.ulong; break;
        case UNSIGNED + LONG + LONG: case UNSIGNED + LONG + LONG + INT: ty = T.ullong; break;
        case FLOAT: ty = T.float; break;
        case DOUBLE: case LONG + DOUBLE: ty = T.double; break;
        default: throw this.err('invalid combination of type specifiers', t);
      }
    }
    if (this.tok === start && !counter) {
      throw this.err(this.tok.k === 'id' ? `unknown type name '${this.tok.s}'` : `expected a type before '${this.tok.s}'`, this.tok);
    }
    return isConst ? { ...ty, isConst: true, origin: ty.origin || ty } : ty;
  }

  pointers(ty) {
    while (this.consume('*')) {
      ty = pointerTo(ty);
      for (;;) {
        if (this.is('const') || this.is('__const')) { this.next(); ty = { ...ty, isConst: true }; continue; }
        if (this.is('volatile') || this.is('restrict') || this.is('__restrict')) { this.next(); continue; }
        if (this.is('__attribute__')) { this.skipAttribute(); continue; }
        break;
      }
    }
    return ty;
  }

  // declarator = pointers ("(" declarator ")" | ident) type-suffix
  declarator(ty) {
    ty = this.pointers(ty);
    if (this.is('(') && !this.isTypename(this.peek()) && !this.isAt(this.peek(), ')')) {
      // nested declarator: parse the outer suffix first using a placeholder
      const start = this.p;
      this.next();
      const dummy = { kind: 'placeholder' };
      this.declarator(dummy);
      this.expect(')');
      ty = this.typeSuffix(ty);
      const end = this.p;
      this.p = start + 1;
      const inner = this.declarator(ty);
      this.p = end;
      return inner;
    }
    let nameTok = null;
    if (this.tok.k === 'id') nameTok = this.next();
    this.skipAttribute();
    ty = this.typeSuffix(ty);
    this.skipAttribute();
    return { ty, name: nameTok?.s ?? null, tok: nameTok || this.tok };
  }

  abstractDeclarator(ty) {
    const d = this.declarator(ty);
    if (d.name) throw this.err(`unexpected identifier '${d.name}' in type name`, d.tok);
    return d.ty;
  }

  typename() {
    const ty = this.declspec(null);
    return this.abstractDeclarator(ty);
  }

  typeSuffix(ty) {
    if (this.is('(')) { this.next(); return this.funcParams(ty); }
    if (this.is('[')) {
      const t = this.next();
      while (this.is('static') || this.is('const') || this.is('restrict')) this.next();
      if (this.consume(']')) {
        const inner = this.typeSuffix(ty);
        return arrayOf(inner, -1);
      }
      const lenNode = this.conditional();
      if (!this.isConstExpr(lenNode)) throw this.err('variable-length arrays are not supported by this compiler; use a constant size or malloc', t);
      const len = Number(this.evalConst(lenNode));
      if (len < 0) throw this.err(`array has negative size ${len}`, t);
      this.expect(']');
      const inner = this.typeSuffix(ty);
      if (inner.kind === 'func') throw this.err('array of functions is not allowed', t);
      if ((inner.kind === 'struct' || inner.kind === 'union') && !inner.complete) throw this.err(`array has incomplete element type '${typeName(inner)}'`, t);
      return arrayOf(inner, len);
    }
    return ty;
  }

  funcParams(ret) {
    const tok = this.tok;
    if (this.is('void') && this.isAt(this.peek(), ')')) { this.next(); this.next(); return funcType(ret, [], false); }
    if (this.consume(')')) return { ...funcType(ret, [], false, false), paramNames: [], paramToks: [] };
    const params = []; const names = []; const toks = []; let variadic = false;
    for (;;) {
      if (this.consume('...')) { variadic = true; this.expect(')'); break; }
      let pty = this.declspec(null);
      const d = this.declarator(pty);
      pty = d.ty;
      if (pty.kind === 'array') pty = pointerTo(pty.base);
      else if (pty.kind === 'func') pty = pointerTo(pty);
      if (pty.kind === 'void') throw this.err("'void' must be the only parameter", d.tok);
      params.push(pty); names.push(d.name); toks.push(d.tok);
      if (this.consume(')')) break;
      this.expect(',', 'between parameters');
    }
    void tok;
    return { ...funcType(ret, params, variadic), paramNames: names, paramToks: toks };
  }

  structUnionDecl(kind) {
    this.skipAttribute();
    let tagTok = null;
    if (this.tok.k === 'id') tagTok = this.next();
    if (tagTok && !this.is('{')) {
      const existing = this.findTag(tagTok.s);
      if (existing) {
        if (existing.kind !== kind) throw this.err(`use of '${tagTok.s}' with tag type that does not match previous declaration`, tagTok);
        return existing;
      }
      const ty = structType(kind); ty.tag = tagTok.s;
      this.scopes[this.scopes.length - 1].tags.set(tagTok.s, ty);
      return ty;
    }
    this.expect('{');
    let ty;
    if (tagTok) {
      const cur = this.scopes[this.scopes.length - 1].tags.get(tagTok.s);
      if (cur && cur.kind === kind && !cur.complete) ty = cur;
      else if (cur && cur.complete) throw this.err(`redefinition of '${kind} ${tagTok.s}'`, tagTok);
      else { ty = structType(kind); ty.tag = tagTok.s; this.scopes[this.scopes.length - 1].tags.set(tagTok.s, ty); }
    } else ty = structType(kind);
    const members = [];
    while (!this.consume('}')) {
      const base = this.declspec(null);
      if (this.consume(';')) { // anonymous struct/union member
        if (base.kind === 'struct' || base.kind === 'union') members.push({ name: null, ty: base, tok: this.tok });
        continue;
      }
      for (let first = true; !this.consume(';'); first = false) {
        if (!first) this.expect(',');
        const d = this.declarator(base);
        if (this.consume(':')) throw this.err('bit-fields are not supported by this compiler yet; use masks and shifts', this.tok);
        if (d.ty.kind === 'func') throw this.err(`field '${d.name}' declared as a function`, d.tok);
        if ((d.ty.kind === 'struct' || d.ty.kind === 'union') && !d.ty.complete) throw this.err(`field '${d.name}' has incomplete type '${typeName(d.ty)}'`, d.tok);
        members.push({ name: d.name, ty: d.ty, tok: d.tok });
      }
    }
    this.skipAttribute();
    // layout
    let offset = 0; let align = 1;
    for (const m of members) {
      if (m.ty.kind === 'array' && m.ty.len < 0) { m.ty = arrayOf(m.ty.base, 0); m.flexible = true; }
      if (kind === 'struct') { offset = Math.ceil(offset / m.ty.align) * m.ty.align; m.offset = offset; offset += m.ty.size; }
      else { m.offset = 0; offset = Math.max(offset, m.ty.size); }
      align = Math.max(align, m.ty.align);
    }
    ty.members = members;
    ty.size = Math.ceil(offset / align) * align;
    ty.align = align;
    ty.complete = true;
    return ty;
  }

  findMember(ty, name) {
    for (const m of ty.members) {
      if (m.name === name) return { mem: m, offset: m.offset };
      if (!m.name && (m.ty.kind === 'struct' || m.ty.kind === 'union')) {
        const r = this.findMember(m.ty, name);
        if (r) return { mem: r.mem, offset: m.offset + r.offset, via: m };
      }
    }
    return null;
  }

  enumSpecifier() {
    let tagTok = null;
    if (this.tok.k === 'id') tagTok = this.next();
    if (tagTok && !this.is('{')) {
      const t = this.findTag(tagTok.s);
      if (!t) { const e = enumType(); e.tag = tagTok.s; return e; }
      if (t.kind !== 'enum') throw this.err(`'${tagTok.s}' is not an enum`, tagTok);
      return t;
    }
    this.expect('{');
    const ty = enumType(); ty.tag = tagTok?.s || null;
    let val = 0n;
    while (!this.consume('}')) {
      const nameTok = this.next();
      if (nameTok.k !== 'id') throw this.err('expected an enumerator name', nameTok);
      if (this.consume('=')) val = this.evalConst(this.assignExpr());
      this.pushVar(nameTok.s, { enumVal: val, enumTy: ty });
      val += 1n;
      if (this.consume('}')) break;
      this.expect(',');
    }
    if (tagTok) this.scopes[this.scopes.length - 1].tags.set(tagTok.s, ty);
    return ty;
  }

  // ======================================================================
  // top level
  // ======================================================================

  parse() {
    while (this.tok.k !== 'eof') {
      if (this.consume(';')) continue;
      if (this.is('_Static_assert')) { this.staticAssert(); continue; }
      const attr = {};
      const base = this.declspec(attr);
      if (attr.isTypedef) { this.typedefDecl(base); continue; }
      if (this.consume(';')) continue; // struct declaration only
      const d = this.declarator(base);
      if (d.ty.kind === 'func') {
        if (this.is('{')) { this.funcDef(d, attr); continue; }
        this.funcDecl(d, attr);
        if (this.consume(';')) continue;
        this.expect(',');
        this.globalVars(base, attr);
        continue;
      }
      this.globalVar(d, attr);
      if (this.consume(';')) continue;
      this.expect(',', 'or \';\' after declaration');
      this.globalVars(base, attr);
    }
    return this.globals;
  }

  staticAssert() {
    const t = this.next(); this.expect('(');
    const v = this.evalConst(this.conditional());
    let msg = '';
    if (this.consume(',')) msg = new TextDecoder().decode(Uint8Array.from(this.next().bytes || []));
    this.expect(')'); this.expect(';');
    if (v === 0n) throw this.err(`static assertion failed${msg ? `: ${msg}` : ''}`, t);
  }

  globalVars(base, attr) {
    for (;;) {
      const d = this.declarator(base);
      if (d.ty.kind === 'func') this.funcDecl(d, attr);
      else this.globalVar(d, attr);
      if (this.consume(';')) return;
      this.expect(',', "or ';' after declaration");
    }
  }

  typedefDecl(base) {
    for (let first = true; !this.consume(';'); first = false) {
      if (!first) this.expect(',');
      const d = this.declarator(base);
      if (!d.name) throw this.err('typedef name omitted', d.tok);
      this.pushVar(d.name, { typedef: d.ty });
    }
  }

  funcDecl(d, attr) {
    if (!d.name) throw this.err('function name omitted', d.tok);
    let obj = this.globalMap.get(d.name);
    if (obj) {
      if (!obj.ty || obj.ty.kind !== 'func') throw this.err(`'${d.name}' redeclared as a different kind of symbol`, d.tok);
      if (!sameType(obj.ty, d.ty) && obj.ty.hasProto && d.ty.hasProto) throw this.err(`conflicting types for '${d.name}' (previously declared as '${typeName(obj.ty)}', now '${typeName(d.ty)}')`, d.tok);
      if (!obj.ty.hasProto) obj.ty = d.ty;
    } else {
      obj = { name: d.name, asmName: d.name, ty: d.ty, isFunction: true, isDefinition: false, isStatic: !!attr.isStatic, tok: d.tok };
      this.globals.push(obj);
      this.globalMap.set(d.name, obj);
    }
    this.scopes[0].vars.set(d.name, { obj });
    return obj;
  }

  globalVar(d, attr) {
    if (!d.name) throw this.err('declaration does not declare anything', d.tok);
    if (d.ty.kind === 'void') throw this.err(`variable '${d.name}' has incomplete type 'void'`, d.tok);
    let obj = this.globalMap.get(d.name);
    const isDef = !attr.isExtern || this.is('=');
    if (obj) {
      if (obj.isFunction) throw this.err(`'${d.name}' redeclared as a different kind of symbol`, d.tok);
      if (!sameType(obj.ty, d.ty)) throw this.err(`conflicting types for '${d.name}'`, d.tok);
      if (obj.ty.kind === 'array' && obj.ty.len < 0) obj.ty = d.ty;
      if (isDef && obj.isDefinition && obj.hasInit && this.is('=')) throw this.err(`redefinition of '${d.name}'`, d.tok);
      obj.isDefinition = obj.isDefinition || isDef;
    } else {
      obj = this.newGlobal(d.name, d.ty, { isStatic: !!attr.isStatic, isDefinition: isDef, tok: d.tok });
      this.globalMap.set(d.name, obj);
    }
    this.scopes[0].vars.set(d.name, { obj });
    if (this.consume('=')) { this.globalInit(obj); obj.hasInit = true; }
    if (obj.ty.isConst && obj.isDefinition) obj.isRodata = true;
  }

  funcDef(d, attr) {
    const obj = this.funcDecl(d, attr);
    if (obj.isDefinition) throw this.err(`redefinition of '${d.name}'`, d.tok);
    obj.isDefinition = true;
    obj.ty = d.ty;
    obj.locals = [];
    obj.paramObjs = [];
    this.fn = obj;
    this.gotoLabels = new Map(); this.gotos = [];
    this.enterScope();
    const ty = d.ty;
    if (ty.ret.kind === 'array') throw this.err('function cannot return array type', d.tok);
    (ty.paramNames || []).forEach((name, i) => {
      if (!name) throw this.err('parameter name omitted in function definition', ty.paramToks[i]);
      obj.paramObjs.push(this.newLocal(name, ty.params[i], ty.paramToks[i]));
    });
    if ((ty.ret.kind === 'struct' || ty.ret.kind === 'union')) obj.retBufPtr = this.newLocal(null, pointerTo(ty.ret), d.tok);
    // __func__
    this.pushVar('__func__', { obj: this.newStringLiteral([...new TextEncoder().encode(d.name)], d.tok) });
    obj.body = this.compoundStmt(true);
    this.leaveScope();
    for (const g of this.gotos) {
      if (!this.gotoLabels.has(g.name)) throw this.err(`use of undeclared label '${g.name}'`, g.tok);
      g.label = this.gotoLabels.get(g.name);
    }
    // warn if a non-void function can fall off the end
    if (ty.ret.kind !== 'void' && d.name !== 'main' && !this.endsWithReturn(obj.body)) {
      this.warn(`non-void function '${d.name}' does not return a value in all control paths`, this.toks[this.p - 1]);
    }
    obj.endTok = this.toks[this.p - 1];
    this.fn = null;
  }

  endsWithReturn(n) {
    if (!n) return false;
    if (n.kind === 'return') return true;
    if (n.kind === 'block') return n.body.length > 0 && this.endsWithReturn(n.body[n.body.length - 1]);
    if (n.kind === 'if') return !!n.els && this.endsWithReturn(n.then) && this.endsWithReturn(n.els);
    if (n.kind === 'expr' && n.expr.kind === 'call' && ['exit', 'abort', '_exit'].includes(n.expr.fnName)) return true;
    if (n.kind === 'for' && !n.cond) return true; // for(;;) / while(1)
    if (n.kind === 'label') return this.endsWithReturn(n.body);
    if (n.kind === 'switch') return !!n.dflt && this.endsWithReturn(n.body) && !this.breaksTo(n.body, n.brk);
    return false;
  }

  breaksTo(n, label) {
    if (!n || typeof n !== 'object') return false;
    if (n.kind === 'goto' && n.label === label) return true;
    for (const k of ['body', 'then', 'els']) {
      const c = n[k];
      if (Array.isArray(c)) { if (c.some(x => this.breaksTo(x, label))) return true; } else if (c && this.breaksTo(c, label)) return true;
    }
    return false;
  }

  // ======================================================================
  // statements
  // ======================================================================

  compoundStmt(isFnBody = false) {
    const tok = this.expect('{');
    if (!isFnBody) this.enterScope();
    const body = [];
    while (!this.is('}')) {
      if (this.tok.k === 'eof') throw this.err("expected '}' at end of block", tok);
      if (this.is('_Static_assert')) { this.staticAssert(); continue; }
      if (this.isTypename() && !this.isAt(this.peek(), ':')) body.push(...this.declaration());
      else body.push(this.stmt());
    }
    this.next();
    if (!isFnBody) this.leaveScope();
    return { kind: 'block', body, tok };
  }

  declaration() {
    const attr = {};
    const base = this.declspec(attr);
    const out = [];
    if (attr.isTypedef) { this.typedefDecl(base); return out; }
    for (let first = true; !this.consume(';'); first = false) {
      if (!first) this.expect(',', "or ';' after declaration");
      const d = this.declarator(base);
      if (!d.name) { if (base.kind === 'struct' || base.kind === 'union' || base.kind === 'enum') { if (this.consume(';')) return out; } throw this.err('declaration does not declare anything', d.tok); }
      if (d.ty.kind === 'func') { this.funcDecl(d, attr); continue; }
      if (attr.isExtern) {
        const g = this.globalMap.get(d.name) || this.newGlobal(d.name, d.ty, { isDefinition: false, tok: d.tok });
        this.globalMap.set(d.name, g);
        this.pushVar(d.name, { obj: g });
        continue;
      }
      if (attr.isStatic) {
        const g = this.newGlobal(d.name, d.ty, { isStatic: true, tok: d.tok, asmName: `${d.name}.${uid()}` });
        this.pushVar(d.name, { obj: g });
        if (this.consume('=')) this.globalInit(g);
        if (g.ty.isConst) g.isRodata = true;
        continue;
      }
      if (d.ty.kind === 'void') throw this.err(`variable '${d.name}' has incomplete type 'void'`, d.tok);
      if ((d.ty.kind === 'struct' || d.ty.kind === 'union') && !d.ty.complete) throw this.err(`variable '${d.name}' has incomplete type '${typeName(d.ty)}'`, d.tok);
      const v = this.newLocal(d.name, d.ty, d.tok);
      if (attr.isRegister) v.isRegister = true;
      if (this.consume('=')) out.push({ kind: 'expr', expr: this.localInit(v, d.tok), tok: d.tok });
      else if (d.ty.kind === 'array' && d.ty.len < 0) throw this.err(`definition of variable '${d.name}' with array type needs an explicit size or an initializer`, d.tok);
    }
    return out;
  }

  stmt() {
    const tok = this.tok;
    if (this.consume('return')) {
      const fnRet = this.fn.ty.ret;
      if (this.consume(';')) {
        if (fnRet.kind !== 'void' && this.fn.name !== 'main') this.warn(`non-void function '${this.fn.name}' should return a value`, tok);
        return { kind: 'return', tok };
      }
      const e = this.expr();
      this.expect(';', 'after return statement');
      if (fnRet.kind === 'void') {
        if (e.ty.kind !== 'void') this.warn(`void function '${this.fn.name}' should not return a value`, tok);
        return { kind: 'block', body: [{ kind: 'expr', expr: e, tok }, { kind: 'return', tok }], tok };
      }
      this.checkAssignable(fnRet, e, tok, 'returning');
      if (decay(e.ty).kind === 'ptr' && e.kind === 'addr' && e.lhs.kind === 'var' && e.lhs.obj.isLocal) this.warn(`address of stack memory associated with local variable '${e.lhs.obj.name}' returned`, tok);
      if (e.kind === 'var' && e.ty.kind === 'array' && e.obj.isLocal) this.warn(`address of stack memory associated with local variable '${e.obj.name}' returned`, tok);
      return { kind: 'return', expr: (fnRet.kind === 'struct' || fnRet.kind === 'union') ? e : this.cast(e, fnRet), tok };
    }
    if (this.consume('if')) {
      this.expect('(', "after 'if'");
      const cond = this.expr(); this.checkCond(cond);
      this.expect(')');
      if (this.is(';') && !this.isAt(this.peek(), 'else')) this.warn("if statement has an empty body; is the ';' a mistake?", this.tok);
      const then = this.stmt();
      const els = this.consume('else') ? this.stmt() : null;
      return { kind: 'if', cond, then, els, tok };
    }
    if (this.consume('switch')) {
      this.expect('(');
      const cond = this.expr();
      if (!isInteger(cond.ty)) throw this.err(`statement requires expression of integer type ('${typeName(cond.ty)}' invalid)`, tok);
      this.expect(')');
      const node = { kind: 'switch', cond: this.cast(cond, promote(cond.ty)), cases: [], dflt: null, brk: `.L.brk.${uid()}`, tok };
      const [sb, ss] = [this.brk, this.sw];
      this.brk = node.brk; this.sw = node;
      node.body = this.stmt();
      this.brk = sb; this.sw = ss;
      return node;
    }
    if (this.is('case')) {
      if (!this.sw) throw this.err("'case' statement not in switch statement", tok);
      this.next();
      const val = this.evalConst(this.conditional());
      this.expect(':', 'after case value');
      const label = `.L.case.${uid()}`;
      if (this.sw.cases.some(c => c.val === val)) throw this.err(`duplicate case value '${val}'`, tok);
      this.sw.cases.push({ val, label });
      return { kind: 'label', label, body: this.stmtOrEmpty(), tok };
    }
    if (this.is('default')) {
      if (!this.sw) throw this.err("'default' statement not in switch statement", tok);
      this.next(); this.expect(':');
      if (this.sw.dflt) throw this.err('multiple default labels in one switch', tok);
      this.sw.dflt = `.L.dflt.${uid()}`;
      return { kind: 'label', label: this.sw.dflt, body: this.stmtOrEmpty(), tok };
    }
    if (this.consume('for')) {
      this.expect('(', "after 'for'");
      this.enterScope();
      const node = { kind: 'for', brk: `.L.brk.${uid()}`, cont: `.L.cont.${uid()}`, tok };
      const [sb, sc] = [this.brk, this.cont];
      this.brk = node.brk; this.cont = node.cont;
      if (this.isTypename()) node.init = { kind: 'block', body: this.declaration(), tok };
      else node.init = this.exprStmt();
      if (!this.is(';')) { node.cond = this.expr(); this.checkCond(node.cond); }
      this.expect(';');
      if (!this.is(')')) { node.inc = this.expr(); if (node.inc.discardable) node.inc = node.inc.discardable; }
      this.expect(')');
      node.body = this.stmt();
      this.leaveScope();
      this.brk = sb; this.cont = sc;
      return node;
    }
    if (this.consume('while')) {
      this.expect('(', "after 'while'");
      const cond = this.expr(); this.checkCond(cond);
      this.expect(')');
      if (this.is(';')) this.warn("while loop has an empty body; is the ';' a mistake?", this.tok);
      const node = { kind: 'for', cond, brk: `.L.brk.${uid()}`, cont: `.L.cont.${uid()}`, tok };
      const [sb, sc] = [this.brk, this.cont];
      this.brk = node.brk; this.cont = node.cont;
      node.body = this.stmt();
      this.brk = sb; this.cont = sc;
      return node;
    }
    if (this.consume('do')) {
      const node = { kind: 'do', brk: `.L.brk.${uid()}`, cont: `.L.cont.${uid()}`, tok };
      const [sb, sc] = [this.brk, this.cont];
      this.brk = node.brk; this.cont = node.cont;
      node.body = this.stmt();
      this.brk = sb; this.cont = sc;
      this.expect('while', "in do/while loop");
      this.expect('(');
      node.cond = this.expr(); this.checkCond(node.cond);
      this.expect(')'); this.expect(';', 'after do/while statement');
      return node;
    }
    if (this.consume('goto')) {
      const nameTok = this.next();
      if (nameTok.k !== 'id') throw this.err('expected a label name after goto', nameTok);
      this.expect(';');
      const g = { kind: 'goto', name: nameTok.s, tok };
      this.gotos.push(g);
      return g;
    }
    if (this.consume('break')) {
      if (!this.brk) throw this.err("'break' statement not in loop or switch statement", tok);
      this.expect(';');
      return { kind: 'goto', label: this.brk, tok };
    }
    if (this.consume('continue')) {
      if (!this.cont) throw this.err("'continue' statement not in loop statement", tok);
      this.expect(';');
      return { kind: 'goto', label: this.cont, tok };
    }
    if (this.tok.k === 'id' && this.isAt(this.peek(), ':')) {
      const name = this.next().s; this.next();
      if (this.gotoLabels.has(name)) throw this.err(`redefinition of label '${name}'`, tok);
      const label = `.L.label.${name}.${uid()}`;
      this.gotoLabels.set(name, label);
      return { kind: 'label', label, body: this.stmtOrEmpty(), tok };
    }
    if (this.is('{')) return this.compoundStmt();
    return this.exprStmt();
  }

  stmtOrEmpty() { return this.is('}') ? { kind: 'block', body: [], tok: this.tok } : this.stmt(); }

  checkCond(n) {
    if (n.ty.kind === 'struct' || n.ty.kind === 'union' || n.ty.kind === 'void') throw this.err(`statement requires expression of scalar type ('${typeName(n.ty)}' invalid)`, n.tok);
    if (n.kind === 'assign' && !n.parenthesized) this.warn(`using the result of an assignment as a condition without parentheses; did you mean '=='?`, n.tok);
  }

  exprStmt() {
    const tok = this.tok;
    if (this.consume(';')) return { kind: 'block', body: [], tok };
    let e = this.expr();
    this.expect(';', 'after expression');
    if (e.discardable) e = e.discardable;
    else if (['eq', 'ne', 'lt', 'le', 'add', 'sub', 'mul'].includes(e.kind) && !e.ptrArith) this.warn('expression result unused', e.tok);
    return { kind: 'expr', expr: e, tok };
  }

  // ======================================================================
  // expressions
  // ======================================================================

  expr() {
    let n = this.assignExpr();
    while (this.is(',')) {
      const tok = this.next();
      const r = this.assignExpr();
      n = { kind: 'comma', lhs: n, rhs: r, ty: r.ty, tok };
    }
    return n;
  }

  assignExpr() {
    const lhs = this.conditional();
    const tok = this.tok;
    const ops = { '=': null, '+=': 'add', '-=': 'sub', '*=': 'mul', '/=': 'div', '%=': 'mod', '&=': 'band', '|=': 'bor', '^=': 'bxor', '<<=': 'shl', '>>=': 'shr' };
    if (tok.k === 'p' && tok.s in ops) {
      this.next();
      const rhs = this.assignExpr();
      if (tok.s === '=') return this.assign(lhs, rhs, tok);
      return this.compoundAssign(ops[tok.s], lhs, rhs, tok);
    }
    return lhs;
  }

  conditional() {
    const cond = this.logor();
    if (!this.is('?')) return cond;
    const tok = this.next();
    this.checkScalar(cond, '?:');
    const then = this.expr();
    this.expect(':', 'in conditional expression');
    const els = this.conditional();
    let ty;
    if (then.ty.kind === 'void' || els.ty.kind === 'void') ty = T.void;
    else if (isNumeric(then.ty) && isNumeric(els.ty)) ty = commonType(then.ty, els.ty);
    else if (then.ty.kind === 'struct' || then.ty.kind === 'union') ty = then.ty;
    else if (isPtrLike(then.ty) || then.ty.kind === 'func') ty = decay(then.ty);
    else ty = decay(els.ty);
    const conv = (n) => (ty.kind === 'void' || ty.kind === 'struct' || ty.kind === 'union' ? n : this.cast(n, ty));
    return { kind: 'cond', cond, then: conv(then), els: conv(els), ty, tok };
  }

  logor() {
    let n = this.logand();
    while (this.is('||')) { const tok = this.next(); const r = this.logand(); this.checkScalar(n, '||'); this.checkScalar(r, '||'); n = { kind: 'logor', lhs: n, rhs: r, ty: T.int, tok }; }
    return n;
  }
  logand() {
    let n = this.bitor();
    while (this.is('&&')) { const tok = this.next(); const r = this.bitor(); this.checkScalar(n, '&&'); this.checkScalar(r, '&&'); n = { kind: 'logand', lhs: n, rhs: r, ty: T.int, tok }; }
    return n;
  }
  bitor() { let n = this.bitxor(); while (this.is('|')) { const tok = this.next(); n = this.arith('bor', n, this.bitxor(), tok); } return n; }
  bitxor() { let n = this.bitand(); while (this.is('^')) { const tok = this.next(); n = this.arith('bxor', n, this.bitand(), tok); } return n; }
  bitand() { let n = this.equality(); while (this.is('&')) { const tok = this.next(); n = this.arith('band', n, this.equality(), tok); } return n; }
  equality() {
    let n = this.relational();
    for (;;) {
      const tok = this.tok;
      if (this.consume('==')) n = this.compare('eq', n, this.relational(), tok);
      else if (this.consume('!=')) n = this.compare('ne', n, this.relational(), tok);
      else return n;
    }
  }
  relational() {
    let n = this.shiftExpr();
    for (;;) {
      const tok = this.tok;
      if (this.consume('<')) n = this.compare('lt', n, this.shiftExpr(), tok);
      else if (this.consume('<=')) n = this.compare('le', n, this.shiftExpr(), tok);
      else if (this.consume('>')) n = this.compare('lt', this.shiftExpr(), n, tok);
      else if (this.consume('>=')) n = this.compare('le', this.shiftExpr(), n, tok);
      else return n;
    }
  }
  shiftExpr() {
    let n = this.additive();
    for (;;) {
      const tok = this.tok;
      if (this.consume('<<')) n = this.shift('shl', n, this.additive(), tok);
      else if (this.consume('>>')) n = this.shift('shr', n, this.additive(), tok);
      else return n;
    }
  }
  additive() {
    let n = this.multiplicative();
    for (;;) {
      const tok = this.tok;
      if (this.consume('+')) n = this.add(n, this.multiplicative(), tok);
      else if (this.consume('-')) n = this.sub(n, this.multiplicative(), tok);
      else return n;
    }
  }
  multiplicative() {
    let n = this.castExpr();
    for (;;) {
      const tok = this.tok;
      if (this.consume('*')) n = this.arith('mul', n, this.castExpr(), tok);
      else if (this.consume('/')) { const r = this.castExpr(); if (r.kind === 'num' && r.val === 0n) this.warn('division by zero is undefined', tok); n = this.arith('div', n, r, tok); }
      else if (this.consume('%')) { const r = this.castExpr(); if (r.kind === 'num' && r.val === 0n) this.warn('remainder by zero is undefined', tok); n = this.arith('mod', n, r, tok); }
      else return n;
    }
  }

  castExpr() {
    if (this.is('(') && this.isTypename(this.peek())) {
      const start = this.p;
      const tok = this.next();
      const ty = this.typename();
      this.expect(')');
      if (this.is('{')) {
        // compound literal
        this.p = start;
        return this.unary();
      }
      const e = this.castExpr();
      if (ty.kind !== 'void') {
        if ((ty.kind === 'struct' || ty.kind === 'union') || (e.ty.kind === 'struct' || e.ty.kind === 'union')) throw this.err(`cannot cast '${typeName(e.ty)}' to '${typeName(ty)}'`, tok);
        if (isFlonum(ty) && decay(e.ty).kind === 'ptr') throw this.err(`pointer cannot be cast to type '${typeName(ty)}'`, tok);
        if (ty.kind === 'ptr' && isFlonum(e.ty)) throw this.err(`operand of type '${typeName(e.ty)}' cannot be cast to a pointer type`, tok);
      }
      return { kind: 'cast', lhs: e, ty, tok, explicit: true };
    }
    return this.unary();
  }

  unary() {
    const tok = this.tok;
    if (this.consume('+')) { const n = this.castExpr(); if (!isNumeric(n.ty)) throw this.err('invalid argument type to unary +', tok); return this.cast(n, promote(n.ty)); }
    if (this.consume('-')) {
      const n = this.castExpr();
      if (!isNumeric(n.ty)) throw this.err(`invalid argument type '${typeName(n.ty)}' to unary expression`, tok);
      if (n.kind === 'num' && n.val !== undefined) return this.num(-n.val, tok, promote(n.ty));
      if (n.kind === 'num' && n.fval !== undefined) return this.fnum(-n.fval, tok, n.ty);
      const ty = promote(n.ty);
      return { kind: 'neg', lhs: this.cast(n, ty), ty, tok };
    }
    if (this.consume('&')) {
      const n = this.castExpr();
      return this.addr(n, tok);
    }
    if (this.consume('*')) { const n = this.castExpr(); return this.deref(n, tok); }
    if (this.consume('!')) { const n = this.castExpr(); this.checkScalar(n, '!'); return { kind: 'not', lhs: n, ty: T.int, tok }; }
    if (this.consume('~')) {
      const n = this.castExpr();
      if (!isInteger(n.ty)) throw this.err(`invalid argument type '${typeName(n.ty)}' to unary ~`, tok);
      const ty = promote(n.ty);
      return { kind: 'bnot', lhs: this.cast(n, ty), ty, tok };
    }
    if (this.consume('++')) return this.incdec(this.unary(), 1, false, tok);
    if (this.consume('--')) return this.incdec(this.unary(), -1, false, tok);
    if (this.is('sizeof')) {
      this.next();
      if (this.is('(') && this.isTypename(this.peek())) {
        this.next(); const ty = this.typename(); this.expect(')');
        return this.num(this.sizeOf(ty, tok), tok, T.ulong);
      }
      const n = this.unary();
      if (n.kind === 'var' && n.obj.isLocal && n.obj.paramDecayed) this.warn('sizeof on array function parameter returns size of a pointer', tok);
      return this.num(this.sizeOf(n.ty, tok), tok, T.ulong);
    }
    if (this.is('_Alignof')) {
      this.next(); this.expect('('); const ty = this.typename(); this.expect(')');
      return this.num(ty.align, tok, T.ulong);
    }
    return this.postfix();
  }

  sizeOf(ty, tok) {
    if (ty.kind === 'void') return 1;
    if (ty.kind === 'func') throw this.err('invalid application of sizeof to a function type', tok);
    if ((ty.kind === 'struct' || ty.kind === 'union') && !ty.complete) throw this.err(`invalid application of sizeof to an incomplete type '${typeName(ty)}'`, tok);
    if (ty.kind === 'array' && ty.len < 0) throw this.err(`invalid application of sizeof to an incomplete type '${typeName(ty)}'`, tok);
    return ty.size;
  }

  postfix() {
    let n;
    // compound literal (type){...}
    if (this.is('(') && this.isTypename(this.peek())) {
      const tok = this.next(); const ty = this.typename(); this.expect(')');
      if (!this.fn) throw this.err('compound literals at file scope are not supported', tok);
      const v = this.newLocal(null, ty, tok);
      const init = this.localInit(v, tok);
      n = { kind: 'comma', lhs: init, rhs: this.varNode(v, tok), ty: v.ty, tok };
    } else n = this.primary();
    for (;;) {
      const tok = this.tok;
      if (this.consume('(')) { n = this.funcall(n, tok); continue; }
      if (this.consume('[')) {
        const idx = this.expr();
        this.expect(']');
        if (!isPtrLike(n.ty) && !isPtrLike(idx.ty)) throw this.err(`subscripted value is not an array or pointer ('${typeName(n.ty)}')`, tok);
        if (n.kind === 'var' && n.ty.kind === 'array' && n.ty.len >= 0 && idx.kind === 'num' && idx.val !== undefined && (idx.val < 0n || idx.val >= BigInt(n.ty.len))) {
          this.warn(`array index ${idx.val} is past the end of the array (that has type '${typeName(n.ty)}')`, tok);
        }
        n = this.deref(this.add(n, idx, tok), tok);
        continue;
      }
      if (this.consume('.')) { n = this.member(n, tok); continue; }
      if (this.consume('->')) {
        if (decay(n.ty).kind !== 'ptr') throw this.err(`member reference type '${typeName(n.ty)}' is not a pointer; did you mean to use '.'?`, tok);
        n = this.member(this.deref(n, tok), tok);
        continue;
      }
      if (this.consume('++')) { n = this.incdec(n, 1, true, tok); continue; }
      if (this.consume('--')) { n = this.incdec(n, -1, true, tok); continue; }
      return n;
    }
  }

  member(n, tok) {
    const nameTok = this.next();
    if (n.ty.kind === 'ptr') throw this.err(`member reference type '${typeName(n.ty)}' is a pointer; did you mean to use '->'?`, tok);
    if (n.ty.kind !== 'struct' && n.ty.kind !== 'union') throw this.err(`member reference base type '${typeName(n.ty)}' is not a structure or union`, tok);
    if (!n.ty.complete) throw this.err(`incomplete definition of type '${typeName(n.ty)}'`, tok);
    const r = this.findMember(n.ty, nameTok.s);
    if (!r) throw this.err(`no member named '${nameTok.s}' in '${typeName(n.ty)}'`, nameTok);
    let ty = r.mem.ty;
    if (n.ty.isConst && !ty.isConst) ty = { ...ty, isConst: true, origin: ty.origin || ty };
    return { kind: 'member', lhs: n, mem: r.mem, offset: r.offset, ty, tok: nameTok };
  }

  funcall(fn, tok) {
    let fty = fn.ty;
    if (fty.kind === 'ptr' && fty.base.kind === 'func') fty = fty.base;
    if (fty.kind !== 'func') throw this.err(`called object type '${typeName(fn.ty)}' is not a function or function pointer`, tok);
    const args = [];
    if (!this.consume(')')) {
      for (;;) {
        args.push(this.assignExpr());
        if (this.consume(')')) break;
        this.expect(',', 'between arguments');
      }
    }
    const name = fn.kind === 'var' ? fn.obj.name : null;
    if (fty.hasProto) {
      if (args.length < fty.params.length) throw this.err(`too few arguments to function call${name ? ` '${name}'` : ''}, expected ${fty.params.length}, have ${args.length}`, tok);
      if (args.length > fty.params.length && !fty.variadic) throw this.err(`too many arguments to function call${name ? ` '${name}'` : ''}, expected ${fty.params.length}, have ${args.length}`, tok);
    }
    const conv = args.map((a, i) => {
      if (a.ty.kind === 'void') throw this.err('passing a void value as an argument', a.tok);
      if (i < fty.params.length) {
        this.checkAssignable(fty.params[i], a, a.tok, `passing argument ${i + 1}${name ? ` to '${name}'` : ''} of type`);
        return (fty.params[i].kind === 'struct' || fty.params[i].kind === 'union') ? a : this.cast(a, fty.params[i]);
      }
      // default argument promotions
      if (a.ty.kind === 'float') return this.cast(a, T.double);
      if (isInteger(a.ty)) return this.cast(a, promote(a.ty));
      return a;
    });
    if (name) this.checkFormat(name, conv, args);
    const node = { kind: 'call', fn, fnTy: fty, fnName: name, args: conv, ty: fty.ret, tok };
    if (fty.ret.kind === 'struct' || fty.ret.kind === 'union') node.retBuf = this.newLocal(null, fty.ret, tok);
    node.argTemps = conv.map(a => ((a.ty.kind === 'struct' || a.ty.kind === 'union') ? this.newLocal(null, a.ty, tok) : null));
    return node;
  }

  // -Wformat style checking for printf/scanf families.
  checkFormat(name, args, rawArgs) {
    const pos = { printf: 0, fprintf: 1, sprintf: 1, snprintf: 2, scanf: 0, fscanf: 1, sscanf: 1 }[name];
    if (pos === undefined) return;
    const f = rawArgs[pos];
    const lit = f && f.kind === 'var' && f.obj.isLiteral ? f.obj : null;
    if (!lit) {
      if (f && name.endsWith('printf') && name !== 'snprintf') this.warn('format string is not a string literal (potentially insecure if it comes from input)', f.tok);
      return;
    }
    const fmt = new TextDecoder().decode(lit.initData.subarray(0, lit.initData.length - 1));
    const isScan = name.endsWith('scanf');
    const specs = [...fmt.matchAll(/%([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d*))?(hh|h|ll|l|z|j|t|L)?([diouxXcspfFeEgGn%[])/g)];
    let ai = pos + 1;
    for (const m of specs) {
      const [whole, , width, prec, len = '', conv] = m;
      if (conv === '%') continue;
      if (!isScan && width === '*') ai++;
      if (!isScan && prec === '*') ai++;
      if (isScan && whole.startsWith('%*')) continue;
      const a = rawArgs[ai];
      if (!a) { this.warn(`more '%' conversions than data arguments ('${whole}' has no argument)`, lit.tok); return; }
      ai++;
      const t = a.ty;
      const want = (desc) => this.warn(`format '${whole}' expects ${desc}, but the argument has type '${typeName(t)}'`, a.tok);
      if (isScan) {
        const d = decay(t);
        if (d.kind !== 'ptr') { want('a pointer argument (did you forget &?)'); continue; }
        const b = d.base;
        if ('dioux'.includes(conv) || conv === 'X') {
          const size = len === 'l' || len === 'll' || len === 'z' ? 8 : len === 'h' ? 2 : len === 'hh' ? 1 : 4;
          if (!isInteger(b) || b.size !== size) want(`'${size === 8 ? 'long' : size === 2 ? 'short' : size === 1 ? 'char' : 'int'} *'`);
        } else if ('feEgG'.includes(conv)) {
          const dbl = len === 'l' || len === 'L';
          if (b.kind !== (dbl ? 'double' : 'float')) want(`'${dbl ? 'double' : 'float'} *'`);
        } else if (conv === 's' || conv === 'c' || conv === '[') {
          if (!(isInteger(b) && b.size === 1)) want("'char *'");
        }
        continue;
      }
      if ('diouxX'.includes(conv)) {
        if (!isInteger(t)) { want(`'${len === 'l' ? 'long' : len === 'll' ? 'long long' : 'int'}'`); continue; }
        const size = len === 'l' || len === 'll' || len === 'z' || len === 'j' || len === 't' ? 8 : 4;
        const ps = promote(t).size;
        if (ps !== size) want(size === 8 ? `'long' (use %${conv} for int, or %l${conv} for long)` : `'int' (use %l${conv} for long${len ? '' : ', %zu for size_t'})`);
      } else if ('fFeEgG'.includes(conv)) {
        if (!isFlonum(t)) want("'double'");
      } else if (conv === 'c') {
        if (!isInteger(t)) want("'int'");
      } else if (conv === 's') {
        const d = decay(t);
        if (d.kind !== 'ptr' || !(isInteger(d.base) && d.base.size === 1)) want("'char *'");
      } else if (conv === 'p') {
        if (decay(t).kind !== 'ptr') want("'void *'");
      }
    }
    if (ai < rawArgs.length) this.warn('data argument not used by format string', rawArgs[ai].tok);
  }

  primary() {
    const tok = this.tok;
    if (this.consume('(')) {
      const n = this.expr();
      this.expect(')');
      n.parenthesized = true;
      return n;
    }
    if (tok.k === 'num') { this.next(); return this.parseNumber(tok); }
    if (tok.k === 'chr') { this.next(); return this.num(tok.v, tok, T.int); }
    if (tok.k === 'str') {
      const bytes = [];
      while (this.tok.k === 'str') bytes.push(...this.next().bytes); // adjacent literals concatenate
      const obj = this.newStringLiteral(bytes, tok);
      return this.varNode(obj, tok);
    }
    if (tok.k === 'id') {
      this.next();
      const v = this.findVar(tok.s);
      if (v && v.obj) return this.varNode(v.obj, tok);
      if (v && v.enumVal !== undefined) return this.num(v.enumVal, tok, T.int);
      if (v && v.typedef) throw this.err(`unexpected type name '${tok.s}': expected expression`, tok);
      if (this.is('(')) {
        const hint = ['printf', 'puts', 'scanf'].includes(tok.s) ? ' (did you forget #include <stdio.h>?)'
          : ['malloc', 'free', 'exit', 'calloc', 'realloc', 'atoi'].includes(tok.s) ? ' (did you forget #include <stdlib.h>?)'
            : ['strlen', 'strcpy', 'strcmp', 'memcpy', 'memset'].includes(tok.s) ? ' (did you forget #include <string.h>?)'
              : tok.s === 'gets' ? ' (gets() was removed from C11 because it cannot be used safely; use fgets)' : '';
        throw this.err(`call to undeclared function '${tok.s}'; ISO C99 and later do not support implicit function declarations${hint}`, tok);
      }
      throw this.err(`use of undeclared identifier '${tok.s}'`, tok);
    }
    if (tok.k === 'eof') throw this.err('expected expression before end of file', tok);
    throw this.err(`expected expression before '${tok.s}'`, tok);
  }

  parseNumber(tok) {
    let s = tok.s;
    const isHex = /^0[xX]/.test(s);
    const isFloat = isHex ? /[pP]/.test(s) : /[.eE]/.test(s);
    if (isFloat) {
      let ty = T.double;
      if (/[fF]$/.test(s)) { ty = T.float; s = s.slice(0, -1); } else if (/[lL]$/.test(s)) s = s.slice(0, -1);
      const v = isHex ? parseHexFloat(s) : Number(s);
      if (Number.isNaN(v)) throw this.err(`invalid floating point constant '${tok.s}'`, tok);
      return this.fnum(ty === T.float ? Math.fround(v) : v, tok, ty);
    }
    const m = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|0[0-7]*|[1-9][0-9]*)([uU]?(?:ll|LL|l|L)?[uU]?)$/.exec(s);
    if (!m) throw this.err(`invalid integer constant '${s}'`, tok);
    const digits = m[1]; const suffix = m[2].toLowerCase();
    const v = /^0[0-7]+$/.test(digits) ? BigInt('0o' + digits.slice(1)) : BigInt(digits);
    const u = suffix.includes('u'); const l = suffix.includes('l');
    const decimal = /^[1-9]/.test(digits) || digits === '0';
    let ty;
    if (v > 0xFFFFFFFFFFFFFFFFn) throw this.err('integer literal is too large to be represented in any integer type', tok);
    if (!l && !u && v <= 0x7FFFFFFFn) ty = T.int;
    else if (!l && !u && !decimal && v <= 0xFFFFFFFFn) ty = T.uint;
    else if (!l && u && v <= 0xFFFFFFFFn) ty = T.uint;
    else if (!u && v <= 0x7FFFFFFFFFFFFFFFn) ty = T.long;
    else ty = T.ulong;
    return this.num(v, tok, ty);
  }

  // ======================================================================
  // initializers
  // ======================================================================

  // Parse an initializer for type ty into a flat list of { offset, ty, expr }
  // leaves. Returns { leaves, ty } (ty may gain a length for `int a[] = {..}`).
  parseInitializer(ty) {
    const leaves = [];
    const outTy = this.initInto(ty, 0, leaves, true);
    return { leaves, ty: outTy };
  }

  initInto(ty, off, leaves, top) {
    // string literal for char array
    if (ty.kind === 'array' && isInteger(ty.base) && ty.base.size === 1) {
      const braced = this.is('{') && this.peek().k === 'str';
      if (this.tok.k === 'str' || braced) {
        if (braced) this.next();
        const bytes = []; const tok = this.tok;
        while (this.tok.k === 'str') bytes.push(...this.next().bytes);
        if (braced) { this.consume(','); this.expect('}'); }
        let len = ty.len;
        if (len < 0) { len = bytes.length + 1; ty = arrayOf(ty.base, len); }
        if (bytes.length > len) this.warn(`initializer-string for char array is too long (${bytes.length} chars into ${len})`, tok);
        if (bytes.length === len) this.warn(`initializer-string for 'char[${len}]' fills the whole array, so there is no room for the '\\0' terminator`, tok);
        for (let i = 0; i < Math.min(len, bytes.length + 1); i++) leaves.push({ offset: off + i, ty: ty.base, expr: this.num(i < bytes.length ? bytes[i] : 0, tok, ty.base) });
        return ty;
      }
    }
    if (ty.kind === 'array') {
      if (!this.is('{')) {
        if (top) throw this.err(`array initializer must be an initializer list`, this.tok);
        return this.initArrayFlat(ty, off, leaves);
      }
      this.next();
      let i = 0; let max = 0;
      const es = ty.base.size;
      while (!this.consume('}')) {
        if (i > 0 || max > 0) { this.expect(','); if (this.consume('}')) break; }
        if (this.is('[')) {
          this.next(); i = Number(this.evalConst(this.conditional())); this.expect(']'); this.expect('=');
        }
        if (ty.len >= 0 && i >= ty.len) { this.warn('excess elements in array initializer', this.tok); this.skipInitializer(); i++; continue; }
        this.initInto(ty.base, off + i * es, leaves, false);
        i++; max = Math.max(max, i);
      }
      if (ty.len < 0) ty = arrayOf(ty.base, max);
      return ty;
    }
    if (ty.kind === 'struct' || ty.kind === 'union') {
      if (!this.is('{')) {
        // initialize from an expression of the same struct type
        const e = this.assignExpr();
        if (e.ty.kind === ty.kind && (e.ty.origin || e.ty) === (ty.origin || ty)) { leaves.push({ offset: off, ty, expr: e }); return ty; }
        if (top) throw this.err(`initializing '${typeName(ty)}' with an expression of incompatible type '${typeName(e.ty)}'`, e.tok);
        // brace elision: first member takes this expression
        this.pendingExpr = e;
        return this.initStructFlat(ty, off, leaves);
      }
      this.next();
      const mems = ty.members.filter(m => m.name !== null || m.ty.kind === 'struct' || m.ty.kind === 'union');
      let idx = 0; let first = true;
      while (!this.consume('}')) {
        if (!first) { this.expect(','); if (this.consume('}')) break; }
        first = false;
        if (this.is('.')) {
          this.next(); const nameTok = this.next();
          const r = this.findMember(ty, nameTok.s);
          if (!r) throw this.err(`field designator '${nameTok.s}' does not refer to any field in type '${typeName(ty)}'`, nameTok);
          this.expect('=');
          this.initInto(r.mem.ty, off + r.offset, leaves, false);
          idx = mems.indexOf(r.via || r.mem) + 1;
          continue;
        }
        if (idx >= mems.length || (ty.kind === 'union' && idx >= 1)) { this.warn('excess elements in struct initializer', this.tok); this.skipInitializer(); continue; }
        const m = mems[idx++];
        this.initInto(m.ty, off + m.offset, leaves, false);
      }
      return ty;
    }
    // scalar (optionally in braces)
    if (this.is('{')) {
      this.next();
      this.initInto(ty, off, leaves, false);
      this.consume(',');
      this.expect('}', 'after scalar initializer');
      return ty;
    }
    const e = this.pendingExpr || this.assignExpr();
    this.pendingExpr = null;
    this.checkAssignable(ty, e, e.tok, 'initializing');
    leaves.push({ offset: off, ty, expr: this.cast(e, ty) });
    return ty;
  }

  // brace elision helpers: `int a[2][2] = {1, 2, 3, 4}`
  initArrayFlat(ty, off, leaves) {
    const n = ty.len < 0 ? 1 : ty.len;
    for (let i = 0; i < n; i++) {
      if (i > 0) { if (!this.is(',') || this.isAt(this.peek(), '}')) break; this.next(); }
      this.initInto(ty.base, off + i * ty.base.size, leaves, false);
    }
    return ty;
  }

  initStructFlat(ty, off, leaves) {
    const mems = ty.members;
    for (let i = 0; i < mems.length; i++) {
      if (i > 0) { if (!this.is(',') || this.isAt(this.peek(), '}')) break; this.next(); }
      this.initInto(mems[i].ty, off + mems[i].offset, leaves, false);
      if (ty.kind === 'union') break;
    }
    return ty;
  }

  skipInitializer() {
    if (this.consume('{')) { let d = 1; while (d) { const t = this.next(); if (t.s === '{') d++; if (t.s === '}') d--; if (t.k === 'eof') break; } return; }
    this.assignExpr();
  }

  // Local: zero the whole object, then assign each leaf.
  localInit(v, tok) {
    const { leaves, ty } = this.parseInitializer(v.ty);
    v.ty = ty;
    let n = { kind: 'memzero', obj: v, ty: T.void, tok };
    for (const leaf of leaves) {
      let addr = this.cast(this.addr(this.varNode(v, tok), tok), pointerTo(T.char));
      if (leaf.offset) addr = { kind: 'add', lhs: addr, rhs: this.num(leaf.offset, tok, T.long), ty: addr.ty, tok, ptrArith: true };
      const lv = { kind: 'deref', lhs: this.cast(addr, pointerTo(leaf.ty)), ty: leaf.ty, tok };
      const asg = (leaf.ty.kind === 'struct' || leaf.ty.kind === 'union') ? { kind: 'assign', lhs: lv, rhs: leaf.expr, ty: leaf.ty, tok } : { kind: 'assign', lhs: lv, rhs: this.cast(leaf.expr, leaf.ty), ty: leaf.ty, tok };
      n = { kind: 'comma', lhs: n, rhs: asg, ty: asg.ty, tok };
    }
    return { kind: 'comma', lhs: n, rhs: { kind: 'num', val: 0n, ty: T.int, tok }, ty: T.int, tok, isInit: true };
  }

  // Global: constant-fold each leaf into bytes (+ relocations for addresses).
  globalInit(obj) {
    const { leaves, ty } = this.parseInitializer(obj.ty);
    obj.ty = ty;
    const buf = new Uint8Array(Math.max(ty.size, 0));
    const relocs = [];
    for (const leaf of leaves) {
      const t = leaf.ty;
      if (isFlonum(t)) {
        const f = this.evalFloat(leaf.expr);
        const dv = new DataView(buf.buffer);
        if (t.kind === 'float') dv.setFloat32(leaf.offset, f, true); else dv.setFloat64(leaf.offset, f, true);
        continue;
      }
      if (t.kind === 'struct' || t.kind === 'union') throw this.err('initializer element is not a compile-time constant', leaf.expr.tok);
      const r = this.evalReloc(leaf.expr);
      if (r.label) {
        if (t.size !== 8) throw this.err('initializer element is not a compile-time constant (address does not fit)', leaf.expr.tok);
        relocs.push({ offset: leaf.offset, label: r.label, addend: r.val });
        continue;
      }
      let v = BigInt.asUintN(t.size * 8, r.val);
      for (let i = 0; i < t.size; i++) { buf[leaf.offset + i] = Number(v & 0xFFn); v >>= 8n; }
    }
    obj.initData = buf;
    obj.relocs = relocs;
  }

  // ======================================================================
  // constant evaluation
  // ======================================================================

  isConstExpr(n) {
    try { this.evalConst(n); return true; } catch { return false; }
  }

  evalConst(n) {
    const r = this.evalReloc(n);
    if (r.label) throw this.err('expression is not an integer constant expression', n.tok);
    return r.val;
  }

  evalFloat(n) {
    if (n.kind === 'num') return n.fval !== undefined ? n.fval : Number(n.val);
    if (n.kind === 'cast') {
      if (isFlonum(n.lhs.ty)) { const f = this.evalFloat(n.lhs); return n.ty.kind === 'float' ? Math.fround(f) : f; }
      const v = this.evalConst(n.lhs);
      return Number(n.lhs.ty.unsigned ? BigInt.asUintN(n.lhs.ty.size * 8, v) : v);
    }
    const a = () => this.evalFloat(n.lhs); const b = () => this.evalFloat(n.rhs);
    switch (n.kind) {
      case 'add': return a() + b(); case 'sub': return a() - b(); case 'mul': return a() * b(); case 'div': return a() / b();
      case 'neg': return -a();
      case 'cond': return this.evalConst(n.cond) ? this.evalFloat(n.then) : this.evalFloat(n.els);
      default: throw this.err('initializer element is not a compile-time constant', n.tok);
    }
  }

  // Returns { val: BigInt, label?: string }
  evalReloc(n) {
    const norm = (v, ty) => {
      if (ty.kind === 'bool') return v !== 0n ? 1n : 0n;
      if (!isInteger(ty) && ty.kind !== 'ptr') return v;
      const bits = ty.size * 8;
      return ty.unsigned || ty.kind === 'ptr' ? BigInt.asUintN(bits, v) : BigInt.asIntN(bits, v);
    };
    const E = (x) => this.evalReloc(x);
    const I = (x) => { const r = E(x); if (r.label) throw this.err('expression is not an integer constant expression', x.tok); return r.val; };
    switch (n.kind) {
      case 'num':
        if (n.fval !== undefined) return { val: BigInt(Math.trunc(n.fval)) };
        return { val: n.val };
      case 'add': {
        const l = E(n.lhs); const r = E(n.rhs);
        if (l.label && r.label) throw this.err('initializer element is not constant', n.tok);
        return { val: norm(l.val + r.val, n.ty), label: l.label || r.label };
      }
      case 'sub': {
        const l = E(n.lhs); const r = E(n.rhs);
        if (r.label) throw this.err('initializer element is not constant', n.tok);
        return { val: norm(l.val - r.val, n.ty), label: l.label };
      }
      case 'mul': return { val: norm(I(n.lhs) * I(n.rhs), n.ty) };
      case 'div': { const d = I(n.rhs); if (d === 0n) throw this.err('division by zero in constant expression', n.tok); return { val: norm(I(n.lhs) / d, n.ty) }; }
      case 'mod': { const d = I(n.rhs); if (d === 0n) throw this.err('division by zero in constant expression', n.tok); return { val: norm(I(n.lhs) % d, n.ty) }; }
      case 'band': return { val: norm(I(n.lhs) & I(n.rhs), n.ty) };
      case 'bor': return { val: norm(I(n.lhs) | I(n.rhs), n.ty) };
      case 'bxor': return { val: norm(I(n.lhs) ^ I(n.rhs), n.ty) };
      case 'shl': return { val: norm(I(n.lhs) << I(n.rhs), n.ty) };
      case 'shr': return { val: norm(I(n.lhs) >> I(n.rhs), n.ty) };
      case 'eq': return { val: I(n.lhs) === I(n.rhs) ? 1n : 0n };
      case 'ne': return { val: I(n.lhs) !== I(n.rhs) ? 1n : 0n };
      case 'lt': return { val: I(n.lhs) < I(n.rhs) ? 1n : 0n };
      case 'le': return { val: I(n.lhs) <= I(n.rhs) ? 1n : 0n };
      case 'logand': return { val: I(n.lhs) && I(n.rhs) ? 1n : 0n };
      case 'logor': return { val: I(n.lhs) || I(n.rhs) ? 1n : 0n };
      case 'not': return { val: I(n.lhs) ? 0n : 1n };
      case 'bnot': return { val: norm(~I(n.lhs), n.ty) };
      case 'neg': return { val: norm(-I(n.lhs), n.ty) };
      case 'cond': return I(n.cond) ? E(n.then) : E(n.els);
      case 'comma': return E(n.rhs);
      case 'cast': {
        if (isFlonum(n.lhs.ty) && isInteger(n.ty)) return { val: norm(BigInt(Math.trunc(this.evalFloat(n.lhs))), n.ty) };
        const r = E(n.lhs);
        if (r.label) return r;
        return { val: norm(r.val, n.ty) };
      }
      case 'addr': return this.evalAddr(n.lhs);
      case 'var':
        if (n.ty.kind === 'array' || n.ty.kind === 'func') { if (n.obj.isLocal) break; return { val: 0n, label: n.obj }; }
        break;
      case 'member': case 'deref':
        if (n.ty.kind === 'array') return this.evalAddr(n);
        break;
      default: break;
    }
    throw this.err('initializer element is not a compile-time constant', n.tok);
  }

  evalAddr(n) {
    switch (n.kind) {
      case 'var': if (n.obj.isLocal) break; return { val: 0n, label: n.obj };
      case 'deref': return this.evalReloc(n.lhs);
      case 'member': { const r = this.evalAddr(n.lhs); return { val: r.val + BigInt(n.offset), label: r.label }; }
      default: break;
    }
    throw this.err('initializer element is not a compile-time constant', n.tok);
  }
}

function parseHexFloat(s) {
  const m = /^0[xX]([0-9a-fA-F]*)\.?([0-9a-fA-F]*)[pP]([-+]?\d+)$/.exec(s);
  if (!m) return NaN;
  const mant = parseInt((m[1] || '0') + (m[2] || ''), 16);
  return mant * Math.pow(2, Number(m[3]) - 4 * (m[2] || '').length);
}
