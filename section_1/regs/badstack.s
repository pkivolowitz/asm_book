/*  The purpose of this program is to crash due to not manipulating the
    stack in multiples of 16.
*/
        .global main
        .text
        .align  2

main:   str     x30, [sp, -8]!
        ldr     x30, [sp], 8
        ret
