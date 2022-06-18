# Section 2 / Bit Fields

## Overview

Many C and C++ programmers have never seen bit fields. 

Bit fields are a
feature of the C and C++ language which completely hide what is often
called "bit bashing".

Bit bashing is the manipulation of individual bits. Bit
bashing goes to the very core of the C language. Remember that C is a
high level assembly language, as we argue in Section 1 of this book.
And C is the (later) language in which Unix was implemented and indeed, 
C was 
developed specifically to implement Unix. 

Since an operating system directly
interfaces with hardware - the C language grew to have features
to aid Unix implementers.

*With that said, consider this WARNING: the ordering of bits in a bit
field is not guaranteed to be the same on different platforms and even
between different compilers on the same platform.*

Bit fields are implemented within a `struct` by appending a colon plus
a number after the declaration of integer types.

For example:

```c
struct BF {
    unsigned char a : 1;
    unsigned char b : 2;
    unsigned char c : 5;
};
```

The above declares a `struct` whose size is 1 byte. Members of the `struct`
are `a`, `b` and `c` which are 1, 2 and 5 bits in size, respectively.

## Bit Fields Aren't Just For Hardware

Consider a data structure for which there will be potentially millions of
instances in RAM. Or, perhaps billions of instances on disc. Suppose you
need 8 boolean members in every instance. The C++ standard does not
define the size of a `bool` instead leaving it to be implementation
dependent. Some implementations equate `bool` to `int`, four bytes in 
length. Some implement `bool` with a `char`, or 1 byte in length.

Let's assume the smallest case and equate a `bool` with `char`. Our
`struct`, for which there may be millions or billions of instances
requires 8 `bool` so therefore 8 bytes. Times millions or billions.

Ouch.

Bit fields can come to your aid here by using a single bit per boolean
value. In the best case, 8 bytes collapse to 1 byte. In a worse case,
8 x 4 = 32 bytes collapsed into 1.

## Without Bit Fields

Let's assume we're working with a byte that is comprised of three
fields layed out as in `struct BF` above. That is, a one, two and
five bit field inside one byte.

Without bit fields, we would have to write this code:

```c
/*  Note the absence of defensive programming such as checking
    to ensure that byte is not null and that bit_number is not
    too large.
*/

void ClearA(unsigned char * byte) {
    *byte &= ~1;
}

void SetA(unsigned char * byte) {
    *byte &= ~1;
    *byte |= 1;
}

void ClearB(unsigned char * byte) {
    *byte &= ~6;
}

void SetB(unsigned char * byte, unsigned char value) {
    value &= 3;             // ensures only bits 0 and 1 can be set
    *byte &= ~6;            // clears bits 1 and 2 in byte
    *byte |= (value << 1);  // stores bits 0 and 1 into bits 2 and 3
}

void ClearC(unsigned char * byte) {
    *byte &= 7;             // squashes bits 3 to 7 to 0
}

void SetC(unsigned char * byte, unsigned char value) {
    value &= 0x1F;          // ensures only bits 0 to 4 can be set
    *byte &= ~(0x1F << 3);  // squashes correct bits in byte
    *byte |= (value << 3);  // or's in the bits at the right place
}
```

In naive assembly language, these functions would look like this:

```asm
```



