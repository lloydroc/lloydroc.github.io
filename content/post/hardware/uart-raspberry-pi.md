---
title: "UART Theory and Programming on the Raspberry Pi"
date: 2022-08-16
draft: false
categories:
- hardware
- unix
codetar: uartd-1.1.tar.gz
---

# {{< title >}}

This post outlines how to control the UART in a Raspberry Pi using the C programming language. We will also explore parity checks and handling. Parity checking was the main driver for this post, however, if you're looking for C code to control a UART that is also asynchronous please keep reading. This post contains a small command line tool that can asynchronously read and write to standard input and output through two connected UARTs. The command line tool has a number of options to set the speed, tty, parity and number of stop bits.

# Table of Contents

{{< toc >}}

## Raspberry Pi Configuration

I'll summarize what we need to do:
* Use `raspi-config` to enable the UART
* Probably, edit `/boot/config.txt` to set `dtoverlay=disable-bt` on the device overlay to disable the **mini UART** for Bluetooth. This mini-UART has limited speeds and settings. For example it cannot check parity.
* Find the UART you're going to use. This is typically a soft link `/dev/serial0` which links to `/dev/ttyAMA0`, however, there is usually a second UART on the Raspberry Pi.

## UARTs are Cool

Why are they cool?

* UARTs are quite fast. As of this writing max transfer speeds of 2,000,000 Baud are supported. A speed of 2M Baud is more than sufficient for many Raspberry Pi projects.
* UARTs only need 2 wires for transmit and receive
* UARTs have basic error detection with parity
* UARTs are asynchronous: meaning you can transmit and receive simultaneously and at different speeds. Most microcontrollers have code examples that are synchronous and don't take advantage of this fact.
* To transmit and receive from the UART we can simply use the normal file I/O operations *read(2)* and *write(2)* to a file descriptor. It's the universal method for file I/O in Unix.

## Quick Background Theory

The receiving and transmitting end of the UART must be set to the same configuration on both ends. This configuration can be summarized as follows:
* Speed - set in units of of Baud
* Number of data bits - 5,6,7 or 8 Bits
* Parity bit or not - more on this later
* One or two stop bits

With these settings a frame can have a minimum of 1+5+1=7 bits to a maximum of 1+8+1+2=12 Bits per frame on the wire.

### UART Shorthand Notation

There is a shorthand notation consisting of 3 characters to describe UART settings for just the data, parity and number of stop bits. We can abbreviate it as `DPS` for data, parity and stop bits.

| Symbol | Possible Values | Description          |
|--------|-----------------|----------------------|
| D      | 5,6,7 or 8      | Number of Data Bits  |
| P      | N or E          | Parity - No or Error |
| S      | 1 or 2          | Number of Stop Bits  |

Examples are `8N1`, `8E1`, `7E2`. Sometimes people will throw the speed in front of the shorthand notation: `9600 8N1`. The `8N1` notation seems to be the most popular UART configuration with 8 data bits, no parity checking an 1 stop bit.

## Example Data Frame

Below is a diagram of an example `8E1` data frame where we have **8** data bits with value `0b00101100`, a parity bit **E**, and **1** stop bit. The line defaults to high then the start bit pulls the line low to start the frame. We end with the stop bit pulling the line back to logic high. This *line* is the TX from one UART to the RX on another UART.

{{< figure src="/assets/svg/uart-timing.svg" title="UART data frame timing for 8E1">}}

## Parity Settings

The UART allows for an optional bit in the data frame for parity. It is not common to enable parity on UARTs. This bit is filled in by the UART on transmission and checked for correctness on reception. The parity bit is added to the number of 1s in the data frame to make the sum either even or odd. Thus, the number of 1s plus the parity bit will need to be even or odd. If odd parity the total number of 1s plus the parity bit sums to an odd number, if even it sums to an even number. Here are some valid examples of data plus parity for valid frames:

| Data  | Even Parity | Odd Parity |
|-------|-------------|------------|
| 00000 | 0           | 1          |
| 00001 | 1           | 0          |
| 01001 | 0           | 1          |
| 00100 | 1           | 0          |
| 11111 | 1           | 0          |

Parity is a very simple way to know if we have a single bit error. However, we could have combinations of 2 bit errors that go undetected, or even 2*N bit errors. We could also have a single error in the data bit and an error in the parity bit. Also, we could have problems with the start and stop bits for frame errors. I digress ... These scenarios are less likely but are the reason parity checks are *simple* and not very robust.

