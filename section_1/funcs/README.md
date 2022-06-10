# Section 1 / Chapter 5 / Calling and Returning From Functions

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

## Returning Values

LEFT OFF HERE
