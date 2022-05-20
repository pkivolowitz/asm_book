	.arch armv8-a
	.file	"array02.c"
	.text
	.align	2
	.p2align 3,,7
	.global	Sum
	.type	Sum, %function
Sum:
.LFB0:
	.cfi_startproc
	mov	x2, x0
	add	x1, x0, x1, lsl 3
	cmp	x2, x1
	mov	x0, 0
	bcs	.L1
	.p2align 3,,7
.L3:
	ldr	x3, [x2], 8
	add	x0, x0, x3
	cmp	x1, x2
	bhi	.L3
.L1:
	ret
	.cfi_endproc
.LFE0:
	.size	Sum, .-Sum
	.ident	"GCC: (Ubuntu 9.3.0-17ubuntu1~20.04) 9.3.0"
	.section	.note.GNU-stack,"",@progbits
