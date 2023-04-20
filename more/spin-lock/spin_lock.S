#include "apple-linux-convergence.S"

        .p2align    2
        .text

/*  Demonstration  of use  of  load-linked  and  store-conditional doing
    something  interesting.  In this case, creating a spin lock.  A spin
    lock is a simple  but  grossly inefficient  form of a mutex.  If the
    "lock" is found to be owned (non-zero) by someone else,  the calling
    thread spins - checking the ownership of the "lock" in a tight loop.

    The spinning uses up  time.  A  better  mutex would add some kind of
    queing for threads that don't own the lock. And, some kind of waking
    would also be needed. Threads on the queue would be "asleep."
*/

#if defined(__APPLE__)
        .global     _Lock
        .global     _Unlock
#else
        .global     Lock
        .global     Unlock 
#endif

#if defined(__APPLE__)
_Lock:
#else
Lock:
#endif
        START_PROC
        mov         w3, 1
1:      ldaxr       w1, [x0]
        cbnz        w1, 1b          // lock taken - spin.
        stlxr       w2, w3, [x0]
        cbnz        w2, 1b          // shucks - somebody meddled.
        // considered using dmb here
        ret
        END_PROC

#if defined(__APPLE__)
_Unlock:
#else
Unlock:
#endif
        START_PROC
        str         wzr, [x0]
        // considered using dmb here
        ret
        END_PROC

        .end