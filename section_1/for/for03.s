    // Assume i is implemented using x0
    
    mov     x0, xzr

1:  cmp     x0, 10
    bge     2f

    // CODE BLOCK

    add     x0, x0, 1
    b       1b

2: