		.global		main
		.text
		.align		2

main:
		str			x30, [sp, 16]!

		ldr			x0, =fmt
		ldr			x1, =Fee
		ldr			x2, [x1]
		ldrh		w3, [x1, 8]
		ldr			w4, [x1, 12]
		bl			printf
		
		ldr			x30, [sp], 16
		mov			w0, wzr
		ret

		.data

fmt:	.asciz		"%p a: 0x%lx b: %x c: %x\n"
