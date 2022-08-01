---
categories:
 - hardware
tags:
 - lora
 - wireless
 - ebyte-e32-lora
date: "2021-06-18"
title: Ebyte E32 Lora Module - Transfer Files
---

This post explains how to transfer files over Lora using the `e32` program. See [getting started](/post/hardware/ebyte-e32-lora-getting-started/) for the background.

# Prerequisites

We must first assume the `e32` is not [running as a service](/post/hardware/ebyte-e32-lora-getting-started/). If not sure run a `sudo systemctl stop e32` to stop it.


# Transferring Files Between two Raspberry Pi Boards

We obviously need at least two Ebyte e32 lora modules for this.

## Receiving

From one Raspberry Pi with the `e32` installed. We need to be receiving before we transmit the file.

{{< highlight bash >}}
receiver$ e32 -s # make sure this is good
receiver$ e32 --out-file f
waiting for input from terminal
{{< / highlight >}}

## Sending a file

We can transmit the contents of a file:

{{< highlight bash >}}
transmitter$ e32 -s # make sure this is good
transmitter$ cat f
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxyy
transmitter$ e32 --in-file f
waiting for input from terminal
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxyy
transmitter$
{{< / highlight >}}

# Viewing the Contents

{{< highlight bash >}}
receiver$ cat f
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxyy
{{< / highlight >}}
