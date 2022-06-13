	.arch armv8-a
	.file	"const_test.cpp"
	.text
.Ltext0:
	.section	.rodata
	.align	3
.LC0:
	.string	"%d\n"
	.text
	.align	2
	.global	_Z6Const1v
	.type	_Z6Const1v, %function
_Z6Const1v:
.LFB0:
	.file 1 "const_test.cpp"
	.loc 1 3 15
	.cfi_startproc
	stp	x29, x30, [sp, -32]!
	.cfi_def_cfa_offset 32
	.cfi_offset 29, -32
	.cfi_offset 30, -24
	mov	x29, sp
	.loc 1 4 12
	mov	w0, 9				// LOOK HERE - the value of 9 goes
	str	w0, [sp, 28]		// onto the stack - this is `foo`.
	.loc 1 5 8
	mov	w1, 9
	adrp	x0, .LC0
	add	x0, x0, :lo12:.LC0
	bl	printf
	.loc 1 6 1
	nop
	ldp	x29, x30, [sp], 32
	.cfi_restore 30
	.cfi_restore 29
	.cfi_def_cfa_offset 0
	ret
	.cfi_endproc
.LFE0:
	.size	_Z6Const1v, .-_Z6Const1v
.Letext0:
	.file 2 "/usr/lib/gcc/aarch64-linux-gnu/9/include/stddef.h"
	.file 3 "/usr/include/aarch64-linux-gnu/bits/types.h"
	.file 4 "/usr/include/aarch64-linux-gnu/bits/types/struct_FILE.h"
	.file 5 "/usr/include/aarch64-linux-gnu/bits/types/FILE.h"
	.file 6 "/usr/include/stdio.h"
	.file 7 "/usr/include/aarch64-linux-gnu/bits/sys_errlist.h"
	.section	.debug_info,"",@progbits
