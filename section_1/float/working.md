# Section 1 / Working with Floating Point Numbers

## Overview

There are four highest level ideas relating to floating point operations on AARCH64.

* There is another complete register rest for floating point values.

* There are alternative instructions just for floating point values.

* There are exotic instructions that operate on sets of floating point values (SIMD).

* There are instructions to go back and forth to and from the integer registers.

## Floating Point Registers

There will be a more detailed discussion of the floating point registers when
exotic instructions such as SIMD are discussed. For now, it is sufficient to discuss
the less exotic aliases of the floating point registers.

We say aliases because, like the integer registers, how you reference a floating
point register determines how it is interpreted. Yet, the different ways you can
refer to floating point register 0 (such as `s0` or `d0`) all share the same
physical register.

MORE TO COME.

## Basic Floating Point Instructions

## Exotic Floating Point Instructions

This section will be a teaser for a more thorough discussion yet to be written.

## Type Conversion Instructions
