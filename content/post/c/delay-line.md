---
title: Delay Lines in C
categories:
 - c
tags:
 - signal-processing
date: "2020-03-23T08:43:05Z"
---

There are many scenarios where a delay line is needed in signal processing. Scenarios ranging from Digital Filters, Convolution, Reverberation, Echo and others. Delay lines have a fixed length of **N** samples. When delay lines take in a new sample they discard the oldest sample. In this post we discuss how delay lines work and implement a delay line in the C programming language.

# A Theoretical Delay Line

For our purposes we will store primitive data types in an array. We'll spare for this example both non-primitive data types, as well as, non-contiguous memory. The primitive data type in this array would be any of the following types: **int**, **char**, **complex**, **double**, or **float**. The memory for the delay line is monotonically increasing and continuous, meaning all memory addresses for samples are next to one another. Essentially, we'll have a `int delay[N]` to declare our delay line. The delay line will store **N** samples. With each new sample we'll throw out the oldest sample. Below is a figure to depict the state of the delay line on each new sample received.

{{< figure src="/assets/svg/delayline.svg" title="delay line data structure" >}}

## Implementation Rules of the Delay Line

* We'll always store **N** latest samples
* Each new sample will overwrite the oldest sample
* Once the delay line is full all memory locations will have a valid time sample
* The delay line allows for random access access where samples are ordered from newest to oldest. For example `delay_line[1]` gets the previous time sample and `delay_line[0]` gets the latest time sample.

## Is a Delay Line a Circular Buffer?

There are data structures namely a *circular buffer*, *ring buffer*, *cyclic buffer*, or *circular queue* that are very similar to a delay line. The delay line is circular and has a fixed size but there are the following distinctions. In many cases using a Circular Buffer would work for a Delay Lines. Here are some differences though in the usage between delay lines and circular buffers.

* Delay Lines are typically only written a sample at a time. Circular Buffers can be written with N bytes.
* Delay lines are accessed by time sample. E.g. the access will be time sample zero `t[0]` to `t[N-1]`.
* We don't have a read and write pointer. Only a current pointer that points to `t[0]`.
* Every memory address in our delay line is always used once we've collected N samples. The delay line will be full of time samples at all time. The next time sample it will throw out the oldest sample and put in the newest.

# Using the Delay Line

To use the delay line we have the following process:
1. Create a `struct delay_line`
2. Set `delay_line.size` to the number of samples required for the delay line
3. Allocate the memory and initialize the delay line with `dl_create`
4. Add time samples with `dl_add`
5. Access time samples with `dl_get`
6. De-allocate the memory and de-initialize the delay line with `dl_destroy`

In the code below we create two delay lines of size 3 and of size 10. We then insert time samples into the delay line and access them back. All the `asserts` will evaluate to true.

{{< highlight c >}}
// file: main.c
#include "../config.h"
#include <stdio.h>
#include <assert.h>
#include "delayline.h"

int
main(int argc, char *argv[])
{
  // our delay line structure
  struct delay_line dl;

  // make a delay line with 3 samples
  dl.size = 3;

  // allocate and initialize
  dl_create(&dl);

  // add 3 time samples with values 0,1,2
  dl_add(&dl, 0);
  dl_add(&dl, 1);
  dl_add(&dl, 2);

  // if size is 3 and we added 3 samples
  // curr will be pointing to the tail
  assert(dl.tail == dl.curr);

  // get the 3 samples back
  // they are in reverse order
  assert(dl_get(&dl, 0) == 2);
  assert(dl_get(&dl, 1) == 1);
  assert(dl_get(&dl, 2) == 0);

  // add some more samples
  dl_add(&dl, 3);
  dl_add(&dl, 4);

  // fetch those samples back
  assert(dl_get(&dl, 0) == 4);
  assert(dl_get(&dl, 1) == 3);
  assert(dl_get(&dl, 2) == 2);

  // de-allocate the memory
  dl_destroy(&dl);

  // let's create another delay line
  // with 10 samples
  dl.size = 10;

  // allocate memory and initialize
  dl_create(&dl);

  // we'll add samples and fetch them
  // back asserting they're right
  for(int i=0;i<dl.size*10;i++)
  {
    dl_add(&dl,i);
    assert(dl_get(&dl,0) == i);
    if(i > 0)
      assert(dl_get(&dl,1) == (i-1));
  }

  // de-allocate memory
  dl_destroy(&dl);

  return 0;
}
{{< / highlight >}}


