---
categories:
 - hardware
tags:
 - gpio
date: "2021-05-02"
title: "The new GPIO Interface on the Raspberry PI: libgpiod"
---

# {{< title >}}

Allegedly, The [GPIO Sysfs Interface](https://www.kernel.org/doc/html/latest/admin-guide/gpio/sysfs.html) is deprecated. The deprecated Sysfs would interact with GPIO using the `/sys/class/gpio` pseudo-filesytem. The Application Binary Interface - ABI - provides a character device based device driver and tools. The ABI is the new way to interact with GPIO on the Raspberry Pi. I really don't like the name ABI, as it's WAY too generic of a name. Rather, I believe the proper name for this project is `libgpiod`.

```
  libgpiod - C library and tools for interacting with the linux GPIO
             character device (gpiod stands for GPIO device)
```

## Advantages

Here are the main advantages I see for the new ABI:
* Better SW Architecture
* Resource Cleanup after program termination
* A Shared Library `libgpiod`
* Command Line Tools to interact with GPIO
* Python Headers
* Multiple GPIO Lines changed or read in single function call
* Library supports callbacks for rising/falling/both edges of a GPIO line

## Kernel Source

[Here](https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git/about/) is the official source. It contains both the library and tools.

## Deprecation of Sysfs

If you're interacting with `/sys/class/gpio` no new features will be developed. User-space consumers are now supposed to use the ABI to interact with GPIO.

## Installation of the `gpiod` tools

At this point on Raspbian 10 Buster with a 5.10 Kernel both `libgpiod` and `gpiod` are not pre-packaged and we must install them. Fortunately, the install is very easy. To install the ABI the following is recommended.

{{< highlight bash >}}
$ sudo apt install gpiod
{{< / highlight >}}

We can look more into what is installed:

{{< highlight bash >}}
$ apt show gpiod
Package: gpiod
Version: 1.2-3+rpi1
Priority: optional
Section: misc
Source: libgpiod
Maintainer: SZ Lin (林上智) <szlin@debian.org>
Installed-Size: 72.7 kB
Depends: libc6 (>= 2.16), libgpiod2 (>= 1.2)
Homepage: https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git
Download-Size: 13.9 kB
APT-Manual-Installed: yes
APT-Sources: http://raspbian.raspberrypi.org/raspbian buster/main armhf Packages
Description: Tools for interacting with Linux GPIO character device - binary
 libgpiod encapsulates the ioctl calls and data structures
 behind a straightforward API. This new character device
 interface guarantees all allocated resources are freed after
 closing the device file descriptor and adds several new
 features that are not present in the obsolete sysfs interface
 (like event polling, setting/reading multiple values at once or
 open-source and open-drain GPIOs).
 .
 This package contains the gpiod binary tools.
{{< / highlight >}}

The library `libgpiod2` has the following:
{{< highlight bash >}}
apt show libgpiod2
Package: libgpiod2
Version: 1.2-3+rpi1
Priority: optional
Section: libs
Source: libgpiod
Maintainer: SZ Lin (林上智) <szlin@debian.org>
Installed-Size: 103 kB
Depends: libc6 (>= 2.16), libgcc1 (>= 1:3.5), libstdc++6 (>= 5.2)
Conflicts: libgpiod1
Replaces: libgpiod1
Homepage: https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git
Download-Size: 29.0 kB
APT-Manual-Installed: yes
APT-Sources: http://raspbian.raspberrypi.org/raspbian buster/main armhf Packages
Description: C library for interacting with Linux GPIO device - shared libraries
 libgpiod encapsulates the ioctl calls and data structures
 behind a straightforward API. This new character device
 interface guarantees all allocated resources are freed after
 closing the device file descriptor and adds several new
 features that are not present in the obsolete sysfs interface
 (like event polling, setting/reading multiple values at once or
 open-source and open-drain GPIOs).
 .
 This package contains the required shared libraries.
{{< / highlight >}}

# Installation of the `gpio` Libraries

If we want to install the libraries for development we need to do the following.

{{< highlight bash >}}
$ sudo apt install libgpiod-dev
{{< / highlight >}}

Here is the info on `libgpiod-dev`:

{{< highlight bash >}}
$ sudo apt info libgpiod-dev
Package: libgpiod-dev
Version: 1.2-3+rpi1
Priority: optional
Section: libdevel
Source: libgpiod
Maintainer: SZ Lin (林上智) <szlin@debian.org>
Installed-Size: 255 kB
Depends: libgpiod2 (= 1.2-3+rpi1)
Suggests: libgpiod-doc
Homepage: https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git
Download-Size: 46.3 kB
APT-Manual-Installed: yes
APT-Sources: http://raspbian.raspberrypi.org/raspbian buster/main armhf Packages
Description: C library for interacting with Linux GPIO device - static libraries and headers
 libgpiod encapsulates the ioctl calls and data structures
 behind a straightforward API. This new character device
 interface guarantees all allocated resources are freed after
 closing the device file descriptor and adds several new
 features that are not present in the obsolete sysfs interface
 (like event polling, setting/reading multiple values at once or
 open-source and open-drain GPIOs).
 .
 This package contains the required static libraries, headers, and C++ bindings.

{{< / highlight >}}

The development package installs the C libraries and header files for us to use.

{{< highlight bash >}}
dpkg-query -L libgpiod-dev
/.
/usr
/usr/include
/usr/include/gpiod.h
/usr/include/gpiod.hpp
/usr/lib
/usr/lib/arm-linux-gnueabihf
/usr/lib/arm-linux-gnueabihf/libgpiod.a
/usr/lib/arm-linux-gnueabihf/libgpiodcxx.a
/usr/lib/arm-linux-gnueabihf/pkgconfig
/usr/lib/arm-linux-gnueabihf/pkgconfig/libgpiod.pc
/usr/lib/arm-linux-gnueabihf/pkgconfig/libgpiodcxx.pc
/usr/share
/usr/share/doc
/usr/share/doc/libgpiod-dev
/usr/share/doc/libgpiod-dev/README.gz
/usr/share/doc/libgpiod-dev/changelog.Debian.gz
/usr/share/doc/libgpiod-dev/copyright
/usr/lib/arm-linux-gnueabihf/libgpiod.so
/usr/lib/arm-linux-gnueabihf/libgpiodcxx.so
{{< / highlight >}}

Namely, the `/usr/include/gpiod.h` C header file and the `/usr/lib/arm-linux-gnueabihf/libgpiod.so` Shared Library.

# Nomenclature

With `libgpiod` we have the following nomenclature:

GPIO Chip - A chip that controls multiple GPIO lines. The Raspberry Pi has `/dev/gpiochip0`.
GPIO Line - Each GPIO Chip has multiple GPIO Lines. A line maps to physical GPIO pin.

# Tools packaged in `gpiod`

We now get the following tools:

```
gpiodetect gpioinfo gpioget gpioset gpiomon gpiofind
```

## The `gpioinfo` tool

{{< highlight bash >}}
$  gpioinfo --help
Usage: gpioinfo [OPTIONS] <gpiochip1> ...
Print information about all lines of the specified GPIO chip(s) (or all gpiochips if none are specified).

Options:
  -h, --help:		display this message and exit
  -v, --version:	display the version and exit
{{< / highlight >}}


## The `gpiodetect` tool

{{< highlight bash >}}
$ gpiodetect --help
Usage: gpiodetect [OPTIONS]
List all GPIO chips, print their labels and number of GPIO lines.

Options:
  -h, --help:		display this message and exit
  -v, --version:	display the version and exit
{{< / highlight >}}

## The `gpiofind` tool

{{< highlight bash >}}
$ gpiofind --help
Usage: gpiofind [OPTIONS] <name>
Find a GPIO line by name. The output of this command can be used as input for gpioget/set.

Options:
  -h, --help:		display this message and exit
  -v, --version:	display the version and exit
{{< / highlight >}}

## The `gpiomon` tool

{{< highlight bash >}}
$ gpiomon --help                                                                                                                                                                                                                                           1 ↵
Usage: gpiomon [OPTIONS] <chip name/number> <offset 1> <offset 2> ...
Wait for events on GPIO lines

Options:
  -h, --help:		display this message and exit
  -v, --version:	display the version and exit
  -l, --active-low:	set the line active state to low
  -n, --num-events=NUM:	exit after processing NUM events
  -s, --silent:		don't print event info
  -r, --rising-edge:	only process rising edge events
  -f, --falling-edge:	only process falling edge events
  -F, --format=FMT	specify custom output format

Format specifiers:
  %o:  GPIO line offset
  %e:  event type (0 - falling edge, 1 rising edge)
  %s:  seconds part of the event timestamp
  %n:  nanoseconds part of the event timestamp
{{< / highlight >}}

## The `gpioset` and `gpioget` tools

{{< highlight bash >}}
$ gpioset --help
Usage: gpioset [OPTIONS] <chip name/number> <offset1>=<value1> <offset2>=<value2> ...
Set GPIO line values of a GPIO chip

Options:
  -h, --help:		display this message and exit
  -v, --version:	display the version and exit
  -l, --active-low:	set the line active state to low
  -m, --mode=[exit|wait|time|signal] (defaults to 'exit'):
		tell the program what to do after setting values
  -s, --sec=SEC:	specify the number of seconds to wait (only valid for --mode=time)
  -u, --usec=USEC:	specify the number of microseconds to wait (only valid for --mode=time)
  -b, --background:	after setting values: detach from the controlling terminal

Modes:
  exit:		set values and exit immediately
  wait:		set values and wait for user to press ENTER
  time:		set values and sleep for a specified amount of time
  signal:	set values and wait for SIGINT or SIGTERM
{{< / highlight >}}

{{< highlight bash >}}
$ gpioget --help
Usage: gpioget [OPTIONS] <chip name/number> <offset 1> <offset 2> ...
Read line value(s) from a GPIO chip

Options:
  -h, --help:		display this message and exit
  -v, --version:	display the version and exit
  -l, --active-low:	set the line active state to low
{{< / highlight >}}


# Mapping GPIO to Physical Pins

We can use the `gpioinfo` program to see how the GPIO lines are configured. The Broadcom BCM2835 has 54 general-purpose I/O (GPIO) lines split into two banks. Depending on the Raspberry Pi version there maybe more GPIO lines. More can be found on the [BCM2835-ARM-Peripherals.pdf](https://www.raspberrypi.org/app/uploads/2012/02/BCM2835-ARM-Peripherals.pdf) in Chapter 6 for GPIO. Not all of these 54+ GPIO lines in the BCM2835 are wired directly to the header on the Raspberry Pi. When wired to the header these numbers do no correlate to the pin number of the header. We can reference [pinout.xyz](https://pinout.xyz) to find the mapping between the GPIO line on the chip to the physical header pin. Since the Raspberry Pi only has a 40-pin header many of these I/O lines are not used.

Below the output of the `gpioinfo` on a Raspberry Pi 4:
{{< highlight bash >}}
$ gpioinfo
pi@raspberrypi:~ $ gpioinfo
gpiochip0 - 58 lines:
	line   0:     "ID_SDA"       unused   input  active-high
	line   1:     "ID_SCL"       unused   input  active-high
	line   2:       "SDA1"       unused   input  active-high
	line   3:       "SCL1"       unused   input  active-high
	line   4:  "GPIO_GCLK"       unused   input  active-high
	line   5:      "GPIO5"       unused   input  active-high
	line   6:      "GPIO6"       unused   input  active-high
	line   7:  "SPI_CE1_N"       unused   input  active-high
	line   8:  "SPI_CE0_N"       unused   input  active-high
	line   9:   "SPI_MISO"       unused   input  active-high
	line  10:   "SPI_MOSI"       unused   input  active-high
	line  11:   "SPI_SCLK"       unused   input  active-high
	line  12:     "GPIO12"       unused   input  active-high
	line  13:     "GPIO13"       unused   input  active-high
	line  14:       "TXD1"       unused   input  active-high
	line  15:       "RXD1"       unused   input  active-high
	line  16:     "GPIO16"       unused   input  active-high
	line  17:     "GPIO17"       unused   input  active-high
	line  18:     "GPIO18"      "sysfs"   input  active-high [used]
	line  19:     "GPIO19"       unused   input  active-high
	line  20:     "GPIO20"       unused   input  active-high
	line  21:     "GPIO21"       unused   input  active-high
	line  22:     "GPIO22"       unused   input  active-high
	line  23:     "GPIO23"      "sysfs"  output  active-high [used]
	line  24:     "GPIO24"      "sysfs"  output  active-high [used]
	line  25:     "GPIO25"       unused   input  active-high
	line  26:     "GPIO26"       unused   input  active-high
	line  27:     "GPIO27"       unused   input  active-high
	line  28: "RGMII_MDIO"       unused   input  active-high
	line  29:  "RGMIO_MDC"       unused   input  active-high
	line  30:       "CTS0"       unused   input  active-high
	line  31:       "RTS0"       unused   input  active-high
	line  32:       "TXD0"       unused   input  active-high
	line  33:       "RXD0"       unused   input  active-high
	line  34:    "SD1_CLK"       unused   input  active-high
	line  35:    "SD1_CMD"       unused   input  active-high
	line  36:  "SD1_DATA0"       unused   input  active-high
	line  37:  "SD1_DATA1"       unused   input  active-high
	line  38:  "SD1_DATA2"       unused   input  active-high
	line  39:  "SD1_DATA3"       unused   input  active-high
	line  40:  "PWM0_MISO"       unused   input  active-high
	line  41:  "PWM1_MOSI"       unused   input  active-high
	line  42: "STATUS_LED_G_CLK" "led0" output active-high [used]
	line  43: "SPIFLASH_CE_N" unused input active-high
	line  44:       "SDA0"       unused   input  active-high
	line  45:       "SCL0"       unused   input  active-high
	line  46: "RGMII_RXCLK" unused input active-high
	line  47: "RGMII_RXCTL" unused input active-high
	line  48: "RGMII_RXD0"       unused   input  active-high
	line  49: "RGMII_RXD1"       unused   input  active-high
	line  50: "RGMII_RXD2"       unused   input  active-high
	line  51: "RGMII_RXD3"       unused   input  active-high
	line  52: "RGMII_TXCLK" unused input active-high
	line  53: "RGMII_TXCTL" unused input active-high
	line  54: "RGMII_TXD0"       unused   input  active-high
	line  55: "RGMII_TXD1"       unused   input  active-high
	line  56: "RGMII_TXD2"       unused   input  active-high
	line  57: "RGMII_TXD3"       unused   input  active-high
gpiochip1 - 8 lines:
	line   0:      "BT_ON"       unused  output  active-high
	line   1:      "WL_ON"       unused  output  active-high
	line   2: "PWR_LED_OFF" "led1" output active-low [used]
	line   3: "GLOBAL_RESET" unused output active-high
	line   4: "VDD_SD_IO_SEL" "vdd-sd-io" output active-high [used]
	line   5:   "CAM_GPIO"       unused  output  active-high
	line   6:  "SD_PWR_ON" "sd_vcc_reg"  output  active-high [used]
	line   7:    "SD_OC_N"       unused   input  active-high
{{< / highlight >}}

# Examples using the `gpiod` tools

Hopefully, I'll add the next two examples soon.

1) Configure an output line and set it high and low. Example usage would be to [blink an LED](/post/hardware/libgpiod-blink-led-rpi/).
2) [Configure an input line](/post/hardware/libgpiod-input-rpi/). Example usage would be a push-button switch.
3) [Wait for an event on an input line](/post/hardware/libgpiod-event-rpi/). An example would be a external chip has data ready and we'd read from it.
