#include "apple-linux-convergence.S"

/*  This is a short demonstration of the macro suite in development
    to enable writing AARCH64 assembly language once and be able to
    build on both Apple Silicon and Linux machines.

    Documentation can be found at:
    https://github.com/pkivolowitz/asm_book

    Perry Kivolowitz
*/
        .align  2
        .text
        GLABEL main

MAIN
        START_PROC
        PUSH_P      x21, x30
        PUSH_R      x29
        mov         x29, sp

        mov         x0, 8       // allocating a long's worth of RAM
        CRT         malloc      // call malloc()
        mov         x1, 0xFF    // load payload
        str         x1, [x0]    // store payload
        LLD_ADDR    x1, ptr     // local load address
        str         x0, [x1]

        LLD_ADDR    x0, fmt     // loads the address of fmt
        LLD_ADDR    x1, ptr     // loads **ptr
        ldr         x1, [x1]    // dereferences **ptr to make *ptr
        ldr         x2, [x1]    // dereferences *ptr to get value
#if defined(__APPLE__)
        PUSH_P      x1, x2
        CRT         printf
        add         sp, sp, 16
#else
        CRT         printf
#endif
        POP_R       x29
		POP_P	    x21, x30
		mov		    x0, xzr
		ret
        END_PROC

        .data
ptr:    .space  8
fmt:    .asciz  "%p %ld\n"

        .end
