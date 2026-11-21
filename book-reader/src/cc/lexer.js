// C tokenizer.

export class CError extends Error {
  constructor(message, tok) {
    super(message);
    this.file = tok?.file;
    this.line = tok?.line;
    this.col = tok?.col;
  }
  get where() { return this.file ? `${this.file}:${this.line}:${this.col}` : ''; }
}

export const KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float',
  'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'restrict', 'return', 'short', 'signed', 'sizeof', 'static',
  'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', '_Bool', '_Alignof', '_Alignas',
  '_Static_assert', '_Noreturn', '__attribute__', '__restrict', '__inline', '__const', '_Thread_local', 'typeof', '__typeof__',
]);

const PUNCTS = ['<<=', '>>=', '...', '->', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '+=', '-=', '*=', '/=',
  '%=', '&=', '|=', '^=', '##'];

const ESC = { n: 10, t: 9, r: 13, a: 7, b: 8, f: 12, v: 11, e: 27, '\\': 92, "'": 39, '"': 34, '?': 63 };

function readEscape(src, i, tokFor) {
  // src[i] is the char after the backslash. Returns [value, nextIndex].
  const c = src[i];
  if (/[0-7]/.test(c)) {
    let j = i; let v = 0;
    while (j < i + 3 && /[0-7]/.test(src[j])) { v = v * 8 + (src.charCodeAt(j) - 48); j++; }
    return [v & 0xFF, j];
  }
  if (c === 'x') {
    let j = i + 1; let v = 0;
    if (!/[0-9a-fA-F]/.test(src[j])) throw new CError('\\x used with no following hex digits', tokFor());
    while (/[0-9a-fA-F]/.test(src[j])) { v = v * 16 + parseInt(src[j], 16); j++; }
    return [v & 0xFF, j];
  }
  if (c in ESC) return [ESC[c], i + 1];
  return [c.charCodeAt(0), i + 1];
}

// Returns an array of tokens: { k, s, v, file, line, col, bol, sp }
//   k: 'id' | 'kw' | 'num' | 'str' | 'chr' | 'p' | 'eof'
export function tokenize(src, file) {
  const toks = [];
  let i = 0; let line = 1; let lineStart = 0;
  let bol = true; let sp = false;
  const n = src.length;
  const at = (start) => ({ file, line, col: start - lineStart + 1 });
  while (i < n) {
    const c = src[i];
    // line continuation
    if (c === '\\' && (src[i + 1] === '\n' || (src[i + 1] === '\r' && src[i + 2] === '\n'))) {
      i += src[i + 1] === '\r' ? 3 : 2; line++; lineStart = i; continue;
    }
    if (c === '\n') { i++; line++; lineStart = i; bol = true; sp = false; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; sp = true; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; sp = true; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const start = i; const end = src.indexOf('*/', i + 2);
      if (end < 0) throw new CError('unterminated /* comment', at(start));
      for (let j = i; j < end; j++) if (src[j] === '\n') { line++; lineStart = j + 1; }
      i = end + 2; sp = true; continue;
    }
    const start = i;
    const push = (t) => { toks.push({ ...at(start), bol, sp, ...t }); bol = false; sp = false; };

    // numbers (pp-number, refined later by the parser)
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) {
      let j = i + 1;
      for (;;) {
        if (/[eEpP]/.test(src[j - 1]) && /[+-]/.test(src[j])) { j++; continue; }
        if (/[0-9A-Za-z_.]/.test(src[j] || '')) { j++; continue; }
        break;
      }
      push({ k: 'num', s: src.slice(i, j) });
      i = j; continue;
    }
    // identifiers / keywords
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const s = src.slice(i, j);
      // wide/unicode string prefixes are treated as plain strings
      if ((s === 'L' || s === 'u8' || s === 'u' || s === 'U') && (src[j] === '"' || src[j] === "'")) { i = j; continue; }
      push({ k: KEYWORDS.has(s) ? 'kw' : 'id', s });
      i = j; continue;
    }
    // string literal -> bytes (UTF-8), without the terminating NUL
    if (c === '"') {
      let j = i + 1; const bytes = [];
      const enc = new TextEncoder();
      for (;;) {
        if (j >= n || src[j] === '\n') throw new CError('missing terminating " character', at(start));
        if (src[j] === '"') { j++; break; }
        if (src[j] === '\\') { const [v, nj] = readEscape(src, j + 1, () => at(j)); bytes.push(v); j = nj; continue; }
        const cp = src.codePointAt(j);
        bytes.push(...enc.encode(String.fromCodePoint(cp)));
        j += cp > 0xFFFF ? 2 : 1;
      }
      push({ k: 'str', s: src.slice(i, j), bytes });
      i = j; continue;
    }
    // character literal -> int value (char is signed on our target? AArch64 Linux char is UNSIGNED)
    if (c === "'") {
      let j = i + 1; let v;
      if (src[j] === '\\') { [v, j] = readEscape(src, j + 1, () => at(j)); }
      else { v = src.charCodeAt(j); j++; }
      if (src[j] !== "'") throw new CError('missing terminating \' character (multi-character constants are not supported)', at(start));
      j++;
      push({ k: 'chr', s: src.slice(i, j), v: BigInt(v) });
      i = j; continue;
    }
    // punctuators
    let p = PUNCTS.find(q => src.startsWith(q, i));
    if (!p) p = c;
    if (!/[[\](){}.&*+\-~!/%<>^|?:;=,#]/.test(p[0])) throw new CError(`unexpected character '${c}'`, at(start));
    push({ k: 'p', s: p });
    i += p.length;
  }
  toks.push({ k: 'eof', s: '', file, line, col: i - lineStart + 1, bol: true, sp: false });
  return toks;
}
