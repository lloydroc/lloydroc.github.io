---
categories:
 - c
tags:
 - assembly
 - arm
date: "2020-03-27"
title: Converting C Conditionals to ARM Assembly
---

In this post we can explore how to the `gcc` compiler converts to C to ARM assembly language. We'll specifically look at *conditional logic*. We'll look at examples of `if` statements, `if` statements with `else if` and `else`, then end with a `switch` statement. To convert C to ARM assembly we will use the `-S` flag on GCC. All these examples were done on a Rapsberry Pi running Raspbian.

## Converting an if statement from C to Assembly

As simple as it can get. Here we have a 32-bit ARM Architecture making an `int` 32-bits and the register width is also `32-bits`. Let's create a simple `if` conditional statement in C and we'll convert it to assembly.

{{< highlight c >}}
// file if.c
int
main(int argc, char *argv[])
{
  int a,b,x;

  a = 1;
  b = 2;
  x = 3;

  if(a == b)
  {
    x = 4;
  }

  return x;
}
{{< / highlight >}}

## Pseudo Logic of if statement in assembly

When we have following conditional logic in C:

{{< highlight c >}}
if ( a == b )
  x = 4;
{{< / highlight >}}

It will have the following pseudo logic in assembly. Hopefully you follow this strange mix of assembly and logic I created on the fly.

{{< highlight asm >}}
  cmp r2, r3 ; r2 = value of a, r3 = value of b
  bne BEYONDIF ; the branch is the oppostite of ==
  mov r3, #4   ; the statements inside the if when true
  str r3, [address of x] ; put 4 into x
BEYONDIF:
{{< / highlight >}}

The `BEYONDIF` label represents code outside the `if` statement and allows us to jump out when the if condition doesn't hold.

## ARM Assembly of our if statement

Below is the ARM assembly from the C code above. We want to focus on where the variables are set, and especially where we have the `if` statements and variable `a` is compared to variable `b`. This is done by simply running `gcc -O0 -Wall -S if.c`. The `-O0` is crucial since it's turns optimization off. However, to the trained eye you can spot some places the ARM assembly code is not optimal.

When looking at the assembly the stack pointer and frame pointer are a large part of any program. Hopefully, in another post I'll go over the stack and frame in detail. Divert your eyes and try to focus on the meat of the `main` C function, which is the conditional logic we created. This starts on line 10 of the assembly.

