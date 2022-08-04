---
title: "Understanding memory reallocation with realloc"
date: 2022-08-03
draft: false
---

# {{< title >}}

Let's better understand how memory is allocated, then reallocated on the heap. When we allocate blocks of memory they are stacked on top of the heap with increasing memory addresses. What happens when we reallocate a memory block to make it larger when it's isn't the last item on the heap?

# Heap Example
Let's construe an example using [malloc(3)](https://man7.org/linux/man-pages/man3/malloc.3.html) and [realloc(3p)](https://man7.org/linux/man-pages/man3/realloc.3p.html). Here is how it goes down:

1. Start with an empty heap
2. Allocate `memblock1` of 64-bytes as the first memory on the heap
3. Allocate `memblock2` of 64-bytes which goes on top of `memblock1`
4. Re-Allocate `memblock1` making is 128-bytes (64-bytes larger) which will free its original location and create a new memory location on top of `memblock2`
5. Allocate `memblock3` of 64-bytes which will take the block that `memblock1` originally occupied at the beginning of the heap

Here is an animation representing the steps above.
{{< figure src="/assets/svg/realloc-animation.svg" title="Realloc in action on the heap">}}

# Code Example

From the steps we have above we can write some c code to confirm our understanding using the [assert(3)](https://man7.org/linux/man-pages/man3/assert.3.html) statements.

{{< highlight c >}}
#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

char *memblock1, *memblock2, *memblock3;
const char *fmt = "memblock1=%p, memblock2=%p, memblock1_orig=%p\n";

int
main(int argc, char *argv[])
{
  char  *memblock1_orig;

  memblock1 = malloc(64);
  memblock2 = malloc(64);

  memset(memblock1, 1, 64);
  memset(memblock2, 2, 64);

  memblock1_orig = memblock1;
  memblock1 = realloc(memblock1, 128);

  assert(memblock1 != memblock1_orig);
  printf(fmt, memblock1, memblock2, memblock1_orig);

  for(int i=0;i<64;i++)
  {
    assert(memblock1[i] == 1);
    assert(memblock2[i] == 2);
  }

  memblock3 = malloc(64);
  assert(memblock3 == memblock1_orig);
  printf("memblock3=%p", memblock3);

  return 0;
}
{{< / highlight >}}

Running this program on my Linode machine with an Arch Linux operating system will print the following.

{{< highlight bash >}}
$ ./realloc
memblock1=0x5868995d7340, memblock2=0x5868995d72f0, memblock1_orig=0x5868995d72a0
memblock3=0x5868995d72a0
{{< / highlight >}}

Note, that none of the `assert` statements evaluate to false.

# Details of `realloc`

The [realloc(3p)](https://man7.org/linux/man-pages/man3/realloc.3p.html) function will do more than allocation of memory. If necessary `realloc` will free the previously allocated memory from the heap and allocate memory in another place on the heap. The `realloc` function will also copy the contents of the previous allocated memory for us. From the program above we assert that our values of `1` are copied to the new block verifying this is the case.