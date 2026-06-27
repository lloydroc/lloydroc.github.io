---
categories:
  - c
tags:
  - signal-processing
date: "2019-08-08"
title: Example FFT in C
math: false
aliases:
  - /fft/c/2019/08/08/example-fft-c.html
---

# {{< title >}}

In this post we'll provide the simplest possible Fast Fourier Transform (FFT) example in C. After understanding this example it can be adapted to modify for performance or computer architecture.

# Table of Contents

{{< toc >}}

## FFT Example Usage

In the example below we'll perform an FFT on a complex (real + imaginary) array of 32 elements. After the FFT has completed it will write over the provided arrays as the FFT is done *in place*. Note, we're using floating point here and not fixed width. Thus, if you don't have a math coprocessor it will be very slow.

Here is how you'd compute an FFT on complex data.

{{< highlight c >}}
// FFT Size
#define N_FFT 32

// input signals
double signal_re[N_FFT]; // real signal array
double signal_im[N_FFT]; // imaginary signal array

// the fft function will modify the arrays passed in
// also known as in-place computation
fft(signal_re, signal_im, N_FFT); 
{{< /highlight >}}

See the test cases below that show more usage examples.

## C Header of the FFT

To perform an FFT we have two helper functions called `rearrange` and `compute`. The `rearrange` function will rearrange the elements in the array corresponding butterfly stages. The `compute` function does all computation once the signals are put through `rearrange`. 

### Rearranging the Input

The `rearrange` function will bit reverse the indices. For example if we have an FFT of size 8 which can be represented in with 3 bits we have. 

{{< figure src="/assets/svg/fft-rearrange.svg" title="FFT rearranging the input values by Bit Reversal" >}}

### C Header to use the FFT

The C Header aims to make performing the FFT as simple as possible.

{{< highlight c >}}
// file fft.h
#ifndef EXAMPLE_FFT
#define EXAMPLE_FFT

// The arrays for the fft will be computed in place
// and thus your array will have the fft result
// written over your original data.
// We require an array of real and imaginary floats
// where they are both of length N
void
fft(float data_re[], float data_im[],const int N);

// helper functions called by the fft
// data will first be rearranged then computed
// an array of  {1, 2, 3, 4, 5, 6, 7, 8} will be
// rearranged to {1, 5, 3, 7, 2, 6, 4, 8}
void
rearrange(float data_re[],float data_im[],const int N);

// the heavy lifting of computation
void
compute(float data_re[],float data_im[],const int N);

#endif
{{< /highlight >}}

## C Implementation of the FFT

Now it's time to look at the implementation. To understand how the algorithm is working it's probably best to use a debugger and a sheet to paper for a small example of length 8. Also, have the theory and equations alongside you. It's also very important to understand the triple loop structure of the `compute` function.

{{< highlight c >}}
// file fft.c
#include <math.h>
#include "fft.h"

void
fft(float data_re[], float data_im[], const unsigned int N)
{
  rearrange(data_re, data_im, N);
  compute(data_re, data_im, N);
}

void
rearrange(float data_re[], float data_im[], const unsigned int N)
{
  unsigned int target = 0;
  for(unsigned int position=0; position<N; position++)
  {
    if(target>position) {
      const float temp_re = data_re[target];
      const float temp_im = data_im[target];
      data_re[target] = data_re[position];
      data_im[target] = data_im[position];
      data_re[position] = temp_re;
      data_im[position] = temp_im;
    }
    unsigned int mask = N;
    while(target & (mask >>=1))
      target &= ~mask;
    target |= mask;
  }
}

void
compute(float data_re[], float data_im[], const unsigned int N)
{
  const float pi = -3.14159265358979323846;
  
  for(unsigned int step=1; step<N; step <<=1)
  {
    const unsigned int jump = step << 1;
    const float step_d = (float) step;
    float twiddle_re = 1.0;
    float twiddle_im = 0.0;
    for(unsigned int group=0; group<step; group++)
    {
      for(unsigned int pair=group; pair<N; pair+=jump)
      {
        const unsigned int match = pair + step;
        const float product_re = twiddle_re*data_re[match]-twiddle_im*data_im[match];
        const float product_im = twiddle_im*data_re[match]+twiddle_re*data_im[match];
        data_re[match] = data_re[pair]-product_re;
        data_im[match] = data_im[pair]-product_im;
        data_re[pair] += product_re;
        data_im[pair] += product_im;
      }
      
      // we need the factors below for the next iteration
      // if we don't iterate then don't compute
      if(group+1 == step)
      {
        continue;
      }

      float angle = pi*((float) group+1)/step_d;
      twiddle_re = cos(angle);
      twiddle_im = sin(angle);
    }
  }
}
{{< /highlight >}}

## Test Cases for the FFT

Here are some test cases for the FFT. Again, the type here is `float` and this will run well on a processor with a math co-processor. If you're using a micro-controller then you'd want to consider type `char` or `int`.

{{< highlight c >}}
// file main.c
#include <stdio.h>
#include <math.h>
#include <time.h>
#include "fft.h"

int
compare_arrays(const float x[], const float y[],  const unsigned int N, const float eps);

void
print_arr(const float data[], const unsigned int N);

void
print_test_result(int tc_re, int tc_im, int tc_num);

