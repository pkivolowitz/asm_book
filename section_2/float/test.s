	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 13, 0	sdk_version 13, 1
	.globl	_main                           ; -- Begin function main
	.p2align	2
_main:                                  ; @main
	.cfi_startproc
; %bb.0:
	sub	sp, sp, #80
	stp	x22, x21, [sp, #32]             ; 16-byte Folded Spill
	stp	x20, x19, [sp, #48]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #64]             ; 16-byte Folded Spill
	add	x29, sp, #64
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset w19, -24
	.cfi_offset w20, -32
	.cfi_offset w21, -40
	.cfi_offset w22, -48
Lloh0:
	adrp	x20, _d@PAGE
Lloh1:
	add	x20, x20, _d@PAGEOFF
	ldr	d0, [x20]
Lloh2:
	adrp	x21, _f@PAGE
Lloh3:
	add	x21, x21, _f@PAGEOFF
	ldr	s1, [x21]
	fcvt	d1, s1
	str	d1, [sp, #16]
	str	d0, [sp, #8]
	str	xzr, [sp]
Lloh4:
	adrp	x19, l_.str@PAGE
Lloh5:
	add	x19, x19, l_.str@PAGEOFF
	mov	x0, x19
	bl	_printf
	ldr	d0, [x20, #8]
	ldr	s1, [x21, #4]
	fcvt	d1, s1
	str	d1, [sp, #16]
	str	d0, [sp, #8]
	mov	w8, #1
	str	x8, [sp]
	mov	x0, x19
	bl	_printf
	ldr	d0, [x20, #16]
	ldr	s1, [x21, #8]
	fcvt	d1, s1
	str	d1, [sp, #16]
	str	d0, [sp, #8]
	mov	w8, #2
	str	x8, [sp]
	mov	x0, x19
	bl	_printf
	ldr	d0, [x20, #24]
	ldr	s1, [x21, #12]
	fcvt	d1, s1
	str	d1, [sp, #16]
	str	d0, [sp, #8]
	mov	w8, #3
	str	x8, [sp]
	mov	x0, x19
	bl	_printf
	mov	w0, #0
	ldp	x29, x30, [sp, #64]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #48]             ; 16-byte Folded Reload
	ldp	x22, x21, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #80
	ret
	.loh AdrpAdd	Lloh4, Lloh5
	.loh AdrpAdd	Lloh2, Lloh3
	.loh AdrpAdd	Lloh0, Lloh1
	.cfi_endproc
                                        ; -- End function
	.section	__DATA,__data
	.globl	_d                              ; @d
	.p2align	3
_d:
	.quad	0x3ff8e38da3c21188              ; double 1.555555
	.quad	0x40055554fbdad752              ; double 2.6666660000000002
	.quad	0x400e38e325d4a5df              ; double 3.7777769999999999
	.quad	0x40138e38a7e73a36              ; double 4.8888879999999997

	.globl	_f                              ; @f
	.p2align	2
_f:
	.long	0x3f8e38e3                      ; float 1.11111104
	.long	0x400e38e3                      ; float 2.22222209
	.long	0x40555554                      ; float 3.33333302
	.long	0x408e38e3                      ; float 4.44444418

	.section	__TEXT,__cstring,cstring_literals
l_.str:                                 ; @.str
	.asciz	"index %ld double %f float %f\n"

.subsections_via_symbols
