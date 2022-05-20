# Section 1 / Chapter 7 / Calling and Returning From Functions

Calling functions, passing parameters to them and receiving back return values is basic to using `C` and and `C++`. Calling methods (which are functions connected to classes) is similar but with enough differences to warrant its own discussion to be provided later in the chapter on [structs](../struct/structs.md).

## Bottom Line Concept

The name of a (non-inline) function is a label to which a branch with link ('bl') can be made. 

The `bl` instruction is stands for **B**ranch with **L**ink. The **link** concept is what enables a function (or method) to **return** to the instruction after the function call.

*Note: this chapter is only a first pass at functions and parameter passing. To fully explore functions and methods, additional knowledge is required.*

## A Trivial Function

In `C`, here is a trivial function:

```c
void func() {
}
```

The function `func()` takes no parameters, does nothing and returns nothing.

Here it is in assembly language:

```asm
func: ret
```

Notice that `func` is a label. The only instruction in the function is `ret`. Strictly speaking, the assembly language function might more explicitly look like this in `C`:

```c
void func() {
	return;
}
```

To call this function in `C` you would do this:

```c
func();
```

This would be done this way in assembly language:

```asm
bl func
```

Notice that calling a function **is** a branch. But it is a special branch instruction - *branch with link*. It is the *link* that allows the function to `ret`urn.

## Passing Parameters

Up to 8 parameters can be passed directly via registers. Each parameter can be up to the size of an address, long or double (8 bytes). If you need to pass more than 8 parameters or you need to pass parameters which are larger than 8 bytes or are `structs`, you would use a different technique described later.

For the purposes of the present discussion, we assume all parameters are `long int` and are therefore stored in `x` registers.

Up to 8 parameters are passed in the scratch registers (of which there are 8). These are `x0` through `x7`. *Scratch* means the value of the register can be changed at will without any need to backup or restore their values. This also means that you cannot count on the contents of the scratch registers maintaining their value if your function makes any function calls itself.

For example:

```c
long func(long p1, long p2)                                             // 1 
{                                                                       // 2 
    return p1 + p2;                                                     // 3 
}                                                                       // 4 
```

is implemented as:

```asm
func:   add x0, x0, x1                                                  // 1 
        ret                                                             // 2 
```

The first parameter (`p1`) goes in the first scratch register (`x0`). It's an `x` because the parameter's type is `long int`. It is the `0` register, because that is the first scratch register.

The second parameter (`p2`) goes in the second scratch register (the `1` register) because it is the second argument, and so on.

`Line 1` of the assembly language provides the label `func` to which a `bl` can be made.

`Line 1` also provides the full body of the function - the third argument to `add` is added to the second and the result is put in the first. Thus it is: `x0 = x0 + x1`.

Just as scratch registers are used for passing (up to 8) parameters, the `0` register is used for function returns.
In the case of the current code, the result of the addition is already sitting in `x0` so all we do is `ret` on `Line 2`.

## Passing Pointers

A pointer is an address. The word *pointer* is scary. The words *address of* are not as scary. They mean **exactly** the same thing.

Here is a function which *also* adds two parameters together but this time using pointers to `long int` rather than the values themselves.

```c
void func(long * p1, long * p2)                                         // 1 
{                                                                       // 2 
    *p1 = *p1 + *p2;                                                    // 3 
}                                                                       // 4 
```

`Line 1` passes the *address of* `p1` and `p2` as parameters. That is, the addresses of `p1` and `p2` are passed in registers `x0` and `x1` rather than their contents. The contents of the underlying
longs still reside in memory. That is:

* The address of `p1` arrives in `x0`.
* The value of `p1` is found in memory at the address specified by the parameter.

`Line 3` *dereferences* the addresses to fetch their underlying values.
The values are added together and the result overwrites the value pointed to by `p1`.

Here it is in assembly language:

```asm
func:   ldr x2, [x0]                                                    // 1 
        ldr x3, [x1]                                                    // 2 
        add x2, x2, x3                                                  // 3 
        str x2, [x0]                                                    // 4 
        ret                                                             // 5 
```

The `add` instruction cannot operate on values in memory. With little exception, all the *action* takes place in registers, not memory. Therefore, the underlying values pointed to by the parameters must be fetched from memory.

`Line 1` provides the label to which `bl` can branch with link.

Remember that up to the first 8 parameters are passed in the 8 scratch registers. Thus, the address of `p1` and the address of `p2` are stored in `x0` and `x1` respectively. `0` and `1` because these are the first two parameters. The
`x` form of the `0` and `1` registers are used because the parameters' type is an address.

* Addresses (pointers) to any type are 64 bits wide and therefore must use `x` registers.
* `long` and `unsigned long` integers are 64 bits wide and ...
* `double` floats are 64 bits wide and ...

`Line 1` also dereferences the address held in `x0` going out to memory and loading (`ldr`) the value found there into `x2`, another scratch register. It's scratch so it doesn't need backing up and restoring.

`Line 2` does the same for `p2`, putting its value in `x3`.

Why didn't we reuse `x0` and `x1` as in:

```asm
   ldr   x0, [x0]
   ldr   x1, [x1]
```

Doing so would be legal but would end in tears. Doing so would blow away the address of `p1` (and `p2` too
but this doesn't matter). Destroying the address of `p1` would prevent us from copying the result of the
addition back into memory since the address to which we would want to store the result of the addition 
would be gone. Can't have that.

So, as the smart *human*, we decided to use `x2` and `x3` because, well, they're scratch.

`Line 3` performs the addition.

`Line 4` stored the value in `x2` at the address in memory still sitting in `x0`.

### `const`

Suppose we had:

```c++
long func(const long p1, const long p2)                                 // 1 
{                                                                       // 2 
    return p1 + p2;                                                     // 3 
}                                                                       // 4 
```

how would the assembly language change?

Answer: no change at all!

`const` is an instruction to the compiler ordering it to prohibit changing the values of `p1` and `p2`. We're smart humans and realize that our assembly language makes no attempt to change `p1` and `p2` so no changes are warranted.

### Passing by Reference

Suppose we had:

```c++
long func(long & p1, long & p2)                                         // 1 
{                                                                       // 2 
    return p1 + p2;                                                     // 3 
}                                                                       // 4 
```

how would the assembly language change?

Answer: no change at all!

Passing by reference is also an instruction to the compiler to treat pointers a little differently - the differences don't show up here so there is no change needed to the assembly language we wrote to handle passing pointers.
