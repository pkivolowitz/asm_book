#include "apple-linux-convergence.S"

        .text
        .align      2
        GLABEL      main

MAIN
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp
        LLD_ADDR    x0, fmt
        LLD_FLT     x1, s0, flt
#if defined(__APPLE__)
        fcvt        d0, s0
        fmov        x1, d0
        PUSH_R      x1
        CRT         printf
        add         sp, sp, 16
#else
        fcvt        d0, s0
        CRT         printf
#endif
        POP_P       x29, x30
        mov         w0, wzr
        ret
        END_PROC

flt:    .float      0.125
fmt:    .asciz      "%f\n"

        .end
