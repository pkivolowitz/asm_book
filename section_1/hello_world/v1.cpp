#include <iostream>

using namespace std;

int main(int argc, char * argv[]) {
	while (*argv) {
		cout << *(argv++) << endl;
	}
	return 0;
}