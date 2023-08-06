---
categories:
 - c
tags:
 - convolution
date: "2020-04-14"
math: true
title: A CLI Tool to Recommend Text
---

# {{ <title> }}

Computers are fast at comparing one string to another, however, when we need to find which string is *closest* to other strings things become more challenging. In this post we'll create an command line utility that will recommend a string by comparing it to a list of strings. We'll recommend the string that is the *closest* one to our input string.

Spell checkers and search engines have similar algorithms to this to recommend and match queries for search results.

## An Example
Starting with a simple example. Say you have a list of strings:

{{< highlight json >}}
["create", "read", "update", "delete"]
{{< / highlight >}}

Can we write an algorithm to find out which string is *closest* to the misspelled string `"craete"`? It's easy to see `craete` is *closest* to `create`, but how can we make a computer tell us this? Our program will **recommend** the first entry `create` because it has the highest correlation metric. How will we do this? We will cross-correlate the string `"create"` with each string in our list and take the string with the highest cross-correlation metric. This correlation function is very similar to [convolution](/post/c/convolution/). Convolution multiplies numbers, we will instead compare the number of character matches. The correlation metric is very similar to the distance metrics of Hamming and Levenshtein. Meaning the *Hamming Distance* would be how many characters are the same, and the *Levenshtein Distance* how many edits needed make each string equal.

# Now Slide to the Right ...

Check out this animation of text correlation. One word slides through the other. Vertically we mark a \\( 1 \\) when there is a match, and horizontally sum all the matches. When a character matches it will turn red. We show the sum to the right which is either \\( 0 \\), \\( 1 \\), or \\( 4 \\).

{{< figure src="/assets/svg/text-correlation.svg" title="Text Correlation by Comparing number of same characters each Shift" >}}

# Tabular Representation of the Correlation

What we show in the animation we can break down into tabular form. Note, we ignore when there is no overlap. That is wasted computation.

{{< highlight text >}}
i = 0
e
create
------
000000 = 0 matches

i = 1
te
create
------
000000 = 0 matches

i = 2
ete
create
------
001000 = 1 matches

i = 3
aete
create
------
000000 = 0 matches

i = 4
raete
create
------
001000 = 1 match

i = 5
craete
create
------
110011 = 4 matches

i = 6
 craet
create
------
 00100 = 1 match

i = 7
  crae
create
------
  0001 = 1 match

i = 8
   cra
create
------
   000 = 0 matches

i = 9
    cr
create
------
    00 = 0 matches

i = 10
     c
create
------
     0 = 0 matches
{{< / highlight >}}

From this operation we get a resulting cross-corelation function \\( y[n] \\). The values of \\( y[n] \\) fall directly out of the figure above:

\\[ y[0] = 0\\]
\\[ y[1] = 0\\]
\\[ y[2] = 1\\]
\\[ y[3] = 0\\]
\\[ y[4] = 1\\]
\\[ y[5] = 4\\]
\\[ y[6] = 1\\]
\\[ y[7] = 1\\]
\\[ y[8] = 0\\]
\\[ y[9] = 0\\]
\\[ y[10] = 0 \\]

The max value, our correlation metric, is \\( y[5] = 4 \\).



# Using the Program

Here is how the output looks. The first argument to the `recommend` program will be the subject string will be cross-correlated to all the others. The remaining arguments are the exact strings.

{{< highlight bash >}}
$ recommend craete create read update delete
create
$ recommend abc def fs ab aacd def xabcx
xabcx
$
{{< / highlight >}}

In the first example the command line tool finds that `craete` is most like `create`. In the second example it finds that `abc` is most like `xabcx` in the list.

# The Mathematics Behind the Algorithm

Let's look at a textbook example of cross-correlation. This function \\( y[n] \\) is the cross-correlation result by cross-correlating \\( h[n] \\) with \\( x[n] \\). Think for example purposes that \\( h \\) is `craete` and \\( x \\) is one of the strings from the list. Instead of \\( h \\) and \\( x \\) being numeric valued functions they are take on ASCII or UTF-8 characters.

\\[ y[n] = \sum_{i=0}^{N} h[i]*x[i+n] \\]

This equation does a numeric multiply. Instead, of this we will have a function where if they are equal it's a \\( 1 \\), if they are not equal, it's \\( 0 \\).

Take for example our string `craete` we will correlate `create` with it.

Let's slide `craete` through `create` to cross-correlate it. Since the length of both is \\( 6 \\) we will have \\( 6+6-1=11 \\) total computations to do. We will only count vertically how many matches there are. Our index \\( i \\) will be the shift. We will shift from \\( 0 \\) to \\( 10 \\) which are the ways that the two can overlap.

# Pseudo-Code for a Text Correlation Algorithm

