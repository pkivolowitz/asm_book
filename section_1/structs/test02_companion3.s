		.global		main
		.text
		.align		2

main:
		str			x30, [sp, 16]!

		ldr			x0, =fmt
		ldr			x1, =Bar
		ldrh		w2, [x1, Foo.a]
		ldrb		w3, [x1, Foo.b]
		ldr			w4, [x1, Foo.c]
		bl			printf
		
		ldr			x30, [sp], 16
		mov			w0, wzr
		ret

		.section	Foo
		.struct		0			// a starts at 0 and goes for 2
Foo.a:	.struct		Foo.a + 2	// b starts at 2 and goes for 2
Foo.b:	.struct		Foo.b + 2	// c starts at 4 
Foo.c:

		.data

fmt:	.asciz		"%p a: 0x%x b: 0x%x c: 0x%x\n"
