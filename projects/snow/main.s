        .global     main
        .align      2
        .text

        .equ        NUM_FLAKES, 150
        .equ        MAX_COLUMN, 80
        .equ        MAX_LINE, 24
        .equ        MAX_LINE_X2, 48

storm   .req        x27                 // base address of storm 
estorm  .req        x28                 // end of storm


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
        mov         estorm, x0          // prep end of storm calculation
        ldr         x2, [sp], 16        // Restore the allocation size.
        add         estorm, estorm, x2  // Preserve end-of-storm.
        mov         w1, wzr             // Fill with zero.
        bl          memset              // x0 still had base address.

        bl          InitializeStorm

10:     bl          Erase
        bl          StepAll
        bl          RenderAll
        bl          Delay
        b           10b

99:     mov         x0, storm
        bl          free

        mov         w0, wzr

bye:    ldp         x27, x28, [sp], 16
        ldp         x20, x30, [sp], 16
        ret

/*  line comes to us in w0
    column comes to us in w1
*/

Move:   stp         x20, x30, [sp, -16]!
        mov         w2, w1
        mov         w1, w0
        ldr         x0, =move_str
        bl          printf
        ldp         x20, x30, [sp], 16
        ret

Erase:  stp         x20, x30, [sp, -16]!
        mov         w0, 1
        mov         w1, 1
        bl          Move
        ldr         x0, =erase_str
        bl          printf
        ldp         x20, x30, [sp], 16
        ret

RenderOne:
        ret

RenderAll:
        ret

Delay:
        ret

StepOne:
        ret

StepAll:
        ret

InitializeStorm:
        stp         x20, x30, [sp, -16]!
        mov         x20, storm
1:      mov         x0, x20
        bl          ResetFlake
        add         x20, x20, Flake.size
        cmp         estorm, x20
        bne         1b
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
        mov         x20, x0

        // Initialize Column --- 1 <= random value <= 80 
        bl          rand
        mov         x1, MAX_COLUMN
        bl          mod
        add         w1, w1, 1
        str         w1, [x20, 4]

        // Initialize Line --- -(1 <= random value <= 48)

        bl          rand
        mov         x1, MAX_LINE_X2
        bl          mod
        add         w1, w1, 1
        neg         w1, w1
        str         w1, [x20]

        ldp         x20, x30, [sp], 16
        ret

/* mod(a, b) - implements a % b - AARCH64 lacks a mod instruction.
   A strange place to economize, but there you have it.

   a comes to us in x0
   b comes to us in x1

   method:
    * integer divide a by b
      for example - 5 % 3 would need 5 // 3 yielding 1
    * multiply result by b
      1 * 3 is 3
    * subtract result from a
      5 - 3 is 2 and that's our return value.
*/

mod:	sdiv 	x2, x0, x1         // x2 gets a // b
        msub	x0, x2, x1, x0     // x0 gets a - a // b * b	
        ret


            .data
bad_malloc: .asciz      "Allocation of flakes has failed"
move_str:   .asciz      "\033[%d;%dH"
erase_str:  .asciz      "\033[2J"

            .section    Flake
            .struct     0
Flake.line: .struct     Flake.line + 4
Flake.col:  .struct     Flake.col + 4
Flake.size:
