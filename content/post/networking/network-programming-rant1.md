---
title: Network Programming Rant
date: "2023-06-28"
categories: 
- networking
---

# {{< title >}}

When I mow the lawn I typically try to find a good podcast to listen to. Every once in a while I get lucky. This time I found a great pod cast on [The Origins of the Internet Internet with John Day]({{< relref "#References" >}}). There are two episodes dedicated with (Professor John Day's)[https://www.bu.edu/met/profile/john-day/] thoughts. Hearing what John Day had to say about the design and evolution of the Internet was intriguing to me. Many times when working with computers we just take for granted how things are and assume their design is the best approach. John has a deep understanding of the Internet's origin and witnessed it's infancy from ARPA Net to what it is and isn't today.

# What John Day had to Say

A summary. In my own words, far from complete.

In the two podcasts I can try to summarize the major points that I picked up on. No offense to the [Programming Throwdown](https://www.programmingthrowdown.com/) as Patrick Wheeler and Jason Gauci admit in the interview they have almost no background on networking which made the interview very choppy and questions coming out of left field. For myself, Coming from a programming background is challenging as mentioned in [this post]({{< relref "/learn-how-internet-works" >}}

1. Operating Systems evolved with the *horrible* Sockets API instead of File IO.
2. IP Addresses don't go far enough into what they *address*
3. We could have made applications where little or no modification is needed to connect to the internet
4. MTU and packet fragmentation doesn't work
5. TCP congestion control doesn't work
6. The concept of separation between mechanism and policy can be applied to networking
7. How the IANA assigned IP addresses as they were requested, instead of logically created the [large internet routing table](https://blog.apnic.net/2022/01/06/bgp-in-2021-the-bgp-table/) we have today
8. IPv6 doesn't really solve any problems that we have in IPv4 see[Myth's of IPv6](https://circleid.com/posts/exposing_9_myths_about_ipv6) for example. Network Operators have little incentive to migrate to IPv6.
9. The [CLNP Protocol](https://blog.ipspace.net/2008/04/what-is-clns.html) was pretty cool and used variable length addressing.
10. DNS was a large step backwards
11. With our current network programming design we're essentially relegated to simple client server models see [Fixing the World](https://zguide.zeromq.org/docs/chapter1/#Fixing-the-World)
12. UDP should be abolished. Anything unreliable shouldn't be allowed on the internet as it can also be used as a Denial of service as lacks flow control.

# Sockets API versus File IO

Assuming the reader knows some basic network programming we're constrained to an API of network programming. This API is not just the Socket's API but also internet interfaces, IP Addresses, ports, and DNS records.

This is in stark contrast to the Universal File Model that Unix offers. In this model a we open a file and read and write to it. However, this file could be a USB device, a Display, a Network Card .... we can treat all these devices like a file. Interfacing with TCP connections using File IO though provoking.

## An alternative to the Sockets API in Unix

Let's say you have two programs that want to communicate over the internet. From `HostA` to `HostB` and we we'll call this program `chat`.

What if our network programming model was as follows:
1. `HostA` opens file `/HostA/chat` and `HostB` opens file `/HostB/chat`.
2. When `HostA` writes to file `/HostB/chat` the content goes over the internet inside the file `/HostB/chat` on `HostB` for it to read.

Let's just stop there. Notice I don't need to talk about IP addresses, ports, TCP, DNS, etc.

1. The name of the file is the DNS address.
2. There are no ports to bind to. We don't even have things like common ports where 80 is for HTTP.
3. We don't have sockets nor need function calls with bind, listen, sendto, recvfrom, ...

This method makes connecting an application to the internet so easy.

## References

The (Programming Throwdown Podcast by Patrick Wheeler and Jason Gauci)[https://www.programmingthrowdown.com/]

[Programming Throwdown - Episode 137 - The Origins of the Internet with John Day](https://open.spotify.com/episode/3IiIcJqPdFIEvlhmLgQ7K2?si=xKMiHnFLQPO-rV0JV6upyA)

[Programming Throwdown - Episode 137 - The Origins of the Internet with John Day](https://open.spotify.com/episode/2ykGiXVtTjFRq1tSUY0fhd?si=mcJqlm_WRlahV67iAHmoWg)


