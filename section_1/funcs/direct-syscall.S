/*  Linux-only by intention as Apple does not conform the the  ARM Linux
    system  call conventions.  Here, Apple would use x16 where this code
    uses x8 and a value of 1 where this code uses 93.

    Both platforms are handled correctly if you use the libcrt.

    Also note that the return from main is limited to 8 bits.  Thus, the
    value used here (3510) will not yield that value, but 182 instead.
*/

        .p2align    2
        .text
        .global     main

main:
        stp         x29, x30, [sp, -16]!
        mov         w0, 256
        mov         x8, 93
        svc         0
        ldp         x29, x30, [sp], 16
        ret

        .end
