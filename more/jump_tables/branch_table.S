#include    "apple-linux-convergence.S"

        .p2align    2
        .text
        GLABEL      MyMemSet

/*  MyMemSet(unsigned char * b, unsigned char v, long l)
             x0                 w1               x2

    The length is first checked against less than or equal to 0. If
    so, the body of the function is skipped.

    The loop will be unrolled 8x. The length (x2) modulo 8 gets turned
    into the number of instructions to jump to or beyond the initial
    str. A modulo of 0 is handled separately - it causes a branch to the
    initial str.

    This code can be dramatically improved by copying more than one byte
    at a time. You will have to figure out how to do this optimally in
    P6 - MemCpy
*/
#if defined(__APPLE__)
_MyMemSet:
#else
MyMemSet:
#endif
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp
        cmp         x2, xzr         // Test for bad length.
        ble         99f             // Take branch of 0 or less.

        add         x3, x2, x0      // x3 gets address of one beyond buffer
        mov         x6, 8
        MOD         x2, x6, x4, x5  // x4 gets l % 8
        cbz         x4, 10f         // Handle evenly divisible case.
        sub         x4, x6, x4      // Invert sense of x4 e.g. 3 becomes 5

        LLD_ADDR    x5, 10f
        add         x5, x5, x4, lsl 2
        br          x5

10:     str         w1, [x0], 1
        str         w1, [x0], 1
        str         w1, [x0], 1
        str         w1, [x0], 1
        str         w1, [x0], 1
        str         w1, [x0], 1
        str         w1, [x0], 1
        str         w1, [x0], 1
        cmp         x3, x0
        bgt         10b

99:     POP_P       x29, x30
        ret
        END_PROC

