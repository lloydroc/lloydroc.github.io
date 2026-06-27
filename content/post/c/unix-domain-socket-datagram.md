---
categories: ["c", "networking"]
tags: ["sockets", "python"]
comments: true
date: "2019-06-18T06:45:00Z"
title: Passing Datagrams Between Python and C
aliases:
  - /c/python/unix/socket/2019/06/18/unix-domain-socket-datagram.html
---

Let's discuss how to pass data from a C program to a Python Script and vice-versa. This subject involves IPC - Inter-Process Communications. In this blog post we'll discuss the more exotic IPC mechanism of the **Unix domain datagram socket**. Specifically, this is domain `AF_UNIX` and type `SOCK_DGRAM` type of socket. Before you consider this method let's address some of it's benefits and limitations of using Unix Domain Sockets for Interprocess Communications:

### Benefits and Limitations of Unix Domain Sockets

* The socket must be for local communication, meaning the processes are running on the same host. This is largest drawback I see.
* Datagrams are always reliable. They are carried through the kernel.
* The sender and receiver of the datagram must agree on the max size of the socket
* Messaging can be one-way or two-way. Meaning, we can fire-and-forget or effectively acknowledge what was sent.
* Low overhead, especially in relation to network sockets such as TCP or UDP.
* Asynchronous Communication

Why Unix Domain Datagram sockets over using Internet Sockets or FIFOs this is because:

* Don't need overhead of TCP/IP
* FIFOs the have a writer and reader. But the writer is blocked until the reader reads. This blocking isn't desired, although, there are ways around it `O_NONBLOCK`

## C Socket Server

Let's start with a simple socket server in C. Here we will open a socket called `serv_sock` and it will be a file on the filesystem. When the program starts if the socket file is present we will remove it and create it again. When this server receives a datagram it will convert all the bytes to upper case and return them to the client. This server just runs forever waiting for datagrams from a client.

Now for the implementation of the server.

{{< highlight c >}}
// server.h
#include <sys/un.h>
#include <sys/socket.h>
#include <ctype.h>
#include <stdio.h>
#include <errno.h>
#include <stdlib.h>
#include <stdlib.h>

#define BUF_SIZE 10
#define SV_SOCK_PATH "serv_sock"
{{< /highlight >}}

Now for the implementation of the server.

{{< highlight c >}}
// server.c
#include "server.h"

int
main(int argc, char *argv[])
{
  struct sockaddr_un svaddr, claddr;
  int sfd, j;
  ssize_t numBytes;
  socklen_t len;
  char buf[BUF_SIZE];

  sfd = socket(AF_UNIX, SOCK_DGRAM, 0);
  if(sfd == -1)
  {
    fprintf(stderr, "error opening socket");
    return 1;
  }

  if(strlen(SV_SOCK_PATH) > sizeof(svaddr.sun_path)-1)
  {
    fprintf(stderr, "socket path too long must be %d chars", sizeof(svaddr.sun_path-1));
    return 2;
  }

  if(remove(SV_SOCK_PATH) == -1 && errno != ENOENT)
  {
    fprintf(stderr, "error removing socket %d", errno);
    return 2;
  }

  memset(&svaddr,0,sizeof(struct sockaddr_un));
  svaddr.sun_family = AF_UNIX;
  strncpy(svaddr.sun_path, SV_SOCK_PATH, sizeof(svaddr.sun_path)-1);

  if(bind(sfd, (struct sockaddr*) &svaddr, sizeof(struct sockaddr_un)) == -1)
  {
    fprintf(stderr, "error binding to socket");
    return 3;
  }

  for(;;)
  {
    len = sizeof(struct sockaddr_un);
    numBytes = recvfrom(sfd, buf, BUF_SIZE, 0, (struct sockaddr*) &claddr, &len);

    if(numBytes == -1)
    {
      fprintf(stderr, "error recvfrom");
      return 4;
    }

    fprintf(stdout, "server received %ld bytes from %s\n", (long) numBytes, claddr.sun_path);

    for(j=0; j<numBytes; j++)
    {
      buf[j] = toupper((unsigned char) buf[j]);
    }

    j = sendto(sfd, buf, numBytes, 0, (struct sockaddr*) &claddr, len);
    if(j != numBytes)
    {
      fprintf(stderr, "error sendto", strerror(errno));
    }
  }
  exit(EXIT_SUCCESS);
}
{{< /highlight >}}

