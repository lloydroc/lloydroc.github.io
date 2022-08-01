---
categories:
 - hardware
tags:
 - gpio
date: 2021-05-17
title: Using libgpiod to detect input events
---

One of the most fundamental requirements for GPIO is the ability to execute user defined code when an *external event* has happened. This is typically done when a GPIO pin, configured as an input, changes from high-to-low, or low-to-high. In this case we detect on the falling edge or rising edge of this pin change. For example a sensor we communicate through GPIO has data ready. In the microcontoller world this is called as an interrupt where the CPU will change it program counter and handle the interrupt. The interrupt makes sense when we have no Operatating System. In the case of Linux and the Raspberry Pi it's not an interrupt but considered an *event* as we likely have in interrupt deep inside the kernel code, however, we're several levels of abstraction past this. Unix has the "Universal File Model" so this input pin is mapped to a file. With Unix we have many multiple ways to know if "events" have happened to this file. Examples of events are that the file is ready for reading, writing, or other events have happened.

The above can be quite abstract, but what we're doing is simple. When a pin on our Raspberry Pi's header transitions from high-to-low or low-to-high we want to know about it so our code can use this logic. Note, we could poll for this transition where we just wait until it changes. If we do it this way we're stuck doing only one thing at a time. Polling for the pin to change state method has many issues that I won't go into.

# Circuit

I'm going to use the same circuit from [GPIO Input with libgpiod](/post/hardware/libgpiod-input-rpi/). We're going to use GPIO Line 4.

# Using gpiomon to detect events

The glorious thing about `libgpiod` is we can use the command line tools before we write any code. When I toggle my switch on and off from the circuit above we can see how the `gpiomon` program behaves.

{{< highlight bash >}}
$ gpiomon gpiochip0 4
event:  RISING EDGE offset: 4 timestamp: [    6069.635294302]
event: FALLING EDGE offset: 4 timestamp: [    6073.162199768]
event:  RISING EDGE offset: 4 timestamp: [    6074.515545017]
event: FALLING EDGE offset: 4 timestamp: [    6075.472309646]
event:  RISING EDGE offset: 4 timestamp: [    6076.245828241]
event: FALLING EDGE offset: 4 timestamp: [    6076.953254051]
event:  RISING EDGE offset: 4 timestamp: [    6078.277888971]
{{< / highlight >}}

# C Code to Monitor Events

We can use the `libgpiod` code to monitor events. This code looks very similar to polling.

{{< highlight c >}}
// file input.c
#include <gpiod.h>
#include <error.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/time.h>

struct gpiod_chip *chip;
struct gpiod_line_bulk lines;
struct gpiod_line_bulk events;

int
main(int argc, char *argv[])
{
  unsigned int offsets[1];

  int values[1];
  int err;
  struct timespec timeout;

  chip = gpiod_chip_open("/dev/gpiochip0");
  if(!chip)
  {
    perror("gpiod_chip_open");
    goto cleanup;
  }

  // use pin 4 as input
  offsets[0] = 4;
  values[0] = -1;

  err = gpiod_chip_get_lines(chip, offsets, 1, &lines);
  if(err)
  {
    perror("gpiod_chip_get_lines");
    goto cleanup;
  }

  err = gpiod_line_request_bulk_rising_edge_events(&lines, "rising edge example");
  if(err)
  {
    perror("gpiod_line_request_bulk_rising_edge_events");
    goto cleanup;
  }

  // Timeout of 60 seconds, pass in NULL to wait forever
  timeout.tv_sec = 60;
  timeout.tv_nsec = 0;

  printf("waiting for rising edge event\n");

  err = gpiod_line_event_wait_bulk(&lines, &timeout, &events);
  if(err == -1)
  {
    perror("gpiod_line_event_wait_bulk");
    goto cleanup;
  }
  else if(err == 0)
  {
    fprintf(stderr, "wait timed out\n");
    goto cleanup;
  }

  err = gpiod_line_get_value_bulk(&events, values);
  if(err)
  {
    perror("gpiod_line_get_value_bulk");
    goto cleanup;
  }

  for(int i=0; i<gpiod_line_bulk_num_lines(&events); i++)
  {
    struct gpiod_line* line;
    line = gpiod_line_bulk_get_line(&events, i);
    if(!line)
    {
      fprintf(stderr, "unable to get line %d\n", i);
      continue;
    }
    printf("line %s(%dn", gpiod_line_name(line), gpiod_line_offset(line));
  }

cleanup:
  gpiod_line_release_bulk(&lines);
  gpiod_chip_close(chip);

  return EXIT_SUCCESS;
}
{{< / highlight >}}