/*		Perry Kivolowitz
		CSC3510
*/
		.global	main
		.text
		.align	2

/*	FizzBuzz - a classic interview question.

	Count from 0 to n (let's make it 100).
	If the value is divisible by 3, print Fizz
	If the value is divisible by 5, print Buzz
	If the value is divisible by both 3 and 5, print FizzBuzz
	Otherwise, print the number.
*/

/*	Bible:

	x20		counter
	w21		bool that says whether or not I have printed anything
*/

/*	mod(a, b) - implements a % b
	integer divide a by b - for example - 5 % 3 would need 5 // 3 yielding 1
	multiply result by b - 1 * 3 is 3
	subtract result from a - 5 - 3 yielding 2 and that's our return value.
*/
mod:	sdiv 	x2, x0, x1				// x2 gets a // b
		msub	x0, x2, x1, x0			// x0 gets a - a // b * b 	
		ret

main:	stp		x20, x30, [sp, -16]!
		str		x21, [sp, -16]!

		mov		x20, xzr
1:		cmp		x20, 100
		bge		99f

		mov		w21, wzr

		// Test for divisible by 3
		mov		x0, x20
		mov		x1, 3
		bl		mod
		cbnz	x0, 5f
		// If we get here, the counter was divisible by 3
		ldr		x0, =fizz
		bl		printf
		add		w21, w21, 1

5:		mov		x0, x20
		mov		x1, 5
		bl		mod
		cbnz	x0, 10f
		// If we get here, the counter was divisible by 5
		ldr		x0, =buzz
		bl		printf
		add		w21, w21, 1

10:		cbz 	w21, 20f
		// If we get here, it means that we have printed
		// something (either fizz, or buzz or fizzbuzz)
		// so all we need now is a new line
		ldr		x0, =nl
		bl		puts
		b 		80f

20:		// If we get here, the counter was neither a
		// multiple of 3 nor of 5. Therefore, we need
		// to print the counter itself.

 		ldr		x0, =fmt
		mov		x1, x20
		bl 		printf

80:		add		x20, x20, 1
		b 		1b		


99:		ldr		x21, [sp], 16
		ldp		x20, x30, [sp], 16
		mov		w0, wzr
		ret

		.data
fizz:	.asciz	"Fizz"
buzz:	.asciz	"Buzz"
nl:		.asciz	""
fmt:	.asciz	"%ld\n"

		.end
