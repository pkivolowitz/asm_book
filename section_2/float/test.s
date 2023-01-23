        .text
        .p2align    2
        .global      test

test:   fmov        d0, 1.0
        fmov        d0, 1.5
        fmov        d0, 1.75
        fmov        d0, 1.875
        fmov        d0, 1.9375
        fmov        d0, 1.96875
        ret

        .end
