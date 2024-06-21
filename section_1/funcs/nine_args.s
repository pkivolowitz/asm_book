	.arch armv8-a
	.file	"nine_args.c"
	.text
	.section	.rodata.str1.8,"aMS",@progbits,1
	.align	3
.LC0:
	.string	"This example hurts my brain: %ld\n"
	.text
	.align	2
	.global	LessSillyFunction
	.type	LessSillyFunction, %function
LessSillyFunction:
.LFB23:
	.cfi_startproc
	stp	x29, x30, [sp, -16]!
	.cfi_def_cfa_offset 16
	.cfi_offset 29, -16
	.cfi_offset 30, -8
	mov	x29, sp
	mov	x2, x7
	adrp	x1, .LC0
	add	x1, x1, :lo12:.LC0
	mov	w0, 1
	bl	__printf_chk
	ldp	x29, x30, [sp], 16
	.cfi_restore 30
	.cfi_restore 29
	.cfi_def_cfa_offset 0
	ret
	.cfi_endproc
.LFE23:
	.size	LessSillyFunction, .-LessSillyFunction
	.section	.rodata.str1.8
	.align	3
.LC1:
	.string	"This example hurts my brain: %ld %ld\n"
	.text
	.align	2
	.global	SillyFunction
	.type	SillyFunction, %function
SillyFunction:
.LFB24:
	.cfi_startproc
	stp	x29, x30, [sp, -16]!
	.cfi_def_cfa_offset 16
	.cfi_offset 29, -16
	.cfi_offset 30, -8
	mov	x29, sp
	mov	x2, x7
	ldr	x3, [sp, 16]
	adrp	x1, .LC1
	add	x1, x1, :lo12:.LC1
	mov	w0, 1
	bl	__printf_chk
	ldp	x29, x30, [sp], 16
	.cfi_restore 30
	.cfi_restore 29
	.cfi_def_cfa_offset 0
	ret
	.cfi_endproc
.LFE24:
	.size	SillyFunction, .-SillyFunction
	.align	2
	.global	main
	.type	main, %function
main:
.LFB25:
	.cfi_startproc
	stp	x29, x30, [sp, -16]!
	.cfi_def_cfa_offset 16
	.cfi_offset 29, -16
	.cfi_offset 30, -8
	mov	x29, sp
	mov	x3, 9
	mov	x2, 8
	adrp	x1, .LC1
	add	x1, x1, :lo12:.LC1
	mov	w0, 1
	bl	__printf_chk
	mov	w0, 0
	ldp	x29, x30, [sp], 16
	.cfi_restore 30
	.cfi_restore 29
	.cfi_def_cfa_offset 0
	ret
	.cfi_endproc
.LFE25:
	.size	main, .-main
	.ident	"GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0"
	.section	.note.GNU-stack,"",@progbits
