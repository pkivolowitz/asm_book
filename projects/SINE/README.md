# Compute Sine using Taylor Series

## Overview

This project stresses the use of floating point instructions to create
a program that computes the sine of an angle given to you in degrees
on the command line.

## Taylor Series

The sine of an angle given in radians can be found using the Taylor
Series:

```text
sin x = x - x^3/3! + x^5/5! - x^7/7! ...
```

Notice each term flips from addition to subtraction.

Notice each term is based on the odd integers starting at 1. While the
"1" case might look different, it is the same as all the others since
1 is just 1 to the first power divided by 1 factorial.

## Command line

You are to accept two arguments on the command line. `getopt` is not
being used here to concentrate on the floating point math. Both
arguments are therefore required.

* The angle in degrees whose sine you wish to calculate. Take this to
  be a double.

* The number of terms to evaluate. The number of terms must lie between
  1 and 10 inclusive. Note the value of 10 as an upper bound in new. It
  was 8.

## C version

To assist your efforts, [here](./c_version.c) is a version of this
project written in C. This has been updated to print nice debugging
output which is not part of the project.

This C version also demonstrates a different way of calculating the
toggle. This version flips the sign of the toggle by multiplying by -1.
The previous version used odd and even values of the term.

## Sample executions

```text
pk_taylor_series > gcc main.S -o a
pk_taylor_series > ./a 0 10
The sine of 0.00 degrees is 0.00000000.
pk_taylor_series > ./a 30 10
The sine of 30.00 degrees is 0.50000000.
pk_taylor_series > ./a 45 10
The sine of 45.00 degrees is 0.70710678.
pk_taylor_series > ./a 90 10
The sine of 90.00 degrees is 1.00000000.
pk_taylor_series > ./a 180 10
The sine of 180.00 degrees is -0.00000000.
pk_taylor_series > ./a 360 10
The sine of 360.00 degrees is -0.00104818.
pk_taylor_series > ./a 360 100
Number of terms is out of range.
pk_taylor_series > ./a 360 -1
Number of terms is out of range.
pk_taylor_series > 
```

## Floating point instructions I used

These are the floating point instructions I used in my implementation.

* fmov

* scvtf

* fmul

* fdiv

* fadd

## How I broke up the program

I have functions named:

* main

* HandleOptions

* Factorial

* IntegerPower - x to the nth power

* ComputeSine - The main calculation

* PrintAnswer

* ConvertTheta - Wrap D2R

* D2R - Degrees to radians

## CSC3510

The following applies to Carthage College CSC3510 students.

### Work rules

Work is to be done solo.

### What to hand in

Just the .S file. **Your name must be at the top of the file.**
