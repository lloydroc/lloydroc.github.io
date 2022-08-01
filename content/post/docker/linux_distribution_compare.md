---
title: Comparing Linux Distributions in Docker
categories: ["virtualization"]
tags: ["docker"]
comments: true
date: "2020-02-03T07:12:23Z"
---

I have the situation where I need to compare packages, settings, configurations across multiple Linux distributions. Docker is a great tool to pull images from all of the linux distributions to compare and contrast nearly anything you can think of. In this post we'll create a simple docker compose file and run containers from the centos, alpine, ubuntu, archlinux, busybox and debian images.

### The docker-compose.yaml file
First we'll need to install `docker-ce` and `docker-compose`. Then create a simple `docker-compose.yaml` with the following content:
{{< highlight yaml >}}
version: '3'
services:
  ubuntu:
    container_name: ubuntu
    image: ubuntu:latest
    command: tail -f /dev/null

  centos:
    container_name: centos
    image: centos:latest
    command: tail -f /dev/null

  busybox:
    container_name: busybox
    image: busybox:latest
    command: tail -f /dev/null

  alpine:
    container_name: alpine
    image: alpine:latest
    command: tail -f /dev/null

  archlinux:
    container_name: arch
    image: archlinux:latest
    command: tail -f /dev/null

  debian:
    container_name: debian
    image: debian:latest
    command: tail -f /dev/null
{{< / highlight >}}

### Run the Docker Containers from each Linux Distribution
To run all of our services in the `docker-compose.yaml` simply put them `up`.

{{< highlight bash >}}
$ docker-compose up -d
Creating network "docker-os-flight_default" with the default driver
Creating debian  ... done
Creating busybox ... done
Creating centos  ... done
Creating alpine  ... done
Creating ubuntu  ... done
Creating arch    ... done
$ docker ps
CONTAINER ID        IMAGE                COMMAND               CREATED             STATUS              PORTS               NAMES
1469626756c7        centos:latest        "tail -f /dev/null"   8 seconds ago       Up 6 seconds                            centos
fa20649984a2        alpine:latest        "tail -f /dev/null"   8 seconds ago       Up 6 seconds                            alpine
a32c0cdaf4c2        ubuntu:latest        "tail -f /dev/null"   8 seconds ago       Up 6 seconds                            ubuntu
a48c8db17d96        archlinux:latest     "tail -f /dev/null"   8 seconds ago       Up 6 seconds                            arch
406b88520418        busybox:latest       "tail -f /dev/null"   8 seconds ago       Up 6 seconds                            busybox
6fd8d03b2cbd        debian:latest        "tail -f /dev/null"   8 seconds ago       Up 6 seconds                            debian
9f79d7599965        qoomon/docker-host   "/entrypoint.sh"      6 months ago        Up 5 weeks                              dockerhost
{{< / highlight >}}

### Run commands for each distribution
Now that we have many different operating systems up let's run some commands so we can compare. We can take a simple example and look at how the networking interfaces are set up. Note in some of the containers we need to run commands to update the respositories. E.g. `docker-compose exec ubuntu apt update` and `docker-compose exec ubuntu apt install iproute2`.

#### Example to compare IP Interface settings

##### CentOS
{{< highlight bash >}}
$ docker-compose exec centos ip address show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: tunl0@NONE: <NOARP> mtu 1480 qdisc noop state DOWN group default qlen 1
    link/ipip 0.0.0.0 brd 0.0.0.0
3: ip6tnl0@NONE: <NOARP> mtu 1452 qdisc noop state DOWN group default qlen 1
    link/tunnel6 :: brd ::
130: eth0@if131: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:17:00:04 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.23.0.4/16 brd 172.23.255.255 scope global eth0
       valid_lft forever preferred_lft forever
{{< / highlight >}}

##### Ubuntu
{{< highlight bash >}}
$ docker-compose exec ubuntu ip address show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: tunl0@NONE: <NOARP> mtu 1480 qdisc noop state DOWN group default qlen 1
    link/ipip 0.0.0.0 brd 0.0.0.0
3: ip6tnl0@NONE: <NOARP> mtu 1452 qdisc noop state DOWN group default qlen 1
    link/tunnel6 :: brd ::
136: eth0@if137: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:17:00:07 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.23.0.7/16 brd 172.23.255.255 scope global eth0
       valid_lft forever preferred_lft forever
{{< / highlight >}}

#### Example to compare Kernel versions

{{< highlight bash >}}
for c in centos alpine ubuntu archlinux busybox debian; do echo $c: `docker-compose exec $c uname -r`; done
centos: 4.9.184-linuxkit
alpine: 4.9.184-linuxkit
ubuntu: 4.9.184-linuxkit
archlinux: 4.9.184-linuxkit
busybox: 4.9.184-linuxkit
debian: 4.9.184-linuxkit
{{< / highlight >}}

I was surprised to see them all the same!

### Cleaning up

To clean up simply do a `docker-compose down` to stop containers and removes containers, networks, volumes, and images.

### Where to go from here?

We have so many different linux distibutions running we can execute commands in each one and easily see the differences. I hope this was useful, let me know in the comments.

