---
categories:
 - c
tags:
 - assembly
 - arm
date: "2020-09-25"
title: Disassembly of Recursion in C
---

Let's disassemble a recursive function in C to ARM assembly. We can use the textbook example of a recursive factorial function. We'll play around with optimization levels and touch on Tail Recursion or Tail Calls at the end of the blog post.

## C Code

Below is the C code we'll use to disassemble. This code is a text book function that implements a factorial using recursion.

{{< highlight c >}}
// file: recursion.c

long int
factorial(int n)
{
    if (n>=1)
        return n*factorial(n-1);
    else
        return 1;
}

int
main(int argc, char *argv[])
{
    factorial(3);
    return 0;
}
{{< / highlight >}}


## Disassembly

Below is the corresponding ARM Assembly resulting from the C Factorial function above. This assembly is compiled with `-O0`, so most optimizations are completely disabled. In the first section we deal with the stack frame. See my post [The Stack of Frames in C with ARM Assembly](/post/c/stack-of-frames-arm/). I highlighted the section dealing with the stack frame. This highlighted section will push the frame pointer, and link register (PC value) onto the stack. It will then set the current value of the frame pointer to the top of the frame and the stack pointer to the bottom of the frame. From there it will store and load some values into the stack. At end the `fp` and `pc` will be popped off the stack. I mention this as the stack frame is a large part of a factorial function. Each time we recurse we need to set up a new stack frame. We're using memory on the stack each time we push these registers onto the stack. Visualize the function call executing from line 2-11 each time, then branching on line 12 back to line 2. The stack will grow and grow until we either run out of memory, or 12 falls through. The body of the factorial function is quite simple with only a compare, subtraction and multiplication.

{{< highlight asm "linenos=table,hl_lines=2-7 21-22" >}}
factorial:
	push	{fp, lr}
	add	fp, sp, #4
	sub	sp, sp, #8
	str	r0, [fp, #-8]
	ldr	r3, [fp, #-8]
	cmp	r3, #0
	ble	.L2
	ldr	r3, [fp, #-8]
	sub	r3, r3, #1
	mov	r0, r3
	bl	factorial
	mov	r2, r0
	ldr	r3, [fp, #-8]
	mul	r3, r3, r2
	b	.L3
.L2:
	mov	r3, #1
.L3:
	mov	r0, r3
	sub	sp, fp, #4
	pop	{fp, pc}
{{< / highlight >}}

The argument passed into `factorial` named `n` is stored in the register `r0`, the assembly also loads register `r3` with the same value for a comparison. In the C code we evaluate `if(n>=1)`, whereas, the ARM assembly inverts this logic and tests `if(n<=0)` on line 8. Thus, if `n<=0` we will jump to label `.L1` load the value `1` into `r0` and return.

For the math portion of the factorial in C we have:

{{< highlight c >}}
n*factorial(n-1)
{{< / highlight >}}

This math portion will get converted to the following assembly. Note `r3` contains the C variable `n`:

{{< highlight asm >}}
	sub	r3, r3, #1        ; n = n-1
	mov	r0, r3            ; put n into r0 for factorial call
	bl	factorial         ; recursive call
	mov	r2, r0            ; move result of factorial into r2
	ldr	r3, [fp, #-8]     ; r3 will also contain n that was passed in
	mul	r3, r3, r2        ; multiply n by factorial(n-1)
{{< / highlight >}}

The order of operations are `n-1`, then `factorial(n-1)`, and lastly the multiplication `*`.

## Compiler Optimization of `factorial`

In our original disassembly I left out some annotations. Here are those annotations:

{{< highlight asm >}}
factorial:
> @ args = 0, pretend = 0, frame = 8
> @ frame_needed = 1, uses_anonymous_args = 0
{{< / highlight >}}

Take note of the `@ frame_needed = 1` requires many additional instructions. If we re-compile with `-O3` we'll see the frame is not needed. Also, the code is indeed optimized.

{{< highlight asm >}}
factorial:
	@ args = 0, pretend = 0, frame = 0
	@ frame_needed = 0, uses_anonymous_args = 0
	@ link register save eliminated.
	subs	r3, r0, #0                 ; r3 = r0
	mov	r0, #1                         ; r0 = 1
	bxle	lr                         ; return 1 if r0 is less than 1
.L3:
	mul	r0, r3, r0                     ; r0 <= n*1
	subs	r3, r3, #1                 ; r3 <= n = n -1
	bne	.L3                            ; goto .L3 when n != 0
	bx	lr
{{< / highlight >}}

You can keep following along the ARM instructions and corresponding comments. Each time the function call will multiply `n*(n-1)` and store the result in `r0`. This will be done until `r3` is 0. This code doesn't use a stack frame and is essentially a [Tail Call](https://en.wikipedia.org/wiki/Tail_call) or Tail Recursion.

## Tail Recursion

In many references you'll see Tail Recursion has the last recursive call at the very end. Let's look at any differences in the disassembly.

{{< highlight c >}}
long int
factorial_tail(int n, int acc) {
    if (n==0)
        return acc;
    else
        return factorial_tail(n-1, acc*n);
}
{{< / highlight >}}

Where we can call this function with `long r = factorial_tail(n, 1)`.

### Disassembly of the `factorial_tail` function

{{< highlight asm>}}
factorial_tail:
	@ args = 0, pretend = 0, frame = 0
	@ frame_needed = 0, uses_anonymous_args = 0
	@ link register save eliminated.
	cmp	r0, #0
	beq	.L12
.L9:
	mul	r1, r0, r1
	subs	r0, r0, #1
	bne	.L9
.L12:
	mov	r0, r1
	bx	lr
{{< / highlight >}}

Indeed the stack frame code is removed, however, it's not much more optimized than our `factorial(int n)` function. They both have 7 instructions.

Now I can ask the question is Tail Recursion more efficient than a standard Factorial call compiled with `-03` or greater? Leave your answer in the comments below!
