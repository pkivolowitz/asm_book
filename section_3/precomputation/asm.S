#include "apple-linux-convergence.S"

        .text
        .p2align    2
        GLABEL      ifact
        GLABEL      rfact
        GLABEL      pfact

#if defined(__APPLE__)
_ifact:
#else
ifact:
#endif
        START_PROC

        // The parameter n comes to us in register x0. We want to
        // return the result in x0 so copy x0 to x2 for processing.
        // Then the calculation is straight forward with x1 serving as
        // the equivalent of i in the assembly language.
        //
        // A case can be made for counting down to 1 as this would
        // require 1 fewer register at the expense of a cmp to initially
        // vet the value.
        //
        // Finally, notice we did not backup and restore x29 and x30. We
        // can get away with this because we know this function calls no
        // other functions. Therefore, the value of the link register,
        // x30, remains undisturbed.

        mov         x2, x0
        mov         x0, 1       // equivalent to retval = 1
        mov         x1, 1       // equivalent to i = 1

        // For loops are typically implemented differently from what one
        // would imagine to save an instruction inside the loop. Here,
        // however, we implement it in the way a programmer coming from
        // C would expect.

        // This has five instructions (20 bytes) in the inner loop which
        // increases in work by O(n).

10:     cmp         x1, x2
        bgt         99f
        mul         x0, x0, x1
        add         x1, x1, 1
        b           10b

99: 
        ret
        END_PROC

#if defined(__APPLE__)
_rfact:
#else
rfact:
#endif
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp

        // The parameter n comes to us in x0 but it is passed by value.
        // That is, the n in C is a local variable. We need to keep the
        // present copy of n around when we recursively call ourselves
        // with n - 1.
        // 
        // Think stack when you think local variable. The argument can
        // be made to keep the local copy in a durable register but this
        // will mean a stack push anyway so instead, we choose to make
        // the stack push explicit by placing it at the recursive call.

        cmp         x0, 1
        bgt         10f
        mov         x0, 1       // ensure x0 is 1 - it could be less.
        b           99f

10:     // If we get here, n must be more then 1. Recursion is needed.

        // This has five instructions (20 bytes) in the inner loop which
        // increases in work by O(n) and also incurs references to RAM.

        PUSH_R      x0          // save the current n
        sub         x0, x0, 1   // prepare for recursion
        CRT         rfact       // borrow the macro to be x-compatible.
        POP_R       x1          // restore the current n
        mul         x0, x0, x1  // multiply it by recursive return

99:     POP_P       x29, x30
        ret
        END_PROC

#if defined(__APPLE__)
_pfact:
#else
pfact:
#endif
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp

        // The parameter comes to us in x0. Since we're using it to
        // create an address, we better vet the value to be between 1
        // and 15 inclusive.
        //
        // After that, the base address of the precomputed factorials
        // is loaded into x0. Then, the parameter n (having been
        // multiplied by 8) is added to the base address to form the
        // address of the precomputed factorial that we're after. It's
        // value is loaded into x0 for return.

        // Two instructions (8 bytes) are needed to form the correct
        // address. 15 * 8 bytes are needed for the precomputed values.
        // This summs to 118 bytes of ram needed, more than the previous
        // two methods. But, execution time is constant so is O(1). Far
        // faster.

        mov         x1, x0
        mov         x0, 1
        cmp         x1, xzr
        ble         99f
        cmp         x1, 15
        bgt         99f

        LLD_ADDR    x0, fv
        ldr         x0, [x0, x1, lsl 3]

99:     POP_P       x29, x30
        ret
        END_PROC

        .data

        .p2align    3
        
fv:     .dword      1
        .dword      1
        .dword      2
        .dword      6
        .dword      24
        .dword      120
        .dword      720
        .dword      5040
        .dword      40320
        .dword      362880
        .dword      3628800
        .dword      39916800
        .dword      479001600
        .dword      6227020800
        .dword      87178291200
        .dword      1307674368000

        .end
