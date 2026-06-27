---
layout: post
title: The Stack of Frames in C with ARM Assembly Example
date: 2020-04-03 08:34:05 -0600
comments: true
categories:
 - c
tags:
 - arm
 - assembly
aliases:
  - /c/arm/2020/04/03/c-arm-stack-frame.html
---

Function calls in the C programming language make heavy use of the stack, also called the call stack. When functions are called they create the so-called stack of frames. Each function call creates a frame, and these frames are allocated on the stack. This stack frame is used to allocate memory for local variables and intermediate values. The stack frame also contains the previous frame pointer and program counter's value to execute from once the frame is popped off the stack. We will disassemble C function calls to understand the stack of frames in ARM assembly.

![Stack of Frames](/assets/jpg/pancake-stack.jpg)

# Animation of C code being Executed on an ARM Processor

The animation below shows the execution of the C function `add(1,2)`. Before the `add` function is called, the caller, has stored the function arguments of `1` into `r0`, and the value `2` into `r1`. When the `add` function returns it will have the value `3` which will be stored in the `r0` register, overwriting the first argument when the function was called.

In three columns we have C Code, corresponding ARM Assembly, and the Stack alongside one another. As the C Code executes we can see the corresponding assembly code. Note, there are typically multiple instructions for one line of C code. The right most diagram shows the stack and what is pushed onto the stack. Watch the diagram for a couple of repetitions and then we'll get into the theory, then explain some details this diagram leaves out.

{{< figure src="/assets/svg/frame.svg" title="Stack of Frames in C and ARM Assembly Animation" >}}

## Details not shown in the Animation

These are some deep details. Feel free to skip to the other example below for another explanation.

As mentioned above, the arguments of the function are in registers `r0` and `r1` before the function is called.

The *frame*, which is 3 words long. These 3 words hold a value for `fp`, `lr` and the local variable `int c`. Depending on the optimization and what is done the frame could be bigger and the arguments to the function `int a`, and `int b` could be stored in the frame. Notice that the `r3` register which is the result of `c = a + b` is stored into the frame.

We make another function call to `some_func`. Because this function call requires a `bl` we have to previously push `lr` onto the stack so that the program counter can be restored. On the `bl some_func` instruction at `0x00010428` the `lr` will have the value `0x0001042c`. This is because the `some_func` function call will end with a `bx lr` as it will push `lr` onto the stack. If we didn't have another function call in `add`, we would have no need to push `lr` onto the stack, and this is in fact what `gcc` will do if there isn't another function call.

Due to the function call `some_func` we are storing the value of `r3` into the frame to protect if `r3` is destroyed. The frame gives us a way to protect what is local to our function when other functions are called since values can be stored outside of registers. We then restore `r3` from the frame into `r0` where the return of the function is stored.

Again, with the function `some_func` another frame is created on the stack by this function call. This frame is then popped off the stack leaving us with the frame of 3 words that `add` has put on the stack.

Before the animation, the caller of `add` executed a `bl add` instruction which would store in the `lr` the instruction right after the C code of `add(1,2)`

## What you need to Know First
To understand how the stack of frames works the following is required knowledge.

* Call Stack: The call stack - generally called the *stack* stores information about active function calls in a program. The stack starts at high memory and goes lower.
* ARM `push/pop` Instructions: These instructions allow us to push registers onto, and pop registers off a full descending stack.
* The `sp` register: The `sp` register stands for **stack pointer** which stores the value of the top of the stack. A `push` will decrement the stack pointer by 1 word or 4 bytes on a 32-bit ARM machine and store the value where the `sp` is pointing to. The `pop` instruction will restore values from the stack into registers and increment the stack pointer.
* The `fp` register. The **frame pointer** register stores the value of the stack just before the function is called. It points to the top of the frame. From the value of the `fp` down to the value of the `sp` is the "frame" that is allocated for the function call. The `fp` register is `r11`.
* The `lr` register. The `lr` stores a value of an instruction for the `pc` to execute from after the function call. When the branch function call is made to call the function the `lr` will be the instruction after the function call. So once the function returns the `pc` can pick up at the instruction directly after the function call is over.
* The `bl/bx` functions: Understanding of the `bl` and `bx` instructions. The `bl` instruction places the return address in the `lr` and sets the `pc` to the address of the subroutine. The `bx` instruction sets the value of the `pc` to the value of the `lr` and starts executing from there.
* Addressing Modes. Understanding of the **offset**, **pre-indexed**, and **post-indexed** addressing mode . Are generally essential, I did the math below so you can connect the dots.
* How registers correspond to Function Calls: Arguments to function calls are passed to registers `r0-r3`, and the return value is placed in `r0`. There are calling conventions for Arm which we won't discuss here.

