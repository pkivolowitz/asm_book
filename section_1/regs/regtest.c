#include <stdio.h>

void Foo(long a, long b, long c, long d, long e, long f, long g, long h, long i, long j)
{
    printf("%ld %ld %ld %ld %ld %ld %ld %ld %ld %ld\n",
        a, b, c, d, e, f, g, h, i, j);
}

struct S
{
    long a;
    long b;
    long c;
    long a1;
    long b1;
    long c1;
    long a2;
    long b2;
    long c2;
    long a3;
    long b3;
    long c3;
};

void Bum(long z, long a, long b);

void Bar(long z, struct S s)
{
    Bum(z, s.a, s.b);
}