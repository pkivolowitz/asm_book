// C types for an LP64 AArch64 Linux target.
// Note: on AArch64 Linux plain `char` is UNSIGNED (unlike x86-64).

const mk = (kind, size, align, unsigned = false, name = kind) => ({ kind, size, align, unsigned, name });

export const T = {
  void: mk('void', 1, 1, false, 'void'),
  bool: mk('bool', 1, 1, true, '_Bool'),
  char: mk('char', 1, 1, true, 'char'),
  schar: mk('char', 1, 1, false, 'signed char'),
  uchar: mk('char', 1, 1, true, 'unsigned char'),
  short: mk('short', 2, 2, false, 'short'),
  ushort: mk('short', 2, 2, true, 'unsigned short'),
  int: mk('int', 4, 4, false, 'int'),
  uint: mk('int', 4, 4, true, 'unsigned int'),
  long: mk('long', 8, 8, false, 'long'),
  ulong: mk('long', 8, 8, true, 'unsigned long'),
  llong: mk('long', 8, 8, false, 'long long'),
  ullong: mk('long', 8, 8, true, 'unsigned long long'),
  float: mk('float', 4, 4, false, 'float'),
  double: mk('double', 8, 8, false, 'double'),
};

export const isInteger = (t) => ['bool', 'char', 'short', 'int', 'long', 'enum'].includes(t.kind);
export const isFlonum = (t) => t.kind === 'float' || t.kind === 'double';
export const isNumeric = (t) => isInteger(t) || isFlonum(t);
export const isPtrLike = (t) => t.kind === 'ptr' || t.kind === 'array';
export const isScalar = (t) => isNumeric(t) || t.kind === 'ptr';
export const isAggregate = (t) => t.kind === 'struct' || t.kind === 'union' || t.kind === 'array';

export function pointerTo(base) {
  return { kind: 'ptr', size: 8, align: 8, unsigned: true, base };
}

export function arrayOf(base, len) {
  return { kind: 'array', size: base.size * Math.max(len, 0), align: base.align, base, len };
}

export function funcType(ret, params = [], variadic = false, hasProto = true) {
  return { kind: 'func', size: 1, align: 1, ret, params, variadic, hasProto };
}

export function enumType() {
  return { kind: 'enum', size: 4, align: 4, unsigned: false, name: 'enum' };
}

export function structType(kind = 'struct') {
  return { kind, size: 0, align: 1, members: [], tag: null, complete: false };
}

export function withQual(ty, qual) {
  return { ...ty, ...qual, origin: ty.origin || ty };
}

export function sameType(a, b) {
  if (!a || !b) return false;
  const oa = a.origin || a; const ob = b.origin || b;
  if (oa === ob) return true;
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'ptr': return sameType(a.base, b.base);
    case 'array': return sameType(a.base, b.base) && (a.len === b.len || a.len < 0 || b.len < 0);
    case 'func':
      if (!sameType(a.ret, b.ret) || a.variadic !== b.variadic) return false;
      if (!a.hasProto || !b.hasProto) return true;
      return a.params.length === b.params.length && a.params.every((p, i) => sameType(p, b.params[i]));
    case 'struct': case 'union': return false;
    default: return a.size === b.size && a.unsigned === b.unsigned && a.kind === b.kind;
  }
}

export function typeName(t) {
  if (!t) return '?';
  const q = t.isConst ? 'const ' : '';
  switch (t.kind) {
    case 'ptr': return t.base.kind === 'func' ? `${typeName(t.base.ret)} (*)(${t.base.params.map(typeName).join(', ')}${t.base.variadic ? ', ...' : ''})` : `${typeName(t.base)} *${t.isConst ? 'const' : ''}`.replace('* ', '*');
    case 'array': return `${typeName(t.base)}[${t.len >= 0 ? t.len : ''}]`;
    case 'func': return `${typeName(t.ret)} (${t.params.map(typeName).join(', ')}${t.variadic ? ', ...' : ''})`;
    case 'struct': case 'union': return `${q}${t.kind} ${t.tag || '(anonymous)'}`;
    case 'enum': return `${q}enum ${t.tag || '(anonymous)'}`.trim();
    default: return `${q}${t.name}`;
  }
}

// Integer promotion: anything narrower than int becomes int.
export function promote(t) {
  if (isInteger(t) && t.size < 4) return T.int;
  if (t.kind === 'enum') return T.int;
  return t;
}

// Usual arithmetic conversions.
export function commonType(a, b) {
  if (a.kind === 'array' || a.kind === 'ptr') return pointerTo(a.base);
  if (a.kind === 'func') return pointerTo(a);
  if (b.kind === 'func') return pointerTo(b);
  if (a.kind === 'double' || b.kind === 'double') return T.double;
  if (a.kind === 'float' || b.kind === 'float') return T.float;
  a = promote(a); b = promote(b);
  if (a.size !== b.size) return a.size > b.size ? a : b;
  if (b.unsigned) return b;
  return a;
}
