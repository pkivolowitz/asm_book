#include <stdio.h>

void Foo()
{
    unsigned char c = 1;
    unsigned short s = 2;
    unsigned int i = 4;
    unsigned long l = 8;

    s += (unsigned short) c;
    i += (unsigned int) s;
    l += (unsigned long) i;
}

void Bar()
{
    int i = 4;
    long l = 8;

    i += (int) l;
}

int main()
{
    char c = 1;
    short s = 2;
    int i = 4;
    long l = 8;

    s += (short) c;
    i += (int) s;
    l += (long) i;
    l += c;
    c += l;
    return 0;
}
