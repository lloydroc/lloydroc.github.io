---
categories:
 - c
 - hardware
tags:
 - arduino
 - raspberry-pi
date: "2020-03-18T14:02:54Z"
title: UART Between Raspberry Pi and Arduino
aliases:
  - /c/uart/rpi/arduino/2020/03/18/c-uart-rpi-and-arduino.html
---

Using a 2-wire serial connection we can communicate from a Raspberry Pi (RPi) to an Arduino. For the Raspberry Pi we'll use the built in UART accessed through a `tty`, and the Arduino we'll use the [Serial](https://www.arduino.cc/reference/en/language/functions/communication/serial/) Communication Library.

# What this Example Does?

This example will use a RPi and Arduino to send a fixed message from the RPi to the Arduino. The Arduino will then echo what it receives back the RPi. The hardware used was a RPi B+ and the Arduino Due. The code is all in C/C++.

# How this Post is Organized

* Pre-Requisites of the setup. This is mostly preparing your `tty` in Raspbian and proper file permissions
* Wiring. The physical wiring between the Raspberry Pi and the Arduino.
* Terminals (`tty`) in Unix, some theory, how to test, and get information
* C Code for the Raspberry Pi
* Arduino Sketch to echo what is sent from the Raspberry Pi to the Arduino
* Running and downloading the example

# Pre-Requisites

For the pre-requisites in this example a Raspberry Pi B+ was used with the following version of Raspbian.

{{< highlight bash >}}
pi@raspberrypi:~ $ uname -a
Linux raspberrypi 4.19.93+ #1290 Fri Jan 10 16:34:37 GMT 2020 armv6l GNU/Linux
pi@raspberrypi:~ $
{{< /highlight >}}

The Arduino is an Arduino Due with Arduino Genuino 1.18.2.

Note: There really isn't any reason you cannot use any of the Raspberry Pi and Arduino product line, it's just a matter of mapping the pins, files, functionality and hardware to the product. I'd actually be surprised if it wasn't easy, or even no real changes to use something else.

# Wiring - Do you have a 3.3V to 5V Issue?
Before you even start the RPi I/O operates at +3.3V and most, not all Arduino's operate at +5V. You will need to use one of the various mechanisms to translate +3.3V to +5V. If you don't you'll damage the pins on the RPi. For this I used an Arduino Due which has +3.3V I/O Pins, and it's easy since you can directly connect to the Raspberry Pi.

Wiring two UARTs together requires connecting Tx and Rx pins from the Raspberry Pi to the Rx and Tx pins on the Arduino. The Tx pin on one, goes to the Rx pin on the other. On my RPi B+ these are the `TXD` and `RXD` pins which map to Pins 8 and 10, which map to BCM 14 an BCM 15. Refer to this excellent [Raspberry Pi Pinout](https://pinout.xyz/#). For the Arduino Due the pins `18(TX)` and `19(RX)` for `Serial1`.

# Theory - Using a UART in Unix

A Universal Asynchronous Receiver/Transmitter (UART) does serial communications. There is also a Universal Synchronous/Asynchronous Receiver/Transmitter (USART). For this example we actually will do synchronous serial communications, although, it could be extended to do asynchronous where the RPi and Arduino could both send and receive asynchronously.

To communicate with a UART in Unix you use a **Terminal**. This is also referred to as a `tty` for *T*ele*TY*pewriter and goes WAY back. To communicate with a tty we do basic file I/O where the file is a Unix Character Device. This device on the RPi happens to be `/dev/ttyAMA0` on the RPi. In order to do file I/O on a terminal we have to configure it properly using the `termios` structure. An example will be shown below on how this `termios` structure is setup.

There are lot of examples using a `tty` in Unix online. However, I highly recommend reading all of `man termios`. It's a VERY good authoritative reference.

## The UART as a Terminal in Raspbian

As mentioned we'll be configuring `/dev/ttyAMA0` as a Terminal. The amount of attributes to configure terminals can be overwhelming because there are so many. These attributes relate to input, output, control, local modes, as well as, special characters. Terminals in Unix handle so many things, from USB, UARTs, VIM, SSH, Shells, Serial Ports, ... They need to be very flexible and hence have a lot of attributes.

You can easily see the attributes or a terminal device. First let's get the permissions of our character `tty` device correct so we don't have to be `root`.

{{< highlight bash >}}
pi@raspberrypi:~ $ ls -l /dev/ttyAMA0
crw--w---- 1 root tty 204, 64 Feb  3 22:12 /dev/ttyAMA0
pi@raspberrypi:~ $y
{{< /highlight >}}

We don't want to be `root` to do everything. let's add ourself to the `tty` group and change the permissions of the character device to have group read privileges.

{{< highlight bash >}}
pi@raspberrypi:~ $ sudo usermod -a -G tty pi
pi@raspberrypi:~ $ sudo chmod g+r /dev/ttyAMA0
pi@raspberrypi:~ $ exit
{{< /highlight >}}

We have to `exit` and log back in for the group privileges to be applied.

Now let's check out our terminal settings.

{{< highlight bash >}}
pi@raspberrypi:~ $ stty -F /dev/ttyAMA0 -a
speed 115200 baud; rows 24; columns 80; line = 0;
intr = ^C; quit = ^\; erase = ^?; kill = ^U; eof = ^D; eol = <undef>;
eol2 = <undef>; swtch = <undef>; start = ^Q; stop = ^S; susp = ^Z; rprnt = ^R;
werase = ^W; lnext = ^V; discard = ^O; min = 1; time = 0;
-parenb -parodd -cmspar cs8 hupcl -cstopb cread clocal -crtscts
-ignbrk -brkint -ignpar -parmrk -inpck -istrip -inlcr -igncr -icrnl -ixon -ixoff
-iuclc -ixany -imaxbel iutf8
opost -olcuc -ocrnl onlcr -onocr -onlret -ofill -ofdel nl0 cr0 tab0 bs0 vt0 ff0
-isig -icanon -iexten -echo -echoe -echok -echonl -noflsh -xcase -tostop -echoprt
-echoctl -echoke -flusho -extproc
pi@raspberrypi:~ $
{{< /highlight >}}

There is a LOT of output here from the `stty` tool. The attributes at the bottom that start with a `-` means they are not enabled. For example ICANON - canonical mode - is disabled because we see `-icanon`. The attribute `cs8` is enabled. We can see that the baud rate is `115200`. All of this is documented. It can be seen by doing a `man termios`. To search for attributes using upper case. E.g. `ICANON` not `icanon` as displayed by `stty`.

### Terminal Cooked mode versus Raw Mode

There are two modes for a Terminal in Linux. Cooked Mode - also known as Canonical Mode, and Raw mode - also known as non-canonical mode. The difference really is Cooked mode will read a line at a time, and Raw mode will read a character at a time. [Here](http://web.archive.org/web/20161224020948/http://www.lafn.org:80/~dave/linux/terminalIO.html) is a great explanation of this. For this example we'll use Raw Mode so we're sending a character (byte) at a time from the Raspberry Pi to the Arduino.

## C Header to Communicate with the UART

A C Header to communicate with the UART for the Raspberry Pi. It's simple, we'll just define one function called `uart_open` that will return a file descriptor. If it's less than 1 then it's an error.

{{< highlight c >}}
// file: uart.h
#include <fcntl.h>
#include <unistd.h>
#include <termios.h>
#include <string.h>
#include "error.h"

#define UART0 "/dev/ttyAMA0"

int uart_open();
{{< /highlight >}}

## C Implementation to set up the UART

Here is where the main challenge is. We will have to open our terminal device, set up the terminal in raw mode and return the file descriptor. From here, we can treat the UART as a normal file. This means we can use the `read` and `write` functions to simple read and write to our UART.

{{< highlight c >}}
// file uart.c
#include "uart.h"

static int
tty_open(char *ptyName)
{
  int UART;
  struct termios ttyOrig;

  UART = open(ptyName, O_RDWR | O_NOCTTY);
  if(UART == -1)
  {
    err_output("error opening terminal %s\n", ptyName);
    close(UART);
    return UART;
  }

  if(tcgetattr(UART, &ttyOrig) == -1)
  {
    err_output("unable to get tty attributes for %s\n", ptyName);
    close(UART);
    return -1;
  }

  cfsetispeed(&ttyOrig, B115200);
  cfsetospeed(&ttyOrig, B115200);
  cfmakeraw(&ttyOrig);

  ttyOrig.c_cflag |= CREAD | CLOCAL;
  ttyOrig.c_cc[VMIN] = 1;
  ttyOrig.c_cc[VTIME] = 0; /* non-zero won't timeout on read anyways */
  if(tcsetattr(UART, TCSANOW, &ttyOrig) == -1)
  {
    err_output("error setting terminal attributes");
    close(UART);
    return -1;
  }

  tcflush(UART, TCIFLUSH);
  tcdrain(UART);

  return UART;
}

int
uart_open()
{
  int FILE;
  /* check the uart exits */
  if(access(UART0, F_OK) == -1)
    return -2;
  FILE = tty_open(UART0);
  return FILE;
}
{{< /highlight >}}

## Running the UART Example

To run the example we have our main method. Note, you must pass in an argument for it to read back. This is mainly for debugging purposes.

{{< highlight c >}}
// file: main.c
#include "../config.h"
#include "uart.h"
#include <stdio.h>

int
main(int argc, char *argv[])
{
  int UART;
  ssize_t bytes, total_bytes, write_bytes;
  char msg[] = "hello world\n";
  char buf[4096];

  UART = uart_open();

  if(UART == -1)
    err_exit("unable to open UART");
  else if(UART == -2)
    _exit(77);

  write_bytes = strlen(msg);
  bytes = write(UART, msg, write_bytes);
  if(bytes == -1)
  {
    close(UART);
    err_exit("unable to write to UART\n");
  }

  /* we'll only readback bytes if an argument is specified */
  if(argc == 1)
  {
    close(UART);
    return EXIT_SUCCESS;
  }

  do
  {
    bytes = read(UART, &buf, sizeof(buf));
    total_bytes += bytes;
    if(bytes == -1)
    {
      close(UART);
      err_exit("unable to read from UART\n");
    }
    for(int i=0;i<bytes;i++)
      printf("%c", buf[i]);
  }
  while(bytes > 0 && total_bytes < write_bytes);

  close(UART);
  return EXIT_SUCCESS;
}
{{< /highlight >}}

After this code is run it will set-up our terminal with a bunch of new attributes. We can see them with the `stty` command. This is different than what we see at the start of this post with the default attributes.

{{< highlight bash >}}
pi@raspberrypi:~ $ stty -F /dev/ttyAMA0 -a
speed 115200 baud; rows 0; columns 0; line = 0;
intr = <undef>; quit = <undef>; erase = <undef>; kill = <undef>; eof = <undef>; eol = <undef>; eol2 = <undef>; swtch = <undef>; start = <undef>; stop = <undef>;
susp = <undef>; rprnt = <undef>; werase = <undef>; lnext = <undef>; discard = <undef>; min = 1; time = 0;
-parenb -parodd -cmspar cs8 -hupcl -cstopb cread clocal -crtscts
-ignbrk -brkint -ignpar -parmrk -inpck -istrip -inlcr -igncr -icrnl -ixon -ixoff -iuclc -ixany -imaxbel -iutf8
-opost -olcuc -ocrnl -onlcr -onocr -onlret -ofill -ofdel nl0 cr0 tab0 bs0 vt0 ff0
-isig -icanon -iexten -echo -echoe -echok -echonl -noflsh -xcase -tostop -echoprt -echoctl -echoke -flusho -extproc
pi@raspberrypi:~ $
{{< /highlight >}}

## Downloading the Example

Download the [rpi-arduino-uart](/code/rpi-arduino-uart-1.0.tar.gz) example. Then to run do the following:

{{< highlight bash >}}
$ tar zxf rpi-arduino-uart-1.0.tar.gz
$ cd rpi-arduino-uart-1.0/
$ ./configure
$ make
$ uart 1
hello world
$
{{< /highlight >}}

Here `hello world` was sent out the UART of the Raspberry Pi to the Arduino and from the Arduino back to the Raspberry Pi and printed to the terminal.

# Arduino Sketch to Echo Back through the UART

The following sketch will echo back what is sent on `Serial1` which corresponds to a UART back out to what was received. All the characters that come in through `Serial1` will go back out `Serial1`. This is so when we run the C on our Raspberry Pi we'll see our message back on the terminal.

{{< highlight c >}}
// file: uart_echo.ino

int incomingByte;

void setup() {
  // Serial is to debug through the Serial Monitor
  Serial.begin(9600);

  // The UART
  Serial1.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("starting");
}

void loop() {
  // if nothing is available get out
  if(Serial1.available() == 0) {
    digitalWrite(LED_BUILTIN, LOW);
    return;
  }
  digitalWrite(LED_BUILTIN, HIGH);

  // read the incoming byte:
  incomingByte = Serial1.read();

  // cast it to a char
  char c = (char) incomingByte;

  // output to the Serial Monitor
  Serial.print(c);

  // Echo it back out the UART
  Serial1.write(c);
}
{{< /highlight >}}

# Where to go from Here?

Depending on what you want to send and receive this example needs to be adapted. Perhaps, it's just output to the terminal of the Raspberry Pi so you want to just display it to the terminal. You might want to look at Cooked mode and have Arduino send lines ending with a new line. Perhaps, you want to send commands to the Arduino and based on what it reads from the UART it will do something. Another use would be asynchronous where at any given time the Raspberry Pi would be sending or receiving. Here you'd need to look at `man select` and do Asynchronous I/O in Unix. Doing this when the terminal is opened be sure to open with `O_NONBLOCK` and likely some other changes need to be done. For example `VMIN` could be 0 or we could have a deadlock. Which I've seen `EDEADLK` errno come while playing around with it.

It should be noted to use USB instead of the UART it's very easy. You can simply replace `/dev/ttyAMA0` with `/dev/ttyACM0` in the C code and `Serial1` to `SerialUSB` in the Arduino code.

