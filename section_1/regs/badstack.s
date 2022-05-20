        .global main
        .text
        .align  2

main:   str     x30, [sp, -8]!
        ldr     x30, [sp], 8
        ret
