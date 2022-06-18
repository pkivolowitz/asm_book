	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 12, 0	sdk_version 12, 3
	.globl	_ClearA                         ; -- Begin function ClearA
	.p2align	2
_ClearA:                                ; @ClearA
	.cfi_startproc
; %bb.0:
	ldrb	w8, [x0]
	and	w8, w8, #0xfe
	strb	w8, [x0]
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	_SetA                           ; -- Begin function SetA
	.p2align	2
_SetA:                                  ; @SetA
	.cfi_startproc
; %bb.0:
	ldrb	w8, [x0]
	orr	w8, w8, #0x1
	strb	w8, [x0]
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	_ClearB                         ; -- Begin function ClearB
	.p2align	2
_ClearB:                                ; @ClearB
	.cfi_startproc
; %bb.0:
	ldrb	w8, [x0]
	and	w8, w8, #0xfffffff9
	strb	w8, [x0]
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	_SetB                           ; -- Begin function SetB
	.p2align	2
_SetB:                                  ; @SetB
	.cfi_startproc
; %bb.0:
	ldrb	w8, [x0]
	and	w8, w8, #0xfffffff9
	ubfiz	w9, w1, #1, #2
	orr	w8, w8, w9
	strb	w8, [x0]
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	_ClearC                         ; -- Begin function ClearC
	.p2align	2
_ClearC:                                ; @ClearC
	.cfi_startproc
; %bb.0:
	ldrb	w8, [x0]
	and	w8, w8, #0x7
	strb	w8, [x0]
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	_SetC                           ; -- Begin function SetC
	.p2align	2
_SetC:                                  ; @SetC
	.cfi_startproc
; %bb.0:
	ldrb	w8, [x0]
	bfi	w8, w1, #3, #8
	strb	w8, [x0]
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	_main                           ; -- Begin function main
	.p2align	2
_main:                                  ; @main
	.cfi_startproc
; %bb.0:
	sub	sp, sp, #48
	stp	x20, x19, [sp, #16]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #32]             ; 16-byte Folded Spill
	add	x29, sp, #32
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset w19, -24
	.cfi_offset w20, -32
	ldrb	w8, [sp, #15]
	orr	w8, w8, #0x1
	strb	w8, [sp, #15]
	ldrb	w8, [sp, #15]
	and	w8, w8, #0xfffffff9
	orr	w8, w8, #0x4
	strb	w8, [sp, #15]
	ldrb	w8, [sp, #15]
	mov	w19, #24
	bfxil	w19, w8, #0, #3
	strb	w19, [sp, #15]
	mov	w8, #58
	adrp	x9, _noBF@PAGE
	strb	w8, [x9, _noBF@PAGEOFF]
	str	x8, [sp]
Lloh0:
	adrp	x0, l_.str@PAGE
Lloh1:
	add	x0, x0, l_.str@PAGEOFF
	bl	_printf
	str	x19, [sp]
Lloh2:
	adrp	x0, l_.str.1@PAGE
Lloh3:
	add	x0, x0, l_.str.1@PAGEOFF
	bl	_printf
	mov	w0, #0
	ldp	x29, x30, [sp, #32]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #16]             ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
	.loh AdrpAdd	Lloh2, Lloh3
	.loh AdrpAdd	Lloh0, Lloh1
	.cfi_endproc
                                        ; -- End function
	.globl	_noBF                           ; @noBF
.zerofill __DATA,__common,_noBF,1,0
	.section	__TEXT,__cstring,cstring_literals
l_.str:                                 ; @.str
	.asciz	"noBF should be 0x3A - value: 0x%X\n"

l_.str.1:                               ; @.str.1
	.asciz	"bf   should be 0x1D - value: 0x%X\n"

.subsections_via_symbols
