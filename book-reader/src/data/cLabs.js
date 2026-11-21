// C for Systems: graded labs.
//
// Each lab is compiled to ARM64 by the in-browser compiler and run on the
// simulator with heap checking (AddressSanitizer-style) and leak detection.
// Labs that ask for a function link the learner's file with a hidden test
// harness (hiddenFiles) that calls it with many inputs, including edge cases.
// `npm test` checks that every solution passes and every starter fails.

const R = String.raw;

const djb2 = (s) => { let h = 5381n; for (const c of new TextEncoder().encode(s)) h = BigInt.asUintN(64, h * 33n + BigInt(c)); return h; };

export const C_LABS = [
  {
    id: 'c-01-hello',
    title: 'Hello, ARM64',
    difficulty: 'Beginner',
    concept: 'compile, run, exit status',
    reference: 'c_course/01_machine_model_tooling.md',
    description: 'Make the program print exactly "Hello, ARM64!" followed by a newline, and exit with status 0. Then open the Assembly tab and find the call to puts or printf.',
    files: { 'main.c': R`#include <stdio.h>

int main(void) {
    printf("Hello, World");
    return 1;
}
` },
    solution: { 'main.c': R`#include <stdio.h>

int main(void) {
    printf("Hello, ARM64!\n");
    return 0;
}
` },
    hints: ['printf does not add a newline for you: end the string with \\n', 'The value returned from main becomes the exit status'],
    tests: [{ type: 'stdout', expected: 'Hello, ARM64!\n', description: 'prints exactly "Hello, ARM64!\\n"' }, { type: 'exitCode', expected: 0, description: 'exit status 0' }],
  },
  {
    id: 'c-02-format',
    title: 'Fix the format specifiers',
    difficulty: 'Beginner',
    concept: 'printf conversions must match argument types',
    reference: 'c_course/02_types_memory_bitwise.md',
    description: 'Every printf here uses the wrong conversion. Fix them so the output is exactly:\nbig=5000000000\nflags=0xdeadbeef\nratio=0.75\nname=kernel len=6\nThe compiler warnings point at each mistake: the lab requires a build with zero warnings.',
    files: { 'main.c': R`#include <stdio.h>
#include <string.h>

int main(void) {
    long big = 5000000000;
    unsigned int flags = 0xDEADBEEF;
    double ratio = 0.75;
    const char *name = "kernel";
    size_t len = strlen(name);

    printf("big=%d\n", big);
    printf("flags=%d\n", flags);
    printf("ratio=%d\n", ratio);
    printf("name=%c len=%d\n", name, len);
    return 0;
}
` },
    solution: { 'main.c': R`#include <stdio.h>
#include <string.h>

int main(void) {
    long big = 5000000000;
    unsigned int flags = 0xDEADBEEF;
    double ratio = 0.75;
    const char *name = "kernel";
    size_t len = strlen(name);

    printf("big=%ld\n", big);
    printf("flags=%#x\n", flags);
    printf("ratio=%.2f\n", ratio);
    printf("name=%s len=%zu\n", name, len);
    return 0;
}
` },
    hints: ['long needs %ld, size_t needs %zu', '%#x prints hex with a 0x prefix', 'Variadic doubles travel in d registers, ints in x registers: a wrong specifier reads the wrong register'],
    tests: [
      { type: 'stdout', expected: 'big=5000000000\nflags=0xdeadbeef\nratio=0.75\nname=kernel len=6\n', description: 'exact output' },
      { type: 'noWarnings', description: 'no compiler warnings' },
    ],
  },
  {
    id: 'c-03-average',
    title: 'Average without truncation',
    difficulty: 'Beginner',
    concept: 'integer division, casts, scanf return value',
    reference: 'c_course/02_types_memory_bitwise.md',
    description: 'Read integers from stdin until end of input. Print "count=N sum=S avg=A" with the average to 2 decimal places. If there are no numbers, print "no data" and exit with status 1. The starter truncates the average.',
    files: { 'main.c': R`#include <stdio.h>

int main(void) {
    int x, count = 0;
    long sum = 0;
    while (scanf("%d", &x) == 1) {
        sum += x;
        count++;
    }
    double avg = sum / count;
    printf("count=%d sum=%ld avg=%.2f\n", count, sum, avg);
    return 0;
}
` },
    solution: { 'main.c': R`#include <stdio.h>

int main(void) {
    int x, count = 0;
    long sum = 0;
    while (scanf("%d", &x) == 1) {
        sum += x;
        count++;
    }
    if (count == 0) {
        printf("no data\n");
        return 1;
    }
    double avg = (double)sum / count;
    printf("count=%d sum=%ld avg=%.2f\n", count, sum, avg);
    return 0;
}
` },
    hints: ['sum / count divides two integers before the result is converted to double', 'Cast one operand: (double)sum / count', 'Dividing by zero integers on ARM64 gives 0 instead of crashing - check count first anyway'],
    cases: (rng) => {
      const lists = [[1, 2], [10, 20, 25], [-3, 4], Array.from({ length: rng.int(5, 30) }, () => rng.int(-1000, 1000))];
      const out = lists.map(l => {
        const sum = l.reduce((a, b) => a + b, 0);
        return { name: `[${l.slice(0, 6).join(' ')}${l.length > 6 ? ' ...' : ''}]`, stdin: l.join(' ') + '\n', tests: [{ type: 'stdout', expected: `count=${l.length} sum=${sum} avg=${(sum / l.length).toFixed(2)}\n`, description: 'correct count, sum and average' }, { type: 'exitCode', expected: 0, description: 'exit status 0' }] };
      });
      out.push({ name: 'empty input', stdin: '', tests: [{ type: 'stdout', expected: 'no data\n', description: 'prints "no data"' }, { type: 'exitCode', expected: 1, description: 'exit status 1' }] });
      return out;
    },
  },
  {
    id: 'c-04-days',
    title: 'Days in a month',
    difficulty: 'Beginner',
    concept: 'switch, leap-year logic, function contracts',
    reference: 'c_course/03_control_flow_stack_frames.md',
    description: 'Implement days_in_month(month, year) in days.c. Months are 1-12; return -1 for anything else. February has 29 days in leap years: divisible by 4, except centuries, except every 400 years. A hidden test program calls your function with many inputs.',
    files: { 'days.c': R`int days_in_month(int month, int year) {
    // TODO
    return 30;
}
` },
    solution: { 'days.c': R`static int is_leap(int year) {
    return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}

int days_in_month(int month, int year) {
    switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
        return 31;
    case 4: case 6: case 9: case 11:
        return 30;
    case 2:
        return is_leap(year) ? 29 : 28;
    default:
        return -1;
    }
}
` },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
int days_in_month(int month, int year);
int main(void) {
    int years[] = {2023, 2024, 1900, 2000, 2100};
    for (int y = 0; y < 5; y++)
        for (int m = 0; m <= 13; m++)
            printf("%d/%d=%d\n", m, years[y], days_in_month(m, years[y]));
    return 0;
}
` },
    hints: ['A switch with grouped case labels keeps this readable', '1900 is not a leap year, 2000 is'],
    tests: [{
      type: 'stdout',
      description: 'all months of 2023, 2024, 1900, 2000, 2100 (and months 0 and 13)',
      expected: [2023, 2024, 1900, 2000, 2100].flatMap(y => Array.from({ length: 14 }, (_, m) => {
        const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
        const d = m < 1 || m > 12 ? -1 : m === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31;
        return `${m}/${y}=${d}\n`;
      })).join(''),
    }],
  },
  {
    id: 'c-05-prime',
    title: 'Test for a prime',
    difficulty: 'Beginner',
    concept: 'loops, early return, avoiding overflow',
    reference: 'c_course/03_control_flow_stack_frames.md',
    description: 'Implement int is_prime(long n) in prime.c: 1 if n is prime, else 0 (n can be negative, 0 or 1). It must be fast enough for n around 2 billion: only test divisors up to the square root.',
    files: { 'prime.c': R`int is_prime(long n) {
    return n % 2 != 0;
}
` },
    solution: { 'prime.c': R`int is_prime(long n) {
    if (n < 2) return 0;
    if (n % 2 == 0) return n == 2;
    for (long d = 3; d * d <= n; d += 2)
        if (n % d == 0) return 0;
    return 1;
}
` },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
int is_prime(long n);
int main(void) {
    for (long n = -2; n <= 60; n++) if (is_prime(n)) printf("%ld ", n);
    printf("\n%d %d %d %d\n", is_prime(1000003), is_prime(1000001), is_prime(2147483647), is_prime(2147483649L));
    return 0;
}
` },
    hints: ['Handle n < 2 and even numbers first', 'Loop while d * d <= n'],
    maxSteps: 30_000_000,
    tests: [{ type: 'stdout', expected: '2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 53 59 \n1 0 1 0\n', description: 'correct primes, including large ones' }],
  },
  {
    id: 'c-06-swap',
    title: 'Swap two variables',
    difficulty: 'Beginner',
    concept: 'pointers: changing the caller\'s variables',
    reference: 'c_course/04_pointers_and_memory.md',
    description: 'swap() in swap.c should exchange the caller\'s two ints. The starter swaps its own copies, which the caller never sees. Change the signature and body so swap(&x, &y) works.',
    files: { 'swap.c': R`void swap(int a, int b) {
    int t = a;
    a = b;
    b = t;
}
` },
    solution: { 'swap.c': R`void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}
` },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
void swap(int *a, int *b);
int main(void) {
    int x = 3, y = -7;
    swap(&x, &y);
    printf("%d %d\n", x, y);
    int v[3] = {1, 2, 3};
    swap(&v[0], &v[2]);
    swap(&v[1], &v[1]);
    printf("%d %d %d\n", v[0], v[1], v[2]);
    return 0;
}
` },
    hints: ['Arguments are passed by value: a and b are copies', 'Take int * parameters and assign through them'],
    tests: [{ type: 'stdout', expected: '-7 3\n3 2 1\n', description: 'values are swapped in the caller' }],
  },
  {
    id: 'c-07-count-range',
    title: 'Count values in a range',
    difficulty: 'Beginner',
    concept: 'arrays decay to pointers; bounds are not checked',
    reference: 'c_course/04_pointers_and_memory.md',
    description: 'count_in_range(v, n, lo, hi) returns how many of the n ints at v are >= lo and <= hi. When n is 0, v may be NULL. The test arrays live on the heap, so reading one element too many is caught.',
    files: { 'count.c': R`#include <stddef.h>

size_t count_in_range(const int *v, size_t n, int lo, int hi) {
    size_t count = 0;
    for (size_t i = 0; i <= n; i++)
        if (v[i] >= lo && v[i] <= hi)
            count++;
    return count;
}
` },
    solution: { 'count.c': R`#include <stddef.h>

size_t count_in_range(const int *v, size_t n, int lo, int hi) {
    size_t count = 0;
    for (size_t i = 0; i < n; i++)
        if (v[i] >= lo && v[i] <= hi)
            count++;
    return count;
}
` },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
#include <stdlib.h>
size_t count_in_range(const int *v, size_t n, int lo, int hi);
int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    int *v = n ? malloc(n * sizeof *v) : NULL;
    for (int i = 0; i < n; i++) scanf("%d", &v[i]);
    int lo, hi;
    scanf("%d %d", &lo, &hi);
    printf("%zu\n", count_in_range(v, n, lo, hi));
    free(v);
    return 0;
}
` },
    hints: ['A loop over n elements uses i < n, not i <= n', 'With n == 0 the loop body must never run'],
    cases: (rng) => {
      const mk = (v, lo, hi) => ({ name: `n=${v.length} [${lo}, ${hi}]`, stdin: `${v.length} ${v.join(' ')} ${lo} ${hi}\n`, tests: [{ type: 'stdout', expected: `${v.filter(x => x >= lo && x <= hi).length}\n`, description: 'correct count' }] });
      return [mk([1, 5, 10], 1, 10), mk([], 0, 100), mk([-5, -1, 0, 3], -1, 0), mk(Array.from({ length: 40 }, () => rng.int(-50, 50)), -10, 10)];
    },
  },
  {
    id: 'c-08-reverse',
    title: 'Reverse a string in place',
    difficulty: 'Intermediate',
    concept: 'strings, the NUL terminator, off-by-one errors',
    reference: 'c_course/05_strings_and_memory_safety.md',
    description: 'reverse(s) reverses the characters of s in place. The starter swaps the terminating \'\\0\' to the front, so every string comes out empty. Handle "", single characters, even and odd lengths.',
    files: { 'reverse.c': R`#include <string.h>

void reverse(char *s) {
    size_t i = 0, j = strlen(s);
    while (i < j) {
        char t = s[i];
        s[i] = s[j];
        s[j] = t;
        i++;
        j--;
    }
}
` },
    solution: { 'reverse.c': R`#include <string.h>

void reverse(char *s) {
    size_t n = strlen(s);
    if (n < 2) return;
    size_t i = 0, j = n - 1;
    while (i < j) {
        char t = s[i];
        s[i] = s[j];
        s[j] = t;
        i++;
        j--;
    }
}
` },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
void reverse(char *s);
int main(void) {
    const char *in[] = {"", "a", "ab", "hello", "racecar!", "ARM64 rocks"};
    for (int i = 0; i < 6; i++) {
        char *s = strdup(in[i]);
        reverse(s);
        printf("[%s]\n", s);
        free(s);
    }
    return 0;
}
` },
    hints: ['strlen(s) is the index of the terminator, not of the last character', 'Careful: size_t is unsigned, so n - 1 when n is 0 is a huge number'],
    tests: [{ type: 'stdout', expected: '[]\n[a]\n[ba]\n[olleh]\n[!racecar]\n[skcor 46MRA]\n', description: 'all strings reversed' }],
  },
  {
    id: 'c-09-struct-heap',
    title: 'Build a struct on the heap',
    difficulty: 'Intermediate',
    concept: 'malloc lifetime vs. stack lifetime, bounded copies',
    reference: 'c_course/07_heap_dynamic_memory.md',
    description: 'person_new(name, age) must return a heap-allocated person_t that outlives the call, or NULL when the name does not fit in name[32] (including its terminator) or malloc fails. person_free releases it. The starter returns a pointer to a stack variable.',
    files: {
      'person.h': R`#ifndef PERSON_H
#define PERSON_H

typedef struct {
    char name[32];
    int age;
} person_t;

person_t *person_new(const char *name, int age);
void person_free(person_t *p);

#endif
`,
      'person.c': R`#include <string.h>
#include "person.h"

person_t *person_new(const char *name, int age) {
    person_t p;
    strcpy(p.name, name);
    p.age = age;
    return &p;
}

void person_free(person_t *p) {
}
`,
    },
    solution: {
      'person.h': R`#ifndef PERSON_H
#define PERSON_H

typedef struct {
    char name[32];
    int age;
} person_t;

person_t *person_new(const char *name, int age);
void person_free(person_t *p);

#endif
`,
      'person.c': R`#include <stdlib.h>
#include <string.h>
#include "person.h"

person_t *person_new(const char *name, int age) {
    if (strlen(name) >= sizeof(((person_t *)0)->name))
        return NULL;
    person_t *p = malloc(sizeof *p);
    if (p == NULL)
        return NULL;
    strcpy(p->name, name);
    p->age = age;
    return p;
}

void person_free(person_t *p) {
    free(p);
}
`,
    },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
#include "person.h"
int main(void) {
    person_t *a = person_new("Ada", 36);
    person_t *b = person_new("Linus", 28);
    printf("%s %d / %s %d\n", a->name, a->age, b->name, b->age);
    person_t *c = person_new("a name that is far too long to fit in 32", 1);
    person_t *d = person_new("exactly thirty-one characters!!", 2);
    printf("%s %s\n", c == NULL ? "NULL" : "not NULL", d == NULL ? "NULL" : d->name);
    person_free(a); person_free(b); person_free(d);
    return 0;
}
` },
    hints: ['A local variable dies when the function returns', 'malloc(sizeof *p) allocates exactly one person_t', 'strlen(name) must be <= 31'],
    tests: [
      { type: 'stdout', expected: 'Ada 36 / Linus 28\nNULL exactly thirty-one characters!!\n', description: 'people survive the call; long names are rejected' },
      { type: 'noLeaks', description: 'person_free releases everything' },
    ],
  },
  {
    id: 'c-10-vector',
    title: 'Grow an array',
    difficulty: 'Intermediate',
    concept: 'realloc, capacity doubling, pointer to struct',
    reference: 'c_course/07_heap_dynamic_memory.md',
    description: 'Implement vec_push (append, growing the buffer by doubling: 0 -> 4 -> 8 -> ...) and vec_free in vec.c. Return 0 on success and -1 if realloc fails, leaving the vector unchanged. The hidden test pushes 1000 values.',
    files: {
      'vec.h': R`#ifndef VEC_H
#define VEC_H
#include <stddef.h>

typedef struct {
    int *data;
    size_t len;
    size_t cap;
} vec_t;

int vec_push(vec_t *v, int value);
void vec_free(vec_t *v);

#endif
`,
      'vec.c': R`#include <stdlib.h>
#include "vec.h"

int vec_push(vec_t *v, int value) {
    if (v->data == NULL)
        v->data = malloc(4 * sizeof(int));
    v->data[v->len++] = value;
    return 0;
}

void vec_free(vec_t *v) {
}
`,
    },
    solution: {
      'vec.h': R`#ifndef VEC_H
#define VEC_H
#include <stddef.h>

typedef struct {
    int *data;
    size_t len;
    size_t cap;
} vec_t;

int vec_push(vec_t *v, int value);
void vec_free(vec_t *v);

#endif
`,
      'vec.c': R`#include <stdlib.h>
#include "vec.h"

int vec_push(vec_t *v, int value) {
    if (v->len == v->cap) {
        size_t cap = v->cap ? v->cap * 2 : 4;
        int *p = realloc(v->data, cap * sizeof *p);
        if (p == NULL)
            return -1;
        v->data = p;
        v->cap = cap;
    }
    v->data[v->len++] = value;
    return 0;
}

void vec_free(vec_t *v) {
    free(v->data);
    v->data = NULL;
    v->len = v->cap = 0;
}
`,
    },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
#include "vec.h"
int main(void) {
    vec_t v = {0};
    long sum = 0;
    for (int i = 0; i < 1000; i++) if (vec_push(&v, i) != 0) { puts("push failed"); return 1; }
    for (size_t i = 0; i < v.len; i++) sum += v.data[i];
    printf("len=%zu cap=%zu sum=%ld\n", v.len, v.cap, sum);
    vec_free(&v);
    printf("after free: len=%zu data=%s\n", v.len, v.data ? "set" : "NULL");
    return 0;
}
` },
    hints: ['Grow before writing when len == cap', 'Assign realloc\'s result to a temporary: on failure the old block is still valid', 'Reset the fields in vec_free so the vector can be reused'],
    maxSteps: 20_000_000,
    tests: [{ type: 'stdout', expected: 'len=1000 cap=1024 sum=499500\nafter free: len=0 data=NULL\n', description: '1000 values, doubling capacity' }, { type: 'noLeaks', description: 'no leaks' }],
  },
  {
    id: 'c-11-fix-leak',
    title: 'Fix a leak',
    difficulty: 'Intermediate',
    concept: 'ownership: who frees what',
    reference: 'c_course/07_heap_dynamic_memory.md',
    description: 'This program reads words from stdin into a linked list and prints them in reverse. It prints the right thing but leaks every node and every word. Fix it so it frees everything, and keep the output identical.',
    files: { 'main.c': R`#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct node {
    char *word;
    struct node *next;
};

