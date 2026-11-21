// C preprocessor working on token lists: #include, #define (object and
// function-like, # and ##, __VA_ARGS__), #undef, #if/#ifdef/#ifndef/#elif/
// #else/#endif with defined(), #error, #warning, #pragma once.

import { tokenize, CError } from './lexer.js';

const copyTok = (t, extra) => ({ ...t, ...extra });

export class Preprocessor {
  // files: { name: source } for user files; sys: { name: source } for <headers>
  constructor(files, sys, { predefined = {} } = {}) {
    this.files = files;
    this.sys = sys;
    this.macros = new Map();
    this.onceFiles = new Set();
    this.includeDepth = 0;
    this.warnings = [];
    const pre = {
      __STDC__: '1', __STDC_VERSION__: '201710L', __STDC_HOSTED__: '1', __aarch64__: '1', __linux__: '1', __unix__: '1',
      __LP64__: '1', __CHAR_BIT__: '8', __CHAR_UNSIGNED__: '1', __SIZEOF_POINTER__: '8', __SIZEOF_LONG__: '8', __SIZEOF_INT__: '4',
      __ORDER_LITTLE_ENDIAN__: '1234', __BYTE_ORDER__: '1234', __SIMULATOR__: '1', ...predefined,
    };
    for (const [k, v] of Object.entries(pre)) this.define(`${k} ${v}`);
  }

  define(text) {
    const toks = tokenize(text, '<builtin>');
    const name = toks[0].s;
    this.macros.set(name, { fn: false, body: toks.slice(1, -1).map(t => ({ ...t, bol: false })) });
  }

  // Preprocess a whole file; returns tokens ending in eof.
  run(name) {
    const src = this.files[name];
    if (src === undefined) throw new CError(`file not found: ${name}`, null);
    const out = this.processFile(tokenize(src, name), name);
    out.push({ k: 'eof', s: '', file: name, line: 0, col: 0 });
    return out;
  }

  processFile(toks, fileName) {
    const out = [];
    const cond = []; // { active, taken, elseSeen, tok }
    const active = () => cond.every(c => c.active);
    let i = 0;
    const lineOf = (start) => { // tokens of the directive line (until next bol)
      const l = [];
      let j = start;
      while (toks[j].k !== 'eof' && !toks[j].bol) { l.push(toks[j]); j++; }
      return [l, j];
    };
    while (toks[i].k !== 'eof') {
      const t = toks[i];
      if (t.k === 'p' && t.s === '#' && t.bol) {
        const dirTok = toks[i + 1];
        if (dirTok.k === 'eof' || dirTok.bol) { i++; continue; } // null directive
        const dir = dirTok.s;
        const [args, next] = lineOf(i + 2);
        i = next;
        // conditionals are processed even in skipped regions
        if (dir === 'if' || dir === 'ifdef' || dir === 'ifndef') {
          let v = false;
          if (active()) {
            if (dir === 'if') v = this.evalIf(args, dirTok);
            else {
              if (!args[0] || args[0].k !== 'id' && args[0].k !== 'kw') throw new CError(`no macro name given in #${dir} directive`, dirTok);
              v = this.macros.has(args[0].s) === (dir === 'ifdef');
            }
          }
          cond.push({ active: v, taken: v, parentActive: active(), tok: dirTok });
          continue;
        }
        if (dir === 'elif') {
          const c = cond[cond.length - 1];
          if (!c) throw new CError('#elif without #if', dirTok);
          if (c.taken) c.active = false;
          else { c.active = cond.slice(0, -1).every(x => x.active) && this.evalIf(args, dirTok); c.taken = c.active; }
          continue;
        }
        if (dir === 'else') {
          const c = cond[cond.length - 1];
          if (!c) throw new CError('#else without #if', dirTok);
          c.active = !c.taken; c.taken = true; continue;
        }
        if (dir === 'endif') {
          if (!cond.pop()) throw new CError('#endif without #if', dirTok);
          continue;
        }
        if (!active()) continue;
        switch (dir) {
          case 'define': this.defineFrom(args, dirTok); break;
          case 'undef': if (args[0]) this.macros.delete(args[0].s); break;
          case 'include': out.push(...this.include(args, dirTok)); break;
          case 'error': throw new CError(`#error ${args.map(a => a.s).join(' ')}`, dirTok);
          case 'warning': this.warnings.push({ file: dirTok.file, line: dirTok.line, col: dirTok.col, message: `#warning ${args.map(a => a.s).join(' ')}` }); break;
          case 'pragma': if (args[0]?.s === 'once') this.onceFiles.add(fileName); break;
          case 'line': break;
          default: throw new CError(`invalid preprocessing directive #${dir}`, dirTok);
        }
        continue;
      }
      if (!active()) { i++; continue; }
      // collect a run of normal tokens up to the next directive and macro-expand it
      const run = [];
      while (toks[i].k !== 'eof' && !(toks[i].k === 'p' && toks[i].s === '#' && toks[i].bol)) { run.push(toks[i]); i++; }
      out.push(...this.expand(run));
    }
    if (cond.length) throw new CError('unterminated conditional directive (missing #endif)', cond[cond.length - 1].tok);
    return out;
  }

