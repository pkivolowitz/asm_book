#include <iostream>
#include <unistd.h>

using std::cout;
using std::endl;

int main() {
    cout << "Greetings from: " << getpid() << endl;
    return 0;
}