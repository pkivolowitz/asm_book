# Section 1 / Hexadecimal

Hex is only lightly covered here because there is a very good chance you
are already familiar with the concept.

The TL;DR is: Hex is base sixteen. Hex is useful because 16 is 2 raised
to the power of 4. Each hex digit represents 4 bits. Just two hex digits
completely specify the 8 bits in a byte. Hex digits run from 0 through 9
and then A through F.

Example: decimal 255 is hex FF.

## Numbers in Base 10

You already know that each digit in a base 10 number is multiplied by a
power of 10. The least significant digit is multiplied by 10 to the 0.
The next least significant digit is multiplied to 10 to the 1 and so on.

Floating point numbers in decimal are multiplied by negative powers of
10.

The digits available to us are 0 through 9.

## Numbers in Base 2

Binary is the same thing except with powers of 2. The digits available
to us are 0 and 1.

The first (least significant) digit is multiplied by 2 to the 0. The
second is multiplied by 2 to the 1 and so on.

The digits of the fractional part of a floating point number are
multiplied with negative powers of 2. See [Section
2](../section_2/float/) for more detailed information.

## Number in Base 16 - Hexadecimal

In decimal there are 10 values available for each digit.

In binary there are 2 values available for each digit.

Hex numbers work the same way as binary and decimal except there are 16
values for each digit. We draft the letters A through F to mean the
values 10 through 15.

Hex is a handy way of describing binary numbers with much less effort
because each hex digit encodes 4 binary digits.

## Octal - Numbers in Base 8

Base 8, or octal, is used far less than hex in CS because base 8 doesn't
naturally encode into a powers-of-two centric digital world. Two hex
digits perfectly fit in a byte but two octal digits are 6 bits... too
small. Three octal digits are 9 bits... too big. 

Goldilocks does not approve of octal.

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
| C0EDBABE | Used by misogynists everywhere |
| B16B00B5 | Used by misogynists at Microsoft |
