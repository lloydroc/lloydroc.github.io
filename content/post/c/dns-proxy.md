---
title: DNS Proxy in C
categories: ["c"]
tags: ["dns"]
date: "2023-12-30"
ref: https//www.plantuml.com/plantuml/png/SoWkIImgAStDuNBEoKpDAz7LjLC8ACglgBHI24ejB4qjBk42Sq7YmQb5PQb5LWeGbUh5S1LS41cuNXGbnGNvUSMfS5EWKbO86OVKl1IW0m00
---

# {{< title >}}

This post provides a simple example of a DNS proxy. A client would query a DNS record from our program as if it was a server. This query will be passed on to a DNS server and eventuall back to the client.

## Proxy Server Paradigm

A proxy server is an intermediary server. Instead of a client requesting direct to a server the request goes to a proxy server that will handle the request on behalf of the client.

{{< figure src="/assets/png/proxy-versus-direct.png" title="Proxy versus Direct" >}}

Proxies are used for a number of reasons including:
1. Monitoring/Filtering/Censoring/Logging requests for security, correction, network isolation, ...
3. Privacy
4. Performance such as caching
5. Logging and evesdropping
6. Altering the clients original request

{{< figure src="/assets/svg/proxy-paradigm.svg" title="Proxy Paradigm" >}}

# Example Program in C

Since DNS uses UDP we can use the `sendto` and `recvfrom` functions in C.

{{< highlight c >}}
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>
#include <stddef.h>

#if defined(_WIN32)
#include <winsock2.h>
#include <ws2tcpip.h>
#define ISVALIDSOCKET(s) ((s) != INVALID_SOCKET)
#define CLOSESOCKET(s) closesocket(s)
#define GETSOCKETERRNO() (WSAGetLastError())
#else
#include <sys/types.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <unistd.h>
#include <errno.h>
#define SOCKET
#define ISVALIDSOCKET(s) ((s)) >= 0)
#define CLOSESOCKET(s) close(s)
#define GETSOCKETERRNO() (errno)
#endif

#define PORT "53"
SOCKET srv_sock;

// struct __attribute__((__packed__)) DNSHeader
struct DNSHeader
{
    uint16_t id;
    uint8_t qr_opcode_aa_tc_rd;
    uint8_t ra_z_rcode;
    uint16_t qdcount;
    uint16_t ancount;
    uint16_t arcount;
};

//struct __attribute__((__packed__)) DNSQuestion
struct DNSQuestion
{
    char *name;
    uint16_t qtype;
    uint16_t qclass;
};

int
server_bind()
{
    int rc;
    struct addrinfo hints;
    struct addrinfo *result, *result_ptr;
    struct sockaddr_in servaddr; // TODO
    socklen_t addrlen;

    memset(&servaddr, 0, sizeof(servaddr));
    hints.ai_canonname = NULL;
    hints.ai_addr = NULL;
    hints.ai_next = NULL;
    hints.ai_socktype = SOCK_DGRAM;
    hints.ai_family = AF_UNSPEC;
    hints.ai_protocol = 0;
    hints.ai_flags = AI_PASSIVE | AI_NUMERICHOST;

    addrlen = sizeof(struct sockaddr_storage);

    rc = getaddrinfo(NULL, PORT, &hints, &result);
    if (rc)
    {
        perror("getaddrinfo");
        return EXIT_FAILURE;
    }

    for (result_ptr = result; result_ptr != NULL; result_ptr = result_ptr->ai_next)
    {
        srv_sock = socket(result_ptr->ai_family, result_ptr->ai_socktype, result_ptr->ai_protocol);
        if (!ISVALIDSOCKET(srv_sock))
            continue;

        rc = setsockopt(srv_sock, SOL_SOCKET, SO_REUSEADDR, "", 0);
        if (rc)
        {
            perror("setsockopt");
            return EXIT_FAILURE;
        }

        rc = bind(srv_sock, result_ptr->ai_addr, (int)result_ptr->ai_addrlen);
        if (rc == 0)
        {
            break;
        }

        /* our bind failed, we'll try again */
        CLOSESOCKET(srv_sock);
    }

    if (result_ptr == NULL)
    {
        return EXIT_FAILURE;
    }

    freeaddrinfo(result);

    return 0;
}

