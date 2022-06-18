        .global SetA
        .global SetB
        .global SetC
        .global ClearA
        .global ClearB
        .global ClearC

        .text
        .align  2

ClearA: ldrb    w1, [x0]
        mov     w2, 1
        mvn     w2, w2
        and     w1, w1, w2
        strb    w1, [x0]
        ret

ClearB: ldrb    w1, [x0]
        mov     w2, 6
        mvn     w2, w2
        and     w1, w1, w2
        strb    w1, [x0]
        ret

ClearC: ldrb    w1, [x0]
        and     w1, w1, 7
        strb    w1, [x0]
        ret

SetA:   ldrb    w1, [x0]
        mov     w2, 1
        mvn     w2, w2
        and     w1, w1, w2
        orr     w1, w1, 1
        strb    w1, [x0]
        ret


SetB:   ldrb    w3, [x0]
        and     w1, w1, 3           // value &= 3
        lsl     w1, w1, 1
        mov     w2, 6
        mvn     w2, w2
        and     w3, w3, w2          // B is cleared
        orr     w3, w3, w1
        strb    w3, [x0]
        ret

SetC:   ldrb    w3, [x0]

        mov     w2, 0x1F
        and     w1, w1, w2
        lsl     w1, w1, 3

        lsl     w2, w2, 3
        mvn     w2, w2
        and     w3, w3, w2

        orr     w3, w3, w1
        strb    w3, [x0]
        ret

        .end 

        