    .global main
    .text

main:
    stp     x29, x30, [sp, -16]!
    mov     x1, 10
    mov     x0, 5

    cmp     x0, x1
    ble     1f
    ldr     x0, =T
    bl      puts
    b       2f

1:  ldr     x0, =F 
    bl      puts

2:  ldp     x29, x30, [sp], 16
    mov     x0, xzr
    ret

    .data
F:  .asciz  "FALSE"
T:  .asciz  "TRUE"

    .end
