---
title: Timer example in systemd
date: "2022-07-09"
categories:
 - unix
 - systemd
---

# {{< title >}}

We can use `systemd` instead of cron timers in Unix. Using `systemd` timers is easy and provides numerous benefits over using Cron which are documented below. These timers more are complicated than cron, however, they are much more powerful.

# Creating a `systemd` timer

Let us look at the logical hierarchy of a timer on systemd and the files associated before we look at an example.

## Logical Requirements

To create a `systemd` timer the following are required:
1. A service of type `oneshot` that executes the program
2. A timer that will run the oneshot service on an interval
3. A program that needs to run at specified times

## Files Required

We will create three files for these requirements:
1. Install `example.service` in the directory `/lib/systemd/system/`
2. Install `example.timer` in the directory `/lib/systemd/system/`
3. Install `example` script in the directory `/usr/local/bin/`

# Quickstart

Here are the commands to install, run, and verify the timer is working:

{{< highlight bash >}}
$ sudo bash create-example-timer # the script below installs required systemd
$ sudo systemctl start example.timer # let systemd run the timer
$ sudo systemctl status example.timer # see when the timer will activate
$ sudo systemctl status example # see the status of the service and exit code of the script
$ ls -l /tmp/example # we see file timestamp update every 3 minutes
{{< /highlight >}}

# Example

Let's create an example that will `touch` a file every 3 minutes. The `touch` command will merely change the file's timestamp and can be see by long listing the file - `ls -l`.

Below is a script called `create-example-timer` that we can run with `sudo bash create-example-timer` to get our example running.

{{< highlight bash >}}
#!/bin/bash

SYSTEMDPATH=/lib/systemd/system
PROGRAM=/usr/local/bin/example
EVENTS="*-*-* *:00/3:00" # every 3 minutes

# create the service file that runs our program
cat << EOF > $SYSTEMDPATH/example.service
[Unit]
Description=An example oneshot service that runs a program

[Service]
Type=oneshot
ExecStart=$PROGRAM

[Install]
WantedBy=multi-user.target
EOF

# create the timer that kicks off our service every 3 minutes
cat << EOF > $SYSTEMDPATH/example.timer
[Unit]
Description=A timer that runs our example service

[Timer]
OnCalendar=*-*-* *:00/3:00

[Install]
WantedBy=timers.target
EOF

# create a program that touches a file
cat << EOF > $PROGRAM
#!/bin/sh

touch /tmp/example
EOF

chmod 755 $PROGRAM
{{< /highlight >}}

# Running the Example

Once we've dropped the files down on the filesystem we can view the service and timer with `systemd`.

## Starting the Timer

We can see the timer exists, however, but it isn't active yet.

{{< highlight bash >}}
$ systemctl status example.timer
● example.timer - A timer that runs our example service
   Loaded: loaded (/lib/systemd/system/example.timer; disabled; vendor preset: enabled)
   Active: inactive (dead)
  Trigger: n/a
{{< /highlight >}}

Let's start the timer and see the state change from inactive to active.

{{< highlight bash >}}
$ sudo systemctl start example.timer
$ sudo systemctl status example.timer
● example.timer - A timer that runs our example service
   Loaded: loaded (/lib/systemd/system/example.timer; disabled; vendor preset: enabled)
   Active: active (waiting) since Sat 2022-07-09 12:09:58 MDT; 4s ago
  Trigger: Sat 2022-07-09 12:12:00 MDT; 1min 57s left

Jul 09 12:09:58 penguin systemd[1]: Started A timer that runs our example service.
{{< /highlight >}}

We can also list all active timers. This command allows us to see when the next activation time is as well as the last time it was activated successfully. It is useful if there are many timers to view in the system.

{{< highlight bash >}}
$ systemctl list-timers
NEXT                         LEFT        LAST                         PASSED       UNIT                         ACTIVATES
Sat 2022-07-09 11:36:00 MDT  18s left    Sat 2022-07-09 11:33:22 MDT  2min 18s ago example.timer                example.service
...

6 timers listed.
Pass --all to see loaded but inactive timers, too.
{{< /highlight >}}

## Listing the Service

We can see the service and even start it. Since this service is `oneshot` it will show inactive as it runs and exits. We are observing the last run of the service that was activated by the timer and it's exit code.

{{< highlight bash >}}
$ systemctl status example
● example.service - An example oneshot service that runs a program
   Loaded: loaded (/lib/systemd/system/example.service; disabled; vendor preset: enabled)
   Active: inactive (dead) since Sat 2022-07-09 11:36:22 MDT; 20s ago
  Process: 3367 ExecStart=/usr/local/bin/example (code=exited, status=0/SUCCESS)
 Main PID: 3367 (code=exited, status=0/SUCCESS)
{{< /highlight >}}

## Confirming the timer is working

In general the `systemctl status example.timer` provides us information on when the service was run last and will run in the future. The `systemctl status example` will show us the exit code of the program that we activated.

To see our program actually ran we can either do an `ls -l /tmp/example` or `watch ls -l /tmp/example` and see the timestamp of the file is changing every 3 minutes.

## Events

The heart of this example is the timer's `OnCalendar` field which runs every 3 minutes. This is done with the value `*-*-* *:00/3:00`. To understand this format see the manual page for the [time format](https://www.freedesktop.org/software/systemd/man/systemd.time.html). This page provides the syntax and examples. Once the `OnCalendar` value is constructed we can easily test it with [systemd-analyze](https://www.freedesktop.org/software/systemd/man/systemd-analyze.html). This command will print some details about the when the timer will kick off.

{{< highlight bash >}}
$ systemd-analyze calendar '*-*-* *:00/3:00'
Normalized form: *-*-* *:00/3:00
    Next elapse: Sat 2022-07-09 11:30:00 MDT
       (in UTC): Sat 2022-07-09 17:30:00 UTC
       From now: 30s left
{{< /highlight >}}

The `systemd-analyze` command will ensure our `OnCalendar` value is correct.

{{< highlight bash >}}
$ systemd-analyze calendar '*-* zz*:00/3:00'
Failed to parse calendar specification '*-* zz*:00/3:00': Invalid argument
{{< /highlight >}}

# Advantages to systemd timers over cron

As we've seen a `systemd` timer has more moving parts than a simple entry in the `crontab` file. However, by using `systemd` we have some advantages:

* Timers can be examined and viewed by all users on the system and are not tied to a specific user
* Timers can have complex dependencies based on the `systemd` dependency tree. Thus, we can trigger a timer based on services, boot-up, startups, how long services have been active or inactive.
* Through `systemctl` and `journalctl` we can more easily debug our timers
* The events that the timer can trigger on are more advanced than just every X seconds. Timers can delay randomly, use realtime clocks, trigger off timezone changes, and even wake the system on trigger.

This information has been taken from the [systemd.timer manpage](https://www.freedesktop.org/software/systemd/man/systemd.timer.html).

# References

[time format manpage](https://www.freedesktop.org/software/systemd/man/systemd.time.html)
[systemd.timer manpage](https://www.freedesktop.org/software/systemd/man/systemd.timer.html)
[systemd-analyze manpage](https://www.freedesktop.org/software/systemd/man/systemd-analyze.html)