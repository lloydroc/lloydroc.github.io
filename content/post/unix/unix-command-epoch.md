---
title: Unix Command for Epoch Time
date: "2022-02-06"
categories:
 - unix
---

This post provides some examples using the Unix [date(1)](https://man7.org/linux/man-pages/man1/date.1.html) command to interact with Epoch Time. We commonly need to print or parse the Epoch.

# Print the Epoch

Using the Unix `date` command we can print the Epoch. We need to use the `%s` format.

{{< highlight bash >}}
$ date +%s
1644156059
{{< / highlight >}}

The `%s` format is *seconds since the Epoch (1970-01-01 00:00 UTC)*. The Epoch is always in the UTC or *Zulu*  time zone.

# Parsing the Epoch

If we have an Epoch Time and want to parse it we can use the `date` command. **This will NOT work in Mac OS X**.

{{< highlight bash >}}
$ date --date='@1644156059'
Sun Feb  6 02:00:59 PM UTC 2022
$ date -d='@1644156059' # shorter argument
Sun Feb  6 02:00:59 PM UTC 2022
$ date +%F --date='@1644156059' # also format to a new time
2022-02-06
$ TZ='America/Denver' date --date='@1644156059' # timezone conversion
Sun Feb  6 07:00:59 AM MST 2022
{{< / highlight >}}

## Parse the Epoch in Mac OS X

In Mac OS X we can parse the Epoch as follows.

{{< highlight bash >}}
$ date -ur 1644156059
Sun Feb  6 14:00:59 UTC 2022
$ date -r 1644156059 # for local time
Sun Feb  6 07:00:59 MST 2022
date -r 1644156059 +%F # without default format
2022-02-06
{{< / highlight >}}

# Print the current time in UTC

With the `-u` or `--utc` option we can print the date in UTC.

{{< highlight bash >}}
$ date -u
Sun Feb  6 02:13:01 PM UTC 2022
{{< / highlight >}}

# Print the Epoch with Bash

If you have `bash` version 5 or higher the environment variable `EPOCHSECONDS` contains the value of the Epoch.

{{< highlight bash >}}
$ echo $EPOCHSECONDS
1644156059
{{< / highlight >}}