        .text
        .global main
		.align	2

main:   str		x30, [sp, -16]!

		ldr		x0, =d
		ldr		d0, [x0]
		frintp	d0, d0
		ldr		x0, =fmt1
		bl		printf

		ldr		x0, =h
		ldr		d0, [x0]
		frintp	d0, d0
		ldr		x0, =fmt2
		bl		printf

		ldr		x30, [sp], 16
		mov		w0, wzr
        ret
        
		.data
fmt1:	.asciz	"with fraction:    %f\n"
fmt2:	.asciz	"without fraction: %f\n"
d:		.double	5.00000001
h:		.double 5.0
		.end
