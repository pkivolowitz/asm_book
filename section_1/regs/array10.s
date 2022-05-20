	.arch armv8-a
	.file	"array10.c"
	.text
	.align	2
	.p2align 3,,7
	.global	OriginalFindOldestPerson
	.type	OriginalFindOldestPerson, %function
OriginalFindOldestPerson:
.LFB23:
	.cfi_startproc
	mov	x2, x0
	cbz	x0, .L5
	mov	w4, 24
	smaddl	x4, w1, w4, x0
	mov	x0, 0
	cmp	x2, x4
	bcs	.L1
	mov	w1, 0
	.p2align 3,,7
.L4:
	ldr	w3, [x2, 16]
	cmp	w1, w3
	csel	x0, x0, x2, ge
	add	x2, x2, 24
	csel	w1, w1, w3, ge
	cmp	x4, x2
	bhi	.L4
.L1:
	ret
	.p2align 2,,3
.L5:
	mov	x0, 0
	ret
	.cfi_endproc
.LFE23:
	.size	OriginalFindOldestPerson, .-OriginalFindOldestPerson
	.section	.rodata.str1.8,"aMS",@progbits,1
	.align	3
.LC0:
	.string	"%d"
	.section	.text.startup,"ax",@progbits
	.align	2
	.p2align 3,,7
	.global	main
	.type	main, %function
main:
.LFB24:
	.cfi_startproc
	sub	sp, sp, #560
	.cfi_def_cfa_offset 560
	stp	x29, x30, [sp]
	.cfi_offset 29, -560
	.cfi_offset 30, -552
	mov	x29, sp
	stp	x23, x24, [sp, 48]
	.cfi_offset 23, -512
	.cfi_offset 24, -504
	adrp	x23, :got:__stack_chk_guard
	add	x24, sp, 568
	ldr	x0, [x23, #:got_lo12:__stack_chk_guard]
	stp	x21, x22, [sp, 32]
	.cfi_offset 21, -528
	.cfi_offset 22, -520
	add	x21, sp, 72
	ldr	x1, [x0]
	str	x1, [sp, 552]
	mov	x1,0
	stp	x19, x20, [sp, 16]
	.cfi_offset 19, -544
	.cfi_offset 20, -536
	add	x20, x21, 16
	mov	x19, x21
	mov	w22, 5000
	.p2align 3,,7
.L10:
	bl	rand
	and	w0, w0, w22
	str	w0, [x20], 24
	cmp	x20, x24
	bne	.L10
	mov	x0, x21
	mov	w1, 20
	adrp	x22, .LC0
	bl	FindOldestPerson
	add	x21, x21, 480
	mov	x20, x0
	add	x22, x22, :lo12:.LC0
	.p2align 3,,7
.L14:
	ldr	w2, [x19, 16]
	mov	x1, x22
	mov	w0, 1
	bl	__printf_chk
	cmp	x20, x19
	beq	.L18
	add	x19, x19, 24
	mov	w0, 10
	bl	putchar
	cmp	x19, x21
	bne	.L14
.L13:
	ldr	x23, [x23, #:got_lo12:__stack_chk_guard]
	ldr	x0, [sp, 552]
	ldr	x1, [x23]
	subs	x0, x0, x1
	mov	x1, 0
	bne	.L19
	mov	w0, 0
	ldp	x29, x30, [sp]
	ldp	x19, x20, [sp, 16]
	ldp	x21, x22, [sp, 32]
	ldp	x23, x24, [sp, 48]
	add	sp, sp, 560
	.cfi_remember_state
	.cfi_restore 29
	.cfi_restore 30
	.cfi_restore 23
	.cfi_restore 24
	.cfi_restore 21
	.cfi_restore 22
	.cfi_restore 19
	.cfi_restore 20
	.cfi_def_cfa_offset 0
	ret
	.p2align 2,,3
.L18:
	.cfi_restore_state
	mov	w0, 42
	bl	putchar
	add	x19, x20, 24
	mov	w0, 10
	bl	putchar
	cmp	x19, x21
	bne	.L14
	b	.L13
.L19:
	bl	__stack_chk_fail
	.cfi_endproc
.LFE24:
	.size	main, .-main
	.ident	"GCC: (Ubuntu 9.3.0-17ubuntu1~20.04) 9.3.0"
	.section	.note.GNU-stack,"",@progbits
