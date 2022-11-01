		.global	main
		.align	2

/*	Walkies - a silly animation using four characters on the Linux
	console. This program demonstrates low level IO (write()) and
	is written in the form of an infinite loop (i.e. ^C or kill will
	be required to halt the program).

	The approach used here avoids use of two for loops, one for moving
	to the right and one for moving to the left. Rather, we notice that
	the only difference between the two for loops would be that one
	increments and the other decrements. Otherwise, they'd be the same.

	Instead of the two for loops we'll use a toggle called delta. It
	will alternate between 1 and -1 when counter reaches MAX_COLUMN (on
	the way left to right / transition from 1 to -1) or 0 on the way
	back (-1 to 1)
*/

		.equ	MAX_COLUMN, 60		// These are equivalent to
		.equ	NUM_CHARS, 4		// #define in C and C++

counter	.req    w20					// These also but these are for
delta	.req	w21					// use with registers

		.section    .rodata			// In essence: const

CHARS:	.asciz      "|/_\\"
TRM:	.asciz		" \r"			// The space is important.
usec:	.int		75000			// 0.075 seconds delay AT LEAST

		.text

main:	stp		x29, x30, [sp, -16]!
		stp		counter, delta, [sp, -16]!

		// counter will move up and down between MAX_COLUMN and 0
		// by toggling delta from 1 to -1 and back. This is far
		// simpler than creating dual for loops which one might do 
		// in a naive implementation.

		mov		counter, wzr
		mov		delta, 1
		mov		w0, wzr

0:		bl		Pad
		bl		Emit
		bl		Terminator
		// Having completed output for this animation cycle, adjust
		// counter toggling delta if necessary.
		add		counter, counter, delta
		mov		w0, MAX_COLUMN
		cmp		w0, counter
		bne 	1f
		neg		delta, delta
		b 		2f
1:		cbnz	counter, 2f
		neg		delta, delta

		// Cause the delay between animation cycles.
2:		ldr		x0, =usec
		ldr		w0, [x0]
		bl		usleep
		b 		0b

		// Because of the infinite loop, this code will not
		// be reached but is here out of habit and good practices.
		ldp		counter, delta, [sp], 16
		ldp		x29, x30, [sp], 16
		mov		w0, wzr
		ret

/*		Terminator - outputs "\r " - notice the space after
		the carriage return. It is important. Try redoing this
		with the space removed to see why.
*/

Terminator:
		stp		x29, x30, [sp, -16]!
		mov		w0, 1				// 1 is stdout
		ldr		x1, =TRM			// Pointer to string
		mov		w2, 2				// 2 characters being printed
		bl		write
		ldp		x29, x30, [sp], 16
		ret

/*		Emit - puts out the symbol derived from counter.
*/

Emit:	stp		x29, x30, [sp, -16]!
		mov		w0, counter
		mov		w1, NUM_CHARS
		bl		mod
		ldr		x1, =CHARS
		add		x1, x1, x0
		mov		w0, 1
		mov		w2, 1
		bl		write		
		ldp		x29, x30, [sp], 16
		ret


/*	Pad - prints w0 spaces to the console. It does this using
	a for loop printing one space at a time. A reasonable optimization
	would be to create a large array of spaces and use the length
	parameter to write() to replace the loop.
*/

Pad:	stp		x29, x30, [sp, -16]!
		str		delta, [sp, -16]!	// REUSING w21 !!!
		mov		w21, wzr

1:		ldr		x1, =buff
		mov		w2, ' '
		strb	w2, [x1]			// ' ' is pointed to by x1
		mov		w0, 1				// 1 is stdout
		mov		w2, 1				// emitting 1 byte
		bl		write
		add		w21, w21, 1
		cmp		w21, counter
		blt		1b

		ldr		delta, [sp], 16
		ldp		x29, x30, [sp], 16
		ret

/*	mod(a, b) - implements a % b - AARCH64 lacks a mod instruction.
	A strange place to economize, but there you have it.

	a comes to us in x0
	b comes to us in x1
	method:
    * integer divide a by b
		for example - 5 % 3 would need 5 // 3 yielding 1
    * multiply result by b
		1 * 3 is 3
    * subtract result from a
		5 - 3 is 2 and that's our return value.
*/

mod:	sdiv 	x2, x0, x1				// x2 gets a // b
        msub	x0, x2, x1, x0			// x0 gets a - a // b * b	
        ret

		.data
buff:	.space	4

		.end