int main(void) {
    struct node *head = NULL;
    char buf[64];
    while (scanf("%63s", buf) == 1) {
        struct node *n = malloc(sizeof *n);
        n->word = strdup(buf);
        n->next = head;
        head = n;
    }
    for (struct node *n = head; n != NULL; n = n->next)
        printf("%s\n", n->word);
    return 0;
}
` },
    solution: { 'main.c': R`#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct node {
    char *word;
    struct node *next;
};

int main(void) {
    struct node *head = NULL;
    char buf[64];
    while (scanf("%63s", buf) == 1) {
        struct node *n = malloc(sizeof *n);
        if (n == NULL) return 1;
        n->word = strdup(buf);
        n->next = head;
        head = n;
    }
    for (struct node *n = head; n != NULL; n = n->next)
        printf("%s\n", n->word);
    while (head != NULL) {
        struct node *next = head->next;
        free(head->word);
        free(head);
        head = next;
    }
    return 0;
}
` },
    hints: ['Each node owns two allocations: the node and its strdup\'d word', 'Save head->next before freeing head (using it after free is a use-after-free)'],
    cases: [
      { name: 'three words', stdin: 'alpha beta gamma\n', tests: [{ type: 'stdout', expected: 'gamma\nbeta\nalpha\n', description: 'same output' }, { type: 'noLeaks', description: 'no leaks' }] },
      { name: 'no input', stdin: '', tests: [{ type: 'stdout', expected: '', description: 'prints nothing' }, { type: 'noLeaks', description: 'no leaks' }] },
    ],
  },
  {
    id: 'c-12-file-size',
    title: 'Print a file\'s size',
    difficulty: 'Intermediate',
    concept: 'argv, fopen/fseek/ftell or stat, errors to stderr',
    reference: 'c_course/09_posix_system_calls.md',
    description: 'Usage: ./a.out FILE. Print "FILE: N bytes". If no argument is given, print a usage message to stderr and exit 2. If the file cannot be opened, print an error mentioning the file name to stderr and exit 1. The sandbox has a small in-memory filesystem: add files as tabs to try it.',
    files: { 'main.c': R`#include <stdio.h>