When the UART receives a byte if the parity settings are enabled it will compute what it detects for parity and if it doesn't match it will *mark* the data it receives. Let's say we have `sdddddps` - for **s**tart, 5 **d**ata bits, 1 **p**arity bit and a **s**top bit.

Assuming even parity, if we transmit data of `00001` and upon reception get a bit flip on the last data bit `00000`. The scenario would be the following adding stop/start and parity bits:
{{< highlight bash >}}
10000111 # UART transmits 00001 with even parity bit to be 1
10000011 # a receiving UART an erroneous frame with one flipped bit
{{< / highlight >}}

We know there is a bit error in the received data frame because the sum of 1s and the parity bit isn't even, the sum is 1.

The receiving UART will *mark* this data when it is read. We will get 3 bytes instead of one byte. That byte stream will be `0xff 0x00 0x00` where the first two bytes `0xff 0x00` are the *parity mark* and the last byte `0x00` is the byte we received in error. Unfortunately, if we truly send `0xff` then it could be misinterpreted. This is a special case that will generate the two bytes `0xff 0xff`. The [termios(3)](https://man7.org/linux/man-pages/man3/tcflush.3.html) man page labels these as `\377` which is in octal representing 8-bits: 2 bits for the 3, and 3 bits both of the 7s.

Note, the fact that you expect one byte and read either 3, 2 or 1 bytes makes the programming a little more tricky ...

## Example Byte Stream with Parity Errors

For an example let's send 6 full bytes through the UART with even parity enabled and marked. Enabling parity and marking parity are different settings. On the transmitting end we'll have the parity bit fixed to 1. Thus, when the receiver computes the parity some errors will occur. Here is the bit stream with comments. Note, 255 isn't in the ASCII table but I hacked a program to make it send.

Reception from a UART with Parity Enabled and Marked:
{{< highlight bash >}}
97      # ascii  97=a=0b01100001 needs even parity=1
98      # ascii  98=b=0b01100010 needs even parity=1
99      # ascii  99=c=0b01100011 needs even parity=0
100     # ascii  100=d=0b01100100 needs even parity=1
255     #          255=0b11111111 needs even parity=0
10      # ascii   10=\n=0b00001010 needs even parity=0
{{< / highlight >}}

What we will read back from the UART:
{{< highlight bash >}}
97   # valid, no mark
98   # valid, no mark
255  # mark for 99=c
0    # mark for 99=c
99   # 99=c marked invalid
100  # valid, no mark
255  # mark for 255
0    # mark for 255
255  # 255 marked invalid
255  # mark for 10=\n
0    # mark for 10=\n
10   # 10=\n marked invalid
{{< / highlight >}}

## Code to Configure the UART

Below is some code to configure the speed, parity, number of stop bits and ability to asynchronously transmit and receive from the UART.

### Setting the Speed

The speed settings for a UART are that of a `speed_t` as specified in [termios(3)](https://man7.org/linux/man-pages/man3/tcflush.3.html).

{{< highlight c >}}
/*
 * Convert integer speed to a speed_t in termios.h
 */
speed_t
uart_get_speed(int requested_speed)
{
  speed_t speed;

  switch(requested_speed)
  {
    case 0:
      speed = B0;
      break;
    case 50:
      speed = B50;
      break;
    case 75:
      speed = B75;
      break;
    case 110:
      speed = B110;
      break;
    case 134:
      speed = B134;
      break;
    case 150:
      speed = B150;
      break;
    case 200:
      speed = B200;
      break;
    case 300:
      speed = B300;
      break;
    case 600:
      speed = B600;
      break;
    case 1200:
      speed = B1200;
      break;
    case 1800:
      speed = B1800;
      break;
    case 2400:
      speed = B2400;
      break;
    case 4800:
      speed = B4800;
      break;
    case 9600:
      speed = B9600;
      break;
    case 19200:
      speed = B19200;
      break;
    case 38400:
      speed = B38400;
      break;
    case 57600:
      speed = B57600;
      break;
    case 115200:
      speed = B115200;
      break;
    case 230400:
      speed = B230400;
      break;
    case 460800:
      speed = B460800;
      break;
    case 500000:
      speed = B500000;
      break;
    case 576000:
      speed = B576000;
      break;
    case 921600:
      speed = B921600;
      break;
    case 1000000:
      speed = B1000000;
      break;
    case 1152000:
      speed = B1152000;
      break;
    case 1500000:
      speed = B1500000;
      break;
    case 2000000:
      speed = B2000000;
      break;
    default:
      speed = -1;
  }

  return speed;
}

{{< / highlight >}}

### Configure the UART

The UART configuration needs a `tty` file to open. Read more on teletypes (`tty`) if needed. On a Raspberry Pi this file would normally be `/dev/serial0` which is a soft link to the actual tty device file `/dev/ttyAMA0`.

{{< highlight c >}}
/*
 * Open a unix character device file by name such as /dev/ttyAMA0
 * with settings for speed, parity and 1 or two stop bits.
*/
int
uart_setup(char *filename, speed_t baud, bool parity, bool twostop)
{
  int UART;
  struct termios tty_orig;

  if(access(filename, F_OK) == -1)
  {
    err_output("unable to access path %s\n", filename);
    return -2;
  }

  UART = open(filename, O_RDWR | O_NOCTTY);
  if(UART == -1)
  {
    err_output("error opening terminal %s\n", filename);
    close(UART);
    return UART;
  }

  if(tcgetattr(UART, &tty_orig) == -1)
  {
    err_output("unable to get tty attributes for %s\n", filename);
    close(UART);
    return -1;
  }

  if(cfsetispeed(&tty_orig, baud) == -1)
  {
    errno_output("unable to set input speed\n");
    close(UART);
    return -1;
  }
  if(cfsetospeed(&tty_orig, baud) == -1)
  {
    errno_output("unable to set output speed\n");
    close(UART);
    return -1;
  }

  cfmakeraw(&tty_orig);

  tty_orig.c_cflag |= CREAD | CLOCAL;
  tty_orig.c_cc[VMIN] = 0;
  tty_orig.c_cc[VTIME] = 0;

  if(parity)
  {
    tty_orig.c_cflag |= PARENB;
    tty_orig.c_iflag |= PARMRK | INPCK;
    tty_orig.c_iflag &= ~(IGNPAR);
  }
  else
  {
    tty_orig.c_iflag |= IGNPAR;
  }

  if(twostop)
  {
    tty_orig.c_cflag |= CSTOPB;
  }
  else
  {
    tty_orig.c_cflag &= ~(CSTOPB);
  }

  if(tcsetattr(UART, TCSANOW, &tty_orig) == -1)
  {
    err_output("error setting terminal attributes");
    close(UART);
    return -1;
  }

  tcflush(UART, TCIFLUSH);
  tcdrain(UART);

  return UART;
}
{{< / highlight >}}

### Reading bytes from the UART into a Buffer

We can read bytes transmitted to the UART into a buffer. Once the UART is setup it's trivial to read bytes as it's a normal call to [read(2)](https://man7.org/linux/man-pages/man2/read.2.html).

{{< highlight c >}}
static ssize_t
uart_read(int fd_uart, char buffer[], size_t buf_len, bool verbose)
{
  ssize_t rbytes;

  rbytes = read(fd_uart, buffer, buf_len);
  if(rbytes ==  -1)
  {
    errno_output("error reading from UART\n");
    return rbytes;
  }

  if(verbose)
  {
    debug_output("uart  read %d bytes\n", rbytes);
    for(int i=0;i<rbytes;i++)
      debug_output("%d ", buffer[i]);
    debug_output("\n");
  }

  return rbytes;
}
{{< / highlight >}}

### Writing Bytes to the UART

Transmitting bytes is just as simple as receiving bytes. Here we read from *stdin* and write it to the UART which will transmit.

{{< highlight c >}}
static ssize_t
uart_write(int fd_uart, bool verbose)
{
  ssize_t rbytes, wbytes;

  rbytes = read(fileno(stdin), write_buffer, BUFLEN);
  if(rbytes == -1)
  {
    errno_output("error reading from stdin\n");
    return rbytes;
  }
  write_buffer[rbytes] = '\0';

  if(verbose)
  {
    debug_output("stdin read[%d]: %s", rbytes, write_buffer);
    for(int i=0;i<rbytes;i++)
      debug_output("%d ", write_buffer[i]);
    debug_output("\n");
  }

  wbytes = write(fd_uart, write_buffer, rbytes);
  if(wbytes == -1)
  {
    errno_output("error writing to uart\n");
    return -2;
  }

  if(verbose)
    debug_output("uart  write[%d]: %s", wbytes, write_buffer);

  if(wbytes != rbytes)
  {
    warn_output("wrote only %d of %d bytes\n", wbytes, rbytes);
  }

  return rbytes;
}
{{< / highlight >}}

### Asynchronously Reading and Writing from the UART

Here I will use the [select(2)](https://www.man7.org/linux/man-pages/man2/select.2.html) system call. However, you can just as easily use [poll(2)](https://man7.org/linux/man-pages/man2/poll.2.html). The *select(2)* system call is how we asynchronously transmit and receive from the UART as it allows for monitoring of multiple file descriptors.

{{< highlight c >}}
int
uart_poll(int fd_uart, bool verbose)
{
  int ret;
  struct pollfd pfd[2];
  uart_poll_init(fd_uart, pfd);
  char buffer[8];
  ssize_t bytes_read;

  while(true)
  {
    ret = poll(pfd, 2, -1);
    if(ret == 0)
    {
      err_output("poll timed out\n");
      return 1;
    }
    else if(ret < 0)
    {
      errno_output("poll\n");
      return 2;
    }

    if(verbose)
    {
      debug_output("received input\n");
    }

    if(pfd[0].revents & POLLIN)
    {
      uart_write(fd_uart, verbose);
    }

    if(pfd[1].revents & POLLIN)
    {
      bytes_read = uart_read(fd_uart, buffer, 8, verbose);
      if(bytes_read > 0)
      {
        info_output("uart  read[%d]: %s", bytes_read, buffer);
      }
    }
  }

  return 0;
}
{{< / highlight >}}

## Verifying the UART Configuration

Here is an example configuration with 2000000 Baud, 8-Bits Data, Parity Enabled, and a single Stop Bit - `2000000 8E1`. The TTY is configured in Raw (non-canonical mode). This can be seen because the rows and columns are 0.

{{< highlight bash >}}
$ stty -F /dev/serial0 -a
speed 2000000 baud; rows 0; columns 0; line = 0;
intr = ^C; quit = ^\; erase = ^?; kill = ^U; eof = ^D; eol = <undef>; eol2 = <undef>; swtch = <undef>; start = ^Q; stop = ^S; susp = ^Z; rprnt = ^R;
werase = ^W; lnext = ^V; discard = ^O; min = 0; time = 0;
parenb -parodd -cmspar cs8 hupcl -cstopb cread clocal -crtscts
-ignbrk -brkint -ignpar parmrk inpck -istrip -inlcr -igncr -icrnl -ixon -ixoff -iuclc -ixany -imaxbel -iutf8
-opost -olcuc -ocrnl onlcr -onocr -onlret -ofill -ofdel nl0 cr0 tab0 bs0 vt0 ff0
-isig -icanon -iexten -echo echoe echok -echonl -noflsh -xcase -tostop -echoprt echoctl echoke -flusho -extproc
{{< / highlight >}}

## Code

{{< code-download >}}

Once installed you can simply do a:

{{< highlight bash >}}
$ uartd -h
Usage: uartd [OPTIONS]
Version 1.1

Program description ....
OPTIONS:
        -h --help                Print help
        -r --reset               SW Reset
        -t --test                Perform a test
        -s --speed               UART Speed
        -p --parity              Enable even parity
        -2 --twostop             Enable two stop bits
        -f --tty-filename        Filename for the tty. Default is /dev/serial0
{{< / highlight >}}

## Test setup Wiring

In order to verify and test what is in this post two Raspberry Pi boards were wired together.

{{< figure src="/assets/svg/uart-to-uart.svg" title="UART-to-UART communication">}}

As previously mentioned we must make sure the *mini-UART* is disabled in the device overlay. We also need the correct configuration in `raspi-config`. From there the `/dev/serial0` soft link needs to be have the correct source. For example the assumed soft link: `/dev/serial0 -> /dev/ttyAMA0`.

## Test setup Code

We can use a little trick to test parity. One of the Raspberry Pi boards we can enable two stop bits. On the other we can enable parity with only a single stop bit. By enabling two-stop bits we are fixing the parity bit in the UART frame to logic high. Thus, the transmitting end with two stop bits will always have the parity bit set to 1. On the receiving end we will detect and mark parity and expect errors about half the time. As for the special case of sending `255` which will mark two bytes mentioned above. I hacked the code to send some extra data as `255` this cannot be read from standard input since it's not in the ascii table and is 8-bits.

### Raspberry Pi 1 Configuration

Use the `-2` flag to enable two stop bits.

{{< highlight bash >}}
$ uartd -s 2000000 -2
{{< / highlight >}}

### Raspberry Pi 2 Configuration

Use the `-p` flag to enable parity.

{{< highlight bash >}}
$ uartd -s 2000000 -p
{{< / highlight >}}

Now we can type into the 1st Raspberry Pi and see the errors on the 2nd Raspberry Pi.

## References

[termios(3)](https://man7.org/linux/man-pages/man3/tcflush.3.html)
[select(2)](https://www.man7.org/linux/man-pages/man2/select.2.html)
