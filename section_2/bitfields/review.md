# Section 2 / Bit Fields / Review of Newly Described Instructions

## Overview

Our discussion of implementing ourselves what the C / C++ compiler gives us
led us to use six new instructions. This chapter reviews those instructions.

## `and`

The `and` instruction is pretty much what you would expect. It implements
the `&` operator from C and C++. That is, the bitwise and operator.

The `and` instruction comes in a number of flavors

### `and` Immediate

This is the form of the instruction we used.

```asm
    and    rd, rs, imm
```

This performs a bitwise and of the `imm` value with the source register
`rs` placing the result in the destination register `rd`.

There are limits to the bit width of `imm` because it has to fit within
the `and` instruction. If you exceed the allowable width of `imm`, the
assembler will be glad to insult you.

It is possible that a `mov`
instruction will allow your immediate value. You'd follow up with an
`and` using a register than an immediate value.

If your immediate value is too large for a `mov` then put the value
in RAM and `ldr` it into a register and proceed.

We would love to tell you what the rules are for an immediate value in
the `and` instruction, but they are not obvious and in fact are very
complex. Our advice, try the immediate value you have in mind and if
it works, great. Otherwise, see above.

A slight variation on this `and` instruction uses a register where
the preceding one uses an immediate value.

```asm
    and    rd, rs, rm
```

This ands `rm` to `rs` and places the result in `rd`.

This instruction has a variation:

```asm
    and    rd, rs, rm, *shift* num_bits
```

`*shift*` can be one of `lsl`, `lsr`, `asr` or `ror`.

These mean:

| `*shift*` | Meaning | Meaning of the Meaning |
| --------- | ------- | ---------------------- |
| `lsl` | logical shift left | shifts left introducing zeros on the right |
| `lsr` | logical shift right | shifts right introducing zeros on the left |
| `asr` | arithmetic shift right | shifts right introducing duplicates of the previous most significant bit |
| `ror` | rotate right | shifts right introducing the bits shifted out back in from the left |

There are other two similar `and` instructions. These are the immediate and
the register versions of `ands`. `ands` is the same as `and` with the addition
that the CPU's condition bits are updated by the instruction permitting a
conditional branch to follow the instruction.

## `bfi`

This instruction mnemonic stands for Bit Field Insert. The word *Insert* should
really be copy. The official ARM [documentation](https://developer.arm.com/documentation/dui0801/g/A64-General-Instructions/BFI) explains this instruction
very well so we'll repeat it here:

*Bit Field Insert copies any number of low-order bits from a source register into the same number of adjacent bits at any position in the destination register, leaving other bits unchanged.*

The instruction has the following format:

```asm
    bfi    rd, rs, lsb, width
```

Starting at bit 0 of `rs`, `width` bits are copied to `rd` starting at bit
`lsb`.

The `bfi` instruction replaces as many as three instructions: likely a shift,
an `and` and an `orr`.

## `mvn`

This instruction takes only takes two operands (but permits an optional shift
to be explained below).

The basic syntax is:

```asm
    mvn    rd, rs
```

This flips all the bits in the source and copies them to the destination.

In addition to the basic instruction, there is also:

```asm
    mvn    rd, rs, *shift* num_bits
```

The *shift* and `num_bits` function the same way as described above including
the option to use `*shift*` as one of `lsl`, `lsr`, `asr` or `ror`.

## `lsl`

## `orr`

## `ubfiz`
