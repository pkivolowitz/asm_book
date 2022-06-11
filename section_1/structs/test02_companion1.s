        .global		main
        .text
        .align		2

main:
        str			x30, [sp, 16]!

        ldr			x0, =fmt
        ldr			x1, =Bar
        ldrh		w2, [x1]
        ldrb		w3, [x1, 2]
        ldr			w4, [x1, 4]
        bl			printf
        
        ldr			x30, [sp], 16
        mov			w0, wzr
        ret

        .data

fmt:	.asciz		"%p a: 0x%x b: 0x%x c: 0x%x\n"
