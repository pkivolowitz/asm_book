#include "apple-linux-convergence.S"

        .text
        .align      2
        GLABEL      main

MAIN
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp
        LLD_ADDR    x0, fmt
        LLD_DBL     x1, d0, dbl
#if defined(__APPLE__)
        PUSH_R      d0
        CRT         printf
        add         sp, sp, 16
#else
        CRT         printf
#endif
        POP_P       x29, x30
        mov         w0, wzr
        ret
        END_PROC

dbl:    .double     -0.55
flt:    .float      0.125
fmt:    .asciz      "%f\n"

        .end