  include(args, dirTok) {
    let name; let angled = false;
    if (args[0]?.k === 'str') name = args[0].s.slice(1, -1);
    else if (args[0]?.s === '<') {
      angled = true;
      let j = 1; name = '';
      while (args[j] && args[j].s !== '>') { name += args[j].s; j++; }
    } else {
      const ex = this.expand(args);
      if (ex[0]?.k === 'str') name = ex[0].s.slice(1, -1);
      else throw new CError('#include expects "FILENAME" or <FILENAME>', dirTok);
    }
    if (this.onceFiles.has(name)) return [];
    let src; let resolved = name;
    const base = name.split('/').pop();
    if (!angled && this.files[name] !== undefined) src = this.files[name];
    else if (!angled && this.files[base] !== undefined) { src = this.files[base]; resolved = base; }
    else if (this.sys[name] !== undefined) src = this.sys[name];
    else if (angled && this.files[name] !== undefined) src = this.files[name];
    if (src === undefined) {
      throw new CError(`'${name}' file not found${angled ? ' (this simulator provides the common C library headers; see the list in the C sandbox help)' : ' (add it as a file in the sandbox)'}`, dirTok);
    }
    if (this.includeDepth > 50) throw new CError('#include nested too deeply (missing include guard?)', dirTok);
    this.includeDepth++;
    try { return this.processFile(tokenize(src, resolved), resolved); } finally { this.includeDepth--; }
    // fromFile is unused but kept for future relative-path support
  }

  defineFrom(args, dirTok) {
    const nameTok = args[0];
    if (!nameTok || (nameTok.k !== 'id' && nameTok.k !== 'kw')) throw new CError('macro name must be an identifier', dirTok);
    const name = nameTok.s;
    // function-like iff '(' immediately follows the name with no space
    if (args[1] && args[1].s === '(' && !args[1].sp) {
      const params = []; let variadic = false; let j = 2;
      if (args[j]?.s !== ')') {
        for (;;) {
          const p = args[j];
          if (!p) throw new CError('missing ) in macro parameter list', nameTok);
          if (p.s === '...') { variadic = true; j++; break; }
          if (p.k !== 'id' && p.k !== 'kw') throw new CError('invalid macro parameter', p);
          params.push(p.s); j++;
          if (args[j]?.s === ',') { j++; continue; }
          break;
        }
      }
      if (args[j]?.s !== ')') throw new CError('missing ) in macro parameter list', nameTok);
      this.macros.set(name, { fn: true, params, variadic, body: args.slice(j + 1) });
    } else {
      this.macros.set(name, { fn: false, body: args.slice(1) });
    }
  }

