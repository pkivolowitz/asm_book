# Section 1 / What Are Floating Point Numbers?

Before we introduce floating point instructions in the AARCH64 ISA, it is
worth going over exactly what a floating point value is. Integers are easy.
They're just powers of two summed together with a single bit at one end
determining the sign (if the integer is signed).

But what are floating numbers?

## Key Point

**Floating point values are approximations.**

Sometimes they are spot on. Most of the time, they are close.

## Floating Point Value Explorer

[Here](./float_dump.cpp) is source code to a program for you that
takes floating point values (both single and double precision)
apart.

Here are some examples:

```text
% ./a.out    
Must supply a floating point value as a command line argument.
% 
```

This is what happens when you do not provide a value to examine.

```text
% ./a.out 1
Component           Double                   Float                    Comment
Value:              1                        1                        Delta(F - D): 0               
Sign:               0                        0                        
Exponent (hex):     3ff                      7f                       
De-biased (dec):    0                        0                        
Fraction (hex):     0                        0                        
Halves:             0                        0                        
Quarters:           0                        0                        
Eighths:            0                        0                        
Sixteenths:         0                        0                        
Thirty seconds:     0                        0                        
%
```

Above, we examine the value of 1.

On the line marked "Value" you can see the values represented as double precision and as single precious. Under "Comment" you can see that there
is no difference between the double and the single precision numbers.

| Line | Meaning |
| ---- | ------- |
| Sign | 1 is a positive number so the sign bits are 0 |
| Exponent | First, notice that the double precision exponent is 11 bits wide while the single precision exponent is only 8 bits wide. Next, notice the values... 1023 and 127 respectively. The value of 1 is 1 raised to the power of 0 base 2. So why 1023 or 127?<br/>There is no sign bit for the exponent yet the exponent must support negative numbers. It does this by incorporating an offset of 1023 and 127 respectively (where both work out to a value of 0). Anything above 1023 and 127 are positive exponents. Anything below these values are negative exponents.
| De-biased | These are the values of the exponent with their bias removed. Notice they work out to 0. So, the value of 1 is represented by 1 raised to the power of 0 base 2. |
| Fraction | Zero??? Where's the 1 that we've been talking about get stored? It isn't. A value of 1 is always assumed to be the only value in front of the decimal place in a `float` or `double`. Every floating point value is 1 plus a fraction all raised to some power base 2. |
| Halves | There are no halves in the value of 1.|
| Quarters | There are no quarters in the value of 1.|
| Eighths | There are no eighths in the value of 1.|
| Sixteenths | There are no sixteenths in the value of 1.|
| Thirty Seconds | There are no thirty seconds in the value of 1.|

Of course, there are more fractional values to `float` and `doubles` but listing them all wouldn't be a fun tasks and we're all about fun. :)

How about a value of 1.5?

```text
Component           Double                   Float                    Comment
Value:              1.5                      1.5                      Delta(F - D): 0               
Sign:               0                        0                        
Exponent (hex):     3ff                      7f                       
De-biased (dec):    0                        0                        
Fraction (hex):     8000000000000            400000                   
Halves:             1                        1                        
Quarters:           0                        0                        
Eighths:            0                        0                        
Sixteenths:         0                        0                        
Thirty seconds:     0                        0
```

The only difference is that there is a bit turned on in the fraction. It is the most significant bit... there is a half in one and a half.

1 ^ 0 = 1 +

1 ^ -1 = &#189;

Altogether makes 1.5.

How about 1.875?

```text
Component           Double                   Float                    Comment
Value:              1.875                    1.875                    Delta(F - D): 0               
Sign:               0                        0                        
Exponent (hex):     3ff                      7f                       
De-biased (dec):    0                        0                        
Fraction (hex):     e000000000000            700000                   
Halves:             1                        1                        
Quarters:           1                        1                        
Eighths:            1                        1                        
Sixteenths:         0                        0                        
Thirty seconds:     0                        0
```

This says 1.875 is:

1 ^ 0 = 1 +

1 ^ -1 = &#189; +

1 ^ -2 = &#188; +

1 ^ -3 = &#8539;

How about 8.375? This is the first time we are looking at
a value which increases the (de-biased) exponent to non-zero.
Things get a little more complicated.

```text
Component           Double                   Float                    Comment
Value:              8.375                    8.375                    Delta(F - D): 0               
Sign:               0                        0                        
Exponent (hex):     402                      82                       
De-biased (dec):    3                        3                        
Fraction (hex):     c00000000000             60000                    
Halves:             0                        0                        
Quarters:           0                        0                        
Eighths:            0                        0                        
Sixteenths:         0                        0                        
Thirty seconds:     1                        1    
```

Notice the exponent has changed. This says:

1 ^ 0 = 1 +

1 ^ -1 = &#189; +

1 ^ -2 = &#188; +

1 ^ -3 = &#8539;
