#include <stdio.h>

extern unsigned int Fib(unsigned int nthNumber);

unsigned int FibonacciInC(unsigned int nthNumber) {
	if (nthNumber <= 1) {
		return nthNumber;
	}
	return FibonacciInC(nthNumber - 1) + FibonacciInC(nthNumber - 2);
}

int main() {
	printf("In C:\n");
	for (unsigned int n = 0; n < 10; n++) {
		printf("Fibonacci number %2d is: %d\n", n, FibonacciInC(n));
	}
	printf("In assembly language:\n");
	for (unsigned int n = 0; n < 10; n++) {
		printf("Fibonacci number %2d is: %d\n", n, Fib(n));
	}
	return 0;
}