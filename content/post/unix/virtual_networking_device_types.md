---
title: Unix Virtual Network Device Types
date: "2020-02-07"
categories:
 - unix
 - networking
---

This blog post attempts to list and describe the majority of Virtual Network Device types in Unix. Networking with Linux is a hot topic especially in the IoT and Datacenter areas. Read on and you'll see a large array of Device Types found in Unix.

## Background on Network Configuration in Unix

The `iproute2` framework replaces `ifconfig` as well as many other commands. The command family `ip link` deals with network device configuration in Unix. We can use `iproute2` to add, change, and delete network configurations. When adding a network using `iproute2` we can do a `ip link add name NAME type TYPE` where `TYPE` is one of the many Linux Networking Device Types.

### Typical Network Devices on Unix

A typical Unix machine will have an `eth0` and `lo` interface corresponding to the real network interfaces on the host. These interfaces, or device types, are not considered virtual and are not in the list of virtual network device types.

#### Typical Physical Network Interfaces on a Unix Host
{{< highlight bash >}}
$ ip link show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT group default qlen 1000
    link/ether f2:3c:92:b7:e9:8b brd ff:ff:ff:ff:ff:ff
{{< / highlight >}}

We can see the common network devices on a Unix hosts being `eth0` and `lo`. Now, let's look at virtual network devices, which are the rest of this blog post. This virtual device types typically ride "on top" of the physical devices.

## Unix Virtual Network Device Types

Doing a `man ip-link` or `ip link help` we can see the following networking device types.

# Listing Unix Network Device Types

Let's to through all the Network Device Types in Unix.
### IP Link Types

```
TYPE := [ bridge | bond | can | dummy | hsr | ifb | ipoib | macvlan | macvtap | vcan |
        vxcan | veth | vlan | vxlan | ip6tnl | ipip | sit | gre | gretap | erspan |
        ip6gre | ip6gretap | ip6erspan | vti | nlmon | ipvlan | ipvtap | lowpan | gen‐
        eve | vrf | macsec | netdevsim | rmnet | xfrm ]
```

## List of Unix Device Types Discussed Herein

I tried as best I could to go over each one and provide some good information. The information isn't supposed to full document how to use the device or it's theory of information but to give a taste of what it does. It's more of a 10,000 foot view of the network device types. I hope to go back to this post to improve it's content.

Here are links to all of them:
* <a href="#bridge-device">bridge device type</a>
* <a href="#bond-device">bond device type</a>
* <a href="#dummy-device">dummy device type</a>
* <a href="#hsr-device">hsr device type</a>
* <a href="#ifb-device">ifb device type</a>
* <a href="#ipoib-device">ipoib device type</a>
* <a href="#macvlan-device">macvlan device type<a>
* <a href="#macvtap-device">macvtap device type</a>
* <a href="#can-device">can device type</a>
* <a href="#vcan-device">vcan device type</a>
* <a href="#vxcan-device">vxcan device type</a>
* <a href="#veth-device">veth device type</a>
* <a href="#vlan-device">vlan device type</a>
* <a href="#vxlan-device">vxlan device type</a>
* <a href="#ipip-device">ipip device type</a>
* <a href="#sit-device">sit device type</a>
* <a name='ip6tnl-device'>ip6tnl device type</a>
* <a name='ip6gre-device'>ip6gre device type</a>
* <a name='ip6gretap-device'>ip6gretap device type</a>
* <a href="#gre-device">gre device type</a>
* <a href="#gretap-device">gretap device type</a>
* <a href="#erspan-device">erspan device type</a>
* <a href="#ip6erspan-device">ip6erspan device type</a>
* <a href="#lowpan-device">lowpan device type</a>
* <a href="#geneve-device">geneve device type</a>
* <a href="#vrf-device">vrf device type</a>
* <a href="#macsec-device">macsec device type</a>
* <a href="#rmnet-device">rmnet device type</a>
* <a href="#xfrm-device">xfrm device type</a>

### <a name="bridge-device">bridge device type</a>

