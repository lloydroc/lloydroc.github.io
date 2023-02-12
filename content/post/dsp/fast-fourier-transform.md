---
title: Learn the FFT
date: "2023-01-27"
math: true
categories:
 - dsp
---

# {{< title >}}

In this post I'd like to attempt to explain how the Fast Fourier Transform algorithm works. This post is inspired by many attempts others have made that don't really do a good job explaining the FFT. Hopefully, I can do a better job. For explanation we'll use the Cooley–Tukey algorithm which is the most common.

{{< figure src="/assets/svg/fft-butterfly.svg" title="FFT Butterfly Diagram" >}}

Above is the so-called Butterfly Diagram which we will arrive at. Refer to the [Example FFT Computation in C](/post/c/example-fft/) to see a program that will compute the FFT.

# Table of Contents

{{< toc >}}

## DFT Definition

The FFT algorithm makes computation of the Discrete Fourier Transform (DFT) more efficient. Much more efficient depending on the size of the input array the computation is being performed on. 

Here is the how we'll define the DFT.

$$ 
X_k = \sum_ {n=0}^ {N-1}x_n e^{-2 \pi i k n / N} = \sum_ {n=0}^ {N-1}x_n W_{N}^{kn}
$$

where \\( W_{N}^{kn} = e^{-2 \pi i k n / N} \\). Having \\( W_{N}^{kn} \\) will make things easier to keep track of later. The \\( W \\) is short for weight. It's also referred to as a twiddle factor.

The input to the DFT is an array of complex valued numbers. Each element \\( x_n \\) has a real and imaginary part.

## FFT Example of size 8

In my opinion the best to way to understand the FFT is using an example of size 8 or where \\( N = 8 \\). The reason for this is for smaller N we don't have enough stages, and for larger N the math becomes untamely. Stand by as we walk through a concrete example.

$$ 
X_k = \sum_ {n=0}^ {8-1}x_n W_{8}^{kn}
$$

Also, in matrix form for \\( N=8 \\). Visualizing the matrix helps for understanding.

$$ 
\begin{bmatrix}
X_0 \\\\
X_1 \\\\
X_2 \\\\
X_3 \\\\
X_4 \\\\
X_5 \\\\
X_6 \\\\
X_7 \\\\
\end{bmatrix} =
\begin{bmatrix}
W_{8}^{0*0} & W_{8}^{0*1} & W_{8}^{0*2} & W_{8}^{0*3} & W_{8}^{0*4} & W_{8}^{0*5} & W_{8}^{0*6} & W_{8}^{0*7} \\\\
W_{8}^{1*0} & W_{8}^{1*1} & W_{8}^{1*2} & W_{8}^{1*3} & W_{8}^{1*4} & W_{8}^{1*5} & W_{8}^{1*6} & W_{8}^{1*7} \\\\
W_{8}^{2*0} & W_{8}^{2*1} & W_{8}^{2*2} & W_{8}^{2*3} & W_{8}^{2*4} & W_{8}^{2*5} & W_{8}^{2*6} & W_{8}^{2*7} \\\\
W_{8}^{3*0} & W_{8}^{3*1} & W_{8}^{3*2} & W_{8}^{3*3} & W_{8}^{3*4} & W_{8}^{3*5} & W_{8}^{3*6} & W_{8}^{3*7} \\\\
W_{8}^{4*0} & W_{8}^{4*1} & W_{8}^{4*2} & W_{8}^{4*3} & W_{8}^{4*4} & W_{8}^{4*5} & W_{8}^{4*6} & W_{8}^{4*7} \\\\
W_{8}^{5*0} & W_{8}^{5*1} & W_{8}^{5*2} & W_{8}^{5*3} & W_{8}^{5*4} & W_{8}^{5*5} & W_{8}^{5*6} & W_{8}^{5*7} \\\\
W_{8}^{6*0} & W_{8}^{6*1} & W_{8}^{6*2} & W_{8}^{6*3} & W_{8}^{6*4} & W_{8}^{6*5} & W_{8}^{6*6} & W_{8}^{6*7} \\\\
W_{8}^{7*0} & W_{8}^{7*1} & W_{8}^{7*2} & W_{8}^{7*3} & W_{8}^{7*4} & W_{8}^{7*5} & W_{8}^{7*6} & W_{8}^{7*7} \\\\
\end{bmatrix}
\begin{bmatrix}
x_0 \\\\
x_1 \\\\
x_2 \\\\
x_3 \\\\
x_4 \\\\
x_5 \\\\
x_6 \\\\
x_7 \\\\
\end{bmatrix}
$$

