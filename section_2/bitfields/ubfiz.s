		.global		main
		.text
		.align		2

main:	str			x30, [sp, -16]!
		mov 		w1, 0xFF
		mov			w2, 0x0A
		ubfiz		w1, w2, 0, 4
		ldr			x30, [sp], 16
		mov			w0, wzr
		ret
