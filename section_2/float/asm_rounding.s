        .global main
        .text
        .align  2

dless   .req    d20
dmore	.req	d21
ndless	.req    d22
ndmore	.req	d23

Emit:	str     x30, [sp, -16]!
		bl		printf
		ldr     x30, [sp], 16
		ret

main:   str     x30, [sp, -16]!
        stp     dless, dmore, [sp, -16]!
        stp     ndless, ndmore, [sp, -16]!

		ldr		x0, =vless
		ldr		dless, [x0]
		ldr		dmore, [x0, 8]
		ldr		ndless, [x0, 16]
		ldr		ndmore, [x0, 24]

//-fcvtps----------------------
		fcvtps	x1, dless
		fcvtps	x2, dmore
		ldr		x0, =fmt1
		bl		Emit

		fcvtps	x1, ndless
		fcvtps	x2, ndmore
		ldr		x0, =fmt1
		bl		Emit
//-fcvtms-----------------------
		fcvtms	x1, dless
		fcvtms	x2, dmore
		ldr		x0, =fmt2
		bl		Emit

		fcvtms	x1, ndless
		fcvtms	x2, ndmore
		ldr		x0, =fmt2
		bl		Emit
//-fcvtzs-----------------------
		fcvtzs	x1, dless
		fcvtzs	x2, dmore
		ldr		x0, =fmt4
		bl		Emit

		fcvtzs	x1, ndless
		fcvtzs	x2, ndmore
		ldr		x0, =fmt4
		bl		Emit
//-fcvtas-----------------------
		fcvtas	x1, dless
		fcvtas	x2, dmore
		ldr		x0, =fmt3
		bl		Emit

		fcvtas	x1, ndless
		fcvtas	x2, ndmore
		ldr		x0, =fmt3
		bl		Emit
//------------------------------

        ldp     ndless, ndmore, [sp], 16
        ldp     dless, dmore, [sp], 16
        ldr     x30, [sp], 16
		mov		w0, wzr
		ret
		
        .section    .rodata
vless:	.double		5.49
vmore:	.double		5.51
nvless:	.double		-5.49
nvmore:	.double		-5.51
fmt1:	.asciz		"fcvtps less: %d more: %d\n"
fmt2:	.asciz		"fcvtms less: %d more: %d\n"
fmt3:	.asciz		"fcvtta less: %d more: %d\n"
fmt4:	.asciz		"fcvtzs less: %d more: %d\n"

		.end