## Python Client

This Python Client will send datagrams to the C Socket Server. It needs the socket file of the server and will open a socket itself as a client. This method allows for many client sockets and a single server socket.

{{< highlight python >}}
# client.py
import socket
import sys
import os, os.path
import time

ssock_file = "./serv_sock"
csock_file = "./client_sock_py"

if os.path.exists(csock_file):
  os.remove(csock_file)

csock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
csock.bind(csock_file)

for i in range(1,len(sys.argv)):
  csock.sendto(str.encode(sys.argv[i]), ssock_file)

  (bytes, address) = csock.recvfrom(10)
  msg = bytes.decode('utf-8')
  print('address:',address,'received:',msg)

csock.close()

if os.path.exists(csock_file):
  os.remove(csock_file)
{{< /highlight >}}

## Running the C and Python

{{< highlight shell >}}
$ ./server &
[1] 1496
$ python3 client.py hello world
server received 5 bytes from ./client_sock_py
address: serv_sock received: HELLO
server received 5 bytes from ./client_sock_py
address: serv_sock received: WORLD
$
{{< /highlight >}}

In the snippet above we run the server as a background process. We then run the Python script to send two datagrams of `hello` and `world` and see the server convert those to upper case and send them back as `HELLO` and `WORLD`.

## Example C Client

While creating the Python script, a C script was also developed for testing. For completeness here is the C client socket program:
{{< highlight c >}}
// client.h
#include <sys/un.h>
#include <sys/socket.h>
#include <unistd.h>
#include <ctype.h>
#include <stdio.h>
#include <errno.h>
#include <stdlib.h>

#define BUF_SIZE 10
#define SV_SOCK_PATH "serv_sock"}
{{< /highlight >}}

The corresponding C implementation:
{{< highlight c >}}
// client.c
#include "client.h"

int
main(int argc, char *argv[])
{
  struct sockaddr_un svaddr, claddr;
  int sfd, j;
  size_t msgLen;
  ssize_t numBytes;
  char buf[BUF_SIZE];

  if(argc < 2 || strcmp(argv[1],"--help") == 0)
  {
    fprintf(stderr,"usage");
    return 1;
  }

  sfd = socket(AF_UNIX, SOCK_DGRAM, 0);
  if(sfd == -1)
  {
    fprintf(stderr, "error opening socket");
    return 2;
  }

  memset(&claddr,0,sizeof(struct sockaddr_un));
  claddr.sun_family = AF_UNIX;
  snprintf(claddr.sun_path, sizeof(claddr.sun_path), "client_%ld", (long) getpid());

  if(bind(sfd, (struct sockaddr*) &claddr, sizeof(struct sockaddr_un)) == -1)
  {
    fprintf(stderr, "error binding to socket");
    return 3;
  }

  memset(&svaddr,0,sizeof(struct sockaddr_un));
  svaddr.sun_family = AF_UNIX;
  strncpy(svaddr.sun_path, SV_SOCK_PATH, sizeof(svaddr.sun_path)-1);

  for(j=1;j<argc;j++)
  {
    msgLen = strlen(argv[j]);
    if(sendto(sfd, argv[j], msgLen, 0, (struct sockaddr*) &svaddr, sizeof(struct sockaddr_un)) != msgLen)
    {
      fprintf(stderr, "error sendto");
      return 4;
    }

    numBytes = recvfrom(sfd, buf, BUF_SIZE, 0, NULL, NULL);
    if(numBytes == -1)
    {
      fprintf(stderr, "error recvfrom");
      return 5;
    }
    printf("Response %d: %*s\n",j, (int) numBytes, buf);
  }

  if(remove(claddr.sun_path) == -1 && errno != ENOENT)
  {
    fprintf(stderr, "error removing socket");
    return 6;
  }

  exit(EXIT_SUCCESS);
}
{{< /highlight >}}
