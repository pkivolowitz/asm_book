#include "apple-linux-convergence.S"

		GLABEL		main
		.text
		.p2align    2

        .equ        foo_a, 0  // like #define
        .equ        foo_b, 2  // like #define
        .equ        foo_c, 4  // like #define

MAIN
        PUSH_P      x29, x30
        mov         x29, sp

		LLD_ADDR	x0, fmt
		LLD_ADDR	x1, bar
		ldrh		w2, [x1, foo_a]
        ldrb        w3, [x1, foo_b]
		ldr         w4, [x1, foo_c]
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
