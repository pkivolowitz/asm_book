ReturnsAnInt:
    mov	w0, 16
    ret

ReturnsALong:
    mov	x0, 16
    ret

ReturnsAFloat:
    fmov	s0, 16
    ret

ReturnsADouble:
    fmov	d0, 16
    ret