int main(int argc, char **argv) {
    FILE *f = fopen(argv[1], "rb");
    long n = 0;
    while (fgetc(f) != EOF) n++;
    printf("%s: %ld bytes\n", argv[1], n);
    return 0;
}
` },
    solution: { 'main.c': R`#include <stdio.h>

int main(int argc, char **argv) {
    if (argc != 2) {
        fprintf(stderr, "usage: %s FILE\n", argv[0]);
        return 2;
    }
    FILE *f = fopen(argv[1], "rb");
    if (f == NULL) {
        perror(argv[1]);
        return 1;
    }
    if (fseek(f, 0, SEEK_END) != 0) {
        perror("fseek");
        fclose(f);
        return 1;
    }
    long n = ftell(f);
    fclose(f);
    printf("%s: %ld bytes\n", argv[1], n);
    return 0;
}
` },
    hints: ['Check argc before touching argv[1]', 'fopen returns NULL on failure and sets errno; perror prints the reason', 'Remember to fclose'],
    cases: (rng) => {
      const n = rng.int(100, 5000);
      return [
        { name: 'notes.txt', args: ['notes.txt'], files: { 'notes.txt': 'hello\nworld\n' }, tests: [{ type: 'stdout', expected: 'notes.txt: 12 bytes\n', description: 'correct size' }, { type: 'exitCode', expected: 0, description: 'exit 0' }] },
        { name: `blob.bin (${n} bytes)`, args: ['blob.bin'], files: { 'blob.bin': new Uint8Array(n).fill(0x41) }, tests: [{ type: 'stdout', expected: `blob.bin: ${n} bytes\n`, description: 'correct size' }] },
        { name: 'empty file', args: ['empty'], files: { empty: '' }, tests: [{ type: 'stdout', expected: 'empty: 0 bytes\n', description: 'zero bytes' }] },
        { name: 'missing file', args: ['nope.txt'], tests: [{ type: 'stdout', expected: '', description: 'nothing on stdout' }, { type: 'stderr', expected: 'nope.txt', description: 'error names the file' }, { type: 'exitCode', expected: 1, description: 'exit 1' }] },
        { name: 'no arguments', args: [], tests: [{ type: 'stderrNotEmpty', description: 'usage on stderr' }, { type: 'exitCode', expected: 2, description: 'exit 2' }] },
      ];
    },
  },
  {
    id: 'c-13-validate-header',
    title: 'Validate a file header (untrusted input)',
    difficulty: 'Advanced',
    concept: 'parsing attacker-controlled bytes safely',
    reference: 'c_course/12_capstone_binary_protocol_parser.md',
    description: 'db_validate(buf, len) checks a database file (Capstone 2 format): 16-byte header = magic "\\x7FDB1", u16 version (must be 1), u16 record_count, u32 file_size, u32 checksum, all little-endian, followed by record_count 48-byte records. Return 0 if valid; -1 if shorter than a header; -2 bad magic; -3 bad version; -4 if file_size != len; -5 if 16 + record_count * 48 != len. Never read outside buf: the tests include truncated and lying files, allocated exactly to size.',
    files: { 'validate.c': R`#include <stddef.h>
