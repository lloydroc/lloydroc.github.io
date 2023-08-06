---
layout: post
title: Stack Protection with a Canary
date: 2021-06-11
comments: true
categories:
 - c
tags:
 - arm
 - assembly
---

# {{< title >}}

Buffer overflows can be detected by inserting a *canary* into a function. These canaries are inserted when a function's stack frame is created. Before a function's return we check for the canary on the stack frame. If the canary isn't found then buffer overflow or *stack smashing* is detected.

# Example

Let's first create a deliberate buffer overflow. Then we can see how it behaves with and without stack protection.

This example is very simple as it just writes beyond the local variables allocated on the stack frame. Please use your imagination on this example not being a real-world exploitable buffer overflow. These real-world scenarios are typically exploited by users adding more input than expected to the program. We just go four bytes beyond the memory we've been allocated.

{{< highlight c >}}
// file stack_smash.c
int
stack_smasher()
{
  int x[2];

  x[0] = 0;
  x[1] = 1;
  x[2] = 2; // buffer overflow here!

  return x[0] + x[1];
}

int
main(int argc, char *argv[])
{
  int x;

  x = stack_smasher();

  return x;
}
{{< / highlight >}}

Here we can see the `stack_smasher` function will write one integer past the allocated size of the array `x` on the stack causing a buffer overflow. As you'll see this doesn't actually cause any harm. Later, we'll observe this overflow being detected by stack protection.

# Compilation without Stack Protection

Let's compile this code without stack protection. Both lines are equivalent, with the second turning off stack protection. I turned off the optimization so it's easier to follow the disassembled code.

{{< highlight bash >}}
$ gcc -O0 -o stack_smash stack_smash.c
$ gcc -O0 -fno-stack-protector -o stack_smash stack_smash.c
{{< / highlight >}}

Now let's run this code and see what it does.

{{< highlight bash >}}
$ ./stack_smash # it runs fine!
{{< / highlight >}}

# ARM Assembly of our Stack Smasher Program

Without going to deep into the ARM assembler code, I'll highlight were the issue is and just illustrate there is no stack protection going on. 

