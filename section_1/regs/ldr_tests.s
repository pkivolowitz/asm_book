        .global     main
        .text
        .align      2

main:   str         x30, [sp, -16]!

        ldr         x0, =fmt                    // Loads the address of fmt
        ldr         x1, =q                      // Loads the address of q
        ldr         x2, [x1]                    // Loads the value at q
        bl          printf                      // Calls printf()
        

        ldr         x0, =fmt                    // Loads the address of fmt
        ldr         x1, q                       // Loads the VALUE at q
        ldr         x2, [x1]                    // CRASH!
        bl          printf

        ldr         x30, [sp], 16
        mov         w0, wzr
        ret

        .data
q:      .quad       0x1122334455667788
fmt:    .asciz      "address: %p value: %lx\n"

        .end
    