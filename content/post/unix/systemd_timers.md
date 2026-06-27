---
title: "Systemd: Timers"
date: "2020-06-30"
categories:
 - unix
 - c
 - systemd
---

# {{< title >}}

In the fourth post on how to create a service in `systemd` we will create a timer that will run every minute sending messages to our example `foo` service over a socket. We're essentially creating a `cron` job socket client.

Previous posts:
* [Project Creation](/post/autotools/systemd-service-daemon-autotools/) of an autotools project and start/stop a daemon service.
* [Journalling/Syslog](/post/unix/systemd_journal/) to enable logging, notify of state changes and accept reloads.
* [Socket](/post/unix/systemd_sockets/) creation of a Unix Domain Socket for other processes to send messages to our service through remote procedure calls.

# What the example will do?

We already have a Unix Domain Socket created by `systemd` that is listening on `/var/log/foo.socket`. We also have a service called `foo.service` that is listening to this socket . When messages are received on the socket the service will log them to the journal and syslog.

In this post we will send a message over our socket every minute by use of the [systemd.timer(7)](https://www.freedesktop.org/software/systemd/man/systemd.timer.html#) unit. The timer unit has a corresponding service unit that it will run referenced with the same name, but with a `.service` file extension. This service will run a simple script that uses the unix `nc` netcat tool to send a message to our socket.

Thus, we'll create two more systemd unit files a `fooclient.timer` and `fooclient.service`. The `fooclient.timer` will run the `fooclient.service` every minute which will send a message to the socket which we'll see in the system logs.

# The Client Service and Timer

The `fooclient.service` will depend on the `fooclient.timer`. Each time the `fooclient.timer` fires it will run the `fooclient.service`. The `fooclient.service` will run our simple shell script to send a message over the socket.

## Shell Script to Send Datagrams over a Unix Domain Socket

About as simple as we could make it. We'll send datagrams over a Unix Domain socket with the netcat tool.

{{< highlight bash >}}
#!/bin/sh
echo hello | netcat -w 1 -u -U /var/run/foo.socket
{{< /highlight >}}

We have the timeout of 1 second since `nc` won't end. The `-u` and `-U` options are for datagrams and Unix Domain Sockets.

## Systemd Service to call the Shell Script

We will then call the shell script with our service. This is a `Type=oneshot` service since it runs once and exits. See [systemd.service](https://www.freedesktop.org/software/systemd/man/systemd.service.html) for more on the `oneshot`.

{{< highlight text >}}
[Unit]
Description=A Example Systemd Service Client to send Datagrams over a Unix Domain Socket

[Service]
Type=oneshot
ExecStart=foocl hello
{{< /highlight >}}

## Systemd Timer to Call the Oneshot Service

Now we need a [systemd.timer(7)](https://www.freedesktop.org/software/systemd/man/systemd.timer.html#) to call our `oneshot` service. We will use the `OnCalendar=` option and the format will be from [systemd.time(7)](https://www.freedesktop.org/software/systemd/man/systemd.time.html#) which will allow the service to run every minute.

{{< highlight text >}}
[Unit]
Description=A Example Systemd Service Client Timer

[Timer]
OnCalendar=*-*-* *:*:00
{{< /highlight >}}

# Running the example

Now we will run `fooclient.timer`:

{{< highlight bash >}}
$ systemctl start fooclient.timer
● fooclient.timer - A Example Systemd Service Client Timer
   Loaded: loaded (/lib/systemd/system/fooclient.timer; static; vendor preset: enabled)
   Active: active (waiting) since Tue 2020-06-30 15:51:32 BST; 20min ago
  Trigger: Tue 2020-06-30 16:13:00 BST; 37s left

Jun 30 15:51:32 pi2 systemd[1]: Started A Example Systemd Service Client Timer
{{< /highlight >}}

Great our timer is working and in the `waiting` state. Now if we tail `/var/log/syslog` or if we looked at the journal we would see what's happening. Below are a number of runs of the timer/service.

{{< highlight bash >}}
tail -f /var/log/syslog
Jun 30 15:51:32 pi2 systemd[1]: Started A Example Systemd Service Client Timer.
Jun 30 15:52:11 pi2 systemd[1]: Starting A Example Systemd Service Client...
Jun 30 15:52:11 pi2 foo[8019]: Received 6 bytes from /tmp/nc.XXXXWJIClG: hello
Jun 30 15:52:12 pi2 systemd[1]: fooclient.service: Succeeded.
Jun 30 15:52:12 pi2 systemd[1]: Started A Example Systemd Service Client.
Jun 30 15:53:11 pi2 systemd[1]: Starting A Example Systemd Service Client...
Jun 30 15:53:11 pi2 foo[8019]: Received 6 bytes from /tmp/nc.XXXXYMbgnG: hello
Jun 30 15:53:12 pi2 systemd[1]: fooclient.service: Succeeded.
Jun 30 15:53:12 pi2 systemd[1]: Started A Example Systemd Service Client.
Jun 30 15:54:11 pi2 systemd[1]: Starting A Example Systemd Service Client...
Jun 30 15:54:11 pi2 foo[8019]: Received 6 bytes from /tmp/nc.XXXXgnTTcD: hello
Jun 30 15:54:12 pi2 systemd[1]: fooclient.service: Succeeded.
Jun 30 15:54:12 pi2 systemd[1]: Started A Example Systemd Service Client.
Jun 30 16:12:12 pi2 systemd[1]: fooclient.service: Succeeded.
Jun 30 16:12:12 pi2 systemd[1]: Started A Example Systemd Service Client.
Jun 30 16:13:11 pi2 systemd[1]: Starting A Example Systemd Service Client...
Jun 30 16:13:11 pi2 foo[8019]: Received 6 bytes from /tmp/nc.XXXXWp2z6C: hello
Jun 30 16:13:12 pi2 systemd[1]: fooclient.service: Succeeded.
Jun 30 16:13:12 pi2 systemd[1]: Started A Example Systemd Service Client.
Jun 30 16:14:11 pi2 systemd[1]: Starting A Example Systemd Service Client...
Jun 30 16:14:11 pi2 foo[8019]: Received 6 bytes from /tmp/nc.XXXXhsOp0C: hello
Jun 30 16:14:12 pi2 systemd[1]: fooclient.service: Succeeded.
Jun 30 16:14:12 pi2 systemd[1]: Started A Example Systemd Service Client.
{{< /highlight >}}

# The Autotools Additions

For the autotools additions we:
* Bumped up the version in `configure.ac`
* Added `fooclient.timer` and `fooclient.service` to our `systemd/` directory and modified our `systemd/Makefile.am`
* Added a script `foocl` in the `src/` directory and modified `src/Makefile.am` to distribute and install it.

## Changes to systemd/Makefile.am

We just add the service files to our distribution. They are install for us in the proper systemd directories which I will show below.


Contents of `systemd/Makefile.am`:
{{< highlight mk "hl_lines=2" >}}
if HAVE_SYSTEMD
dist_systemdsystemunit_DATA = foo.service foo.socket fooclient.service fooclient.timer
endif
{{< /highlight >}}

## Script src/foocl

The simple script to netcat:

{{< highlight lang >}}
#!/bin/sh
echo hello | netcat -w 1 -u -U /var/run/foo.socket
{{< /highlight >}}

## Changes to src/Makefile.am

Contents of `src/Makefile.am`:

{{< highlight mk "hl_lines=4" >}}
AM_LDFLAGS=-lsystemd
bin_PROGRAMS = foo
foo_SOURCES = main.c
dist_bin_SCRIPTS = foocl
{{< /highlight >}}

# Installing

This is where I love how easy autotools makes life for users. Below is the output of a `sudo make install`. We can see our services being installed to `/lib/systemd/system`, our `foocl` script and C code binary `foo` being installed to `/usr/local/bin`. All the correct permissions.

{{< highlight bash >}}
$ sudo make install
Making install in src
make[1]: Entering directory '/home/pi/foo/src'
make[2]: Entering directory '/home/pi/foo/src'
 /bin/mkdir -p '/usr/local/bin'
  /usr/bin/install -c foo '/usr/local/bin'
 /bin/mkdir -p '/usr/local/bin'
 /usr/bin/install -c foocl '/usr/local/bin'
make[2]: Nothing to be done for 'install-data-am'.
make[2]: Leaving directory '/home/pi/foo/src'
make[1]: Leaving directory '/home/pi/foo/src'
Making install in systemd
make[1]: Entering directory '/home/pi/foo/systemd'
make[2]: Entering directory '/home/pi/foo/systemd'
make[2]: Nothing to be done for 'install-exec-am'.
 /bin/mkdir -p '/lib/systemd/system'
 /usr/bin/install -c -m 644 foo.service foo.socket fooclient.service fooclient.timer '/lib/systemd/system'
make[2]: Leaving directory '/home/pi/foo/systemd'
make[1]: Leaving directory '/home/pi/foo/systemd'
make[1]: Entering directory '/home/pi/foo'
cd . && /bin/bash ./config.status config.h
config.status: creating config.h
config.status: config.h is unchanged
make[2]: Entering directory '/home/pi/foo'
make[2]: Nothing to be done for 'install-exec-am'.
 /bin/mkdir -p '/usr/local/share/doc/foo'
 /usr/bin/install -c -m 644 README '/usr/local/share/doc/foo'
make[2]: Leaving directory '/home/pi/foo'
make[1]: Leaving directory '/home/pi/foo'
{{< /highlight >}}

# Downloading

Please download [foo-1.3.tar.gz]({{ absURL "/code/foo-1.3.tar.gz" }}) with the following usage.

{{< highlight bash >}}
$ wget {{ absURL "/code/foo-1.3.tar.gz" }}
$ tar zxf foo-1.3.tar.gz
$ cd foo
$ ./configure
$ make
$ sudo make install
$ sudo systemctl daemon-reload
$ sudo systemctl start foo.socket
$ sudo systemctl start fooclient.timer
{{< /highlight >}}
