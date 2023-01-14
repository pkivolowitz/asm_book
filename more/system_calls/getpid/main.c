#include <stdio.h>
#include <unistd.h>

int main() {
    printf("Greetings from: %d\n", getpid());
    return 0;
}
