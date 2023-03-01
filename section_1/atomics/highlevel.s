	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 13, 0	sdk_version 13, 1
	.globl	__Z11NakedWorkerv               ; -- Begin function _Z11NakedWorkerv
	.p2align	2
__Z11NakedWorkerv:                      ; @_Z11NakedWorkerv
	.cfi_startproc
; %bb.0:
	mov	w8, #10000
	adrp	x9, _naked_int@PAGE
LBB0_1:                                 ; =>This Inner Loop Header: Depth=1
	ldr	w10, [x9, _naked_int@PAGEOFF]
	add	w10, w10, #1
	str	w10, [x9, _naked_int@PAGEOFF]
	subs	w8, w8, #1
	b.ne	LBB0_1
; %bb.2:
	ret
	.cfi_endproc
                                        ; -- End function
	.globl	__Z12AtomicWorkerv              ; -- Begin function _Z12AtomicWorkerv
	.p2align	2
__Z12AtomicWorkerv:                     ; @_Z12AtomicWorkerv
	.cfi_startproc
; %bb.0:
	mov	w8, #10000
	mov	w9, #1
	mov	w10, #30
Lloh0:
	adrp	x11, _atomic_integer@PAGE
Lloh1:
	add	x11, x11, _atomic_integer@PAGEOFF
LBB1_1:                                 ; =>This Inner Loop Header: Depth=1
	ldaddal	w9, w12, [x11]
	ldar	w12, [x11]
	mul	w12, w12, w10
	stlr	w12, [x11]
	subs	w8, w8, #1
	b.ne	LBB1_1
; %bb.2:
	ret
	.loh AdrpAdd	Lloh0, Lloh1
	.cfi_endproc
                                        ; -- End function
	.globl	__Z7DoNakedv                    ; -- Begin function _Z7DoNakedv
	.p2align	2
__Z7DoNakedv:                           ; @_Z7DoNakedv
Lfunc_begin0:
	.cfi_startproc
	.cfi_personality 155, ___gxx_personality_v0
	.cfi_lsda 16, Lexception0
