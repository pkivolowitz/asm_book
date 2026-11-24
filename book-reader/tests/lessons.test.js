// Lesson tooling: multi-file code blocks, heading ids, and the runnable
// projects in C course Module 10 (which must behave exactly as the text says).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitCodeFiles, primaryFile } from '../src/lib/codeFiles.js';
import { githubSlug } from '../src/lib/rehypeHeadingIds.js';
import { compileC, runC } from '../src/cc/toolchain.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('splitCodeFiles: plain blocks stay plain', () => {
  assert.equal(splitCodeFiles('int main(void) { return 0; }'), null);
  assert.equal(splitCodeFiles('#include <stdio.h>\n// file: a.c\n'), null); // marker not first
});

test('splitCodeFiles: one tab per marker, CRLF tolerated, blank edges trimmed', () => {
  const files = splitCodeFiles('// file: a.h\r\nint f(void);\r\n\r\n// file: main.c\r\n#include "a.h"\r\nint main(void){return f();}\r\n');
  assert.deepEqual(files.map(f => f.name), ['a.h', 'main.c']);
  assert.equal(files[0].content, 'int f(void);\n');
  assert.equal(primaryFile(files), 'main.c');
  assert.equal(primaryFile([{ name: 'x.h' }, { name: 'lib.c' }]), 'lib.c');
});

test('splitCodeFiles: a repeated file name is not treated as a project', () => {
  assert.equal(splitCodeFiles('// file: a.c\nx\n// file: a.c\ny\n'), null);
});

test('githubSlug matches GitHub anchors used in the book', () => {
  assert.equal(githubSlug('Lesson Exercises & Challenges'), 'lesson-exercises--challenges');
  assert.equal(githubSlug('6. What "instrumenting a fuzzing target" means'), '6-what-instrumenting-a-fuzzing-target-means');
  assert.equal(githubSlug('Implementing a `break`'.replace(/`/g, '')), 'implementing-a-break');
  assert.equal(githubSlug('The allocator: Scudo'), 'the-allocator-scudo');
});

// ---- C course Module 10 ----

const md = fs.readFileSync(path.join(ROOT, 'c_course', '10_preprocessor_makefiles_libs.md'), 'utf8').replace(/\r\n?/g, '\n');
const cBlocks = [...md.matchAll(/```c\n([\s\S]*?)```/g)].map(m => m[1]);
const projects = cBlocks.map(splitCodeFiles).filter(Boolean).map(files => Object.fromEntries(files.map(f => [f.name, f.content])));
const project = (file) => projects.find(p => p[file]);
const run = (files) => { const b = compileC(files); assert.ok(b.ok, JSON.stringify(b.errors)); return runC(b); };
const errorsOf = (files) => compileC(files).errors.map(e => e.message).join('\n');

test('Module 10: the greet project runs, and each break gives the error the table names', () => {
  const p = project('greet.h');
  assert.ok(p, 'greet project block missing');
  assert.equal(run(p).stdout, 'Hello, Ada!\nHello, Linus!\ngreet() ran 2 times\n');
  assert.match(errorsOf({ ...p, 'main.c': p['main.c'].replace('#include "greet.h"\n', '') }), /undeclared function 'greet'/);
  const noImpl = { ...p };
  delete noImpl['greet.c'];
  assert.match(errorsOf(noImpl), /undefined reference to 'greet'/);
  assert.match(errorsOf({
    ...p,
    'greet.h': p['greet.h'].replace('extern int greet_count;', 'int greet_count = 0;'),
    'greet.c': p['greet.c'].replace('int greet_count = 0;', ''),
  }), /multiple definition of 'greet_count'/);
});

test('Module 10: the double-include project fails without a guard and builds with one', () => {
  const p = project('point.h');
  assert.match(errorsOf(p), /redefinition of 'struct point'/);
  const guarded = { ...p, 'point.h': `#ifndef POINT_H\n#define POINT_H\n${p['point.h']}#endif\n` };
  assert.equal(run(guarded).stdout, '4\n');
  assert.equal(run({ ...p, 'point.h': `#pragma once\n${p['point.h']}` }).stdout, '4\n');
});

test('Module 10: the DEBUG switch removes the LOG calls', () => {
  const src = cBlocks.find(b => b.includes('#define DEBUG'));
  assert.equal(run({ 'main.c': src }).stdout, '[debug] starting\n2 + 2 = 4\n[debug] done\n');
  assert.equal(run({ 'main.c': src.replace(/#define DEBUG.*\n/, '') }).stdout, '2 + 2 = 4\n');
});

test('Module 10: the toy fuzzer finds FUZZ only when instrumented, as the text shows', () => {
  const p = project('cov.h');
  const out = run(p).stdout;
  assert.match(out, /try {3}897: FUZZ reaches the bug!/);
  // The output quoted in the chapter must be the real output.
  const quoted = md.match(/```text\n(try {5}1: AAAY[\s\S]*?)```/)[1];
  assert.equal(out, quoted);
  const blind = run({ ...p, 'cov.h': p['cov.h'].replace('#define INSTRUMENT\n', '// #define INSTRUMENT\n') });
  assert.equal(blind.status, 'terminated'); // exited normally, not a timeout
  assert.equal(blind.stdout, 'gave up after 5000 tries\n');
});