# Explanation of Another Example in C

Let's look at a full picture with the following example:

{{< highlight c >}}
int   one(int, int);
int   two(int, int);
int three(int, int);

int
main(int argc, char *argv[])
{
  int ia, ib, ic;

  ia = 1;
  ib = 2;
  ic = one(ia, ib);

  return ic;
}

int
one(int a, int b)
{
  int c;
  c = two(a,b);
  return c;
}

int
two(int a, int b)
{
  int c;
  c = three(a,b);
  return c;
}

int
three(int a, int b)
{
  int c;
  c = a+b;
  return c;
}
{{< /highlight >}}

## Description of the Stack of Frames

Let's describe how the stack of frames will look:
* Four Frames will be allocated for functions `main`, `one`, `two` and `three`
* When `main` is called it will have values `argc` and `argv` stored in `r0` and `r1`
* When `main` completes it will have the value of `c` in register `r0`
* The frame for `main` will allocate space for `fp`, `lr`, `int ia`, `int ib` and `int ic` at least. You'll see more space allocated typically around twenty words.
* The functions `one`, `two`, and `three` will have values `int a`, and `int b` stored in `r0` and `r1`
* The functions `one`, `two`, and `three` will have the return value in register `r0`
* The function `three` will not need to preserve the `lr` since it doesn't call any other functions

## Disassembly of the Example

We can disassemble this example to see the instructions using `gdb`. I find the `disassemble` function in `gdb` much better than looking at the `.s` file from `gcc`. This is compiled with `CFLAGS=-O0 -g`. You'll notice with `-O0` that the code can definitely be optimized. This is especially present when arguments to functions are pushed into the frame and pull back without being modified.

I've added numerous comments to see what the `lr`, `fp` and `sp` are doing. You'll probably need a calculator. The best way to do this is to compile the example and run `gdb`. You can then inspect memory  with `p/x *(0x0xbefff4d8)` and `x/20w 0xbefff4d8` for example. The registers can be viewed with `info registers`.

