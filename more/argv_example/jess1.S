#include "apple-linux-convergence.S"

        .p2align    2
        .text
        GLABEL      main

/*  This program will get a string followed by a double followed by an
    integer from the command line demonstrating how each of these types
    can be retrieved.

    Example:
    ./a.out test 29.3 29
*/

MAIN
        PUSH_P      x29, x30
        mov         x29, sp

        // Check argc to see if it is 4. This is not the only way to
        // validate command line arguments but it is an easy way.
        cmp         w0, 4
        bne         99f         // take branch if argc isn't "right".

        // Skip past argv[0]
        add         x1, x1, 8

        // Fetch argv[1] as a string.
        // x1 is a pointer to a pointer to chars (i.e. the string).
        // Being a pointer to a pointer, it must be dereferenced to
        // make a pointer.
        ldr         x0, [x1]    // dereference
        // Now x0 contains a pointer to the command line argument.
        // Print the string (as a string). But doing this causes a
        // function call which will destroy x1. So, save x1 temporarily.
        // This could be avoided if x1 were moved to a backed up x
        // register (e.g. x20).
        PUSH_R      x1
        CRT         puts    // ptr is in x0 where puts() needs it.
        POP_R       x1

        // Advance x1 once again to get to argv[2] which can be done
        // in the same instruction as dereferencing it use a
        // preincrement.
        ldr         x0, [x1, 8]!    // dereference

        // Now the string version of argv[2] is now pointed to by x0.
        // This is exactly where atof would want it. We need atof
        // because it turns strings into numbers. BUT, same as before,
        // calling a function would destroy x1 so let's do the same
        // trick of backing up x1 on the stack and then restoring after
        // the function call.
        PUSH_R      x1
        CRT         atof    // ptr is in x0 where atof() needs it.
        POP_R       x1
        // The string value will be converted to a double left in d0.
        // d0 is also a scratch register so for our next call to atoi,
        // d0 will have to be preserved on the stack - alternatively,
        // we could have used a high d register backed up and restored
        // at the start and ending of main().

        // Advance x1 once again to get to argv[3] which can be done
        // in the same instruction as dereferencing it use a
        // preincrement.
        ldr         x0, [x1, 8]!  // dereference

        // Now the string version of argv[3] is now pointed to by x0.
        // This is exactly where atoi would want it. We need atoi
        // because it turns strings into numbers. BUT, same as before,
        // calling a function would destroy x1 so let's do the same
        // trick of backing up x1 on the stack and then restoring after
        // the function call. We must also do the same for d0. Actually,
        // we won't need argv after this so we will skip backing up x1.

        PUSH_R      d0
        CRT         atoi    // ptr is in x0 where atof() needs it.
        POP_R       d0
        // d0 now contains the double.
        // x0 now contains the integer.
        // x0 must be copied to x1 because x0 must be a pointer to fmt
        // for printf to work.
        mov         x1, x0
        LLD_ADDR    x0, fmt
#if defined(__APPLE__)
        sub         sp, sp, 16
        str         x1, [sp, 8]
        str         d0, [sp]
        CRT         printf
        add         sp, sp, 16 
#else
        bl          printf
#endif

99:     POP_P       x29, x30
        mov         w0, wzr
        ret

/* What did we learn?
    * x1 has argv when main begins.
    * pointers to the arguments are the contents of argv NOT
    the actual values. Therefore, x1, which is a pointer (to a pointer),
    must be dereferenced to get to the actual pointer. In the code,
    there are three lines with the comment "// dereference".
    * all command line arguments are c-strings. If that's not what you
    want, they must be converted - see the code for atoi and atof for
    examples.
*/
        .data

fmt:    .asciz      "double: %f integer: %d\n"

        .end
