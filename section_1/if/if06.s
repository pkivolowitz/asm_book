    .global main					// Expose 'main' to the linker.
    .text							// Specify what comes next is code.

/*	Perry Kivolowitz
	Assembly Language Programming Made Not So Scary
	
	if06.s - demonstrating an IF statement.

	This program will compare 5 to 10. If 5 is larger
	(it isn't), the program will print TRUE. If 10 is
	larger than 5 (it is), the program will print
	FALSE.
*/

main:
    str     x30, [sp, -16]!			// Preserve x30 due to function call.
    mov     x1, 10					// b gets 10
    mov     x0, 5					// a gets 5

    cmp     x0, x1					// a - b ... 5 - 10 makes negative 5.
    ble     1f						// If b >= a, thake the branch.
    ldr     x0, =T					// a is greather than b - load the
									// address of TRUE string into x0
    b       2f						// Skip over prepping FALSE

1:  ldr     x0, =F 					// x0 contains a pointer to the 
									// correct string either way.
2:  bl 		puts					// Print the string with a new line.

	ldr     x30, [sp], 16			// Restore x30 so we can return.
    mov     x0, xzr					// Indicate success to the caller.
    ret								// Return back to the caller.

    .data							// What comes next is data.
F:  .asciz  "FALSE"					// Null terminated C string.
T:  .asciz  "TRUE"					// Null terminated C string.

    .end							// Tells the assembler that it
									// should emit an error if any
									// more data or instructions
									// come after.
