---
title: "Uart Raspberry Pi"
date: 2022-08-10
draft: false
categories:
- hardware
- unix
---

This post outlines how to control the UART in a Rasperry Pi in the C programming language. We will also explore how partity checks and made and bytes are marked when parity errors occur.

# UARTs are Cool

Why are they cool?

* UARTs are quite fast. As of this writing max transfer speeds of 2,000,000 Baud are supported. A speed of 2M Baud is more than sufficient for many Raspberry Pi projects.
* UARTs have basic error detection with parity
* UARTs are asychronous meaning you can transmit and receive simultanously and at different speeds
* In Unix you set up the UART and the programing paradigm is just `read` and `write` to a file descriptor. It's the universal method.

# Quick Background Theory

The recieving and transmitting end of the UART must be set the same on both ends to have the following:
* Speed which is set in Baud
* Number of data bits - 5,6,7 or 8 Bits
* Parity Bit or not - more on this later
* One or two stop bits

With these settings you can have a min of 1+5+1=7 Bits to a max of 1+8+1+2=12 Bits per frame on the wire.

{{< figure src="/assets/svg/uart.svg" title="UART data frame timing">}}

The line is high by default.

# Parity Settings

The UART allows for an optional bit in the data frame for parity. This bit is filled in by the UART on transmission and read on reception. The parity bit is added to the number of 1s in the data frame to make either even or odd parity. Here are some examples:

| Data  | Even Parity | Odd Parity |
|-------|-------------|------------|
| 00000 | 0           | 1          |
| 00001 | 1           | 0          |
| 01001 | 0           | 1          |
| 00100 | 1           | 0          |
| 11111 | 1           | 0          |

Checking parity adds up the number of 1s in the data. We can then add a 1 or 0 to make the sum even or odd. It's a very simple way to know if we have a single bit error. However, you could have 2 bit errors and it would go undetected, or even 2*N bit errors. Or even double errors with bits and parity. These scenarios are less likely.

When the UART receives a byte if the parity settings are enabled it will compute what it detects for parity and if it doesn't match it will *mark* the data it receives. Let's say we have `sdddddps` - for *s*tart, 5 *d*ata bits, 1 *p*arity bit and a *s*top bit.

Assuming even parity let's say we transmit data of `00001` and the last bit was in error to make `00000`. The data frame would be received
{{< highlight bash >}}
10000111 # uart transmits 00001 with even parity bit to be 1
10000011 # another uart receives an erroneous frame
{{< / highlight >}}

The receiving UART will *mark* this data when it is read. We will get 3 bytes instead of one byte. That byte stream will be `0xff 0x00 0x00` where the first two bytes `0xff 0x00` are the *mark* and the last byte `0x00` is the byte we received in error.

Note, the fact that you expect one byte and read in 3 bytes makes the programming a little more tricky ...


@startuml
binary  "Data Frame" as D

@0
D is 1

@10
D is 0


@20
D is 0
@30
D is 0
@40
D is 1
@50
D is 0
@60
D is 0
@70
D is 1
@80
D is 0
@90
D is 0

@100
D is 1

@110
D is 1

highlight 0 to 10 #Gold;line:DimGrey : Start
highlight 100 to 110 #Gold;line:DimGrey : Parity
highlight 110 to 120 #Gold;line:DimGrey : Stop
@enduml

{{< figure src="/assets/svg/uart-to-uart" title="UART wired to another UART">}}
[termios(3)](https://man7.org/linux/man-pages/man3/tcflush.3.html)

