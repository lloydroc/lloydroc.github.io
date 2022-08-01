---
title: C Double Pointers
categories: ["c"]
comments: true
date: "2019-06-17T16:45:00Z"
---

# How are double pointers used in C?
In this blog post we talk about Double Pointers in C. Also, known as a pointer to a pointer. We go over 3 use cases to fully understand the usage and go in-depth into a use case where a function can allocate memory for the caller.

{{< figure src="/assets/svg/c-double-pointers.svg" title="double pointers in c" >}}

## Double Pointer Example 1

Let's look at an simple example where we define an integer, a pointer to an int and a double pointer to an int.

{{< highlight c >}}
#include <stdlib.h>
#include <assert.h>

int
main(int argc, char *argv[])
{
  int x, *px, **ppx;

  // what will happen
  // &x   = 0x7ffffffee074, x = 42
  // &px  = 0x7ffffffee068, px  = 0x7ffffffee074, *px  = 42
  // &ppx = 0x7ffffffee078, ppx = 0x7ffffffee068, *ppx = 0x7ffffffee074, **ppx = 42
  x = 42;
  px = &x;
  ppx = &px;

  // this will change the value x = 43
  **ppx = 43;

  // will pass
  assert(x == 43);

  return EXIT_SUCCESS;
}
{{< / highlight >}}

Above we define `x`, `*px`, and `**px`. We set `x=42`, then we point `px` to the address of `x`, and point `ppx` to the address of `px`. The magic happens on the expression `**px = 43` where `*ppx` dereferences to `px` and `**ppx` will dereference `px` to be 42. This expression changes the value of `x` from 42 to 43 by having `ppx` go through `px`. Thanks to gdb for the ability to see the memory addresses, pointer values and values.

This case is pretty straightforward, however, the use cases I've not see very plentiful. One could image that `ppx` could be changed to point to many different pointers who's memory is already allocated. The syntax of `**ppx` could be used for simplicity where we could change `ppx` and indirectly change the memory that is pointed to. Let's look at the next examples which are more common.

## Double Pointer Example 2

This example is really to help understand Example 3. It skips the functions used in Example 3.

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

In this example we indirectly assign `p` by deferencing the double pointer `pp`. Through the double pointer `pp` we set the value of the single pointer `p`.

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
