---
title: Convolution Examples
date: "2021-01-11"
math: true
categories:
 - dsp
---

Understanding [convolution](/post/c/convolution/) is not complete without some examples to visual the results. These examples are meant to aid in one's ability to visualize the result of a convolution. It's most important to flip one function horizontally and slide it through the other. As this function slides through we multiply and sum to obtain the result of the convolution.

Convolution is used _mainly_ in two ways:
1. To mathematically determine how correlated two functions are
2. To shape a function by convolving it with another function. Examples would be filtering, smoothing, etc ...

Note: There are some typos in the frequency labels for some of the sinusoids I need to fix. You can trust the graphs.

# How the examples are organanized

Each example will be organized in the following way. Let's first take the equation for convolution.

$$ y[t] = \sum\_{i=-n_1}^{n_2} x[i]*h[t-i] $$

For each example \\( h[t] \\) will be the first function we show followed by \\( x[t] \\) and \\( y[t] \\).

1. An Introduction to the example and why it's important
2. The functions \\( h[t] \\) ,\\( x[t] \\) and \\( y[t] \\).

For reference the x-axis is meant to be as simple as possible and not distract from the example. Attention should be paid to the shape of the result \\( y[t] \\). We have 100 samples for each time unit. Thus, from 1 to 2 we have 101 samples.

# Two Squares

The textbook example of two squares. When they perfectly overlap at k

{{< figure src="/assets/svg/convolution-examples/rect.svg" title="A Rectangle" >}}

{{< figure src="/assets/svg/convolution-examples/conv-rect-rect.svg" title="Convolutional Result of a Rectangle Convolved with a Rectangle" >}}

## Remarks

* The amplitude is 1 at \\( t=3 \\)
* The result of the convolution is 2 units wide since each of the squares are 1 unit wide
* The slope of the line is 1 and -1

# Two Sinusoids

{{< figure src="/assets/svg/convolution-examples/sin.svg" title="A Sinusoid sin(x)" >}}
{{< figure src="/assets/svg/convolution-examples/negsin.svg" title="A Sinusoid sin(-x)" >}}

{{< figure src="/assets/svg/convolution-examples/conv-sin-sin.svg" title="Two Sinusoids Convolved Together" >}}

# Phase Shifted Sinusoids

{{< figure src="/assets/svg/convolution-examples/cos.svg" title="A Sinusoid cos(x)" >}}
{{< figure src="/assets/svg/convolution-examples/sin.svg" title="A Sinusoid sin(x)" >}}

{{< figure src="/assets/svg/convolution-examples/conv-cos-sin.svg" title="Phase Shifted Sinusoids" >}}

# A Sinusoid with another of Double Frequency

{{< figure src="/assets/svg/convolution-examples/sinhalf.svg" title="A Sinusoid sin(x)" >}}
{{< figure src="/assets/svg/convolution-examples/sin2.svg" title="A Sinusoid sin(2x)" >}}

{{< figure src="/assets/svg/convolution-examples/conv-sin-sin2.svg" title="A Sinusoid and another with double frequency" >}}


# A Sinusoid with another of 3 Times the Frequency

{{< figure src="/assets/svg/convolution-examples/sinhalf.svg" title="A Sinusoid sin(x)" >}}
{{< figure src="/assets/svg/convolution-examples/sin3.svg" title="A Sinusoid sin(3x/2)" >}}

{{< figure src="/assets/svg/convolution-examples/conv-sin-sin3.svg" title="A Sinusoid and another with double frequency" >}}

# A Root Raised Cosine and Two Impules

{{< figure src="/assets/svg/convolution-examples/impulses.svg" title="Two Impulse Functions" >}}
{{< figure src="/assets/svg/convolution-examples/rrc.svg" title="A Root Raised Cosine" >}}

{{< figure src="/assets/svg/convolution-examples/conv-imp-rrc.svg" title="Two Impules with a Root Raised Cosine" >}}