{{< highlight asm "linenos=true" >}}
main:
	@ args = 0, pretend = 0, frame = 24
	@ frame_needed = 1, uses_anonymous_args = 0
	@ link register save eliminated.
	str	fp, [sp, #-4]!     ; save the frame pointer 4 bytes below sp
	add	fp, sp, #0         ; make the stack pointer = the frame pointer
	sub	sp, sp, #28        ; drop the stack pointer down by 28 bytes
	str	r0, [fp, #-24]     ; argc argument from main
	str	r1, [fp, #-28]     ; argv argument from main
	mov	r3, #1             ; variable a=1
	str	r3, [fp, #-12]     ; store a in frame
	mov	r3, #2             ; variable b=2
	str	r3, [fp, #-16]     ; store b in frame
	mov	r3, #3             ; variable x=3
	str	r3, [fp, #-8]      ; store x in frame
	ldr	r2, [fp, #-12]     ; put a into r2
	ldr	r3, [fp, #-16]     ; put b into r3
	cmp	r2, r3             ; if(a == b)
	bne	.L2                ; skip over, notice we do opposite of ==
	mov	r3, #4             ; x = 4 if a == b
	str	r3, [fp, #-8]      ; store x in the frame
.L2:                       ; a label created for our if
	ldr	r3, [fp, #-8]      ; load x into r3
	mov	r0, r3             ; r0 stores the return value x from main
	add	sp, fp, #0         ; restore our stack pointer
	@ sp needed
	ldr	fp, [sp], #4
	bx	lr
	.size	main, .-main
	.ident	"GCC: (Raspbian 8.3.0-6+rpi1) 8.3.0"
	.section	.note.GNU-stack,"",%progbits
{{< / highlight >}}

# Converting an if statement with if-else and else from C to Assembly

Alright, now let's do a little more with an `if` and add two `if-else` blocks, as well as, an `else` condition.

{{< highlight c >}}
// file: ifelse.c
int
main(int argc, char *argv[])
{
  int a,b,x;

  a = 1;
  b = 2;
  x = 3;

  if(a == b)
  {
    x = 4;
  }
  else if(a > b)
  {
    x = 5;
  }
  else if (a < b)
  {
    x = 6;
  }
  else
  {
    x = 7;
  }

  return x;
}
{{< / highlight >}}

## Pseudo Logic of if statement in assembly

When we have the following conditional logic in C:

{{< highlight c >}}
if ( a == b )
  x = 4;
else if (a > b)
  x = 5;
else if (a < b)
  x = 6;
else
  x = 7;
{{< / highlight >}}

It will have the following pseudo logic in assembly.

{{< highlight asm >}}
AEQB: ; if (a == b)
  cmp a, b
  bne AGTB ; the branch is the opposite of ==
  str 4, [address of x]
  b GETOUT
AGTB: ; if (a > b)
  cmp a, b
  ble ALTB
  str 5, [address of x]
  b GETOUT
ALTB: ; if (a < b)
  cmp a, b
  bgt ELSE
  str 6, [address of x]
  b GETOUT
ELSE: ; else statement
  str 7, [address of x]d
GETOUT:
{{< / highlight >}}

The `GETOUT` label represents code outside the `if` statement, after the `else`.

## Assembly of if statement with else-if and if from our C Example

Now let's see what an `if` looks like in ARM assembly when we have two `else if` blocks and an `else` statement.

{{< highlight asm "linenos=true" >}}
main:
	@ args = 0, pretend = 0, frame = 24
	@ frame_needed = 1, uses_anonymous_args = 0
	@ link register save eliminated.
	str	fp, [sp, #-4]!
	add	fp, sp, #0
	sub	sp, sp, #28
	str	r0, [fp, #-24]
	str	r1, [fp, #-28]
	mov	r3, #1         ; load 1 into register r3
	str	r3, [fp, #-12] ; variable a of value 1 is here
	mov	r3, #2         ; load 2 into register r3
	str	r3, [fp, #-16] ; variable b of value 2 is here
	mov	r3, #3         ; load 3 into register r3
	str	r3, [fp, #-8]  ; variable x of value 3 is here
	ldr	r2, [fp, #-12] ; load variable a into r2
	ldr	r3, [fp, #-16] ; load variable b into r3
	cmp	r2, r3         ; compare a to b
	bne	.L2            ; opposite of ==, if they are not equal
	mov	r3, #4         ; load 4 into register r3
	str	r3, [fp, #-8]  ; put value 4 into our variable x
	b	.L3            ; label .L3 is where our main returns
.L2:                   ; our else if (a > b)
	ldr	r2, [fp, #-12] ; load variable a into r2
	ldr	r3, [fp, #-16] ; load variable b into r3
	cmp	r2, r3         ; comare a to b
	ble	.L4            ; if >=, note: oppostite of >
	mov	r3, #5         ; load 5 into r3
	str	r3, [fp, #-8]  ; store 5 into variable x
	b	.L3            ; jump out of full else block
.L4:                   ; our else if (a < b)
	ldr	r2, [fp, #-12] ; put variable a into register r2
	ldr	r3, [fp, #-16] ; put variable b into register r3
	cmp	r2, r3         ; compare a to b
	bge	.L5            ; go to else statement if >=, opposite of <
	mov	r3, #6         ; put 6 into register r3
	str	r3, [fp, #-8]  ; store 6 into variable x
	b	.L3            ; branch label L3 where we return from main
.L5:                   ; label L5 is our else block in the c
	mov	r3, #7         ; move 7 into r3
	str	r3, [fp, #-8]  ; put 7 into variable x
.L3:
	ldr	r3, [fp, #-8]  ; load variable x into r3
	mov	r0, r3         ; put x into r0 which is what main returns
	add	sp, fp, #0
	@ sp needed
	ldr	fp, [sp], #4
	bx	lr
{{< / highlight >}}

# Converting a switch statement in C to assembly

Now that we've seen how `if` statements convert from C to assembly, let's look at the `switch` statement in C.

{{< highlight c >}}
// file: switch.c
int
main(int argc, char *argv[])
{
  int x,y;

  x = 1;

  switch(x)
  {
    case 0:
      y = 10;
      break;
    case 1:
      y = 11;
      break;
    default:
      y = 13;
  }

  return y;
}
{{< / highlight >}}

## Pseudo Code of the switch statement in Assembly

If we have the following C `switch` statement:

{{< highlight c >}}
switch(x)
{
  case 0:
    y = 10;
    break;
  case 1:
    y = 11;
  default:
    y = 13;
}
{{< / highlight >}}

This is the equivalent to this in C:

{{< highlight c >}}
if ( x == 0)
  y = 10;
if ( x == 1)
  y = 11;
else
  y = 13;
{{< / highlight >}}

From here our "pseudo-assembly" would be:

{{< highlight asm >}}
cmp a,#0
beq CASE0
cmp a,#1
beq CASE1
b DEFAULT
CASE1:
  str 10, [address of y]
  b OUTSIDECASE
CASE2:
  str 11, [address of y]
  b OUTSIDECASE
DEFAULT:
  str 11, [address of y]
OUTSIDECASE:
{{< / highlight >}}

## Assembly Language of a C switch statement

Let's look now how a `switch` statement in C is converted to assembly language.

{{< highlight asm "linenos=true" >}}
main:
	@ args = 0, pretend = 0, frame = 16
	@ frame_needed = 1, uses_anonymous_args = 0
	@ link register save eliminated.
	str	fp, [sp, #-4]!
	add	fp, sp, #0
	sub	sp, sp, #20
	str	r0, [fp, #-16]
	str	r1, [fp, #-20]
	mov	r3, #1
	str	r3, [fp, #-12] ; put 1 into x
	ldr	r3, [fp, #-12]
	cmp	r3, #0         ; compare x to 0
	beq	.L2            ; L2 is case block for 0
	ldr	r3, [fp, #-12]
	cmp	r3, #1         ; compare x to 1
	beq	.L3            ; L3 is the case block for 1
	b	.L7            ; L7 is the default case
.L2:                   ; L2 is case 0 block we set y = 10
	mov	r3, #10
	str	r3, [fp, #-8]
	b	.L5
.L3:                   ; L3 is the case 1 block we set y = 11
	mov	r3, #11
	str	r3, [fp, #-8]
	b	.L5
.L7:                   ; L7 is the default block we set y = 13
	mov	r3, #13
	str	r3, [fp, #-8]
.L5:                  ; L5 is the label outside our case statement
	ldr	r3, [fp, #-8]
	mov	r0, r3
	add	sp, fp, #0
	@ sp needed
	ldr	fp, [sp], #4
	bx	lr
{{< / highlight >}}