.Ldebug_info0:
	.4byte	0x325
	.2byte	0x4
	.4byte	.Ldebug_abbrev0
	.byte	0x8
	.uleb128 0x1
	.4byte	.LASF51
	.byte	0x4
	.4byte	.LASF52
	.4byte	.LASF53
	.8byte	.Ltext0
	.8byte	.Letext0-.Ltext0
	.4byte	.Ldebug_line0
	.uleb128 0x2
	.4byte	.LASF7
	.byte	0x2
	.byte	0xd1
	.byte	0x17
	.4byte	0x39
	.uleb128 0x3
	.byte	0x8
	.byte	0x7
	.4byte	.LASF0
	.uleb128 0x4
	.byte	0x8
	.uleb128 0x5
	.byte	0x4
	.byte	0x5
	.string	"int"
	.uleb128 0x6
	.4byte	0x42
	.uleb128 0x3
	.byte	0x1
	.byte	0x8
	.4byte	.LASF1
	.uleb128 0x3
	.byte	0x2
	.byte	0x7
	.4byte	.LASF2
	.uleb128 0x3
	.byte	0x4
	.byte	0x7
	.4byte	.LASF3
	.uleb128 0x3
	.byte	0x1
	.byte	0x6
	.4byte	.LASF4
	.uleb128 0x3
	.byte	0x2
	.byte	0x5
	.4byte	.LASF5
	.uleb128 0x3
	.byte	0x8
	.byte	0x5
	.4byte	.LASF6
	.uleb128 0x2
	.4byte	.LASF8
	.byte	0x3
	.byte	0x98
	.byte	0x19
	.4byte	0x71
	.uleb128 0x2
	.4byte	.LASF9
	.byte	0x3
	.byte	0x99
	.byte	0x1b
	.4byte	0x71
	.uleb128 0x7
	.byte	0x8
	.4byte	0x96
	.uleb128 0x3
	.byte	0x1
	.byte	0x8
	.4byte	.LASF10
	.uleb128 0x6
	.4byte	0x96
	.uleb128 0x8
	.4byte	.LASF54
	.byte	0xd8
	.byte	0x4
	.byte	0x31
	.byte	0x8
	.4byte	0x229
	.uleb128 0x9
	.4byte	.LASF11
	.byte	0x4
	.byte	0x33
	.byte	0x7
	.4byte	0x42
	.byte	0
	.uleb128 0x9
	.4byte	.LASF12
	.byte	0x4
	.byte	0x36
	.byte	0x9
	.4byte	0x90
	.byte	0x8
	.uleb128 0x9
	.4byte	.LASF13
	.byte	0x4
	.byte	0x37
	.byte	0x9
	.4byte	0x90
	.byte	0x10
	.uleb128 0x9
	.4byte	.LASF14
	.byte	0x4
	.byte	0x38
	.byte	0x9
	.4byte	0x90
	.byte	0x18
	.uleb128 0x9
	.4byte	.LASF15
	.byte	0x4
	.byte	0x39
	.byte	0x9
	.4byte	0x90
	.byte	0x20
	.uleb128 0x9
	.4byte	.LASF16
	.byte	0x4
	.byte	0x3a
	.byte	0x9
	.4byte	0x90
	.byte	0x28
	.uleb128 0x9
	.4byte	.LASF17
	.byte	0x4
	.byte	0x3b
	.byte	0x9
	.4byte	0x90
	.byte	0x30
	.uleb128 0x9
	.4byte	.LASF18
	.byte	0x4
	.byte	0x3c
	.byte	0x9
	.4byte	0x90
	.byte	0x38
	.uleb128 0x9
	.4byte	.LASF19
	.byte	0x4
	.byte	0x3d
	.byte	0x9
	.4byte	0x90
	.byte	0x40
	.uleb128 0x9
	.4byte	.LASF20
	.byte	0x4
	.byte	0x40
	.byte	0x9
	.4byte	0x90
	.byte	0x48
	.uleb128 0x9
	.4byte	.LASF21
	.byte	0x4
	.byte	0x41
	.byte	0x9
	.4byte	0x90
	.byte	0x50
	.uleb128 0x9
	.4byte	.LASF22
	.byte	0x4
	.byte	0x42
	.byte	0x9
	.4byte	0x90
	.byte	0x58
	.uleb128 0x9
	.4byte	.LASF23
	.byte	0x4
	.byte	0x44
	.byte	0x16
	.4byte	0x242
	.byte	0x60
	.uleb128 0x9
	.4byte	.LASF24
	.byte	0x4
	.byte	0x46
	.byte	0x14
	.4byte	0x248
	.byte	0x68
	.uleb128 0x9
	.4byte	.LASF25
	.byte	0x4
	.byte	0x48
	.byte	0x7
	.4byte	0x42
	.byte	0x70
	.uleb128 0x9
	.4byte	.LASF26
	.byte	0x4
	.byte	0x49
	.byte	0x7
	.4byte	0x42
	.byte	0x74
	.uleb128 0x9
	.4byte	.LASF27
	.byte	0x4
	.byte	0x4a
	.byte	0xb
	.4byte	0x78
	.byte	0x78
	.uleb128 0x9
	.4byte	.LASF28
	.byte	0x4
	.byte	0x4d
	.byte	0x12
	.4byte	0x55
	.byte	0x80
	.uleb128 0x9
	.4byte	.LASF29
	.byte	0x4
	.byte	0x4e
	.byte	0xf
	.4byte	0x63
	.byte	0x82
	.uleb128 0x9
	.4byte	.LASF30
	.byte	0x4
	.byte	0x4f
	.byte	0x8
	.4byte	0x24e
	.byte	0x83
	.uleb128 0x9
	.4byte	.LASF31
	.byte	0x4
	.byte	0x51
	.byte	0xf
	.4byte	0x25e
	.byte	0x88
	.uleb128 0x9
	.4byte	.LASF32
	.byte	0x4
	.byte	0x59
	.byte	0xd
	.4byte	0x84
	.byte	0x90
	.uleb128 0x9
	.4byte	.LASF33
	.byte	0x4
	.byte	0x5b
	.byte	0x17
	.4byte	0x269
	.byte	0x98
	.uleb128 0x9
	.4byte	.LASF34
	.byte	0x4
	.byte	0x5c
	.byte	0x19
	.4byte	0x274
	.byte	0xa0
	.uleb128 0x9
	.4byte	.LASF35
	.byte	0x4
	.byte	0x5d
	.byte	0x14
	.4byte	0x248
	.byte	0xa8
	.uleb128 0x9
	.4byte	.LASF36
	.byte	0x4
	.byte	0x5e
	.byte	0x9
	.4byte	0x40
	.byte	0xb0
	.uleb128 0x9
	.4byte	.LASF37
	.byte	0x4
	.byte	0x5f
	.byte	0xa
	.4byte	0x2d
	.byte	0xb8
	.uleb128 0x9
	.4byte	.LASF38
	.byte	0x4
	.byte	0x60
	.byte	0x7
	.4byte	0x42
	.byte	0xc0
	.uleb128 0x9
	.4byte	.LASF39
	.byte	0x4
	.byte	0x62
	.byte	0x8
	.4byte	0x27a
	.byte	0xc4
	.byte	0
	.uleb128 0x2
	.4byte	.LASF40
	.byte	0x5
	.byte	0x7
	.byte	0x19
	.4byte	0xa2
	.uleb128 0xa
	.4byte	.LASF55
	.byte	0x4
	.byte	0x2b
	.byte	0xe
	.uleb128 0xb
	.4byte	.LASF41
	.uleb128 0x7
	.byte	0x8
	.4byte	0x23d
	.uleb128 0x7
	.byte	0x8
	.4byte	0xa2
	.uleb128 0xc
	.4byte	0x96
	.4byte	0x25e
	.uleb128 0xd
	.4byte	0x39
	.byte	0
	.byte	0
	.uleb128 0x7
	.byte	0x8
	.4byte	0x235
	.uleb128 0xb
	.4byte	.LASF42
	.uleb128 0x7
	.byte	0x8
	.4byte	0x264
	.uleb128 0xb
	.4byte	.LASF43
	.uleb128 0x7
	.byte	0x8
	.4byte	0x26f
	.uleb128 0xc
	.4byte	0x96
	.4byte	0x28a
	.uleb128 0xd
	.4byte	0x39
	.byte	0x13
	.byte	0
	.uleb128 0x7
	.byte	0x8
	.4byte	0x9d
	.uleb128 0x6
	.4byte	0x28a
	.uleb128 0xe
	.4byte	.LASF44
	.byte	0x6
	.byte	0x89
	.byte	0xe
	.4byte	0x2a1
	.uleb128 0x7
	.byte	0x8
	.4byte	0x229
	.uleb128 0xe
	.4byte	.LASF45
	.byte	0x6
	.byte	0x8a
	.byte	0xe
	.4byte	0x2a1
	.uleb128 0xe
	.4byte	.LASF46
	.byte	0x6
	.byte	0x8b
	.byte	0xe
	.4byte	0x2a1
	.uleb128 0xe
	.4byte	.LASF47
	.byte	0x7
	.byte	0x1a
	.byte	0xc
	.4byte	0x42
	.uleb128 0xc
	.4byte	0x290
	.4byte	0x2d6
	.uleb128 0xf
	.byte	0
	.uleb128 0xe
	.4byte	.LASF48
	.byte	0x7
	.byte	0x1b
	.byte	0x1a
	.4byte	0x2cb
	.uleb128 0xe
	.4byte	.LASF49
	.byte	0x7
	.byte	0x1e
	.byte	0xc
	.4byte	0x42
	.uleb128 0xe
	.4byte	.LASF50
	.byte	0x7
	.byte	0x1f
	.byte	0x1a
	.4byte	0x2cb
	.uleb128 0x10
	.4byte	.LASF56
	.byte	0x1
	.byte	0x3
	.byte	0x6
	.4byte	.LASF57
	.8byte	.LFB0
	.8byte	.LFE0-.LFB0
	.uleb128 0x1
	.byte	0x9c
	.uleb128 0x11
	.string	"foo"
	.byte	0x1
	.byte	0x4
	.byte	0xc
	.4byte	0x49
	.uleb128 0x2
	.byte	0x91
	.sleb128 -4
	.byte	0
	.byte	0
	.section	.debug_abbrev,"",@progbits
