	.arch armv8-a
	.file	"test02.c"
	.text
	.global	Bar
	.data
	.align	3
	.type	Bar, %object
	.size	Bar, 8
Bar:
	.hword	-21846
	.byte	-69
	.zero	1
	.word	-858993460
	.ident	"GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0"
	.section	.note.GNU-stack,"",@progbits
