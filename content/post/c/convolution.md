---
title: Simple Convolution in C
categories: ["c"]
tags: ["convolution", "signal processing"]
comments: true
date: "2018-10-17T06:10:00Z"
math: true
lastmod: "2020-04-21"
---

Updated April 21, 2020

In this blog post we'll create a simple 1D convolution in C. We'll show the classic example of convolving two squares to create a triangle. When convolution is performed it's usually between two discrete signals, or time series. In this example we'll use C arrays to represent each signal.

When implementing convolution it's important to know the length of convolution result, since the resulting array is bigger than the two input arrays. This can cause memory problems. Computing the length of the convolution result is actually a simple computation. If you have array **H** convolved with array **X**, where the lengths are 5 and 5 respectively, the resulting size of **Y=H*X** (**H** convolved with **X** to make **Y**) will be **Length(H) + Length(X) - 1**. For this example the resulting length of two size 5 arrays will be 5+5-1 = 9. This convolution is typically done where **H** is a digital filter and **X** is a time series to be filtered. The output array **Y** is the time series that results after filtering. For our example we have input arrays **H** and **X**. The output of array of our convolution will be called **Y**.

## The Math for our Example

Let's go into the math on our simple example for Convolution. If you don't need it skip down onto the lower portion of the post for the code.

We will convolve two signals \\( h[t] \\) and \\( x[t] \\). These signals are as simple as possible.

$$ \displaystyle h[t] = \begin{cases}
     0 & \text{if $t \lt -2$} \\\\
     1 & \text{if $-2 \leq t \leq 2 $} \\\\
     0 & \text{if $t > 2$}
     \end{cases}
$$

The signal \\( x[t] \\) will be the same as \\( h[t] \\).

$$ \displaystyle x[t] = \begin{cases}
     0 & \text{if $t \lt -2$} \\\\
     1 & \text{if $-2 \leq t \leq 2 $} \\\\
     0 & \text{if $t > 2$}
     \end{cases}
$$

Think of \\( h[t] \\) and \\( x[t] \\) as *squares*. They are \\( 5 \\) time units long and \\( 1 \\) unit high. They will perfectly overlap \\( 5 \\) points at time index \\( 0 \\).

Now, let's use the convolution equation. Note, how \\( h[t] \\) is indexed. It is flipped so that the left is on the right and vice-versa. In many cases this *mirroring* doesn't matter because of symmetry.

$$ y[t] = \sum\_{i=-2}^{2} x[i]*h[t-i] $$

We can evaluate \\( y[t] \\) at each time interval.

$$ y[-4] = \sum\_{i=-2}^{2} x[i]*h[-4-i] = 1 $$
$$ y[-3] = \sum\_{i=-2}^{2} x[i]*h[-3-i] = 2 $$
$$ y[-2] = \sum\_{i=-2}^{2} x[i]*h[-2-i] = 3 $$
$$ y[-1] = \sum\_{i=-2}^{2} x[i]*h[-1-i] = 4 $$
$$ y[0] = \sum\_{i=-2}^{2} x[i]*h[0-i] = 5 $$
$$ y[1] = \sum\_{i=-2}^{2} x[i]*h[1-i] = 4 $$
$$ y[2] = \sum\_{i=-2}^{2} x[i]*h[2-i] = 3 $$
$$ y[3] = \sum\_{i=-2}^{2} x[i]*h[3-i] = 2 $$
$$ y[4] = \sum\_{i=-2}^{2} x[i]*h[4-i] = 1 $$

## Animation showing Convolution

The animation shows the convolution example in action. This animation depicts two signals `x[t]` and `h[t]` with amplitude 1 convolved together to form `y[t]`. When `x[t]` and `h[t]` perfectly overlap multiplying each value together and summing them up results in the value of 5. Careful attention should be paid to the X-axis or `t`. Where `x[t]` and `h[t]` first overlap on the X-axis is where the first value of the result `y[t]` will lie on the X-axis.

