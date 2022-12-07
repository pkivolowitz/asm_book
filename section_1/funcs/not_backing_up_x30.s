        .text
        .global main
        .align  2

main:   ldr     x0, =hw
        bl      puts
        ret

        .data
hw:     .asciz  "Hello World!"

        .end
