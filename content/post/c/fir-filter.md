---
categories:
  - c
  - telecommunication
tags:
  - signal-processing
date: "2019-08-19T16:00:21Z"
title: Implementing FIR Filters in C
---

# {{ <title> }}

Implementing FIR filters in C is much easier if we make use of the static variables declared in our functions. In this blog post we will create some simple example FIR filters, and get their impulse response. To understand this post you will have to have the basic theory of FIR filtering down.

### FIR Filter Implementation

There are a lot of ways to implement a FIR filter in C. The method provided makes the implementation simple because we can simply put the last time sample into the filter and the filtered result will come out. The filter function itself will handle the delay line of the time samples. It's a bit abstract so let's take an example of just creating a delay line of samples. Then later we'll add in the FIR filter coefficients.

### An Example Delay Line

Before we go into the FIR filter implementation, let's first look at how we'll be implementing the FIR filters in general. We are going to statically initialize a delay line and each time a sample comes in we'll shift samples down the line.

{{< highlight c >}}
int example_delay_line4(int xn)
{
  static int xv[5] = {0,0,0,0,0};

  xv[4] = xv[3];
  xv[3] = xv[2];
  xv[2] = xv[1];
  xv[1] = xv[0];
  xv[0] = xn;

  return xv[4];
}
{{< / highlight >}}

What this function does is hold 5 samples in the `xv` array. We don't exactly need to store the 5th sample, but do since it makes it easier later on for loops. The element `xv[0]` will be the latest sample and `xv[4]` will be the oldest sample. In discrete mathematics this is referred to as `x[n]` and `x[n-4]`. Since we initialized `xv` as static, the variables will be saved for us on each function call.

Let's look at how the `example_delay_line` function can work.

{{< highlight c >}}
int
main(int argc, char *argv[])
{
  int x[9] = {1,2,3,4,5,0,0,0,0};
  int y;

  for(int i=0;i<9;i++)
  {
    y = example_delay_line4(x[i]);
    printf("%d,",y);
  }

  return 0;
}
{{< / highlight >}}

Running this program yields the output of:

```
0,0,0,0,1,2,3,4,5,
```

From this output we can see the array of `x[]` is delayed by 4 samples, or shifted to the right by 4 samples. The zeros in the first 4 samples are the statically initialized elements of the `xv` array in the `example_delay_line4()` function.

### Implementing a Basic Filter
Now that we have the delay line example behind us it's time to implement a basic filter. We will apply this basic filter to our delay line. More properly we will convolve our filter with the delay line. We will define our filter taps, or filter coefficients in an array called `h[]`. Our delay line will be the same but we will multiply corresponding filter taps by corresponding delay line elements. What I'm describing here is a convolution between the filter and the time samples in the delay line example.

{{< highlight c >}}
int example_fir_filter(int xn)
{
  // filter coefficients
  // in a real design these need
  // not be static and defined
  // in this function
  static int h[5] = {1,-2,3,-2,1};

  // filter gain if applicable
  static int hg = 1;

  // delay line of time samples
  static int xv[5] = {0,0,0,0,0};

  // filter output
  int yn = 0;

  // implementation of delay line
  xv[4] = xv[3];
  xv[3] = xv[2];
  xv[2] = xv[1];
  xv[1] = xv[0];
  xv[0] = xn;

  // convolve delay line by
  // filter coefficients
  for(int i=0;i<5;i++)
  {
    yn += h[i]*xv[i];
  }

  // apply gain
  yn = hg*yn;

  return yn;
}
{{< / highlight >}}

### Getting the FIR Filter Impulse Response

Now that our basic FIR Filter is implemented we'll get the impulse response of this filter by doing a 1D convolution on the impulse response.

{{< highlight c >}}

int
main(int argc, char *argv[])
{
  int y;
  int imp[10] = {0,1,0,0,0,0,0,0,0,0};

  for(int i=0;i<10;i++)
  {
    y = example_fir_filter(imp[i]);
    printf("%d,",y);
  }

  return 0;
}
{{< / highlight >}}

Here we define our impulse function as `imp[]`. We shift over the impulse function by one time sample and we put it through our filter. As you can see our filter coefficients are the result of our output.

```
0,1,-2,3,-2,1,0,0,0,0,
```

### Where to Go from Here?

Now that we've implemented a FIR Filter and confirmed it's impulse response the next step would be to create a FIR Filter with the properties we desire. This would be a low pass, band pass or high pass filter. Once we know what we should filter we would design it with say a Butterworth, Chebyshev, Bessel, Gaussian, Elliptic digital filter type.

We have only 5 filter taps above which is really not enough to effectively filter. Any type of real-world FIR Filter would have a larger number coefficients. We also need not define the filter coefficients in the filter function itself and can be externally defined since they normally would not change.
