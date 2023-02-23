		.p2align	2
		.text
		.global		main

main:		stp		x29, x30, [sp, -16]!
		str		x20, [sp, -16]!
		mov		x29, sp
		mov		x20, xzr

1:		cmp		x20, 10
		beq		2f
		ldr		x0, =fmt
		mov		x1, x20
		bl		printf
		add		x20, x20, 1
		b 		1b

2:		ldr		x20, [sp], 16
		ldp		x29, x30, [sp], 16
		mov		w0, wzr
		ret

		.data

fmt:	.asciz		"Number: %d\n"
		.end