The bridge network device joins together multiple segments to create a network. This happens at layer 2 and below on the OSI model. Note, this device is called a bridge and not a switch, there is a difference. We can connect multiple devices into the segments of the bridge and assign the bridge an IP address. For example we can add a network device or interface to the bridge by running the command `ip link set eth0 master bridge_name`. See the `bridge`, and `brctl` commands in Unix to know more.

{{< figure src="/assets/svg/bridge.svg" title="bridge device type" >}}

### <a name="bond-device">bond device type</a>

Network bonding involves aggregating two or more network interfaces together to become a single "logical" interface. The bond can have different modes such as hot standby for failures or load balancing. This is all in effect to increase capacity or decrease failure on a critical network interface. Here we can see that physical interfaces `eth0` and `eth1` are bonded together by `bond0`.

{{< figure src="/assets/svg/bond.svg" title="bond device type" >}}

### <a name="dummy-device">dummy device type</a>

The dummy device type is similar to a loopback interface, but can have nearly any IP address you want to assign to it. When a `dummy` interface is created an IP address and MAC addresses will be created for you. However, the IP address and MAC address can be removed and added to user preference. This advantage the `dummy` device type has is an interface other than the loobpack can be always up without a physical connection. The `dummy` allows definition of an chosen network internal to the Unix host.

#### Example Dummy Interface after Creation

{{< highlight bash >}}
$ ip link add dummy0 type dummy
$ ip address show dummy0
3: dummy0: <BROADCAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN group default qlen 1000
    link/ether 96:c7:eb:8c:5f:d3 brd ff:ff:ff:ff:ff:ff
    inet 169.254.119.140/16 brd 169.254.255.255 scope global noprefixroute dummy0
       valid_lft forever preferred_lft forever
    inet6 fe80::b7f1:6d17:c523:6a03/64 scope link
       valid_lft forever preferred_lft forever
{{< / highlight >}}

An example usage of `dummy` device can be show in this example: [Unix Tunnel Example using Dummy Interfaces](/post/unix/iproute2_create_tunnel/).

### <a name="hsr-device">hsr device type</a>

