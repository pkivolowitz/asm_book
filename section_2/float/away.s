        .global main
        .text
        .align  2

fv      .req    d20

/*	There is  no  round-away-from-zero instruction. Instead, we
	duplicate the C++ version of this function (but with better
	performance).
*/
RoundAwayFromZero:
		fcmp	d0, 0
		ble		1f
		// Value is positive, truncate up.
		frintp	d0, d0
		b 		2f
1:		// Value is negative, truncate down.
		frintm	d0, d0
2:		fcvtzs	x0, d0
		ret

main:   str     x30, [sp, -16]!
		str		fv, [sp, -16]!
		// Initialize fv with 5.1
		ldr		x0, =flit
		ldr		fv, [x0]

		fmov	d0, fv             // Load up fv for RoundAwayFromZero
		bl		RoundAwayFromZero  // And call the function
		mov		x1, x0             // Place result for printing
		fmov	d0, fv             // Place fv for printing
		ldr		x0, =fmt1          // Place address of fmt1 string
		bl		printf             // And print

		fmov	d0, fv             // Load up fv to make it negative
		fneg	d0, d0             // Floating point negation
		bl		RoundAwayFromZero  // Call the function
		mov		x1, x0             // Place for printing
		fmov	d0, fv             // Recreate negative value
		fneg	d0, d0             // Positioned for printing
		ldr		x0, =fmt2          // Place address of fmt2 string
		bl		printf             // And print

		ldr		fv, [sp], 16
        ldr     x30, [sp], 16
        mov     w0, wzr
        ret

		.data
		
flit:	.double	5.1
fmt1:	.asciz	"%4.1f away from zero (should be  6): %2d\n"
fmt2:	.asciz	"%4.1f away from zero (should be -6): %2d\n"

		.end
