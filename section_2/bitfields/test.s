	.arch armv8-a
	.file	"test.c"
	.text
	.align	2
	.p2align 3,,7
	.global	Foo
	.type	Foo, %function
Foo:
.LFB23:
	.cfi_startproc
	and	w0, w0, 255
	mvn	w0, w0
	ret
	.cfi_endproc
.LFE23:
	.size	Foo, .-Foo
	.align	2
	.p2align 3,,7
	.global	ClearA
	.type	ClearA, %function
ClearA:
.LFB24:
	.cfi_startproc
	ldrb	w1, [x0]
	and	w1, w1, -2
	strb	w1, [x0]
	ret
	.cfi_endproc
.LFE24:
	.size	ClearA, .-ClearA
	.align	2
	.p2align 3,,7
	.global	SetA
	.type	SetA, %function
SetA:
.LFB25:
	.cfi_startproc
	ldrb	w1, [x0]
	orr	w1, w1, 1
	strb	w1, [x0]
	ret
	.cfi_endproc
.LFE25:
	.size	SetA, .-SetA
	.align	2
	.p2align 3,,7
	.global	ClearB
	.type	ClearB, %function
ClearB:
.LFB26:
	.cfi_startproc
	ldrb	w1, [x0]
	and	w1, w1, -7
	strb	w1, [x0]
	ret
	.cfi_endproc
.LFE26:
	.size	ClearB, .-ClearB
	.align	2
	.p2align 3,,7
	.global	SetB
	.type	SetB, %function
SetB:
.LFB27:
	.cfi_startproc
	ldrb	w2, [x0]
	bfi	w2, w1, 1, 2
	strb	w2, [x0]
	ret
	.cfi_endproc
.LFE27:
	.size	SetB, .-SetB
	.align	2
	.p2align 3,,7
	.global	ClearC
	.type	ClearC, %function
ClearC:
.LFB28:
	.cfi_startproc
	ldrb	w1, [x0]
	and	w1, w1, 7
	strb	w1, [x0]
	ret
	.cfi_endproc
.LFE28:
	.size	ClearC, .-ClearC
	.align	2
	.p2align 3,,7
	.global	SetC
	.type	SetC, %function
SetC:
.LFB29:
	.cfi_startproc
	ldrb	w2, [x0]
	ubfiz	w1, w1, 3, 5
	and	w2, w2, 7
	orr	w2, w2, w1
	strb	w2, [x0]
	ret
	.cfi_endproc
.LFE29:
	.size	SetC, .-SetC
	.section	.rodata.str1.8,"aMS",@progbits,1
	.align	3
.LC0:
	.string	"noBF should be 0x3A - value: 0x%X\n"
	.align	3
.LC1:
	.string	"bf   should be 0x1D - value: 0x%X\n"
	.section	.text.startup,"ax",@progbits
	.align	2
	.p2align 3,,7
	.global	main
	.type	main, %function
main:
.LFB30:
	.cfi_startproc
	stp	x29, x30, [sp, -32]!
	.cfi_def_cfa_offset 32
	.cfi_offset 29, -32
	.cfi_offset 30, -24
	mov	w5, 2
	mov	w4, 3
	mov	x29, sp
	ldrb	w0, [sp, 24]
	adrp	x2, .LANCHOR0
	adrp	x1, .LC0
	add	x1, x1, :lo12:.LC0
	orr	w0, w0, 1
	strb	w0, [sp, 24]
	mov	w0, 58
	strb	w0, [x2, #:lo12:.LANCHOR0]
	ldrb	w3, [sp, 24]
	mov	w2, 58
	mov	w0, 1
	bfi	w3, w5, 1, 2
	strb	w3, [sp, 24]
	ldrb	w3, [sp, 24]
	bfi	w3, w4, 3, 5
	strb	w3, [sp, 24]
	bl	__printf_chk
	ldrb	w2, [sp, 24]
	adrp	x1, .LC1
	mov	w0, 1
	add	x1, x1, :lo12:.LC1
	bl	__printf_chk
	mov	w0, 0
	ldp	x29, x30, [sp], 32
	.cfi_restore 30
	.cfi_restore 29
	.cfi_def_cfa_offset 0
	ret
	.cfi_endproc
.LFE30:
	.size	main, .-main
	.global	noBF
	.bss
	.set	.LANCHOR0,. + 0
	.type	noBF, %object
	.size	noBF, 1
noBF:
	.zero	1
	.ident	"GCC: (Ubuntu 9.4.0-1ubuntu1~20.04.1) 9.4.0"
	.section	.note.GNU-stack,"",@progbits
