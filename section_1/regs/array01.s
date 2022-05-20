	.arch armv8-a
	.file	"array01.c"
	.text
	.align	2
	.global	Sum
	.type	Sum, %function
Sum:
.LFB0:
	.cfi_startproc
	sub	sp, sp, #32
	.cfi_def_cfa_offset 32
	str	x0, [sp, 8]
	str	x1, [sp]
	str	xzr, [sp, 16]
	str	xzr, [sp, 24]
	b	.L2
.L3:
	ldr	x0, [sp, 24]
	lsl	x0, x0, 3
	ldr	x1, [sp, 8]
	add	x0, x1, x0
	ldr	x0, [x0]
	ldr	x1, [sp, 16]
	add	x0, x1, x0
	str	x0, [sp, 16]
	ldr	x0, [sp, 24]
	add	x0, x0, 1
	str	x0, [sp, 24]
.L2:
	ldr	x1, [sp, 24]
	ldr	x0, [sp]
	cmp	x1, x0
	blt	.L3
	ldr	x0, [sp, 16]
	add	sp, sp, 32
	.cfi_def_cfa_offset 0
	ret
	.cfi_endproc
.LFE0:
	.size	Sum, .-Sum
	.ident	"GCC: (Ubuntu 9.3.0-17ubuntu1~20.04) 9.3.0"
	.section	.note.GNU-stack,"",@progbits
