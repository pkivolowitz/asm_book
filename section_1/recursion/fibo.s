		.global	Fib
		.text
		.align	4

Fib:	str		x30, [sp, -16]!
		cmp		w0, 1
		// If w0 is 0 or 1, take the branch to return w0.
		bls		99f

		// If we get here, we need to do the recursion.
		// Save the parameter on the stack so we can
		// get it back between recursions.

		str		w0, [sp, -16]!
		sub		w0, w0, 1
		bl		Fib
		ldr		w0, [sp], 16	// temporary
		
99:		ldr		x30, [sp], 16
		ret

