---
categories:
 - c
date: "2021-04-12"
title: Implementing a Timeout for a read in C
---

# {{< title >}}

Need to wait a specified amount of time for a read call to return before giving up and continuing on?

In Unix when we `read` from a file we can have a non-blocking read where if the file is not ready the `read` call will pass through. We can also specify a blocking read where the `read` will wait forever. What if we want `read` to wait a specified amount of time not zero or infinity?

This blog post will show 3 ways to implement a timeout on a `read` call to wait a specified amount of time on a `read` call before the code continues.

Forewarning, the third method just relates to `tty` terminals which can also be `UARTs`.

# Examples

1. [Timeout using `poll`]({{< ref "timeout-on-read.md#poll_example" >}})
2. [Timeout using `select`]({{< ref "timeout-on-read.md#select_example" >}})
3. [Timeout reading from a Terminal (UART)]({{< ref "timeout-on-read.md#terminal_example" >}})
4. [Which Example to Use?]({{< ref "timeout-on-read.md#example_usage" >}})

# Using `poll` to implement a timeout on a `read` {#poll_example}

This example we'll pass in the file name that we want to read from. If the file is ready to read it will read 1 byte from it. If it is not ready it will wait 3 seconds before timing out. This will all be accomplished by the `poll` system call.

## Example usage

{{< highlight bash "linenos=table,hl_lines=2 6" >}}
$ echo "hello" > world
$ ./poll_timeout world # open a file that is ready for reading
opening /bin/ls read only
file /bin/ls ready to read ... this is where we'd call fread(file)
read 1 bytes from /bin/ls
$ ./poll_timeout /dev/ttys000 # we will timeout after 3 seconds here
poll timed out
{{< /highlight >}}

The `/dev/ttys000` file is a Pseudo-Terminal I found using the `who` command.

From here we can see that a file which we know is ready

## C implementation of a `read` timeout using `poll`

{{< highlight c "linenos=table,hl_lines=2 32 34-37" >}}
#include <stdio.h>
#include <poll.h>

int
main(int argc, char *argv[])
{
  struct pollfd pfd[1];
  FILE *file;
  int ret;
  char buf[1];

  if(argc != 2)
    {
      fprintf(stderr, "usage: %s file\n", argv[0]);
      return 1;
    }

  printf("opening %s read only\n", argv[1]);

  file = fopen(argv[1], "r");

  if(file == NULL)
    {
      perror("open file");
      fprintf(stderr, "unable to open %s for reading\n", argv[1]);
      return 2;
    }

  pfd[0].fd = fileno(file);
  pfd[0].events = POLLIN;

  ret = poll(pfd, 1, 3000);

  if(ret == 0)
    {
      fprintf(stderr, "poll timed out\n");
    }
  else if (ret < 0)
    {
      perror("poll");
    }
  else if(pfd[0].revents & POLLIN)
    {
      printf("file %s ready to read ... this is where we'd call fread(file)\n", argv[1]);
      ret = fread(buf, 1, sizeof(buf), file);
      printf("read %d bytes from %s\n", ret, argv[1]);
    }

  fclose(file);
  return 0;
}
{{< /highlight >}}

# Using `select` to implement a timeout on a `read` {#select_example}

This example is the same as the `poll` example above, except we will implement it using `select`.

## Example usage

{{< highlight bash "linenos=table,hl_lines=2 6" >}}
$ echo "hello" > world
$ ./select_timeout world # open a file that is ready for reading
opening /bin/ls read only
file /bin/ls ready to read ... this is where we'd call fread(file)
read 1 bytes from /bin/ls
$ ./select_timeout /dev/ttys000 # we will timeout here after 3 seconds
poll timed out on file /dev/ttys000 (3)
{{< /highlight >}}

## C implementation of a `read` timeout using `select`

{{< highlight c "linenos=table,hl_lines=2 35-36 38 40-43" >}}
#include <stdio.h>
#include <sys/select.h>
#include <sys/time.h>

int
main(int argc, char *argv[])
{
  fd_set rfds;
  struct timeval tv;
  FILE *file;
  int ret, fd;
  char buf[1];

  if(argc != 2)
    {
      fprintf(stderr, "usage: %s file\n", argv[0]);
      return 1;
    }

  printf("opening %s read only\n", argv[1]);

  file = fopen(argv[1], "r");

  if(file == NULL)
    {
      perror("open file");
      fprintf(stderr, "unable to open %s for reading\n", argv[1]);
      return 2;
    }

  fd = fileno(file);
  FD_ZERO(&rfds);
  FD_SET(fd, &rfds);

  tv.tv_sec = 3;
  tv.tv_usec = 0;
  
  ret = select(fd+1, &rfds, NULL, NULL, &tv);

  if(ret == 0)
    {
      fprintf(stderr, "poll timed out on file %s (%d)\n", argv[1], fd);
    }
  else if (ret < 0)
    {
      perror("poll");
    }
  else if(FD_ISSET(fd, &rfds))
    {
      printf("file %s ready to read ... this is where we'd call fread(file)\n", argv[1]);
      ret = fread(buf, 1, sizeof(buf), file);
      printf("read %d bytes from %s\n", ret, argv[1]);
    }

  fclose(file);
  return 0;
}
{{< /highlight >}}

