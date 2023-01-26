#include "apple-linux-convergence.S"

/*
    gcc -fPIC -shared -o my_square.so function.S 
*/
        .p2align    2
        .text
        GLABEL      square

#if defined(__APPLE__)
_square:
#else
square:
#endif

        mul     x0, x0, x0
        ret

        .end
