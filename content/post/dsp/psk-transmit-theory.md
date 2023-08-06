---
title: BPSK Transmitter Theory
date: "2021-01-14"
math: true
categories:
 - dsp
 - psk
---

# {{< title >}}

In this post we'll get into the theory of Binary Phase Shift Key - BPSK. We'll then get into the implementation of the transmitter, followed by the same for the receiver. The transmitter will have text as input, for output we will produce an audio .wav file and a CSV file for analysis. I created a bunch of graphs which really illustrate some of the theory.

# Transmit Process

Let's start with the overall transmit process.

1) We will take ASCII text as Input. For example the text *abc*
2) Convert the text to \\( 0 \\)'s and \\( 1 \\)'s by mapping each character to our *code alphabet*. These are called *symbols*
3) Create an analog signal by converting symbols to *analog signals*. We'll obviously sample these analog signals since we're in the digital world.

In #3 we say *analog signals* which since we're on a computer will be analog waveforms sampled at some rate. The sampling will be 16-bit signed samples at an 8kHz sampling rate.

# Our BPSK Specification

I'm going to use the specification for PSK31. This is an Amateur Radio scheme that is used today here are the specifications we need to know. Here is what I'd call the [Official PSK31 Specification](https://det.bi.ehu.es/jtpjatae/pdf/p31g3plx.pdf).

* The Symbol Rate is \\( 31.25 \\) Baud, this corresponds to a \\( 32ms \\) symbol duration.
* The frequency \\( f_c \\) of our basis functions is fixed, but varies from \\( 0 \\) to \\( 4000 \\) Hz.
* See the specification for the alphabet.
* The code words are *varicode* and the length depends on an analysis of text. More frequency text is shorter.

## PSK31 Alphabet Characteristics

* Varicode is used so frequent characters are shorter than longer ones
* The shortest code is \\( 1 \\) which is for a space, the longest is \\( 10 \\) bits
* All codes start with \\(1 \\) and also end with \\( 1 \\)
* All codes have two \\( 0 \\)'s in it
* Between codes we have a *rest* which is two consecutive \\( 0 \\) symbols. For example a *t* which translates to \\( 101 \\) will really be \\( 10100 \\) when we add in the *rest*.

# Transmit Example

Let's take an example of transmitting the text \\( t \\). I'm going to chose \\( t \\) because in our *code alphabet* we have \\( t=101 \\) which is short and simple. Thus, the text \\( t \\) will get converted to the symbols \\( 10100 \\).

Now that we have the symbols \\( 10100 \\) we will "key" them to different phases of a sinusoid, hence, our *basis functions*.

## Symbol Translation to Basis Functions

We convert/key our symbols \\( 1 \\) and \\( 0 \\) to our frequencies. We can call these the *basis functions*

\\[ 0 \rightarrow \phi_0(t) = cos(2\pi f_c t + 0), 0 \le t \le T_s \\]
\\[ 1 \rightarrow \phi_1(t) = cos(2\pi f_c t + \pi), 0 \le t \le T_s \\]

Here \\( f_c \\) can vary. So just consider when we transmit a \\( 1 \\) we will send a \\( cos \\) with no phase shift for \\( 32ms \\) and a \\( 0 \\) is a \\( cos \\) with a \\( \pi \\) phase shift.

# Example Transmission

Let's stop for a moment and look what a transmission of PSK will look like.

{{< figure src="/assets/svg/psk31/bpsk_transmission_t.svg" >}}

There are a couple things to note from this graph.
* The carrier frequency of \\( \phi(t) \\) is slowed down. We only have 4 cycles per symbol corresponding to \\( 125 Hz \\). This frequency can vary. Having it slowed down makes viewing the graph easier.
* The function \\( \phi(t) \\) has an amplitude of \\( 1024 \\). We start out going from \\( 0 \\) to \\( 1024 \\), this is a problem will discuss later.

# Audio Example

What if we take the example transmission from above and play it? What I did is take *The quick brown fox ..* and convert it to a mono `.wav` file. You can see a long string of \\( 0 \\)'s and \\( 1 \\)'s below.

```
The quick brown fox jumps over the lazy dog. -> 1101101001010110011001001101111110011011100110100101111001011111100100101111100101010011100110101100111100100111101001110011011111001001111010110011011100111011001111110010111001001110011110110011001010100100101001010110011001001101100101100111010101001011101001001011010011100101101100101011100
```

This text is \\( 44 \\) characters in length which gets converted to \\( 295 \\) binary digits. It starts to add up when you add the \\( 00 \\) rest symbols in.

Here is the audio.

WARNING! You might want to turn down your speakers and only listen to this once. I'm not responsible for any damage to your hearing or speakers!

{{< rawhtml >}}
<audio controls="controls">
  <source src="/assets/wav/lazydog.wav"/>
</audio>
<p></p>
{{< /rawhtml >}}

The change I made here is the cycles per symbol was set to \\( 14 \\) which corresponds to \\( \frac{14}{0.032} = 437.5 Hz \\). The amplitude of our basis functions is \\( 1024 \\). We needed the higher frequency as \\( 125 Hz \\) is too low for some audio systems.

Can you hear the clicks? This is because our phase shifts so wildly. We're making our speakers go from \\( 1024 \\) to \\( -1024 \\) over one time sample. It's effectively an impulse function. This wreaks havoc on the frequency response and the transmitter equipment.

What's the answer? Pulse shaping!

# Pulse Shaping

Now to get rid of these clicks we need to shape our pulses so they start and end at \\( 0 \\) amplitude. Smooth them out a bit. This smoothing will limit the bandwidth. We can multiply each of our *basis functions* with a [Root Raised Cosine](/psk31/rrc/). Note, the Root Raised Cosine is merely one of the many choices we have. It works well since it satisfies the Nyquist ISI criteria and is easy to implement.

{{< figure src="/assets/svg/psk31/rrc.svg" >}}

The factor \\( \beta \\) will control how fast both sides damp to zero. I chose \\( \beta = 0.1 \\) so we can see the oscillations go out many multiples of our symbol period \\( T \\). A \\( \beta \\) of \\( 0.9 \\) would have almost no oscillation and hug close to \\( 0 \\).

Here is what is important to look at on this plot:
* The main lobe has zero crossings at \\( -\frac{T}{2} \\) and \\( \frac{T}{2} \\)
* Other zero crossings are at multiples of \\( \frac{T}{2} \\), this allows us to satisfy the Nyquist ISI Criteria
* When we use this pulse shape a symbol will last longer than \\( T \\). This makes the implementation more challenging as we'll see later. The reason is when we add a symbol in time we need to account for the spillover from the previous symbol.
* The main lobe takes away from our transmitted power. Just imagine the area of it compare to a rectangle. The rest of the power is in the side lobes which leaks into other symbols.

When we shift these pulses around they align at the zero crossings.

{{< figure src="/assets/svg/psk31/multrrc.svg" >}}

# PSK Pulse with Pulse Shaping

When we multiply our basis function of a basic cosine with our Root Raised Cosine Pulse we arrive at something that looks like so:

{{< figure src="/assets/svg/psk31/rrccos.svg" >}}

The power envelope is smooth and is easy on our transmitter. The pulse shape makes for a small bandwidth signal. Note, the green plot is what we'll be transmitting, and the blue is just a envelope over it.

Let's now look at what the symbols \\( 10100 \\) look like now that we have pulse shaping. Note, we slow down the frequency of the carrier to what we had in the previous example to \\( 125 Hz \\).

{{< figure src="/assets/svg/psk31/bpsk_transmission_t_rrc.svg" >}}

Look closely at the peaks for each pulse, note how the highest one - not by much is or is not phase shifted. Also, note how the pulses interfere with one another as they are not perfectly symmetric. Can you make out \\( 10100 \\) from this plot? Think how you might build a receiver to detect it!

# Audio of BPSK Transmission with Pulse Shaping

Now let's see and hear what our new transmitted signal looks like with pulse shaping. This audio corresponds to the text below.

```
The quick brown fox jumps over the lazy dog. -> 1101101001010110011001001101111110011011100110100101111001011111100100101111100101010011100110101100111100100111101001110011011111001001111010110011011100111011001111110010111001001110011110110011001010100100101001010110011001001101100101100111010101001011101001001011010011100101101100101011100
```

The carrier frequency is \\( 437.5 Hz \\) as before.

{{< rawhtml >}}
<audio controls="controls">
  <source src="/assets/wav/lazydog_rrc.wav"/>
</audio>
{{< /rawhtml >}}

Hear how smooth and nice it sounds! Now not only can you see how the pulse shaping changes the transmitted signal but hear the difference! One other thing to note, the pulse shaping takes away power-per-symbol. It doesn't sound as loud.

# What's Next?

This all banks on me not running out of steam! I _hope_ to have a six part series on this.

1. [BPSK Transmitter Theory](/post/dsp/psk-transmit-theory/) - this post
2. [BPSK Transmitter Implementation](/post/dsp/psk-transmitter-implementation/)
3. BPSK Receiver Theory
4. BPSK Receiver Implementation
5. QPSK Theory
6. QPSK Implementation
