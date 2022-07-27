        .global		main
        .text
        .align		2
/*	This demo should be run from gdb. `layout regs` would be helpful.
    This demo shows:
    bfi - bit field insert
*/
main:   mov         w1, wzr        // 
        mvn         w1, w1         // set w1 to 0xFFFFFFFF
        mov         w3, w1         // save for reuse
        mov         w2, 3          // set bits 0 and 1
        bfi         w1, w2, 4, 4
        // Look at w1. You will note that the bottom
        // 4 bits of w2 (0011) have been copied into the second
        // 4 bits of w1 including the zeros.
        //
        // NEXT DEMO
        mov         w1, w3         // reset w1
        mov         w2, 3          // set bits 0 and 1
        ubfiz       w1, w2, 4, 2
        // Look at w1. You will note that all the bits were
        // zeroed and then 2 bits from w2 are copied into w1
        // starting at bit 4. Compare this to bfi.
        //
        // NEXT DEMO
        bfxil       w3, w1, 4, 4	
        // Look at w3. You will note that 4 bits (0011) from
        // w1 were put into w3 starting at bit 0.
        mov         w0, wzr
        ret
