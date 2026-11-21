// Compiles every .c file in the book and every runnable C block in the C
// course with the in-browser compiler, runs the ones that compile, and
// groups the failures.   npm run scan:c
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileC, runC } from '../src/cc/toolchain.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const cases = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'book-reader', '.git'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.c')) cases.push({ name: path.relative(root, p), src: fs.readFileSync(p, 'utf8') });
    else if (e.name.endsWith('.md') && p.includes('c_course')) {
      const md = fs.readFileSync(p, 'utf8');
      [...md.matchAll(/```c\r?\n([\s\S]*?)```/g)].forEach((m, i) => {
        if (/\bmain\s*\(/.test(m[1])) cases.push({ name: `${path.relative(root, p)}#block${i + 1}`, src: m[1] });
      });
    }
  }
})(root);

let compiled = 0; let ran = 0;
const groups = {};
for (const c of cases) {
  const b = compileC({ 'main.c': c.src });
  if (!b.ok) {
    const e = b.errors[0];
    const key = e.message.replace(/'[^']*'/g, "'_'").slice(0, 80);
    (groups[key] = groups[key] || []).push(`${c.name}:${e.line ?? ''}  ${e.message.slice(0, 120)}`);
    continue;
  }
  compiled++;
  const r = runC(b, { maxSteps: 2_000_000, args: ['test'] });
  if (r.status === 'terminated' && !r.fault) ran++;
  else console.log(`RUN  ${c.name}: ${r.status} ${(r.fault ? r.stderr : r.message || '').split('\n')[0].slice(0, 140)}`);
}
console.log(`\n${compiled}/${cases.length} compile, ${ran} run to completion\n`);
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${v.length} x ${k}`);
  for (const l of v) console.log(`    ${l}`);
}