.Ldebug_abbrev0:
	.uleb128 0x1
	.uleb128 0x11
	.byte	0x1
	.uleb128 0x25
	.uleb128 0xe
	.uleb128 0x13
	.uleb128 0xb
	.uleb128 0x3
	.uleb128 0xe
	.uleb128 0x1b
	.uleb128 0xe
	.uleb128 0x11
	.uleb128 0x1
	.uleb128 0x12
	.uleb128 0x7
	.uleb128 0x10
	.uleb128 0x17
	.byte	0
	.byte	0
	.uleb128 0x2
	.uleb128 0x16
	.byte	0
	.uleb128 0x3
	.uleb128 0xe
	.uleb128 0x3a
	.uleb128 0xb
	.uleb128 0x3b
	.uleb128 0xb
	.uleb128 0x39
	.uleb128 0xb
	.uleb128 0x49
	.uleb128 0x13
	.byte	0
	.byte	0
	.uleb128 0x3
	.uleb128 0x24
	.byte	0
	.uleb128 0xb
	.uleb128 0xb
	.uleb128 0x3e
	.uleb128 0xb
	.uleb128 0x3
	.uleb128 0xe
	.byte	0
	.byte	0
	.uleb128 0x4
	.uleb128 0xf
	.byte	0
	.uleb128 0xb
	.uleb128 0xb
	.byte	0
	.byte	0
	.uleb128 0x5
	.uleb128 0x24
	.byte	0
	.uleb128 0xb
	.uleb128 0xb
	.uleb128 0x3e
	.uleb128 0xb
	.uleb128 0x3
	.uleb128 0x8
	.byte	0
	.byte	0
	.uleb128 0x6
	.uleb128 0x26
	.byte	0
	.uleb128 0x49
	.uleb128 0x13
	.byte	0
	.byte	0
	.uleb128 0x7
	.uleb128 0xf
	.byte	0
	.uleb128 0xb
	.uleb128 0xb
	.uleb128 0x49
	.uleb128 0x13
	.byte	0
	.byte	0
	.uleb128 0x8
	.uleb128 0x13
	.byte	0x1
	.uleb128 0x3
	.uleb128 0xe
	.uleb128 0xb
	.uleb128 0xb
	.uleb128 0x3a
	.uleb128 0xb
	.uleb128 0x3b
	.uleb128 0xb
	.uleb128 0x39
	.uleb128 0xb
	.uleb128 0x1
	.uleb128 0x13
	.byte	0
	.byte	0
	.uleb128 0x9
	.uleb128 0xd
	.byte	0
	.uleb128 0x3
	.uleb128 0xe
	.uleb128 0x3a
	.uleb128 0xb
	.uleb128 0x3b
	.uleb128 0xb
	.uleb128 0x39
	.uleb128 0xb
	.uleb128 0x49
	.uleb128 0x13
	.uleb128 0x38
	.uleb128 0xb
	.byte	0
	.byte	0
	.uleb128 0xa
	.uleb128 0x16
	.byte	0
	.uleb128 0x3
	.uleb128 0xe
	.uleb128 0x3a
	.uleb128 0xb
	.uleb128 0x3b
	.uleb128 0xb
	.uleb128 0x39
	.uleb128 0xb
	.byte	0
	.byte	0
	.uleb128 0xb
	.uleb128 0x13
	.byte	0
	.uleb128 0x3
	.uleb128 0xe
	.uleb128 0x3c
	.uleb128 0x19
	.byte	0
	.byte	0
	.uleb128 0xc
	.uleb128 0x1
	.byte	0x1
	.uleb128 0x49
	.uleb128 0x13
	.uleb128 0x1
	.uleb128 0x13
	.byte	0
	.byte	0
	.uleb128 0xd
	.uleb128 0x21
	.byte	0
	.uleb128 0x49
	.uleb128 0x13
	.uleb128 0x2f
	.uleb128 0xb
	.byte	0
	.byte	0
	.uleb128 0xe
	.uleb128 0x34
	.byte	0
	.uleb128 0x3
	.uleb128 0xe
	.uleb128 0x3a
	.uleb128 0xb
	.uleb128 0x3b
	.uleb128 0xb
	.uleb128 0x39
	.uleb128 0xb
	.uleb128 0x49
	.uleb128 0x13
	.uleb128 0x3f
	.uleb128 0x19
	.uleb128 0x3c
	.uleb128 0x19
	.byte	0
	.byte	0
	.uleb128 0xf
	.uleb128 0x21
	.byte	0
	.byte	0
	.byte	0
	.uleb128 0x10
	.uleb128 0x2e
	.byte	0x1
	.uleb128 0x3f
	.uleb128 0x19
	.uleb128 0x3
	.uleb128 0xe
	.uleb128 0x3a
	.uleb128 0xb
	.uleb128 0x3b
	.uleb128 0xb
	.uleb128 0x39
	.uleb128 0xb
	.uleb128 0x6e
	.uleb128 0xe
	.uleb128 0x11
	.uleb128 0x1
	.uleb128 0x12
	.uleb128 0x7
	.uleb128 0x40
	.uleb128 0x18
	.uleb128 0x2116
	.uleb128 0x19
	.byte	0
	.byte	0
	.uleb128 0x11
	.uleb128 0x34
	.byte	0
	.uleb128 0x3
	.uleb128 0x8
	.uleb128 0x3a
	.uleb128 0xb
	.uleb128 0x3b
	.uleb128 0xb
	.uleb128 0x39
	.uleb128 0xb
	.uleb128 0x49
	.uleb128 0x13
	.uleb128 0x2
	.uleb128 0x18
	.byte	0
	.byte	0
	.byte	0
	.section	.debug_aranges,"",@progbits
	.4byte	0x2c
	.2byte	0x2
	.4byte	.Ldebug_info0
	.byte	0x8
	.byte	0
	.2byte	0
	.2byte	0
	.8byte	.Ltext0
	.8byte	.Letext0-.Ltext0
	.8byte	0
	.8byte	0
	.section	.debug_line,"",@progbits
