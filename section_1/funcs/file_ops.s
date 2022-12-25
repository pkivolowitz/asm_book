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
        // w0 will contain either the file descriptor of the new
        // file or -1 for a failure. Note that the value in w0
        // has also been copied to "fd" - a register alias.
        cmp 	w0, wzr
        bge 	1f
        // If we get here, the open has failed. Use perror() to
        // print a meaningful error and branch to exit. The return
        // code of the program will be set to non-zero inside fail.
        ldr     x0, =fname
        bl      fail
        b       99f

1:		// When we get here, the file is open. Write some data to it.
        // If write_file returns non-zero, it signifies an error. If
        // so, branch to the file closing code since the file is open
        // after printing an error message.
        bl		write_data
        cbz	    w0, 10f
        // If we get here, there was an error in write_data. Print
        // a reasonable error message then branch to the clean usleep
        // code.
        ldr     x0, =wf     // load legend
        bl      fail        // print error
        b       50f         // branch to clean up.

        // Seek back to position zero preparing to read the file back.
        // The return value in x0 (off_t) is the return value of
        // lseek(). 
10:     bl      seek_zero
        cbz     x0, 20f
        // If we get here, the seek failed. Cause a reasonable
        // message to be printed then branch to the clean up code.
        ldr     x0, =sf
        bl      fail
        b       50f
20:
        // When we get here, we are done. Close the file.
50:		mov		w0, fd
        bl 		close
        mov 	retval, wzr

99:     ldp     x27, x28, [sp], 16
        ldp     x29, x30, [sp], 16
        mov     w0, retval
        ret

/*	open_file()
    This function attempts to open a file for both reading and
    writing. Return values will be checked to ensure the file is
    opened. If successful, the fd is returned (and is squirreled
    away in register "fd"). If unsuccessful, the -1 returned by
    open() is passed back to the caller.

    Explanation of the magic numbers:

    int open(const char *pathname, int flags, mode_t mode);
    octal 102 for flags is O_RDRW | O_CREAT
    octal 600 for mode is rw------- i.e. read and write for
        the owner but no permissions for anyone else.
*/

        .equ    O_FLAGS, 0102
        .equ    O_MODE, 0600

open_file:
        stp      x29, x30, [sp, -16]!
        ldr      x0, =fname
        mov      w1, O_FLAGS
        mov      w2, O_MODE
        bl       open
        mov      fd, w0
        ldp      x29, x30, [sp], 16
        ret


/*  This function uses perror to print a meaningful error
    message in the event of a failure. The string value
    passed to perror arrives to us as a pointer in x0.
*/

fail:
        stp     x29, x30, [sp, -16]!
        bl 		perror
        mov		retval, 1
        ldp     x29, x30, [sp], 16
        ret

/*  ssize_t write(int fd, const void *buf, size_t count);
*/

write_data:
        stp     x29, x30, [sp, -16]!
        str     x20, [sp, -16]!
        mov     w0, fd              // file descriptor
        ldr     x1, =txt            // address to print from
        ldr     x2, =txt_s          // load pointer to size
        ldr     x2, [x2]            // dereference the pointer
        mov     w20, w2             // need this value for error check.
        bl      write
        cmp     x0, x20             // Did we write the expected amount?
        bne     90f
        // successful write - return 0
        mov     x0, xzr
        b       99f
90:     // failure - ensure we return non-zero!
        mov     x0, 1
99:     ldr     x20, [sp], 16
        ldp     x29, x30, [sp], 16
        ret

/*  off_t lseek(int fd, off_t offset, int whence);
*/
seek_zero:
        stp     x29, x30, [sp, -16]!
        mov     w0, fd          // file descriptor
        mov     x1, xzr         // beginning of file
        mov     w2, wzr         // SEEK_SET - absolute offset
        bl      lseek
        ldp     x29, x30, [sp], 16
        ret

        .data
prog:	.asciz	"file_ops"
wf:     .asciz  "write failed"
sf:     .asciz  "lseek failed"
fname:	.asciz	"test.txt"
txt:	.asciz	"some data\n"
txt_s:	.word	txt_s - txt - 1		// strlen(txt)
        .end
