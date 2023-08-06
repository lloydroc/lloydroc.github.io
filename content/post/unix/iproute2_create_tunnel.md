---
title: Creating IP Tunnels in Linux with iproute2
date: "2020-02-04T07:40:31Z"
categories:
 - unix
 - networking
tags:
 - iproute2
 - tunnel
---

# {{ <title> }}

In this post we'll use *iproute2* to create tunnels between two unix hosts. This will be the simplest form of an *IP-in-IP* tunnel.

## How the Tunnels will work

In this example we have two Unix hosts with IP addresses *10.255.254.96* and *10.255.254.196* on a *10.255.254.0/24* network and a gateway address of *10.255.254.2*. These two hosts are on the same network. For this tunnel example we are going to add *dummy* interfaces to each of our hosts and assign addresses *192.168.2.111* and *192.168.2.222* addresses to each of them respectively. Once the tunnels are up we will be able to send a ping from the first tunnel to the second tunnel as if the hosts are on the same network. This is known as encapsulation, since inside an IPv4 packet with a source of *10.255.254.96* and destination of *10.255.254.196* we have another IPv4 packet encapsulated inside with a source of *192.168.2.111* and destination of *192.168.2.222*.

### iproute2 and the dummy kernel module

For this we'll need *iproute2*. As long as your Linux distribution is fairly modern you should have *iproute2*. Type `ip` and you should see something like the following.

{{< highlight bash >}}
$ ip
Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }
       ip [ -force ] -batch filename
where  OBJECT := { link | address | addrlabel | route | rule | neigh | ntable |
                   tunnel | tuntap | maddress | mroute | mrule | monitor | xfrm |
                   netns | l2tp | fou | macsec | tcp_metrics | token | netconf | ila |
                   vrf | sr }
       OPTIONS := { -V[ersion] | -s[tatistics] | -d[etails] | -r[esolve] |
                    -h[uman-readable] | -iec | -j[son] | -p[retty] |
                    -f[amily] { inet | inet6 | ipx | dnet | mpls | bridge | link } |
                    -4 | -6 | -I | -D | -M | -B | -0 |
                    -l[oops] { maximum-addr-flush-attempts } | -br[ief] |
                    -o[neline] | -t[imestamp] | -ts[hort] | -b[atch] [filename] |
                    -rc[vbuf] [size] | -n[etns] name | -a[ll] | -c[olor]}
{{< / highlight >}}

Check out *iproute2*, it is the new way of doing things. The *net-tools* are being phased out. The *net-tools* that are `ifconfig`, `route`, `arp`, `netstat`, `iptunnel`, `nameif`, and `ipmaddr` are all old school and replaced by *iproute2*.

Now ensure you have the `dummy` module loaded into the kernel. This is probably the largest source of frustration if not found by `lsmod`.

#### Checking if the dummy network kernel module is loaded
{{< highlight bash >}}
$ sudo su
$ uname -r
4.19.93+
$ lsmod | grep dummy
dummy                  16384  0
{{< / highlight >}}

The `grep` found it. That's good. Now if you don't have it see the following section.

To insert the module do the following. Note, you could have the module but the `uname -r` output and the directory in `/lib/modules` don't match. Perhaps you need to restart the box after the kernel has been compiled/upgraded? Anyways, here is how to find and load the dummy network module into the kernel.

#### Inserting the dummy network kernel module if not loaded
{{< highlight bash >}}
$ sudo su
$ find /lib/modules/`uname -r` -name dummy.ko
/lib/modules/4.19.93+/kernel/drivers/net/dummy.ko
$ sudo insmod /lib/modules/`uname -r`/kernel/drivers/net/dummy.ko
{{< / highlight >}}

### The Network Before Tunnels

Here is a picture of the network before the tunnels are added. It's really simple it shows `eth0` on a *10.255.254.0/24* network with an address of *10.255.254.96* and the gateway being the *default* route with address of *10.25.254.2*.

#### Routing table before tunnels are added
{{< highlight sh >}}
$ ip route show
default via 10.255.254.2 dev eth0 proto dhcp src 10.255.254.96 metric 202
10.255.254.0/24 dev eth0 proto dhcp scope link src 10.255.254.96 metric 202
{{< / highlight >}}

