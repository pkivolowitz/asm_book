        .text
        .global main
        .align  2

main:   str     x30, [sp, -16]! 
        ldr     x0, =hw
        bl      puts
        ldr     x30, [sp], 16
        ret

        .data
hw:     .asciz  "Hello World!"

        .end
