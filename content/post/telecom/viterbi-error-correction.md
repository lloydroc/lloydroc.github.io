---
title: Viterbi Error Correction
date: "2018-10-06T08:30:48Z"
categories:
  - telecommunication
tags:
  - viterbi
---

# {{ <title> }}

I've built a little PSK31 convolutional [encoder](/psk31/cnvenc/) and [decoder](/psk31/cnvdec/) and originally wanted to make a graph showing the error correction capabilities as a function of encoder output length and number of bit errors into the decoder. Making a long story short; I couldn't devise a good method of creating this graph and stuck to hand making error cases to see the performance of the decoder. Note, the quantization for both the encoder and decoder are hard metrics using the Hamming Distance which doesn't perform as good as soft metrics. First, let's define the convolution encoder input and output.


| Convolutional Encoder Input | Convolutional Encoder Output|
|---------------------------------|-----------------------------------|
| 01011100101000100000            | 03210010111311022130              |

If the mapping from the input to the output is confusing see [PSK31 Encoder](/psk31/cnvenc/) for how this result was obtained.

Since a PSK31 encoder has `[n,k,K] = [1,2,5]` where `n` bits in, `k` is the bits out, and `K` is the memory depth we only take in 0's or 1's and get out 0,1,2, or 3. We will use this to create some errors to the output of the convolutional encoder and see if our decoder can find the input of our 0's and 1's.

Here are a couple of test cases from the error correction that it is able to do. The bit errors that were created are show in <span style="color:red">red</span>. Note, despite the errors at the decoder input the Viterbi Decoder was able to correct them all.

| Convolutional Decoder Input | Bits Decoded by Decoder | Description          |
|------------------------------------|-------------------------|----------------------|
|03210010111311022130|01011100101000100000|Zero Errors - reference case|
|032<span style="color:red">0</span>0010111311022130|01011100101000100000|Single Bit error |
|032<span style="color:red">0</span>00101<span style="color:red">0</span>1311022130|01011100101000100000|2 non-adjacent Errors|
|03<span style="color:red">3</span>10<span style="color:red">1</span>101<span style="color:red">0</span>1311022130|01011100101000100000| 3 non-adjacent errors |
|03<span style="color:red">3</span>1<span style="color:red">1</span>01<span style="color:red">0</span>1<span style="color:red">3</span>131<span style="color:red">0</span>02<span style="color:red">3</span>120|01011100101000100000| 6 non-adjacent |

So far I'm pretty impressed on the number of bit errors that the Viterbi Decoder can correct. However, when the decoder cannot correct errors it gets pretty bad quickly. I'll have to have another post on how to deal with a long stream of bad bits.
