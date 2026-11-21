// C toolchain tests: each program is compiled to ARM64, run on the simulator,
// and its output compared with what a real AArch64 Linux build produces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileC, runC, formatDiagnostics } from '../src/cc/toolchain.js';

function run(src, opts = {}) {
  const files = typeof src === 'string' ? { 'main.c': src } : src;
  const build = compileC(files);
  if (!build.ok) return { build, diag: formatDiagnostics(build) };
  return { build, r: runC(build, opts), diag: formatDiagnostics(build) };
}

function expectOutput(name, src, stdout, { exit = 0, ...opts } = {}) {
  test(name, () => {
    const { r, diag, build } = run(src, opts);
    assert.ok(build.ok, diag);
    assert.equal(r.fault, null, `unexpected fault: ${r.stderr}`);
    assert.equal(r.stdout, stdout);
    assert.equal(r.exitCode, exit);
  });
}

const P = (body, pre = '') => String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
${pre}
int main(int argc, char **argv) {
${body}
}`;

expectOutput('integers, promotion and wraparound', P(String.raw`
  int i = 2147483647; i = i + 1;            /* wraps like the hardware */
  unsigned u = 0; u = u - 1;
  char c = 200;                              /* plain char is unsigned on AArch64 */
  signed char sc = 200;
  short s = 40000;
  long l = 1L << 40;
  printf("%d %u %d %d %d %ld\n", i, u, c, sc, s, l);
  printf("%d %d %d\n", 7 / 2, -7 / 2, -7 % 3);
  printf("%u %d\n", (unsigned)-1 / 2, (int)(unsigned char)-1);
  printf("%d\n", -1 < 0u);                   /* -1 converts to unsigned */
  return 0;`), '-2147483648 4294967295 200 -56 -25536 1099511627776\n3 -3 -1\n2147483647 255\n0\n');

expectOutput('floating point and casts', P(String.raw`
  float f = 0.1f; double d = 0.1;
  printf("%.10f %.10f\n", f, d);
  printf("%d %d %.2f %.3f\n", (int)3.99, (int)-3.99, 7 / 2.0, (float)1 / 3);
  double x = 1e308 * 10; printf("%f %d %.0f\n", x, x > 1e308, 1e22);
  printf("%g %e\n", 0.0001, 12345.678);
  int n = 10; double avg = (double)n / 4; printf("%.2f\n", avg);
  return 0;`), '0.1000000015 0.1000000000\n3 -3 3.50 0.333\ninf 1 10000000000000000000000\n0.0001 1.234568e+04\n2.50\n');

expectOutput('pointers, arrays and pointer arithmetic', P(String.raw`
  int a[5] = {10, 20, 30, 40, 50};
  int *p = a + 1;
  printf("%d %d %d %ld\n", *p, p[2], *(a + 4), (long)(&a[4] - p));
  int m[2][3] = {{1, 2, 3}, {4, 5, 6}};
  printf("%d %d %zu %zu\n", m[1][2], *(*(m + 1) + 1), sizeof m, sizeof m[0]);
  char s[] = "abc";
  printf("%zu %zu %c\n", sizeof s, strlen(s), *(s + 2));
  int *q = &a[0]; q += 2; *q = 99; printf("%d\n", a[2]);
  return 0;`), '20 40 50 3\n6 5 24 12\n4 3 c\n99\n');

expectOutput('structs, unions, typedef, enums', P(String.raw`
  printf("%zu %zu %zu\n", sizeof(struct A), sizeof(struct B), offsetof(struct A, c));
  Point p = {1, 2}; Point q = p; q.x = 10;
  printf("%d %d %d\n", p.x, q.x, add(p, q).y);
  union U u; u.i = 0x41424344; printf("%c%c\n", u.b[0], u.b[3]);
  enum Color c = GREEN; printf("%d %d\n", c, BLUE);
  struct A *pa = malloc(sizeof *pa); pa->c = 7; pa->d = 1.5; printf("%d %.1f\n", pa->c, pa->d); free(pa);
  return 0;`, String.raw`#include <stddef.h>
