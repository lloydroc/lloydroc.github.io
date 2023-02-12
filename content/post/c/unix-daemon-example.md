---
title: Daemon Example in C
categories:
 - c
 - unix
date: "2020-03-05T08:24:36Z"
lastmod: "2020-12-21"
---

In this post we'll look at daemon creation and demonstrate how to programmatically create daemons. We'll go into the SysV recommendation of "double forking" for daemon creation.

# What are Daemons?

Daemons are long running processes that run in the background with no controlling terminal - tty. Use cases for daemons are when the program needs to be available at all times and managed by the scheduler. Popular examples are nginx, postfix, httpd, sshd, cron, inetd. Many of these end in "d", which is a convention for the name of a daemon. Daemons typically do not have the ability to write to `stdout`, or `stderr`, and have no means to connect to `stdin` because they have no controlling terminal. Having no controlling terminal is a big deal in daemons. If they could connect to a controlling terminal they could be used in nefarious ways. We guarantee the daemon cannot take on a controlling terminal by doing the so-called "double fork". Usually, output from the daemon is done by writing to log files. These logs are typically written in the in `/var/log` directory. Input to a daemon, when necessary, is typically through sockets and signals. Let's write an example daemon in C that runs on Unix.

In Unix we have "systemd services" these services are effectively daemon processes supervised by systemd.

# Background Theory

To understand daemons you'll need to understand the basics of Unix Processes. Understanding of process IDs, process groups and sessions is necessary. See my [Unix Process Tutorial](/post/unix/unix-process-tutorial/) for more information.

# Ways to Create a Daemon

Here are some ways I'd recommend creating a daemon. This isn't an exhaustive list.

1. Programmatically, mainly using `fork()`.
2. Using a `systemd` service.

## Creating a daemon programmatically

We have 2 ways to create a daemon programmatically.

