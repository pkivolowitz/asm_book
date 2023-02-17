/*  A test program.
*/
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
        fcvt        d0, s0
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

flt:    .float      0.125
fmt:    .asciz      "Should print 0.125000: %f\n"

        .end
