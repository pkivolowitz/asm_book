		.text
		.global	main

SillyFunction:
		str		x30, [sp, -16]!
		ldr		x0, =fmt
		mov		x1, x7
		ldr		x2, [sp, 16]
		bl		printf
		ldr		x30, [sp], 32
		ret

main:	
		str		x30, [sp, -16]!
		mov		x0, 9
		str		x0, [sp, -16]!
		mov		x0, 1
		mov		x1, 2
		mov		x2, 3
		mov		x3, 4
		mov		x4, 5
		mov		x5, 6
		mov		x6, 7
		mov		x7, 8
		bl		SillyFunction
		ldr		x30, [sp], 32
		ret
	
		.data
fmt:	.asciz	"This example hurts my brain: %ld %ld\n"

		.end
