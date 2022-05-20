	.global	foo
	.text
	.align	2

foo:	
	ret

	.section	.rodata
	.quad		0xff

	.bss
	.quad		0xff

	.end
