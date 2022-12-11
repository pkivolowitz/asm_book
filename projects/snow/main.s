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

        mov         x0, NUM_FLAKES      // Calculate space needed.
        mov         x1, Flake.size
        mul         x0, x0, x1
        str         x0, [sp, -16]!      // Save for memset.
        bl          malloc              // Attempt the allocation.
        cbnz        x0, 1f              // Branch if successful.

        add         sp, sp, 16          // Undo stack change.
        ldr         x0, =bad_malloc     // Inform user of tragedy.
        bl          puts
        mov         w0, 1
        b           bye

1:      mov         storm, x0           // The base address of the
                                        // allocated memory will be
                                        // preserved in x27.
        ldr         x2, [sp], 16        // Restore the allocation size.
        mov         w1, xzr             // Fill with zero.
        bl          memset              // x0 still had base address.

99:     mov         x0, storm
        bl          free

        mov         w0, wzr

bye:    ldp         x27, x28, [sp], 16
        ldp         x20, x30, [sp], 16
        ret

/*      x0 contains the address of a Flake in need of being reset.
        The column number of a Flake is anywhere from 1 to 80 (a
        default terminal). The starting line is anywhere from 1 to
        48 (24 x 2) lines ABOVE the screen. This allows the flakes to
        drift downward without apparent gaps or bunches.
*/
ResetFlake:
        stp         x20, x30, [sp, -16]!
        ldp         x20, x30, [sp], 16
        ret

            .data
bad_malloc: .asciz      "Allocation of flakes has failed"

            .section    Flake
            .struct     0
Flake.line: .struct     Flake.line + 4
Flake.col:  .struct     Flake.col + 4
Flake.size:
