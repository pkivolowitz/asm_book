#include <stdlib.h>
#include <stdio.h>
#include <time.h>

int main()
{
    int r;

    srand(time(0));
    r = rand() & 7;
    switch (r)
    {
        case 0: 
            puts("0 returned");
            break;

        case 1:
            puts("1 returned");
            break;

        case 2:
            puts("2 returned");
            break;

        case 3:
            puts("3 returned");
            break;

        case 4:
            puts("4 returned");
            break;

        case 5:
            puts("5 returned");
            break;

        case 6:
            puts("6 returned");
            break;

        case 7:
            puts("7 returned");
            break;
    }
    return 0;
}