This program does the following:
1. We take the input `craete` for example
2. For each of the provided words we get the max value of the cross-correlation function \\( y[n] \\). The max of the function is \\( 4 \\) for `craete`, \\( 1 \\) for `read`, \\( 2 \\) for `update`, \\( 3 \\) for `delete`.
3. For each word we store the cross-correlation metric and compare it to max metric for each word. We'll take the max of all metrics. In this case it's \\( 4 \\) corresponding to `create`. Sheesh, `delete` did get close at 3, just one away!
4. We then recommend `create` from step \\( 3 \\) since it has the highest correlation metric of 4.

Now, why didn't I choose a shorter example? That would have been smart ...

# C Header file for Text Correlation for Recommending

Here is a C-header file. The `correlate` function takes arguments for `h` and `x` and returns an array `y`. The array `y` is of type `int` and has the number of matches at each shift. For the recommendation algorithm we don't really need the function `y`, but do need `y_max`

{{< highlight c >}}
// filename correlate.h
#ifndef CORRELATE
#include <stdlib.h>

// helper functions to get the min and max of two numbers
#define MIN(X, Y) (((X) < (Y)) ? (X) : (Y))
#define MAX(X, Y) (((X) < (Y)) ? (Y) : (X))

/**
 The correlate function will correlate two char arrays h and x
 and will return a pointer to y which has the correlation values
 at each shift. The value of y_len will be h_len+x_len-1.
 The value y_max will be the max value found in y.
*/
int*
correlate(char h[], char x[], int h_len, int x_len, int* y_len, int* y_max);

#endif
{{< / highlight >}}

# C Implementation of Text Correlation for Recommending

Here is the implementation of a text correlation algorithm for recommending. There are a number of performance improvements we can make. We'll discuss those improvements later. It should be noted that `y_max` at is maximum can be `h_len`. You cannot have more matches than the length of the string in `h`!

{{< highlight c >}}
#include "correlate.h"

int*
correlate(char h[], char x[], int h_len, int x_len, int* y_len, int* y_max)
{
  int i, j, m;
  int h_start, x_start, x_end;
  int *y;

  *y_len = h_len+x_len-1;
  m = 0;

  y = calloc(*y_len, sizeof(int));

  for (i=0; i<*y_len; i++)
  {
    x_start = MAX(0,i-h_len+1);
    x_end   = MIN(i+1, x_len);
    h_start = MAX(0, h_len-i-1);

    for(j=x_start; j<x_end; j++)
    {
      if(h[h_start++] == x[j]) y[i] += 1;
    }
    m = MAX(m, y[i]);
  }
  *y_max = m;
  return y;
}
{{< / highlight >}}

# C function to run the Text Correlation and Recommend

Let's look at a program that will take the inputs and recommend. The usage of this function is at the top of this post.

{{< highlight c >}}
// file: main.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "correlate.h"

void
print_usage(char *progname);

int
main(int argc, char *argv[])
{
  int arg;
  char *h, *x;
  int hlen, xlen, ylen, ymax, max;
  int *y;
  char *recommend = NULL;

  if(argc < 2)
  {
    print_usage(argv[0]);
    return EXIT_FAILURE;
  }

  max = 0;
  h = argv[1];
  hlen = strlen(h);
  for(arg=2; arg<argc; arg++)
  {
    x = argv[arg];
    xlen = strlen(x);

    y = correlate(h, x, hlen, xlen, &ylen, &ymax);
    free(y);

    if(ymax > max)
    {
      recommend = x;
      max = ymax;
    }
  }

  if(recommend == NULL)
  {
    return EXIT_FAILURE;
  }

  printf("%s", recommend);

  return EXIT_SUCCESS;
}


void
print_usage(char *progname)
{
  printf("usage: %s test words\n", progname);
}
{{< / highlight >}}

# Downloading the Example

Download the example [recommend](/code/recommend-1.0.tar.gz). Here is how to run it.

{{< highlight bash >}}
$ wget http://lloydrochester.com/code/recommend-1.0.tar.gz
$ tar zxf recommend-1.0.tar.gz
$ cd recommend
$ ./configure
$ make
$ make check
$ sudo make install # if you want to install it locally
$ ./src/recommend craete create read update delete
create
$
{{< / highlight >}}

# How we can Improve the Algorithm?

The correlation is quite slow and inefficient. One big improvement is having a minimum threshold on how much overlap between the words. For instance, trying to match just the first or last character could give 1 match, but is 1 match really worth it? On that same point once we've already done a number of shifts we could give up if it doesn't meet our minimum. If we get a full match where the max is equal to the length of the subject string we could stop computing and return. Let me know in the comments how you'd improve it and what you think!
