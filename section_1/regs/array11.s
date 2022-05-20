        .global FindOldestPerson
        .text
        .align  2

//  x0  has struct Person * people
//      will be used for oldest_ptr as this is the return value
//  w1  has int length
//  w2  used for oldest_age
//  x3  used for Person *
//  x4  used for end_ptr
//  w5  used for scratch

FindOldestPerson:
        cbz     x0, 99f             // short circuit
        mov     w2, wzr             // initial oldest age is 0
        mov     x3, x0              // initialize loop pointer
        mov     x0, xzr             // initialize return value
        mov     w5, 24              // struct is 24 bytes wide
        smaddl	x4, w1, w5, x3      // initialize end_ptr
        b       10f                 // enter loop

1:      ldr     w5, [x3, p.age]     // fetch loop ptr -> age
        cmp     w2, w5              // compare to oldest_age
    	csel	w2, w2, w5, gt      // update based on cmp
        csel	x0, x0, x3, gt      // update based on cmp
        add     x3, x3, 24          // increment loop ptr
10:     cmp     x3, x4              // has loop ptr reached end_ptr?
        blt     1b                  // no, not yet

99:     ret

        .data
        .struct 0
p.fn:   .skip   8
p.ln:   .skip   8
p.age:  .skip   4
p.pad:  .skip   4

        .end
