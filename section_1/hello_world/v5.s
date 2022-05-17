    .global main
main:
    stp     x21, x30, [sp, -16]!    // push onto stack
    mov     x21, x1                 // argc -> x0, argv -> x1
    
    top:
    ldr     x0, [x21], 8            // argv++, old value in x0
    cbz     x0, bottom              // if *argv == NULL goto bottom
    bl      puts                    // puts(*argv)
    b       top                     // goto top
    
    bottom:
    ldp     x21, x30, [sp], 16      // pop from stack
    mov     x0, xzr                 // return 0
    ret
    
    .end
