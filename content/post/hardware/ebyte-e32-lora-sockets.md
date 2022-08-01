---
categories:
 - hardware
tags:
 - lora
 - wireless
 - ebyte-e32-lora
date: "2021-06-08"
title: Ebyte e32 - Sockets
---

The [e32 program](/post/hardware/ebyte-e32-lora/) can run as a [daemon](/post/c/unix-daemon-example) and listen on [Unix Domain Sockets](/post/c/unix-domain-socket-datagram/) for data to transmit and receive. This post documents the functionality of the sockets the `e32` software is listening on.

# Intention of the Sockets

The software for the `e32` is written in the C Programming Language. I'm a huge fan of C, but it isn't for everyone, nor, is it for every application. The sockets are created so we can interface any program to the e32. Instead of having to write C code to do what you want, you can just use the `e32` as a *driver* and write a [client in any language](/post/hardware/ebyte-e32-lora-socket-client-examples/). When this client writes and reads from the socket it's transmitting and receiving wireless data. Since the sockets are Unix Domain Sockets they are reliable.

# The Data Socket and the Control Socket

We have two sockets to use:

{{< highlight bash >}}
$ e32 --sock-unix-data /run/e32.data --sock-unix-control /run/e32.control
{{< / highlight >}}

This will tell the `e32` to create two Unix Domain sockets. One socket for data creates the file `/run/e32.data` and one for control creates the file `/run/e32.control`. The data socket is for transmitting and receiving data over LoRa. The control socket is to configure the `e32`.

## The Data Socket

When data is written to the data socket it is transmitted wirelessly via LoRa. When data is received by the `e32` it will send this data to all clients registered to the socket. More on registration later.

There is a magic number of 58 bytes which is the max that will be sent to the socket. This is the maximum transmit length of a packet according to the EBYTE E32 Datasheet. If you send more bytes to the socket then a error will be returned.

When bytes are sent to the socket it will send 1 byte back. If the value of this byte is `0` then the transmission was successful. Otherwise, an error occured. Here is a Python snippet.
{{< highlight python >}}
data = b'12345'
self.client_socket.sendto(data, DATA_SOCKET_FILE)
(bytes, address) = self.client_socket.recvfrom(10) # receive up to 10 bytes
if len(bytes) == 1 && bytes[0] == 0:
  print('success')
else:
  print('failed')
{{< / highlight >}}

## The Control Socket

The control socket is to read and change the settings of the `e32`. Settings such as the channel, frequency, and transmit power. To change `e32` settings the device must be put into *sleep mode*. When it's transmitting and receiving it's in *normal mode*. This transition takes time and data transmitted over the air will be lost during this transition.

# Registration

Registration only applies to the data socket.

A client may want to write to a socket to transmit data. However, what happens when we receive data? We need to register clients so when data is received by the `e32` it can be sent to each registered client over the same data socket. In order to do this we send a zero-byte message which allows the `e32` to store the client address. Once this address is succesfully stored it is considered to be registered. After we receive data the `e32` will write the data to all registered clients.

As for the control socket we don't have a registration mechanism. The client that writes to the socket will get the data back that is requested. There are some scenarios I can think of to have registration, however, it's currently not implemented.

# Control Socket Commands

Here are the following commands we can send to the control socket and what is sent back.

| Command        | TX command     | TX bytes | RX output (example) | RX bytes |
|----------------|----------------|----------|---------------------|----------|
| Read Version   | 'v' or 0x76    | 1        | 0xc3450d14          | 4        |
| Read Settings  | 's' or 0x73    | 1        | 0xc000001a1744      | 6        |
| Write Settings | 0xc000011a1744 | 6        | 0xc000011a1744      | 6        |
| Error          | any            | any      | error code          | 1        |

## Read Version Command

To read the version you would seen ASCII `v` which is `0x76`. We will send back the raw version string. See the datasheet for what these bytes contain. [Here](https://fccid.io/2ALPH-E32-TTL-100/User-Manual/User-manual-3359170.pdf) is an example datasheet. For instance it will return `0xC3mmxxyy` where `mm` is the model, `xx` is the version and `yy` refers to other module features.

## Read Settings Command

Reading the setting is done by sending an ASCII 's'. The raw settings will be sent back. To see more run the `e32 -s` command which will list out these settings and version as well as break them down into individual settings.

## Write Settings Command

We can write the settings such as changing the address or channel. Here we send the full value of the settings. This will start with a `0xC0` or `0xC2` depending if we want to save them when the `e32` is powered down.

## Error Output

If we get an error we'll receive one byte with the error number. Currently, the best place to look for the error code is the source code in github.
