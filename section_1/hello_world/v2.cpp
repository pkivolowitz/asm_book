#include <iostream>

using namespace std;

int main(int argc, char * argv[]) {
	top:
		if (*argv) {
			cout << *(argv++) << endl;
			goto top;
		}
	return 0;
}