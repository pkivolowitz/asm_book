#include <stdio.h>

int main(int argc, char * argv[]) {
	top:
		if (*argv) {
			puts(*(argv++));
			goto top;
		}
	return 0;
}