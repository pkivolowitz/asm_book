# Section 1 / Hexadecimal

Hex is only lightly covered here because there is a very good chance you
are already familiar with the concept.

The TL;DR is: Hex is base sixteen. Hex is useful because being base 16,
each hex digit represents 4 bits and just two hex digits completely
indicates the 8 bits in a byte. Hex digits run from 0 through 9 and then
A through F. Example: decimal 255 is hex FF.

## Numbers in Base 10

You already know that each digit in a base 10 number is added to a power
of 10. The first digit is added to 10 to the 0. The second digit is
added to 10 to the 1 and so on.

## Numbers in Base 2

### Integers

Binary is the same thing except with powers of 2.

The first (least significant) digit is added to 2 to the 0. The second
is added to 2 to the 1 and so on.

### Floats

Floats are more complicated but in rough terms the digits are raised to
negative powers of 2. See [Section 2](../section_2/float/) for more
detailed information.

## Number in Base 16 - Hexadecimal

Hex numbers work the same way as binary and decimal except there are
more than 10 values for each digit. We draft the letter A through F to
mean the values 10 through 15.

Hex is a handy way of describing binary numbers with much less effort.

## Octal - Numbers in Base 8

We don't speak of such things.

More seriously, base 8, or octal, is used far less than hex (permission
bits in Linux is one place where it is used) in CS because it doesn't
naturally encode into a single byte. Two hex digits perfectly since in a
byte but two octal digits is 6 bits... too small and three octal digits
is 9 bits... too big. Goldilocks does not approve.

## Printing Hex

With `printf()` use `%x`.

With `iostream` use the modifier `hex` but note this is sticky. It will
remain active until switched back to `dec`.

## The REAL Reason We Love Hex

You can spell stuff with hex.

| Hex Value | Notes |
| --------- | ----- |
| DEADBEEF | Found frequently in MC68K code especially Amiga |
| 8BADFOOD | Found for similar reasons but on Apple products |
| DEADDEAD | Associated with the Blue Screen of Death |
| F003BA11 | Used by undergraduates everywhere |
| COEDBABE | Used by misogynists everywhere |
| B16B00B5 | Used by misogynists at Microsoft |
