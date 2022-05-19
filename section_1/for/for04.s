    // Assume i is implemented using x0
    
    mov     x0, xzr
    b       2f

1:

    // CODE BLOCK

    add     x0, x0, 1
2:  cmp     x0, 10
    blt     1b
  