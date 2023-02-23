#include "apple-linux-convergence.S"

/*  The purpose of this program is to use gdb or lldb to watch a
    region of memory get overwritten first with a byte, then a short,
    then an int and finally with a long.

    As can be seen, the program produces no output of its own. Rather,
    use of a debugger is needed.

    The gdb command to examine the memory located at "ram" is:
    x/xg $x1
*/

        GLABEL	    main
        .text
        .p2align    2


MAIN
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp

    	mov         x0, xzr
        ldr         x1, =ram
        strb        w0, [x1]
        strh        w0, [x1]
        str         w0, [x1]
        str         x0, [x1]

        POP_P       x29, x30
        ret
        END_PROC

        .data
ram:    .quad   0xFFFFFFFFFFFFFFFF

        .end