  // Macro expansion with hide sets (prevents infinite recursion).
  expand(input) {
    const out = [];
    const q = input.map(t => (t.hide ? t : { ...t, hide: new Set() }));
    while (q.length) {
      const t = q.shift();
      if ((t.k !== 'id' && t.k !== 'kw') || t.hide.has(t.s)) { out.push(t); continue; }
      if (t.s === '__LINE__') { out.push(copyTok(t, { k: 'num', s: String(t.line) })); continue; }
      if (t.s === '__FILE__') { out.push(copyTok(t, { k: 'str', s: JSON.stringify(t.file), bytes: [...new TextEncoder().encode(t.file)] })); continue; }
      const m = this.macros.get(t.s);
      if (!m) { out.push(t); continue; }
      if (!m.fn) {
        const hide = new Set([...t.hide, t.s]);
        const body = m.body.map((b, idx) => copyTok(b, { file: t.file, line: t.line, col: t.col, sp: idx === 0 ? t.sp : b.sp, bol: false, hide }));
        q.unshift(...this.pasteAll(body));
        continue;
      }
      if (!q.length || q[0].s !== '(') { out.push(t); continue; } // function-like name without call
      // collect arguments
      q.shift();
      const argsT = []; let cur = []; let depth = 0;
      for (;;) {
        const a = q.shift();
        if (!a) throw new CError(`unterminated argument list invoking macro '${t.s}'`, t);
        if (a.s === '(') depth++;
        if (a.s === ')') { if (depth === 0) break; depth--; }
        if (a.s === ',' && depth === 0 && !(m.variadic && argsT.length >= m.params.length)) { argsT.push(cur); cur = []; continue; }
        cur.push(a);
      }
      argsT.push(cur);
      if (m.params.length === 0 && !m.variadic && argsT.length === 1 && argsT[0].length === 0) argsT.length = 0;
      if (argsT.length < m.params.length || (!m.variadic && argsT.length > m.params.length)) {
        throw new CError(`macro '${t.s}' expects ${m.params.length} argument${m.params.length === 1 ? '' : 's'}, but ${argsT.length} given`, t);
      }
      const named = new Map(m.params.map((p, idx) => [p, argsT[idx]]));
      if (m.variadic) named.set('__VA_ARGS__', argsT[m.params.length] || []);
      const hide = new Set([...t.hide, t.s]);
      const body = this.substitute(m, named, t);
      q.unshift(...body.map((b, idx) => copyTok(b, { file: t.file, line: t.line, col: t.col, sp: idx === 0 ? t.sp : b.sp, bol: false, hide: new Set([...(b.hide || []), ...hide]) })));
    }
    return out;
  }

  substitute(m, named, callTok) {
    const body = m.body; const res = [];
    for (let i = 0; i < body.length; i++) {
      const b = body[i];
      // # param  -> string literal
      if (b.s === '#' && body[i + 1] && named.has(body[i + 1].s)) {
        const arg = named.get(body[i + 1].s);
        const text = arg.map((a, idx) => (idx && a.sp ? ' ' : '') + a.s).join('');
        res.push(copyTok(b, { k: 'str', s: JSON.stringify(text), bytes: [...new TextEncoder().encode(text)] }));
        i++; continue;
      }
      if (named.has(b.s)) {
        const arg = named.get(b.s);
        const pasted = (body[i + 1] && body[i + 1].s === '##') || (body[i - 1] && body[i - 1].s === '##');
        const exp = pasted ? arg.map(a => ({ ...a })) : this.expand(arg.map(a => ({ ...a, hide: undefined })));
        if (exp.length) exp[0] = { ...exp[0], sp: b.sp };
        // GNU: , ## __VA_ARGS__ with empty args drops the comma
        if (b.s === '__VA_ARGS__' && !arg.length && res.length >= 2 && res[res.length - 1].s === '##' && res[res.length - 2].s === ',') { res.splice(res.length - 2, 2); continue; }
        res.push(...exp);
        continue;
      }
      res.push({ ...b });
    }
    return this.pasteAll(res, callTok);
  }

