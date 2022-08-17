		.global	Fib
		.text
		.align	4

Fib:	str		x30, [sp, -16]!

		// If w0 is 0 or 1, take the branch to return w0.
		cmp		w0, 1
		bls		99f

		// If we get here, we need to do the recursion.
		// Save the parameter on the stack so we can
		// get it back between recursions.

		// nthNumber to be stored at 16 off sp
		str		w0, [sp, -16]!	// +1

		// Execute Fib(nthNumber - 1)
		sub		w0, w0, 1
		bl		Fib

		// Fib(n-1) stored at 32 of sp
		str		w0, [sp, -16]!	// +2
		
		// Execute Fib(nthNumber - 2)
		ldr		w0, [sp, 16]
		sub		w0, w0, 2
		bl		Fib

		// Restore the results of Fib(nthNumber - 1) and also
		// undo the stack change associated with preserving it.
		ldr		w1, [sp], 16	// +1
		add		w0, w0, w1

		// Undo the stack change due to storing nthNumber
		ldr		w1, [sp], 16	// 0

99:		ldr		x30, [sp], 16
		ret