.Ldebug_line0:
	.section	.debug_str,"MS",@progbits,1
.LASF19:
	.string	"_IO_buf_end"
.LASF27:
	.string	"_old_offset"
.LASF47:
	.string	"sys_nerr"
.LASF22:
	.string	"_IO_save_end"
.LASF5:
	.string	"short int"
.LASF7:
	.string	"size_t"
.LASF32:
	.string	"_offset"
.LASF16:
	.string	"_IO_write_ptr"
.LASF11:
	.string	"_flags"
.LASF18:
	.string	"_IO_buf_base"
.LASF23:
	.string	"_markers"
.LASF13:
	.string	"_IO_read_end"
.LASF36:
	.string	"_freeres_buf"
.LASF57:
	.string	"_Z6Const1v"
.LASF50:
	.string	"_sys_errlist"
.LASF46:
	.string	"stderr"
.LASF51:
	.string	"GNU C++14 9.4.0 -mlittle-endian -mabi=lp64 -g -fasynchronous-unwind-tables -fstack-protector-strong -fstack-clash-protection"
.LASF31:
	.string	"_lock"
.LASF6:
	.string	"long int"
.LASF28:
	.string	"_cur_column"
.LASF49:
	.string	"_sys_nerr"
.LASF29:
	.string	"_vtable_offset"
