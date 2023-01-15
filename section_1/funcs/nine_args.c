#include <stdio.h>

void LessSillyFunction(long p1, long p2, long p3, long p4, long p5, long p6,
				   long p7, long p8) {
	printf("This example hurts my brain: %ld\n", p8);
}

void SillyFunction(long p1, long p2, long p3, long p4, long p5, long p6,
				   long p7, long p8, long p9) {
	printf("This example hurts my brain: %ld %ld\n", p8, p9);
}

int main() {
	SillyFunction(1, 2, 3, 4, 5, 6, 7, 8, 9);
//	LessSillyFunction(1, 2, 3, 4, 5, 6, 7, 8);
}