### Creating a Tunnel on the First Host

Here we will create a dummy interface, add an address to that interface, create a tunnel from the dummy interface to our network's gateway. We'll then put the tunnel up, and add a route from it to our `eth0` interface. Then we'll show the addresses on the box and the new routing table.

{{< highlight bash >}}
$ sudo su
$ ip link add dummy0 type dummy
$ ip address add 192.168.2.111 dev dummy0
$ ip tunnel add tun0 mode ipip remote 10.255.254.2 local 192.168.2.111
$ ip link set tun0 arp on
$ ip link set tun0 up
$ ip route add 192.168.2.222 dev eth0
$ ip address show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether b8:27:eb:e1:f0:c0 brd ff:ff:ff:ff:ff:ff
    inet 10.255.254.196/24 brd 10.255.254.255 scope global dynamic noprefixroute eth0
       valid_lft 85851sec preferred_lft 75051sec
    inet6 fe80::78ba:7475:416c:daee/64 scope link
       valid_lft forever preferred_lft forever
3: dummy0: <BROADCAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN group default qlen 1000
    link/ether 96:c7:eb:8c:5f:d3 brd ff:ff:ff:ff:ff:ff
    inet 169.254.119.140/16 brd 169.254.255.255 scope global noprefixroute dummy0
       valid_lft forever preferred_lft forever
    inet 192.168.2.111/24 scope global dummy0
       valid_lft forever preferred_lft forever
    inet6 fe80::b7f1:6d17:c523:6a03/64 scope link
       valid_lft forever preferred_lft forever
4: tunl0@NONE: <NOARP> mtu 1480 qdisc noop state DOWN group default qlen 1000
    link/ipip 0.0.0.0 brd 0.0.0.0
5: tun0@NONE: <POINTOPOINT,UP,LOWER_UP> mtu 1480 qdisc noqueue state UNKNOWN group default qlen 1000
    link/ipip 192.168.2.111 peer 10.255.254.2
    inet6 fe80::5efe:c0a8:26f/64 scope link
       valid_lft forever preferred_lft forever
$ ip route show
default via 10.255.254.2 dev eth0 proto dhcp src 10.255.254.196 metric 202
10.255.254.0/24 dev eth0 proto dhcp scope link src 10.255.254.196 metric 202
169.254.0.0/16 dev dummy0 scope link src 169.254.119.140 metric 203
192.168.2.0/24 dev dummy0 proto kernel scope link src 192.168.2.111
192.168.2.222 dev eth0 scope link
{{< / highlight >}}

Above, you can see for some reason the tunnels have `UNKNOWN` state. I am not sure why. Also, note that the `dummy0` interface has 2 addresses. Yes, interfaces can have multiple addresses. We just don't use the random address it gives us. It's also important to know the type of tunnel is `ipip` which is the most simple form. Later, I hope to get into the more modern and flexible types of tunnels for various use cases. It's also important to see the mtu is 1480 rather than 1500 as the *IP-in-IP* protocol takes off 20 bits.

#### Creating the tunnel on the Second Host

Now we'll do nearly the same thing on the second host with slight variations on ip addresses. Hopefully it's obvious most of the needs to be done on both hosts for bi-directional communication.
{{< highlight bash >}}
$ ip link add dummy0 type dummy
$ ip address add 192.168.2.222 dev dummy0
$ ip tunnel add tun0 mode ipip remote 10.255.254.2 local 192.168.2.222
$ ip link set tun0 arp on
$ ip link set tun0 up
$ ip route add 192.168.2.111 dev eth0
$ ip address show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether b8:27:eb:2a:1a:b1 brd ff:ff:ff:ff:ff:ff
    inet 10.255.254.96/24 brd 10.255.254.255 scope global dynamic noprefixroute eth0
       valid_lft 85725sec preferred_lft 74925sec
    inet6 fe80::180a:188c:2a89:d54c/64 scope link
       valid_lft forever preferred_lft forever