### Why do we need to be efficient?

To do this matrix multiply we need \\( 8^2=64 \\) multiplies. In Big O Notation this would be \\( O(N^2) \\). This is because for each \\( X_n \\) we need to multiply 8 times. Realistically, it's \\( 4 \times 8^2 =256 \\) since to multiply complex numbers we need 4 multiplies for the real and imaginary parts.

The reason we need to be concerned with multiplication is that computer processors are slower at multiplication than other mathematical operations such as addition. Long ago they used to be much slower at multiplication than say addition, however, they've gotten faster so this point isn't as strong as it used to be.

Let's take a realistic example of audio sampled at 48kHz. Let's say we wanted to do an FFT every 21ms where \\( N=1024 \\). We then would have \\( 4 \times 1024^2 = 4,194,304 \\) multiplications every 21ms. The 4 here is for the multiplication of complex numbers. That's not a small number of multiplications, they add up very quickly.

Take for example an ARM processor. We can swag a multiply accumulate instruction of a floating point number takes 3 clock cycles - that's a very commendable number of instructions for a multiply. Let's call this 3 floating point operations or FLOPS. For each second we'd have to do this roughly 48 times ( \\( 48 \times 0.021ms \approx 1s \\) ) and that is \\( 3 \times 48 \times 4,194,304 = 603,979,776 \\) instructions per second just for multiplication. This is roughly 600 Mega FLOPS. For a processor running at 1GHz that is a heavy load just to run a 1024 size DFT in realtime.

The FFT can do this computation much more efficiently. Instead of \\( N^2 \\) it will drastically reduce operations to \\( O(N \log_{2} N) \\). For our example of 1024 we would now have \\( 4 \times 1024 \times 10 = 40,960 \\) multiplies for the 21ms. We'd then have a total of \\( 40,960 \times 48 \times 3 = 5,898,240 \\)  multiplies. This is roughly 6 Mega FLOPS which is a factor 10 smaller than what we had above without using the FFT.

## Before the Math Starts

The Cooley-Tukey FFT algorithm breaks the DFT into smaller DFTs. Sometimes this is referred to as *recursion*. There are three parts to this algorithm that we should highlight before we get to the math.

1. We will divide the even and odd indices of our input \\( x_n \\) as many times as it takes to get tuples
2. When we compute each part of \\( X_n \\) we will do this in stages where we can use computations from previous stages.
3. We will exploit the symmetry of the cosine and sine functions to reduce our work.

Breaking down a time series into even and odd parts is also called *"Decimation in Time"*. For audio say our input to the FFT is a series of samples in time.

## Breaking the DFT into even and odd parts

Let's start with an example with an input of size 8. Watch me break this down into 3 stages until we arrive with 4 pairs of tuples:

$$
\begin{pmatrix}
x_0 & x_1 & x_2 & x_3 & x_4 & x_5 & x_6 & x_7
\end{pmatrix}
$$

$$
\begin{pmatrix}
x_0 & x_2 & x_4 & x_6
\end{pmatrix}
\begin{pmatrix}
x_1 & x_3 & x_5 & x_7
\end{pmatrix}
$$

$$
\begin{pmatrix}
x_0 & x_4
\end{pmatrix}
\begin{pmatrix}
x_2 & x_6
\end{pmatrix}
\begin{pmatrix}
x_1 & x_5
\end{pmatrix}
\begin{pmatrix}
x_3 & x_7
\end{pmatrix}
$$

As you can see there is a logarithmic pattern here. Each time we cut the elements in each group by half.

## Derive Decimation in time for the General Case

Let's now take the DFT function and break it down into two DFTs by even and odd numbered indices:

$$ 
\sum_ {n=0}^ {N-1}x_n e^{-2 \pi i k n / N}
= \sum_ {m=0}^ {N/2-1}x_{2m} e^{-2 \pi i k (2m) / N} + \sum_ {m=0}^ {N/2-1}x_{2m+1} e^{-2 \pi i k (2m+1) / N}
$$

