        .global main
        .text
        .align  2

counter .req    x20
dptr	.req    x21
fptr	.req    x22
        .equ    max, 4

main:   stp     counter, x30, [sp, -16]!
        stp     dptr, fptr, [sp, -16]!
        ldr     dptr, =d
        ldr     fptr, =f
        mov     counter, xzr

1:      cmp     counter, max
        beq     2f

        ldr     d0, [dptr, counter, lsl 3]
        ldr     s1, [fptr, counter, lsl 2]
        fcvt    d1, s1
        ldr     x0, =fmt
        add     counter, counter, 1
        mov     x1, counter
        bl      printf
        b       1b

2:      ldp     dptr, fptr, [sp], 16
        ldp     counter, x30, [sp], 16
        mov     w0, wzr
        ret

        .data
fmt:    .asciz  "%d %f %f\n"
d:      .double 1.111111, 2.222222, 3.333333, 4.444444
f:      .float  1.111111, 2.222222, 3.333333, 4.444444

        .end
