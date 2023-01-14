        .global main
        .text
        .align  2

main:   stp     x29, x30, [sp, -16]!
        bl      getpid
        mov     w1, w0
        ldr     x0, =fmt
        bl      printf
        ldp     x29, x30, [sp], 16
        mov     w0, wzr
        ret

        .data
fmt:    .asciz  "Greetings from: %d\n"

        .end
