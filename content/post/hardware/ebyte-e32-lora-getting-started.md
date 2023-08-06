---
categories:
 - hardware
tags:
 - lora
 - wireless
 - ebyte-e32-lora
date: "2020-09-15"
title: Ebyte e32 LoRa Module - Getting Started
---

# {{< title >}}

This page documents software for the Ebyte e32 Lora module that runs on the Raspberry Pi which can be found in this [github repo]({{< e32repo >}}).  See below for [software installation](#software-installation).

![Ebyte e32 LoRa Module](/assets/jpg/ebyte-e32-lora-module.jpg)

## Resources

Wire up the Ebyte e32 Lora Module to the Raspberry Pi first. Then check out the other resources listed below:

* [Wiring and Pi Configuration](/post/hardware/ebyte-e32-lora-configuration-wiring/)
* [Running as a Service](/post/hardware/ebyte-e32-lora-systemd-service/)
* [Using Sockets](/post/hardware/ebyte-e32-lora-sockets/)
* [Client Example using Sockets](/post/hardware/ebyte-e32-lora-socket-client-examples/)
* [Transfer Files](/post/hardware/ebyte-e32-lora-transfer-files/)

# Software Installation

Before you install the `e32` program be sure to have completed the [Wiring and Pi Configuration](/post/hardware/ebyte-e32-lora-configuration-wiring/). These instructions are to be run on your Raspberry Pi. Download [e32]({{< e32get >}}). See instructions below.

{{< highlight bash >}}
wget {{< e32get >}}
tar zxf {{< e32ver >}}.tar.gz
cd {{< e32ver >}}
./configure
make
sudo make install
e32 --help # this should show the help of the tool that was installed
{{< / highlight >}}


## Usage

The C project will build a command line tool that also runs as a Unix Systemd Service which you can interface with using sockets. Below are the options. Note, there are many ways to send and receive data.

{{< highlight bash >}}
$ e32 -h
Usage: e32 [OPTIONS]
Version 1.10.0

A command line tool to transmit and receive data from the EByte e32 LORA Module. If this tool is run without options the e32 will transmit what is sent from the keyboard - stdin and will output what is received to stdout. Hit return to send the message. To test a connection between two e32 boards run a e32 -s on both to ensure status information is correct and matching. Once the status is deemed compatible on both e32 modules then run e32 without options on both. On the first type something and hit enter, which will transmit from one e32 to the other and you should see this message show up on second e32.

OPTIONS:
-h --help                Print help
-r --reset               SW Reset
-t --test                Perform a test
-v --verbose             Verbose Output
-s --status              Get status model, frequency, address, channel, data rate, baud, parity and transmit power.
-w --write-settings HEX  Write settings from HEX. see datasheet for these 6 bytes. Example: -w C000001A1744.
                         For the form XXYYYY1AZZ44. If XX=C0 parameters are saved to e32's EEPROM, if XX=C2 settings
                         will be lost on power cycle. The address is represented by YYYY and the channel is represented
                         by ZZ.
-y --tty                 The UART to use. Defaults to /dev/serial0 the soft link
-m --mode MODE           Set mode to normal, wake-up, power-save or sleep.
   --m0                  GPIO M0 Pin for output [23]
   --m1                  GPIO M1 Pin for output [24]
   --aux                 GPIO Aux Pin for input interrupt [18]
   --in-file  FILENAME   Transmit a file
   --out-file FILENAME   Write received output to a file
-x --sock-unix-data FILE Send and receive data from a Unix Domain Socket
-c --sock-unix-ctrl FILE Change and Read settings from a Unix Domain Socket
-d --daemon              Run as a Daemon
{{< / highlight >}}

### Getting Status

Once the [wiring](/post/hardware/ebyte-e32-lora-getting-started) is complete we can get the status of the module. This should be the first verification step. If you cannot get the status nothing else will work.

{{< highlight bash >}}
$ e32 --status
Version Raw Value:        0xc3450d14
Frequency:                868 MHz
Version:                  13
Features:                 0x14
Settings Raw Value:       0xc0010f1a1744
Power Down Save:          Save parameters on power down
Address:                  0x010f
Parity:                   8N1
UART Baud Rate:           9600 bps
Air Data Rate:            2400 bps
Channel:                  23
Frequency                 433 MHz
Transmission Mode:        Fixed
IO Drive:                 TXD and AUX push-pull output, RXD pull-up input
Wireless Wakeup Time:     250 ms
Forward Error Correction: on
TX Power:                 30 dBm
{{< / highlight >}}

## Transmitting Data from Standard Input

We can type directly into the `e32` and send what we type by hitting enter.

{{< highlight bash >}}
$ e32
waiting for input from terminal
I am typing, when I hit enter this line will be transmitted over the air
^C
{{< / highlight >}}

# Changing e32 settings

We can use the `-w HEX` option to change settings. For example we could save the settings by doing a `e32 -w C000001A1744`. See the datasheet for each of these options. For the form `XXYYYY1AZZ44`. If `XX=C0` parameters are saved to e32's EEPROM, if `XX=C2` settings will be lost on power cycle. The address is represented by `YYYY` and the channel is represented by `ZZ`.
