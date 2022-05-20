	.arch armv8-a
	.file	"cast.c"
// GNU C17 (Ubuntu 9.3.0-17ubuntu1~20.04) version 9.3.0 (aarch64-linux-gnu)
//	compiled by GNU C version 9.3.0, GMP version 6.2.0, MPFR version 4.0.2, MPC version 1.1.0, isl version isl-0.22.1-GMP

// GGC heuristics: --param ggc-min-expand=100 --param ggc-min-heapsize=131072
// options passed:  -imultiarch aarch64-linux-gnu cast.c -mlittle-endian
// -mabi=lp64 -Wall -fverbose-asm -fasynchronous-unwind-tables
// -fstack-protector-strong -Wformat-security -fstack-clash-protection
// options enabled:  -fPIC -fPIE -faggressive-loop-optimizations
// -fassume-phsa -fasynchronous-unwind-tables -fauto-inc-dec -fcommon
// -fdelete-null-pointer-checks -fdwarf2-cfi-asm -fearly-inlining
// -feliminate-unused-debug-types -ffp-int-builtin-inexact -ffunction-cse
// -fgcse-lm -fgnu-runtime -fgnu-unique -fident -finline-atomics
// -fipa-stack-alignment -fira-hoist-pressure -fira-share-save-slots
// -fira-share-spill-slots -fivopts -fkeep-static-consts
// -fleading-underscore -flifetime-dse -flto-odr-type-merging -fmath-errno
// -fmerge-debug-strings -fomit-frame-pointer -fpeephole -fplt
// -fprefetch-loop-arrays -freg-struct-return
// -fsched-critical-path-heuristic -fsched-dep-count-heuristic
// -fsched-group-heuristic -fsched-interblock -fsched-last-insn-heuristic
// -fsched-rank-heuristic -fsched-spec -fsched-spec-insn-heuristic
// -fsched-stalled-insns-dep -fschedule-fusion -fsemantic-interposition
// -fshow-column -fshrink-wrap-separate -fsigned-zeros
// -fsplit-ivs-in-unroller -fssa-backprop -fstack-clash-protection
// -fstack-protector-strong -fstdarg-opt -fstrict-volatile-bitfields
// -fsync-libcalls -ftrapping-math -ftree-cselim -ftree-forwprop
// -ftree-loop-if-convert -ftree-loop-im -ftree-loop-ivcanon
// -ftree-loop-optimize -ftree-parallelize-loops= -ftree-phiprop
// -ftree-reassoc -ftree-scev-cprop -funit-at-a-time -funwind-tables
// -fverbose-asm -fzero-initialized-in-bss -mfix-cortex-a53-835769
// -mfix-cortex-a53-843419 -mglibc -mlittle-endian
// -momit-leaf-frame-pointer -mpc-relative-literal-loads

	.text
	.align	2
	.global	Foo
	.type	Foo, %function
Foo:
.LFB0:
	.cfi_startproc
	sub	sp, sp, #16	//,,
	.cfi_def_cfa_offset 16
// cast.c:5:     unsigned char c = 1;
	mov	w0, 1	// tmp93,
	strb	w0, [sp, 1]	// tmp93, c
// cast.c:6:     unsigned short s = 2;
	mov	w0, 2	// tmp94,
	strh	w0, [sp, 2]	// tmp94, s
// cast.c:7:     unsigned int i = 4;
	mov	w0, 4	// tmp95,
	str	w0, [sp, 4]	// tmp95, i
// cast.c:8:     unsigned long l = 8;
	mov	x0, 8	// tmp96,
	str	x0, [sp, 8]	// tmp96, l
// cast.c:10:     s += (unsigned short) c;
	ldrb	w0, [sp, 1]	// tmp97, c
	and	w0, w0, 65535	// _1, tmp97
	ldrh	w1, [sp, 2]	// tmp98, s
	add	w0, w0, w1	// tmp99, _1, tmp100
	strh	w0, [sp, 2]	// tmp101, s
// cast.c:11:     i += (unsigned int) s;
	ldrh	w0, [sp, 2]	// _2, s
// cast.c:11:     i += (unsigned int) s;
	ldr	w1, [sp, 4]	// tmp103, i
	add	w0, w1, w0	// tmp102, tmp103, _2
	str	w0, [sp, 4]	// tmp102, i
// cast.c:12:     l += (unsigned long) i;
	ldr	w0, [sp, 4]	// _3, i