  pasteAll(toks, callTok) {
    const res = [];
    for (let i = 0; i < toks.length; i++) {
      if (toks[i].s === '##' && toks[i].k === 'p') {
        const lhs = res.pop(); const rhs = toks[i + 1];
        if (!lhs || !rhs) throw new CError("'##' cannot appear at either end of a macro expansion", callTok || toks[i]);
        const joined = tokenize(lhs.s + rhs.s, lhs.file);
        if (joined.length !== 2) throw new CError(`pasting "${lhs.s}" and "${rhs.s}" does not give a valid preprocessing token`, lhs);
        res.push({ ...joined[0], file: lhs.file, line: lhs.line, col: lhs.col, sp: lhs.sp, hide: lhs.hide });
        i++; continue;
      }
      res.push(toks[i]);
    }
    return res;
  }

  evalIf(args, dirTok) {
    // replace defined X / defined(X) before expansion
    const pre = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i].s === 'defined') {
        let name;
        if (args[i + 1]?.s === '(') { name = args[i + 2]?.s; if (args[i + 3]?.s !== ')') throw new CError('missing ) after "defined"', args[i]); i += 3; }
        else { name = args[i + 1]?.s; i += 1; }
        if (!name) throw new CError('macro name missing after "defined"', args[i]);
        pre.push(copyTok(args[i], { k: 'num', s: this.macros.has(name) ? '1' : '0' }));
        continue;
      }
      pre.push(args[i]);
    }
    const toks = this.expand(pre).map(t => ((t.k === 'id' || t.k === 'kw') ? copyTok(t, { k: 'num', s: t.s === 'true' ? '1' : '0' }) : t));
    if (!toks.length) throw new CError('#if with no expression', dirTok);
    let p = 0;
    const peek = () => toks[p]?.s; const take = () => toks[p++];
    const num = (t) => {
      if (t.k === 'chr') return t.v;
      const s = t.s.replace(/[uUlL]+$/, '');
      if (/^0[xX]/.test(s)) return BigInt(s);
      if (/^0[bB]/.test(s)) return BigInt(s);
      if (/^0[0-7]+$/.test(s)) return BigInt('0o' + s.slice(1));
      if (/^\d+$/.test(s)) return BigInt(s);
      throw new CError(`invalid integer constant '${t.s}' in #if`, t);
    };
    const prec = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };
    const unary = () => {
      const t = take();
      if (!t) throw new CError('incomplete #if expression', dirTok);
      if (t.s === '(') { const v = cond(); if (take()?.s !== ')') throw new CError('expected ) in #if', t); return v; }
      if (t.s === '!') return unary() === 0n ? 1n : 0n;
      if (t.s === '-') return -unary();
      if (t.s === '+') return unary();
      if (t.s === '~') return ~unary();
      if (t.k === 'num' || t.k === 'chr') return num(t);
      throw new CError(`token "${t.s}" is not valid in a preprocessor expression`, t);
    };
    const bin = (min) => {
      let l = unary();
      for (;;) {
        const op = peek();
        if (!(op in prec) || prec[op] < min) return l;
        take();
        const r = bin(prec[op] + 1);
        switch (op) {
          case '||': l = (l || r) ? 1n : 0n; break; case '&&': l = (l && r) ? 1n : 0n; break;
          case '|': l |= r; break; case '^': l ^= r; break; case '&': l &= r; break;
          case '==': l = l === r ? 1n : 0n; break; case '!=': l = l !== r ? 1n : 0n; break;
          case '<': l = l < r ? 1n : 0n; break; case '>': l = l > r ? 1n : 0n; break;
          case '<=': l = l <= r ? 1n : 0n; break; case '>=': l = l >= r ? 1n : 0n; break;
          case '<<': l <<= r; break; case '>>': l >>= r; break;
          case '+': l += r; break; case '-': l -= r; break; case '*': l *= r; break;
          case '/': if (r === 0n) throw new CError('division by zero in #if', dirTok); l /= r; break;
          case '%': if (r === 0n) throw new CError('division by zero in #if', dirTok); l %= r; break;
        }
      }
    };
    const cond = () => {
      const c = bin(1);
      if (peek() === '?') { take(); const a = cond(); if (take()?.s !== ':') throw new CError('expected : in #if', dirTok); const b = cond(); return c ? a : b; }
      return c;
    };
    const v = cond();
    if (p < toks.length) throw new CError(`extra tokens at end of #if: "${toks[p].s}"`, toks[p]);
    return v !== 0n;
  }
}