struct A { char a; int c; double d; };
struct B { char x; char y; };
typedef struct { int x, y; } Point;
Point add(Point a, Point b) { Point r = { a.x + b.x, a.y + b.y }; return r; }
union U { int i; char b[4]; };
enum Color { RED, GREEN = 5, BLUE };`), '16 2 4\n1 10 4\nDA\n5 6\n7 1.5\n');

expectOutput('control flow: switch fallthrough, goto, do-while, short-circuit', P(String.raw`
  for (int i = 0; i < 4; i++) {
    switch (i) { case 0: printf("zero "); case 1: printf("one "); break; default: printf("d%d ", i); }
  }
  printf("\n");
  int n = 0; do { n++; } while (n < 3); printf("%d\n", n);
  int k = 0; if (k != 0 && 10 / k > 1) printf("bad\n"); else printf("safe\n");
  int j = 0;
again: j++; if (j < 5) goto again; printf("%d\n", j);
  int x = 5; x += 3; x <<= 1; x %= 7; printf("%d %d\n", x, x++ + ++x);
  return 0;`), 'zero one one d2 d3 \n3\nsafe\n5\n2 6\n');

expectOutput('function pointers, qsort, bsearch, recursion', P(String.raw`
  int v[6] = {5, 2, 9, 1, 7, 3};
  qsort(v, 6, sizeof(int), cmp);
  for (int i = 0; i < 6; i++) printf("%d ", v[i]);
  int key = 7; int *hit = bsearch(&key, v, 6, sizeof(int), cmp);
  printf("| %ld\n", hit - v);
  int (*ops[2])(int, int) = { addi, muli };
  printf("%d %d %d\n", ops[0](3, 4), ops[1](3, 4), apply(muli, 5, 6));
  printf("%d\n", fact(10));
  return 0;`, String.raw`int cmp(const void *a, const void *b) { return *(const int *)a - *(const int *)b; }
int addi(int a, int b) { return a + b; }
int muli(int a, int b) { return a * b; }
int apply(int (*f)(int, int), int a, int b) { return f(a, b); }
int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }`), '1 2 3 5 7 9 | 4\n7 12 30\n3628800\n');

expectOutput('nine arguments (stack-passed) and mixed float args', P(String.raw`
  printf("%ld\n", sum9(1, 2, 3, 4, 5, 6, 7, 8, 9));
  printf("%.2f\n", mix(1, 2.5, 3, 4.5));
  return 0;`, String.raw`long sum9(long a, long b, long c, long d, long e, long f, long g, long h, long i) { return a+b+c+d+e+f+g+h+i*100; }
double mix(int a, double b, int c, double d) { return a + b + c + d; }`), '936\n11.00\n');

expectOutput('globals, statics and initializers', P(String.raw`
  printf("%d %s %s %d %c\n", counter(), names[1], greeting, table[2], *ptr);
  printf("%d %d\n", counter(), counter());
  return 0;`, String.raw`const char *names[] = {"ann", "bob", "cy"};
char greeting[] = "hey";
int table[4] = {1, 2, 3};
char *ptr = greeting + 1;
int counter(void) { static int n = 0; return ++n; }`), '1 bob hey 3 e\n2 3\n');

expectOutput('string functions', P(String.raw`
  char buf[32];
  snprintf(buf, sizeof buf, "%s-%04d", "id", 42);
  printf("%s %zu %d %s\n", buf, strlen(buf), strcmp("abc", "abd") < 0, strchr(buf, '-'));
  char *dup = strdup("copy"); dup[0] = 'C'; printf("%s\n", dup); free(dup);
  char line[] = "a,b,,c"; for (char *t = strtok(line, ","); t; t = strtok(NULL, ",")) printf("[%s]", t);
  printf("\n%ld %d\n", strtol("-0x1F", NULL, 16), atoi("  77xyz"));
  return 0;`), 'id-0042 7 1 -0042\nCopy\n[a][b][c]\n-31 77\n');

expectOutput('scanf and stdin', P(String.raw`
  int a, b; char name[16];
  if (scanf("%d %d %15s", &a, &b, name) != 3) return 1;
  printf("%s=%d\n", name, a * b);
  char line[64]; fgets(line, sizeof line, stdin); fgets(line, sizeof line, stdin);
  printf("line:%s", line);
  return 0;`), 'x=42\nline:second line\n', { stdin: '6 7 x\nsecond line\n' });

expectOutput('argc/argv', P(String.raw`
  for (int i = 1; i < argc; i++) printf("%d:%s ", i, argv[i]);
  printf("\n");
  return argc;`), '1:alpha 2:two words \n', { args: ['alpha', 'two words'], exit: 3 });

expectOutput('file I/O through the in-memory filesystem', P(String.raw`
  FILE *f = fopen("out.txt", "w");
  if (!f) { perror("fopen"); return 1; }
  fprintf(f, "line %d\n", 1); fputs("line 2\n", f); fclose(f);
  f = fopen("out.txt", "r");
  char buf[64]; int n = 0;
  while (fgets(buf, sizeof buf, f)) n++;
  fclose(f);
  FILE *g = fopen("missing.txt", "r");
  printf("%d %s\n", n, g == NULL ? "missing" : "found");
  if (!g) perror("fopen");
  int fd = open("in.bin", O_RDONLY); unsigned char hdr[4]; long got = read(fd, hdr, 4);
  struct stat st; fstat(fd, &st); close(fd);
  printf("%ld %02x%02x %ld\n", got, hdr[0], hdr[1], st.st_size);
  return 0;`, String.raw`#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>`), '2 missing\n4 7f44 6\n', { files: { 'in.bin': new Uint8Array([0x7f, 0x44, 0x42, 0x31, 0, 0]) } });

