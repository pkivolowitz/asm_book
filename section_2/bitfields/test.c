#include <stdio.h>

struct BF {
    unsigned char a : 1;
    unsigned char b : 2;
    unsigned char c : 5;
};

unsigned char noBF = 0;

#define  C
#ifdef  C
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
    *byte |= (value << 3);   // or's in the bits at the right place
}
#else
extern void SetA(unsigned char *);
extern void SetB(unsigned char *, unsigned char);
extern void SetC(unsigned char *, unsigned char);
extern void ClearA(unsigned char *);
extern void ClearB(unsigned char *);
extern void ClearC(unsigned char *);
#endif

int main() {
    volatile struct BF bf;

    bf.a = 1;
    bf.b = 2;
    bf.c = 3;

    ClearA(&noBF);
    SetB(&noBF, 1);
    SetC(&noBF, 7);

    printf("noBF should be 0x3A - value: 0x%X\n", (unsigned int) noBF);
    printf("bf   should be 0x1D - value: 0x%X\n", (unsigned int) *((unsigned char *) &bf));
    return 0;
}
