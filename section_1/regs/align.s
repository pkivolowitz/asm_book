        .global	main
        .text
        .align	2

main:	mov     x0, xzr
        ldr     x1, =ram
        strb    w0, [x1]
        strh    w0, [x1]
        str     w0, [x1]
        str     x0, [x1]
        ret
    
        .data
ram:    .quad   0xFFFFFFFFFFFFFFFF

        .end

