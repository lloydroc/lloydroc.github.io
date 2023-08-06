---
title: Retry in Bash
date: "2020-09-21"
categories:
 - unix
---

# {{< title >}}

In this blog post we'll have two examples in `bash` that will retry in the following ways:

* Retry a command N times before failing
* Retry command for X minutes before failing

In both of these examples we'll use `true` and `false` as examples to test the script. These would need to be changed for your use case.

# Retry a Command X Times

A script to run a command N times. We will fail after 3 attempts, and delay for 10 seconds between attempts.

## Failure Output

Here is what a failure looks like:
{{< highlight bash >}}
$ ./nretry
failure ... retrying 3 more times
failure ... retrying 2 more times
failure ... retrying 1 more times
command was not successful after 3 tries
$ echo $?
1
$
{{< / highlight >}}

## Success Output

Here is the output when we need 0 retries and it works on the first try.

{{< highlight bash >}}
$ ./nretry
success!
$ echo $?
0
$
{{< / highlight >}}

## Bash Script

Here is the script. Note, to change the `until false` to `until somecommand`. This script will try 3 times and sleep 10 seconds between retries.

{{< highlight bash >}}
#!/bin/bash

RETRY_NUM=3
RETRY_EVERY=10

NUM=$RETRY_NUM
until false
do
  1>&2 echo failure ... retrying $NUM more times
  sleep $RETRY_EVERY
  ((NUM--))

  if [ $NUM -eq 0 ]
  then
    1>&2 echo command was not successful after $RETRY_NUM tries
    exit 1
  fi
done

echo success!
{{< / highlight >}}

# Retry a Command for X Minutes

A script to run a command X minutes before timing out and failing. We will retry for a total 1 minute and try every 10 seconds.

## Failure Output
{{< highlight bash >}}
$ ./xretry
failure ... retrying after 10 seconds
failure ... retrying after 10 seconds
failure ... retrying after 10 seconds
failure ... retrying after 10 seconds
failure ... retrying after 10 seconds
failure ... retrying after 10 seconds
command was not successful after 1 minute
$ echo $?
1
$
{{< / highlight >}}

## Success Output
{{< highlight bash >}}
$ ./xretry
success!
$ echo $?
0
$
{{< / highlight >}}

## Bash Script

Here is the script. Hopefully, the variables are self-explanatory. Note, we would change `until false` with `until somecommand` for a full example.

{{< highlight bash >}}
#!/bin/bash

RETRY_MINS="1 minute"
RETRY_STOP=$(date -d "$RETRY_MINS" +%s)
RETRY_EVERY=10

until false
do
  echo 1>&2 failure ... retrying after $RETRY_EVERY seconds
  sleep $RETRY_EVERY

  now=$(date +%s)
  if [ $now -ge $RETRY_STOP ]
  then
    1>&2 echo command was not successful after $RETRY_MINS
    exit 1
  fi
done

echo success!
{{< / highlight >}}
