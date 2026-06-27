---
title: Systemd and Autotools
categories:
 - autotools
 - systemd
 - unix
date: "2020-06-22"
---

# {{< title >}}

This post starts a tutorial series on how to create a `systemd` service in Linux. This first post is likely the hardest part as we create an [autotools](/post/autotools/hello-world/) project with the source code and `systemd` unit files. Having this setup in `autotools` saves significant time installing unit files that `systemd` requires, building our C code, installing, and uninstalling our program. If you can get through this first post the following posts should come easily.

A service is a process that is controlled and supervised by `systemd`.

Quick note, Mac OS X does not have `systemd`. This post is only going to work on Linux.

If you don't want to use `autotools` that's OK. Skip the sections specific to `autotools` but focus on where the `.service` files are installed, as well as, where the binary is placed on the system that `systemd` controls.

# What this example service will and won't do

We want to package a `.service` file in our autotools project. When the user types `sudo make install` we want the `.service` file put into the correct directory with the correct privileges. It looks like this:

{{< highlight bash >}}
$ sudo make install
...
 /bin/mkdir -p '/lib/systemd/system'
 /usr/bin/install -c -m 644 foo.service '/lib/systemd/system'
...
{{< / highlight >}}

This example we will create the simplest possible service so we can do what is above. The service can be started and stopped by `systemd`. We can also check some rudimentary status.

What this example won't do is:
* Log either to `syslog` or `journald` this is a big limitation
* Have the ability to reload it's configuration without stopping and starting again
* Be passed in file descriptors or sockets
* Have dependencies on other services
* Install the service
* Run the service when the system starts

We'll add functionality later and address these limitations. This post we'll focus on just getting a simple process controlled by `systemd`.

# Background Documentation

I try to stick to the source of truth which are the man pages. Staring with `systemd(1)`. This `(1)` means section `1` in the man pages.

{{< highlight bash >}}
$ man 1 systemd
$ man systemd # same thing as the default is section 1
{{< / highlight >}}

From there you'll see references to `systemd.service(5)` which we read with:
{{< highlight bash >}}
$ man 5 systemd.service
{{< / highlight >}}

Finally, the `daemon(7)` will be useful. As well as, `systemd.unit(5)` and `systemd.syntax(5)`.

I'll outline what's in these documents, but wanted to provide some background.

# Creating a Simple Service

Let's start some code to create a service from. It's as simple as possible:

{{< highlight c >}}
// file main.c which we will compile to foo
#include "../config.h" // needed for autotools
#include <stdio.h>
#include <unistd.h>

int
main(int argc, char *argv[])
{
  while(1)
  {
    printf("going to sleep\n");
    sleep(10);
  }
  return 0;
}
{{< / highlight >}}

Yep, super easy. All we do is loop forever, printing a statement and sleeping for 10 seconds. When we run this program it will become a process. We'll use `systemd` to control this process.

# A Simple Systemd Service

How can we make this a *service* that is controlled by `systemd`? We need a `.service` file.

{{< highlight service "linenos=table" >}}
[Unit]
Description=A Example Systemd Service
Wants=

[Service]
ExecStart=/usr/local/bin/foo
{{< / highlight >}}

See that line 6 is the binary that we will compile `main.c` into.

As you will see later we install this service to `/lib/systemd/system` as it is the recommended location per `daemon(7)`. It's recommended because of the following. Note, this can differ per system.

{{< highlight bash >}}
# pkg-config --variable=systemdsystemunitdir systemd
/lib/systemd/system
{{< / highlight >}}

## Service Type

In the `[Service]` section we will use the default `Type=simple`, however it's worth noting some of these types. See [systemd.service(3)](https://www.freedesktop.org/software/systemd/man/systemd.service.html#) for the types of `simple`, `exec`, `forking`, `oneshot`, `dbus`, `notify` or `idle`.

