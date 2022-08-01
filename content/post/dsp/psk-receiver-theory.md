---
title: BPSK Receiver Theory
date: "2021-02-17"
math: true
categories:
 - dsp
 - psk
---

Let's look at some BPSK Receiver Theory. This is the 3rd post in the PSK Series. We'll cover the theory before we go into the implementation.

# PSK Series

Here is a summary of where we are in the PSK Series.
1. [BPSK Transmit Theory](/post/dsp/psk-transmit-theory/) - This post shows graphs and has audio files of what this tool does.
2. [BPSK Implementation](/post/dsp/psk-transmitter-implementation/)
3. [BPSK Receiver Theory](/post/dsp/psk-receiver-theory/) - This Post
4. BPSK Receiver Implementation - Coming Soon
5. QPSK - Coming Soon

# What are we going to receive?

See my previous post on [BPSK Transmitter Theory](/post/dsp/psk-transmit-theory/) for what the waveform transmitted. For this post we'll receive and decode this waveform. Effectively, we're sending symbols that are Root Raised Cosine waveforms multiplied with sinusoids. Below is the encoded text `t` represented by our alphabet as \\( 10100 \\). Note, the amplitude of \\( ~1000 \\), all the "peaks" both positive and negative, and the duration between the peaks. We'll delve into all these details shortly.

{{< figure src="/assets/svg/psk31/bpsk_transmission_t_rrc.svg" >}}

We need to build a receiver to guess the bits transmitted from the waveform above. It should be decoded to \\( 10100 \\) which maps to our alphabet as the character \\( t=101\\) followed by a stop of \\( 00 \\).

# Our Matched Filter

Here are our matched filters, which are our basis functions we used to generate symbols.
{{< figure src="/assets/svg/psk31/bpsk_carrier.svg" >}}

Our Basis Functions are simple \\(cos(t)\\) functions multiplied by a Root Raised Cosine filter. I'm leaving the multiplication out for simplicity in the definition below.

\\[ 0 \rightarrow \phi_0(t) = cos(2\pi f t + 0), 0 \le t \le T_s \\]
\\[ 1 \rightarrow \phi_1(t) = cos(2\pi f t + \pi), 0 \le t \le T_s \\]

The take-away here is when we send a \\( 0 \\) bit we effectively see \\(cos(2\pi f t)\\) for a symbol period \\( T \\) and when we send a \\( 1 \\) bit we transmit a \\(cos(2\pi f t + \pi)\\) for a symbol period \\(T\\). The receiving process is to guess which phase was sent of the basis function.

We can convolve what we receive with only one of the basis functions \\( \phi_0(t) \\) and use a Phase Locked Loop as described below to detect which basis function was transmitted. This boils down to what phase a of a \\(cos\\) was transmitted.

# Convolving the Received signal with our Matched Filter

Let's look at [Convolving](/post/c/convolution/) our received waveform with our matched filter. The matched filter will give us the best SNR. People pedantically prove this maximized SNR all over the internet. All we're doing here is convolving the entire received waveform with the same Root Raised Cosine we used to create the waveform when it was transmitted. It makes a lot of sense to correlate the received waveform to what was transmitted.

{{< figure src="/assets/svg/psk31/bpsk_convolution_matched.svg" >}}

Note, the power of our basis functions is essentially \\( 5.9e^7\\). Each basis function is longer than a symbol period so we get some leakage from symbol to symbol. This is how we're seeing roughly \\( 6e^7 \\) for the maximum and minimum at each symbol period.