Here is the disassembly:
{{< highlight asm >}}
(gdb) disassemble main
Dump of assembler code for function main:
   0x000103d0 <+0>:	push	{r11, lr}       ; lr=0xbfe84718 r11 at lowest address
   0x000103d4 <+4>:	add	r11, sp, #4         ; r11=fp=0x0
   0x000103d8 <+8>:	sub	sp, sp, #24         ; sp=0xbefff4d8, frame is size 28=24+4
   0x000103dc <+12>:	str	r0, [r11, #-24]	; 0xffffffe8
   0x000103e0 <+16>:	str	r1, [r11, #-28]	; 0xffffffe4
   0x000103e4 <+20>:	mov	r3, #1
   0x000103e8 <+24>:	str	r3, [r11, #-8]
   0x000103ec <+28>:	mov	r3, #2
   0x000103f0 <+32>:	str	r3, [r11, #-12]
   0x000103f4 <+36>:	ldr	r1, [r11, #-12]
   0x000103f8 <+40>:	ldr	r0, [r11, #-8]
   0x000103fc <+44>:	bl	0x10414 <one>    ; here the lr will be set to 0x00010400
   0x00010400 <+48>:	str	r0, [r11, #-16]  ; r0 has the return value from function one
   0x00010404 <+52>:	ldr	r3, [r11, #-16]
   0x00010408 <+56>:	mov	r0, r3           ; r0 will return with the value of int ic
   0x0001040c <+60>:	sub	sp, r11, #4      ; point sp one word above fp
   0x00010410 <+64>:	pop	{r11, pc}        ; pc will be restored to 0xbfe84718
End of assembler dump.
(gdb) disassemble one
Dump of assembler code for function one:
   0x00010414 <+0>:	push	{r11, lr}       ; lr=0x00010400 r11=fp=0xbefff4d0
   0x00010418 <+4>:	add	r11, sp, #4         ; r11=fp=0xbefff4d4
   0x0001041c <+8>:	sub	sp, sp, #16         ; sp=0xbefff4c0 frame is size 20=16+4
   0x00010420 <+12>:	str	r0, [r11, #-16]
   0x00010424 <+16>:	str	r1, [r11, #-20]	; 0xffffffec
   0x00010428 <+20>:	ldr	r1, [r11, #-20]	; 0xffffffec
   0x0001042c <+24>:	ldr	r0, [r11, #-16]
   0x00010430 <+28>:	bl	0x10448 <two>   ; lr will be 0x00010434
   0x00010434 <+32>:	str	r0, [r11, #-8]
   0x00010438 <+36>:	ldr	r3, [r11, #-8]
   0x0001043c <+40>:	mov	r0, r3
   0x00010440 <+44>:	sub	sp, r11, #4     ; point sp one word above fp
   0x00010444 <+48>:	pop	{r11, pc}       ; fp=0xbefff4f4, lr=0x00010400
End of assembler dump.
(gdb) disassemble two
Dump of assembler code for function two:
   0x00010448 <+0>:	push	{r11, lr}       ; lr=0x00010434, r11=fp=0xbefff4d4
   0x0001044c <+4>:	add	r11, sp, #4         ; fp=0xbefff4bc
   0x00010450 <+8>:	sub	sp, sp, #16         ; sp=0xbefff4a8 frame is 20=16+4 words
   0x00010454 <+12>:	str	r0, [r11, #-16]
   0x00010458 <+16>:	str	r1, [r11, #-20]	; 0xffffffec
   0x0001045c <+20>:	ldr	r1, [r11, #-20]	; 0xffffffec
   0x00010460 <+24>:	ldr	r0, [r11, #-16]
   0x00010464 <+28>:	bl	0x1047c <three> ; lr will be set to 0x00010468
   0x00010468 <+32>:	str	r0, [r11, #-8]
   0x0001046c <+36>:	ldr	r3, [r11, #-8]
   0x00010470 <+40>:	mov	r0, r3
   0x00010474 <+44>:	sub	sp, r11, #4
   0x00010478 <+48>:	pop	{r11, pc}
End of assembler dump.
(gdb) disassemble three
Dump of assembler code for function three:
   0x0001047c <+0>:	push	{r11}		; (str r11, [sp, #-4]!) NOTICE no lr!!
   0x00010480 <+4>:	add	r11, sp, #0     ; dont add #4 here since no frp=0xbefff4a4
   0x00010484 <+8>:	sub	sp, sp, #20     ; stack is size 20 sp=0xbfff490
   0x00010488 <+12>:	str	r0, [r11, #-16]
   0x0001048c <+16>:	str	r1, [r11, #-20]	; 0xffffffec
   0x00010490 <+20>:	ldr	r2, [r11, #-16]
   0x00010494 <+24>:	ldr	r3, [r11, #-20]	; 0xffffffec
   0x00010498 <+28>:	add	r3, r2, r3
   0x0001049c <+32>:	str	r3, [r11, #-8]
   0x000104a0 <+36>:	ldr	r3, [r11, #-8]
   0x000104a4 <+40>:	mov	r0, r3
   0x000104a8 <+44>:	add	sp, r11, #0
   0x000104ac <+48>:	pop	{r11}		; (ldr r11, [sp], #4)
   0x000104b0 <+52>:	bx	lr          ; lr=0x10468
End of assembler dump.
(gdb)
{{< /highlight >}}

## The Stack Frame in the Real World

From what I've seen by disassembling functions is that stack frame isn't always necessary and can be optimized out for performance. See this post [Disassembly of Recurision in C](/post/c/arm-assembly-recursion/) where the stack frame is removed by the compiler with optimization.
