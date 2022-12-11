        .global     main
        .align      2
        .text

        .equ        NUM_FLAKES, 150

storm   .req        x27

main:   stp         x29, x30, [sp, -16]!
        stp         x27, x28, [sp, -16]!

        // Seed the RNG with the current time.

        mov         w0, wzr
        bl          time
        bl          srand

        // Allocate the storm.

        mov         x0, NUM_FLAKES
        mov         x1, Flake.size
        mul         x0, x0, x1
        bl          malloc
        cbnz        x0, 1f

        ldr         x0, =bad_malloc
        bl          puts
        mov         w0, 1
        b           bye

1:      mov         storm, x0


99:     mov         x0, storm
        bl          free

        mov         w0, wzr

bye:    ldp         x27, x28, [sp], 16
        ldp         x20, x30, [sp], 16
        ret

ResetFlake:
        

            .data
bad_malloc: .asciz      "Allocation of flakes has failed"

            .section    Flake
            .struct     0
Flake.line: .struct     Flake.line + 4
Flake.col:  .struct     Flake.col + 4
Flake.size:
