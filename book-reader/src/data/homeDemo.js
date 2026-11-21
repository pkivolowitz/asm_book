// The runnable program on the home page. Short, and every line has a comment,
// so a first-time visitor can change something and see what happens.
export const HOME_DEMO = String.raw`// Change the message or the count, then press Run.
        .global main
        .text
main:   mov     x19, #3             // print the line 3 times
1:      mov     x0, #1              // fd 1 = stdout
        adr     x1, msg             // address of the bytes
        mov     x2, #len            // how many bytes
        mov     x8, #64             // syscall 64 = write
        svc     #0
        subs    x19, x19, #1        // count down, setting the flags
        b.ne    1b                  // loop until x19 reaches zero
        mov     x0, #0              // exit status 0
        mov     x8, #93             // syscall 93 = exit
        svc     #0

        .data
msg:    .ascii  "Hello from ARM64!\n"
        .equ    len, . - msg
`;
