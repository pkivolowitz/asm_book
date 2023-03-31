        .text
        .align  4
        .global main

main:   str     x30, [sp, -16]!
        mov     x0, xzr             // set up call to time(nullptr)
        bl      time                // call time setting up srand
        bl      srand               // call srand setting up rand
        bl      rand                // get a random number
        and     x0, x0, 7           // ensure its range is 0 to 7
                                    // note use of x register is on purpose
        lsl     x0, x0, 2           // multiply by 4
        ldr     x1, =jt             // load base address of jump table
        add     x1, x1, x0          // add offset to base address
        br      x1

// If, as in this case, all the "cases" have the same number of 
// instructions then this intermediate jump table can be omitted saving
// some space and a tiny amount of time. To omit the intermediate jump
// table, you'd multiply by 12 above and not 4. Twelve because each 
// "case" has 3 instructions (3 x 4 == 12).

// Question for you: If you did omit the jump table, relative to what
// would you jump (since "jt" would be gone).

jt:     b       0f
        b       1f
        b       2f
        b       3f
        b       4f
        b       5f
        b       6f
        b       7f

0:      ldr     x0, =ZR
        bl      puts
        b       99f

1:      ldr     x0, =ON
        bl      puts
        b       99f

2:      ldr     x0, =TW
        bl      puts
        b       99f

3:      ldr     x0, =TH
        bl      puts
        b       99f

4:      ldr     x0, =FR
        bl      puts
        b       99f

5:      ldr     x0, =FV
        bl      puts
        b       99f

6:      ldr     x0, =SX
        bl      puts
        b       99f

7:      ldr     x0, =SV
        bl      puts
        b       99f

99:     mov     w0, wzr
        ldr     x30, [sp], 16
        ret

        .data
        .section    .rodata

ZR:     .asciz      "0 returned"
ON:     .asciz      "1 returned"
TW:     .asciz      "2 returned"
TH:     .asciz      "3 returned"
FR:     .asciz      "4 returned"
FV:     .asciz      "5 returned"
SX:     .asciz      "6 returned"
SV:     .asciz      "7 returned"

        .end
