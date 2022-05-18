    // Assume value of a is in x0
    // Assume value of b is in x1
 
 1: cmp     x0, x1
    ble     2f
    // CODE BLOCK
    b       1b
    
2: