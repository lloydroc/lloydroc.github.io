---
categories:
- c
comments: true
date: "2022-12-27"
title: Time Conversion in C
---

# {{< title >}}

In the Unix Operating System we have multiple ways that time can be represented: as a epoch, broken down and as a string. Conversion between these three representation can be cumbersom. This blog post outlines the ways time is represented in the C programming language and provides a reference for conversions. Many other languages will follow very closely or exactly to what is done in C.

{{< figure src="/assets/png/c-time-conversion.png" title="C Time Conversion between epoch, broken down time and strings" >}}

# Representations of Time

We have the following representations of time.

1. Epoch based. These time representations caputure the number of seconds since January 1, 1970 00:00:00 UTC. As clocks have gotten more accurate we've added micro-seconds and nano-seconds.
2. Broken Down Time. With this representation we have different values stored in a structure for years, months, days ...
3. String Time. A `char *` representing a time in a specific format.

## Epoch Based Time

The `<time.h>` header defines the `time_t` type as seconds since the Epoch - January 1, 1970 00:00:00 UTC. We have the following three types of increasing accuracy from second, microsecond (us), to nanosecond (ns).

| Type            | s | us | ns |
|-----------------|---|----|----|
| time_t          | x |    |    |
| struct timeval  | x | x  |    |
| struct timespec | x |    | x  |

### Basic Epoch in seconds

The `time_t` typedef will define the epoch in seconds. On a typical PC or server this will be a 64-bit unsigned integer.

### Epoch with the Timeval Structure

The `struct timeval` will allow for microsecond accuracy via the `tv_usec` member.

{{< highlight c >}}
struct timeval
{
    time_t tv_sec; /* Seconds since the epoch */
    suseconds_t tv_usec; /* Micro seconds */
};
{{< / highlight >}}

### Epoch with the Timespec Structure

The `struct timesec` will allow for nanosecond accuracy via the `tv_nsec` member.

{{< highlight c >}}
struct timespec
{
    time_t tv_sec; /* Seconds since the epoch */
    long int tv_nsec; /* Nano seconds */
};
{{< / highlight >}}

The `timespec` is the same as the `timeval` but instead of microseconds has nanoseconds.

## Broken Down Time

If we have an epoch in seconds it becomes cumbersome to know what year, month and hour the time is in. Especially when timezones are concerned. This is why we have the following known as "broken down time".

{{< highlight c >}}
/* ISO C `broken-down time' structure.  */
struct tm
{
  int tm_sec;     /* Seconds.	[0-60] (1 leap second) */
  int tm_min;     /* Minutes.	[0-59] */
  int tm_hour;    /* Hours.	[0-23] */
  int tm_mday;    /* Day.		[1-31] */
  int tm_mon;     /* Month.	[0-11] */
  int tm_year;    /* Year	- 1900.  */
  int tm_wday;    /* Day of week.	[0-6] */
  int tm_yday;    /* Days in year.[0-365]	*/
  int tm_isdst;   /* DST.		[-1/0/1]*/

  long int tm_gmtoff;   /* Seconds east of UTC.  */
  const char *tm_zone;  /* Timezone abbreviation.  */
};
{{< / highlight >}}

Note, that broken down time has seconds as the smallest unit. We don't see microseconds or nanoseconds as members in the structure.

## Time represented in String

Normally for human consumption. If we wanted a time printed into something like `2022-12-27 18:31:01Z` then we'd need to convert from an Epoch or broken down time and format it into a string. The `strftime` and `strptime` functions allow conversions between strings and broken down time. The `ctime` function allows us to go directly from an epoch to a string bypassing the broken down time.

See [examples](/post/c/c-timestamp-epoch) of this formatting and conversion.