* `Type=simple` systemd will effectively fork and daemonize our process for us. It's also expected that the process is the main process for the service.
* `Type=exec` similar to `Type=simple` I'll let you read the fine points that deal with when other units relating to the service unit are started.
* `Type=forking` here the process will be expected to do it's own forking and the parent process is expected to exit after start up and communication channels are set up. It's recommended to use the `PIDFile=` option so other processes can determine the process ID of the main process.
* `Type=oneshot` systemd will expect the unit to be started up after the main process exits. This can be thought of as a `cron` job where it runs once.
* `Type=notify` is like `Type=exec`, however, the process should send notifications through the [sd_notify(3)](https://www.freedesktop.org/software/systemd/man/sd_notify.html#) API for systemd to keep track of it's state.
* `Type=idle` is similar to `Type=simple` but relates to execution of active jobs that are dispatched.

In the next post we'll change from the default `Type=simple` to `Type=notify`.

# Starting and Stopping the Service

Before we install the `foo.service` and build our project let's look at how we can control our process with `systemd`. The `systemd` framework uses the `systemctl` command for management.

{{< highlight bash >}}
# systemctl list-unit-files foo.service
UNIT FILE   STATE
foo.service static

1 unit files listed.
# find / -name "foo.service"
/lib/systemd/system/foo.service
# systemctl start foo
# systemctl status foo
● foo.service - A Example Systemd Service
   Loaded: loaded (/lib/systemd/system/foo.service; static; vendor preset: enabled)
   Active: active (running) since Tue 2020-06-23 04:47:37 BST; 11s ago
 Main PID: 30808 (foo)
    Tasks: 1 (limit: 2077)
   Memory: 68.0K
   CGroup: /system.slice/foo.service
           └─30808 /usr/local/bin/foo

Jun 23 04:47:37 pi2 systemd[1]: Started A Example Systemd Service.
# ps 30808
  PID TTY      STAT   TIME COMMAND
30808 ?        Ss     0:00 /usr/local/bin/foo
# systemctl stop foo
# ps 30808
  PID TTY      STAT   TIME COMMAND
#
{{< / highlight >}}

Here we list the service file. Note that for `.service` files in `systemd` we don't have to always type the extension. Thus, both `systemctl start foo.service` and `systemctl start foo` are the same. This doesn't apply to other types of units like `.socket`.

In the command set above we:
* List the service with `systemctl`
* Show where the service file is located in the filesystem
* Start the service
* Get status on the service
* See the running process that the service started
* Stop the service
* Observe the process is no longer running

# What we DID NOT do?

Notice that we just created a *New-Style Daemon*. This isn't SysV compatible, but that is probably not a limitation for most use cases. We didn't have to [programatically create a daemon](/post/c/unix-daemon-example/). The procedure to *daemonize* is handled by `systemd`. That's a lot of hard work and code we don't need to worry about.

# Using the Autotools Project

In the sections below I'll go through creation of an autotools project that contains `systemd` unit files and will install them. Before I get into the `autoconf`, and `automake` files let's see how the project can be used. It's distributed as a tarball. Please go ahead and download it to follow along.

{{< highlight bash "linenos=table">}}
wget {{< absURL "/code/foo-1.0.tar.gz" >}}
tar zxf foo-1.0.tar.gz
cd foo
./configure
make
sudo make install
sudo systemctl start foo
{{< / highlight >}}

The magic happens on line 6 where we install. This will install `foo` to `/usr/local/bin` and it will also put our `foo.service` in the recommended location of `/lib/systemd/system`.

Download the full dist [foo-1.0.tar.gz](/code/foo-1.0.tar.gz).

What makes this easy is in future posts we'll modify the `main.c` file. We can easily recompile with a `make`. We can also install our program easily with a `sudo make install`. This also is the same for the `systemd` unit files. There is just so much out of the box from `autotools` that will make our lives easier.

# Uninstalling

We can remove everything we've done now easily by doing the following. Note, you must be in the directory where it was installed.

{{< highlight bash >}}
# sudo make uninstall
{{< / highlight >}}

This uninstall target will remove `/usr/local/bin/foo` and `/lib/systemd/system/foo.service`. After uninstalled, the files will remain in the directory where the source is built. These files can just be removed with `rm` command and your system will be fully restored.

# The Autotools Source

Here is a quick directory structure of our project:

{{< highlight bash >}}
# find .
.
./configure.ac
./systemd
./systemd/foo.service
./systemd/Makefile.am
./README
./Makefile.am
./.gitignore
./autogen.sh
./src
./src/Makefile.am
./src/main.c
#
{{< / highlight >}}

The `daemon(7)` man page outlines how to add `systemd` to an `autotools` project. These same instructions are followed here. With exception to a slight bug and some reading in between the lines.

## Top Level Makefile.am

The top level we simply add the `subdirs` for our C source and the `systemd` unit files.
{{< highlight mk >}}
# Makefile.am
AM_DISTCHECK_CONFIGURE_FLAGS = \
   --with-systemdsystemunitdir=$$dc_install_base/$(systemdsystemunitdir)

SUBDIRS = src systemd
dist_doc_DATA = README
{{< / highlight >}}

## Autoconf configure.ac

A basic `configure.ac` file with snippets added and modified them from the `daemon(7)` man page. We added our `systemd` directory where our `foo.service` file lives on line 11.

{{< highlight text "linenos=table" >}}
# configure.ac
AC_INIT([foo], [1.0], [lloyd.rochester@gmail.com])
AM_INIT_AUTOMAKE([-Wall -Werror foreign])
AC_CONFIG_SRCDIR([config.h.in])
AC_CONFIG_HEADERS([config.h])

AC_PROG_CC
AC_PROG_INSTALL
PKG_PROG_PKG_CONFIG
AC_ARG_WITH([systemdsystemunitdir],
     [AS_HELP_STRING([--with-systemdsystemunitdir=DIR], [systemd])],,
     [with_systemdsystemunitdir=auto])
AS_IF([test "x$with_systemdsystemunitdir" = "xyes" -o "x$with_systemdsystemunitdir" = "xauto"], [
     def_systemdsystemunitdir=$($PKG_CONFIG --variable=systemdsystemunitdir systemd)

     AS_IF([test "x$def_systemdsystemunitdir" = "x"],
   [AS_IF([test "x$with_systemdsystemunitdir" = "xyes"],
    [AC_MSG_ERROR([systemd support requested but pkg-config unable to query systemd package])])
    with_systemdsystemunitdir=no],
   [with_systemdsystemunitdir="$def_systemdsystemunitdir"])])
AS_IF([test "x$with_systemdsystemunitdir" != "xno"],
      [AC_SUBST([systemdsystemunitdir], [$with_systemdsystemunitdir])])
AM_CONDITIONAL([HAVE_SYSTEMD], [test "x$with_systemdsystemunitdir" != "xno"])

AC_CONFIG_FILES([Makefile
                 src/Makefile
                 systemd/Makefile])

AC_OUTPUT
{{< / highlight >}}

## Automake src/Makefile.am

As easy as it can be. We simply have one binary with a single source file. Our built program is called `foo`.

{{< highlight src >}}
# src/Makefile.am
bin_PROGRAMS = foo
foo_SOURCES = main.c
{{< / highlight >}}

## Automake systemd/Makefile.am

Here we create a `systemd/` directory and add a `Makefile.am`. Notice we prepended `dist_`. Without this a `make distcheck` will fail since `foo.service` won't be included in the distribution. This diverges from the `daemon(7)` man page as of this writing.

{{< highlight src >}}
# systemd/Makefile.am
if HAVE_SYSTEMD
dist_systemdsystemunit_DATA = foo.service
endif
{{< / highlight >}}

# Developing on the Autotools project

To develop the `autotools` project once modifications are made I generally do the following:

{{< highlight bash >}}
# autoreconf --install # will create your configure script
# ./configure
# make
# make distcheck
# sudo make install
{{< / highlight >}}
