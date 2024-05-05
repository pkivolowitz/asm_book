        .text
        .p2align    2
        .global     main

main:   stp         xzr, x30, [sp, -16]!
        ldp         xzr, x30, [sp], 16
        ret

        .end