#include <stdint.h>
#include <string.h>

int db_validate(const unsigned char *buf, size_t len) {
    if (memcmp(buf, "\x7f" "DB1", 4) != 0)
        return -2;
    uint16_t count = buf[6] | buf[7] << 8;
    for (int i = 0; i < count; i++) {
        // pretend to look at each record
        volatile unsigned char first = buf[16 + i * 48];
        (void)first;
    }
    return 0;
}
` },
    solution: { 'validate.c': R`#include <stddef.h>
#include <stdint.h>
#include <string.h>

static uint32_t rd16(const unsigned char *p) { return (uint32_t)p[0] | (uint32_t)p[1] << 8; }
static uint32_t rd32(const unsigned char *p) { return rd16(p) | rd16(p + 2) << 16; }

int db_validate(const unsigned char *buf, size_t len) {
    if (len < 16)
        return -1;
    if (memcmp(buf, "\x7f" "DB1", 4) != 0)
        return -2;
    if (rd16(buf + 4) != 1)
        return -3;
    if (rd32(buf + 8) != len)
        return -4;
    if (16 + (size_t)rd16(buf + 6) * 48 != len)
        return -5;
    return 0;
}
` },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int db_validate(const unsigned char *buf, size_t len);
int main(int argc, char **argv) {
    FILE *f = fopen(argv[1], "rb");
    if (!f) return 99;
    unsigned char tmp[4096];
    size_t n = fread(tmp, 1, sizeof tmp, f);
    fclose(f);
    unsigned char *buf = malloc(n ? n : 1);   /* exactly n bytes: reading past is caught */
    memcpy(buf, tmp, n);
    printf("%d\n", db_validate(buf, n));
    free(buf);
    return 0;
}
` },
    hints: ['Check len before reading any header field', 'Read multi-byte fields byte by byte (little-endian), never by casting the pointer: it may be misaligned', 'Do the size arithmetic in size_t so a large record_count cannot overflow'],
    cases: () => {
      const header = (count, version = 1, magic = [0x7f, 0x44, 0x42, 0x31], extraLen = 0, fsOverride) => {
        const len = 16 + count * 48 + extraLen;
        const b = new Uint8Array(len);
        b.set(magic, 0);
        b[4] = version & 255; b[5] = version >> 8;
        b[6] = count & 255; b[7] = count >> 8;
        const fs = fsOverride ?? len;
        b[8] = fs & 255; b[9] = (fs >> 8) & 255; b[10] = (fs >> 16) & 255; b[11] = (fs >>> 24) & 255;
        return b;
      };
      const mk = (name, bytes, code) => ({ name, args: ['db.bin'], files: { 'db.bin': bytes }, tests: [{ type: 'stdout', expected: `${code}\n`, description: `returns ${code}` }] });
      const lying = header(0); lying[6] = 200; // claims 200 records, has none
      const fixed = new Uint8Array(lying); fixed[8] = 16;
      return [
        mk('valid, 2 records', header(2), 0),
        mk('valid, 0 records', header(0), 0),
        mk('empty file', new Uint8Array(0), -1),
        mk('truncated header (7 bytes)', header(0).slice(0, 7), -1),
        mk('bad magic', header(1, 1, [0x7f, 0x45, 0x4c, 0x46]), -2),
        mk('version 2', header(1, 2), -3),
        mk('file_size field lies', header(1, 1, undefined, 0, 999), -4),
        mk('record_count lies (claims 200 records)', fixed, -5),
      ];
    },
  },
  {
    id: 'c-14-kv-put-get',
    title: 'Key-value store: put and get',
    difficulty: 'Advanced',
    concept: 'hash tables with linear probing, owning copies of keys',
    reference: 'c_course/11_capstone_kv_store.md',
    description: 'Implement kv_init, kv_put, kv_get and kv_free in kv.c (see kv.h). Use kv_hash(key) % KV_CAP as the first slot and probe linearly (wrapping around) on collisions. kv_put stores its own copy of the key (strdup), updates the value if the key exists, and returns -1 when the table is full. kv_free releases every key.',
    files: {
      'kv.h': R`#ifndef KV_H
#define KV_H
#include <stddef.h>

#define KV_CAP 16

typedef struct {
    char *key;      /* NULL = empty slot */
    int value;
} kv_entry;

typedef struct {
    kv_entry slots[KV_CAP];
    size_t count;
} kv_t;

unsigned long kv_hash(const char *s);
void kv_init(kv_t *kv);
int kv_put(kv_t *kv, const char *key, int value);   /* 0 ok, -1 full or out of memory */
int kv_get(const kv_t *kv, const char *key, int *out); /* 0 found, -1 missing */
void kv_free(kv_t *kv);

#endif
`,
      'kv.c': R`#include <stdlib.h>
#include <string.h>
#include "kv.h"

/* djb2 */
unsigned long kv_hash(const char *s) {
    unsigned long h = 5381;
    while (*s) h = h * 33 + (unsigned char)*s++;
    return h;
}

void kv_init(kv_t *kv) {
    /* TODO */
}

int kv_put(kv_t *kv, const char *key, int value) {
    /* TODO */
    return -1;
}

int kv_get(const kv_t *kv, const char *key, int *out) {
    /* TODO */
    return -1;
}

void kv_free(kv_t *kv) {
    /* TODO */
}
`,
    },
    solution: {
      'kv.h': null, // same as starter
      'kv.c': R`#include <stdlib.h>
#include <string.h>
#include "kv.h"

/* djb2 */
unsigned long kv_hash(const char *s) {
    unsigned long h = 5381;
    while (*s) h = h * 33 + (unsigned char)*s++;
    return h;
}

void kv_init(kv_t *kv) {
    for (size_t i = 0; i < KV_CAP; i++) kv->slots[i].key = NULL;
    kv->count = 0;
}

static long find(const kv_t *kv, const char *key) {
    size_t i = kv_hash(key) % KV_CAP;
    for (size_t n = 0; n < KV_CAP; n++, i = (i + 1) % KV_CAP) {
        if (kv->slots[i].key == NULL) return -1;
        if (strcmp(kv->slots[i].key, key) == 0) return (long)i;
    }
    return -1;
}

int kv_put(kv_t *kv, const char *key, int value) {
    long at = find(kv, key);
    if (at >= 0) { kv->slots[at].value = value; return 0; }
    if (kv->count == KV_CAP) return -1;
    size_t i = kv_hash(key) % KV_CAP;
    while (kv->slots[i].key != NULL) i = (i + 1) % KV_CAP;
    char *copy = strdup(key);
    if (copy == NULL) return -1;
    kv->slots[i].key = copy;
    kv->slots[i].value = value;
    kv->count++;
    return 0;
}

int kv_get(const kv_t *kv, const char *key, int *out) {
    long at = find(kv, key);
    if (at < 0) return -1;
    *out = kv->slots[at].value;
    return 0;
}

void kv_free(kv_t *kv) {
    for (size_t i = 0; i < KV_CAP; i++) {
        free(kv->slots[i].key);
        kv->slots[i].key = NULL;
    }
    kv->count = 0;
}
`,
    },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
#include <string.h>
#include "kv.h"
int main(void) {
    kv_t kv;
    kv_init(&kv);
    char key[16];
    for (int i = 0; i < 12; i++) { snprintf(key, sizeof key, "key%d", i); if (kv_put(&kv, key, i * 10) != 0) printf("put %s failed\n", key); }
    kv_put(&kv, "key3", 333);          /* update, not a new entry */
    strcpy(key, "key5");                /* the caller's buffer changes: the table must own its copy */
    int v, miss = 0, sum = 0;
    for (int i = 0; i < 12; i++) { snprintf(key, sizeof key, "key%d", i); if (kv_get(&kv, key, &v) == 0) sum += v; else miss++; }
    printf("count=%zu sum=%d miss=%d\n", kv.count, sum, miss);
    printf("absent=%d\n", kv_get(&kv, "nope", &v));
    for (int i = 12; i < 20; i++) { snprintf(key, sizeof key, "key%d", i); kv_put(&kv, key, i); }
    printf("full: count=%zu next=%d\n", kv.count, kv_put(&kv, "overflow", 1));
    kv_free(&kv);
    return 0;
}
` },
    hints: ['Probe: i = (i + 1) % KV_CAP until you find the key or an empty slot', 'Check for an existing key before inserting', 'The table must strdup keys: the caller may reuse its buffer'],
    maxSteps: 20_000_000,
    tests: [
      { type: 'stdout', expected: `count=12 sum=${[...Array(12).keys()].reduce((a, i) => a + (i === 3 ? 333 : i * 10), 0)} miss=0\nabsent=-1\nfull: count=16 next=-1\n`, description: 'puts, updates, gets, collisions and a full table' },
      { type: 'noLeaks', description: 'kv_free releases every key' },
    ],
  },
  {
    id: 'c-15-kv-delete',
    title: 'Key-value store: delete (tombstones)',
    difficulty: 'Advanced',
    concept: 'why deleting from a probed table needs tombstones',
    reference: 'c_course/11_capstone_kv_store.md',
    description: 'Add kv_delete(kv, key) (0 deleted, -1 missing). Simply emptying the slot breaks lookups of keys that were placed after it in the same probe chain. Mark deleted slots with the TOMBSTONE pointer instead: lookups skip tombstones, inserts may reuse them. The starter has a working put/get; its delete just empties the slot.',
    files: {
      'kv.h': R`#ifndef KV_H
#define KV_H
#include <stddef.h>

#define KV_CAP 8
#define TOMBSTONE ((char *)1)   /* marks a deleted slot */

typedef struct {
    char *key;      /* NULL = never used, TOMBSTONE = deleted */
    int value;
} kv_entry;

typedef struct {
    kv_entry slots[KV_CAP];
    size_t count;
} kv_t;

unsigned long kv_hash(const char *s);
void kv_init(kv_t *kv);
int kv_put(kv_t *kv, const char *key, int value);
int kv_get(const kv_t *kv, const char *key, int *out);
int kv_delete(kv_t *kv, const char *key);
void kv_free(kv_t *kv);

#endif
`,
      'kv.c': R`#include <stdlib.h>
#include <string.h>
#include "kv.h"

unsigned long kv_hash(const char *s) {
    unsigned long h = 5381;
    while (*s) h = h * 33 + (unsigned char)*s++;
    return h;
}

void kv_init(kv_t *kv) {
    for (size_t i = 0; i < KV_CAP; i++) kv->slots[i].key = NULL;
    kv->count = 0;
}

static long find(const kv_t *kv, const char *key) {
    size_t i = kv_hash(key) % KV_CAP;
    for (size_t n = 0; n < KV_CAP; n++, i = (i + 1) % KV_CAP) {
        if (kv->slots[i].key == NULL) return -1;
        if (strcmp(kv->slots[i].key, key) == 0) return (long)i;
    }
    return -1;
}

int kv_put(kv_t *kv, const char *key, int value) {
    long at = find(kv, key);
    if (at >= 0) { kv->slots[at].value = value; return 0; }
    if (kv->count == KV_CAP) return -1;
    size_t i = kv_hash(key) % KV_CAP;
    while (kv->slots[i].key != NULL) i = (i + 1) % KV_CAP;
    kv->slots[i].key = strdup(key);
    kv->slots[i].value = value;
    kv->count++;
    return 0;
}

int kv_get(const kv_t *kv, const char *key, int *out) {
    long at = find(kv, key);
    if (at < 0) return -1;
    *out = kv->slots[at].value;
    return 0;
}

int kv_delete(kv_t *kv, const char *key) {
    long at = find(kv, key);
    if (at < 0) return -1;
    kv->slots[at].key = NULL;
    kv->count--;
    return 0;
}

void kv_free(kv_t *kv) {
    for (size_t i = 0; i < KV_CAP; i++) free(kv->slots[i].key);
    kv->count = 0;
}
`,
    },
    solution: {
      'kv.h': null,
      'kv.c': R`#include <stdlib.h>
#include <string.h>
#include "kv.h"

unsigned long kv_hash(const char *s) {
    unsigned long h = 5381;
    while (*s) h = h * 33 + (unsigned char)*s++;
    return h;
}

void kv_init(kv_t *kv) {
    for (size_t i = 0; i < KV_CAP; i++) kv->slots[i].key = NULL;
    kv->count = 0;
}

static long find(const kv_t *kv, const char *key) {
    size_t i = kv_hash(key) % KV_CAP;
    for (size_t n = 0; n < KV_CAP; n++, i = (i + 1) % KV_CAP) {
        char *k = kv->slots[i].key;
        if (k == NULL) return -1;
        if (k != TOMBSTONE && strcmp(k, key) == 0) return (long)i;
    }
    return -1;
}

int kv_put(kv_t *kv, const char *key, int value) {
    long at = find(kv, key);
    if (at >= 0) { kv->slots[at].value = value; return 0; }
    if (kv->count == KV_CAP) return -1;
    size_t i = kv_hash(key) % KV_CAP;
    while (kv->slots[i].key != NULL && kv->slots[i].key != TOMBSTONE) i = (i + 1) % KV_CAP;
    char *copy = strdup(key);
    if (copy == NULL) return -1;
    kv->slots[i].key = copy;
    kv->slots[i].value = value;
    kv->count++;
    return 0;
}

int kv_get(const kv_t *kv, const char *key, int *out) {
    long at = find(kv, key);
    if (at < 0) return -1;
    *out = kv->slots[at].value;
    return 0;
}

int kv_delete(kv_t *kv, const char *key) {
    long at = find(kv, key);
    if (at < 0) return -1;
    free(kv->slots[at].key);
    kv->slots[at].key = TOMBSTONE;
    kv->count--;
    return 0;
}

void kv_free(kv_t *kv) {
    for (size_t i = 0; i < KV_CAP; i++) {
        if (kv->slots[i].key != TOMBSTONE) free(kv->slots[i].key);
        kv->slots[i].key = NULL;
    }
    kv->count = 0;
}
`,
    },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
#include "kv.h"
int main(void) {
    kv_t kv; kv_init(&kv);
    /* "a", "i" and "q" all hash to the same slot (djb2 % 8), forming one probe chain */
    kv_put(&kv, "a", 1); kv_put(&kv, "i", 2); kv_put(&kv, "q", 3);
    int v = -1;
    printf("del i=%d\n", kv_delete(&kv, "i"));
    printf("get q=%d", kv_get(&kv, "q", &v)); printf(" v=%d\n", v);
    printf("del i again=%d count=%zu\n", kv_delete(&kv, "i"), kv.count);
    kv_put(&kv, "y", 4);
    for (int round = 0; round < 50; round++) { kv_put(&kv, "tmp", round); kv_delete(&kv, "tmp"); }
    v = -1; kv_get(&kv, "y", &v);
    printf("y=%d count=%zu\n", v, kv.count);
    kv_free(&kv);
    return 0;
}
` },
    hints: ['Deleting must free the key and leave a TOMBSTONE, not NULL', 'find() must continue past tombstones; kv_put may reuse one', 'Never call strcmp or free on TOMBSTONE'],
    tests: [
      { type: 'stdout', expected: 'del i=0\nget q=0 v=3\ndel i again=-1 count=2\ny=4 count=3\n', description: 'lookups still work after deleting from the middle of a probe chain' },
      { type: 'noLeaks', description: 'no leaks' },
    ],
  },
  {
    id: 'c-16-bitflags',
    title: 'Permission bits',
    difficulty: 'Intermediate',
    concept: 'bitwise &, |, ~, ^ and masks',
    reference: 'c_course/02_types_memory_bitwise.md',
    description: 'Implement the four helpers in perms.c for Unix-style rwx permission bits (R=4, W=2, X=1). perm_string writes 3 characters plus the terminator, e.g. "r-x".',
    files: { 'perms.c': R`#define PERM_R 4u
#define PERM_W 2u
#define PERM_X 1u

unsigned perm_add(unsigned p, unsigned f)    { return p + f; }
unsigned perm_remove(unsigned p, unsigned f) { return p - f; }
int perm_has(unsigned p, unsigned f)         { return p == f; }
void perm_string(unsigned p, char out[4])    { out[0] = 'r'; out[1] = 'w'; out[2] = 'x'; out[3] = '\0'; }
` },
    solution: { 'perms.c': R`#define PERM_R 4u
#define PERM_W 2u
#define PERM_X 1u

unsigned perm_add(unsigned p, unsigned f)    { return p | f; }
unsigned perm_remove(unsigned p, unsigned f) { return p & ~f; }
int perm_has(unsigned p, unsigned f)         { return (p & f) == f; }
void perm_string(unsigned p, char out[4]) {
    out[0] = (p & PERM_R) ? 'r' : '-';
    out[1] = (p & PERM_W) ? 'w' : '-';
    out[2] = (p & PERM_X) ? 'x' : '-';
    out[3] = '\0';
}
` },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
unsigned perm_add(unsigned p, unsigned f);
unsigned perm_remove(unsigned p, unsigned f);
int perm_has(unsigned p, unsigned f);
void perm_string(unsigned p, char out[4]);
int main(void) {
    char s[4];
    unsigned p = 0;
    p = perm_add(p, 4); p = perm_add(p, 4); p = perm_add(p, 1);
    perm_string(p, s); printf("%u %s\n", p, s);
    p = perm_remove(p, 2); p = perm_remove(p, 4);
    perm_string(p, s); printf("%u %s\n", p, s);
    printf("%d %d %d\n", perm_has(7, 5), perm_has(5, 6), perm_has(0, 0));
    for (unsigned i = 0; i < 8; i++) { perm_string(i, s); printf("%s ", s); }
    printf("\n");
    return 0;
}
` },
    hints: ['Adding a flag twice must not change anything: use |', 'Remove with & ~f', 'perm_has(p, f) is true only if all bits of f are set'],
    tests: [{ type: 'stdout', expected: '5 r-x\n1 --x\n1 0 1\n--- --x -w- -wx r-- r-x rw- rwx \n', description: 'bit operations are correct' }],
  },
  {
    id: 'c-17-callbacks',
    title: 'Function pointers and qsort',
    difficulty: 'Intermediate',
    concept: 'callbacks, void * comparators',
    reference: 'c_course/08_function_pointers_callbacks.md',
    description: 'Implement map_ints (apply f to each element in place) and two qsort comparators: cmp_desc (ints, largest first) and cmp_len (strings by length, then alphabetically). Avoid "return a - b": it overflows for large values.',
    files: { 'callbacks.c': R`#include <stddef.h>
#include <string.h>

void map_ints(int *v, size_t n, int (*f)(int)) {
}

int cmp_desc(const void *a, const void *b) {
    return *(const int *)a - *(const int *)b;
}

int cmp_len(const void *a, const void *b) {
    return 0;
}
` },
    solution: { 'callbacks.c': R`#include <stddef.h>
#include <string.h>

void map_ints(int *v, size_t n, int (*f)(int)) {
    for (size_t i = 0; i < n; i++)
        v[i] = f(v[i]);
}

int cmp_desc(const void *a, const void *b) {
    int x = *(const int *)a, y = *(const int *)b;
    return (x < y) - (x > y);
}

int cmp_len(const void *a, const void *b) {
    const char *x = *(const char *const *)a, *y = *(const char *const *)b;
    size_t lx = strlen(x), ly = strlen(y);
    if (lx != ly) return lx < ly ? -1 : 1;
    return strcmp(x, y);
}
` },
    hiddenFiles: { 'test_main.c': R`#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
void map_ints(int *v, size_t n, int (*f)(int));
int cmp_desc(const void *a, const void *b);
int cmp_len(const void *a, const void *b);
static int twice(int x) { return 2 * x; }
int main(void) {
    int v[] = {3, -1, 7, 0};
    map_ints(v, 4, twice);
    printf("%d %d %d %d\n", v[0], v[1], v[2], v[3]);
    int w[] = {5, INT_MIN, 9, INT_MAX, -2, 9};
    qsort(w, 6, sizeof w[0], cmp_desc);
    for (int i = 0; i < 6; i++) printf("%d ", w[i]);
    printf("\n");
    const char *s[] = {"pear", "fig", "banana", "kiwi", "apple"};
    qsort(s, 5, sizeof s[0], cmp_len);
    for (int i = 0; i < 5; i++) printf("%s ", s[i]);
    printf("\n");
    return 0;
}
` },
    hints: ['qsort passes pointers to the elements: for an array of char *, each argument is a char **', '(x < y) - (x > y) compares without overflow'],
    tests: [{ type: 'stdout', expected: '6 -2 14 0\n2147483647 9 9 5 -2 -2147483648 \nfig kiwi pear apple banana \n', description: 'map and both sort orders are correct' }],
  },
];

// Fill in solution files that are identical to the starter (marked null).
for (const lab of C_LABS) {
  for (const [k, v] of Object.entries(lab.solution)) if (v === null) lab.solution[k] = lab.files[k];
}

export function getCLab(id) { return C_LABS.find(l => l.id === id); }

// used by tests: djb2 % cap, to document colliding keys
export const _djb2 = djb2;
