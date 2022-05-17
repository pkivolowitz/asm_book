# ARM V8 Assembly Language Programming Made Not So Scary

This text book provides a fairly thorough examination of the ARM V8 ISA. It begins from the perspective of
a person knowledgeable in the C or C++ programming languages (or similar languages, of which there are many).
Early chapters bridge your knowledge of C or C++ backwards into assembly language driving home a very sharp
point: C is a high level assembly language. Further, assembly language is nothing to be scared about.

## For Whom Is This Book Intended?

As mentioned, if you are already familiar with C or any language descended from C, this book begins with what
you know. Later chapters dive deeply into the corners and recesses of the ARM V8 ISA and are suitable for
those wishing to master the rich instruction set of the 64 bit ARM processors.

## Can This Book Be Used In Courses Covering Assembly Language?

Yes, absolutely. In fact, we would argue that the study of assembly language is extremely important to the
building of competent software engineers. Further, we would argue that teaching the x86 instruction set is
sadistic and cruel as that ISA was born in the 1970s and has simply gotten more muddled with age. 

The MIPS
instruction set is another ISA that is often covered in College level courses. While far kinder and gentler
than the x86 ISA, the MIPS processor isn't nearly as relevant as the ARM family. Phones, tablets, laptops and
even desktops contain ARM V8 processors making the study of the ARM ISA far more topical.

## Calling Convention Used In This Book

Assembly language programming is quite closely intertwined with both the underlying hardware architecture and
operating system. A "calling convention" refers to how functions are called and how parameters are passed. In
this book we will use the ARM LINUX conventions. This means:

* You will need to run a ARM Linux VM on the Macintosh - even on ARM-based Macs. Why? Apple. That's why.
* You will need to run WSL (Windows Subsystem for Linux) on ARM-based Windows machines.
* You will need to run an ARM Linux VM on x86-based Windows machines.

## Section 1 - Bridging from C / C++ to Assembly Language

| Chapter | Content |
| ------- | ------- |
| 1 | [Hello World](./section_1/hello_world/README.md) |

## Section 2 - Stuff

## Section 3 - More Stuff

## About The Author

Perry Kivolowitz's career in the Computer Sciences spans just under five decades. He launched more than 5 companies, mostly relating to hardware, image processing and visual effects (for motion pictures and television). Perry received Emmy recognition for his work on the The Gathering, the pilot episode of Babylon 5. Later he received the Emmy Award for Engineering along with his colleagues at SilhouetteFX, LLC. Also, Perry received and Academy Award for Scientific and Technical Achievement for his invention of Shape Driven Warping and Morphing.
