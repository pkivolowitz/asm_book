#include "apple-linux-convergence.S"

        .text
        .p2align    2
        GLABEL      main

MAIN
        PUSH_P      x21, x30
        PUSH_R      x29
        mov         x29, sp

        mov         x21, x1

1:      ldr         x0, [x21], 8
        cbz         x0, 2f
        CRT         puts
        b           1b

2:      POP_R       x29
        POP_P       x21, x30
        mov         x0, xzr
        ret

        .end
