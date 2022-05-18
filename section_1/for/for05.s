    // Assume i is implemented using x0

    mov x0, xzr

1:  cmp x0, 10
    bge 3f

    // FIRST PART OF CODE BLOCK

    // if (i == 5)
    //      continue

    cmp x0, 5
    beq 2f

    // REMAINDER OF CODE BLOCK

2:  add x0, x0, 1
    b   1b

3: