---
title: Browser UI Access using sshuttle in WSL
date: "2023-05-16"
categories:
- wsl
- networking
draft: true
---

# {{< title >}}

In this post we will go over using `sshuttle` in WSL for Windows 11. This post is focused on browsing URLs in private networks. For this to be setup we unfortunately need to have a "double hop" in that Windows needs to be configured to send traffic to WSL (1) and WSL needs will then use `sshuttle` to forward that traffic to the public network.

# Getting Started

In order to use `sshuttle` VPN in Windows you need two things.

1.) Ability to `ssh` into a host in the private network
2.) To open a Browser on a Web Server in the private network you'll need Administrator Access in Windows

# DNS Considerations

Virtual Private Networks involve IP Addresses. However, you typically need more than just IP Addresses as we need a method to look up these IP Addresses. As we go through this please keep in mind how we resolve hosts and what network the DNS resolvers are in. More often than not the DNS resolver isn't going to be on the public network and is inside the private network we'll be "shuttling" to.

# Diving Right In

Let's dive right into to all the moving parts of this. We'll then dive into each connection on how we can verify it works.

## Example Scenario

Let's take an example scenario.

1.) On my Windows 11 Machine I want load a web page on my browser to `foo.com` which resolves to the address `172.16.1.10`
2.) The web server `foo.com` is in a private network `172.16.0.0/16`.
3.) To view the page on `foo.com` we will `shuttle` into a host using `ssh` named `bar.com`. The host `bar.com` is inside the `172.16.0.0/16` network and can connect to `172.16.1.10`.



sshuttle -vvr l 10.10.10.0/24
python3 -m http.server --bind 10.10.10.1
ip address add 10.10.10.1/24 dev eth0
ip address delete 10.10.10.1/24 dev eth0
C:\Windows\System32\Drivers\etc\hosts
 -> 172.17.253.106 test # IP address of WSL
netsh interface portproxy add v4tov4 listenport=8000 connectaddress=172.17.253.106 connectport=8000 listenaddress=172.17.253.106
Test-NetConnection test -Port 8000
socat TCP4-LISTEN:8000,reuseaddr,fork TCP4:10.10.10.1:8000

nc -kl 8000



PS C:\Users\lloyd> Get-NetIPInterface

ifIndex InterfaceAlias                  AddressFamily NlMtu(Bytes) InterfaceMetric Dhcp     ConnectionState PolicyStore
------- --------------                  ------------- ------------ --------------- ----     --------------- -----------
47      vEthernet (WSL)                 IPv6                  1500              15 Enabled  Connected       ActiveStore
26      vEthernet (WSLCore)             IPv6                  1500              15 Enabled  Connected       ActiveStore
18      Bluetooth Network Connection    IPv6                  1500              65 Disabled Disconnected    ActiveStore
8       Local Area Connection* 10       IPv6                  1500              25 Disabled Disconnected    ActiveStore
7       Local Area Connection* 1        IPv6                  1500              25 Disabled Disconnected    ActiveStore
15      Wi-Fi                           IPv6                  1500              35 Enabled  Connected       ActiveStore
1       Loopback Pseudo-Interface 1     IPv6            4294967295              75 Disabled Connected       ActiveStore
47      vEthernet (WSL)                 IPv4                  1500              15 Disabled Connected       ActiveStore
26      vEthernet (WSLCore)             IPv4                  1500              15 Disabled Connected       ActiveStore
18      Bluetooth Network Connection    IPv4                  1500              65 Enabled  Disconnected    ActiveStore
8       Local Area Connection* 10       IPv4                  1500              25 Enabled  Disconnected    ActiveStore
7       Local Area Connection* 1        IPv4                  1500              25 Enabled  Disconnected    ActiveStore
15      Wi-Fi                           IPv4                  1500              35 Enabled  Connected       ActiveStore
1       Loopback Pseudo-Interface 1     IPv4            4294967295              75 Disabled Connected       ActiveStore

PS C:\Users\lloyd> Get-NetIPConfiguration


InterfaceAlias       : Wi-Fi
InterfaceIndex       : 15
InterfaceDescription : Intel(R) Wi-Fi 6E AX211 160MHz
NetProfile.Name      : puravida
IPv4Address          : 10.255.254.97
IPv6DefaultGateway   :
IPv4DefaultGateway   : 10.255.254.2
DNSServer            : 172.17.253.106
                       8.8.8.8

InterfaceAlias       : Bluetooth Network Connection
InterfaceIndex       : 18
InterfaceDescription : Bluetooth Device (Personal Area Network)
NetAdapter.Status    : Disconnected

PS C:\Users\lloyd> Get-NetIPConfiguration -InterfaceIndex 26


InterfaceAlias       : vEthernet (WSLCore)
InterfaceIndex       : 26
InterfaceDescription : Hyper-V Virtual Ethernet Adapter
IPv4Address          : 172.26.80.1
IPv6DefaultGateway   :
IPv4DefaultGateway   :
DNSServer            : fec0:0:0:ffff::1
                       fec0:0:0:ffff::2
                       fec0:0:0:ffff::3

PS C:\Users\lloyd> Get-NetIPConfiguration -InterfaceIndex 47


InterfaceAlias       : vEthernet (WSL)
InterfaceIndex       : 47
InterfaceDescription : Hyper-V Virtual Ethernet Adapter #2
IPv4Address          : 172.17.240.1
IPv6DefaultGateway   :
IPv4DefaultGateway   :
DNSServer            : fec0:0:0:ffff::1
                       fec0:0:0:ffff::2
                       fec0:0:0:ffff::3

lloydroc@nifty:~$ ip address show dev eth0
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:15:5d:75:69:0c brd ff:ff:ff:ff:ff:ff
    inet 172.17.253.106/20 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::215:5dff:fe75:690c/64 scope link
       valid_lft forever preferred_lft forever
lloydroc@nifty:~$
