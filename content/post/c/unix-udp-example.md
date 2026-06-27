---
title: Unix UDP Example in C
categories:
 - c
 - networking
tags:
 - sockets
date: "2020-02-27T17:14:45Z"
aliases:
  - /c/unix/udp/2020/02/27/unix-c-udp-example.html
---

# {{< title >}}

In this post we'll create an example client and server that communicate over UDP in C using Unix as the Operating System. UDP is a connection-less, unreliable datagram packet service. The term connection-less means there is no handshake between the client and server before information is exchanged. The term "fire and forget" applies here since the client sends and beforehand has no negotiation with the server. The term unreliable means there is no guarantee of delivery, ordering or duplicate protection. UDP is best for time-sensitive applications where it is preferable to discard packets rather than waiting for delayed ones.

The advantages to UDP are two fold. Firstly, the latency to send the packets are reduced since there is no connection time. Secondly, the overhead is reduced when compared to TCP since a packet only has 8 bytes, whereas a TCP header is 20 bytes. UDP is lightweight and lean! Unreliability, depending on the network and amount of traffic can be overrated. In nearly all applications careful consideration should be made to decide TCP over UDP.

## UDP Program Structure

The diagram below shows the Unix API usage for the UDP Server and Client example. Essentially, sockets are created and we employ `sendto` and `recvfrom` to send information back and forth between the UDP socket.

{{< figure src="/assets/svg/unix-c-udp.svg" title="udp c program structure" >}}

It should be noted that many combinations of `sendto` and `recvfrom` can be exchanged. In this example the server will "echo" back what is sent from the client. The client, by checking what was sent back from the server does have a means to know increase reliability.

### UDP Server Unix API Calls

The UDP server will need to open a `socket` and assign a socket address with `bind`. Once, the socket is open and bound, then the server can receive using `recvfrom`. If the server has received information from UDP it will know the client's source port, and can send information back with `sendto` if the client decides to receive. Finally, the server will close the socket.

#### UDP Server Socket, Bind, Network Interfaces and IPv4 versus IPv6

The UDP server socket needs to be bound to a network interface in Unix. In the example we are able to use the `getaddrinfo` to identify a host and service from hints. This will allow us to eliminate any IPv4 and IPv6 dependencies. Clients will also have the ability to connect using IPv4 or IPv6 because of how we open the socket and bind. The program will try to create the socket by it's address family, here unspecified for IPv4 or IPv6, it's socket type `SOCK_DGRAM` and protocol.

It's left as a further exercise to find the interface this socket is bound to. Also, depending on the interface that the socket binds to further setup maybe needed for IPv4 and IPv6.

### UDP Client Unix API Calls

The UDP client is more simple than the server. I doesn't need to `bind`. It will simply open a `socket`, and send information using `sendto` then can receive back information, if desired, using `recvfrom`. Note, the client will connect to the server from `AF_INET` or IPv4, but could bind using IPv6.

## Running the Example

The example requires both a UDP client and server to run. When the client connects to the server the server will print out the connection information, the data received, as well as the data it will send back. The client will also print out the data that it sends as well as the data it receives.

### Running the UDP Server

Once we run the server we don't see any output other than knowing it is running and didn't exit. An improvement would be to print the interface, address and port that was bound.

{{< highlight bash >}}
$ ./udpserver

{{< /highlight >}}

### Running the UDP Client

When the client is run, it will connect to the server and send 3 `char` with values `[1, 2, 16]`. It will also print in parenthesis `(3)` the number of bytes that were sent. Typically, in networking data is in units of "octets" which is fitting for the `char` data type in C since it's 8-bits.

{{< highlight bash >}}
$ ./udpclient
sendto(3) 1 2 16
recvfrom(3) 1 2 16
{{< /highlight >}}

Output of UDP client showing it sent 3 octets and their values.

### Output on UDP Server from Client

The server will print the connection information received from the client. In this example it came from `localhost` with a source port of `33887`. The client will have a nearly random source port, whereas, the server is bound to port `5000`. The UDP server, like the client will print out the value of the octets and how many it sends and receives.

{{< highlight bash >}}
$ ./udpserver
Connection from (localhost, 33887)
recvfrom(3) 1 2 16
sendto(3) 1 2 16
^C
$
{{< /highlight >}}

## UDP Server C Example

Below is a UDP Server example in C. It will bind to port `5000` and will send back to the client what it receives. This does put a requirement on the client to listen after it has sent.

{{< highlight c >}}
// UDP Server in C
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <unistd.h>

#define PORT "5000"
#define ADDRSTRLEN 1024
#define HOSTLEN 255
#define SERVLEN 255

#define BUFFLEN 1024
char buffer[BUFFLEN];

