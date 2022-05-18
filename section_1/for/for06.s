    // Assume i is implemented using x0

    mov x0, xzr
    b   3f

1:  

    // FIRST PART OF CODE BLOCK

    // if (i == 5)
    //      continue

    cmp x0, 5
    beq 2f

    // REMAINDER OF CODE BLOCK

2:  add x0, x0, 1
3:  cmp x0, 10
    blt 1b