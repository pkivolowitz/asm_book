#include <cinttypes>
#include <stdio.h>

#define MAX     4
double d[4] = { 1.555555, 2.666666, 3.777777, 4.888888 };
float f[4] =  { 1.111111, 2.222222, 3.333333, 4.444444 };

int main() {
    for (long counter = 0; counter < MAX; counter++) {
        printf("index %ld double %f float %f\n", counter, d[counter], f[counter]);
    }
    return 0;
}


/*
extern "C" uint32_t T1(double d) {
	return uint32_t(d);
}

extern "C" uint32_t T2(float f) {
	return uint32_t(f);
}

extern "C" int32_t T3(double d) {
	return int32_t(d);
}

extern "C" int32_t T4(float f) {
	return int32_t(f);
}

extern "C" uint64_t T5(double d) {
	return uint64_t(d);
}
*/
