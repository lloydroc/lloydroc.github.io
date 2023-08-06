---
title: PSK31 Convolutional Encoder implementation in C
categories:
  - telecommunication
tags:
  - signal-processing
  - convolution
date: "2019-02-13"
lastmod: "2020-04-18"
---

# {{< title >}}

# PSK31 Convolution Encoding
Convolutional Codes are often charactarized by three aspects:
1. `n` Base Code Rate - Number of bits into the encoder
2. `k` Output Symbol Rate - Number of bits out for an input
3. `K` Memory Depth

For QPSK31 we have `[n,k,K] = [1,2,5]`. We give the encoder 1-bit of input, out comes 2-bits, and 5-bits of input are stored in our shift register. For the 2-bits of output 1-bit is In-Phase and the other is Quadrature. Let's look at a diagram that allows us to envision `[n,k,K]`.

{{< figure src="/assets/svg/convolutional_encoder_psk31.svg" title="A Convolutional Encoder with 5-bit input and 2-bit output" >}}

The convolutional encoder is effectively a 5-bit shift register with bits `[x0,x1,x2,x3,x4]` where `x0` is the new incoming bit and `x4` is the oldest bit in the register that is shifted out on each cycle. For PSK31 each bit will come in at 31.25Hz.

Note, here is a post on [Convolutional Decoding](/psk31/cnvdec/). Start with Convolutional Encoding first as I believe it's easier to understand and less complex.

## Generator functions
From the block diagram shown we can see 2 output bits `g0` and `g1`. These are 1-bit outputs that come from the Σ block. This Σ block is a modulo-2 operation and is 1 when the output is odd and 0 when the output is even. These generator functions are defined as follows:

{{< highlight c >}}
int g0 = (x4+x2+x1+x0)%2;
int g1 = (x4+x3+x0)%2;
{{< / highlight >}}

## Convolutional Encoder Output

To summarize we have a `K=5` bit convolutional encoder giving 32 states starting at 0 and ending at 31. Each time a new bit `x0` comes into our encoder we will output 2-bits giving and output symbol rate of `k=2` for a base code rate of `n=1`.

## Convention

As a matter of convention a state of 1 will be `[x0,x1,x2,x3,x4]=[1,0,0,0,0]` and a state of 16 will be `[x0,x1,x2,x3,x4]=[0,0,0,0,1]`. However, we will store this as variables in C as state 1 = `0x01` and state 16 = `0x10`. Can get a little confusing on which end from left-to-right is the most significant big.

The output of the encoder can have 4 possible states `0b00`, `0b01`, `0b10`, and `0b11`. The state `0b10` will correspond to the output of `[g0,g1]=0b10`. This notation can be a bit backwards as `g0` is the most significant bit. This is kept this way as the examples I've seen online and in textbooks have the most significant bit at the left. I assume this is because time is typically from left to right.

## Example PSK31 Encoding

Let's take an example input sequence and display the output of the PSK31 convolutional encoder. We will also display the current and next state of the shift register.

Summary of the the encoder output table:

```
t  each sample interval in time in PSK31 we have 31.25Hz
i  input to the encoder, we will have 0101110...
cs current state of the encoder
ns next state of the encoder
ob the output in binary where we have x0,x1
o  the output in decimal which gives 0321001...
```

Below shows the input, current state, next state, and output of the PSK31 Convolutional Encoder.

```
t  i cs ns  ob  o
-----------------
0  0  0  0 0b00 0
1  1  1  3 0b11 3
2  0  2  6 0b10 2
3  1  5 15 0b01 1
4  1 11 31 0b00 0
5  1 23 31 0b00 0
6  0 14 30 0b01 1
7  0 28 28 0b00 0
8  1 25 27 0b01 1
9  0 18 22 0b01 1
10 1  5 15 0b01 1
11 0 10 30 0b11 3
12 0 20 28 0b01 1
13 0  8 24 0b01 1
14 1 17 19 0b00 0
15 0  2  6 0b10 2
16 0  4 12 0b10 2
17 0  8 24 0b01 1
18 0 16 16 0b11 3
19 0  0  0 0b00 0
```

### Implementation of a PSK 31 Encoder in C

Below is an example written in C of the convolutional encoder for PSK31. The filename is `psk31_enc.c`.

{{< highlight c >}}
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// convolutional encoder function
// arr is an array of length len
// output will be an array of length len with the encoded bits
// where the output 2 bits where the msb is g0 and the lsb is g1
void cnv_enc(unsigned int len, unsigned int arr[], unsigned int *output[]);
int cnv_enc_next(int i);

// generator functions
int g0(int x4, int x3, int x2, int x1, int x0);
int g1(int x4, int x3, int x2, int x1, int x0);

int main(int argc, char *argv[])
{
  // print to stdout unless a file name is provided
  FILE* fdo = stdout;
  if(argc > 2)
  {
    printf("%s [filename]\n",argv[0]);
    return 1;
  }
  else if(argc == 2 && (strcmp("--help",argv[1])==0 || strcmp("-h",argv[1])==0))
  {
    printf("%s [filename]\n",argv[0]);
    return 1;
  }
  else if(argc == 2)
  {
    fdo = fopen(argv[1],"w");
  }
  // our sample input stream
  unsigned int len = 20;
  unsigned int input[] = {0,1,0,1,1,1,0,0,1,0,1,0,0,0,1,0,0,0,0,0,0};

  // the 2-bit output of our encoder
  // note the bit0 is g1 and bit1 is g0
  unsigned int *output;

  cnv_enc(len,input,&output);
  for(int i=0;i<len;i++) {
    fprintf(fdo,"%d",output[i]);
  }
  if(fdo != stdout) {
    fclose(fdo);
  }
  free(output);
  return EXIT_SUCCESS;
}

void cnv_enc(unsigned int len, unsigned int input[], unsigned int *output[])
{
  unsigned int *arr = calloc(len,sizeof(int));
  *output = arr;

  for(int i=0;i<len;i++)
  {
    int enc = cnv_enc_next(input[i]);
    arr[i] = enc;
  }
}

int cnv_enc_next(int x0)
{
  static int x1=0,x2=0,x3=0,x4=0;
  int r0,r1;
  r0 = g0(x4,x3,x2,x1,x0);
  r1 = g1(x4,x3,x2,x1,x0);

  x4 = x3;
  x3 = x2;
  x2 = x1;
  x1 = x0;

  return (r0<<1)|r1;
}

int g0(int x4, int x3, int x2, int x1, int x0)
{
  int g0 = (x4+x2+x1+x0)%2;
  return g0;
}

int g1(int x4, int x3, int x2, int x1, int x0)
{
  int g1 = (x4+x3+x0)%2;
  return g1;
}
{{< / highlight >}}

A simple `Makefile` to build this project is as follows. Running a `make` followed by a `./psk31_enc.o` encode the 1-bit input in the example and output the 2-bit encoding using the PSK31 generator functions.

{{< highlight make >}}
all: psk31_enc.o

%.o: %.c
	cc -o $@ $<

clean:
	rm *.o
{{< / highlight >}}
