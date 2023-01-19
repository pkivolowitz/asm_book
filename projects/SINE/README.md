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

Notice each term is based on the odd integers starting at 1.

## Command line

You are to accept two arguments on the command line. `getopt` is not
being used here to concentrate on the floating point math. Both
arguments are therefore required.

* The angle in degrees whose sine you wish to calculate. Take this to
  be a double.

* The number of terms to evaluate. The number of terms must lie between
  1 and 10 inclusive.

## C version

To assist your efforts, [here](./c_version.c) is a version of this
project written in C.

## Errors to stderr

Error messages must be sent to `stderr`.

If you are using the convergence macros to allow your program to build
on both Apple Silicon Mac OS and Linux, note the special casing needed
to deal with `stderr`. If this is you, compile the C version on Mac OS
with the `-S` compiler option to see the generated assembly language and
search for `stderr`.

## Sample executions

```text
SINE % ./a.out 0 8
The sine of 0.00 degrees is 0.000000 in radians.
SINE % ./a.out 90 8
The sine of 90.00 degrees is 1.000000 in radians.
SINE % ./a.out 180 8
The sine of 180.00 degrees is -0.000001 in radians.
SINE % ./a.out 180 82
Number of terms is out of range.
SINE % ./a.out 180 -10
Number of terms is out of range.
SINE % echo $?
1
```

## CSC3510

The following applies to Carthage College CSC3510 students.

### Work rules

Work is to be done solo.

### What to hand in

Just the .S file. **Your name must be at the top of the file.**