High-availability Seamless Redundancy (HSR) is a networking protocol allowing for failover to happen without applications ever knowing. This protocol is defined in [Withdrawn IEC 62439-3](https://webstore.iec.ch/p-preview/info_iec62439-3%7Bed1.0%7Den.pdf). In this device type we can add slave interfaces and a multicast address for supervision. There is not a lot of information on this device type so it's worth researching further if it is truly supported and to what level that support may be.

### <a name="ifb-device">ifb device type</a>

[Intermediate Functional Block (IFB)](http://linux-ip.net/gl/tc-filters/tc-filters-node3.html) acts as a QoS concentrator for multiple sources of traffic. Effectively this interface provides a way to handle QoS from multiple sources.

### <a name="ipoib-device">ipoib device type</a>

The ipoib device type is for carring IP over InfiniBand RDMA. Note, here InfiniBand is the underlay network an IP is the overlay. Many of the other network device types have it the other way around where IP is the underlay network. When configured InfiniBand applications can run without knowing that there is an IP overlay network carrying the traffic.

Infiniband is used for high performance computing and is typically used in networking involving Super Computers.

### <a name="macvlan-device">macvlan device type<a>

The macvlan device type is a virtual interface based on a MAC address. There is a lot of documentation from Docker on this subject. Creating a `macvlan` device type results in a virtual interface on the link layer (layer 2). There are multiple modes for the macvlan including private, vepa (Virtual Ethernet Port Aggregator mode), bridge, passthru and source. The macvlan device can match from a list of mac addresses that are specified, so you have the ability to tie a MAC address to the device type. These modes are greatly change the functionality of the device. For example the vepa mode will direct traffic out of the physical interface and through a switch that is assumed to have 'hairpin' or 'reflective relay mode'. Whereas, in the bridge mode traffic won't go out the physical interface and expect to come back.

If traffic goes out the physical interface typically the switch which has learned the MAC address of only the physical interface, and not MAC addresses of other virtual devices. Most switches would typically lock the switch port if they see multiple mac addresses on the same switch port.

The macvlan virtual interface isn't useful by itself. There needs to be logic around it to route by mac address, trunk ports based on VLAN, etc. For a virtual computing environment it wouldn't be `eth0` that is tied to the macvap but another virtual interface that is tied to a container. This way a container thinks it has a physical interface to the outside world and this interface has a MAC address that is different from the host's MAC address.

{{< figure src="/assets/svg/vlan.svg" title="macvlan device type" >}}

Above is an example showing a two macvan ports where `eth0` is trunking VLANs 100 and 200. Traffic from VLAN 100 is being sent to the macvlan `eth0.100` and traffic from VLAN 200 is being sent to macvlan `eth0.200`.

#### Example macvlan device

Here is an example of a macvlan added to my rapsberry pi. When the macvlan network device is added we need to associate our physical interface `eth0` to it.

{{< highlight bash >}}
pi@raspberrypi:~ $ sudo ip link add link eth0 name macvlan1 type macvlan mode bridge
pi@raspberrypi:~ $ ip link
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
    link/ether b8:27:eb:e1:f0:c0 brd ff:ff:ff:ff:ff:ff
3: macvlan1@eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 4e:42:9a:58:53:7e brd ff:ff:ff:ff:ff:ff
pi@raspberrypi:~ $
{{< / highlight >}}

You can see that `macvlan1@eth0` has a different mac address than `eth0`.

See also the <a href="#macvtap-device">macvtap device</a>.

### <a name="macvtap-device">macvtap device type</a>

The macvtap is nearly identical to the macvlan with the exception that the macvtap also creates a character device to be used like a tun+tap device. In Unix there are two types of device drivers: character and block. Character devices are meant to deal with bytes on a character level, whereas, block devices deal with them in large chunks. Because we have a character device and Unix has the Universal File Paradigm user space applications can pass data through the macvtap through the character device. The character device created is **/dev/tapX** and through this file user space applications can send ethernet frames to the macvtap device. The tun device is a Layer 3 tunnel between two endpoints, and a tap is a Layer 2 tunnel between two endpoints. To use this VLAN support needs to be compiled in the kernel.

See also <a href="#macvlan-device">macvlan device</a>.

### <a name="can-device">can device type</a>

A Controller Area Network (CAN) interface is mostly found on automobiles designed for microcontrollers and devices to communicate with one another without a host computer. It is also referred to as CAN bus. A bus is merely a communication system to transfer data. In this interface you can set bitrates, listening only mode and toggle bit error reporting, and sampling.

See also the <a href="#vcan-device">vcan network device type</a>.

### <a name="vcan-device">vcan device type</a>

Similar to the <a hre="can-device">can device type</a>, the vcan device type will allow for displaying, recording, generating and replaying of CAN traffic. There are projects like [SocketCAN](https://en.wikipedia.org/wiki/SocketCAN) which will model network devices and allow multiple applications to access one CAN device simultaneously. User space utilities are also available for CAN traffic such as [can-utils](https://github.com/linux-can/can-utils).

See also the <a href="#can-device">can network device type</a>.


### Example adding a Virtual Can Device Type
{{< highlight bash >}}
$ sudo modprobe vcan
$ sudo ip link add dev vcan0 type vcan
$ sudo ip link set up vcan0
{{< / highlight >}}

### <a name="vxcan-device">vxcan device type</a>

There isn't much information to be found on the vxcan device type. The vxcan is derived from vcan. It is a Virtual CAN Tunnel for cross namespace communication. It is a combination of the vcan and veth implementation where network interface pairs can communicate together. Effectively, it allows for virtualized container applications to have CAN interfaces.

### <a name="veth-device">veth device type</a>

The veth network device type is a tunnel between a pair of network devices. When a veth device type is created, it needs a pair of endpoints for example `p1-name`, and `p2-name`. Packets transmitted on each device from the pair will immediately be received on the other device and vice-versa. If one device in the pair is down, then the link state of the pair is down.

The veth device pairs are very popular in virtualized applications, such as Docker. For example Docker will create one device from the pair in a common network namespace, and the other pair into a separate network namespace. A network namespace provides the isolation of system resources associated with networking. Examples of these resources are IPv4 and IPv6 protocol stacks, routing tables, firewall rules, port numbers, and process directories.

### <a name="vlan-device">vlan device type</a>

The vlan device type allows for support ethernet frames with 802.1Q or 802.1AD (QinQ) VLAN tags. The GARP VLAN Registration Protocol also named GVRP (nearly deprecated) and MVRP Multiple VLAN Registration Protocol are also supported. The GVRP and MVRP protocols distribute VLAN information through a vast switched network and I'll leave it there. To understand this device type it's important to understand the so called [One-armed Router](https://en.wikipedia.org/wiki/One-armed_router) also known as a ROAS or Router on a Stick. Essentially, this device type allows the physical ethernet port to segregate different VLANs on a trunk port and make routing decisions if desired.

Examples of using the VLAN device are to provide routing between one or more interfaces. See this [Router-on-a-Stick example](https://www.networkstraining.com/cisco-router-on-a-stick-with-switch/), but substitute the router for a Linux machine.

This type of interface is challenging to visualize as both Layer 2 VLAN switching and Layer 3 routing are at play.

It should be noted that VLAN tagging takes an extra 4 bytes and MTU needs to be adjusted to 1496 in most cases. The networking components that are associated with this VLAN also need support for VLAN and need to be configured correctly as switch ports or trunk ports.

#### Example creating vlan Devices

Below is an example creating 2 VLAN device types with VLAN tags of 100 and 200 respectively. These sub-interfaces are tied to the main interface `eth0` and have names of `eth.100` and `eth.200`. Note, the name of `.100` for a VLAN 0f **100** is a nice convention and not a requirement, the naming can be changed. These sub-interfaces are also give IPV4 addresses.

{{< highlight bash >}}
$ ip link add link eth0 name eth0.100 type vlan id 100
$ ip link add link eth0 name eth0.200 type vlan id 200
$ ip addr add 192.168.100.1/24 brd 192.168.100.255 dev eth0.100
$ ip addr add 192.168.200.1/24 brd 192.168.200.255 dev eth0.200
$ ip link set dev eth0.100 up
$ ip link set dev eth0.200 up
{{< / highlight >}}

If a Linux box were to be configured with the above it would allow hosts on the **192.168.100.0/24** network to access the **192.168.200.0/24** network by tying VLAN 100 and 200 over a trunk port.

### <a name="vxlan-device">vxlan device type</a>

The vxlan device implements the Virtual Extensible LAN specified by IETF Informational submission <a href="https://tools.ietf.org/html/rfc7348">rfc7348</a>. The VXLAN Framework addresses the need for overlay networks within Virtualized Datacenters with multiple tenants. There are 3 major areas discussed in the VXLAN problem statement: Limitations Imposed by Spanning Tree and VLAN Ranges, Multi-Tenancy Environments, and Inadequate Table Sizes at ToR Switch. When reading about VXLAN, usually, the limitation of 4094 VLANs will be a major topic. Asserting that the size of 4094 is insufficient for today's multi-tenancy environments.

How VXLAN addresses the 3 problem areas mentioned above is by providing an overlay network, where Layer 2 information is carried inside Layer 4 UDP datagrams, and using port 4789 as the UDP port number. VXLAN tunnels are terminated by VXLAN tunnel endpoints - VTEPs. Thus, in VXLAN we have two concepts, that of VLXAN Tunnels and VTEPs.

In VXLAN instead of having a VLAN ID a VNI is used, which stands for VXLAN Network Identifier. In the vxlan device a VNI, physical endpoint for tunnel communication, group for multicast information, remote address for unicast traffic, a local address for the source packet, and a number of other flags are used.

### <a name="ipip-device">ipip device type</a>

The ipip device type creates a virtual tunnel encapsulating IPv4 over IPv4. Effectively, we can put the contents of an IP packet (source, destination, headers, payload) inside the payload of another IPv4 packet. Tunnels are commonly used to connect disjoint networks. Tunneling is also how IPSec works by encapsulating an encrypted packet inside an IPv4 packet. The ipip device type is the simplest form of tunneling. It has limitations, such as, mostly being supported by Linux and not other systems, not allowing for multicast and IPv6 traffic. See the <a href="#sit-device">sit device type</a> for IPv6. The outer IPv4 packet here has typically 20 bytes without options, requiring the inner encapsulated to only have 1480 bytes left.

The ipip device type can be further extended to the what it encapsulates as well as the mode in which it should run. For a secondary encapsulation UDP-over-IPv4, IPv4-over-IPv4, IPv6-over-IPv4, and MPLS-over-IPv4. For the UDP-over-IPv4 we can have Foo-Over-UDP and gue or Generic UDP Encapsulation. There are many options for the ipip device type, however, it's usage is to encapsulate a secondary encapsulation over an IP packet.

{{< figure src="/assets/svg/ipip.svg" title="ipip device type" >}}

{{< figure src="/assets/svg/ipip_encapsulation.svg" title="IPIP Encapsulation" >}}

See <a href="#sit-device">sit device type</a>.

### <a name="sit-device">sit device type</a>

The Simple Internet Transition - sit - device type's main purpose is to encapsulate IPv6 in IPv4 packets. As noted in the name, "transition" allows for joining isolated IPv6 networks because the networks that join them are not yet IPv6 capable. This interface, however, has been adapted to support many different encapsulation types documented in the <a href="#ipip-device">ipip device type<a/>.

{{< figure src="/assets/svg/sit.svg" title="sit device type" >}}

{% include svg/ipip6_encapsulation.svg %}

See <a href="#ipip-device">ipip device type</a>.

### <a name='ip6tnl-device'>ip6tnl device type</a>

The ip6tnl is a IPv4/IPv6 tunnel over IPv6. This is the opposite of the 6to4 and 6rd where instead of putting an IPv6 packet inside an IPv4 packet we have the opposite. From what I can tell this has been deprecated, usage of the <a href="#ip6gre-device">ip6gre</a> and <a href="#ip6gretap-device">ip6gretap</a> device types should be used instead.

### <a name='ip6gre-device'>ip6gre device type</a>

The ip6gre is an IPv6 tunneling protocol that performs Generic Routing Encapsulation - GRE. IPv4 or IPv6 packets to into the ip6gre tunnel and out come IPv6 packets with those same packets encapsulated inside them. This tunnel is very flexible in what it can encapsulate. There are the normal arguments of the tunnel for the remote and local addresses. Configuration of the ip6gre tunnel also allows for sequencing of packets, keys for GRE, checksum calculations, hop limits, encapsulation limits, flow labels, traffic classes, restrictions on the remote tunnel address.

{% include svg/ip6gre.svg %}

Here is a simple diagram showing how the encapsulation works for an ip6gre tunnel. It shows the outer packet with an inner packet encapsulated.

{% include svg/ipv6_encapsulation.svg %}

### <a name='ip6gretap-device'>ip6gretap device type</a>

The ip6gretap device is the same as the <a href="#ip6gre-device">ip6gre</a> device but provides a TAP interface for L2 Traffic. A TAP interface is a character device where user space applications can read and write to it through a `/dev/tapX` file. When user space programs write to the TAP it will be as if the packet is on the interface. When reading user space applications will see what the interface has received.

### <a name="gre-device">gre device type</a>

The gre device provides Generic Routing Encapsulation for IPv4 packets. The motivation was that so many standards exist to encasulate one protocol over another protocol. GRE is a tunneling protocol since it allows for packets to be put inside the body of an IPv4 payload. What differs from the gre device type and the <a href="#ipip-device">ipip</a> device type is what can be encapsulated. There is a standard GRE packet header that takes 4 octets, with additional optional components. Being that the encapsulation is "generic" there are many options for what is encapsulated as the 2 octets are allocated for the protocol. The gre device type is best used for any type of tunnelling. Examples are IPv4 Tunneling, IPv6, PPTP, Multicast and IPv6. See <a href="https://tools.ietf.org/html/rfc2784">rfc2784</a> for more information.

{{< figure src="/assets/svg/gre_encapsulation.svg" title="gre device type" >}}

In GRE, the nomenclature is delivery packet for the outer IPv4 packet.

### <a name="gretap-device">gretap device type</a>

The gretap device is the same as the <a href="#gre-device">gre</a> with the addition of a Layer 2 TAP that allows user space programs to read and write Layer 2 traffic from a Linux kernel character device.

### <a name="erspan-device">erspan device type</a>

The erspan device will encapsulate remote Switched Port Analyzer (SPAN) over Generic Routing Encapsulation (GRE) and IPv4. SPAN is also called port mirroring or port monitoring. A switch has a large density of ports. Each port receives traffic isolated to it's MAC address. With the SPAN protocol a switch's port can be configured to send all traffic out a special port where it can be analyzed. This is where mirroring comes into play. What the switch sends out each and every port is mirrored to the SPAN port. Furthermore, this traffic is GRE encapsulated. See the <a href="#gre-device">gre</a> device for more information.

### <a name="ip6erspan-device">ip6erspan device type</a>

The ip6erspan is similar to the <a href"#erspan-device">erspan</a> but instead of sending IPv4 packets it is sending IPv6.

### <a name="lowpan-device">lowpan device type</a>

The lowpan device allows for IPv6 packet delivery in Low Power Wireless Personal Area Networks (6LoWPAN). These low power networks are part of the IEEE 802.15.4 Specification. The IEEE standardized Bluetooth as IEEE 802.15.1, but not longer maintains the standard. Currently, the IEEE 802.15.4 Technical standard is complied by ZigBee, ISA100.11.a, WirelessHART, MiWi, 6LoWPAN, Thread and SNAP.

### <a name="geneve-device">geneve device type</a>

The geneve device provides GEneric NEtwork Virtualizatoin Encapsulation. The GENEVE Protocol defined in <a href="https://www.ietf.org/id/draft-ietf-nvo3-geneve-14.txt">Internet Draft from RFC</a> attemps to address the introduction to new protocols that range from VLAN, MPLS, VXLAN, NVGRE and why new encapsulation formats are needed when a general protocol could be formed? For example, VXLAN provides 24-bit Identifiers stating that the 12-bit Identifiers are not sufficient. Once the 24-bits in VXLAN are used for more than just tagging information and packed with metadata, 24-bit can be exhausted quickly, which could then render the protocol out of date. Thus, GENEVE attempts to define a future proof tunneling protocols by providing a framework rather than being prescriptive. From the IETF, this protocol is set to expire in March 15th, 2020. As of this writing and it will be interesting to see if this protocol takes widespread adoption.

### <a name="vrf-device">vrf device type</a>

The vrf device provides a Virtual Routing Function which provides a separate routing table. A vrf is a L3 entity. The `iproute2` framework supports multiple routing tables which are typically found in the `/etc/iproute2/rt_tables` or `/etc/iproute2/rt_tables.d` directories. Devices can be "enslaved" to a vrf device. A vrf device can have a routing table associated to it. The vrf allows for multiple instances of a routing table to co-exist. One use case for this is in Internet Service Providers, where each customer or tenant has it's own VRF.

### <a name="macsec-device">macsec device type</a>

The macsec device confirms to the IEEE 802.1AE MAC Security standard. This standard extends the Ethernet Frame with additional fields consisting of a *Security Tag* and *Message Authentication Code (ICV)*.  The MACSec standard was created to address attacks on L2 protocols by identifying and exluding unauthorized LAN connections. It is similar to IPSec and TLS, but on the L2 Link Layer. This protocol involves distribution of keys by means of a Key Server.

### <a name="rmnet-device">rmnet device type</a>

The rmnet device allows for a Qualcomm RMNET. RmNet is a proprietary USB virtual Ethernet framework developed by Qualcomm for its mobile phone platforms. When creating this device type the MUX ID is provided.

### <a name="xfrm-device">xfrm device type</a>

The xfrm is a device that utilizes the IP framework for transforming packets and their payloads. One the most notable examples are IPSec, and IPv6 Header Compression. More options <a href="http://man7.org/linux/man-pages/man8/ip-xfrm.8.html">here</a> be found here on the man7.org website.