; %bb.0:
	sub	sp, sp, #128
	stp	x28, x27, [sp, #32]             ; 16-byte Folded Spill
	stp	x26, x25, [sp, #48]             ; 16-byte Folded Spill
	stp	x24, x23, [sp, #64]             ; 16-byte Folded Spill
	stp	x22, x21, [sp, #80]             ; 16-byte Folded Spill
	stp	x20, x19, [sp, #96]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #112]            ; 16-byte Folded Spill
	add	x29, sp, #112
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset w19, -24
	.cfi_offset w20, -32
	.cfi_offset w21, -40
	.cfi_offset w22, -48
	.cfi_offset w23, -56
	.cfi_offset w24, -64
	.cfi_offset w25, -72
	.cfi_offset w26, -80
	.cfi_offset w27, -88
	.cfi_offset w28, -96
	mov	x27, #0
	stp	xzr, xzr, [sp, #8]
	mov	w24, #16
	mov	x25, #1152921504606846975
Lloh2:
	adrp	x19, __Z11NakedWorkerv@PAGE
Lloh3:
	add	x19, x19, __Z11NakedWorkerv@PAGEOFF
	str	xzr, [sp, #24]
	mov	x26, #2305843009213693951
	b	LBB2_3
LBB2_1:                                 ;   in Loop: Header=BB2_3 Depth=1
	str	x20, [x27], #8
	str	x27, [sp, #16]
LBB2_2:                                 ;   in Loop: Header=BB2_3 Depth=1
	subs	w24, w24, #1
	b.eq	LBB2_15
LBB2_3:                                 ; =>This Inner Loop Header: Depth=1
Ltmp0:
	mov	w0, #8
	bl	__Znwm
Ltmp1:
; %bb.4:                                ;   in Loop: Header=BB2_3 Depth=1
	mov	x20, x0
Ltmp2:
	mov	x1, x19
	bl	__ZNSt3__16threadC2IRFvvEJEvEEOT_DpOT0_
Ltmp3:
; %bb.5:                                ;   in Loop: Header=BB2_3 Depth=1
	ldr	x8, [sp, #24]
	cmp	x27, x8
	b.lo	LBB2_1
; %bb.6:                                ;   in Loop: Header=BB2_3 Depth=1
	ldr	x21, [sp, #8]
	sub	x22, x27, x21
	asr	x27, x22, #3
	add	x9, x27, #1
	lsr	x10, x9, #61
	cbnz	x10, LBB2_22
; %bb.7:                                ;   in Loop: Header=BB2_3 Depth=1
	sub	x8, x8, x21
	asr	x10, x8, #2
	cmp	x10, x9
	csel	x9, x9, x10, lo
	cmp	x25, x8, asr #3
	csel	x28, x9, x26, hi
	cbz	x28, LBB2_14
; %bb.8:                                ;   in Loop: Header=BB2_3 Depth=1
	lsr	x8, x28, #61
	cbnz	x8, LBB2_23
; %bb.9:                                ;   in Loop: Header=BB2_3 Depth=1
	lsl	x0, x28, #3
Ltmp5:
	bl	__Znwm
Ltmp6:
; %bb.10:                               ;   in Loop: Header=BB2_3 Depth=1
	mov	x23, x0
	add	x27, x23, x27, lsl #3
	str	x20, [x27], #8
	cmp	x22, #1
	b.lt	LBB2_12
LBB2_11:                                ;   in Loop: Header=BB2_3 Depth=1
	mov	x0, x23
	mov	x1, x21
	mov	x2, x22
	bl	_memcpy
LBB2_12:                                ;   in Loop: Header=BB2_3 Depth=1
	add	x8, x23, x28, lsl #3
	stp	x23, x27, [sp, #8]
	str	x8, [sp, #24]
	cbz	x21, LBB2_2
; %bb.13:                               ;   in Loop: Header=BB2_3 Depth=1
	mov	x0, x21
	bl	__ZdlPv
	b	LBB2_2
LBB2_14:                                ;   in Loop: Header=BB2_3 Depth=1
	mov	x23, #0
	add	x27, x23, x27, lsl #3
	str	x20, [x27], #8
	cmp	x22, #1
	b.ge	LBB2_11
	b	LBB2_12
LBB2_15:
	ldr	x19, [sp, #8]
	cmp	x19, x27
	b.eq	LBB2_19
; %bb.16:
	mov	x20, x19
LBB2_17:                                ; =>This Inner Loop Header: Depth=1
	ldr	x0, [x20]
Ltmp13:
	bl	__ZNSt3__16thread4joinEv
Ltmp14:
; %bb.18:                               ;   in Loop: Header=BB2_17 Depth=1
	add	x20, x20, #8
	cmp	x20, x27
	b.ne	LBB2_17
LBB2_19:
	cbz	x19, LBB2_21
; %bb.20:
	mov	x0, x19
	ldp	x29, x30, [sp, #112]            ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #96]             ; 16-byte Folded Reload
	ldp	x22, x21, [sp, #80]             ; 16-byte Folded Reload
	ldp	x24, x23, [sp, #64]             ; 16-byte Folded Reload
	ldp	x26, x25, [sp, #48]             ; 16-byte Folded Reload
	ldp	x28, x27, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #128
	b	__ZdlPv
LBB2_21:
	ldp	x29, x30, [sp, #112]            ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #96]             ; 16-byte Folded Reload
	ldp	x22, x21, [sp, #80]             ; 16-byte Folded Reload
	ldp	x24, x23, [sp, #64]             ; 16-byte Folded Reload
	ldp	x26, x25, [sp, #48]             ; 16-byte Folded Reload
	ldp	x28, x27, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #128
	ret
LBB2_22:
Ltmp10:
	add	x0, sp, #8
	bl	__ZNKSt3__113__vector_baseIPNS_6threadENS_9allocatorIS2_EEE20__throw_length_errorEv
Ltmp11:
	b	LBB2_24
LBB2_23:
Ltmp8:
	bl	__ZNSt3__1L20__throw_length_errorEPKc
Ltmp9:
LBB2_24:
	brk	#0x1
LBB2_25:
Ltmp15:
	b	LBB2_29
LBB2_26:
Ltmp12:
	b	LBB2_29
LBB2_27:
Ltmp4:
	mov	x19, x0
	mov	x0, x20
	bl	__ZdlPv
	b	LBB2_30
LBB2_28:
Ltmp7:
LBB2_29:
	mov	x19, x0
LBB2_30:
	ldr	x0, [sp, #8]
	cbz	x0, LBB2_32
; %bb.31:
	str	x0, [sp, #16]
	bl	__ZdlPv
LBB2_32:
	mov	x0, x19
	bl	__Unwind_Resume
	.loh AdrpAdd	Lloh2, Lloh3
Lfunc_end0:
	.cfi_endproc
	.section	__TEXT,__gcc_except_tab
	.p2align	2
GCC_except_table2:
Lexception0:
	.byte	255                             ; @LPStart Encoding = omit
	.byte	255                             ; @TType Encoding = omit
	.byte	1                               ; Call site Encoding = uleb128
	.uleb128 Lcst_end0-Lcst_begin0
Lcst_begin0:
	.uleb128 Ltmp0-Lfunc_begin0             ; >> Call Site 1 <<
	.uleb128 Ltmp1-Ltmp0                    ;   Call between Ltmp0 and Ltmp1
	.uleb128 Ltmp7-Lfunc_begin0             ;     jumps to Ltmp7
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp2-Lfunc_begin0             ; >> Call Site 2 <<
	.uleb128 Ltmp3-Ltmp2                    ;   Call between Ltmp2 and Ltmp3
	.uleb128 Ltmp4-Lfunc_begin0             ;     jumps to Ltmp4
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp5-Lfunc_begin0             ; >> Call Site 3 <<
	.uleb128 Ltmp6-Ltmp5                    ;   Call between Ltmp5 and Ltmp6
	.uleb128 Ltmp7-Lfunc_begin0             ;     jumps to Ltmp7
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp6-Lfunc_begin0             ; >> Call Site 4 <<
	.uleb128 Ltmp13-Ltmp6                   ;   Call between Ltmp6 and Ltmp13
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp13-Lfunc_begin0            ; >> Call Site 5 <<
	.uleb128 Ltmp14-Ltmp13                  ;   Call between Ltmp13 and Ltmp14
	.uleb128 Ltmp15-Lfunc_begin0            ;     jumps to Ltmp15
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp10-Lfunc_begin0            ; >> Call Site 6 <<
	.uleb128 Ltmp9-Ltmp10                   ;   Call between Ltmp10 and Ltmp9
	.uleb128 Ltmp12-Lfunc_begin0            ;     jumps to Ltmp12
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp9-Lfunc_begin0             ; >> Call Site 7 <<
	.uleb128 Lfunc_end0-Ltmp9               ;   Call between Ltmp9 and Lfunc_end0
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
Lcst_end0:
	.p2align	2
                                        ; -- End function
	.section	__TEXT,__text,regular,pure_instructions
	.globl	__Z8DoAtomicv                   ; -- Begin function _Z8DoAtomicv
	.p2align	2
__Z8DoAtomicv:                          ; @_Z8DoAtomicv
Lfunc_begin1:
	.cfi_startproc
	.cfi_personality 155, ___gxx_personality_v0
	.cfi_lsda 16, Lexception1
; %bb.0:
	sub	sp, sp, #128
	stp	x28, x27, [sp, #32]             ; 16-byte Folded Spill
	stp	x26, x25, [sp, #48]             ; 16-byte Folded Spill
	stp	x24, x23, [sp, #64]             ; 16-byte Folded Spill
	stp	x22, x21, [sp, #80]             ; 16-byte Folded Spill
	stp	x20, x19, [sp, #96]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #112]            ; 16-byte Folded Spill
	add	x29, sp, #112
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset w19, -24
	.cfi_offset w20, -32
	.cfi_offset w21, -40
	.cfi_offset w22, -48
	.cfi_offset w23, -56
	.cfi_offset w24, -64
	.cfi_offset w25, -72
	.cfi_offset w26, -80
	.cfi_offset w27, -88
	.cfi_offset w28, -96
	mov	x27, #0
	stp	xzr, xzr, [sp, #8]
	mov	w24, #16
	mov	x25, #1152921504606846975
Lloh4:
	adrp	x19, __Z12AtomicWorkerv@PAGE
Lloh5:
	add	x19, x19, __Z12AtomicWorkerv@PAGEOFF
	str	xzr, [sp, #24]
	mov	x26, #2305843009213693951
	b	LBB3_3
LBB3_1:                                 ;   in Loop: Header=BB3_3 Depth=1
	str	x20, [x27], #8
	str	x27, [sp, #16]
LBB3_2:                                 ;   in Loop: Header=BB3_3 Depth=1
	subs	w24, w24, #1
	b.eq	LBB3_15
LBB3_3:                                 ; =>This Inner Loop Header: Depth=1
Ltmp16:
	mov	w0, #8
	bl	__Znwm
Ltmp17:
; %bb.4:                                ;   in Loop: Header=BB3_3 Depth=1
	mov	x20, x0
Ltmp18:
	mov	x1, x19
	bl	__ZNSt3__16threadC2IRFvvEJEvEEOT_DpOT0_
Ltmp19:
; %bb.5:                                ;   in Loop: Header=BB3_3 Depth=1
	ldr	x8, [sp, #24]
	cmp	x27, x8
	b.lo	LBB3_1
; %bb.6:                                ;   in Loop: Header=BB3_3 Depth=1
	ldr	x21, [sp, #8]
	sub	x22, x27, x21
	asr	x27, x22, #3
	add	x9, x27, #1
	lsr	x10, x9, #61
	cbnz	x10, LBB3_22
; %bb.7:                                ;   in Loop: Header=BB3_3 Depth=1
	sub	x8, x8, x21
	asr	x10, x8, #2
	cmp	x10, x9
	csel	x9, x9, x10, lo
	cmp	x25, x8, asr #3
	csel	x28, x9, x26, hi
	cbz	x28, LBB3_14
; %bb.8:                                ;   in Loop: Header=BB3_3 Depth=1
	lsr	x8, x28, #61
	cbnz	x8, LBB3_23
; %bb.9:                                ;   in Loop: Header=BB3_3 Depth=1
	lsl	x0, x28, #3
Ltmp21:
	bl	__Znwm
Ltmp22:
; %bb.10:                               ;   in Loop: Header=BB3_3 Depth=1
	mov	x23, x0
	add	x27, x23, x27, lsl #3
	str	x20, [x27], #8
	cmp	x22, #1
	b.lt	LBB3_12
LBB3_11:                                ;   in Loop: Header=BB3_3 Depth=1
	mov	x0, x23
	mov	x1, x21
	mov	x2, x22
	bl	_memcpy
LBB3_12:                                ;   in Loop: Header=BB3_3 Depth=1
	add	x8, x23, x28, lsl #3
	stp	x23, x27, [sp, #8]
	str	x8, [sp, #24]
	cbz	x21, LBB3_2
; %bb.13:                               ;   in Loop: Header=BB3_3 Depth=1
	mov	x0, x21
	bl	__ZdlPv
	b	LBB3_2
LBB3_14:                                ;   in Loop: Header=BB3_3 Depth=1
	mov	x23, #0
	add	x27, x23, x27, lsl #3
	str	x20, [x27], #8
	cmp	x22, #1
	b.ge	LBB3_11
	b	LBB3_12
LBB3_15:
	ldr	x19, [sp, #8]
	cmp	x19, x27
	b.eq	LBB3_19
; %bb.16:
	mov	x20, x19
LBB3_17:                                ; =>This Inner Loop Header: Depth=1
	ldr	x0, [x20]
Ltmp29:
	bl	__ZNSt3__16thread4joinEv
Ltmp30:
; %bb.18:                               ;   in Loop: Header=BB3_17 Depth=1
	add	x20, x20, #8
	cmp	x20, x27
	b.ne	LBB3_17
LBB3_19:
	cbz	x19, LBB3_21
; %bb.20:
	mov	x0, x19
	ldp	x29, x30, [sp, #112]            ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #96]             ; 16-byte Folded Reload
	ldp	x22, x21, [sp, #80]             ; 16-byte Folded Reload
	ldp	x24, x23, [sp, #64]             ; 16-byte Folded Reload
	ldp	x26, x25, [sp, #48]             ; 16-byte Folded Reload
	ldp	x28, x27, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #128
	b	__ZdlPv
LBB3_21:
	ldp	x29, x30, [sp, #112]            ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #96]             ; 16-byte Folded Reload
	ldp	x22, x21, [sp, #80]             ; 16-byte Folded Reload
	ldp	x24, x23, [sp, #64]             ; 16-byte Folded Reload
	ldp	x26, x25, [sp, #48]             ; 16-byte Folded Reload
	ldp	x28, x27, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #128
	ret
LBB3_22:
Ltmp26:
	add	x0, sp, #8
	bl	__ZNKSt3__113__vector_baseIPNS_6threadENS_9allocatorIS2_EEE20__throw_length_errorEv
Ltmp27:
	b	LBB3_24
LBB3_23:
Ltmp24:
	bl	__ZNSt3__1L20__throw_length_errorEPKc
Ltmp25:
LBB3_24:
	brk	#0x1
LBB3_25:
Ltmp31:
	b	LBB3_29
LBB3_26:
Ltmp28:
	b	LBB3_29
LBB3_27:
Ltmp20:
	mov	x19, x0
	mov	x0, x20
	bl	__ZdlPv
	b	LBB3_30
LBB3_28:
Ltmp23:
LBB3_29:
	mov	x19, x0
LBB3_30:
	ldr	x0, [sp, #8]
	cbz	x0, LBB3_32
; %bb.31:
	str	x0, [sp, #16]
	bl	__ZdlPv
LBB3_32:
	mov	x0, x19
	bl	__Unwind_Resume
	.loh AdrpAdd	Lloh4, Lloh5
Lfunc_end1:
	.cfi_endproc
	.section	__TEXT,__gcc_except_tab
	.p2align	2
GCC_except_table3:
Lexception1:
	.byte	255                             ; @LPStart Encoding = omit
	.byte	255                             ; @TType Encoding = omit
	.byte	1                               ; Call site Encoding = uleb128
	.uleb128 Lcst_end1-Lcst_begin1
Lcst_begin1:
	.uleb128 Ltmp16-Lfunc_begin1            ; >> Call Site 1 <<
	.uleb128 Ltmp17-Ltmp16                  ;   Call between Ltmp16 and Ltmp17
	.uleb128 Ltmp23-Lfunc_begin1            ;     jumps to Ltmp23
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp18-Lfunc_begin1            ; >> Call Site 2 <<
	.uleb128 Ltmp19-Ltmp18                  ;   Call between Ltmp18 and Ltmp19
	.uleb128 Ltmp20-Lfunc_begin1            ;     jumps to Ltmp20
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp21-Lfunc_begin1            ; >> Call Site 3 <<
	.uleb128 Ltmp22-Ltmp21                  ;   Call between Ltmp21 and Ltmp22
	.uleb128 Ltmp23-Lfunc_begin1            ;     jumps to Ltmp23
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp22-Lfunc_begin1            ; >> Call Site 4 <<
	.uleb128 Ltmp29-Ltmp22                  ;   Call between Ltmp22 and Ltmp29
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp29-Lfunc_begin1            ; >> Call Site 5 <<
	.uleb128 Ltmp30-Ltmp29                  ;   Call between Ltmp29 and Ltmp30
	.uleb128 Ltmp31-Lfunc_begin1            ;     jumps to Ltmp31
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp26-Lfunc_begin1            ; >> Call Site 6 <<
	.uleb128 Ltmp25-Ltmp26                  ;   Call between Ltmp26 and Ltmp25
	.uleb128 Ltmp28-Lfunc_begin1            ;     jumps to Ltmp28
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp25-Lfunc_begin1            ; >> Call Site 7 <<
	.uleb128 Lfunc_end1-Ltmp25              ;   Call between Ltmp25 and Lfunc_end1
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
Lcst_end1:
	.p2align	2
                                        ; -- End function
	.section	__TEXT,__text,regular,pure_instructions
	.globl	_main                           ; -- Begin function main
	.p2align	2
_main:                                  ; @main
Lfunc_begin2:
	.cfi_startproc
	.cfi_personality 155, ___gxx_personality_v0
	.cfi_lsda 16, Lexception2
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
	bl	__Z7DoNakedv
	bl	__Z8DoAtomicv
Lloh6:
	adrp	x19, __ZNSt3__14coutE@GOTPAGE
Lloh7:
	ldr	x19, [x19, __ZNSt3__14coutE@GOTPAGEOFF]
Lloh8:
	adrp	x1, l_.str@PAGE
Lloh9:
	add	x1, x1, l_.str@PAGEOFF
	mov	x0, x19
	mov	w2, #16
	bl	__ZNSt3__124__put_character_sequenceIcNS_11char_traitsIcEEEERNS_13basic_ostreamIT_T0_EES7_PKS4_m
	mov	x0, x19
	mov	w1, #28928
	movk	w1, #2, lsl #16
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEj
	mov	x19, x0
	ldr	x8, [x0]
	ldur	x8, [x8, #-24]
	add	x0, x0, x8
	add	x8, sp, #8
	bl	__ZNKSt3__18ios_base6getlocEv
Ltmp32:
Lloh10:
	adrp	x1, __ZNSt3__15ctypeIcE2idE@GOTPAGE
Lloh11:
	ldr	x1, [x1, __ZNSt3__15ctypeIcE2idE@GOTPAGEOFF]
	add	x0, sp, #8
	bl	__ZNKSt3__16locale9use_facetERNS0_2idE
Ltmp33:
; %bb.1:
	ldr	x8, [x0]
	ldr	x8, [x8, #56]
Ltmp34:
	mov	w1, #10
	blr	x8
Ltmp35:
; %bb.2:
	mov	x20, x0
	add	x0, sp, #8
	bl	__ZNSt3__16localeD1Ev
	mov	x0, x19
	mov	x1, x20
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc
	mov	x0, x19
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv
Lloh12:
	adrp	x0, __ZNSt3__14coutE@GOTPAGE
Lloh13:
	ldr	x0, [x0, __ZNSt3__14coutE@GOTPAGEOFF]
Lloh14:
	adrp	x1, l_.str.1@PAGE
Lloh15:
	add	x1, x1, l_.str.1@PAGEOFF
	mov	w2, #11
	bl	__ZNSt3__124__put_character_sequenceIcNS_11char_traitsIcEEEERNS_13basic_ostreamIT_T0_EES7_PKS4_m
Lloh16:
	adrp	x8, _naked_int@PAGE
Lloh17:
	ldr	w1, [x8, _naked_int@PAGEOFF]
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEj
	mov	x19, x0
	ldr	x8, [x0]
	ldur	x8, [x8, #-24]
	add	x0, x0, x8
	add	x8, sp, #8
	bl	__ZNKSt3__18ios_base6getlocEv
Ltmp37:
Lloh18:
	adrp	x1, __ZNSt3__15ctypeIcE2idE@GOTPAGE
Lloh19:
	ldr	x1, [x1, __ZNSt3__15ctypeIcE2idE@GOTPAGEOFF]
	add	x0, sp, #8
	bl	__ZNKSt3__16locale9use_facetERNS0_2idE
Ltmp38:
; %bb.3:
	ldr	x8, [x0]
	ldr	x8, [x8, #56]
Ltmp39:
	mov	w1, #10
	blr	x8
Ltmp40:
; %bb.4:
	mov	x20, x0
	add	x0, sp, #8
	bl	__ZNSt3__16localeD1Ev
	mov	x0, x19
	mov	x1, x20
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc
	mov	x0, x19
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv
Lloh20:
	adrp	x0, __ZNSt3__14coutE@GOTPAGE
Lloh21:
	ldr	x0, [x0, __ZNSt3__14coutE@GOTPAGEOFF]
Lloh22:
	adrp	x1, l_.str.2@PAGE
Lloh23:
	add	x1, x1, l_.str.2@PAGEOFF
	mov	w2, #12
	bl	__ZNSt3__124__put_character_sequenceIcNS_11char_traitsIcEEEERNS_13basic_ostreamIT_T0_EES7_PKS4_m
Lloh24:
	adrp	x8, _atomic_integer@PAGE
Lloh25:
	add	x8, x8, _atomic_integer@PAGEOFF
	ldar	w1, [x8]
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEj
	mov	x19, x0
	ldr	x8, [x0]
	ldur	x8, [x8, #-24]
	add	x0, x0, x8
	add	x8, sp, #8
	bl	__ZNKSt3__18ios_base6getlocEv
Ltmp42:
Lloh26:
	adrp	x1, __ZNSt3__15ctypeIcE2idE@GOTPAGE
Lloh27:
	ldr	x1, [x1, __ZNSt3__15ctypeIcE2idE@GOTPAGEOFF]
	add	x0, sp, #8
	bl	__ZNKSt3__16locale9use_facetERNS0_2idE
Ltmp43:
; %bb.5:
	ldr	x8, [x0]
	ldr	x8, [x8, #56]
Ltmp44:
	mov	w1, #10
	blr	x8
Ltmp45:
; %bb.6:
	mov	x20, x0
	add	x0, sp, #8
	bl	__ZNSt3__16localeD1Ev
	mov	x0, x19
	mov	x1, x20
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc
	mov	x0, x19
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv
	mov	w0, #0
	ldp	x29, x30, [sp, #32]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #16]             ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
LBB4_7:
Ltmp46:
	b	LBB4_10
LBB4_8:
Ltmp41:
	b	LBB4_10
LBB4_9:
Ltmp36:
LBB4_10:
	mov	x19, x0
	add	x0, sp, #8
	bl	__ZNSt3__16localeD1Ev
	mov	x0, x19
	bl	__Unwind_Resume
	.loh AdrpLdrGot	Lloh10, Lloh11
	.loh AdrpAdd	Lloh8, Lloh9
	.loh AdrpLdrGot	Lloh6, Lloh7
	.loh AdrpLdrGot	Lloh18, Lloh19
	.loh AdrpLdr	Lloh16, Lloh17
	.loh AdrpAdd	Lloh14, Lloh15
	.loh AdrpLdrGot	Lloh12, Lloh13
	.loh AdrpLdrGot	Lloh26, Lloh27
	.loh AdrpAdd	Lloh24, Lloh25
	.loh AdrpAdd	Lloh22, Lloh23
	.loh AdrpLdrGot	Lloh20, Lloh21
Lfunc_end2:
	.cfi_endproc
	.section	__TEXT,__gcc_except_tab
	.p2align	2
GCC_except_table4:
Lexception2:
	.byte	255                             ; @LPStart Encoding = omit
	.byte	255                             ; @TType Encoding = omit
	.byte	1                               ; Call site Encoding = uleb128
	.uleb128 Lcst_end2-Lcst_begin2
Lcst_begin2:
	.uleb128 Lfunc_begin2-Lfunc_begin2      ; >> Call Site 1 <<
	.uleb128 Ltmp32-Lfunc_begin2            ;   Call between Lfunc_begin2 and Ltmp32
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp32-Lfunc_begin2            ; >> Call Site 2 <<
	.uleb128 Ltmp35-Ltmp32                  ;   Call between Ltmp32 and Ltmp35
	.uleb128 Ltmp36-Lfunc_begin2            ;     jumps to Ltmp36
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp35-Lfunc_begin2            ; >> Call Site 3 <<
	.uleb128 Ltmp37-Ltmp35                  ;   Call between Ltmp35 and Ltmp37
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp37-Lfunc_begin2            ; >> Call Site 4 <<
	.uleb128 Ltmp40-Ltmp37                  ;   Call between Ltmp37 and Ltmp40
	.uleb128 Ltmp41-Lfunc_begin2            ;     jumps to Ltmp41
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp40-Lfunc_begin2            ; >> Call Site 5 <<
	.uleb128 Ltmp42-Ltmp40                  ;   Call between Ltmp40 and Ltmp42
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp42-Lfunc_begin2            ; >> Call Site 6 <<
	.uleb128 Ltmp45-Ltmp42                  ;   Call between Ltmp42 and Ltmp45
	.uleb128 Ltmp46-Lfunc_begin2            ;     jumps to Ltmp46
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp45-Lfunc_begin2            ; >> Call Site 7 <<
	.uleb128 Lfunc_end2-Ltmp45              ;   Call between Ltmp45 and Lfunc_end2
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
Lcst_end2:
	.p2align	2
                                        ; -- End function
	.section	__TEXT,__text,regular,pure_instructions
	.private_extern	___clang_call_terminate ; -- Begin function __clang_call_terminate
	.globl	___clang_call_terminate
	.weak_def_can_be_hidden	___clang_call_terminate
	.p2align	2
___clang_call_terminate:                ; @__clang_call_terminate
; %bb.0:
	stp	x29, x30, [sp, #-16]!           ; 16-byte Folded Spill
	bl	___cxa_begin_catch
	bl	__ZSt9terminatev
                                        ; -- End function
	.private_extern	__ZNSt3__16threadC2IRFvvEJEvEEOT_DpOT0_ ; -- Begin function _ZNSt3__16threadC2IRFvvEJEvEEOT_DpOT0_
	.globl	__ZNSt3__16threadC2IRFvvEJEvEEOT_DpOT0_
	.weak_def_can_be_hidden	__ZNSt3__16threadC2IRFvvEJEvEEOT_DpOT0_
	.p2align	2
__ZNSt3__16threadC2IRFvvEJEvEEOT_DpOT0_: ; @_ZNSt3__16threadC2IRFvvEJEvEEOT_DpOT0_
Lfunc_begin3:
	.cfi_startproc
	.cfi_personality 155, ___gxx_personality_v0
	.cfi_lsda 16, Lexception3
; %bb.0:
	stp	x22, x21, [sp, #-48]!           ; 16-byte Folded Spill
	stp	x20, x19, [sp, #16]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #32]             ; 16-byte Folded Spill
	add	x29, sp, #32
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset w19, -24
	.cfi_offset w20, -32
	.cfi_offset w21, -40
	.cfi_offset w22, -48
	mov	x22, x1
	mov	x20, x0
	mov	w0, #8
	bl	__Znwm
	mov	x21, x0
Ltmp47:
	bl	__ZNSt3__115__thread_structC1Ev
Ltmp48:
; %bb.1:
Ltmp50:
	mov	w0, #16
	bl	__Znwm
Ltmp51:
; %bb.2:
	mov	x19, x0
	stp	x21, x22, [x0]
Ltmp53:
Lloh28:
	adrp	x2, __ZNSt3__1L14__thread_proxyINS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEPFvvEEEEEEPvSA_@PAGE
Lloh29:
	add	x2, x2, __ZNSt3__1L14__thread_proxyINS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEPFvvEEEEEEPvSA_@PAGEOFF
	mov	x0, x20
	mov	x1, #0
	mov	x3, x19
	bl	_pthread_create
Ltmp54:
; %bb.3:
	cbnz	w0, LBB6_5
; %bb.4:
	mov	x0, x20
	ldp	x29, x30, [sp, #32]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #16]             ; 16-byte Folded Reload
	ldp	x22, x21, [sp], #48             ; 16-byte Folded Reload
	ret
LBB6_5:
Ltmp55:
Lloh30:
	adrp	x1, l_.str.3@PAGE
Lloh31:
	add	x1, x1, l_.str.3@PAGEOFF
	bl	__ZNSt3__120__throw_system_errorEiPKc
Ltmp56:
; %bb.6:
	brk	#0x1
LBB6_7:
Ltmp52:
	mov	x20, x0
	mov	x0, x21
	bl	__ZNSt3__115__thread_structD1Ev
	b	LBB6_12
LBB6_8:
Ltmp49:
	mov	x20, x0
	b	LBB6_12
LBB6_9:
Ltmp57:
	mov	x20, x0
	ldr	x0, [x19]
	str	xzr, [x19]
	cbz	x0, LBB6_11
; %bb.10:
	bl	__ZNSt3__115__thread_structD1Ev
	bl	__ZdlPv
LBB6_11:
	mov	x21, x19
LBB6_12:
	mov	x0, x21
	bl	__ZdlPv
	mov	x0, x20
	bl	__Unwind_Resume
	.loh AdrpAdd	Lloh28, Lloh29
	.loh AdrpAdd	Lloh30, Lloh31
Lfunc_end3:
	.cfi_endproc
	.section	__TEXT,__gcc_except_tab
	.p2align	2
GCC_except_table6:
Lexception3:
	.byte	255                             ; @LPStart Encoding = omit
	.byte	255                             ; @TType Encoding = omit
	.byte	1                               ; Call site Encoding = uleb128
	.uleb128 Lcst_end3-Lcst_begin3
Lcst_begin3:
	.uleb128 Lfunc_begin3-Lfunc_begin3      ; >> Call Site 1 <<
	.uleb128 Ltmp47-Lfunc_begin3            ;   Call between Lfunc_begin3 and Ltmp47
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp47-Lfunc_begin3            ; >> Call Site 2 <<
	.uleb128 Ltmp48-Ltmp47                  ;   Call between Ltmp47 and Ltmp48
	.uleb128 Ltmp49-Lfunc_begin3            ;     jumps to Ltmp49
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp50-Lfunc_begin3            ; >> Call Site 3 <<
	.uleb128 Ltmp51-Ltmp50                  ;   Call between Ltmp50 and Ltmp51
	.uleb128 Ltmp52-Lfunc_begin3            ;     jumps to Ltmp52
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp53-Lfunc_begin3            ; >> Call Site 4 <<
	.uleb128 Ltmp56-Ltmp53                  ;   Call between Ltmp53 and Ltmp56
	.uleb128 Ltmp57-Lfunc_begin3            ;     jumps to Ltmp57
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp56-Lfunc_begin3            ; >> Call Site 5 <<
	.uleb128 Lfunc_end3-Ltmp56              ;   Call between Ltmp56 and Lfunc_end3
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
Lcst_end3:
	.p2align	2
                                        ; -- End function
	.section	__TEXT,__text,regular,pure_instructions
	.p2align	2                               ; -- Begin function _ZNSt3__1L14__thread_proxyINS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEPFvvEEEEEEPvSA_
__ZNSt3__1L14__thread_proxyINS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEPFvvEEEEEEPvSA_: ; @_ZNSt3__1L14__thread_proxyINS_5tupleIJNS_10unique_ptrINS_15__thread_structENS_14default_deleteIS3_EEEEPFvvEEEEEEPvSA_
Lfunc_begin4:
	.cfi_startproc
	.cfi_personality 155, ___gxx_personality_v0
	.cfi_lsda 16, Lexception4
; %bb.0:
	stp	x20, x19, [sp, #-32]!           ; 16-byte Folded Spill
	stp	x29, x30, [sp, #16]             ; 16-byte Folded Spill
	add	x29, sp, #16
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset w19, -24
	.cfi_offset w20, -32
	mov	x19, x0
Ltmp58:
	bl	__ZNSt3__119__thread_local_dataEv
Ltmp59:
; %bb.1:
	ldr	x1, [x19]
	str	xzr, [x19]
	ldr	x0, [x0]
Ltmp61:
	bl	_pthread_setspecific
Ltmp62:
; %bb.2:
	ldr	x8, [x19, #8]
Ltmp63:
	blr	x8
Ltmp64:
; %bb.3:
	ldr	x0, [x19]
	str	xzr, [x19]
	cbz	x0, LBB7_5
; %bb.4:
	bl	__ZNSt3__115__thread_structD1Ev
	bl	__ZdlPv
LBB7_5:
	mov	x0, x19
	bl	__ZdlPv
	mov	x0, #0
	ldp	x29, x30, [sp, #16]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp], #32             ; 16-byte Folded Reload
	ret
LBB7_6:
Ltmp60:
	mov	x20, x0
	cbnz	x19, LBB7_8
	b	LBB7_11
LBB7_7:
Ltmp65:
	mov	x20, x0
LBB7_8:
	ldr	x0, [x19]
	str	xzr, [x19]
	cbz	x0, LBB7_10
; %bb.9:
	bl	__ZNSt3__115__thread_structD1Ev
	bl	__ZdlPv
LBB7_10:
	mov	x0, x19
	bl	__ZdlPv
LBB7_11:
	mov	x0, x20
	bl	__Unwind_Resume
Lfunc_end4:
	.cfi_endproc
	.section	__TEXT,__gcc_except_tab
	.p2align	2
GCC_except_table7:
Lexception4:
	.byte	255                             ; @LPStart Encoding = omit
	.byte	255                             ; @TType Encoding = omit
	.byte	1                               ; Call site Encoding = uleb128
	.uleb128 Lcst_end4-Lcst_begin4
Lcst_begin4:
	.uleb128 Ltmp58-Lfunc_begin4            ; >> Call Site 1 <<
	.uleb128 Ltmp59-Ltmp58                  ;   Call between Ltmp58 and Ltmp59
	.uleb128 Ltmp60-Lfunc_begin4            ;     jumps to Ltmp60
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp61-Lfunc_begin4            ; >> Call Site 2 <<
	.uleb128 Ltmp64-Ltmp61                  ;   Call between Ltmp61 and Ltmp64
	.uleb128 Ltmp65-Lfunc_begin4            ;     jumps to Ltmp65
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp64-Lfunc_begin4            ; >> Call Site 3 <<
	.uleb128 Lfunc_end4-Ltmp64              ;   Call between Ltmp64 and Lfunc_end4
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
Lcst_end4:
	.p2align	2
                                        ; -- End function
	.section	__TEXT,__text,regular,pure_instructions
	.p2align	2                               ; -- Begin function _ZNKSt3__113__vector_baseIPNS_6threadENS_9allocatorIS2_EEE20__throw_length_errorEv
__ZNKSt3__113__vector_baseIPNS_6threadENS_9allocatorIS2_EEE20__throw_length_errorEv: ; @_ZNKSt3__113__vector_baseIPNS_6threadENS_9allocatorIS2_EEE20__throw_length_errorEv
	.cfi_startproc
; %bb.0:
	stp	x29, x30, [sp, #-16]!           ; 16-byte Folded Spill
	mov	x29, sp
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	bl	__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv
	.cfi_endproc
                                        ; -- End function
	.p2align	2                               ; -- Begin function _ZNSt3__1L20__throw_length_errorEPKc
__ZNSt3__1L20__throw_length_errorEPKc:  ; @_ZNSt3__1L20__throw_length_errorEPKc
Lfunc_begin5:
	.cfi_startproc
	.cfi_personality 155, ___gxx_personality_v0
	.cfi_lsda 16, Lexception5
; %bb.0:
	stp	x20, x19, [sp, #-32]!           ; 16-byte Folded Spill
	stp	x29, x30, [sp, #16]             ; 16-byte Folded Spill
	add	x29, sp, #16
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset w19, -24
	.cfi_offset w20, -32
	mov	w0, #16
	bl	___cxa_allocate_exception
	mov	x19, x0
Ltmp66:
	bl	__ZNSt12length_errorC1EPKc
Ltmp67:
; %bb.1:
Lloh32:
	adrp	x1, __ZTISt12length_error@GOTPAGE
Lloh33:
	ldr	x1, [x1, __ZTISt12length_error@GOTPAGEOFF]
Lloh34:
	adrp	x2, __ZNSt12length_errorD1Ev@GOTPAGE
Lloh35:
	ldr	x2, [x2, __ZNSt12length_errorD1Ev@GOTPAGEOFF]
	mov	x0, x19
	bl	___cxa_throw
LBB9_2:
Ltmp68:
	mov	x20, x0
	mov	x0, x19
	bl	___cxa_free_exception
	mov	x0, x20
	bl	__Unwind_Resume
	.loh AdrpLdrGot	Lloh34, Lloh35
	.loh AdrpLdrGot	Lloh32, Lloh33
Lfunc_end5:
	.cfi_endproc
	.section	__TEXT,__gcc_except_tab
	.p2align	2
GCC_except_table9:
Lexception5:
	.byte	255                             ; @LPStart Encoding = omit
	.byte	255                             ; @TType Encoding = omit
	.byte	1                               ; Call site Encoding = uleb128
	.uleb128 Lcst_end5-Lcst_begin5
Lcst_begin5:
	.uleb128 Lfunc_begin5-Lfunc_begin5      ; >> Call Site 1 <<
	.uleb128 Ltmp66-Lfunc_begin5            ;   Call between Lfunc_begin5 and Ltmp66
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp66-Lfunc_begin5            ; >> Call Site 2 <<
	.uleb128 Ltmp67-Ltmp66                  ;   Call between Ltmp66 and Ltmp67
	.uleb128 Ltmp68-Lfunc_begin5            ;     jumps to Ltmp68
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp67-Lfunc_begin5            ; >> Call Site 3 <<
	.uleb128 Lfunc_end5-Ltmp67              ;   Call between Ltmp67 and Lfunc_end5
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
Lcst_end5:
	.p2align	2
                                        ; -- End function
	.section	__TEXT,__text,regular,pure_instructions
	.p2align	2                               ; -- Begin function _ZNSt12length_errorC1EPKc
__ZNSt12length_errorC1EPKc:             ; @_ZNSt12length_errorC1EPKc
	.cfi_startproc
; %bb.0:
	stp	x29, x30, [sp, #-16]!           ; 16-byte Folded Spill
	mov	x29, sp
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
Lloh36:
	adrp	x1, l_.str.4@PAGE
Lloh37:
	add	x1, x1, l_.str.4@PAGEOFF
	bl	__ZNSt11logic_errorC2EPKc
Lloh38:
	adrp	x8, __ZTVSt12length_error@GOTPAGE
Lloh39:
	ldr	x8, [x8, __ZTVSt12length_error@GOTPAGEOFF]
	add	x8, x8, #16
	str	x8, [x0]
	ldp	x29, x30, [sp], #16             ; 16-byte Folded Reload
	ret
	.loh AdrpLdrGot	Lloh38, Lloh39
	.loh AdrpAdd	Lloh36, Lloh37
	.cfi_endproc
                                        ; -- End function
	.globl	__ZNSt3__124__put_character_sequenceIcNS_11char_traitsIcEEEERNS_13basic_ostreamIT_T0_EES7_PKS4_m ; -- Begin function _ZNSt3__124__put_character_sequenceIcNS_11char_traitsIcEEEERNS_13basic_ostreamIT_T0_EES7_PKS4_m
	.weak_def_can_be_hidden	__ZNSt3__124__put_character_sequenceIcNS_11char_traitsIcEEEERNS_13basic_ostreamIT_T0_EES7_PKS4_m
	.p2align	2
__ZNSt3__124__put_character_sequenceIcNS_11char_traitsIcEEEERNS_13basic_ostreamIT_T0_EES7_PKS4_m: ; @_ZNSt3__124__put_character_sequenceIcNS_11char_traitsIcEEEERNS_13basic_ostreamIT_T0_EES7_PKS4_m
Lfunc_begin6:
	.cfi_startproc
	.cfi_personality 155, ___gxx_personality_v0
	.cfi_lsda 16, Lexception6
; %bb.0:
	sub	sp, sp, #112
	stp	x26, x25, [sp, #32]             ; 16-byte Folded Spill
	stp	x24, x23, [sp, #48]             ; 16-byte Folded Spill
	stp	x22, x21, [sp, #64]             ; 16-byte Folded Spill
	stp	x20, x19, [sp, #80]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #96]             ; 16-byte Folded Spill
	add	x29, sp, #96
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset w19, -24
	.cfi_offset w20, -32
	.cfi_offset w21, -40
	.cfi_offset w22, -48
	.cfi_offset w23, -56
	.cfi_offset w24, -64
	.cfi_offset w25, -72
	.cfi_offset w26, -80
	mov	x21, x2
	mov	x20, x1
	mov	x19, x0
Ltmp69:
	add	x0, sp, #8
	mov	x1, x19
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE6sentryC1ERS3_
Ltmp70:
; %bb.1:
	ldrb	w8, [sp, #8]
	cbz	w8, LBB11_10
; %bb.2:
	ldr	x8, [x19]
	ldur	x8, [x8, #-24]
	add	x22, x19, x8
	ldr	x23, [x22, #40]
	ldr	w25, [x22, #8]
	ldr	w24, [x22, #144]
	cmn	w24, #1
	b.ne	LBB11_7
; %bb.3:
Ltmp72:
	add	x8, sp, #24
	mov	x0, x22
	bl	__ZNKSt3__18ios_base6getlocEv
Ltmp73:
; %bb.4:
Ltmp74:
Lloh40:
	adrp	x1, __ZNSt3__15ctypeIcE2idE@GOTPAGE
Lloh41:
	ldr	x1, [x1, __ZNSt3__15ctypeIcE2idE@GOTPAGEOFF]
	add	x0, sp, #24
	bl	__ZNKSt3__16locale9use_facetERNS0_2idE
Ltmp75:
; %bb.5:
	ldr	x8, [x0]
	ldr	x8, [x8, #56]
Ltmp76:
	mov	w1, #32
	blr	x8
Ltmp77:
; %bb.6:
	mov	x24, x0
	add	x0, sp, #24
	bl	__ZNSt3__16localeD1Ev
	str	w24, [x22, #144]
LBB11_7:
	add	x3, x20, x21
	mov	w8, #176
	and	w8, w25, w8
	cmp	w8, #32
	csel	x2, x3, x20, eq
Ltmp79:
	sxtb	w5, w24
	mov	x0, x23
	mov	x1, x20
	mov	x4, x22
	bl	__ZNSt3__116__pad_and_outputIcNS_11char_traitsIcEEEENS_19ostreambuf_iteratorIT_T0_EES6_PKS4_S8_S8_RNS_8ios_baseES4_
Ltmp80:
; %bb.8:
	cbnz	x0, LBB11_10
; %bb.9:
	ldr	x8, [x19]
	ldur	x8, [x8, #-24]
	add	x0, x19, x8
	ldr	w8, [x0, #32]
	mov	w9, #5
	orr	w1, w8, w9
Ltmp82:
	bl	__ZNSt3__18ios_base5clearEj
Ltmp83:
LBB11_10:
	add	x0, sp, #8
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE6sentryD1Ev
LBB11_11:
	mov	x0, x19
	ldp	x29, x30, [sp, #96]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #80]             ; 16-byte Folded Reload
	ldp	x22, x21, [sp, #64]             ; 16-byte Folded Reload
	ldp	x24, x23, [sp, #48]             ; 16-byte Folded Reload
	ldp	x26, x25, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #112
	ret
LBB11_12:
Ltmp84:
	b	LBB11_15
LBB11_13:
Ltmp78:
	mov	x20, x0
	add	x0, sp, #24
	bl	__ZNSt3__16localeD1Ev
	b	LBB11_16
LBB11_14:
Ltmp81:
LBB11_15:
	mov	x20, x0
LBB11_16:
	add	x0, sp, #8
	bl	__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE6sentryD1Ev
	b	LBB11_18
LBB11_17:
Ltmp71:
	mov	x20, x0
LBB11_18:
	mov	x0, x20
	bl	___cxa_begin_catch
	ldr	x8, [x19]
	ldur	x8, [x8, #-24]
	add	x0, x19, x8
Ltmp85:
	bl	__ZNSt3__18ios_base33__set_badbit_and_consider_rethrowEv
Ltmp86:
; %bb.19:
	bl	___cxa_end_catch
	b	LBB11_11
LBB11_20:
Ltmp87:
	mov	x19, x0
Ltmp88:
	bl	___cxa_end_catch
Ltmp89:
; %bb.21:
	mov	x0, x19
	bl	__Unwind_Resume
LBB11_22:
Ltmp90:
	bl	___clang_call_terminate
	.loh AdrpLdrGot	Lloh40, Lloh41
Lfunc_end6:
	.cfi_endproc
	.section	__TEXT,__gcc_except_tab
	.p2align	2
GCC_except_table11:
Lexception6:
	.byte	255                             ; @LPStart Encoding = omit
	.byte	155                             ; @TType Encoding = indirect pcrel sdata4
	.uleb128 Lttbase0-Lttbaseref0
Lttbaseref0:
	.byte	1                               ; Call site Encoding = uleb128
	.uleb128 Lcst_end6-Lcst_begin6
Lcst_begin6:
	.uleb128 Ltmp69-Lfunc_begin6            ; >> Call Site 1 <<
	.uleb128 Ltmp70-Ltmp69                  ;   Call between Ltmp69 and Ltmp70
	.uleb128 Ltmp71-Lfunc_begin6            ;     jumps to Ltmp71
	.byte	1                               ;   On action: 1
	.uleb128 Ltmp72-Lfunc_begin6            ; >> Call Site 2 <<
	.uleb128 Ltmp73-Ltmp72                  ;   Call between Ltmp72 and Ltmp73
	.uleb128 Ltmp81-Lfunc_begin6            ;     jumps to Ltmp81
	.byte	1                               ;   On action: 1
	.uleb128 Ltmp74-Lfunc_begin6            ; >> Call Site 3 <<
	.uleb128 Ltmp77-Ltmp74                  ;   Call between Ltmp74 and Ltmp77
	.uleb128 Ltmp78-Lfunc_begin6            ;     jumps to Ltmp78
	.byte	1                               ;   On action: 1
	.uleb128 Ltmp79-Lfunc_begin6            ; >> Call Site 4 <<
	.uleb128 Ltmp80-Ltmp79                  ;   Call between Ltmp79 and Ltmp80
	.uleb128 Ltmp81-Lfunc_begin6            ;     jumps to Ltmp81
	.byte	1                               ;   On action: 1
	.uleb128 Ltmp82-Lfunc_begin6            ; >> Call Site 5 <<
	.uleb128 Ltmp83-Ltmp82                  ;   Call between Ltmp82 and Ltmp83
	.uleb128 Ltmp84-Lfunc_begin6            ;     jumps to Ltmp84
	.byte	1                               ;   On action: 1
	.uleb128 Ltmp83-Lfunc_begin6            ; >> Call Site 6 <<
	.uleb128 Ltmp85-Ltmp83                  ;   Call between Ltmp83 and Ltmp85
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp85-Lfunc_begin6            ; >> Call Site 7 <<
	.uleb128 Ltmp86-Ltmp85                  ;   Call between Ltmp85 and Ltmp86
	.uleb128 Ltmp87-Lfunc_begin6            ;     jumps to Ltmp87
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp86-Lfunc_begin6            ; >> Call Site 8 <<
	.uleb128 Ltmp88-Ltmp86                  ;   Call between Ltmp86 and Ltmp88
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp88-Lfunc_begin6            ; >> Call Site 9 <<
	.uleb128 Ltmp89-Ltmp88                  ;   Call between Ltmp88 and Ltmp89
	.uleb128 Ltmp90-Lfunc_begin6            ;     jumps to Ltmp90
	.byte	1                               ;   On action: 1
	.uleb128 Ltmp89-Lfunc_begin6            ; >> Call Site 10 <<
	.uleb128 Lfunc_end6-Ltmp89              ;   Call between Ltmp89 and Lfunc_end6
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
Lcst_end6:
	.byte	1                               ; >> Action Record 1 <<
                                        ;   Catch TypeInfo 1
	.byte	0                               ;   No further actions
	.p2align	2
                                        ; >> Catch TypeInfos <<
	.long	0                               ; TypeInfo 1
Lttbase0:
	.p2align	2
                                        ; -- End function
	.section	__TEXT,__text,regular,pure_instructions
	.private_extern	__ZNSt3__116__pad_and_outputIcNS_11char_traitsIcEEEENS_19ostreambuf_iteratorIT_T0_EES6_PKS4_S8_S8_RNS_8ios_baseES4_ ; -- Begin function _ZNSt3__116__pad_and_outputIcNS_11char_traitsIcEEEENS_19ostreambuf_iteratorIT_T0_EES6_PKS4_S8_S8_RNS_8ios_baseES4_
	.globl	__ZNSt3__116__pad_and_outputIcNS_11char_traitsIcEEEENS_19ostreambuf_iteratorIT_T0_EES6_PKS4_S8_S8_RNS_8ios_baseES4_
	.weak_def_can_be_hidden	__ZNSt3__116__pad_and_outputIcNS_11char_traitsIcEEEENS_19ostreambuf_iteratorIT_T0_EES6_PKS4_S8_S8_RNS_8ios_baseES4_
	.p2align	2
__ZNSt3__116__pad_and_outputIcNS_11char_traitsIcEEEENS_19ostreambuf_iteratorIT_T0_EES6_PKS4_S8_S8_RNS_8ios_baseES4_: ; @_ZNSt3__116__pad_and_outputIcNS_11char_traitsIcEEEENS_19ostreambuf_iteratorIT_T0_EES6_PKS4_S8_S8_RNS_8ios_baseES4_
Lfunc_begin7:
	.cfi_startproc
	.cfi_personality 155, ___gxx_personality_v0
	.cfi_lsda 16, Lexception7
; %bb.0:
	sub	sp, sp, #112
	stp	x26, x25, [sp, #32]             ; 16-byte Folded Spill
	stp	x24, x23, [sp, #48]             ; 16-byte Folded Spill
	stp	x22, x21, [sp, #64]             ; 16-byte Folded Spill
	stp	x20, x19, [sp, #80]             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #96]             ; 16-byte Folded Spill
	add	x29, sp, #96
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset w19, -24
	.cfi_offset w20, -32
	.cfi_offset w21, -40
	.cfi_offset w22, -48
	.cfi_offset w23, -56
	.cfi_offset w24, -64
	.cfi_offset w25, -72
	.cfi_offset w26, -80
	mov	x19, x0
	cbz	x0, LBB12_15
; %bb.1:
	mov	x24, x5
	mov	x20, x4
	mov	x22, x3
	mov	x21, x2
	ldr	x8, [x4, #24]
	sub	x9, x3, x1
	subs	x8, x8, x9
	csel	x23, x8, xzr, gt
	sub	x25, x2, x1
	cmp	x25, #1
	b.lt	LBB12_3
; %bb.2:
	ldr	x8, [x19]
	ldr	x8, [x8, #96]
	mov	x0, x19
	mov	x2, x25
	blr	x8
	cmp	x0, x25
	b.ne	LBB12_14
LBB12_3:
	cmp	x23, #1
	b.lt	LBB12_11
; %bb.4:
	cmp	x23, #23
	b.hs	LBB12_6
; %bb.5:
	add	x25, sp, #8
	strb	w23, [sp, #31]
	b	LBB12_7
LBB12_6:
	add	x8, x23, #16
	and	x26, x8, #0xfffffffffffffff0
	mov	x0, x26
	bl	__Znwm
	mov	x25, x0
	orr	x8, x26, #0x8000000000000000
	stp	x23, x8, [sp, #16]
	str	x0, [sp, #8]
LBB12_7:
	mov	x0, x25
	mov	x1, x24
	mov	x2, x23
	bl	_memset
	strb	wzr, [x25, x23]
	ldrsb	w8, [sp, #31]
	ldr	x9, [sp, #8]
	cmp	w8, #0
	add	x8, sp, #8
	csel	x1, x9, x8, lt
	ldr	x8, [x19]
	ldr	x8, [x8, #96]
Ltmp91:
	mov	x0, x19
	mov	x2, x23
	blr	x8
Ltmp92:
; %bb.8:
	mov	x24, x0
	ldrsb	w8, [sp, #31]
	tbnz	w8, #31, LBB12_10
; %bb.9:
	cmp	x24, x23
	b.ne	LBB12_14
	b	LBB12_11
LBB12_10:
	ldr	x0, [sp, #8]
	bl	__ZdlPv
	cmp	x24, x23
	b.ne	LBB12_14
LBB12_11:
	sub	x22, x22, x21
	cmp	x22, #1
	b.lt	LBB12_13
; %bb.12:
	ldr	x8, [x19]
	ldr	x8, [x8, #96]
	mov	x0, x19
	mov	x1, x21
	mov	x2, x22
	blr	x8
	cmp	x0, x22
	b.ne	LBB12_14
LBB12_13:
	str	xzr, [x20, #24]
	b	LBB12_15
LBB12_14:
	mov	x19, #0
LBB12_15:
	mov	x0, x19
	ldp	x29, x30, [sp, #96]             ; 16-byte Folded Reload
	ldp	x20, x19, [sp, #80]             ; 16-byte Folded Reload
	ldp	x22, x21, [sp, #64]             ; 16-byte Folded Reload
	ldp	x24, x23, [sp, #48]             ; 16-byte Folded Reload
	ldp	x26, x25, [sp, #32]             ; 16-byte Folded Reload
	add	sp, sp, #112
	ret
LBB12_16:
Ltmp93:
	mov	x19, x0
	ldrsb	w8, [sp, #31]
	tbz	w8, #31, LBB12_18
; %bb.17:
	ldr	x0, [sp, #8]
	bl	__ZdlPv
LBB12_18:
	mov	x0, x19
	bl	__Unwind_Resume
Lfunc_end7:
	.cfi_endproc
	.section	__TEXT,__gcc_except_tab
	.p2align	2
GCC_except_table12:
Lexception7:
	.byte	255                             ; @LPStart Encoding = omit
	.byte	255                             ; @TType Encoding = omit
	.byte	1                               ; Call site Encoding = uleb128
	.uleb128 Lcst_end7-Lcst_begin7
Lcst_begin7:
	.uleb128 Lfunc_begin7-Lfunc_begin7      ; >> Call Site 1 <<
	.uleb128 Ltmp91-Lfunc_begin7            ;   Call between Lfunc_begin7 and Ltmp91
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp91-Lfunc_begin7            ; >> Call Site 2 <<
	.uleb128 Ltmp92-Ltmp91                  ;   Call between Ltmp91 and Ltmp92
	.uleb128 Ltmp93-Lfunc_begin7            ;     jumps to Ltmp93
	.byte	0                               ;   On action: cleanup
	.uleb128 Ltmp92-Lfunc_begin7            ; >> Call Site 3 <<
	.uleb128 Lfunc_end7-Ltmp92              ;   Call between Ltmp92 and Lfunc_end7
	.byte	0                               ;     has no landing pad
	.byte	0                               ;   On action: cleanup
Lcst_end7:
	.p2align	2
                                        ; -- End function
	.globl	_naked_int                      ; @naked_int
.zerofill __DATA,__common,_naked_int,4,2
	.globl	_atomic_integer                 ; @atomic_integer
.zerofill __DATA,__common,_atomic_integer,4,2
	.section	__TEXT,__cstring,cstring_literals
l_.str:                                 ; @.str
	.asciz	"Correct sum is: "

l_.str.1:                               ; @.str.1
	.asciz	"Naked sum: "

l_.str.2:                               ; @.str.2
	.asciz	"Atomic sum: "

l_.str.3:                               ; @.str.3
	.asciz	"thread constructor failed"

l_.str.4:                               ; @.str.4
	.asciz	"allocator<T>::allocate(size_t n) 'n' exceeds maximum supported size"

.subsections_via_symbols