.LASF54:
	.string	"_IO_FILE"
.LASF1:
	.string	"unsigned char"
.LASF4:
	.string	"signed char"
.LASF33:
	.string	"_codecvt"
.LASF3:
	.string	"unsigned int"
.LASF41:
	.string	"_IO_marker"
.LASF30:
	.string	"_shortbuf"
.LASF15:
	.string	"_IO_write_base"
.LASF39:
	.string	"_unused2"
.LASF12:
	.string	"_IO_read_ptr"
.LASF2:
	.string	"short unsigned int"
.LASF10:
	.string	"char"
.LASF56:
	.string	"Const1"
.LASF34:
	.string	"_wide_data"
.LASF35:
	.string	"_freeres_list"
.LASF37:
	.string	"__pad5"
.LASF42:
	.string	"_IO_codecvt"
.LASF0:
	.string	"long unsigned int"
.LASF17:
	.string	"_IO_write_end"
.LASF9:
	.string	"__off64_t"
.LASF8:
	.string	"__off_t"
.LASF24:
	.string	"_chain"
.LASF43:
	.string	"_IO_wide_data"
.LASF52:
	.string	"const_test.cpp"
.LASF21:
	.string	"_IO_backup_base"
.LASF44:
	.string	"stdin"
.LASF26:
	.string	"_flags2"
.LASF38:
	.string	"_mode"
.LASF14:
	.string	"_IO_read_base"
.LASF53:
	.string	"/media/psf/Home/Documents/asm_book/section_1/const"
.LASF20:
	.string	"_IO_save_base"
.LASF48:
	.string	"sys_errlist"
.LASF25:
	.string	"_fileno"
.LASF40:
	.string	"FILE"
.LASF45:
	.string	"stdout"
.LASF55:
	.string	"_IO_lock_t"
	.ident	"GCC: (Ubuntu 9.4.0-1ubuntu1~20.04.1) 9.4.0"
	.section	.note.GNU-stack,"",@progbits