expectOutput('multiple translation units, headers, static linkage', {
  'main.c': String.raw`#include <stdio.h>
#include "counter.h"
static int helper(void) { return 100; }
int main(void) { inc(); inc(); printf("%d %d\n", get(), helper()); return 0; }`,
  'counter.h': String.raw`#ifndef COUNTER_H
#define COUNTER_H
void inc(void);
int get(void);
#endif`,
  'counter.c': String.raw`#include "counter.h"
#include "counter.h"
static int value;
static int helper(void) { return 1; }
void inc(void) { value += helper(); }
int get(void) { return value; }`,
}, '2 100\n');

expectOutput('preprocessor: function macros, stringify, conditionals', P(String.raw`
  printf("%d %d %s\n", SQ(1 + 2), MAX(3, 9), STR(hello world));
#if defined(DEBUG) || VERSION >= 2
  printf("v2\n");
#else
  printf("old\n");
#endif
  printf("%d\n", __LINE__ > 0);
  return 0;`, String.raw`#define SQ(x) ((x) * (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define STR(x) #x
#define VERSION 2`), '9 9 hello world\nv2\n1\n');

expectOutput('main without return statement returns 0', String.raw`#include <stdio.h>
int main(void) { puts("ok"); }`, 'ok\n');

expectOutput('exit code from exit()', String.raw`#include <stdlib.h>
int main(void) { exit(42); }`, '', { exit: 42 });

test("the book's C + assembly example links and agrees (section_1/recursion)", async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const files = {
    'fib.c': fs.readFileSync(path.join(root, 'section_1/recursion/fib.c'), 'utf8'),
    'fibo.s': fs.readFileSync(path.join(root, 'section_1/recursion/fibo.s'), 'utf8'),
  };
  const build = compileC(files);
  assert.ok(build.ok, formatDiagnostics(build));
  const r = runC(build);
  assert.equal(r.fault, null, r.stderr);
  const [c, asm] = r.stdout.split('In assembly language:\n');
  assert.equal(c.replace('In C:\n', ''), asm);
  assert.match(asm, /Fibonacci number 13 is: 233/);
});

test('every C sandbox sample builds and behaves as its title says', async () => {
  const { C_SAMPLES } = await import('../src/cc/samples.js');
  for (const s of C_SAMPLES) {
    const src = Object.fromEntries(Object.entries(s.files).filter(([n]) => /\.(c|h|s)$/.test(n)));
    const data = Object.fromEntries(Object.entries(s.files).filter(([n]) => !/\.(c|h|s)$/.test(n)));
    const build = compileC(src);
    assert.ok(build.ok, `${s.id}: ${formatDiagnostics(build)}`);
    const r = runC(build, { files: data, args: ['a'] });
    if (s.title.startsWith('Bug:')) assert.equal(r.fault?.signal, 'ASAN', `${s.id} should be caught by the heap checker`);
    else { assert.equal(r.fault, null, `${s.id}: ${r.stderr}`); assert.equal(r.exitCode, 0, `${s.id} exit`); assert.ok(r.stdout.length > 0, s.id); }
  }
});

// ---------------- runtime error detection ----------------

