		.global		main
		.text
		.align		2

 		.equ		foo_a, 0		# like #define
 		.equ		foo_b, 2		# like #define
		.equ		foo_c, 4		# like #define

main:
		str			x30, [sp, 16]!

		ldr			x0, =fmt
		ldr			x1, =Bar
		ldrh		w2, [x1, foo_a]
		ldrb		w3, [x1, foo_b]
		ldr			w4, [x1, foo_c]
		bl			printf
		
		ldr			x30, [sp], 16
		mov			w0, wzr
		ret

		.data

fmt:	.asciz		"%p a: 0x%x b: 0x%x c: 0x%x\n"
