// Assembles every .s / .S file in the book with the in-browser simulator and
// groups the failures. Use it to see which book programs the simulator can
// load, and to catch regressions after engine changes:
//
//     npm run scan
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARM64Simulator } from '../src/simulator/arm64Engine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const MACROS = fs.readFileSync(path.join(root, 'macros/apple-linux-convergence.S'), 'utf8');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'book-reader', '.git'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(s|S)$/.test(e.name) && !e.name.startsWith('apple-linux')) files.push(p);
  }
})(root);

let ok = 0;
const groups = {};
for (const f of files) {
  const sim = new ARM64Simulator({ includes: { 'apple-linux-convergence.S': MACROS } });
  const r = sim.assemble(fs.readFileSync(f, 'utf8'));
  if (r.success) { ok++; continue; }
  const key = r.error.replace(/^Line \d+[^:]*: /, '').replace(/'[^']*'/g, "'_'").slice(0, 70);
  (groups[key] = groups[key] || []).push(`${path.relative(root, f)}  ${r.error.slice(0, 110)}`);
}
console.log(`${ok}/${files.length} book sources assemble in the simulator\n`);
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${v.length} x ${k}`);
  for (const line of v) console.log(`    ${line}`);
}
