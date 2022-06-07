    // Assume i is implemented using x0

    mov x0, xzr

1:  cmp x0, 10
    bge 3f

    // CODE BLOCK "A"

    // if (i == 5)
    //      continue

    cmp x0, 5
    beq 2f

    // CODE BLOCK "B"

2:  add x0, x0, 1
    b   1b

3: