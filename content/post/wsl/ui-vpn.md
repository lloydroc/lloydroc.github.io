---
title: Browser UI using sshuttle VPN in WSL
date: "2023-05-16"
categories:
- wsl
- networking
draft: true
---

# {{< title >}}

{{< figure src="/assets/png/browser-remote-server-vpn-sshuttle-windows.png" title="Browser viewing a UI in Windows using sshuttle in WSL as a VPN">}}

In this post we will creating VPN connections using `sshuttle` in WSL for Windows 11. This post will focus on pointing a Browser to a URL in a private network in Windows. The private network - VPN - can be reached from `sshuttle` running in WSL. For this setup we unfortunately need to have a "double networking hop" in that Windows needs to be configured to send traffic to WSL (1) and WSL needs will then use `sshuttle` to (2) forward that traffic to the public network.

# Getting Started

In order to use `sshuttle` VPN in Windows we need the following:

1. Ability to `ssh` into a host in the private network
2. Administrator Access in Windows if you want to open a browser with a URL in the private network.
3. We need to have root access to our `WSL` instance. This is a `sshuttle` requirement.

# DNS Considerations

Virtual Private Networks involve IP Addresses. However, you typically need more than just IP Addresses as we need a method to look up these IP Addresses. As we go through this please keep in mind how we resolve hosts and what network the DNS resolvers are in. More often than not the DNS resolver is also in the private network.

## Example Scenario

Let's take an example scenario.

1. On my Windows 11 Machine I want load a web page on my browser to `someserver.somecompany` which resolves to the address `172.22.0.10`
2. The web server `someserver.somecompany` is in a private network `172.22.0.0/24`.
3. To view the page on `someserver.somecompany` we will `sshuttle` into a remote host using `ssh` named `lloydrochester.com`. The remote host `lloydrochester.com` is inside the `172.22.0.0/24` network and can connect to remote host `someserver.somecompany (172.22.0.10)`.

# Network Diagram

Let's dive right into a complex network diagram. We'll then dive into each connection.

{{< figure src="/assets/png/wsl-sshuttle.png" title="sshuttle VPN in WSL">}}

The diagram above shows a total of 4 networks! Let's explain them:
1. The WSL Server and Windows 11 share a bridge network. This is called `vEthernet (WSL)` on my machine.
2. My Windows 11 machine is part of my home LAN network which I have the obscure `10.255.254.0/24` network. Most people would likely have `192.168.1.0/24`.
3. To simplfy things my home router connects to the internet through the WAN, we're also calling this the **public internet**.
4. On the public internet we have our **remote server** that we will `sshuttle` into called [lloydrochester.com](https://lloydrochester.com).
5. The host [lloydrochester.com](https://lloydrochester.com) connects to the private network `172.22.0.0/24` via the `eth1` network interface that we can use to connect to `someserver.somecompany`.

# A basic VPN connection using `sshuttle` in WSL

If we want to access `someserver.somecompany` which resolves to `172.22.0.10` in this example we'd do the following `sshuttle` command:

{{< highlight bash >}}
sshuttle -r lloydrochester.com 172.22.0.0/24
{{< / highlight >}}

This is effectively saying we want to reach the `172.22.0.0/24` network via the remote host `lloydrochester.com` over SSH.

Now what about DNS? We need to somehow resolve `someserver.somecompany`:

Here are our options for DNS - some of these relate only inside our WSL instance:
1. Put an entry into `/etc/hosts` in Windows, and/or WSL if necessary.
2. Use the `sshuttle` options `--dns` to use the resolver inside `/etc/resolve.conf` in the remote host `lloydrochester.com` or even use the `--to-ns=<server>` option to specify a DNS resolver inside our private network `172.16.0.0/24` to take our queries.
3. Stand up a `dnsmasq` instance on our WSL. More on this option later.

Let's stop here for DNS, for the remaing we'll statically define it without DNS.

# Giving Windows 11 some VPN love

Could we open up a browser to `someserver.somecompany` and have the page load? Nope. Why?

1. The Windows 11 cannot resolve `someserver.somecompany`.
2. Even if Windows 11 could resolve what would make it forward packets to our WSL instance?
3. If our WSL instance receives packets destined for `someserver.somecompany` will it route them properly?

Let's solve each of these problems one-by-one.

## Simple Resolution of hosts in Windows 11 to our WSL Instance

For Windows 11 to resolve `someserver.somecompany` it's easiest to use the Windows version of `/etc/hosts` in the file `C:\Windows\System32\drivers\etc\hosts`. This needs Administrator access but we can add the entry as such.

{{< highlight bash >}}
<our WSL IP address> someserver.somecompany
{{< / highlight >}}

We'll use the trick of pointing `someserver.somecompany` to our WSL instance. To know the entry to add to the Windows host file simply run the following.

{{< highlight bash >}}
lloydroc@nifty:~$ ip route get 8.8.8.8
8.8.8.8 via 172.17.240.1 dev eth0 src 172.17.253.106 uid 1000
    cache
lloydroc@nifty:~$
{{< / highlight >}}

Here we need to look at the `src` IP address and also take note of the device name `eth0`. Thus, I'd add the following line to `C:\Windows\System32\drivers\etc\hosts`:

{{< highlight bash >}}
172.17.253.106 someserver.somecompany
{{< / highlight >}}

Your WSL instance will undoubtably have a different address and perhaps device name depending on the flavor of linux.

## Proxy a connection from Windows to WSL

It turns out if Windows wants to make a connection to a WSL instance it needs to be explicitly specified. To do this we need to open a PowerShell terminal with Administrator priviledges and run the following:

{{< highlight bash >}}
netsh interface portproxy add v4tov4 listenport=0-9000 connectaddress=172.17.253.106 connectport=0-9000 listenaddress=172.17.253.106
{{< / highlight >}}

Please ensure you swap out `172.17.253.106` for the IP address of your WSL instance.

After, you've done this go ahead and run: 

{{< highlight bash >}}
netsh interface portproxy show all
{{< / highlight >}}

and if you need to remove the proxy run:

{{< highlight bash >}}
netsh interface portproxy reset
{{< / highlight >}}

# Testing a connection from Windows into WSL

This is when I like to test a connection from Windows to `someserver.somecompany` can connect inside WSL. Let's assume `someserver.somecompany` is running on port `80`. We can use `netcat` for this:

In WSL I run:
{{< highlight bash >}}
sudo nc -kl 80
{{< / highlight >}}

Now we're listening on port `80` in WSL. So let's test a connection from Windows in PowerShell.

{{< highlight bash >}}
PS C:\Users\lloyd> Test-NetConnection -ComputerName someserver.somecompany -Port 80


ComputerName     : someserver.somecompany
RemoteAddress    : 172.17.253.106
RemotePort       : 80
InterfaceAlias   : vEthernet (WSL)
SourceAddress    : 172.17.240.1
TcpTestSucceeded : True
{{< / highlight >}}

The `TcpTestSucceeded : True` proves this is working.

# TCP Forwarding from our WSL to our Private Network

From the configuration above we have connections coming in from `someserver.somecompany` using our WSL IP address `172.17.240.1`. We now need to forward these packets to the private network with the actual address of `someserver.somecompany` which is `172.22.0.10`. For this we'll use [socat](https://manpages.org/socat) which is a multipurpose relay in Linux.

{{< highlight bash >}}
socat TCP4-LISTEN:80,reuseaddr,fork TCP4:172.22.0.10:8000
{{< / highlight >}}

Note, that the proxy listens on port 80 but proxies to the remote server on port 8000.

With this command running when connections come in from Windows on address:port `172.17.253.106:80` - our WSL IP address - they will be proxied to address:port `172.16.1.10:80`. The address `172.16.1.10` is inside the subnet that is being served by our `sshuttle` command above. 

# Hosting a Web Page on our Private Network

Since I have a limited setup I will add an additional IP to the remote SSH server (lloydrochester.com) and host a web page off this IP address.

{{< highlight bash >}}
sudo ip address add 172.22.0.10/32 dev eth0
{{< / highlight >}}

Now setup from inside lloydrochester.com to the webpage.

{{< highlight bash >}}
$ cat index.html
<html>
  <head></head>
  <body>
    <h1>Hello from a remote server!</h1>
    <p>Can you see this page from a Windows machine with WSL running sshuttle?</p>
  </body>
</html>
$ sudo python3 -m http.server --bind 172.22.0.10
Serving HTTP on 172.22.0.10 port 8000 (http://172.22.0.10:8000/) ...
{{< / highlight >}}

From here I can open up a browser in Windows and see the following:

{{< figure src="/assets/png/browser-remote-server-vpn-sshuttle-windows.png" title="Browser viewing a UI in Windows using sshuttle in WSL as a VPN">}}

# Where to go from here?

The setup required here is far from easy. It has multiple moving parts making it inpractical for most use cases. I hope to post later proposing some better options. Here is what we can do to make these steps easier:

* Separate the Windows and WSL portions into their own scripts that have all of our commands.
* You can look at running `dnsmasq` in WSL that will resolve addresses for us in WSL. Note, there is no easy way to do this resolution in Windows. We can point the Windows DNS to our WSL and `netsh interface portproxy` DNS requests to our DSL, but this comes with additional complexity.
