        .text
        .global main

/*  Demonstration of using  more than 8 arguments to  a function.  This
    demo is LINUX only as APPLE will put all arguments beyond the first
    one on the stack anyway.

    On LINUX, all parameters to a function beyond  the  eight go on the
    stack.  The first 8 go in registers  x0  through  x7 as normal (for
    LINUX).
*/

SillyFunction:
        stp     x29, x30, [sp, -16]!    // Changes sp.
        mov     x29, sp
        ldr     x0, =fmt
        mov     x1, x7
        ldr     x2, [sp, 16]            // This does not alter the sp.
        bl      printf
        ldp     x29, x30, [sp], 16      // Undoes change to sp.
        ret

main:
        stp     x29, x30, [sp, -16]!    // sp down total of 16.
        mov     x29, sp
        mov     x0, 9
        str     x0, [sp, -16]!          // sp down total of 32.
        mov     x0, 1
        mov     x1, 2
        mov     x2, 3
        mov     x3, 4
        mov     x4, 5
        mov     x5, 6
        mov     x6, 7
        mov     x7, 8
        bl      SillyFunction
        add     sp, sp, 16              // undoes change of sp by 16 due
                                        // to function call.
        ldp     x29, x30, [sp], 16      // undoes change to sp of 16.
        ret
    
        .data
fmt:    .asciz  "This example hurts my brain: %ld %ld\n"

        .end
