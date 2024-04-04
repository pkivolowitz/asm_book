/*  Working with floating point values (in this case all doubles).

    This program accepts a floating point command line argument to be
    used as the radius of a circle of the side of a square or length
    of a side of a right triangle. In this way, various floating point
    operations will be demonstrated.

    Perry Kivolowitz
    Professor of Computer Science
    Carthage College

    4/4/2024
*/

#include    "apple-linux-convergence.S"

            .text
            .p2align    2
            GLABEL      main

/*  D20 will be used to buffer the value of PI to allow it to be shared
    amongst all sample functions.

    D21 will be used to buffer the value provided on the command line.
*/
PI          .req        d20
DVAL        .req        d21

/*  GetOptions - this function will examine the command line argument
    vector to find the value the user wants to work with.

    GetOptions(int argc, char ** argv)
                   w0            x1

    Returns:    Success is returned as 0 in x0. DVAL contains the value
                provided on the command line.

                Failure is returned as non-zero in x0. DVAL is
                undefined.
*/

GetOptions:
            START_PROC
            PUSH_P      x29, x30
            mov         x29, sp
            // argc must have value of two
            cmp         x0, 2
            beq         10f
            mov         x0, 1
            b           99f

10:         // When we get here, argc == 2.
            //
            // Preincrement argv to skip passed argv[0]. argc being 2
            // promises that x1 is not null. *argv[1] is put in x0 and
            // atof is called.

            ldr         x0, [x1, 8]!
            CRT         atof
            fmov        DVAL, d0
            mov         x0, xzr

99:         POP_P       x29, x30
            ret
            END_PROC

/*  void AreaOfCircle(void) - this function computes and prints the area
    of a circle whose radius is contained in DVAL (a double register).
*/
AreaOfCircle:
            START_PROC
            PUSH_P      x29, x30
            fmul        d1, DVAL, DVAL  // r^2
            fmul        d1, d1, PI      // PI * R * R
            // Print result
            LLD_ADDR    x0, CArea
            fmov        d0, DVAL

#if defined(__APPLE__)
            PUSH_P      d0, d1
            CRT         printf
            add         sp, sp, 16
#else
            bl          printf
#endif
            
            POP_P       x29, x30
            ret
            END_PROC

/*  void AreaOfSquare(void) - this function computes and prints the area
    of a square whose side is contained in DVAL (a double register).
*/

AreaOfSquare:
            START_PROC
            PUSH_P      x29, x30
            fmul        d1, DVAL, DVAL  // side^2
            // Print result
            LLD_ADDR    x0, SArea
            fmov        d0, DVAL

#if defined(__APPLE__)
            PUSH_P      d0, d1
            CRT         printf
            add         sp, sp, 16
#else
            bl          printf
#endif
            
            POP_P       x29, x30
            ret
            END_PROC

/*  void AreaOfRTrianle(void) - this function computes and prints the 
    area of a right triangle whose side is contained in DVAL (a double
    register).
*/

AreaOfRTrianle:
            START_PROC
            PUSH_P      x29, x30
            fmov        d2, 2.0
            fdiv        d1, DVAL, d2    // half the base
            fmul        d1, d1, DVAL    // times the height
            // Print result
            LLD_ADDR    x0, TArea
            fmov        d0, DVAL

#if defined(__APPLE__)
            PUSH_P      d0, d1
            CRT         printf
            add         sp, sp, 16
#else
            bl          printf
#endif
            
            POP_P       x29, x30
            ret
            END_PROC

MAIN
            START_PROC
            PUSH_P      x29, x30
            PUSH_P      d20, d21
            mov         x29, sp

            // Get the command line parameter. If successful, x0 will be
            // 0 and double register DVAL will contain the value.

            bl          GetOptions
            cbnz        x0, 99f

            // Load address of the pi literal. Load it into d20
            // for use in various functions.

            LLD_ADDR    x0, pi 
            ldr         PI, [x0]

            bl          AreaOfCircle
            bl          AreaOfSquare
            bl          AreaOfRTrianle

99:         POP_P       d20, d21
            POP_P       x29, x30
            mov         w0, wzr
            ret
            END_PROC

            .data
            .p2align    3

pi:         .double     3.14159265358979323846
CArea:      .asciz      "Area of circle with radius: %f is: %f\n"
SArea:      .asciz      "Area of square with side: %f is: %f\n"
TArea:      .asciz      "Area of right triangle with side: %f is: %f\n"

            .end
