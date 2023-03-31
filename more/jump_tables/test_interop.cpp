#include <stdio.h>

extern "C" void MyMemSet(unsigned char *, unsigned char v, long length);

/*      MyMemSet(unsigned char *, unsigned char v, long length);
*/

/*
void MyMemSet(unsigned char * b, unsigned char v, long l) {
    for (long i = 0; i < l; i++) {
        b[i] = v;
    }
}
*/
const long BUFFER_SIZE = 1000;

unsigned char buffer[BUFFER_SIZE];

int main() {
	unsigned char before = buffer[-1];
	unsigned char after = buffer[BUFFER_SIZE];

	MyMemSet(buffer, 0xF0, BUFFER_SIZE);
    
	if (before != buffer[-1])
		printf("Bytes prior to buffer are smashed.\n");
	if (after != buffer[BUFFER_SIZE])
		printf("Bytes after buffer are smashed.\n");

	return 0;
}
