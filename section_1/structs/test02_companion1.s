#include "apple-linux-convergence.S"

		GLABEL		main
		.text
		.p2align    2

MAIN
        PUSH_P      x29, x30
        mov         x29, sp

		LLD_ADDR	x0, fmt
		LLD_ADDR	x1, bar
		ldrh		w2, [x1, 0]
        ldrb        w3, [x1, 2]
		ldr         w4, [x1, 4]
#if defined(__APPLE__)
        PUSH_P      x3, x4
        PUSH_P      x1, x2
        CRT         printf
        add         sp, sp, 32
#else
		CRT         printf
#endif	
        POP_P       x29, x30
		mov			w0, wzr
		ret

		.data

fmt:    .asciz      "%p a: 0x%lx b: %x c: %x\n"
bar:    .short      0xaaaa 
        .byte       0xbb
        .byte       0               // padding
        .word       0xcccccccc

        .end
