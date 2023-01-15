#include "macros.S"

        .align  2
        .text
        GLABEL main

//  adrp    loads an address using a page number containing the variable


MAIN
        START_PROC
        stp     x21, x30, [sp, -16]!
        str     x29, [sp, -16]!
        mov     x29, sp

        mov     x0, 8                   // allocating a long
        CRT     malloc                  // call malloc()
        mov     x1, 0xFF                // load payload
        str     x1, [x0]                // store payload
        LD_ADDR x1, ptr
        str     x0, [x1]

        LD_ADDR x0, fmt     // loads the address of fmt
        LD_ADDR x1, ptr     // loads **ptr
        ldr     x1, [x1]    // dereferences **ptr to make *ptr
        ldr     x2, [x1]    // dereferences *ptr to get value
#if defined(__APPLE__)
        stp     x1, x2, [sp, -16]!
        CRT     printf
        add     sp, sp, 16
#else
        CRT     printf
#endif
        
		mov		x0, xzr
        ldr     x29, [sp], 16
		ldp		x21, x30, [sp], 16
		ret
        END_PROC

        .data
ptr:    .space  8
fmt:    .asciz  "%p %ld\n"

        .end
