#include <iostream>
#include <unistd.h>
#include <fcntl.h>

using std::cout;
using std::endl;
using std::hex;

int main() {
	int fd = open("test.txt", O_RDWR | O_CREAT, 0666);
	cout << fd << endl;
	cout << hex << (O_RDWR | O_CREAT) << endl;
	if (fd >= 0)
		close(fd);
	return 0;
}