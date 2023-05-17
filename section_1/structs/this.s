	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 13, 0	sdk_version 13, 3
	.globl	__ZN9TestClass9SetStringEPc     ; -- Begin function _ZN9TestClass9SetStringEPc
	.p2align	2
__ZN9TestClass9SetStringEPc:            ; @_ZN9TestClass9SetStringEPc
	.cfi_startproc
; %bb.0:
	sub	sp, sp, #48
	.cfi_def_cfa_offset 48
	stp	x29, x30, [sp, #32]             ; 16-byte Folded Spill
	add	x29, sp, #32
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	stur	x0, [x29, #-8]
	str	x1, [sp, #16]
	ldur	x8, [x29, #-8]
	ldr	x9, [sp, #16]
	str	x9, [x8]
	ldr	x8, [x8]
	mov	x9, sp
	str	x8, [x9]
	adrp	x0, l_.str@PAGE
	add	x0, x0, l_.str@PAGEOFF
	bl	_printf
	ldp	x29, x30, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	__ZN9TestClass9GetStringEv      ; -- Begin function _ZN9TestClass9GetStringEv
	.p2align	2
__ZN9TestClass9GetStringEv:             ; @_ZN9TestClass9GetStringEv
	.cfi_startproc
; %bb.0:
	sub	sp, sp, #16
	.cfi_def_cfa_offset 16
	str	x0, [sp, #8]
	ldr	x8, [sp, #8]
	ldr	x0, [x8]
	add	sp, sp, #16
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	_main                           ; -- Begin function main
	.p2align	2
_main:                                  ; @main
	.cfi_startproc
; %bb.0:
	sub	sp, sp, #48
	.cfi_def_cfa_offset 48
	stp	x29, x30, [sp, #32]             ; 16-byte Folded Spill
	add	x29, sp, #32
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	mov	w8, #0
	stur	w8, [x29, #-8]                  ; 4-byte Folded Spill
	stur	wzr, [x29, #-4]
	adrp	x8, _test_string@PAGE
	ldr	x1, [x8, _test_string@PAGEOFF]
	adrp	x0, _tc@PAGE
	add	x0, x0, _tc@PAGEOFF
	str	x0, [sp, #16]                   ; 8-byte Folded Spill
	bl	__ZN9TestClass9SetStringEPc
	ldr	x0, [sp, #16]                   ; 8-byte Folded Reload
	bl	__ZN9TestClass9GetStringEv
	mov	x8, sp
	str	x0, [x8]
	adrp	x0, l_.str.2@PAGE
	add	x0, x0, l_.str.2@PAGEOFF
	bl	_printf
	ldur	w0, [x29, #-8]                  ; 4-byte Folded Reload
	ldp	x29, x30, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
	.cfi_endproc
                                        ; -- End function
	.section	__TEXT,__cstring,cstring_literals
l_.str:                                 ; @.str
	.asciz	"String set to: %s\n"

l_.str.1:                               ; @.str.1
	.asciz	"Test String"

	.section	__DATA,__data
	.globl	_test_string                    ; @test_string
	.p2align	3
_test_string:
	.quad	l_.str.1

	.globl	_tc                             ; @tc
.zerofill __DATA,__common,_tc,8,3
	.section	__TEXT,__cstring,cstring_literals
l_.str.2:                               ; @.str.2
	.asciz	"Stored string is: %s\n"

.subsections_via_symbols
