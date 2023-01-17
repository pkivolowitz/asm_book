//  Macros to permit the "same" assembly language to build on ARM64
//  Linux systems as well as Apple Silicon systems.
//
//  Perry Kivolowitz
//  A Gentle Introduction to Assembly Language

#if defined(__APPLE__)

//  Apple makes a distinction between loading something close by
//  versus something global. Note the use of GOTPAGE rather then
//  PAGE. 
//
//  Note: this macro dereferences the label getting what is at
//  the label's address.

.macro  GLD_PTR     xreg, label     // Dereference a global *
        adrp	    \xreg, _\label@GOTPAGE
        ldr	        \xreg, [\xreg, _\label@GOTPAGEOFF]
.endm

.macro  GLD_ADDR    xreg, label     // Get a global address
        adrp	    \xreg, _\label@GOTPAGE
        add         \xreg, \xreg, _\label@GOTPAGEOFF
.endm

//  This macro loads the address of a nearby label.

.macro  LLD_ADDR xreg, label        // Load a local address
        adrp    \xreg, \label@PAGE
        add     \xreg, \xreg, \label@PAGEOFF
.endm

.macro GLABEL label
        .global _\label
.endm

.macro MAIN
_main:
.endm

.macro  CRT label
        bl  _\label
.endm

#else   //  LINUX

.macro GLABEL label
        .global \label
.endm

.macro MAIN
main:
.endm

.macro  CRT label
        bl  \label
.endm

//  This macro treats label as a pointer and dereferences it.
//  That is, it puts into the xreg what is found at the address
//  of the label.

.macro  GLD_PTR     xreg, label     // Dereference a global *
        ldr         \xreg, =\label
        ldr         \xreg, [\xreg]
.endm

//  This macro loads the address of a nearby label.

.macro  LLD_ADDR xreg, label
        ldr         \xreg, =\label
.endm

#endif

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

.macro  MIN     src_a, src_b, dest
        csel    \dest, \src_a, \src_b, GT
.endm

.macro  MAX     src_a, src_b, dest
        csel    \dest, \src_a, \src_b, LT
.endm
