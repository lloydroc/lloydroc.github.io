---
categories:
- c
date: "2020-12-02"
lastmod: "2023-07-04"
title: Timestamps in C
---

# {{< title >}}

In this post I'll provide some ways to create, convert and print timestamps using C. We'll first create a Unix epoch which corresponds to seconds since January 1st 1970 at 00:00:00 UTC. We will also represent the epoch in milliseconds, as a double, and finally convert to an ISO 8601 Timestamp. We'll conclude with the challenge of using fractional seconds.

# Table of Contents

{{< toc >}}

# Epoch using `clock_gettime` from `time.h`

Get the epoch in seconds and nanoseconds using `clock_gettime`. This is POSIX.1-2001. We will use `CLOCK_REALTIME` since all implementations will support this per `man 3 clock_gettime`.

{{< highlight c >}}
#define _GNU_SOURCE
#include <time.h>
#include <error.h>

struct timespec tv;
if(clock_gettime(CLOCK_REALTIME, &tv))
  perror("error clock_gettime\n");

tv.tv_sec;   // a long int with seconds
tv.tv_nsec;  // a long with nanoseconds
{{< /highlight >}}

# Epoch using `gettimeofday` from `sys/time.h`

An older method and thus arguably the most portable. Get the epoch in seconds and microseconds.

{{< highlight c >}}
#include <sys/time.h>

struct timeval ts;
gettimeofday(&ts, NULL); // return value can be ignored
ts.tv_sec; // seconds
ts.tv_usec // microseconds
{{< /highlight >}}

# Converting the Epoch to a `double`

Python for example represents the epoch as a number with the integer part as seconds and the decimal part as fractions of a second. For example the double epoch looks like `1607095578.328412294`. We'll have 9 figures after the decimal point for the nanoseconds. Not to say the clock is actually this accurate.

{{< highlight c >}}
double
epoch_double(struct timespec *tv)
{
  char time_str[32];

  sprintf(time_str, "%ld.%.9ld", tv->tv_sec, tv->tv_nsec);

  return atof(time_str);
}
{{< /highlight >}}

Calling looks like:
{{< highlight c >}}
struct timespec tv;

if(clock_gettime(CLOCK_REALTIME, &tv))
  perror("error clock_gettime\n");

// prints 1607095578.328412294
printf("%.9f\n", epoch_double(&tv));
{{< /highlight >}}

# Converting the Epoch to Milliseconds

Java and Javascript like to represent the epoch as an integer in milliseconds. We use our `epoch_double` from above for this call. Note, we will to use `math.h` for the `round` function. Thus, we also need to link with the math library with `-lm`.

{{< highlight c >}}
long int
epoch_millis(struct timespec *tv)
{
  double epoch;
  epoch = epoch_double(tv);
  epoch = round(epoch*1e3);

  return (long int) epoch;
}
{{< /highlight >}}

This call looks like:
{{< highlight c >}}
struct timespec tv;

if(clock_gettime(CLOCK_REALTIME, &tv))
  perror("error clock_gettime\n");

// prints 1607089375345 for 1607089375 seconds and 344958300 nanoseconds
printf("%ld\n", epoch_millis(&tv));
{{< /highlight >}}

# Time in ISO 8601 Format

We can get an ISO 8601 Formatted Timestamp. We'll do some extra work so that we have the factional part of seconds which will make the output look like `2020-12-04T14:20:22.257Z` for example. This function supports only UTC timezones.

{{< highlight c >}}
char *
rfc8601_timespec(struct timespec *tv)
{
  char time_str[127];
  double fractional_seconds;
  int milliseconds;
  struct tm tm; // our "broken down time"
  char *rfc8601;

  rfc8601 = malloc(256);

  memset(&tm, 0, sizeof(struct tm));
  sprintf(time_str, "%ld UTC", tv->tv_sec);

  // convert our timespec into broken down time
  strptime(time_str, "%s %U", &tm);

  // do the math to convert nanoseconds to integer milliseconds
  fractional_seconds = (double) tv->tv_nsec;
  fractional_seconds /= 1e6;
  fractional_seconds = round(fractional_seconds);
  milliseconds = (int) fractional_seconds;

  // print date and time without milliseconds
  strftime(time_str, sizeof(time_str), "%Y-%m-%dT%H:%M:%S", &tm);

  // add on the fractional seconds and Z for the UTC Timezone
  sprintf(rfc8601, "%s.%dZ", time_str, milliseconds);

  return rfc8601;
}
{{< /highlight >}}

To call this function do the following:
{{< highlight c >}}
struct timespec tv;
char *rfc8601;

if(clock_gettime(CLOCK_REALTIME, &tv))
  perror("error clock_gettime\n");

rfc8601 = rfc8601_timespec(&tv);

// prints 2020-12-04T14:20:22.257Z
printf("%s\n", rfc8601);
free(rfc8601);
{{< /highlight >}}

# Fractional Seconds - The Problem

If you either want to convert an epoch from `struct timespec` or from `struct timeval` to a printable time you're stuck dealing with fractional seconds! The `time.h` library doesn't help much.

Why?

When using `time.h` the best method to print time to a string is using the `strftime` function. This function takes the *broken down time*. Let's look at this structure:

{{< highlight c >}}
struct tm {
    int tm_sec;        /* seconds */
    int tm_min;        /* minutes */
    int tm_hour;       /* hours */
    int tm_mday;       /* day of the month */
    int tm_mon;        /* month */
    int tm_year;       /* year */
    int tm_wday;       /* day of the week */
    int tm_yday;       /* day in the year */
    int tm_isdst;      /* daylight saving time */
};
{{< /highlight >}}

What is missing?? I don't see any fractional seconds here!

When we get the epoch we have the following which contain fractional seconds in microseconds and nanoseconds.

In `time.h`
{{< highlight c >}}
struct timespec {
    time_t   tv_sec;  /* seconds */
    long     tv_nsec; /* nanoseconds */
};
{{< /highlight >}}

Or for the `sys/time.h` we have a `timeval`.
{{< highlight c >}}
struct timeval {
   time_t      tv_sec;  /* seconds */
   suseconds_t tv_usec; /* microseconds */
};
{{< /highlight >}}

Both of these give fractional seconds, however, the broken down time in `struct tm` leaves us hanging.

# Accuracy of the Clock

We can use the `clock_getres` function to see our accuracy. I used it like so:

{{< highlight c >}}
void
print_clock_res(struct timespec *tv)
{
  if(clock_getres(CLOCK_REALTIME, tv))
    perror("clock_getres\n");

  if(tv->tv_nsec)
    printf("high resolution accuracy\n");
  else
    printf("low resolution accuracy\n");
}
{{< /highlight >}}

In this case the value of `tv->tv_nsec` was set to `1` and `tv->tv_sec` was set to `0`. There are also ways to link with a high resolution time **hrt** using `-lrt` which I don't have. Ideally, we would know if the accuracy is in milliseconds, microseconds, nanoseconds ....
