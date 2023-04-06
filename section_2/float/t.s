        .text                     
        .global     _main 
        .align      2               
    
_main:   
        str         x30, [sp, -16]!
        mov         x0, 0xFFFFFFFF
/*
        ldr        s0, =0x3fc00000
        fcvt       d0, s0         
        ldr        x0, =fmt       
        bl         printf         
*/
        ldr        x30, [sp], 16   
        mov        w0, wzr         
        ret                        
     
        .data                      
fmt:    .asciz    "%f\n"           
        .end
           