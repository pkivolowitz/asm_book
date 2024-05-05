/*  A program to demonstrate the order in which registers are
    pushed onto the stack by stp and str. See text.
*/
        .text
        .p2align    2
        .global     main

main:   stp         xzr, x30, [sp, -16]!
        mov         x0, 0xF
        str         x0, [sp, -16]!
        ldp         xzr, x30, [sp], 16
        ret

        .end

