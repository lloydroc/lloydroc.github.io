---
title: PSK31 Convolutional Decoder Implementation in C
categories:
  - telecommunication
tags:
  - signal-processing
  - convolution
date: "2019-02-13"
lastmod: "2020-04-18"
---

# PSK31 Convolutional Decoder

In my humble opinion decoding a convolutionally encoded PSK31 output stream is the most challenging part of all. Decoding is also where all the magic happens. The Viterbi Decoder corrects the erroneous bits and allows reception of the intended bit stream.

If this is the first time you've heard of a [Viterbi Decoder](https://en.wikipedia.org/wiki/Viterbi_decoder) please look at the former link from Wikipedia as well as these great examples that are in links below. What these examples allow you do is better visualize the entire state machine since they have a very small value for `K` and only `4` states. What we have here in QPSK31 is `32` states and it makes it a bit inconvenient to use this as the first example to learn Viterbi Decoding. Also, be very comfortable with [PSK31 Convolutional Encoding](/psk31/cnvenc/) and the state machine it uses, the generator functions, shift register and process to encode a bit stream with the PSK31 convolutional encoder.

Good Examples on Viterbi Decoding:
- [Example 1](http://my.com.nthu.edu.tw/~jmwu/com5195/viterbi_example.pdf)
- [Example 2](http://home.netcom.com/~chip.f/viterbi/algrthms2.html)
- [Example 3](http://www.moetronix.com/ae4jy/files/winpsktech10.pdf)

In the text below instead of explaining the theory, we'll will show an example implementation of the Viterbi Decoder for PSK31. The theory is better explained in the links above, or alternate sources. We will have the source code and software to actually decode and QPSK31 encoded stream of symbols.

## High Level Process of Viterbi Decoding

Firstly, this isn't an easy process so I'll do my best at walking you through this decoding process. It involves 3 steps:

1. Computing branch and path metrics through the Trellis
2. Tracing back the states corresponding to the best path metric
3. Decoding the bits that corresponeded to the states from Step 2

Before we dive in let's start with some definitions of variables and arrays that we'll use in the implementation.

1. `ns0, ns1` the state machine will transition from the current state to a new state depending if a `0` or `1` was input to the state machine. The states `ns0` and `ns1` represent these states and are abbreviated **next state** or **new state**
2. `os0, os1` similar to `ns0` and `ns1` a transition to the new states will have an output state depending if a `0` or `1` was input into the state machine. The value `os0` represents the output of the state machine when an input of `0` was fed into the state machine for the current state
3. `d0,d1` Hamming Distances - we will compute 2 Hamming Distances for each received symbol between `os0` and `os1`. If these distances are the lowest we will store them in an array at the indexes corresponding to `ns0` and `ns1`. Note this is a **hard decision** using the Hamming Distance, we will later look into a **soft decision** which has some advantages and is usually preferred.
4. `prev_metric` for the current state this is the previous metric one time interval in the past
5. `acs` this is the so called **add-compare-set** where we take the best paths through the trellis. If for instance `d0+prev_metric>acs[ns0]` then we will save this in our metric table for the trellis, else, we'll keep the previous lower value
6. `t` time. It goes without saying each sample interval of 31.25Hz we have received QPSK symbol. We start at `t=0` and end when we've received no more symbols. The length of the input is variable
7. `input`. The input to the Viterbi decoder has an In-Phase and Quadrature part that we will quantize to a `0b00`, `0b01`, `0b10`, or `0b11`. This input is naturally the output of the convolutional encoder

### Arrays Needed for the PSK31 Viterbi Decoder

Below are the arrays we need to implement our PSK31 Viterbi Decoder. Some of these arrays are predefined to us as lookup tables, others are temporary, and some are populated as we move along the decoding process.

#### Next State Array

The `next_state_arr` is predefined and for a given state stores the next state if the input to the state machine was a `0` or 1. We have `32` states. For a given state we show the next state if a `0` or `1` is shifted in.

{{< highlight c >}}
unsigned int next_state_arr[32][2] =
{
  { 0, 1}, // state 0
  { 2, 3}, // state 1
  { 4, 5}, // state 2
  { 6, 7}, // state 3
  { 8, 9}, // state 4
  {10,11}, // state 5
  {12,13}, // state 6
  {14,15}, // state 7
  {16,17}, // state 8
  {18,19}, // state 9
  {20,21}, // state 10
  {22,23}, // state 11
  {24,25}, // state 12
  {26,27}, // state 13
  {28,29}, // state 14
  {30,31}, // state 15
  { 0, 1}, // state 16
  { 2, 3}, // state 17
  { 4, 5}, // state 18
  { 6, 7}, // state 19
  { 8, 9}, // state 20
  {10,11}, // state 21
  {12,13}, // state 22
  {14,15}, // state 23
  {16,17}, // state 24
  {18,19}, // state 25
  {20,21}, // state 26
  {22,23}, // state 27
  {24,25}, // state 28
  {26,27}, // state 29
  {28,29}, // state 30
  {30,31}, // state 31
};
{{< / highlight >}}

If we are in state `4` and we shift a `0` into the state machine the next state will be `8`. If we shift in a `1` the next state will be a `9`. The values of `8` and `9` represent `ns0` and `ns1` respectively. This is because the `4` is multiplied by `2` - or shifted left - to produce `8`, then we add `0` or `1` to form `8` or `9`.

In some respect this table is a bit redundant as the following equations simply generate the table where `cs` is the current state. However, the table makes it simple to visually see all the states, and their transitions.

{{< highlight c >}}
ns0 = (cs*2)%32;
ns1 = (cs*2+1)%32;
{{< / highlight >}}

#### Output State Array

The `output_state_arr` is a predefined array and represents the output of the state machine for a current state if we were to feed in a `0` or `1` into the state machine. It's the same form as the `next_state_arr` as a row is the state, and for each row we have `2` values corresponding to a `1` or `0`.
{{< highlight c >}}
unsigned int output_state_arr[32][2] =
{
  {0,3}, // state 0
  {0,3}, // state 1
  {2,1}, // state 2
  {2,1}, // state 3
  {2,1}, // state 4
  {2,1}, // state 5
  {0,3}, // state 6
  {0,3}, // state 7
  {1,2}, // state 8
  {1,2}, // state 9
  {3,0}, // state 10
  {3,0}, // state 11
  {3,0}, // state 12
  {3,0}, // state 13
  {1,2}, // state 14
  {1,2}, // state 15
  {3,0}, // state 16
  {3,0}, // state 17
  {1,2}, // state 18
  {1,2}, // state 19
  {1,2}, // state 20
  {1,2}, // state 21
  {3,0}, // state 22
  {3,0}, // state 23
  {2,1}, // state 24
  {2,1}, // state 25
  {0,3}, // state 26
  {0,3}, // state 27
  {0,3}, // state 28
  {0,3}, // state 29
  {2,1}, // state 30
  {2,1}  // state 31
};
{{< / highlight >}}

For example if we are in state `23` if we shifted a `0` into the state machine the output would be a `3` and if we shifted in a `1` the output would be `0`.

#### Accumulated Metric Array

This array effectively represents the trellis. We compute it as we go along for each time sample. One dimension are the states that we have, the other is time. After this array is populated we can walk back through it and determine the most likely path, then decode it to get our bit stream back.

{{< highlight c >}}
unsigned int acc_metric[32][INPUT_LENGTH];
{{< / highlight >}}

#### Add-Compare-Set Array

This is a temporary array is used for each time sample to find the lowest metric from the previous state to the current state. It's one of the hardest to visualize but is used as temporary storage. It exists because there are two paths from the current state to the next state depending of the input is a `0` or 1. Because of this fact to get to the next state there are multiple previous states. For example, if we are in state `0` if we input a `1` to the state machine we will arrive in state 1. However, if we are in state `16` and we input a `1` we will also arrive in state 1. The `acs` array will be used to select the lower of the previous metrics to the state we arrive in.


{{< highlight c >}}
unsigned int acs[32];
{{< / highlight >}}

#### Traceback Array

In the `traceback` array we will store the state with the lowest metric after we have fully populated the `acc_metric` array. We will later use this to decode the inputs to the encoder that produces the received symbols we have. It's length depends on how many received symbols we want to decode. For example if we had `traceback[3] = {0,1,2}` we would have determined the state machine went from state 0, then 1, then 2. Our job isn't done yet though, we have to find the bits that created these state transitions.

{{< highlight c >}}
unsigned int traceback[INPUT_LENGTH];
{{< / highlight >}}

#### State Transition Array

The state transition array is used in the decoding process but requires the traceback array to be populated. More accurately using the state transition array together with the traceback array gives us the decoded bits that entered the convolutional encoder. It allows us to find for a given state and chosen next state what the input would have been. For example if we are in state `1` and the chosen next state is `3` then we would know an input of `1` would have been given. This was found by looking at `state_trans[1][3]`. The value of `3` for this array represents and impossible state transition. Memory can definitely be preserved here as this array is quite inefficient, nevertheless, it provides good visualization.

{{< highlight c >}}
unsigned int state_trans[32][32] =
{
  {0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 1
  {3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 2
  {3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 3
  {3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 4
  {3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 5
  {3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 6
  {3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 7
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 8
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 9
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3}, // state 10
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3}, // state 11
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3}, // state 12
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3}, // state 13
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3}, // state 14
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3}, // state 15
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1}, // state 16
  {0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 17
  {3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 18
  {3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 19
  {3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 20
  {3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 21
  {3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 22
  {3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 23
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 24
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3}, // state 25
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3,3,3}, // state 26
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3,3,3}, // state 27
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3,3,3}, // state 28
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3,3,3}, // state 29
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3,3,3}, // state 30
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1,3,3}, // state 31
  {3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,1}, // state 32
};
{{< / highlight >}}

#### Decoded Array

The entire purpose of the PSK31 decoder is to populate this array. It is the best guess of the input into the state machine. It's length is the length of the input to the decoder or the output of the encoder. We can use the state transition array and the traceback and we'll get our encoded bits input to the encoder back.

{{< highlight c >}}
unsigned int decoded[INPUT_LENGTH];
{{< / highlight >}}

#### Hamming Distance

We will need to find the distance between the received symbol of the Viterbi Decoder to that of the output in the state machine. This is a 2-bit comparison and the Hamming Distance will give us the number of bits different. This is easy, there are only 3 combinations we can have `{0,1,2}`. So a zero is when these two symbols are the same. The Hamming Distance is for a **hard decision** decoder.

Let's look at a simple function that computes the Hamming Difference of two numbers `a` and `b`.

{{< highlight c >}}
// not the most efficient but does the job
unsigned int hamming_distance(unsigned int a, unsigned int b)
{
  unsigned int distance = 0;

  unsigned int a1 =  1 & a;
  unsigned int a2 =  2 & a;

  unsigned int b1 =  1 & b;
  unsigned int b2 =  2 & b;

  distance += (a1 ^ b1);
  distance += (a2 ^ b2) >>  1;
  return distance;
}
{{< / highlight >}}

Take for example `a=0,b=0`, then the Hamming Distance `d=0`. On the other side if `a=0b11=3` and `b=0b00=0` then we have `d=0b10=2`. We can also have `a=0b01=1` and `b=0b10=2` giving `d=0b11=3` since both bits are different.

## Implementing the Viterbi Algorithm for Decoding PSK31

Now that we have all of the definitions and arrays behind us, we can put it all together and decode the bit stream. We will break this decoding process into 3 steps:


One way to think of these 3 steps is to relate to the state machine itself. The state machine starts with input bits, those input bits put the state machine in different states, and those different states cause outputs. The decoder does this in reverse. We take the most likely outputs, map those to the states, then map those states to the inputs to the state machine.

### Step 1 - Computing branch and path metrics through the Trellis

Let's first introduce the idea of a **path metric** and **branch metric**. The so called path metric is a numeric value on how similar the received symbol is to the output of the state machine. The path metric only considers from A to B. The branch metric is the accumulation of path metrics since the state machine will fix us to certain paths through the trellis we will sum up the likely paths and let the best metric win using **add-compare-set**. In this case the lower the metric the better. Since we count number of bit differences with the Hamming Distance against the metric, the lower the metric the better. The lowest metric can be zero for both a path and branch metric when we have zero errors.

For every received symbol we will go through all possible states. For each of these states we will find the difference in bits of the received symbol the output of the state machine to arrive at that state. However, there is some complexity involved since each state can go to 2 other states depending if a 0 or 1 was fed into the state machine. For each of these two states we have to make a decision on which path to take. This is the **add-compare-set** that you will see documented for implementations of Viterbi Decoders. We will take the lowest path metric. Let's repeat this to make sure it's clear. For every state there are two previous states that can get to this state. From the previous state to this state the output of the state machine and accumulated branch metric can be added together and we will only store the smallest metric.

Let's look at some code to see how we can compute the `acc_metrics` array. Note, this code can be optimized for performance.

{{< highlight c >}}
unsigned int d0,d1;
unsigned int ns0,ns1;
unsigned int os0,os1;
for(int t=0;t<INPUT_LENGTH;t++)
{
  // initialize ACS to anything smaller than 255 will be used
  for(int state=0;state<NUM_STATES;state++) acs[state] = 255;

  for(int state=0;state<NUM_STATES;state++)
  {
    ns0 = next_state_arr[state][0];
    ns1 = next_state_arr[state][1];

    os0 = output_state_arr[ns0][0];
    os1 = output_state_arr[ns1][1];

    d0 = hamming_distance(os0,input[t]);
    d1 = hamming_distance(os1,input[t]);

    // since the state machine starts at state 0 at time 0
    // we will only compute for state transtions of 0
    if(t==0 && state==0)
    {
      acc_metric[ns0][t] = d0;
      acc_metric[ns1][t] = d1;
    }
    if(t>0)
    {
      unsigned int acc_metrics[2];
      unsigned int prev_metric;

      prev_metric = acc_metric[state][t-1];

      acc_metrics[0] = d0+prev_metric;
      acc_metrics[1] = d1+prev_metric;

      if(acc_metrics[0] < acs[ns0]) {
        acs[ns0] = acc_metrics[0];
      }

      if(acc_metrics[1] < acs[ns1]) {
        acs[ns1] = acc_metrics[1];
      }

      acc_metric[ns0][t] = acs[ns0];
      acc_metric[ns1][t] = acs[ns1];
    }
  }
}
{{< / highlight >}}

Before we get into the more code for this PSK31 Viterbi Decoder let's look at the output of the `acc_metric` array in a form that is easy to understand. This table is generated from an input of the following output states:

{{< highlight c >}}
unsigned int input[INPUT_LENGTH] = {0,3,2,1,0,0,1,0,1,1,1,3,1,1,0,2,2,1,3,0};
{{< / highlight >}}

It is important to note that this received sequence has no bit errors. Thus, the accumulated branch metric at the end will be zero.


{{< highlight bash >}}
acc_metrics:
t=     0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19
------------------------------------------------------------------------------------
 0     0   2   3   4   4   4   5   5   6   6   4   6   4   5   5   3   4   5   7   0
 1     2   0   3   4   6   6   5   7   6   6   4   4   4   5   7   3   4   5   5   2
 2     9   3   0   5   5   4   5   6   5   7   5   5   6   6   6   0   3   6   6   3
 3     9   3   2   3   5   4   3   6   3   5   3   5   4   4   6   2   5   4   6   3
 4     9  10   3   2   6   6   6   6   7   6   2   5   7   5   4   3   0   5   4   4
 5     9  10   5   0   6   6   4   6   5   4   0   5   5   3   4   5   2   3   4   4
 6     9  11   4   3   3   5   5   3   6   4   3   5   6   5   4   4   3   5   6   3
 7     9   9   4   3   5   7   5   5   6   4   3   3   6   5   6   4   3   5   4   5
 8     9  10  12   3   3   7   3   4   5   3   3   3   5   0   6   6   5   0   6   5
 9     9  10  10   5   3   7   5   4   7   5   5   3   7   2   6   4   3   2   6   5
10     9   9  11   6   2   8   4   6   6   6   5   0   6   3   5   5   5   3   3   6
11     9  11  11   6   0   6   4   4   6   6   5   2   6   3   3   5   5   3   5   4
12     9   9  10   5   5   5   3   7   4   6   5   3   6   4   7   5   5   4   5   5
13     9  11  10   5   3   3   3   5   4   6   5   5   6   4   5   5   5   4   7   3
14     9  10  11   4   4   6   0   6   4   5   4   4   3   3   6   5   6   3   6   5
15     9  10   9   6   4   6   2   6   6   7   6   4   5   5   6   3   4   5   6   5
16     9   9  11  10   5   5   6   5   5   3   4   3   4   6   2   6   4   6   0   7
17     9  11  11  10   3   3   6   3   5   3   4   5   4   6   0   6   4   6   2   5
18     9  10  12  10   6   4   5   5   4   0   4   6   3   3   3   7   6   3   3   6
19     9  10  10  12   6   4   7   5   6   2   6   6   5   5   3   5   4   5   3   6
20     9  10  11  10   7   3   3   5   3   3   5   6   0   5   4   6   7   5   4   4
21     9  10   9  12   7   3   5   5   5   5   7   6   2   7   4   4   5   7   4   4
22     9   9  10  11   8   2   6   6   5   4   6   5   3   6   5   4   6   6   3   6
23     9  11  10  11   6   0   6   4   5   4   6   7   3   6   3   4   6   6   5   4
24     9  10   9  12   6   5   6   4   2   6   7   6   5   7   5   3   5   7   5   6
25     9  10  11  10   6   5   4   4   0   4   5   6   3   5   5   5   7   5   5   6
26     9  11  10  11   5   3   4   3   3   5   6   7   5   6   4   6   6   6   6   3
27     9   9  10  11   7   5   4   5   3   5   6   5   5   6   6   6   6   6   4   5
28     9  11  11  11   4   4   6   0   4   5   6   6   5   4   3   6   6   4   5   5
29     9   9  11  11   6   6   6   2   4   5   6   4   5   4   5   6   6   4   3   7
30     9  10  10  11   7   5   7   3   5   5   5   4   6   6   5   5   3   6   5   6
31     9  10  12   9   7   5   5   3   3   3   3   4   4   4   5   7   5   4   5   6
{{< / highlight >}}

This width of this table are time samples, we have 20 time samples, this is because we have an input of length 20. The depth of this table is each of the 32 states. Effectively, this is a Trellis diagram but the numbers inside represent the branch metrics as it transitions. Feast your eye on the 0 metrics that are in each column. It is also important to note that at `t=0` we have an arbitrary value of 9 since we know we must start in the 0 state. If we are in state 0 then we can only go to state 0 or state 3.

Let's look more closely at the `t=0` column. Our lookup arrays previously defined have the following values:

{{< highlight c >}}
output_state_arr[0] = {0,3}
next_state_arr[0] = {0,1}
{{< / highlight >}}

This means when we start at state 0, if a 0 was input to the state machine the output would be a 0 and the next state would be 0. However, if we start at state 0 and a 1 was input to the state machine then 3 would be output and the next state would be 1. The distance is respecively 0 and 2 since we're comparing our first input symbol of 0.

### Step 2 - Tracing back the states corresponding to the best path metric

Let's take the previous step where we computed the `acc_metric` array. We can trace through each column looking for the minimum value which in this case is 0 and take the respective states we find the following:

{{< highlight c >}}
traceback:
t=     0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19
------------------------------------------------------------------------------------
       0   1   2   5  11  23  14  28  25  18   5  10  20   8  17   2   4   8  16   0
{{< / highlight >}}

The path above through states 0,1,2,5,11 ... is the branch where the accumulated metric is 0. This is because at `t=19, state=0` we arrive at 0. We've computed all the branch metrics and taken the state with the lowest one at each time sample.

Let's look at the code for this.

{{< highlight c >}}
for(int t=len-2;t>=0;t--)
{
  unsigned int min_metric = acc_metric[0][t];
  unsigned int min_state = 0;
  unsigned int from_state = traceback[t+1];
  for(int to_state=0;to_state<NUM_STATES;to_state++)
  {
    unsigned int metric = acc_metric[to_state][t];
    unsigned int next_state = state_trans[to_state][from_state];
    if(metric < min_metric && next_state != 3)
    {
      min_metric = metric;
      min_state = to_state;
    }
    traceback[t] = min_state;
  }
}
{{< / highlight >}}

### Step 3 - Decoding the bits that corresponeded to the states from Step 2

Now we can use our `state_trans` array to decode for each state if a 0 or 1 caused the state transition.

{{< highlight c >}}
decoded:
t=     0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18
--------------------------------------------------------------------------------
       1   0   1   1   1   0   0   1   0   1   0   0   0   1   0   0   0   0   0
{{< / highlight >}}

These are the exact bits we put into our PSK31 Convolutional Coder and we know know that our decoding worked. Let's look at how we can go from the `traceback` array to the `decoded` array.


{{< highlight c >}}
decoded[0] = state_trans[0][traceback[0]];
for(int t=1;t<len-1;t++)
{
  decoded[t] = state_trans[traceback[t-1]][traceback[t]];
}
{{< / highlight >}}

## Where to go from here?

Whoa, this is some heavy stuff. To make this example work took some serious effort, dusting off old knowledge, understanding the nomenclature, and going through the examples I have in the links above.

Please drop me a comment and let me know what you think. Would love to know either way and I'm always looking to improve the content.