{{< figure src="/assets/svg/convolution.svg" title="Simple Convolution Animation of two signals" >}}

## A Quick Overview of How the Algorithm Works

Imagine `h[t]` sliding through `x[t]`. We only care about the region where `x[t]` is defined. There is a window of \\( 5 \\) points and in this window we need to do \\( 5 \\) multiplications and take the sum of those multiplications. Since both signals are either \\( 0 \\) or \\( 1 \\), the max sum is \\( 5 \\). There is no need to shift `h[t]` where it is \\( 0 \\) outside the window since we know the sum of the multiplications will be \\( 0 \\).

{{< figure src="/assets/svg/numeric-convolution.svg" title="h[t] sliding through x[t]" >}}

# C Code for Convolution

Enough with the math, let's look at the code. Notice, we don't keep track of the actual indexes where the signals start and end. We just have two arrays and if there were shifts in time those would need to be handled outside the convolution function.

## C Header File for 1D Convolution

Let's define a header file with some helpers to get the min and max of two numbers, as well as, a function to take our arrays **h** and **x** and return a pointer to an array containing the convolution result.

{{< highlight c >}}
// filename convolve.h
#include <stdlib.h>
#include <stdio.h>

// helper functions to get the min and max of two numbers
#define MIN(X, Y) (((X) < (Y)) ? (X) : (Y))
#define MAX(X, Y) (((X) < (Y)) ? (Y) : (X))

/**
 the convolve function will have as input two arrays h and x.
 I will return a pointer to a new array, as well as,
 set the length of that array in lenY.
 The length of h and x must be specified as inputs.
*/
float* convolve(float h[], float x[], int lenH, int lenX, int* lenY);
{{< / highlight >}}

## C File for 1D Convolution

The implementation in C of the convolution. Note, we will allocate memory with `calloc` inside the function and the caller will need to free this memory after using the convolution result, else, there will be a memory leak.

{{< highlight c >}}
// filename convolve.c
#include "convolve.h"

float* convolve(float h[], float x[], int lenH, int lenX, int* lenY)
{
  int nconv = lenH+lenX-1;
  (*lenY) = nconv;
  int i,j,h_start,x_start,x_end;

  float *y = (float*) calloc(nconv, sizeof(float));

  for (i=0; i<nconv; i++)
  {
    x_start = MAX(0,i-lenH+1);
    x_end   = MIN(i+1,lenX);
    h_start = MIN(i,lenH-1);
    for(j=x_start; j<x_end; j++)
    {
      y[i] += h[h_start--]*x[j];
    }
  }
  return y;
}
{{< / highlight >}}

## Using the Convolution

Below is an example C program to use the `convolve` C function.

Let's first run it and see the result. Here we are convolving two arrays with length of 5 so we expect a result with length 9.
{{< highlight bash >}}
$ ./src/convolve
1 2 3 4 5 4 3 2 1
$
{{< / highlight >}}

{{< highlight c >}}
#include <stdio.h>
#include "convolve.h"

int main(int argc, char *argv[])
{
  float h[] = { 1.0, 1.0, 1.0, 1.0, 1.0 };
  float x[] = { 1.0, 1.0, 1.0, 1.0, 1.0 };
  int lenY;
  float *y = convolve(h,x,5,5,&lenY);
  for(int i=0;i<lenY;i++) {
    printf("%0.f ",y[i]);
  }
  puts("");
  free(y);
  return 0;
}
{{< / highlight >}}

Note the formating of the floats for ease of use.

## Download the Source

The source can be downloaded here [C convolution example](/code/c/convolve-1.0.tar.gz). Run the example by doing the following.

{{< highlight bash >}}
$ ./configure
$ make
$ ./src/convolve
1 2 3 4 5 4 3 2 1
$
{{< / highlight >}}

The files you will care about are `src/convolve.h`, `src/convolve.c` and `src/main.c`.

## Comments Please!

Please drop me a comment as I'd love to hear if this post helped, was confusing, or how it could be improved? I'm always curious as well on what your use case would be for convolution in C?

