#include "apple-linux-convergence.S"

// STRUCT DEFINITION WORKS ONLY FOR LINUX

		GLABEL		main
		.text
		.p2align    2

MAIN
        PUSH_P      x29, x30
        mov         x29, sp

		LLD_ADDR	x0, fmt
		LLD_ADDR	x1, bar
		ldrh		w2, [x1, Foo.a]
        ldrb        w3, [x1, Foo.b]
		ldr         w4, [x1, Foo.c]
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

        .section       Foo                                          
        .struct        0            // a starts at 0 and goes for 2 
Foo.a:  .struct        Foo.a + 2    // b starts at 2 and goes for 2 
Foo.b:  .struct        Foo.b + 2    // c starts at 4                
Foo.c:                                                              

		.data

fmt:    .asciz      "%p a: 0x%lx b: %x c: %x\n"
bar:    .short      0xaaaa 
        .byte       0xbb
        .byte       0               // padding
        .word       0xcccccccc

        .end
