        .global	main
        .text
        .align	2

main:	mov     x0, xzr
        ret
    
        .data
ram:    .quad   0xAABBCCDDEEFF0011
        .end

