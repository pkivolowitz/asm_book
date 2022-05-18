    // Assume value of a is in x0
    // Assume value of b is in x1
    cmp     x0, x1
    ble     1f
    // CODE BLOCK IF TRUE
    b       2f
1:
    // CODE BLOCK IF FALSE
2: