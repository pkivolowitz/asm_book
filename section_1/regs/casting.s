        .global     main
        .text
        .align      2

main:   mov     x0, -1
        ldr     x1, =ram
        ldrb    w0, [x1]
        // p/x $x0 here
        mov     x0, -1
        mov     x1, 1
        mov     w0, w1
        // p/x $x0 here
        mov     x0, -1
        movk    w0, 1
        // p/x $x0 here

        mov     x0, xzr
        ret

        .data
ram:    .quad   0x01

        .end
