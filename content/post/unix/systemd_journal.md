---
title: Status, Reloading and Journalling in Systemd
date: "2020-06-23"
categories:
 - unix
 - c
 - systemd
---

# {{< title >}}

This is the second post on how to create a *service* in `systemd`. In the [first post](/post/autotools/systemd-service-daemon-autotools/) we created an *autotools* project and were able to start, stop and get basic status on the service. In this post we'll build on the *autotools* project to add logging to `syslog` and `journald`. We will also give an example on how we could reload the service with a `systemctl reload foo`. We will also use the [sd_notify(3)](https://www.freedesktop.org/software/systemd/man/sd_notify.html#) API to notify the service manager the status of what the service is doing.

# We Need Logging!

To properly develop, maintain, troubleshoot, maintain and administer any application you need logging. Good logging is one of the things that makes applications great. Our previous service had `printf` statements. This partially works if we print to `stderr` with our log level - more on this later. To log to both `journald` and `syslog` we can employ the [sd_journal(3)](https://www.freedesktop.org/software/systemd/man/sd_journal.html#) API or we can use `stderr`-based logging as implemented by systemd. See [sd-daemon(3)](https://www.freedesktop.org/software/systemd/man/sd-daemon.html#).

# Refresher on our Service

Here is the basic service as a starting point - this is before any changes we're going to make. We have one `printf`, but it doesn't go to a log anywhere. In fact the `printf` doesn't go to the journal.

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

# We can't proceed unless we have these header files!

We're going to use `libsystemd`. To do this you're going to need to make sure this command returns an installed library:

{{< highlight bash >}}
$ pkg-config --cflags --libs libsystemd
-lsystemd
{{< / highlight >}}

With this library we can add the linker flag `-lsystemd` and the following C headers:

{{< highlight c >}}
#include <systemd/sd-daemon.h>
#include <systemd/sd-journal.h>
{{< / highlight >}}

These files would typically be found in `/usr/include/systemd`. This was done on a Raspberry Pi running *Rasbian 10 (buster)*. In order install the library I had to do an `apt install libsystemd-dev`. On another machine with Arch Linux the directories already exist. This is system dependent.

# The Updated Service

Let's add some journalling, status updates, and ability to reload the service. Effectively, we've peppered through the code calls to `sd_notify(3)` and `fprintf(stderr, LOG_X ...)`. We will also use the `sd_journal(3)` API which are less portable but are used for example purposes. These can be seen in the code comments.

{{< highlight c >}}
#include <errno.h>
#include <stdlib.h>
#include <stdio.h>
#include <systemd/sd-daemon.h>
#include <systemd/sd-journal.h>
#include <signal.h>
#include <string.h>
#include <unistd.h>

// a global variable for our journal
sd_journal *journal;

// A signal handler for reloading
static void
reload(int sig)
{
  fprintf(stderr, SD_NOTICE "foo service is reloading\n");
  sd_notifyf(0, "RELOADING=1\n"
               "STATUS=Reloading Configuration\n"
               "MAINPID=%lu",
               (unsigned long) getpid());

  sleep(10);
  sd_notify(0, "READY=1\nSTATUS=Ready\n");
}

// A signal handler for stopping
static void
stop(int sig)
{
  fprintf(stderr, SD_NOTICE "foo service is stopping\n");
  sd_notify(0, "STOPPING=1");
  sd_journal_close(journal);
  exit(0);
}

int
main(int argc, char *argv[])
{
  // Install our signal handlers
  if(signal(SIGHUP, reload) == SIG_ERR)
  {
    sd_notifyf(0, "STATUS=Failed to install signal handler for service reload %s\n"
                  "ERRNO=%i",
                  strerror(errno),
                  errno);
  }
  if(signal(SIGTERM, stop) == SIG_ERR)
  {
    sd_notifyf(0, "STATUS=Failed to install signal handler for stopping service %s\n"
                  "ERRNO=%i",
                  strerror(errno),
                  errno);
  }

  // open the journal
  sd_journal_open(&journal, 0);

  fprintf(stderr, SD_NOTICE "foo service started\n");
  fprintf(stdout, "This won't be seen in the journal or syslog!\n");
  fprintf(stdout, SD_NOTICE "This ALSO will not be seen in the journal or syslog!\n");
  sd_journal_print(LOG_NOTICE, "This will only be seen when run by systemd, never on the terminal\n");

  // tell the service manager we're in the ready state
  sd_notify(0, "READY=1");
  while(1)
  {
    fprintf(stderr, SD_NOTICE "Hello World!\n");
    sleep(10);
  }
  return 0;
}
{{< / highlight >}}

The service is now notifying with state transistions, catching signals for reload and printing to *journald*. Note, the way we catch `SIGHUP` isn't ideal. I'll talk about this in the next section.

To find information here see `sd-daemon(3)` for `stderr` logging.

# Modify the Service Unit for Reload and Journal

See [systemd.exec(5)](https://www.freedesktop.org/software/systemd/man/systemd.exec.html#) for the `StandardOutput` and `StandardError` options.

{{< highlight service "linenos=table" >}}
[Unit]
Description=A Example Systemd Service
Wants=

[Service]
Type=notify
ExecStart=/usr/local/bin/foo
ExecReload=/bin/kill -HUP $MAINPID
StandardOutput=journal
StandardError=journal
{{< / highlight >}}

By having `Type=notify` we tell `systemd` we are following the `sd_notify(3)` API. See how the reload looks below.

# Observing the results

Now when can see this:

{{< highlight bash >}}
$ sudo systemctl start foo
$ sudo systemctl status foo
● foo.service - A Example Systemd Service
   Loaded: loaded (/lib/systemd/system/foo.service; static; vendor preset: enabled)
   Active: active (running) since Thu 2020-06-25 16:47:07 BST; 7s ago
 Main PID: 15166 (foo)
    Tasks: 1 (limit: 2077)
   Memory: 216.0K
   CGroup: /system.slice/foo.service
           └─15166 /usr/local/bin/foo

Jun 25 16:47:07 pi2 systemd[1]: Started A Example Systemd Service.
Jun 25 16:47:07 pi2 foo[15166]: foo service started
Jun 25 16:47:07 pi2 foo[15166]: Hello World!
Jun 25 16:47:07 pi2 foo[15166]: This will only be seen when run by systemd, never on the terminal
$ journalctl -u foo
...
Jun 25 16:47:07 pi2 foo[15166]: foo service started
Jun 25 16:47:07 pi2 foo[15166]: Hello World!
Jun 25 16:47:07 pi2 foo[15166]: This will only be seen when run by systemd, never on the terminal
Jun 25 16:47:17 pi2 foo[15166]: Hello World!
Jun 25 16:47:27 pi2 foo[15166]: Hello World!
{{< / highlight >}}

## Testing the Reload

We can *reload* the service and see our signal handler and `sd_notify(3)` calls being made:

{{< highlight bash >}}
$ sudo systemctl reload foo # this takes 10 seconds because of the sleep
$ sudo systemctl status foo # done in a different terminal
● foo.service - A Example Systemd Service
   Loaded: loaded (/lib/systemd/system/foo.service; static; vendor preset: enabl
   Active: reloading (reload) since Fri 2020-06-26 23:18:26 BST; 55s ago
  Process: 29242 ExecReload=/bin/kill -HUP $MAINPID (code=exited, status=0/SUCCE
 Main PID: 29092 (foo)
   Status: "Reloading Configuration"
    Tasks: 1 (limit: 2077)
   Memory: 392.0K
   CGroup: /system.slice/foo.service
           └─29092 /usr/local/bin/foo

Jun 26 23:18:44 pi2 foo[29092]: foo service is reloading
$ sudo systemctl status foo # reload is complete
● foo.service - A Example Systemd Service
   Loaded: loaded (/lib/systemd/system/foo.service; static; vendor preset: enabl
   Active: active (running) since Fri 2020-06-26 23:18:26 BST; 1min 2s ago
  Process: 29242 ExecReload=/bin/kill -HUP $MAINPID (code=exited, status=0/SUCCE
 Main PID: 29092 (foo)
   Status: "Ready"
    Tasks: 1 (limit: 2077)
   Memory: 392.0K
   CGroup: /system.slice/foo.service
           └─29092 /usr/local/bin/foo

Jun 26 23:18:54 pi2 systemd[1]: Reloaded A Example Systemd Service.
{{< / highlight >}}

One note on the *reload* we send a `SIGHUP`. This isn't recommended. Here is the text from [systemctl.service(5)](https://www.freedesktop.org/software/systemd/man/systemd.service.html#).

{{< highlight text >}}
Note however that reloading a daemon by sending a signal (as with the example line above)
is usually not a good choice, because this is an asynchronous operation and hence not
suitable to order reloads of multiple services against each other. It is strongly
recommended to set ExecReload= to a command that not only triggers a configuration reload
of the daemon, but also synchronously waits for it to complete.
{{< / highlight >}}

# Changes to Autotools

We had to link in the *systemd* library.

## configure.ac

We need to check that the `systemd` library is on the system and throw an error if not. Also, we'll check for the `systemd` header files.

{{< highlight text "linenos=table,hl_lines=10-12 14 17" >}}
AC_INIT([foo], [1.1], [lloyd.rochester@gmail.com])
AM_INIT_AUTOMAKE([-Wall -Werror foreign])
AC_CONFIG_SRCDIR([config.h.in])
AC_CONFIG_HEADERS([config.h])

# Checks for programs.
AC_PROG_CC
AC_PROG_INSTALL

AC_SEARCH_LIBS([sd_notify], [systemd], [], [
  AC_MSG_ERROR([unable to find the sd_notify function ... is libsystemd installed?])
])

AC_CHECK_LIB([systemd], [sd_notify])

# Checks for header files.
AC_CHECK_HEADERS([stdlib.h string.h unistd.h systemd/sd-daemon.h])

# Checks for typedefs, structures, and compiler characteristics.

# Checks for library functions.
AC_CHECK_FUNCS([strerror])

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

## src/Makefile.am

We need to link in the `systemd` library.

{{< highlight mk "hl_lines=2">}}
# src/Makefile.am
AM_LDFLAGS=-lsystemd
bin_PROGRAMS = foo
foo_SOURCES = main.c
{{< / highlight >}}

# Downloading and Using

A new version of [foo-1.1](/code/foo-1.1.tar.gz) was created.

{{< highlight text >}}
wget {{ absURL "/code/foo-1.1.tar.gz" }}
tar zxf foo-1.1.tar.gz
cd foo
./configure
make
sudo make install
sudo systemctl start foo
{{< / highlight >}}
