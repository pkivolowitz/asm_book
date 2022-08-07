		.global		main
		.align		2
		.text

main:	str			x30, [sp, -16]!
		mov			w0, 1				// stdout
		ldr			x1, =s 				// pointer to string
		ldr			x2, =ssize			// pointer to computed length
		ldr			w2, [x2]			// actual length of string
		bl			write

		ldr			x0, =fmt
		ldr			x1, =s 
		ldr 		x2, =ssize 
		ldr 		w2, [x2]
		bl			printf

		ldr			x30, [sp], 16
		mov			w0, wzr
		ret

		.data

s:		.asciz		"Hello, World!\n"
ssize:	.word		ssize - s - 1		// accounts for null at end
fmt:	.asciz		"str: %slen: %d\n"	// accounts for newline

		.end
