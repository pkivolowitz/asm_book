        .global		main
        .align		2

        .section    .rodata
rotypo: .asciz      "Rypo"          // Meant this to be "Typo"
fmt:    .asciz      "%s\n"          // Used to print the strings

        .data
rwtypo: .asciz      "Rypo"          // Meant this to be "Typo"

        .text

main:   str         x30, [sp, -16]!
        // Try to fix rwtypo --- this will work
        ldr         x1, =rwtypo
        mov         w2, 'T'
        strb        w2, [x1]
        ldr         x0, =fmt        // Notice I already loaded rwtypo
        bl          printf

        // Try to fix rotypo --- this will end in tears
        ldr         x1, =rotypo
        mov         w2, 'T'
        strb        w2, [x1]
        ldr         x0, =fmt        // Notice I already loaded rwtypo
        bl          printf

        ldr         x30, [sp], 16
        mov         w0, wzr
        ret

        .end
        