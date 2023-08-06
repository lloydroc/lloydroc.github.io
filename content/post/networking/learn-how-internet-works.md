---
title: Learning how the Internet Works
date: "2019-07-26T07:28:41Z"
lastmod: "2023-07-05"
categories:
- networking
---

# {{< title >}}

The Internet is the most complex public service ever created! The Internet is truly amazing. Curriculums from four year College Institutions focused on Computer Science and/or Programming Background don't spend much time teaching *The Internet*.

Recently, I found myself tired of the Interenet being a black box and pursued a deeper understanding. I wanted to post about how I obtained a deeper understanding of the internet and jot down some of my notes and references.

## Summary

See the [reference]({{< relref "#References" >}} section below.

Subject Areas of focus:
* Understand and commit to memory the [OSI Model](https://en.wikipedia.org/wiki/OSI_model)
* Networking: Networks, Private and Public IP Addresses, Dynamic Routing Protocols espesially BGP, Switching and Routing, Routing Tables
* The Players: Internet Exchanges, Colocation Providers, Data Centers, ISPs, CDNs and Transit Providers
* BGP Peering: What Peering is, The Tier 1 ISPs
* [The internet routing table](https://blog.apnic.net/2022/01/06/bgp-in-2021-the-bgp-table/) Routing Table

## Networking


Networking is a large field of study. Computer Science programs in colleges typically have one to two courses on networking which are heavily programming skewed. At least this is what I experiencd. Interviewing future engineers also confirms this opinion. These courses only scratch the surface of networking.

Learn networking by taking a Network Certification from Arista, Cisco or Juniper on Switching and Routing. Learning the OSI model, layer 2 switching and layer 3 routing. Routing protocols are intriguing. This get's you to a place of understanding how IP packets can get from a source to a destination.

When these IP packets go from a source to a destination their paths can dynamically change. Dynamic paths are where BGP routing protocol comes into play. Unfortunately, Cisco, at least as of this writing, has chosen to leave BGP until many certifications down the line. I learned by reading the [BGP from O'Reilly](https://www.oreilly.com/library/view/bgp/9780596002541/).

## Tier 1 ISPs

A [Tier 1 Internet Service Provider (ISP)](https://en.wikipedia.org/wiki/Tier_1_network) is an Internet Protocol (IP) network that can reach every other network on the Internet solely via settlement-free peering.

## Internet Exchanges

The Internet allows Networks to talk to Networks. How is this done? Networks converge in the Internet Exchanges. Understand what Equinix is, understand what Level 3 is, understand Tata's undersea optical Cable Network. What about the data? Where are all the pictures you've uploaded in the cloud stored. What is a data center, what is a *colo* and how do they connect? What is a CDN and how does that content go over and ISP to your eyeballs?

## Peering

What is peering? What is paid peering? How can your ISP leverage you as a customer to have others peer with them. What are the politics of Peering? What is NANOG and why in the last 30 years has it been important?

## Learning Resources

Here are the resources I used learn more about the Internet. I've tried to put the best order on things but with so much content it might make sense to move it around based on what you already know.

* A non-techical Book called [Tubes: A Journey to the Center of the Internet](https://www.amazon.com/dp/B006FOHWDI/ref=cm_sw_em_r_mt_dp_U_6sWoDb0J8HD2Y) by Andrew Blum
* [BGP from O'Reilly](https://www.oreilly.com/library/view/bgp/9780596002541/)
* A semi-technical Book called [The 2014 Internet Peering Playbook: Connecting to the Core of the Internet](https://www.amazon.com/dp/B00HOWTJ68/ref=cm_sw_em_r_mt_dp_U_nuWoDbSH5K7GE) by William B. Norton
* Internet Peering Whitepaper [The Art of Peering: The Peering Playbook](http://drpeering.net/white-papers/Art-Of-Peering-The-Peering-Playbook.html) by DrPeering
* CCNA Material. Your choice of Content to pass an exam.
* YouTube Video [How Does Netflix Work?](https://youtu.be/YXQpgAAeLM4) by Linus Tech Talks
* The Book [DNS and BIND: Help for System Administrators](https://www.amazon.com/dp/B0026OR2QS/ref=cm_sw_em_r_mt_dp_U_lAWoDbCVSKJ49) by Cricket Liu and Paul Albitz
* [Live 3D Internet Map](https://he.net/3d-map/)
* [BGP Peer Report](https://bgp.he.net/report/peers)