3: dummy0: <BROADCAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN group default qlen 1000
    link/ether 02:e3:fc:ad:89:58 brd ff:ff:ff:ff:ff:ff
    inet 169.254.221.67/16 brd 169.254.255.255 scope global noprefixroute dummy0
       valid_lft forever preferred_lft forever
    inet 192.168.2.222/24 scope global dummy0
       valid_lft forever preferred_lft forever
    inet6 fe80::d5b:2080:b6e8:fe02/64 scope link
       valid_lft forever preferred_lft forever
$ ip route show
default via 10.255.254.2 dev eth0 proto dhcp src 10.255.254.96 metric 202
10.255.254.0/24 dev eth0 proto dhcp scope link src 10.255.254.96 metric 202
169.254.0.0/16 dev dummy0 scope link src 169.254.221.67 metric 203
192.168.2.0/24 dev dummy0 proto kernel scope link src 192.168.2.222
192.168.2.111 dev eth0 scope link
{{< / highlight >}}

### Note on the Dummy Interfaces
Firstly, note that the `dummy` network device in Unix "A dummy device drops all packets sent to it.". So this shouldn't be used for anything useful. It is truly for example purposes.
When we ran the command `ip link add dummy0 type dummy` dummy ip addresses were assigned to the `dummy0` interface. Namely, `169.254.230.254` and `169.254.178.151` respectively. Instead of the `192.168.2.111` and `192.168.2.222` addresses we used we could have used these addresses. This in fact would have made things more simply because routes were also added. However, by creating the addresses `192.168.2.111` and `192.168.2.222` don't rely on the randomness. This can be advantageous in a number of scenarios.

### Let's do some pinging!

OK now we need to ping and traceroute to make sure what we have is working:

#### Ping/Traceroute from Unix Host 1 to Unix Host 2
{{< highlight bash >}}
$ ping -I 192.168.2.111 192.168.2.222
PING 192.168.2.222 (192.168.2.222) from 192.168.2.111 : 56(84) bytes of data.
64 bytes from 192.168.2.222: icmp_seq=1 ttl=64 time=1.79 ms
64 bytes from 192.168.2.222: icmp_seq=2 ttl=64 time=0.834 ms
64 bytes from 192.168.2.222: icmp_seq=3 ttl=64 time=0.813 ms
^C64 bytes from 192.168.2.222: icmp_seq=4 ttl=64 time=0.830 ms
64 bytes from 192.168.2.222: icmp_seq=5 ttl=64 time=0.870 ms
$ traceroute 192.168.2.222
traceroute to 192.168.2.222 (192.168.2.222), 30 hops max, 60 byte packets
 1  192.168.2.222 (192.168.2.222)  0.917 ms  0.731 ms  0.728 ms
{{< / highlight >}}

I'll spare you from the opposite side of the tunnel, but it's the same.

### The New Neighbor List

We can see from the neighbor list (*arp* table) that *mac* addresses from our hosts are seen. Look closely as they match the *mac* address in each of the *link*s on the interfaces. Note, if we had not ping from each host there would be no *arp* entries since there would be no reason to find the mac address of each host.

#### Neighbors on Host 1
{{< highlight bash >}}
$ ip neigh show
10.255.254.91 dev eth0 lladdr 00:3e:e1:c0:ee:73 REACHABLE
10.255.254.2 dev eth0 lladdr 2c:4d:54:b0:14:30 STALE
10.255.254.96 dev eth0 lladdr b8:27:eb:2a:1a:b1 STALE
192.168.2.222 dev eth0 lladdr b8:27:eb:2a:1a:b1 REACHABLE
$
{{< / highlight >}}

#### Neighbors on Host 2
{{< highlight bash >}}
$ ip neigh show
10.255.254.91 dev eth0 lladdr 00:3e:e1:c0:ee:73 DELAY
192.168.2.111 dev eth0 lladdr b8:27:eb:e1:f0:c0 STALE
10.255.254.196 dev eth0 lladdr b8:27:eb:e1:f0:c0 STALE
10.255.254.2 dev eth0 lladdr 2c:4d:54:b0:14:30 STALE
$
{{< / highlight >}}

Note, the address *10.255.254.91* is the host that I'm ssh'd in from.

### Where to go from here?

Wow! There is a lot to these tunnels and this is just scratching the surface. Next, we'll look at different types of tunnels (gre, sit, l2tp, vxlan), and IPSec VPN.