// cast.c:12:     l += (unsigned long) i;
	ldr	x1, [sp, 8]	// tmp105, l
	add	x0, x1, x0	// tmp104, tmp105, _3
	str	x0, [sp, 8]	// tmp104, l
// cast.c:13: }
	nop	
	add	sp, sp, 16	//,,
	.cfi_def_cfa_offset 0
	ret	
	.cfi_endproc
.LFE0:
	.size	Foo, .-Foo
	.align	2
	.global	Bar
	.type	Bar, %function
Bar:
.LFB1:
	.cfi_startproc
	sub	sp, sp, #16	//,,
	.cfi_def_cfa_offset 16
// cast.c:17:     int i = 4;
	mov	w0, 4	// tmp91,
	str	w0, [sp, 4]	// tmp91, i
// cast.c:18:     long l = 8;
	mov	x0, 8	// tmp92,
	str	x0, [sp, 8]	// tmp92, l
// cast.c:20:     i += (int) l;
	ldr	x0, [sp, 8]	// tmp93, l
	mov	w1, w0	// _1, tmp93
// cast.c:20:     i += (int) l;
	ldr	w0, [sp, 4]	// tmp95, i
	add	w0, w0, w1	// tmp94, tmp95, _1
	str	w0, [sp, 4]	// tmp94, i
// cast.c:21: }
	nop	
	add	sp, sp, 16	//,,
	.cfi_def_cfa_offset 0
	ret	
	.cfi_endproc
.LFE1:
	.size	Bar, .-Bar
	.align	2
	.global	main
	.type	main, %function
main:
.LFB2:
	.cfi_startproc
	sub	sp, sp, #16	//,,
	.cfi_def_cfa_offset 16
// cast.c:25:     char c = 1;
	mov	w0, 1	// tmp99,
	strb	w0, [sp, 1]	// tmp99, c
// cast.c:26:     short s = 2;
	mov	w0, 2	// tmp100,
	strh	w0, [sp, 2]	// tmp100, s
// cast.c:27:     int i = 4;
	mov	w0, 4	// tmp101,
	str	w0, [sp, 4]	// tmp101, i
// cast.c:28:     long l = 8;
	mov	x0, 8	// tmp102,
	str	x0, [sp, 8]	// tmp102, l
// cast.c:30:     s += (short) c;
	ldrb	w0, [sp, 1]	// tmp103, c
	and	w1, w0, 65535	// _1, tmp103
	ldrh	w0, [sp, 2]	// s.0_2, s
	add	w0, w1, w0	// tmp104, _1, s.0_2
	and	w0, w0, 65535	// _3, tmp104
	strh	w0, [sp, 2]	// tmp105, s
// cast.c:31:     i += (int) s;
	ldrsh	w0, [sp, 2]	// _4, s
// cast.c:31:     i += (int) s;
	ldr	w1, [sp, 4]	// tmp107, i
	add	w0, w1, w0	// tmp106, tmp107, _4
	str	w0, [sp, 4]	// tmp106, i
// cast.c:32:     l += (long) i;
	ldrsw	x0, [sp, 4]	// _5, i
// cast.c:32:     l += (long) i;
	ldr	x1, [sp, 8]	// tmp109, l
	add	x0, x1, x0	// tmp108, tmp109, _5
	str	x0, [sp, 8]	// tmp108, l
// cast.c:33:     l += c;
	ldrb	w0, [sp, 1]	// _6, c
	ldr	x1, [sp, 8]	// tmp111, l
	add	x0, x1, x0	// tmp110, tmp111, _6
	str	x0, [sp, 8]	// tmp110, l
// cast.c:34:     c += l;
	ldr	x0, [sp, 8]	// tmp112, l
	and	w0, w0, 255	// _7, tmp112
	ldrb	w1, [sp, 1]	// tmp113, c
	add	w0, w0, w1	// tmp114, _7, tmp115
	strb	w0, [sp, 1]	// tmp116, c
// cast.c:35:     return 0;
	mov	w0, 0	// _17,
// cast.c:36: }
	add	sp, sp, 16	//,,
	.cfi_def_cfa_offset 0
	ret	
	.cfi_endproc
.LFE2:
	.size	main, .-main
	.ident	"GCC: (Ubuntu 9.3.0-17ubuntu1~20.04) 9.3.0"
	.section	.note.GNU-stack,"",@progbits
