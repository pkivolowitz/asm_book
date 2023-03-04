#include "apple-linux-convergence.S"

        .p2align    2
        .text
        GLABEL      main

/*  This practice program demonstrates manipulation of an array of
    structs. The code is Apple Silicon and Linux compatible.
*/

/*  Here is the struct:
    struct S {              //  offset  width   padding   running total
        char * first_name;  //  0       8       0         8
        char * last_name;   //  8       8       0         16
        int age;            //  16      4       4         24  
        double gpa;         //  24      8       0         32
    };

    I have found that the .struct method I taught in class works only
    on Linux. Therefore, I am using the .equ method to give symbolic
    names to the offsets in the struct.
*/

        .equ        s_first_name, 0
        .equ        s_last_name, s_first_name + 8
        .equ        s_age, s_last_name + 8
        .equ        s_gpa, s_age + 8
        .equ        s_sizeof, s_gpa + 8

        .equ        NUM_ELEMENTS, 20

b_ptr   .req        x20         // base address of the array
t_ptr   .req        x21         // a temporary pointer used for looping
counter .req        x22         // will be a loop counter

MAIN
        START_PROC
        PUSH_P      x29, x30
        PUSH_P      b_ptr, t_ptr
        mov         x29, sp

        //  If b_ptr is not null at the end of the program it means
        //  that it contains the address of the array which must be
        //  freed.

        mov         b_ptr, xzr

        //  Notice I've broken down the program into its logical steps.
        //  In this way, each function does one thing and one thing
        //  only. In assembly language, you really don't want overly
        //  long functions... they get hard to understand and debug.

        bl          AllocArray
        cbnz        x0, 1f
        LLD_ADDR    x0, mfail
        CRT         perror
        mov         w1, 1           // Signal an error occurred.
        b           99f

1:      mov         b_ptr, x0
        bl          InitArray
        bl          PrintArray

        //  When we get here, we're on our way out. If we have
        //  executed the malloc() sucessfully, the register b_ptr
        //  will be non-zero. Only call free() in this case.

90:     cbz         b_ptr, 99f
        mov         x0, b_ptr
        CRT         free

        //  Notice the setting of w0 to zero is held apart from
        //  the final exit code. I did this so that if malloc()
        //  fails, a non-zero value can put returned in w0. If
        //  we get to this next line, we're on a path of normal
        //  exit.

        mov         w0, wzr

99:     POP_P       b_ptr, t_ptr
        POP_P       x29, x30
        ret
        END_PROC

/*  This function will loop through the entire array printing every
    element (which are the same over and over). This time however we
    will use an actual loop counter so that we can print the array
    index in front of each line.
*/

PrintArray:
        START_PROC
        PUSH_P      x29, x30
        PUSH_R      counter 
        mov         x29, sp

        mov         t_ptr, b_ptr
        mov         counter, -1        // We start at the BOTTOM
        b           10f

1:      LLD_ADDR    x0, fmt
        mov         x1, counter
        ldr         x2, [t_ptr, s_first_name]
        ldr         x3, [t_ptr, s_last_name]
        ldr         w4, [t_ptr, s_age]
        ldr         d0, [t_ptr, s_gpa]

#if defined(__APPLE__)
        // Let the pain begin. Notice the order is exactly
        // right to left relative to the placeholders in the
        // template "fmt".
        PUSH_R      d0
        PUSH_P      x3, x4
        PUSH_P      x1, x2
        CRT         printf
        add         sp, sp, 48
#else
        bl          printf
#endif
        // Make sure this increment of t_ptr is skipped when
        // entering the loop from the branch to the bottom.

        add         t_ptr, t_ptr, s_sizeof
        
10:     add         counter, counter, 1
        cmp         counter, NUM_ELEMENTS
        bne         1b

        POP_R       counter
        POP_P       x29, x30
        ret
        END_PROC

/*  This function initializes all of the members of the array (whose
    base address is in b_ptr) with identical values. The first and
    last names are dummy values. So too are the age and gpa. Who in
    class will be the first to tell the rest of us what the pun here
    is and the meaning behind the values.

    There will be no loop counter here. Instead I'll use the pointer
    advancing through the array as the means of stopping the loop.
    Loop counters are overrated.
*/

InitArray:
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp

        // t_ptr is initialized to the beginning of the array and will
        // be used to access each element by marching forward in the
        // loop. The loop will stop when t_ptr equals the address
        // just past the end of the array. This "end" value will be
        // kept in x7 which is safe only as long as this function makes
        // no function calls of its own.

        mov         t_ptr, b_ptr
        mov         x0, s_sizeof
        mov         x1, NUM_ELEMENTS
        mul         x0, x0, x1 
        add         x7, x0, b_ptr

        // Buffer up the values that will be used to initilize every
        // array element. This can be done in scratch registers only
        // so long as this function makes no function calls of its
        // own (in the loop).

        LLD_ADDR    x6, dummy_fname
        LLD_ADDR    x5, dummy_lname
        LLD_ADDR    x4, d_age
        ldr         w4, [x4]
        LLD_ADDR    x3, d_gpa
        ldr         d0, [x3]

1:      cmp         x7, t_ptr
        beq         99f

        str         x6, [t_ptr, s_first_name]
        str         x5, [t_ptr, s_last_name]
        str         w4, [t_ptr, s_age]
        str         d0, [t_ptr, s_gpa]
        add         t_ptr, t_ptr, s_sizeof
        b           1b

99:     POP_P       x29, x30
        ret
        END_PROC

AllocArray:
        START_PROC
        PUSH_P      x29, x30
        mov         x29, sp

        // Use malloc() to allocate the entire array. The total size
        // will be the size of one element times the number of elements.

        mov         x0, s_sizeof
        mov         x1, NUM_ELEMENTS
        mul         x0, x0, x1
        CRT         malloc

        POP_P       x29, x30
        ret
        END_PROC

        .data

        // The AASCIZ macro ensures alignment is correct
        // for each string. I found one case on Apple Silicon
        // where this was necessary - doesn't hurt to align all
        // the time.
        
        AASCIZ      mfail, "malloc() failed"
        AASCIZ      dummy_fname, "Mortimer"
        AASCIZ      dummy_lname, "Snerd"
        AASCIZ      fmt, "[%2d] %s %s %d %f\n"

        .p2align    2
d_age:  .word       85
d_gpa:  .double     1.938

        .end