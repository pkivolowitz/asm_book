/*  Perry Kivolowitz
    Example of file operations.
*/
        .text
        .global main
        .align  2

/*  This program will
    * open() a file in the current directory,
    * write() some text to it, 
    * seek back to the beginning of the file,
    * read() each line, printing it
    * close() the file
*/

retval  .req    w27
fd 		.req	w28

main:   stp     x29, x30, [sp, -16]!
        stp     x27, x28, [sp, -16]!
        bl      open_file
        cbz     x0, 1f
        // If we get here, the open has failed. Use perror() to
        // print a meaningful error and exit.
        bl      open_fail
        b       99f

1:		// When we get here, the file is open.

		// When we get here, we are done. Close the file.
		mov		w0, fd
		bl 		close
		mov 	retval, wzr

99:     ldp     x27, x28, [sp], 16
        ldp     x29, x30, [sp], 16
        mov     w0, retval
        ret

/*	This function attempts to open a file for both reading and
	writing. Return values will be checked to ensure the file is
	opened. If successful, 0 is returned (and the file descriptor
	is squirreled away in register "fd".
*/

open_file:
       stp      x29, x30, [sp, -16]!
       ldp      x29, x30, [sp], 16
	   mov      x0, 1
       ret


/*  This function uses perror to print a meaningful error
    message in the event of an open failure.
*/

open_fail:
        stp     x29, x30, [sp, -16]!
		ldr		x0, =fname
		bl 		perror
		mov		retval, 1
        ldp     x29, x30, [sp], 16
        ret


		.data
prog:	.asciz	"file_ops"
fname:	.asciz	"test.txt"

		.end
