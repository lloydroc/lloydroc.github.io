---
layout: default
---

# PSK31
The purpose is to create Open Source PSK31 software where communication is possible over PSK31. At this point this is a long term goal. This software should be easy to use an port to various platforms and devices. By that I mean that is the software should be easily compilable on Arduino, Raspberry Pi, Beagle Bone, PC, Mac OS X, Linux ... Then comes the actual radio that work in progress as well, expecially where we have the option to output baseband audio through a DAC or soundcard.  In the short term we'll go through software implemenation around overall PSK31 communcations system.

## PSK31 Communications System
* QPSK - Quadrature Phase Shift Keying
* [Raised Root Cosine Filtering](/psk31/rrc/)
* [Convolutional Encoding](/psk31/cnvenc/)
* [Convolutional Decoding using a Viterbi Decoder](/psk31/cnvdec/)
* Codebook Mapping
