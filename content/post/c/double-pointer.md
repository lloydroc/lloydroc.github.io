---
title: C Double Pointers
categories:
 - c
date: "2019-06-17T16:45:00Z"
aliases:
  - /c/pointers/2019/06/17/double-pointer.html
---

# {{< title >}}

{{< figure src="/assets/svg/c-double-pointers.svg" title="double pointers in c" >}}

Updated December 19, 2022

Examples and explanations of single pointers are used throughout many programming languages including C. This blog post explains and explores use cases for double pointers in the C programming language. Toward the end we'll look at a `glibc` example that uses a triple pointer.

# Use Cases

The primary use cases I've found are the following:
* Arrays of strings `char *`. These strings are typically not fixed length. Thus, `char *buf[N]` is a bit misleading since `N` will vary.
* Functions that allocate memory for the caller. In this case the caller is expected to free the allocated memory after finished.

# Mental Model

What is the difference between a `char **foo` and `char *foo[]`? Let's take an example program:

{{< highlight c >}}
#include <assert.h>
#include <stdlib.h>
#include <string.h>

int
main(int argc, char *argv[])
{
  char str1[] = "a string array";
  char *str2 = "a string pointer";

  /* this is true*/
  assert(strcmp(str1, "a string array")  == 0);

  /* this is also true */
  assert(strcmp(str2, "a string pointer") == 0);

  assert(sizeof(str1) == 15);

  /* difference here in str2 */
  assert(sizeof(str2) == sizeof(char *));

  return EXIT_SUCCESS;
}
{{< / highlight >}}

The following differences can be noted:
* The string comparisons work with `strcmp`.
* The `sizeof` compile time operator has different results as it's the size of a pointer for a `char *`.
* Memory for `str1` and `str2` are allocated differently. I don't know enough to write about all the details.

## Memory

Notice where the pointers are in memory:

{{< highlight c >}}
(gdb) p str2
$2 = 0x555555556008 "a string pointer"
(gdb) p &str1
$3 = (char (*)[15]) 0x7fffffffdf99
(gdb) 
{{< / highlight >}}

It appears to me that `str1` is on the stack. The contents of `str2` is on the heap and the value of `str2` is set in the `main` function.

## Double Pointer Example 1

A great example to understand double pointers is using *environment variables* within a program in C. It looks like the following:

{{< highlight c >}}
#include <stdlib.h>
#include <stdio.h>

extern char **environ;

int
main(int argc, char *argv[])
{
  char **ep;

  for(ep = environ; *ep != NULL; ep++)
  {
    puts(*ep);
  }

  return EXIT_SUCCESS;
}
{{< / highlight >}}

Let's say we had the following environment variables:
{{< highlight bash >}}
$ env
SHELL=/bin/bash
HOME=/home/lloyd
{{< / highlight >}}

Here the `char **environ` is simply the following.

{{< figure src="/assets/svg/c-double-char-pointer.svg" title="double char pointer in c" >}}

The memory looks something like the following. Note, this shows different environment variables `SHELL` and `COLORTERM` that what is above.

{{< highlight c >}}
(gdb) x/32c *environ
0x7fffffffe361: 83 'S'  72 'H'  69 'E'  76 'L'  76 'L'  61 '='  47 '/'  98 'b'
0x7fffffffe369: 105 'i' 110 'n' 47 '/'  98 'b'  97 'a'  115 's' 104 'h' 0 '\000'
0x7fffffffe371: 67 'C'  79 'O'  76 'L'  79 'O'  82 'R'  84 'T'  69 'E'  82 'R'
0x7fffffffe379: 77 'M'  61 '='  116 't' 114 'r' 117 'u' 101 'e' 99 'c'  111 'o'
(gdb) p environ[0]
$1 = 0x7fffffffe361 "SHELL=/bin/bash"
(gdb) p environ[1]
$2 = 0x7fffffffe371 "COLORTERM=truecolor"
{{< / highlight >}}

## Double Pointer Example 2

This example is really to help understand Example 3. It skips the functions used in Example 3.

We have the following diagram.
{{< figure src="/assets/svg/c-double-pointers.svg" title="double pointers in c" >}}

Here is some code to implement what is in the diagram.
{{< highlight c >}}
#include <stdlib.h>
#include <assert.h>

int
main(int argc, char *argv[])
{
  // &x = 0x7ffffffee074
  int x;

  // &p = 0x7ffffffee068
  // we never directly assign p
  int *p;

  // &pp = 0x7ffffffee078
  int **pp;

  x = 42;

  // point pp to p
  // &pp = 0x7ffffffee078, pp = 0x7ffffffee068
  pp = &p;

  // changing *pp will change where p points to
  // *pp = 0x7ffffffee074, p = 0x7ffffffee074
  *pp = &x;

  // by changing *pp we indirectly changed p
  // passes
  assert(*p == 42);

  return EXIT_SUCCESS;
}
{{< / highlight >}}

