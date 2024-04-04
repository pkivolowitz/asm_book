        .text
        .p2align    2
        .global      test

test:   fmov        d0, 1.0       // 
        fmov        d0, 1.5       // 1/2
        fmov        d0, 1.75      // 1/2 + 1/4
        fmov        d0, 1.875     // 1/2 + 1/4 + 1/8
        fmov        d0, 1.9375    // 1/2 + 1/4 + 1/8 + 1/16
        fmov        d0, 1.96875   // 1/2 + 1/4 + 1/8 + 1/16 + 1/32
        ret

        .end