1. Programmatically by calling the [daemon](https://www.man7.org/linux/man-pages/man3/daemon.3.html) function from `unistd.h`. This function creates a BSD "traditional" style daemon without the "*double fork*". More on the *double fork* later.
2. Using the "double fork". There is no one single library call for this as of this writing.

## Creating a daemon with Systemd

The `systemd` framework gives us two ways to create a daemon:

1. By creating a `systemd.service` of `Type=simple` which is recommended. This has some limitations see `man systemd.service`.
2. By creating a `systemd.service` of `Type=notify` which is preferred by `systemd`. This creates a dependency for `systemd` but allows the system to better manage and monitor the service.
3. By creating a `systemd.service` of `Type=forking` where the process itself handles it's own forking programmatically. If this setting is used, it's recommended that the process creates a file with it's PID as the contents and the filename is given to `systemd` through `PIDFile`.

You can `grep` your `/usr/lib/systemd/system` directory or equivalent for `Type=` to get familiar with what systemd service uses which type of daemon.

I have an [example to create a daemon service in `systemd`](/post/autotools/systemd-service-daemon-autotools/). In this post I'll not mention daemons in `systemd` any longer and we'll focus on programmatic methods.

## Using glibc's daemon function to create a daemon

We can use the `daemon` function from `unistd.h`. A non-zero return value will result in failure. Here is an example. See line `14` for the call which has 2 options.

{{< highlight c "linenos=table,hl_lines=14">}}
#include <unistd.h>
#include <stdio.h>

int
main(int argc, char* argv[])
{
  // change to the "/" directory
  int nochdir = 0;

  // redirect standard input, output and error to /dev/null
  // this is equivalent to "closing the file descriptors"
  int noclose = 0;

  // glibc call to daemonize this process without a double fork
  if(daemon(nochdir, noclose))
    perror("daemon");

  // our process is now a daemon!
  sleep(60);

  return 0;
}
{{< / highlight >}}

We have a 60 second sleep built in to analyze the daemon before it exits. Here is how we run the daemon.

{{< highlight bash >}}
$ gcc become_daemon.c -o become_daemon
$ ./become_daemon
{{< / highlight >}}

### Analysis of the Daemon

We can now run the daemon and analyze it from a process perspective. A running daemon will typically have the following characteristics.
* The parent process ID will be `1` the `init` process.
* The daemon will not be attached to a terminal (tty)
* Typically, the process will have standard input, output or error files closed. Since the daemon doesn't have a `tty`, standard input and output wouldn't go anywhere.
* The daemon isn't run under the `root` user
* Files open from the daemon will be memory mappings - typically for shared object files, log files, and sockets.

We can confirm the following characteristics below.

{{< highlight bash >}}
$ ./become_daemon
$ pgrep become_daemon
3667175
$ ps -p 3667175 -o "user pid ppid pgid sid tty command"
USER         PID    PPID    PGID     SID TT       COMMAND
lloydroc 3667175       1 3667175 3667175 ?        ./become_daemon
$ lsof -p 3667175
COMMAND       PID     USER   FD   TYPE DEVICE SIZE/OFF   NODE NAME
become_da 3667175 lloydroc  cwd    DIR    8,0     4096      2 /
become_da 3667175 lloydroc  rtd    DIR    8,0     4096      2 /
become_da 3667175 lloydroc  txt    REG    8,0    16704 125503 /home/lloydroc/become_daemon/src/become_daemon
become_da 3667175 lloydroc  mem    REG    8,0  2159552   3631 /usr/lib/libc-2.32.so
become_da 3667175 lloydroc  mem    REG    8,0   207944   3607 /usr/lib/ld-2.32.so
become_da 3667175 lloydroc    0u   CHR    1,3      0t0   9049 /dev/null
become_da 3667175 lloydroc    1u   CHR    1,3      0t0   9049 /dev/null
become_da 3667175 lloydroc    2u   CHR    1,3      0t0   9049 /dev/null
{{< / highlight >}}

From the `ps` command above we can see the resulting daemon from the `daemon()` function call is the process group and session leader since it's process ID is the same as the process group and session group IDs.

Note, there is a bug filed for `daemon` it reads:

*The GNU C library implementation of this function was taken from BSD,
and does not employ the double-fork technique (i.e., fork(2),
setsid(2), fork(2)) that is necessary to ensure that the resulting
daemon process is not a session leader.  Instead, the resulting
daemon is a session leader.  On systems that follow System V
semantics (e.g., Linux), this means that if the daemon opens a
terminal that is not already a controlling terminal for another
session, then that terminal will inadvertently become the controlling
terminal for the daemon.*

## Manually Creating a Daemon in C using a Double Fork

With the limitation of the glibc `daemon()` function we can programmatically create a daemon using the *double fork* method.

## C Code "Double Fork" Daemon Example

Before we begin let's start some with some nomenclature. We will be creating a SysV traditional daemon. This is actually not recommended. "*Modern daemons should follow a simpler yet more powerful scheme (here called "new-style" daemons), as implemented by systemd(1).*"

The daemon C code example isn't trivial and there are number of concepts needed to be understood. The first concept used by the example is known as the "double fork". The double fork is the safest way to run a daemon since the resultant daemon has no way to acquire a controlling terminal - tty. Also, by doing a second fork we prevent zombie process and the daemon will run as a true orphan process. The end result is the daemon's parent process will be the `init` process and there is no way for the process to open up a controlling terminal.

### Double Fork Steps

Let's first look at the "Double Fork" steps before diving into the code. Note, to understand this you need to be comfortable with the concepts of the session, parent process group, process IDs and hierarchy of processes. I'm going to take the steps from a `man 7 daemon`

1. Call `fork()` so the process can run in the background
2. Call `setsid()` so once we exit from our shell the shell's session isn't killed, which would remove our daemon.
3. Call `fork()` again so the process isn't the process group leader and cannot take a controlling terminal.

Here is a little more details about these 3 steps above for a "Double Fork".
1. Before a `fork` call the process will be the process group leader in the shell session. Thus, the parent process will be the shell's process ID and session ID.
2. After our first call to fork the parent process will be killed, thus, the child orphaned and the child will be adopted by the `init` process and the `pgid` will be 1. The process group and session will remain the same. The child is no longer the process group leader.
3. Call `setsid` which will put us in a new session and make our process the process group leader, session leader and give us no terminal.

More in detailed steps can be seen by running `man 7 daemon` in the systemd documentation.

### Process IDs from a Double Fork

TODO from what happened on the first fork there is no need for another fork? On the first fork we're not the session leader or process group leader. I don't know if this is something new in Linux that is out of sync with all the writings on Double Forking. The `daemon` call from glibc does what we don't want but the `fork` call does.

From the *double fork* steps above let's take an example. Note I just made up the process IDs.

| Step | PPID | PID | PGID | SID | Comments                                                                 |
|------|------|-----|------|-----|--------------------------------------------------------------------------|
| 0    | 300  | 301 | 301  | 300 | Before fork1: process is not session leader, but is process group leader |
| 1    | 1    | 302 | 301  | 300 | After fork1: parent now the init process, no longer process group leader |
| 2    | 1    | 302 | 302  | 302 | After setsid: New session which process is session and group leader      |
| 3    | 1    | 303 | 302  | 302 | After fork2: Process is no longer session or group leader                |

Some comments illustrating further detail.

When we run the process in Step 0 the session ID is 300, this session represents the session that the user logged in with. When the user logs out all processes under this session will be killed. Thus, if we stopped at Step 1 the process would die when we log out.

At Step 1 we have forked and the parent process exits. This leaves the child process of the fork without a parent, which is called an *Orphan Process*. Orphan Processes are owned by the `init` process 1.

TODO how is the first fork OK and a double fork?
At Step 2 the process is

Onto the C example for the daemon!

{{< highlight c >}}
// file become_daemon.c
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include "become_daemon.h"

int // returns 0 on success -1 on error
become_daemon(int flags)
{
  int maxfd, fd;

  /* The first fork will change our pid
   * but the sid and pgid will be the
   * calling process.
   */
  switch(fork())                    // become background process
  {
    case -1: return -1;
    case 0: break;                  // child falls through
    default: _exit(EXIT_SUCCESS);   // parent terminates
  }

  /*
   * Run the process in a new session without a controlling
   * terminal. The process group ID will be the process ID
   * and thus, the process will be the process group leader.
   * After this call the process will be in a new session,
   * and it will be the progress group leader in a new
   * process group.
   */
  if(setsid() == -1)                // become leader of new session
    return -1;

  /*
   * We will fork again, also known as a
   * double fork. This second fork will orphan
   * our process because the parent will exit.
   * When the parent process exits the child
   * process will be adopted by the init process
   * with process ID 1.
   * The result of this second fork is a process
   * with the parent as the init process with an ID
   * of 1. The process will be in it's own session
   * and process group and will have no controlling
   * terminal. Furthermore, the process will not
   * be the process group leader and thus, cannot
   * have the controlling terminal if there was one.
   */
  switch(fork())
  {
    case -1: return -1;
    case 0: break;                  // child breaks out of case
    default: _exit(EXIT_SUCCESS);   // parent process will exit
  }

  if(!(flags & BD_NO_UMASK0))
    umask(0);                       // clear file creation mode mask

  if(!(flags & BD_NO_CHDIR))
    chdir("/");                     // change to root directory

  if(!(flags & BD_NO_CLOSE_FILES))  // close all open files
  {
    maxfd = sysconf(_SC_OPEN_MAX);
    if(maxfd == -1)
      maxfd = BD_MAX_CLOSE;         // if we don't know then guess
    for(fd = 0; fd < maxfd; fd++)
      close(fd);
  }

  if(!(flags & BD_NO_REOPEN_STD_FDS))
  {
    /* now time to go "dark"!
     * we'll close stdin
     * then we'll point stdout and stderr
     * to /dev/null
     */
    close(STDIN_FILENO);

    fd = open("/dev/null", O_RDWR);
    if(fd != STDIN_FILENO)
      return -1;
    if(dup2(STDIN_FILENO, STDOUT_FILENO) != STDOUT_FILENO)
      return -2;
    if(dup2(STDIN_FILENO, STDERR_FILENO) != STDERR_FILENO)
      return -3;
  }

  return 0;
}
{{< / highlight >}}

### C Code to use the Daemon Example

The following code `main.c` will call our function `become_daemon()` and if the return code is zero - success - the program will be running as a daemon. It's as simple as that. The program will continue to open up `syslog` and will write to the logs every 60 seconds. The following code serves as an example for understanding.

{{< highlight c >}}
// file main.c
#include <stdio.h>
#include <stdlib.h>
#include <syslog.h>
#include <unistd.h>
#include "become_daemon.h"

int
main(int argc, char *argv[])
{
  int ret;
  const char *LOGNAME = "DAEMON_EXAMPLE";

  // turn this process into a daemon
  ret = become_daemon(0);
  if(ret)
  {
    syslog(LOG_USER | LOG_ERR, "error starting");
    closelog();
    return EXIT_FAILURE;
  }

  // we are now a daemon!
  // printf now will go to /dev/null

  // open up the system log
  openlog(LOGNAME, LOG_PID, LOG_USER);
  syslog(LOG_USER | LOG_INFO, "starting");

  // run forever in the background
  while(1)
  {
    sleep(60);
    syslog(LOG_USER | LOG_INFO, "running");
  }

  return EXIT_SUCCESS;
}
{{< / highlight >}}

## Header file for Daemon Example

We will define a single function `become_daemon()` that, when run, will turn the process into a daemon. We need the mechanism to become a daemon simply because during development you don't want to debug a daemon process unless absolutely necessary. Typically, programs will add a flag that will run the code as a daemon, or, have a flag to turn the daemon off.

### Header file for Daemon Example

We will allow our `become_daemon()` function to take some flags for some various options. Those options are defined above. In the example we'll run with no flags by passing in a 0.

{{< highlight c >}}
// file become_daemon.h
#ifndef BECOME_DAEMON_H
#define BECOME_DAEMON_H

#define BD_NO_CHDIR          01 /* Don't chdir ("/") */
#define BD_NO_CLOSE_FILES    02 /* Don't close all open files */
#define BD_NO_REOPEN_STD_FDS 04 /* Don't reopen stdin, stdout, and stderr
                                   to /dev/null */
#define BD_NO_UMASK0        010 /* Don't do a umask(0) */
#define BD_MAX_CLOSE       8192 /* Max file descriptors to close if
                                   sysconf(_SC_OPEN_MAX) is indeterminate */

// returns 0 on success -1 on error
int become_daemon(int flags);

#endif
{{< / highlight >}}

## Running the example

If you want the source download [become_daemon](/code/become_daemon-1.0.tar.gz).

When you run the daemon. It's 100% uneventful! Nothing happens. You get the prompt back and the daemon goes on living it's happy life as a daemon process in Unix. Let's run the example and see what happens.

{{< highlight bash >}}
$ wget "https://lloydrochester.com/code/become_daemon-1.0.tar.gz"
$ tar zxf become_daemon-1.0.tar.gz
$ cd become_daemon-1.0
$ ./configure
$ make
$ ./src/become_daemon
$ # yep, that's it!
{{< / highlight >}}

### Analyzing the Daemon Process

Now, with the daemon running let's look at what's going on. We can analyze the parent process, if there is a tty, and the parent group and session id.

#### Daemon Process IDs

The following `ps` command, with arguments, lists out the process id, parent process id, parent group id, and session id of our daemon.

{{< highlight bash >}}
$ ps xao pid,ppid,pgid,sid,comm
    PID    PPID    PGID     SID COMMAND
 587961       1  587959  587959 become_daemon
{{< / highlight >}}

We can also see the parent of our daemon is indeed the `/sbin/init` process.

{{< highlight bash >}}
$ ps 1
    PID TTY      STAT   TIME COMMAND
      1 ?        Ss     1:16 /sbin/init
{{< / highlight >}}

Let's verify our daemon has no tty.

{{< highlight bash >}}
$ ps 587961
    PID TTY      STAT   TIME COMMAND
 587961 ?        S      0:00 ./become_daemon
{{< / highlight >}}

## Known Issues

This code will compile and run fine on OS X, however, you will not be able to see logs. The logs _should_ go in `/var/log/system.log` but nothing is there. The OS X Operating system now uses `os_log` as it would appear and something seems to be stopping logs from happening on OS X. Please comment if you know why?

## The Linux Programming Interface Book

This example is heavily influenced by the incredible work of Michael Kerrisk's groundbreaking book - The Linux Programming Interface. Also, known as TLPI. I highly recommend this book to anyone who is doing system programming, or wants to understand Unix better. This book is truly the Bible of Unix.

## Where to go from here?

Now that we have an Example Daemon running the next steps would be to install a signal handler so you can communicate with the daemon and that it properly cleans up when signals such as `SIGKILL` are sent to it. Once the signal handler is installed then you can send it messages with the `kill` command. Alternatively, you could open a socket and take commands this way. This socket would typically be a [Unix Domain socket](/post/c/unix-domain-socket-datagram/).

The second step would be create logging and write to a log file in `/var/log`, or, if the system logger works use it, however, see the issues mentioned in OS X.

When developing code that runs as a daemon, it's highly recommended to be able to test everything first while the program is not running as a daemon. It's quite difficult to debug and see what's going on. However, there are ways.
