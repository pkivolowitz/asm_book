        .text
        .p2align    2

#if defined(__APPLE__)
        .global     _LoadLockedStoreConditional
_LoadLockedStoreConditional:
#else
        .global     LoadLockedStoreConditional
LoadLockedStoreConditional:
#endif
1:      ldaxr       w1, [x0]
        add         w1, w1, 1
        stlxr       w2, w1, [x0]
        cbnz        w2, 1b
        ret