# Implementing a `timeout` when reading from a Terminal  {#terminal_example}

Here is an example on a Raspberry Pi where we want to read from the `/dev/ttyAMA0` terminal which is set to `UART0`. We don't have anything connected and will timeout after waiting for 3 seconds. Full documentation on this example can be seen by doing a `man 3 termios` and is currently documented as such:

```
MIN == 0, TIME > 0 (read with timeout)
     TIME specifies the limit for a timer in tenths of a second.
     The timer is started when read(2) is called. read(2) returns
     either  when  at least one byte of data is available, or
     when the timer expires.  If the timer expires without any
     input be‐coming available, read(2) returns 0.  If data is
     already available at the time of the call to read(2), the call
     behaves as though the data was received immediately after the
     call.
```

## Example Usage

{{< highlight bash >}}
$ ./tty_timeout /dev/ttyAMA0 # do not expect bytes from this terminal
opening terminal /dev/ttyAMA0
timed out
{{< /highlight >}}

When we read from a terminal we can also implement a timeout. For example this would be used when reading from a UART on a Raspberry Pi.

{{< highlight c "linenos=table,hl_lines=5 36-41 43 89-93" >}}
#include <stdio.h>

#include <fcntl.h>
#include <unistd.h>
#include <termios.h>
#include <string.h>


static int
tty_open(char *ptyName)
{
  int UART;
  struct termios ttyOrig;

  UART = open(ptyName, O_RDWR | O_NOCTTY);
  if(UART == -1)
    {
      perror("error opening terminal");
      close(UART);
      return -1;
    }

  if(tcgetattr(UART, &ttyOrig) == -1)
    {
      perror("unable to get tty attributes");
      close(UART);
      return -1;
    }

  cfsetispeed(&ttyOrig, B9600);
  cfsetospeed(&ttyOrig, B9600);
  cfmakeraw(&ttyOrig);

  ttyOrig.c_cflag |= CREAD | CLOCAL;

  /* read with timeout
   * read will return with at least one byte available
   * or will timeout
   */
  ttyOrig.c_cc[VMIN] = 0;
  ttyOrig.c_cc[VTIME] = 30; // in tenths of a second

  if(tcsetattr(UART, TCSANOW, &ttyOrig) == -1)
    {
      perror("error setting terminal attributes");
      close(UART);
      return -1;
    }

  tcflush(UART, TCIFLUSH);
  tcdrain(UART);

  return UART;
}

int terminal_open(char *path)
{
  int fd;
  /* check the terminal exits */
  if(access(path, F_OK) == -1)
    return -2;
  fd = tty_open(path);
  return fd;
}

int
main(int argc, char *argv[])
{
  int fd;
  ssize_t bytes;
  char buf[1];
  
  if(argc != 2)
    {
      fprintf(stderr, "usage: %s tty\n", argv[0]);
      return 1;
    }

  printf("opening terminal %s\n", argv[1]);

  fd = terminal_open(argv[1]);
  
  if(fd < 0)
    {
      fprintf(stderr, "unable to open terminal %s\n", argv[1]);
      return 2;
    }

  bytes = read(fd, buf, sizeof(buf));
  if(bytes == 0)
    {
      fprintf(stderr, "timed out\n");
    }
  else if(bytes == -1)
    {
      perror("read");
    }
  else
    {
      printf("read %ld bytes from %s\n", bytes, argv[1]);
    }

  close(fd);
    
  return 0;
}
{{< /highlight >}}

# Which example to use {#example_usage}

I wrote a document comparing different system calls for `select` and `poll` titled [I/O Multiplexing in Unix](/post/unix/synchronous-io-multiplexing/). It really depends on your use case. Here are some criteria:

* How many files you're polling
* If you need to handle signals
* If you need the *high priority* data. E.G. `POLLPRI`.

We don't have examples for `pselect` and `epoll`, although, they are very similar to the `select` and `poll` examples.

The major challenge with all of the I/O multiplexing methods is they have a single timeout for all the file descriptors they are multiplexing. You don't get fine grained control over each file descriptor.