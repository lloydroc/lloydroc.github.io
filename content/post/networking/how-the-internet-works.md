---
title: How the Internet Works
comments: true
date: "2019-07-26T07:28:41Z"
categories: ["networking"]
---

The Internet is the most complex public service ever created! The Internet is truly amazing. Want to know how the Internet works? If you come from a Computer Science Background it's very unlikely you will know about how the internet works. If you take Cisco Certifications or do Networking, it is also very unlikely you understand how the Internet works. Recently, I couldn't resist and I learned how the internet works. In this Blog post I want to show you how I learned how the Internet works.

## Summary

To understand how the Internet works the following areas need to be understood:
* Networking: Networks, Private and Public IP Addresses, Dynamic Routing Protocols espesially BGP, Switching and Routing, Routing Tables, and DNS
* The Players: Internet Exchanges, Colocation Providers, Data Centers, ISPs, CDNs and Transit Providers
* Peering: What Peering is, The Tier 1 ISPs

### Learning Networking

It's a big field and Computer Science programs in College typically have maybe one course on the subject. Take a Certification like the CCNA or the Juniper Equivalent on Switching and Routing to start learning networking. What is necessary here is to know effectively how IP packets go from a source to a destination. When these IP packets travel their paths can dynamically change and that is where BGP comes into play. The CCNA won't teach you it. Tier 1 ISP operators have the entire internet in their routing tables effectively and understanding what that means is crucial. Knowing the difference between a public and private IP address and how IP addresses are translated from public to private in mechanisms such as NAT. How the IP address of your computer in a coffee shop gets translated by your ISP to go somewhere. How is a URL translated to an IP Address?

### Learning the Players

The Internet allows Networks to talk to Networks. How is this done? It is done in the Internet Exchanges. Understand what Equinix is, understand what Level 3 is, understand Tata's undersea optical Cable Network. What about the data? Where are all the pictures you've uploaded in the cloud gone. What is a data center, what is a "colo" and how do they connect? What is a CDN?

### Peering

What is peering? What is paid peering? How can your ISP leverage you as a customer to have others peer with them. What are the politics of Peering? What is NANOG and why in the last 30 years has it been important?

## Learning Resources

Here are the resources I used to understand how the Internet works. I'm still learning but with what I've done I feel like I got to a plateau and have a good purview of the Internet. I've tried to put the best order on things but with so much content it might make sense to move it around based on what you already know.

* A non-techical Book called [Tubes: A Journey to the Center of the Internet](https://www.amazon.com/dp/B006FOHWDI/ref=cm_sw_em_r_mt_dp_U_6sWoDb0J8HD2Y) by Andrew Blum
* A semi-technical Book called [The 2014 Internet Peering Playbook: Connecting to the Core of the Internet](https://www.amazon.com/dp/B00HOWTJ68/ref=cm_sw_em_r_mt_dp_U_nuWoDbSH5K7GE) by William B. Norton
* Internet Peering Whitepaper [The Art of Peering: The Peering Playbook](http://drpeering.net/white-papers/Art-Of-Peering-The-Peering-Playbook.html) by DrPeering
* CCNA Material. Your choice of Content to pass an exam.
* YouTube Video [How Does Netflix Work?](https://youtu.be/YXQpgAAeLM4) by Linus Tech Talks
* The Book [DNS and BIND: Help for System Administrators](https://www.amazon.com/dp/B0026OR2QS/ref=cm_sw_em_r_mt_dp_U_lAWoDbCVSKJ49) by Cricket Liu and Paul Albitz