int
main(int argc, char *argv[])
{
  struct addrinfo hints;
  struct addrinfo *result, *result_ptr;
  struct sockaddr_storage claddr;
  struct sockaddr servaddr;
  socklen_t addrlen;
  int rc, sockfd, optval;
  char addrStr[ADDRSTRLEN];
  char host[HOSTLEN];
  char service[SERVLEN];
  size_t buffrx;

  bzero(&servaddr, sizeof(servaddr));
  hints.ai_canonname = NULL;
  hints.ai_addr = NULL;
  hints.ai_next = NULL;
  hints.ai_socktype = SOCK_DGRAM;
  hints.ai_family = AF_UNSPEC;
  hints.ai_protocol = 0;
  hints.ai_flags = AI_PASSIVE | AI_NUMERICHOST;

  addrlen = sizeof(struct sockaddr_storage);

  rc = getaddrinfo(NULL, PORT, &hints, &result);
  if(rc)
  {
    perror("getaddrinfo");
    return EXIT_FAILURE;
  }

  for(result_ptr = result; result_ptr != NULL; result_ptr = result_ptr->ai_next)
  {
    sockfd = socket(result_ptr->ai_family, result_ptr->ai_socktype, result_ptr->ai_protocol);
    if(sockfd == -1)
      continue;

    rc = setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof(optval));
    if(rc)
    {
      perror("setsockopt");
      return EXIT_FAILURE;
    }

    rc = bind(sockfd, result_ptr->ai_addr, result_ptr->ai_addrlen);
    if(rc == 0)
    {
      break;
    }

    /* our bind failed, we'll try again */
    close(sockfd);
  }

  if(result_ptr == NULL)
  {
    fprintf(stderr, "Unable to bind socket\n");
    return EXIT_FAILURE;
  }

  freeaddrinfo(result);

  while(1)
  {
    buffrx = recvfrom(sockfd, &buffer, sizeof(buffer), 0, (struct sockaddr *)&claddr, &addrlen);
    if(buffrx == -1)
    {
      perror("recvfrom");
    }

    rc = getnameinfo((struct sockaddr *)&claddr, addrlen, host, NI_MAXHOST, service, NI_MAXSERV, 0);
    if(rc == 0)
    {
      snprintf(addrStr, ADDRSTRLEN, "(%s, %s)", host, service);
    }
    else
    {
      snprintf(addrStr, ADDRSTRLEN,"(?UNKNOWN?)");
    }

    printf("Connection from %s\n", addrStr);

    printf("recvfrom(%ld)", buffrx);
    for(int i=0;i<buffrx;i++)
    {
      printf(" %d", buffer[i]);
    }
    puts("");

    buffrx = sendto(sockfd, &buffer, buffrx, 0, (struct sockaddr *)&claddr, addrlen);
    if(buffrx == -1)
    {
      fprintf(stderr,"Error writing to client");
    }
    printf("sendto(%ld) %d %d %d\n", buffrx, buffer[0], buffer[1], buffer[2]);
  }
}
{{< /highlight >}}

## UDP Client C Example

Below is an example UDP Client in C. It will connect to a server at `localhost` on port `5000` and send 3 octets (`char` in C), as well as, print out what the server sends it back.

{{< highlight c >}}
// UDP Client Example in C
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <unistd.h>

#define PORT "5000"
#define LISTEN_BACKLOG 50
#define ADDRSTRLEN 1024

#define BUFFLEN 1024
char buffer[BUFFLEN];

int
main(int argc, char *argv[])
{
  struct hostent *he;
  struct sockaddr_in servsock;
  socklen_t servsock_len;
  ssize_t buffrx;
  int sockfd, rc, optval;
  const char hostname[] = "localhost";

  if ( (he = gethostbyname(hostname) ) == NULL ) {
      perror("gethostbyname");
      return EXIT_FAILURE;
  }

  bzero(&servsock, sizeof(servsock));
  servsock_len = sizeof(servsock);
  memcpy(&servsock.sin_addr, he->h_addr_list[0], he->h_length);
  servsock.sin_family = AF_INET;
  servsock.sin_port = htons(5000);

  /* data that we will send */
  char buffer[3];

  sockfd = socket(servsock.sin_family, SOCK_DGRAM, 0);
  if(sockfd == -1)
  {
    perror("socket");
  }

  rc = setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof(optval));
  if(rc)
  {
    perror("setsockopt");
    return EXIT_FAILURE;
  }

  /* some example data */
  buffer[0] = 1;
  buffer[1] = 2;
  buffer[2] = 16;

  buffrx = sendto(sockfd, &buffer, sizeof(buffer), 0, (struct sockaddr *)&servsock, servsock_len);
  if(buffrx != sizeof(buffer))
  {
    fprintf(stderr,"sendto");
    return EXIT_SUCCESS;
  }

  printf("sendto(%ld) %d %d %d\n", buffrx, buffer[0], buffer[1], buffer[2]);

  buffrx = recvfrom(sockfd, &buffer, sizeof(buffer), 0, (struct sockaddr *)&servsock, &servsock_len);
  if(buffrx == -1)
  {
    perror("recvfrom");
  }

  printf("recvfrom(%ld) %d %d %d\n", buffrx, buffer[0], buffer[1], buffer[2]);

  close(sockfd);
  exit(EXIT_SUCCESS);
}
{{< /highlight >}}


## Downloading the example.

If you want to run the example download the [cudp](/code/cudp-1.0.tar.gz) example.

{{< highlight bash >}}
$ tar zxf cudp-1.0.tar.gz
$ cd cudp-1.0
$ ./configure
$ make
$ cd src
$ ./udpserver
$ ./udpclient # will have to run from another terminal
{{< /highlight >}}