In this example we indirectly assign `p` by de-referencing the double pointer `pp`. Through the double pointer `pp` we set the value of the single pointer `p`.

## Double Pointer Example 3

This example solves a common problem where the caller has a pointer to a type and wants to call a function that allocates memory and typically initializes that type. The result of this function is the caller's pointer will point to the allocated memory from that function. Effectively, it allows a caller to call a function that will allocate memory and point a pointer to that new memory. That's a mouthful, but it happens. Don't forget the caller is responsible to free this memory. Having another function allocate memory for a caller is common. It happens in C libraries where you see double pointers passed in. A function with double pointers is usually a dead giveaway that after the call this double pointer will be pointing to a newly allocated memory type. Unfortunately, this can't be done with single pointers and let's look at the example below to see why.

{{< highlight c >}}
#include <errno.h>
#include <string.h>

// this function will allocate memory
// for and int
// and after its return the callers
// pointer will point to that memory
// a double pointer is required
int
allocate(int **p);

// this function will try to allocate
// memory for the caller but unfortunately
// after the function returns the caller's
// pointer won't point to the allocated
// memory due to the single pointer
int
cant_allocate(int *p);

int
main(int argc, char *argv[])
{
  int *p = NULL; // &p = 0x7ffffffee028, *p = 0x0

  // pass the value of p = 0x0
  // to the cant_allocate function
  // which will cause a memory leak
  // and the result will not be p
  // pointing to a malloc'ed int
  cant_allocate(p);
  // p will still be 0x0 and thus p was unchanged

  // cant_allocate(&p) won't work as the compiler
  // will say that it expected int * for the type
  // but the argument is of type int **.

  // pass in &p = 0x7ffffffee060
  // the allocate function will modify *p
  // which is the same as modifying the contents
  // of memory address &p = 0x7ffffffee060
  allocate(&p);
  // &p is still 0x7ffffffee060
  // p is now 0x8402030
  free(p);
  return EXIT_SUCCESS;
}

// if we expect this function
// to allocate an integer for us
// and on exit have p pointing
// to that integer it won't work
// this is because when malloc
// returns a pointer to this
// allocated integer only we assign
// it to p and p as the function
// argument is only the
int
cant_allocate(int *p)
{
  // note that &p is of type (int **)
  // p before the malloc is 0x0 and after is
  // an address like 0x8402010
  // but notice this doesn't change the
  // contents at memory address
  p = (int *) malloc(sizeof(int));

  // p will have a value here assuming we have memory
  if(p == NULL)
  {
    fprintf(stderr, "error malloc %s", strerror(errno));
    return 1;
  }
  return 0;
}

int
allocate(int **p)
{
  // in general
  // *p  is the address of the int
  // **p is the value of the int
  //
  // we can also say
  //
  // if caller passes in &p where p is
  // a pointer to an int then *p is the
  // value at that address
  //
  // p will be 0x7ffffffee060 inside here
  // *p will be 0x0 or the contents
  // at address 0x7ffffffee060
  // and thus we will be changing the contents
  // of the memory address 0x7ffffffee060
  // which is where the caller's p points to
  *p = (int *) malloc(sizeof(int));
  if(*p == NULL)
  {
    fprintf(stderr, "error malloc %s", strerror(errno));
    return 1;
  }
  return 0;
}
{{< / highlight >}}

We can see from the example above for a function to allocate memory and assign the callers pointer to that memory the double pointer is required. This case is quite common and should be understood for any good C programmer. This example will shed light on what is going on inside many libraries that allocate memory for the caller.

## Triple Pointer Example 4

The *glibc* system call to list files in a directory [scandir()](https://man7.org/linux/man-pages/man3/scandir.3.html) takes as argument a triple pointer for the `namelist` argument.

{{< highlight c >}}
int scandir(const char *restrict dirp,
            struct dirent ***restrict namelist,
            int (*filter)(const struct dirent *),
            int (*compar)(const struct dirent **,
                          const struct dirent **));
{{< / highlight >}}

This is because inside the `scandir` function itself it will allocate a `struct dirent **namelist` for the caller. With this `namelist` it's the same logically as a `struct dirent *namelist[]`, an array of pointers to `struct dirent`. Although, the caller doesn't allocate the memory, the caller is expected to free the `namelist`. 

{{< highlight c >}}
while (n--) { // the variable n contains the length of namelist
    free(namelist[n]);
}
free(namelist);
{{< / highlight >}}

There is a more thorough example to [Listing files in a Directory using C](/post/c/list-directory/).