$$ 
\sum_ {n=0}^ {N-1}x_n e^{-2 \pi i k n / N}
= \sum_ {m=0}^ {N/2-1}x_{2m} e^{-2 \pi i k (2m) / N} + e^{-2 \pi i k / N} \sum_ {m=0}^ {N/2-1}x_{2m+1} e^{-2 \pi i k (2m) / N}
$$

$$
W_{N}^{kn} = e^{-2 \pi i k n / N}
$$

$$
\sum_ {n=0}^ {N-1}x_n W_{N}^{kn}
= \sum_ {m=0}^ {N/2-1}x_{2m} W_{N/2}^{km} + W_{N}^{k} \sum_ {m=0}^ {N/2-1}x_{2m+1} W_{N/2}^{km}
$$

Let us summarize this into even \\( E_k \\) and odd parts \\( O_k \\).

$$
X_k = E_k + W_N^k O_k
$$

As an exercise to the reader we can also drive the following.
$$
X_{k+\frac{N}{2}} = E_k - W_N^k O_k
$$

This leaves us with the following:

$$
X_k = E_k + W_N^k O_k
$$
$$
X_{k+\frac{N}{2}} = E_k - W_N^k O_k
$$

Let's stop to look at what we've derived.
1. The DFT \\( X_k \\) we broke down to an even \\( E_k \\) and odd part \\( O_k \\)
2. The DFT is symmetric as the \\( X_k \\) and \\( X_{k + \frac{N}{2}} \\) differs by only a minus sign on the odd part \\( O_k \\).
3. The odd part is multiped by a constant \\( W_N^k \\) that doesn't depend on \\( n \\) or the inputs \\( x_n \\).

Now we can keep breaking the even and odd parts further until we cannot do so anymore. This will leave us with groups of tuples.

## Example FFT of size 8

Let's take an example FFT of size 8. Again, size 8 is the *Goldilocks* example as it gives us 3 stages to work with and the math is manageable. The algorithm will break into 3 stages since \\( \log_2{8} = 3 \\). We will start with the smallest pair as the algorithm is *recursive*. This will make sense later when we look at the butterfly diagram.

### Recursive Breakdown

Let's use 3 steps to break down the FFT. As you'll see 3-stages is the farthest we can break it down.

$$
\begin{equation}
\begin{split}
X_k & = \sum_ {n=0}^ {8-1}x_n W_{8}^{kn} \\\\
    & = \sum_ {m=0}^ {4-1}x_{2m} W_{4}^{km} + W_{8}^{k} \sum_ {m=0}^ {4-1}x_{2m+1} W_{4}^{km} \\\\
    & = ( \sum_ {p=0}^ {2-1}x_{2p} W_{2}^{kp} + W_{4}^{k} \sum_ {p=0}^ {2-1}x_{2p+1} W_{2}^{kp}) + W_{8}^{k}( \sum_ {p=0}^{2-1}x_{2p} W_{2}^{kp} + W_4^k \sum_{p=0}^{2-1}x_{2p+1} W_{2}^{kp})  \\\\
    & = (x_0+x_4 W_2^k) + W_4^k (x_2+x_6 W_2^k) + W_8^k ( (x_1+x_5 W_2^k) + W_4^k (x_3+x_7 W_2^k))
\end{split}
\end{equation}
$$

For the last equation we used \\( W_2^0=1 \\) and \\( p=2m \\) for example \\( 2p+1=4m+2 \\) for a fully broken down DFT of size 8.

### Stage 1: Four sets of Tuples

For our first stage we will compute, and store in temporary locations each of the inner most expressions:

$$
\begin{align}
   S_1^0 &= (x_0+x_4 W_2^k) \\\\
   S_1^1 &= (x_2+x_6 W_2^k) \\\\
   S_1^2 &= (x_1+x_5 W_2^k) \\\\
   S_1^3 &= (x_3+x_7 W_2^k)
\end{align}
$$

As we'll see later the weights \\( W_2^k \\) only take on 2 values, leaving 8 values to store.

### Stage 2: Two parts of Four 

$$
\begin{align}
   S_2^0 &= S_1^0 + W_4^k S_1^1 \\\\
   S_2^1 &= S_1^2 + W_4^k S_1^3
\end{align}
$$

Although we have two equations Stage 2, the weight \\( W_4^k \\) can take on 4 different values. Again, we have 8 values to store.

### Stage 3: One part of Eight

$$
\begin{align}
   S_3^0 &= S_2^0 + W_8^k S_2^1
\end{align}
$$

