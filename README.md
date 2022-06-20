# Assembly Language Programming Made Not So Scary

This text book provides a fairly thorough examination of the ARM V8 ISA (Instruction Set Architecture).
It begins from the perspective of
a person knowledgeable in the C or C++ programming languages (or similar languages, of which there are many).
Early chapters bridge your knowledge of C or C++ backwards into assembly language driving home a very sharp
point: C is a high level assembly language. Further, assembly language is nothing to be scared about.

## For Whom Is This Book Intended?

As mentioned, if you are already familiar with C or any language descended from C, this book begins with what
you know. Later chapters dive deeply into the corners and recesses of the ARM V8 ISA and are suitable for
those wishing to master the rich instruction set of the 64 bit ARM processors.

## Can This Book Be Used In Courses Covering Assembly Language?

Yes, absolutely.

In fact, we would argue that the study of assembly language is extremely important to the
building of competent software engineers. Further, we would argue that teaching the x86 instruction set is sadistic and cruel as that ISA was born in the 1970s and has simply gotten more muddled with age.

The MIPS instruction set is another ISA that is often covered in College level courses. While far kinder and gentler than the x86 ISA, the MIPS processor isn't nearly as relevant as the ARM family. Phones, tablets, laptops and even desktops contain ARM V8 processors making the study of
the ARM ISA far more topical.

## Calling Convention Used In This Book

Assembly language programming is quite closely intertwined with both the underlying hardware architecture and the host
operating system. A "calling convention" refers to how functions are called and how parameters are passed. In
this book we will use the ARM LINUX conventions. This means:

* You will need to run a ARM Linux VM on the Macintosh - even on ARM-based Macs. Why? Apple. That's why.
* You will need to run WSL (Windows Subsystem for Linux) on ARM-based Windows machines.
* You will need to run an ARM Linux VM on x86-based Windows machines.

## A Lot of Names

As commendable as the ARM designs are, ARM's naming conventions for their Intellectual
Properties are horrid. In this book, AARCH64 and ARM V8 are taken to be synonyms for
the 64 bit ARM Instruction Set Architecture (ISA).

## Section 1 - Bridging from C / C++ to Assembly Language

| Chapter | Content |
| ------- | ------- |
| 1 | [Hello World](./section_1/hello_world/README.md) |
| 2 | [If Statements](./section_1/if/README.md) |
| 3 | Loops |
| .... a | [.... While Loops](./section_1/while/README.md) |
| .... b | [.... For Loops](./section_1/for/README.md) |
| .... c | [.... Implementing Continue](./section_1/for/README.md#implementing-a-continue)
| .... d | [.... Implementing Break](./section_1/for/README.md#implementing-a-break)
| 4 | Interludes |
| .... a | [.... Registers](./section_1/regs/README.md) |
| .... b | [.... Load and Store](./section_1/regs/ldr.md) |
| .... c | [.... More About `ldr`](./section_1/regs/ldr2.md) |
| 5 | Functions |
| .... a | [.... Calling and Returning](./section_1/funcs/README.md) |
| .... b | [.... Passing Parameters](./section_1/funcs/README2.md) |
| 6 | [FizzBuzz - a Complete Program](./section_1/fizzbuzz/README.md) |
| 7 | Structs |
| .... a | [.... Alignment](./section_1/structs/alignment.md) |
| .... b | [.... Defining](./section_1/structs/defining.md) |
| .... c | [.... Using](./section_1/structs/using.md) |
|  8 | [`const`](./section_1/const/README.md)
|  9 | [Casting](./section_1/casting/README.md) |
| 10 | Floating Point |
| .... a | [ .... What Are Floating Point Numbers? ](./section_1/float/what.md)


## Section 2 - Bit Manipulation

| Chapter | Content |
| ------- | ------- |
| 11 | Bit Fields |
| .... a | [.... Without Bit Fields](./section_2/bitfields/README.md) |
| .... b | [.... With Bit Fields](./section_2/bitfields/with.md) |
| .... c | [.... Review of Newly Described Instructions](./section_2/bitfields/review.md)

## Section 3 - More Stuff

## Projects

[Here](./projects/README.md) are some project specifications to offer a challenge to your growing mastery.

## About The Author

Perry Kivolowitz's career in the Computer Sciences spans just under five decades. He launched more than 5 companies, mostly relating to hardware, image processing and visual effects (for motion pictures and television). Perry received Emmy recognition for his work on the The Gathering, the pilot episode of Babylon 5. Later he received the Emmy Award for Engineering along with his colleagues at SilhouetteFX, LLC. Also, Perry received and Academy Award for Scientific and Technical Achievement for his invention of Shape Driven Warping and Morphing.