{{< highlight asm "linenos=table,hl_lines=12-13">}}
$ gdb stack_smash
...
(gdb) disassemble stack_smasher
Dump of assembler code for function stack_smasher:
   0x000103d0 <+0>:     push {r11}		; (str r11, [sp, #-4]!)
   0x000103d4 <+4>:	    add	r11, sp, #0
   0x000103d8 <+8>:     sub sp, sp, #12
   0x000103dc <+12>:	mov	r3, #0
   0x000103e0 <+16>:	str	r3, [r11, #-12]
   0x000103e4 <+20>:	mov	r3, #1
   0x000103e8 <+24>:	str	r3, [r11, #-8]
   0x000103ec <+28>:	mov	r3, #2
   0x000103f0 <+32>:	str	r3, [r11, #-4]
   0x000103f4 <+36>:	ldr	r2, [r11, #-12]
   0x000103f8 <+40>:	ldr	r3, [r11, #-8]
   0x000103fc <+44>:	add	r2, r2, r3
   0x00010400 <+48>:	ldr	r3, [r11, #-4]
   0x00010404 <+52>:	add	r3, r2, r3
   0x00010408 <+56>:	mov	r0, r3
   0x0001040c <+60>:	add	sp, r11, #0
   0x00010410 <+64>:	pop	{r11}		; (ldr r11, [sp], #4)
   0x00010414 <+68>:	bx	lr
End of assembler dump.
(gdb)
{{< / highlight >}}

We can see on highlighted line that the `str r3, [r11, #-4]` writes onto the frame pointer exactly since `r11=fp`.

### Example Stack Frame

Let's just construe an example where the stack is 64 bytes and we just allocated a frame for `stack_smash`. Below shows where the `fp` is pointing and the `sp` is. We can see that where `x[2]` is an extra space on the stack.

```
fp -> 60 < +0>: fp
      56 < -4>: x[2] = 2; nothing here anyways
      52 < -8>: x[1] = 1
sp -> 48 <-12>: x[0] = 0
```

# Adding Stack Protection

We can now recompile our function with stack protection.

{{< highlight bash >}}
$ gcc -O0 -fstack-protector-all -o stack_smash stack_smash.c
{{< / highlight >}}

Now let's run it and see what happens.

{{< highlight bash >}}
$ ./stack_smash
*** stack smashing detected ***: <unknown> terminated
[1]    2464 abort      ./stack_smash
{{< / highlight >}}

Here we see that it was detected. Let's look at the assembly that was created.

{{< highlight asm "linenos=table,hl_lines=8-10 15-16 25-26 29">}}
$ gdb stack_smash
...
(gdb) disassemble stack_smasher
Dump of assembler code for function stack_smasher:
   0x00010474 <+0>:     push {r11, lr}
   0x00010478 <+4>:     add	r11, sp, #4
   0x0001047c <+8>:     sub	sp, sp, #16
   0x00010480 <+12>:	ldr	r3, [pc, #76]	; 0x104d4 <stack_smasher+96>
   0x00010484 <+16>:	ldr	r3, [r3]
   0x00010488 <+20>:	str	r3, [r11, #-8]    ; canary is put here
   0x0001048c <+24>:	mov	r3, #0
   0x00010490 <+28>:	str	r3, [r11, #-16]
   0x00010494 <+32>:	mov	r3, #1
   0x00010498 <+36>:	str	r3, [r11, #-12]
   0x0001049c <+40>:	mov	r3, #2
   0x000104a0 <+44>:	str	r3, [r11, #-8]
   0x000104a4 <+48>:	ldr	r2, [r11, #-16]
   0x000104a8 <+52>:	ldr	r3, [r11, #-12]
   0x000104ac <+56>:	add	r3, r2, r3
   0x000104b0 <+60>:	mov	r0, r3
   0x000104b4 <+64>:	ldr	r3, [pc, #24]	; 0x104d4 <stack_smasher+96>
   0x000104b8 <+68>:	ldr	r2, [r11, #-8]
   0x000104bc <+72>:	ldr	r3, [r3]
   0x000104c0 <+76>:	cmp	r2, r3
   0x000104c4 <+80>:	beq	0x104cc <stack_smasher+88>
   0x000104c8 <+84>:	bl	0x10354 <__stack_chk_fail@plt>
   0x000104cc <+88>:	sub	sp, r11, #4
   0x000104d0 <+92>:	pop	{r11, pc}
   0x000104d4 <+96>:	andeq	r0, r2, r8, lsl #30
End of assembler dump.
{{< / highlight >}}

The lines highlighted show the canary inserted on the stack frame and checked that the same value is on the stack frame before the function exists. If the values different we'll branch to the `__stack_chk_fail` in the Procedure Linkage Table.

```
      0x64 < +8>: <prev lr>
fp -> 60 < +4>: fp
      56 < -0>: lr
      52 < -4>:
      48 < -8>: canary is overwritten by x[2] = 2
      44 <-12>: x[1] = 1
sp -> 40 <-16>: x[0] = 0
```

## The value of the Canary

The value of the canary needs to be carefully considered as you could easily guess the value on the stack frame and write it back. I'll admit I don't fully understand the double redirection going on here:

{{< highlight asm >}}
ldr	r3, [pc, #76]
ldr	r3, [r3]
{{< / highlight >}}

Where the address `[pc #76]` contains `andeq r0, r2, r8, lsl #30`. It seems as this will pick an address in the `.text` section of the program for the value.

It's still unclear to me however if a malicious program could get access to the frame pointer, or stack pointer and read this canary value before the buffer overflow attack and write it back before returning. To this point in the code above we can surely write over the canary, so why could we not read it before and write it back?

# Stack Protection

Obviously, this stack protection adds some additional code, and executing this additional code has some performance overhead. While at the same time we don't need to protect every single function. To this limit `gcc` provides 3 options `-fstack-protector`, `-fstack-protector-all`. Here the `-fstack-protector` option will insert the canary checks when the function's buffer is larger than 8 bytes. Although, when the array `x` larger than 8 bytes I still don't see stack protection with the `-fstack-protector` option. A third option exists `-fstack-protector-strong` which allows us to configure the buffer size.

## Performance

Obviously these checks add some overhead and make the code size larger. This should be considered for each application. It would be nice if there was a way to just protect certain functions that are susceptible to buffer overflow.