For our third stage we only have one equation, however \\( W_8^k \\) can take on 8 values and thus we have 8 values to store. 

## Exploit the Symmetry of the Weights

Now we need to look at the following weights \\( W \\). We can think of these as the values that are taken on as we walk around the unit circle in steps. The size of the steps depends on the subscript.

For our example we have 3 different weights to analyze:
$$
\begin{align}
   W_2^k \\\\
   W_4^k \\\\
   W_8^k
\end{align}
$$


### Around the Unit Circle in half's

When we have \\( W_2^k \\) we only have 2 values as we walk around the unit circle in half's. We are hopping between these two values.


{{< figure src="/assets/svg/unit-circle-halfs.svg" title="Going around the Unit Circle in two hops" >}}

Let's break this down into 8 values as we have for our example.

$$ W_2^k = e^{- \pi i k } = (-1)^k = 
\begin{bmatrix}
    1 \\\\
    -1 \\\\
    1 \\\\
    -1 \\\\
    1 \\\\
    -1 \\\\
    1 \\\\
    -1
\end{bmatrix}
$$

This weight only takes on two values \\( W_2^k =\\in \\{ 1 , -1 \\} \\).


### Around the Unit circle in fourths

For the weights \\( W_4^k \\) we are going around the unit circle in fourths. We will have 4 different values we can have around the unit circle.

{{< figure src="/assets/svg/unit-circle-fourths.svg" title="Going around the unit circle in four hops" >}}

Let's show this for each value of \\( k \\).

$$
W_4^k = e^{- \pi i k / 2 } =
\begin{bmatrix}
    1 \\\\
    -i \\\\
    -1 \\\\
    i \\\\
    1 \\\\
    -i \\\\
    1 \\\\
    i
\end{bmatrix}
$$

This weight takes on 4 values \\( W_4^k =\\in \\{ 1 , -1, i, -i \\} \\). Note, we only have really 2 values that differ by sign.

### Around the Unit circle in eights

For the weights \\( W_8^k \\) we are going around the unit circle 8 times. We will have 8 different values we can have around the unit circle.

{{< figure src="/assets/svg/unit-circle-eights.svg" title="Going around the unit circle in eight hops" >}}

Let's show this for each value of \\( k \\).

$$
W_8^k = e^{- \pi i k / 4 } =
\begin{bmatrix}
    1 \\\\
    \frac{1}{\sqrt{2}}(1-i) \\\\
    -i \\\\
    \frac{1}{\sqrt{2}}(-1-i) \\\\
    -1 \\\\
    \frac{1}{\sqrt{2}}(-1+i) \\\\
    i \\\\
    \frac{1}{\sqrt{2}}(1+i) \\\\
\end{bmatrix}
$$

This weight takes on 8 values. However, we really only have 3 values when we look at the symmetry of the upper left quadrant and the other 3 quadrants.

## Butterfly Diagram

Let's take our fully broken down equation:

$$
X_k
= (x_0+x_4 W_2^k) + W_4^k (x_2+x_6 W_2^k) + W_8^k ( (x_1+x_5 W_2^k) + W_4^k (x_3+x_7 W_2^k)) 
$$

Let's take some example values of the result from bins of the FFT, \\( X_0, X_1, X_4 \\).

$$
\begin{align}
X_0 &= (x_0+x_4) + (x_2+x_6) + (x_1+x_5) + (x_3+x_7) \\\\
X_1 &= (x_0 - x_4) -i (x_2 - x_6) + \frac{1}{\sqrt{2}}(1-i) ( (x_1 -x_5) - i (x_3 - x_7)) \\\\
X_4 &= (x_0 + x_4) + (x_2 + x_6) - ( (x_1 +x_5) + (x_3 + x_7))
\end{align} 
$$

Note, the symmetry of \\( X_0 \\) and \\( X_4 \\).

Now, we can take the equations above to leap to the butterfly diagram below. For each stage we can utilize the results from previous stages to reduce computational load.

{{< figure src="/assets/svg/fft-butterfly.svg" title="FFT Butterfly Diagram" >}}

The butterfly diagram above has the weights or twiddle factors we have represented by \\( W \\) left out. However, to arrive at each stage we use the examples above. The ingenious aspect of this algorithm is that the we can compute partial parts of each \\( X_k \\) in each stage and use these computations for later stages.

[Contact Me](/about/#contact-me) for any issues or improvements that can be made to this post.