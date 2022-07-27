        .global SetA
        .global SetB
        .global SetC
        .global ClearA
        .global ClearB
        .global ClearC

        .text
        .align  2

ClearA: ldrb    w1, [x0]
        and     w1, w1, 0xFE
        strb    w1, [x0]
        ret

ClearB: ldrb    w1, [x0]
		mov		w2, 0xF9
        and     w1, w1, w2
        strb    w1, [x0]
        ret

ClearC: ldrb    w1, [x0]
        and     w1, w1, 7
        strb    w1, [x0]
        ret

SetA:   ldrb    w1, [x0]
        orr     w1, w1, 1
        strb    w1, [x0]
        ret


SetB:   ldrb    w3, [x0]
		bfi		w3, w1, 1, 2    // copy bit 0..1 in w1 to bit 1..2 in w3
        strb    w3, [x0]
        ret

SetC:   ldrb    w2, [x0]        // put *byte into w2
        ubfiz   w1, w1, 3, 5    // zero new w1, copy bits 0..4 to 3..7
        and     w2, w2, 7       // preserve only 1st 3 bits in *byte
        orr     w2, w2, w1		// or in value into *byte
        strb    w2, [x0]
        ret

        .end 

        