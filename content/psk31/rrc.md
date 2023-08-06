---
title: Root Raised Cosine Filter in C
categories:
  - telecommunication
tags:
  - signal-processing
  - convolution
date: "2019-02-13"
lastmod: "2020-04-18"
---

# {{< title >}}

# Root Raised Cosine Filtering

The PSK31 Standard uses [Root Raised Cosine Filters](https://en.wikipedia.org/wiki/Root-raised-cosine_filter) as a matched filter. Our PSK31 signal is convolved by the Root Raised Cosine waveform to mimimize Inter-Symbol Interference. For this project we can easily compute the RRC filter and then convolve it with our output stream. For the computation of the RRC we need a couple of constants specific to the PSK31 standard.

{{< figure src="/assets/svg/rootcosine.svg" title="A Root Raised Cosine Waveform" >}}

{{< highlight c >}}
beta: we will use 0.5 as a damping factor
T: We will use half of the symbol duration so 0.032/2=0.016
SAMPLE_RATE: 48000.0
ts: In our case we will use the audio standard of 1/48kHz
{{< / highlight >}}

With these constants above we can compute a Root Raised Cosine filter with the following code. Note, the `sinc` function is needed to create the Root Raised Cosine Filter.

The creation of the array will look as follows:

{{< highlight c >}}
int lenRC = 0; // will be 9217 for this case
float *rrc = RootRaisedCosineFilter(0.5,0.032/2,1.0/SAMPLE_RATE,&lenRC);
{{< / highlight >}}

Now, let's see inside this function to find out how the Root Raised Cosine Filter `rrc[]` is computed.

File: rootcosinefilt.c
{{< highlight c >}}

float sinc(float x)
{
  return x == 0.0 ? 1.0 : sin(M_PI*x)/M_PI/x;
}

float* RootRaisedCosineFilter(float beta, float T, float ts, unsigned long* lenRC)
{
  float t;
  const int Nsymb = 12;
  const float samp_per_symb = T/ts;
  unsigned long N = (unsigned long) Nsymb*samp_per_symb+1;
  (*lenRC) = N;
  float *rc = (float *) calloc(N,sizeof(N));

  float max = 0.0;
  float shift = -Nsymb*T/2.0;
  for(int i=0;i<N;i++)
  {
    t = shift+ts*((float) i);

    if(fabs(t) == T/2.0/beta)
    {
      rc[i] = M_PI*sinc(1.0/2.0/beta)/Nsymb/T/2.0;
      continue;
    }
    float tv = t/T;
    float tvb = beta*tv;
    float t1 = sinc(tv)/T;
    float t2 = cos(M_PI*tvb);
    float t3 = 1-pow(2.0*tvb,2);
    rc[i] = t1*t2/t3;
    if(rc[i]>max)
    {
      max = rc[i];
    }
  }
  for(int i=0;i<N;i++) rc[i] /= max;
  return rc;
}
{{< / highlight >}}