Here is what is important in this graph.
1. The green lines are \\( 0.032ms \\) apart which corresponds to the maxima/minima for each symbol. If we could sample at one place to guess for a \\( 0 \\) or \\( 1 \\) the green lines would be the place. But as you'll see it doesn't make much sense to just sample at one place for a symbol, we'd be throwing out a ton of good data to make our guess.
2. An `x` corresponds to a local maxima/minima or a *peak* output from the convolution between our signal and the matched filter.
3. For this example we have 4 cycles per symbol. Thus, we have 8 `x` marks per symbol since each cycle has 2 peaks. However, due to low amplitude we chop off one 'x', leaving 7 peaks per symbol. Each set of 7 is a new symbol and the set corresponds to \\(10100\\). Therefore, we have \\(7*5=36\\) peaks.
4. We go from an amplitude of \\( 1000 \\) in our basis functions to nearly \\( 6e^7 \\) after the convolution. Should we be worried about bit overflow on our data types? Yes! Also, this large range makes threshold detection easier with so much headroom.
5. Each peak with an `x` corresponds to a positive or negative phase of our basis functions. More on this regarding Phase Locked Loops...

# Phase Locked Loops

Our job is to decode BPSK. The P here stands for Phase and the phase is a big part of decoding obviously. As we transmit symbols we're shifting the phase of a carrier. Let's repeat our basis functions again.

\\[ 0 \rightarrow \phi_0(t) = cos(2\pi f t + 0), 0 \le t \le T_s \\]
\\[ 1 \rightarrow \phi_1(t) = cos(2\pi f t + \pi), 0 \le t \le T_s \\]

When we look at the figure above, each `x` mark will align in time to the phase for \\( \phi_0(t) \\) or \\( \phi_1(t) \\). Each `x` will correspond to phase for an entire symbol period. As a matter of fact, discounting drift, this phase will align for all symbols transmitted during a symbol duration.

So what is a *Phase Lock* in this context? We will lock the phase of our peaks in the 1st symbol received to the phase shift of \\( \pi \\). This is because we ALWAYS will transmit a \\( 1 \\) first because of how the PSK31 alphabet works. We will be relating the sign (+/-) of the `x` to the output of a Phase Locked Loop. If it's a bit confusing, I agree, it took me a while to grasp this point.

# Generating our Phase Locked Loop Function

Let's outline creation of our Phase Locked Loop function. Again, this function allows us to align the phase of each symbol to guess whether it's a \\( 0 \\) bit or \\( 1 \\) bit that was transmitted.
1. For the first symbol period, and the first symbol period only, we will find the peaks. See above there are 7 `x` marks for the first symbol.
2. In this first symbol period we will find the peak with the largest magnitude. This corresponds to the peak at \\( t=0.096 \\) with a value of \\( -62730531 \\) or \\( ~6e^7 \\) among friends.
3. We will take the time \\( t=0.096 \\) and *lock* the phase of a \\( cos(2\pi)=1 \\). This phase will correspond to our \\( \phi_1(t) \\). Let's call this function \\(PLL(t)\\)
4. Now that we have this phase for any time \\(t\\) we correspond the amplitude of our phase locked function. A positive amplitude corresponds to a positive phase or a symbol \\( 1 \\) and a negative amplitude corresponds to a negative phase \\(0\\). By positive and negative amplitudes I'm thinking values near \\(1\\) and \\(-1\\).

The phase for \\(PLL(t)\\) is
\\[ \phi_{pll} = \omega-2\pi = 2\pi(ft-1) \\]

Where
\\[ PLL(t) = cos(2\pi ft - \phi_{pll}) \\]

For our example \\(f=125Hz\\). We can do the following computations:

\\[ \phi_{pll} = 2\pi(125*0.096-1) = 2\pi(12-1) = 22\pi \\]

Thus, we have

\\[ PLL(0.096) = cos(2\pi12-22\pi) = cos(2\pi) = 1 \\]

## The Phase Locked Loop is our Magic 8-Ball

What is amazing here is our Phase Locked Loop function will tell us for every `x` on the figure above the phase of our transmitted sinusoid, there are 36 of them in total. Sorry, it's a bit hard to read the following values of \\( t \\) off the graph. I have them below though. I'm handpicked some and am not going to show all 36.