# C Header for a Delay Line

The C header file will define the API to use for the delay line. We have the ability to create and destroy the delay line. We can also add samples and fetch the samples. This delay line implementation has a `head` pointer which points to where memory starts. A `tail` pointer which points to the last sample, and a `curr` pointer which points to the latest sample.

{{< highlight c >}}
// file: delayline.h
#ifndef DELAYLINE
#define DELAYLINE
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

/* a structure to hold
 * all the pointers and
 * size of our delay line
 */
struct delay_line
{
  // pointer to our allocated memory
  int *head;

  // pointer to the last int our allocated memory
  int *tail;

  // pointer to the latest sample
  int *curr;

  // size of our delay line in number of samples
  size_t size;
};

/* we'll allocate the memory on the heap
 * for the delay line and set the pointers
 * so the delay line can be used.
 * A return value of 0 will indicate
 * success.
 */
int
dl_create(struct delay_line *dl);

/* we'll free up the memory allocated for
 * the delay line and set all members of
 * the structure to zero. A return value
 * of 0 will indicate success.
 */
int
dl_destroy(struct delay_line *dl);

/* Add a time sample to the delay line. The
 * sample is the value of the delay line.
 */
void
dl_add(struct delay_line *dl, int sample);

/* get a time sample back from the delay line.
 * The return value will be the value. The
 * t_offset will be time samples back. For
 * example t_offset=0 will be the latest time
 * sample and t_offset=3 will be the 3 time
 * samples from the latest. Calling this function
 * over and over again has no effect as it doesn't
 * discard sample or change any pointers in the
 * delay line.
 */
int
dl_get(struct delay_line *dl, int t_offset);

#endif
{{< / highlight >}}

# C Implementation of a Delay Line

Below is the implementation of a delay line in C.

{{< highlight c >}}
// file: delayline.c
#include "delayline.h"

int dl_create(struct delay_line *dl)
{
  if(dl->size == 0)
    return -1;

  dl->head = (int *) calloc(dl->size, sizeof(int));
  if(dl->head == NULL)
  {
    perror("allocating memory for delay line");
    return -1;
  }
  dl->tail = dl->head + (int) dl->size - 1;
  dl->curr = dl->tail;
  return 0;
}

int dl_destroy(struct delay_line *dl)
{
  free(dl->head);
  memset(dl, 0, sizeof(struct delay_line));
  return 0;
}

void dl_add(struct delay_line *dl, int sample)
{
  dl->curr++;
  if(dl->curr > dl->tail)
    dl->curr = dl->head;
  *dl->curr = sample;
}

int dl_get(struct delay_line *dl, int t_offset)
{
  int sample;
  int* ptr;
  int diff;
  ptr = dl->curr-t_offset;
  if(ptr < dl->head)
  {
    diff = dl->head - ptr;
    ptr = dl->tail - diff + 1;
  }
  sample = *(ptr);
  return sample;
}
{{< / highlight >}}

# Where to go from here?

This delay line has type `int` which may not be suitable for your application. It would need to be modified to the data type for the application. Once that is sorted out it can be used for reverb, digital filters, echo, and all sorts of applications that use delay lines.

# Downloading and Running the Code

Download the [delayline-1.0.tar.gz](/code/delayline-1.0.tar.gz) code and run the following commands. Note, use of the `CFLAGS` with the `-g` flag so that the `assert` statements can run.

{{< highlight bash >}}
$ wget http://lloydrochester.com/code/delayline-1.0.tar.gz
$ tar zxf delayline-1.0.tar.gz
$ cd delayline-1.0
$ ./configure
$ CFLAGS="-g -O3" make
$ ./src/delayline
{{< / highlight >}}



