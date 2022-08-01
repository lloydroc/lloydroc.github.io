---
categories:
 - hardware
tags:
 - lora
 - wireless
 - ebyte-e32-lora
date: "2021-07-23"
title: Ebyte e32 Lora Module - Client Socket Examples
---

This post currently has a example client in Python that sends information through Unix Domain Sockets when the `e32` is running as a service. Adding clients in other programming languages is a hopeful future addition. See [Getting Started](/post/hardware/ebyte-e32-lora/).

# Prerequisites

Ensure either you have the `e32` programming running with sockets enabled. Or, preferred, [running as a service](/post/hardware/ebyte-e32-lora-systemd-service/).

More background on can be found in [e32 sockets](/post/hardware/ebyte-e32-lora-sockets/).

# Client Tools

The client tools called `e32tx` and `e32rx` will be installed on the Raspberry Pi by default when you do a `sudo make install` in the [Installation Steps](/post/hardware/ebyte-e32-lora/#installation).

## Python Client to send data over the Socket

Here is a simple Python client that will connect. It's installed in `/usr/local/bin/` and is called `e32tx`:

{{< highlight bash >}}
$ ls -l /usr/local/bin/e32tx
-rwxr-xr-x 1 root root 785 Jul  8 09:32 /usr/local/bin/e32tx
$ which e32tx
/usr/local/bin/e32tx
{{< / highlight >}}

### Transmit Data

We can simply now transmit data by running the following in a shell:

{{< highlight bash >}}
$ e32tx "hello world"
registering socket /home/pi/e32.tx.data to /run/e32.data
client registered
sending 11 b'hello world'
success! received 1 byte from socket /run/e32.data
{{< / highlight >}}

### Transmit through Socket Python Script

Here are the contents or `e32tx`:

{{< highlight python >}}
#!/usr/bin/python3

"""
Write data to the socket of the e32 for transmission
"""

import socket
import sys
import os
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description="Transmit Data through the e32 socket")
parser.add_argument('message',
    help="The message to send")
parser.add_argument('--datasock',
    help="data socket to send data to the e32",
    default="/run/e32.data")
parser.add_argument('--clientsock',
    help="socket e32 sends data to",
    default=str(Path.home())+"/e32.tx.data")
parser.add_argument('--skip-registration',
    help="don't register this client when data is received over LoRa",
    action='store_true')

args = parser.parse_args()

e32_sock = args.datasock
csock_file = args.clientsock

if os.path.exists(csock_file):
    os.remove(csock_file)

csock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
csock.bind(csock_file)

if not args.skip_registration:
    print("registering socket", csock_file, "to", e32_sock)
    csock.sendto(b'', e32_sock)
    (msg, address) = csock.recvfrom(10)

    if len(msg) != 1 or msg[0] != 0:
        print("unable to register client")
        sys.exit(1)
    else:
        print("client registered")

msg = str.encode(args.message)
print("sending", len(msg), msg)

csock.sendto(msg, e32_sock)
(msg, address) = csock.recvfrom(512)

if len(msg) == 1 and msg[0] == 0:
    print("success! received 1 byte from socket", address)
else:
    print("failed to send data. len:", len(msg))
    sys.exit(1)
{{< / highlight >}}

## Python Client to receive data over the Socket

We have a Python script to receive from the `e32`. This script is named `e32rx`.


### Receive Data

Here is how we can receive data.

{{< highlight bash >}}
$ e32rx
registering socket /run/e32.data
client registered
received from /run/e32.data 13 bytes with b'hello world!\n'
^C
{{< / highlight >}}


### Receive through Socket Python Script

Below is the content of the python script `e32rx`.

{{< highlight python >}}
#!/usr/bin/python3

"""
Read received data from the e32 socket
"""

import socket
import sys
import os
import signal
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description="Receive data from the e32 socket")
parser.add_argument('--datasock',
    help="data socket to send data to the e32",
    default="/run/e32.data")
parser.add_argument('--clientsock',
    help="client socket for e32 to send data this program",
    default=str(Path.home())+"/e32.rx.data")

args = parser.parse_args()

# register a signal handler so when clean up the socket on ^C for instance
def handler(signum):
    """ Handle signals by closing the socket """
    if signum == signal.SIGINT:
        close_sock()
    sys.exit(1)

signal.signal(signal.SIGALRM, handler)
signal.signal(signal.SIGINT, handler)

def close_sock():
    """ close the socket and delete the file """
    global client_sock
    global csock

    print("closing client socket", client_sock)

    csock.close()

    if os.path.exists(client_sock):
        os.remove(client_sock)

client_sock = args.clientsock
e32_sock = args.datasock

if os.path.exists(client_sock):
    os.remove(client_sock)

csock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
csock.bind(client_sock)

print("registering socket", e32_sock)
csock.sendto(b'', e32_sock)
(msg, address) = csock.recvfrom(10)

if msg[0] != 0:
    print("unable to register client")
    sys.exit(1)
else:
    print("client registered")

while True:
    # receive from the e32
    (msg, address) = csock.recvfrom(59)
    print("received from", address, len(msg),"bytes with", msg)
{{< / highlight >}}
