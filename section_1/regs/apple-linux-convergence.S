/*  Macros to permit the "same" assembly language to build on ARM64
    Linux systems as well as Apple Silicon systems.

    See the fuller documentation at:
    https://github.com/pkivolowitz/asm_book/blob/main/macros/README.md

    Perry Kivolowitz
    A Gentle Introduction to Assembly Language
*/

.macro  GLD_PTR     xreg, label
#if defined(__APPLE__)
        adrp	    \xreg, _\label@GOTPAGE
        ldr	        \xreg, [\xreg, _\label@GOTPAGEOFF]
#else
        ldr         \xreg, =\label
        ldr         \xreg, [\xreg]
#endif
.endm

.macro  GLD_ADDR    xreg, label     // Get a global address
#if defined(__APPLE__)
        adrp	    \xreg, _\label@GOTPAGE
        add         \xreg, \xreg, _\label@GOTPAGEOFF
#else
        ldr         \xreg, =\label
#endif
.endm

.macro  LLD_ADDR xreg, label
#if defined(__APPLE__)
        adrp    \xreg, \label@PAGE
        add     \xreg, \xreg, \label@PAGEOFF
#else
        ldr         \xreg, =\label
#endif
.endm

.macro  LLD_DBL xreg, dreg, label
#if defined(__APPLE__)
        adrp    \xreg, \label@PAGE
        add     \xreg, \xreg, \label@PAGEOFF
        ldur    \dreg, [\xreg]
//      fmov    \dreg, \xreg
#else
        ldr     \xreg, =\label
        ldur    \dreg, [\xreg]
#endif
.endm

.macro  LLD_FLT xreg, sreg, label
#if defined(__APPLE__)
        adrp    \xreg, \label@PAGE
        add     \xreg, \xreg, \label@PAGEOFF
        ldur    \sreg, [\xreg]
#else
        ldr     \xreg, =\label
        ldur    \sreg, [\xreg]
#endif
.endm

.macro GLABEL label
#if defined(__APPLE__)
        .global _\label
#else
        .global \label
#endif
.endm

.macro MAIN
#if defined(__APPLE__)
_main:
#else
main:
#endif
.endm

/*  Fetching the address of the externally defined errno is quite
    different on Apple and Linux. This macro leaves the address of
    errno in x0.
*/
.macro  ERRNO_ADDR
#if defined(__APPLE__)
        bl      ___error
#else
        bl      __errno_location
#endif
.endm

.macro  CRT label
#if defined(__APPLE__)
        bl  _\label
#else
        bl  \label
#endif
.endm

.macro  START_PROC          // after starting label
        .cfi_startproc
.endm

.macro  END_PROC            // after the return
        .cfi_endproc
.endm

.macro  PUSH_P  a, b 
        stp     \a, \b, [sp, -16]!
.endm

.macro  PUSH_R  a 
        str     \a, [sp, -16]!
.endm

.macro  POP_P   a, b 
        ldp     \a, \b, [sp], 16
.endm

.macro  POP_R   a 
        ldr     \a, [sp], 16
.endm

/*  The smaller of src_a and src_b is put into dest. A cmp instruction
    or other instruction that sets the flags must be performed first.
    This macro makes it easy to remember which register does what in the
    csel.
    
    Thank you to u/TNorthover for nudge to add the cmp.
*/

.macro  MIN     src_a, src_b, dest
        cmp     \src_a, \src_b
        csel    \dest, \src_a, \src_b, LT
.endm

/*  The larger of src_a and src_b is put into dest. A cmp instruction
    or other instruction that sets the flags must be performed first.
    This macro makes it easy to remember which register does what in the
    csel.

    Thank you to u/TNorthover for nudge to add the cmp.
*/

.macro  MAX     src_a, src_b, dest
        cmp     \src_a, \src_b
        csel    \dest, \src_a, \src_b, GT
.endm

.macro  AASCIZ      label, string
        .p2align    2
\label: .asciz      "\string"
.endm