int
proxy_dns(char *datagram_in, size_t datagram_in_len, char *datagram_out, size_t datagram_out_len, size_t *datagram_out_returned)
{
    struct hostent *he;
    struct sockaddr_in servsock;
    socklen_t servsock_len = sizeof(servsock);
    size_t buffrx;
    SOCKET sockfd;
    int rc;
    const char optval;
    const char hostname[] = "8.8.8.8";
    char buffer[1024];

    if ((he = gethostbyname(hostname)) == NULL)
    {
        perror("gethostbyname");
        return EXIT_FAILURE;
    }

    memset(&servsock, 0, sizeof(servsock));
    servsock_len = sizeof(servsock);
    memcpy(&servsock.sin_addr, he->h_addr_list[0], he->h_length);
    servsock.sin_family = AF_INET;
    servsock.sin_port = htons(53);

    sockfd = socket(servsock.sin_family, SOCK_DGRAM, 0);
    if (sockfd == -1)
    {
        perror("socket");
    }

    rc = setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof(optval));
    if (rc)
    {
        perror("setsockopt");
        return EXIT_FAILURE;
    }

    buffrx = sendto(sockfd, datagram_in, datagram_in_len, 0, (struct sockaddr *)&servsock, servsock_len);
    if (buffrx != datagram_in_len)
    {
        fprintf(stderr, "sendto: %d", GETSOCKETERRNO());
        return EXIT_SUCCESS;
    }

    buffrx = recvfrom(sockfd, datagram_out, datagram_out_len, 0, (struct sockaddr *)&servsock, &servsock_len);
    if (buffrx == -1)
    {
        fprintf(stderr, "proxy recvfrom: %d", GETSOCKETERRNO());
    }
    *datagram_out_returned = buffrx;

    CLOSESOCKET(sockfd);
}

void
print_dns_question(char *buffer, size_t buffer_size)
{
    struct DNSHeader *header;
    struct DNSQuestion *question;
    char name[128];
    char *ptr = buffer+12;
    if(buffer_size < sizeof(struct DNSHeader))
        return;

    header = (struct DNSHeader*) buffer;
    printf("A %s\n", ptr);
}

int
server_serve()
{
    int rc;
    size_t datagram_orig_size;
    char datagram_orig[1024], addrStr[1024], host[1024], service[256];
    size_t datagram_proxy_size;
    char datagram_proxy[1024];
    struct sockaddr_storage claddr;
    socklen_t addrlen = sizeof(claddr);

    datagram_orig_size = recvfrom(srv_sock, datagram_orig, sizeof(datagram_orig), 0, (struct sockaddr *)&claddr, &addrlen);
    if (datagram_orig_size == -1)
    {
        fprintf(stderr, "recvfrom: %d\n", GETSOCKETERRNO());
    }

    rc = getnameinfo((struct sockaddr *)&claddr, addrlen, host, NI_MAXHOST, service, NI_MAXSERV, 0);
    if (rc == 0)
    {
        snprintf(addrStr, sizeof(addrStr), "%s:%s", host, service);
    }
    else
    {
        snprintf(addrStr, sizeof(addrStr), "(?UNKNOWN?)");
    }

    datagram_proxy_size = sizeof(datagram_proxy);

    print_dns_question(datagram_orig, datagram_orig_size);

    proxy_dns(datagram_orig, datagram_orig_size, datagram_proxy, 1024, &datagram_proxy_size); // TODO

    datagram_orig_size = sendto(srv_sock, datagram_proxy, datagram_proxy_size, 0, (struct sockaddr *) &claddr, addrlen);
    if (datagram_orig_size != datagram_proxy_size)
    {
        fprintf(stderr, "sendto: %d", GETSOCKETERRNO());
        return EXIT_SUCCESS;
    }

    return 0;
}

int
main(int argc, char *argv[])
{
#if defined(_WIN32)
    WSADATA d;
    if (WSAStartup(MAKEWORD(2, 2), &d))
    {
        fprintf(stderr, "WSAStartup failed\n");
        return 1;
    }
#endif
    if (server_bind())
    {
        fprintf(stderr, "unable to bind to port %s", PORT);
        return EXIT_FAILURE;
    }

    server_serve();

    CLOSESOCKET(srv_sock);

    return 0;
}
{{< / highlight >}}
