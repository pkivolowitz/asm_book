// Sample programs for the C sandbox. Each one shows something about how C
// maps onto a real ARM64 machine, and all of them really run.
const R = String.raw;

export const C_SAMPLES = [
  {
    id: 'hello',
    title: 'Hello, ARM64',
    files: { 'main.c': R`#include <stdio.h>

int main(int argc, char **argv) {
    printf("Hello from %s with %d argument(s)\n", argv[0], argc - 1);
    for (int i = 1; i < argc; i++)
        printf("  argv[%d] = \"%s\"\n", i, argv[i]);
    return 0;
}
` },
  },
  {
    id: 'memory-map',
    title: 'Where things live in memory',
    files: { 'main.c': R`#include <stdio.h>
#include <stdlib.h>

int global_counter = 42;            /* .data  */
const char *greeting = "hi";        /* the pointer is in .data, the text in .rodata */

int main(void) {
    int local = 7;                  /* stack  */
    int *heap = malloc(sizeof *heap); /* heap */
    *heap = 99;

    printf("code   main            %p\n", (void *)main);
    printf("rodata \"hi\"            %p\n", (void *)greeting);
    printf("data   global_counter  %p\n", (void *)&global_counter);
    printf("heap   *heap           %p\n", (void *)heap);
    printf("stack  local           %p\n", (void *)&local);

    free(heap);
    return 0;
}
` },
  },
  {
    id: 'endianness',
    title: 'Endianness: look at the bytes',
    files: { 'main.c': R`#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint32_t value = 0x12345678;
    unsigned char *bytes = (unsigned char *)&value;

    printf("value = 0x%08x\n", value);
    for (int i = 0; i < 4; i++)
        printf("byte %d at %p = 0x%02x\n", i, (void *)&bytes[i], bytes[i]);
    printf("ARM64 Linux is %s-endian\n", bytes[0] == 0x78 ? "little" : "big");
    return 0;
}
` },
  },
  {
    id: 'struct-layout',
    title: 'Struct padding and alignment',
    files: { 'main.c': R`#include <stdio.h>
#include <stddef.h>

struct packet_bad {   /* fields in a careless order */
    char  type;
    long  id;
    char  flag;
    int   length;
};

struct packet_good {  /* largest fields first */
    long  id;
    int   length;
    char  type;
    char  flag;
};

int main(void) {
    printf("bad : size %zu  (type@%zu id@%zu flag@%zu length@%zu)\n", sizeof(struct packet_bad),
           offsetof(struct packet_bad, type), offsetof(struct packet_bad, id),
           offsetof(struct packet_bad, flag), offsetof(struct packet_bad, length));
    printf("good: size %zu  (id@%zu length@%zu type@%zu flag@%zu)\n", sizeof(struct packet_good),
           offsetof(struct packet_good, id), offsetof(struct packet_good, length),
           offsetof(struct packet_good, type), offsetof(struct packet_good, flag));
    return 0;
}
` },
  },
  {
    id: 'stack-frames',
    title: 'Recursion and stack frames',
    files: { 'main.c': R`#include <stdio.h>

/* Each call gets its own frame: watch the address of n move down. */
long factorial(long n) {
    printf("factorial(%ld): &n = %p\n", n, (void *)&n);
    if (n <= 1)
        return 1;
    return n * factorial(n - 1);
}

int main(void) {
    printf("5! = %ld\n", factorial(5));
    return 0;
}
` },
  },
  {
    id: 'heap-overflow',
    title: 'Bug: heap buffer overflow',
    files: { 'main.c': R`#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    const char *name = "ARM64";
    char *copy = malloc(strlen(name));   /* forgot +1 for the '\0' */
    strcpy(copy, name);                  /* writes 6 bytes into 5 */
    printf("%s\n", copy);
    free(copy);
    return 0;
}
` },
  },
  {
    id: 'use-after-free',
    title: 'Bug: use after free',
    files: { 'main.c': R`#include <stdio.h>
#include <stdlib.h>

struct session { int user_id; int is_admin; };

int main(void) {
    struct session *s = malloc(sizeof *s);
    s->user_id = 1000;
    s->is_admin = 0;
    free(s);                              /* logged out... */

    if (s->is_admin)                      /* ...but the pointer is still used */
        puts("admin!");
    return 0;
}
` },
  },
  {
    id: 'integer-overflow',
    title: 'Integer conversions that bite',
    files: { 'main.c': R`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int count = -1;                 /* e.g. read from an untrusted header */
    size_t bytes = count * sizeof(int);
    printf("count=%d -> bytes=%zu\n", count, bytes);

    unsigned char small = 250;
    small += 10;
    printf("250 + 10 in an unsigned char = %d\n", small);

    char c = 200;                   /* char is UNSIGNED on ARM64 Linux, signed on x86 */
    printf("char 200 is %s\n", c < 0 ? "negative" : "positive");

    if (-1 < sizeof(int))
        puts("-1 < 4");
    else
        puts("-1 >= 4 ?! (-1 was converted to an unsigned 64-bit number)");
    return 0;
}
` },
  },
  {
    id: 'files',
    title: 'File I/O (in-memory filesystem)',
    files: {
      'main.c': R`#include <stdio.h>

int main(void) {
    FILE *in = fopen("input.txt", "r");
    if (in == NULL) { perror("input.txt"); return 1; }

    FILE *out = fopen("upper.txt", "w");
    int c, lines = 0;
    while ((c = fgetc(in)) != EOF) {
        if (c >= 'a' && c <= 'z') c -= 32;
        if (c == '\n') lines++;
        fputc(c, out);
    }
    fclose(in);
    fclose(out);
    printf("converted %d line(s); see upper.txt in the Files list\n", lines);
    return 0;
}
`,
      'input.txt': 'arm64 is a load/store architecture\nphones run on it\n',
    },
  },
  {
    id: 'multi-file',
    title: 'Multiple files and a header',
    files: {
      'main.c': R`#include <stdio.h>
#include "stack.h"

int main(void) {
    struct stack s;
    stack_init(&s);
    for (int i = 1; i <= 5; i++) stack_push(&s, i * i);
    while (!stack_empty(&s)) printf("%d ", stack_pop(&s));
    printf("\n");
    return 0;
}
`,
      'stack.h': R`#ifndef STACK_H
#define STACK_H

#define STACK_MAX 16

struct stack {
    int items[STACK_MAX];
    int top;
};

void stack_init(struct stack *s);
int stack_push(struct stack *s, int v);
int stack_pop(struct stack *s);
int stack_empty(const struct stack *s);

#endif
`,
      'stack.c': R`#include "stack.h"

void stack_init(struct stack *s) { s->top = 0; }

int stack_push(struct stack *s, int v) {
    if (s->top == STACK_MAX) return -1;
    s->items[s->top++] = v;
    return 0;
}

int stack_pop(struct stack *s) { return s->items[--s->top]; }

int stack_empty(const struct stack *s) { return s->top == 0; }
`,
    },
  },
  {
    id: 'c-calls-asm',
    title: 'C calling hand-written ARM64',
    files: {
      'main.c': R`#include <stdio.h>

long add_shifted(long a, long b);   /* defined in add.s */

int main(void) {
    printf("add_shifted(5, 3) = %ld\n", add_shifted(5, 3));
    return 0;
}
`,
      'add.s': R`        .text
        .global add_shifted
// x0 = a, x1 = b: return a + (b << 2)
add_shifted:
        add     x0, x0, x1, lsl #2
        ret
`,
    },
  },
];
