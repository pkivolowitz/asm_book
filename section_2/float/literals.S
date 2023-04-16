#include "apple-linux-convergence.S"

        GLABEL main
        .text
        .p2align  2

counter .req    x20
dptr	.req    x21
fptr	.req    x22
        .equ    max, 4

MAIN
        START_PROC
        PUSH_P      counter, x30
        PUSH_P      dptr, fptr
        PUSH_R      x29
        mov         x29, sp

        LLD_ADDR    dptr, d
        LLD_ADDR    fptr, f
        mov         counter, xzr

1:      cmp         counter, max
        beq         2f
        ldr         d0, [dptr, counter, lsl 3]
        ldr         s1, [fptr, counter, lsl 2]
        fcvt        d1, s1
        LLD_ADDR    x0, fmt
        add         counter, counter, 1
        mov         x1, counter
#if defined(__APPLE__)
        /*
            Give us some stack space. Then read the printf template
            string right to left. Variadics on the Mac are difficult
            to get right. Remember that printf never prints floats.
            Only doubles. Internally, floats are converted to double.
            See the fcvt instruction above.
        */
        sub         sp, sp, 32
        str	        d1, [sp, 16]
        str	        d0, [sp, 8]
        str         x1, [sp]
        CRT         printf
        add         sp, sp, 32
#else
        CRT         printf
#endif
        b           1b

2:      POP_R       x29
        POP_P       dptr, fptr
        POP_P       counter, x30
        mov         w0, wzr
        END_PROC
        ret

        .data
fmt:    .asciz      "index %ld double %f float %f\n"
        .p2align    3
d:      .double     1.555555, 2.666666, 3.777777, 4.888888
        .p2align    2
f:      .float      1.111111, 2.222222, 3.333333, 4.444444

        .end
