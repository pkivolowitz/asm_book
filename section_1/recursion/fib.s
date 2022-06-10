	.arch armv8-a
	.file	"fib.c"
	.text
	.align	2
	.global	FibonacciInC
	.type	FibonacciInC, %function
FibonacciInC:
.LFB0:
	.cfi_startproc
	stp	x29, x30, [sp, -48]!
	.cfi_def_cfa_offset 48
	.cfi_offset 29, -48
	.cfi_offset 30, -40
	mov	x29, sp
	str	x19, [sp, 16]
	.cfi_offset 19, -32
	str	w0, [sp, 44]
	ldr	w0, [sp, 44]
	cmp	w0, 1
	bhi	.L2
	ldr	w0, [sp, 44]
	b	.L3
.L2:
	ldr	w0, [sp, 44]
	sub	w0, w0, #1
	bl	FibonacciInC
	mov	w19, w0
	ldr	w0, [sp, 44]
	sub	w0, w0, #2
	bl	FibonacciInC
	add	w0, w19, w0
.L3:
	ldr	x19, [sp, 16]
	ldp	x29, x30, [sp], 48
	.cfi_restore 30
	.cfi_restore 29
	.cfi_restore 19
	.cfi_def_cfa_offset 0
	ret
	.cfi_endproc
.LFE0:
	.size	FibonacciInC, .-FibonacciInC
	.section	.rodata
	.align	3
.LC0:
	.string	"In C:"
	.align	3
.LC1:
	.string	"Fibonacci number %2d is: %d\n"
	.align	3
.LC2:
	.string	"In assembly language:"
	.text
	.align	2
	.global	main
	.type	main, %function
main:
.LFB1:
	.cfi_startproc
	stp	x29, x30, [sp, -32]!
	.cfi_def_cfa_offset 32
	.cfi_offset 29, -32
	.cfi_offset 30, -24
	mov	x29, sp
	adrp	x0, .LC0
	add	x0, x0, :lo12:.LC0
	bl	puts
	str	wzr, [sp, 24]
	b	.L5
.L6:
	ldr	w0, [sp, 24]
	bl	FibonacciInC
	mov	w2, w0
	ldr	w1, [sp, 24]
	adrp	x0, .LC1
	add	x0, x0, :lo12:.LC1
	bl	printf
	ldr	w0, [sp, 24]
	add	w0, w0, 1
	str	w0, [sp, 24]
.L5:
	ldr	w0, [sp, 24]
	cmp	w0, 9
	bls	.L6
	adrp	x0, .LC2
	add	x0, x0, :lo12:.LC2
	bl	puts
	str	wzr, [sp, 28]
	b	.L7
.L8:
	ldr	w0, [sp, 28]
	bl	Fib
	mov	w2, w0
	ldr	w1, [sp, 28]
	adrp	x0, .LC1
	add	x0, x0, :lo12:.LC1
	bl	printf
	ldr	w0, [sp, 28]
	add	w0, w0, 1
	str	w0, [sp, 28]
.L7:
	ldr	w0, [sp, 28]
	cmp	w0, 9
	bls	.L8
	mov	w0, 0
	ldp	x29, x30, [sp], 32
	.cfi_restore 30
	.cfi_restore 29
	.cfi_def_cfa_offset 0
	ret
	.cfi_endproc
.LFE1:
	.size	main, .-main
	.ident	"GCC: (Ubuntu 9.4.0-1ubuntu1~20.04.1) 9.4.0"
	.section	.note.GNU-stack,"",@progbits