// We will run 4 test cases to ensure our FFT data is correct
int main(int argc,  char **argv)
{
  int i; // loop iterator
  clock_t start,  stop;
  double cpu_time_used;

  // Test Case 0 - Rearranging
  float data0_re[8] = {1.0,  2.0,  3.0,  4.0,  5.0,  6.0,  7.0,  8.0};
  float expected0_re[8] = {1.0,  5.0,  3.0,  7.0,  2.0,  6.0,  4.0,  8.0};
  float data0_im[8] = {1.0,  2.0,  3.0,  4.0,  5.0,  6.0,  7.0,  8.0};
  float expected0_im[8] = {1.0,  5.0,  3.0,  7.0,  2.0,  6.0,  4.0,  8.0};
  rearrange(data0_re,  data0_im,  8);
  int tc0_re = compare_arrays(data0_re, expected0_re, 8, 0.01);
  int tc0_im = compare_arrays(data0_im, expected0_im, 8, 0.01);
  print_test_result(tc0_re, tc0_im, 0);

  // Test Case 1
  float data1_re[8] = {0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0};
  float data1_im[8] = {7.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.0, 0.0};
  float expected1_re[8] = {28.0, 5.656, 0.0, -2.343, -4.0, -5.656, -8.0, -13.656};
  float expected1_im[8] = {28.0, 13.656, 8.0, 5.656, 4.0, 2.343, 0.0, -5.656};
  fft(data1_re, data1_im, 8);
  int tc1_re = compare_arrays(data1_re, expected1_re, 8, 0.01);
  int tc1_im = compare_arrays(data1_im, expected1_im, 8, 0.01);
  print_test_result(tc1_re, tc1_im, 1);

  // Test Case 2
  float data2_re[8] = {1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0};
  float data2_im[8] = {1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0};
  float expected2_re[8] = {8.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
  float expected2_im[8] = {8.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
  fft(data2_re, data2_im, 8);
  int tc2_re = compare_arrays(data2_re, expected2_re, 8, 0.01);
  int tc2_im = compare_arrays(data2_im, expected2_im, 8, 0.01);
  print_test_result(tc2_re, tc2_im, 2);

  // Test Case 3
  float data3_re[8] = { 1.0, -1.0,  1.0, -1.0,  1.0, -1.0,  1.0, -1.0};
  float data3_im[8] = {-1.0,  1.0, -1.0,  1.0, -1.0,  1.0, -1.0,  1.0};
  float expected3_re[8] = {0.0, 0.0, 0.0, 0.0,  8.0, 0.0, 0.0, 0.0};
  float expected3_im[8] = {0.0, 0.0, 0.0, 0.0, -8.0, 0.0, 0.0, 0.0};
  fft(data3_re, data3_im, 8);
  int tc3_re = compare_arrays(data3_re, expected3_re, 8, 0.01);
  int tc3_im = compare_arrays(data3_im, expected3_im, 8, 0.01);
  print_test_result(tc3_re, tc3_im, 3);

  // Test Case 4
  float data4_re[4] = {1.0, 2.0, 3.0, 4.0};
  float data4_im[4] = {0.0, 0.0, 0.0, 0.0};
  float expected4_re[4] = {10.0, -2.0, -2.0, -2.0};
  float expected4_im[4] = {0.0, 2.0, 0.0, -2.0};
  fft(data4_re, data4_im, 4);
  int tc4_re = compare_arrays(data4_re, expected4_re, 4, 0.01);
  int tc4_im = compare_arrays(data4_im, expected4_im, 4, 0.01);
  print_test_result(tc4_re, tc4_im, 4);

  // Test Case 5
  float data5_re[128];
  float data5_im[128];

  start = clock();
  for(i=0;i<100000;i++) fft(data5_re, data5_im, 128);
  stop = clock();
  cpu_time_used = ((double) (stop - start)) / CLOCKS_PER_SEC;
  printf("Average time per fft %fms", cpu_time_used/1000);
}

void print_test_result(int tc_re, int tc_im, int tc_num)
{
  int res = tc_re+tc_im;
  if(res == 2) {
    printf("Test Case %d: Passed\n", tc_num);
  } else {
    printf("Test Case %d: Failed\n", tc_num);
  }
}

int compare_arrays(const float x[], const float y[], const unsigned int N, const float eps)
{
  int result = 1;
  for(unsigned int i=0;i<N;i++)
  {
    if(fabs(x[i]-y[i])>eps) {
	    result = 0;
    }
  }

  if(result==0)
  {
    printf("Expected: ");
    print_arr(y, N);
    printf("Got     : ");
    print_arr(x, N);
  }

  return 1;
}

void print_arr(const float data[], const unsigned int N)
{
  printf("{");
  for(unsigned int i=0;i<N-1;i++)
    printf("%.3f, ", data[i]);
  printf("%.3f}\n", data[N-1]);
}
{{< /highlight >}}

# Example Makefile

Here is *rough* Makefile I used to create it.

{{< highlight make >}}
all:
	gcc -g -O0 -Wall -Werror -c fft.c -o fft.o
	gcc -g -O0 -Wall -Werror -c main.c -o main.o
	gcc -g -O0 -Wall -Werror -lm fft.o main.o -o fft
	./fft

clean:
	rm *.o fft
{{< /highlight >}}

# Efficiency Improvements

There is a major efficiency improvement that this code could have assuming the FFT function will be called over and over again. This improvement would be pre-computation of the weights or twiddle factors. We call the `cos` and `sin` functions repeatedly and compute angles. All of this can be pre-computed so we only need to multiply by our inputs and merely look up the twiddle factors in an array or set of arrays.

# Github

See the [code](https://github.com/lloydroc/arduino_fft)