#include <stdio.h>

void Dump(void * i, int length) {
    unsigned char * ptr = (unsigned char *) i;

    for (int counter = 0; counter < length; counter++) {
        printf("%02x", *(ptr++));
    }
    printf("\n");
}

int main() {
	unsigned short i16 = 0x0123;
	unsigned int   i32 = 0x01234567;
	unsigned long  i64 = 0x0123456789ABCDEF;

    printf("Endianness of this computer:\n");
    printf("i16: ");
    Dump((void *) &i16, 2);
	printf("i32: ");
	Dump((void *)&i32, 4);
	printf("i64: ");
	Dump((void *)&i64, 8);
    return 0;
}