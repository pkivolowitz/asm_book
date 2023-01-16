//  Macros to permit the "same" assembly language to build on ARM64
//  Linux systems as well as Apple Silicon systems.
//
//  Perry Kivolowitz
//  A Gentle Introduction to Assembly Language
//
// This is a test.

#if defined(__APPLE__)

.macro LD_ADDR xreg, label 
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

#else

.macro GLABEL label
        .global \label
.endm

.macro MAIN
main:
.endm

.macro  CRT label
        bl  \label
.endm

.macro LD_ADDR xreg, label
        ldr     \xreg, =\label
.endm

#endif

.macro  START_PROC
        .cfi_startproc
.endm

.macro  END_PROC
        .cfi_endproc
.endm