| Symbol # | t        | y         | PLL(t) | Symbol Guess |
|----------|----------|-----------|--------|--------------|
| 0        | 0.096000 | -62730531 | 1.00   | 1            |
| 0        | 0.088125 | -39491674 | 1.00   | 1            |
| 0        | 0.100000 | 60867936  | -1.00  | 1            |
| 1        | 0.128000 | 66875555  | 1.00   | 0            |
| 1        | 0.131875 | -61727000 | -1.00  | 0            |

I just picked some points at random corresponding to `x`'s on the figure. We can make a guess for what the symbol is by taking the sign of the amplitude multiplied by \\( PLL(t) \\). When the sign is negative this corresponds to \\(cos(\pi)=-1\\) and when the sign is positive this corresponds to \\(cos(0)=1\\). Remember, the first 7 `x`s in the figure correspond to a symbol of \\( 1 \\) and the next 7 `x`s correspond to a symbol of \\( 0 \\).

If we sum up all the values of \\( y*PLL(t) \\) and take the **sign** we can use binary logic to guess the bit transmitted. The logis is: if the sign is negative the symbol transmitted was a \\( 1 \\) and if it was positive the value transmitted was a \\(0\\). Effectively, we'll do \\( 7 \\) multiplications per symbol period and sum them up and take the sign. The result will be a stream of \\( 0 \\)'s and \\( 1\\)'s which is \\(10100\\) corresponding to the text `t`. A reverse lookup from the alphabet is all that's needed.

# Receiver Implementation Summary

How would we receive this? Let's provide an outline:

1. Convolve what is received with our matched filter. This matched filter is a basis function corresponding to the symbol that relates to transmission of a \\( 0 \\) bit.
2. When the convolution output has peaks above a threshold, for a long enough amount of time, handwave .. handwave ... we can make guesses. This amount of time needs to be at least \\(3 \\) symbol periods \\( T \\), since it's the shortest possible alphabet sequence.
3. We do peak finding and correleate each peak to what symbol it's in. The peaks last in \\(T=0.032ms\\) chunks.
4. A Phased Locked Look will determine the phase of each peak (both positive and negative).
5. For each symbol period we can accumulate the amplitude at that time, multiplied by the phase locked loop output at the time. The sign of the multiplicative sum will determine if a \\( 0 \\) or a \\( 1 \\) was transmitted.
6. From step 5 we will have a bit stream of guesses such as \\( 10100 \\). From here we will take the bit stream and reverse lookup using our alphabet for the text that was sent.

The steps above are definitely not the only way to do receive PSK. The challenge with receiving PSK is phase is so sensitive to time. If guess the phase wrong, you flip a bip. Depending how you do it you can be off for the whole duration or off regionally.

## What I left out

1. Choosing the amplitude at which to start recording and guessing is a bit of black magic as far as I know ...
2. The phase locked loop can be continually adjusted. For a long bit seqeunce setting the phase for the PLL at the first symbol will be susceptible to drift.

## A Short Rant on PSK Theory Text

Whenever I read theory text explaining PSK they usually mention sampling at multiples of the symbol period \\( T \\) and mention something about a **synchronous** or **coherent** receiver. These texts try to explain that the timing of the transmitter and receiver are in sync. This makes the reception easy since you can just look at the output of the convolution from the matched filter every \\( T \\) seconds.

In order to build a system where a receiver and transmitter are in good time lock and you can sample every \\( T \\) seconds is not easy! I'd argue that is harder than transmitting and receiving PSK altogether. These requirements for a **synchronous** transmitter and receiver design are rarely mentioned as a big hurdle for complexity, cost and design. These designs would typically use GPS, real-time operating systems, PLLs, and very accurate timing.

In the implementation above is **asynchronous** and we will have to guess that first bit. Sometimes this is known as *clock recovery*. Knowing the transmission always starts with \\( 1 \\) and sample at intervals of \\( T \\) from the highest output of our correlation with our matched filter is what allows us to implement an asynchronous receiver. A lot can go wrong if we guess wrong, and our guess has to be a good one or our phase is off and everything goes bad. I've rarely seen Textbooks delve into these details.
