# Section 1 / Half Precision Floats

TL;DR - don't use these in C and C++ without being willing to wade
through a great deal of muck. In assembly language, it is more 
straight forward.

## Half Precision Formats in C and C++

Support for half precision (16 bit) floating point values does exist but
there is no complete agreement on how different compilers support them.
Indeed, there are not one but two competing half precision formats out
there. These are the IEEE and GOOGLE types. Further still, many open
source developers have created their own implementations with
potentially clashing naming conventions.

Finally, as of this writing, there is a performance penalty to using
half precision floating point values from C and C++ for ordinary math.
See below:

```c++
__fp16 Foo(__fp16 g, __fp16 f) {
	return g + f;
}
```

compiles to:

```asm
    fcvt    s1, h1
    fcvt    s0, h0
    fadd    s0, s0, s1
    fcvt    h0, s0
    ret
```

On the other hand, if you are willing to use *intrinsics* and one of
the SIMD instruction sets offered by ARM, then knock yourself out. Be
aware that doing so ties your code to the ARM processor in ways which
you might regret.

## Half Precision in Assembly Language

more to come
