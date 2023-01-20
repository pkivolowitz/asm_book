#include "apple-linux-convergence.S"

        GLABEL  main
        .text
        .align  2

dless   .req    d20
dmore	.req	d21
ndless	.req    d22
ndmore	.req	d23

Emit:  
        START_PROC
    	PUSH_P  x29, x30
        mov     x29, sp
#if defined(__APPLE__)
        PUSH_P  x1, x2
		CRT	    printf
        add     sp, sp, 16
#else
        CRT     printf
#endif
		POP_P   x29, x30
		ret
        END_PROC

MAIN
        START_PROC
        PUSH_P      x29, x30
        stp         dless, dmore, [sp, -16]!
        stp         ndless, ndmore, [sp, -16]!
        mov         x29, sp

        LLD_ADDR    x0, leg
        CRT         printf

		LLD_ADDR	x0, vless
		ldr		    dless, [x0]
		ldr		    dmore, [x0, 8]
		ldr		    ndless, [x0, 16]
		ldr		    ndmore, [x0, 24]

//-fcvtps- Floating-point Convert to Signed integer, rounding toward Plus infinity 
		fcvtps	    x1, dless
		fcvtps	    x2, dmore
		LLD_ADDR    x0, fmt1
		bl		    Emit

		fcvtps	    x1, ndless
		fcvtps	    x2, ndmore
		LLD_ADDR    x0, fmt1
		bl		    Emit
//-fcvtns- Floating-point Convert to Signed integer, rounding to nearest with ties to even (scalar).
		fcvtns	    x1, dless
		fcvtns	    x2, dmore
    	LLD_ADDR    x0, fmt2
		bl		    Emit

		fcvtns	    x1, ndless
		fcvtns	    x2, ndmore
    	LLD_ADDR    x0, fmt2
		bl		    Emit
//-fcvtzs- Floating-point Convert to Signed integer, rounding toward Zero (scalar).
		fcvtzs	    x1, dless
		fcvtzs	    x2, dmore
    	LLD_ADDR    x0, fmt4
		bl		    Emit

		fcvtzs	    x1, ndless
		fcvtzs	    x2, ndmore
    	LLD_ADDR    x0, fmt4
		bl		    Emit
//-fcvtas- Floating-point Convert to Signed integer, rounding to nearest with ties to Away (scalar).
		fcvtas	    x1, dless
		fcvtas	    x2, dmore
    	LLD_ADDR    x0, fmt3
		bl		    Emit

		fcvtas	    x1, ndless
		fcvtas	    x2, ndmore
    	LLD_ADDR    x0, fmt3
		bl		    Emit
//------------------------------

        ldp         ndless, ndmore, [sp], 16
        ldp         dless, dmore, [sp], 16
        POP_P       x29, x30
		mov		    w0, wzr
		ret
		END_PROC
        
        .data
vless:	.double		5.49
vmore:	.double		5.51
nvless:	.double		-5.49
nvmore:	.double		-5.51
fmt1:	.asciz		"fcvtps less: %d more: %d\n"
fmt2:	.asciz		"fcvtns less: %d more: %d\n"
fmt3:	.asciz		"fcvtta less: %d more: %d\n"
fmt4:	.asciz		"fcvtzs less: %d more: %d\n"
leg:    .asciz      "less values are +/- 5.49. more values are +/- 5.51.\n"

		.end
