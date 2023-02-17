/*  A test program. Tests MIN and MAX
*/
#include "apple-linux-convergence.S"

        .text
        .align      2
        GLABEL      main

MAIN
        START_PROC
        PUSH_P      x29, x30
        PUSH_P      x20, x21
        mov         x29, sp

        // Generate two numbers to compare.

        mov         x0, xzr
        CRT         time            // time(nullptr)
        CRT         srand

        CRT         rand
        and         x20, x0, 0xFF

        CRT         rand
        and         x21, x0, 0xFF

        bl          PrintLegend
        bl          DoMin
        bl          DoMax

        POP_P       x20, x21
        POP_P       x29, x30
        mov         w0, wzr
        ret
        END_PROC

DoMin:
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp
        LLD_ADDR    x0, fmtls
        MIN         x20, x21, x1
#if defined(__APPLE__)
        PUSH_R      x1
        CRT         printf
        add         sp, sp, 16
#else
        CRT         printf
#endif
        POP_P       x29, x30
        ret
        END_PROC

DoMax:
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp
        LLD_ADDR    x0, fmtgt
        MAX         x20, x21, x1
#if defined(__APPLE__)
        PUSH_R      x1
        CRT         printf
        add         sp, sp, 16
#else
        CRT         printf
#endif
        POP_P       x29, x30
        ret
        END_PROC

PrintLegend:
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp
        LLD_ADDR    x0, fmt
#if defined(__APPLE__)
        PUSH_P      x20, x21
        CRT         printf
        add         sp, sp, 16
#else
        mov         x1, x20
        mov         x2, x21
        CRT         printf
#endif
        POP_P       x29, x30
        ret
        END_PROC

        AASCIZ      fmt, "Values to compare: %d and %d\n"
        AASCIZ      fmtgt, "Greater value is: %d\n"
        AASCIZ      fmtls, "Lesser value is:  %d\n"

        .end