function expectFault(name, src, signal, pattern, opts = {}) {
  test(name, () => {
    const { r, diag, build } = run(src, opts);
    assert.ok(build.ok, diag);
    assert.ok(r.fault, `expected a fault, got exit ${r.exitCode} / ${r.stdout}`);
    assert.equal(r.fault.signal, signal);
    assert.match(r.stderr, pattern);
    if (opts.line) assert.equal(r.fault.cLocation?.line, opts.line);
  });
}

expectFault('NULL dereference is a SIGSEGV at the right C line', String.raw`#include <stddef.h>
int main(void) {
  int *p = NULL;
  return *p;
}`, 'SIGSEGV', /NULL/, { line: 4 });

expectFault('heap buffer overflow (ASan)', String.raw`#include <stdlib.h>
int main(void) {
  char *b = malloc(8);
  b[8] = 'x';
  free(b);
}`, 'ASAN', /heap-buffer-overflow.*\n.*0 bytes after the 8-byte region/, { line: 4 });

expectFault('use after free (ASan)', String.raw`#include <stdlib.h>
int main(void) {
  int *p = malloc(sizeof *p);
  free(p);
  return *p;
}`, 'ASAN', /heap-use-after-free/, { line: 5 });

expectFault('double free (ASan)', String.raw`#include <stdlib.h>
int main(void) { char *p = malloc(4); free(p); free(p); }`, 'ASAN', /double-free/);

expectFault('writing to a string literal', String.raw`int main(void) { char *s = "hi"; s[0] = 'H'; return 0; }`, 'SIGSEGV', /read-only/);

expectFault('assert failure', String.raw`#include <assert.h>
int main(void) { int x = 2; assert(x == 3); }`, 'SIGABRT', /Assertion `x == 3' failed/);

test('memory leaks are reported', () => {
  const { r } = run(String.raw`#include <stdlib.h>
int main(void) { malloc(10); void *p = malloc(20); free(p); return 0; }`);
  assert.equal(r.leaks.length, 1);
  assert.equal(r.leaks[0].size, 10n);
  assert.match(r.stderr, /LeakSanitizer: detected memory leaks/);
});

test('infinite loop is stopped', () => {
  const { r } = run('int main(void) { for (;;) {} }', { maxSteps: 100000 });
  assert.equal(r.status, 'timeout');
});

// ---------------- diagnostics ----------------

function expectError(name, src, pattern) {
  test(name, () => {
    const { build, diag } = run(src);
    assert.equal(build.ok, false, 'expected a compile error');
    assert.match(diag, pattern);
  });
}
function expectWarning(name, src, pattern) {
  test(name, () => {
    const { build, diag } = run(src);
    assert.ok(build.ok, diag);
    assert.match(diag, pattern);
  });
}

expectError('implicit function declaration is an error', 'int main(void) { printf("x"); }', /main\.c:1:18: error: call to undeclared function 'printf'.*stdio\.h/);
expectError('undeclared identifier', 'int main(void) { return y; }', /use of undeclared identifier 'y'/);
expectError('missing semicolon', 'int main(void) { int x = 1 return x; }', /expected ','/);
expectError('undefined reference at link time', 'int f(void);\nint main(void) { return f(); }', /undefined reference to 'f'/);
expectError('multiple definition', { 'a.c': 'int x = 1; int main(void) { return 0; }', 'b.c': 'int x = 2;' }, /multiple definition of 'x'/);
expectError('too few arguments', 'int f(int a, int b) { return a; }\nint main(void) { return f(1); }', /too few arguments/);
expectError('assigning to const', 'int main(void) { const int x = 1; x = 2; return x; }', /const-qualified/);
expectError('header not found', '#include "nope.h"\nint main(void) { return 0; }', /'nope\.h' file not found/);
expectWarning('printf format mismatch', '#include <stdio.h>\nint main(void) { long n = 5; printf("%d\\n", n); return 0; }', /format '%d' expects 'int'.*'long'/);
expectWarning('scanf missing &', '#include <stdio.h>\nint main(void) { int n; scanf("%d", n); return 0; }', /did you forget &/);
expectWarning('assignment in condition', 'int main(void) { int x = 0; if (x = 1) return 1; return 0; }', /did you mean '=='/);
expectWarning('returning address of local', 'int *f(void) { int x = 1; return &x; }\nint main(void) { return 0; }', /stack memory/);
