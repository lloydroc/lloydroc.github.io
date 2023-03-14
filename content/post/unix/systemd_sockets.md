---
title: "Systemd: A Service and a Socket"
date: "2020-06-26"
categories:
 - unix
 - c
 - systemd
---

# {{< title >}}

This is the third post on how to create a *service* in `systemd`. See the [first post](/post/autotools/systemd-service-daemon-autotools/) to create a autotools project and start/stop a daemon service. Or the [second post](/post/unix/systemd_journal/) to enable logging, notify of state changes and accept reloads. In this post we'll create a Unix Domain Socket so that other processes can send messages to our service through remote procedure calls.

The socket we will use in this post is a Unix Socket with domain `AF_UNIX` of type `SOCK_DGRAM`. This type of socket is well suited for example purposes and is also ideal for remote procedure call applications. It is limited to communication on the same host, not over the internet. Unix Domain sockets are always reliable and are guaranteed to be delivered in order without duplication. Since this example uses a datagram socket we can receive the full message on each reception. Typically, the size of a datagram socket is under 2048 bytes see [socket(7)](https://www.man7.org/linux/man-pages/man7/socket.7.html) and look for the `SO_SNDBUF` option for more details on maximum datagram size.

# Dependencies in Systemd

We will start with a [systemd.service(5)](https://www.freedesktop.org/software/systemd/man/systemd.service.html#). This is just a simple daemon process that will run where we specify the executable binary.

{{< highlight text >}}
# foo.service
[Unit]
Description=A Example Systemd Service

[Service]
ExecStart=/usr/local/bin/foo
{{< / highlight >}}

and a [systemd.socket(5)](https://www.freedesktop.org/software/systemd/man/systemd.socket.html#)

{{< highlight text >}}
# foo.socket
[Unit]
Description=An Example Systemd Socket

[Socket]
ListenDatagram=/var/run/foo.socket
{{< / highlight >}}

We will create a dependency that the service needs to be created AFTER the socket. Why? Because we're going to have `systemd` create the socket. Inside our service we're going to use the [sd_listen_fds(3)](https://www.freedesktop.org/software/systemd/man/sd_listen_fds.html#) function to get the file descriptor that `systemd` created for us. When our service comes to life it will ask `systemd` for it's socket and get back a file descriptor and optionally the name tied to this file descriptor. Hence, the service will depend on the socket.

# Before we go into the Weeds

Before we get into the details of dependencies in `systemd` let's discuss our requirements for our socket and service.

* We will have a service called `foo.service` and a socket called `foo.socket`
* When we start one the other will start
* When we stop one the other will stop
* We will have `systemd` create the socket for us
* The service will need to know the file descriptor of the socket

To me this is backwards, but we need to start the socket first and it will pass the file descriptor to the service. I tried many other options to no avail. What I really don't like about this is we have to run `systemctl start foo.socket` and have to HIGHLY resist the urge to type `systemctl start foo` since `systemctl` will assume the `.service`. It's just not intuitive, at least to me.

If you find a way to start the service without having to start the socket first [/about](please send me an email).

Not ideal! Let's continue.

# Dependencies in Systemd

In systemd a [unit](https://www.freedesktop.org/software/systemd/man/systemd.unit.html#) is defined as all of these:

* service
* socket
* device
* mount
* automount
* swap
* target
* path
* timer
* slice
* scope

Note, we're only concerned here with the `service` and `socket` unit types in this post.

We can have units depend on other units. Here are some options for `Wants=`, `Requires=`, `Requisite=`, `BindsTo=`, `PartOf=`, `Conflicts=`, `Before=,After=`. These go in the `[Unit]` section of the file.

{{< highlight text >}}
# foo.service
[Unit]
Description=A Example Systemd Service
# Dependencies go in the [Unit] Section
Wants=anotherservice.service againaservice.service yetanotherservice.service
Requires=somesocket.socket
Requisite=service_a.service
BindsTo=
PartOf=
Conflicts=
Before=
After=
{{< / highlight >}}

The example above is called the *configuring service*. Now let's look at these unit options in regards to dependencies.

* `Wants=` list of services will be started if the configuring unit is starting. However, if the listed units fail the unit will still be started. Note, there is no requirement on what order these wanted services start by. The word "want" nicely describes what is going on here.
* `Requires=` stronger than wants. The list of required services will start with the configuring service and if they fail then the transaction to start the service will fail.
* `Requisite=` like `Requires=` but if the units are not started already they will not be started and the starting of the this unit will fail.
* `BindsTo=` similar to `Requires=` but stronger. They are "bound" in the sense they must state transition as a group.
* `PartOf=` configures dependencies similar to `Requires=`, but limited to stopping and restarting of units. This allows state changes to function as a group.
* `Conflicts=` an inverse relationship where starting one, will stop another for example.
* `Before=,After=` specifies the order and would be used with the other dependency configurations. For example we could have a `Bindsto=` and then a `Before=` where the units would function as a group and we specify the order they start and stop. Note, these settings are independent and orthogonal to `Requires=`, `Wants=`, `Requisite=`, and `BindsTo=`.

These options can be very tricky when you have multiple units defined. Not only do you have to be very careful on which unit you put the dependency in, but the naming is a little misleading as well. Take for example `PartOf=`. The `PartOf=` specifies the starting and stopping of a unit? Huh? The name of that setting doesn't line up so well with what it does!

## Implicit and Default Dependencies

The `systemd` software suite has *Implicit* and *Default* Dependencies. This is to clean up the configuration files and to build in some obvious and command programming patterns.

For example on [systemd.socket(5)](https://www.freedesktop.org/software/systemd/man/systemd.socket.html#) we have "*For each socket unit, a matching service unit must exist, describing the service to start on incoming traffic on the socket (see systemd.service(5) for more information about .service units). The name of the .service unit is by default the same as the name of the .socket unit, but can be altered with the Service= option described below. Depending on the setting of the Accept= option described below, this .service unit must either be named like the .socket unit, but with the suffix replaced, unless overridden with Service=; or it must be a template unit named the same way. Example: a socket file foo.socket needs a matching service foo.service if Accept=no is set. If Accept=yes is set, a service template foo@.service must exist from which services are instantiated for each incoming connection.*"

We are not going to spin up a service on each connection and will have our service always listening to the socket. Thus, we opt for the default `Accept=no`.

We also have the following "*No implicit WantedBy= or RequiredBy= dependency from the socket to the service is added. This means that the service may be started without the socket, in which case it must be able to open sockets by itself. To prevent this, an explicit Requires= dependency may be added.*"

## Implicit Dependencies

The following dependencies are implicitly added:

* Socket units automatically gain a `Before=` dependency on the service units they activate.

# Modify the Service to Depend on the Socket

After the fine details on dependencies what does this look like now?

The `foo.socket` is the primary service which requires the `foo.service` starts after it. The `foo.service` is bound to the `foo.socket` and it will stop when it stops.

{{< highlight text >}}
# foo.service
[Unit]
Description=A Example Systemd Service
PartOf=foo.socket

[Service]
Type=notify
ExecStart=/usr/local/bin/foo
ExecReload=/bin/kill -HUP $MAINPID
StandardOutput=journal
StandardError=journal
{{< / highlight >}}

{{< highlight text >}}
# foo.socket
[Unit]
Description=An Example Systemd Socket
AssertPathExists=/var/run
Requires=foo.service

[Socket]
ListenDatagram=/var/run/foo.socket
{{< / highlight >}}

We will see how the dependencies work in the section below.

# Starting and Stopping our Services

We must start the socket, which will in turn start the service. Let's see how this works:

{{< highlight bash >}}
$ systemctl start foo.socket
$ systemctl status foo.socket
● foo.socket - An Example Systemd Socket
   Loaded: loaded (/lib/systemd/system/foo.socket; static; vendor preset: enabled)
   Active: active (running) since Sat 2020-06-27 15:25:32 BST; 2s ago
   Listen: /var/run/foo.socket (Datagram)
   CGroup: /system.slice/foo.socket

Jun 27 15:25:32 pi2 systemd[1]: Listening on An Example Systemd Socket.
$ ls -l /var/run/foo.socket
srw-rw-rw- 1 root root 0 Jun 27 15:25 /var/run/foo.socket
$ systemctl status foo
● foo.service - A Example Systemd Service
   Loaded: loaded (/lib/systemd/system/foo.service; static; vendor preset: enabled)
   Active: active (running) since Sat 2020-06-27 15:25:32 BST; 13s ago
 Main PID: 8290 (foo)
    Tasks: 1 (limit: 2077)
   Memory: 204.0K
   CGroup: /system.slice/foo.service
           └─8290 /usr/local/bin/foo

Jun 27 15:25:32 pi2 foo[8290]:  NOTIFY_SOCKET=/run/systemd/notify
Jun 27 15:25:32 pi2 foo[8290]:  LISTEN_PID=8290
Jun 27 15:25:32 pi2 foo[8290]:  LISTEN_FDS=1
Jun 27 15:25:32 pi2 foo[8290]:  LISTEN_FDNAMES=foo.socket
Jun 27 15:25:32 pi2 foo[8290]:  INVOCATION_ID=4001ab75aff64aa2a6e337635f80db97
Jun 27 15:25:32 pi2 foo[8290]:  JOURNAL_STREAM=8:284605
Jun 27 15:25:32 pi2 foo[8290]: foo service started
Jun 27 15:25:32 pi2 foo[8290]: File Descriptor names are:
Jun 27 15:25:32 pi2 foo[8290]:  foo.socket
Jun 27 15:25:32 pi2 systemd[1]: Started A Example Systemd Service.
{{< / highlight >}}

This will start both the socket and the service. This is because we have `Requires=foo.service` in our `foo.socket`.

When we stop our socket the service will also stop.

{{< highlight bash >}}
$ systemctl stop foo.socket
$ systemctl status foo.socket
● foo.socket - An Example Systemd Socket
   Loaded: loaded (/lib/systemd/system/foo.socket; static; vendor preset: enabled)
   Active: inactive (dead)
   Listen: /var/run/foo.socket (Datagram)

Jun 27 15:25:32 pi2 systemd[1]: Listening on An Example Systemd Socket.
Jun 27 15:26:51 pi2 systemd[1]: foo.socket: Succeeded.
Jun 27 15:26:51 pi2 systemd[1]: Closed An Example Systemd Socket.
$ systemctl status foo
● foo.service - A Example Systemd Service
   Loaded: loaded (/lib/systemd/system/foo.service; static; vendor preset: enabled)
   Active: inactive (dead)

Jun 27 15:25:32 pi2 foo[8290]:  INVOCATION_ID=4001ab75aff64aa2a6e337635f80db97
Jun 27 15:25:32 pi2 foo[8290]:  JOURNAL_STREAM=8:284605
Jun 27 15:25:32 pi2 foo[8290]: foo service started
Jun 27 15:25:32 pi2 foo[8290]: File Descriptor names are:
Jun 27 15:25:32 pi2 foo[8290]:  foo.socket
Jun 27 15:25:32 pi2 systemd[1]: Started A Example Systemd Service.
Jun 27 15:26:51 pi2 systemd[1]: Stopping A Example Systemd Service...
Jun 27 15:26:51 pi2 systemd[1]: foo.service: Main process exited, code=killed, status=15/TERM
Jun 27 15:26:51 pi2 systemd[1]: foo.service: Succeeded.
Jun 27 15:26:51 pi2 systemd[1]: Stopped A Example Systemd Service.
{{< / highlight >}}

This will also stop the service because of our `PartOf=foo.socket` in the `foo.service` file. Note, the `/var/run/foo.socket` stays around when we stop the socket.

Again, don't start just the service or it will be left hanging without a socket.

{{< highlight bash >}}
$ systemctl start foo
Job for foo.service failed because the control process exited with error code.
See "systemctl status foo.service" and "journalctl -xe" for details.
$ systemctl status foo
● foo.service - A Example Systemd Service
   Loaded: loaded (/lib/systemd/system/foo.service; static; vendor preset: enabled)
   Active: failed (Result: exit-code) since Sat 2020-06-27 15:28:30 BST; 5s ago
  Process: 8421 ExecStart=/usr/local/bin/foo (code=exited, status=255/EXCEPTION)
 Main PID: 8421 (code=exited, status=255/EXCEPTION)

Jun 27 15:28:30 pi2 foo[8421]: foo service started
Jun 27 15:28:30 pi2 foo[8421]: Unable to find any file descriptors
Jun 27 15:28:30 pi2 foo[8421]: Unable to get file descriptor for socket
Jun 27 15:28:30 pi2 systemd[1]: foo.service: Main process exited, code=exited, status=255/EXCEPTION
Jun 27 15:28:30 pi2 systemd[1]: foo.service: Failed with result 'exit-code'.
Jun 27 15:28:30 pi2 systemd[1]: Failed to start A Example Systemd Service.
{{< / highlight >}}

# C Code for our Service

This code will
* Print to journald/syslog
* Print out the environment variables. The `NOTIFY_SOCKET` is set because we have `Type=notify` for our service. The `LISTEN_FDS` and `LISTEN_FDS` are set for us to get the socket information. Some of the other variables are self-explanatory, or can be determined from the documentation.
* From systemd find the file descriptor and name of the socket
* Receive from the socket and print it out
* Note, I removed some of the examples from the [previous post](/post/unix/systemd_journal/) on journaling. This was the signal handlers for reload and some of the `sd_journal(3)` stuff. This stuff just distracts from the socket example anyways.

{{< highlight c >}}
#include <errno.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <systemd/sd-daemon.h>
#include <unistd.h>

#define SD_LISTEN_FDS_START 3
#define BUF_SIZE 1024

extern char **environ;

void
print_environ()
{
  char *s = *environ;
  int i = 1;

  fprintf(stderr, SD_INFO "Environment: \n");
  for (; s; i++) {
    fprintf(stderr, SD_INFO " %s\n", s);
    s = *(environ+i);
  }
}

int get_sockfd()
{
  // array of strings value-result argument
  char **names = NULL;
  int num_fds;
  int sockfd; // what we'll return

  sockfd = -1;
  num_fds = sd_listen_fds_with_names(0, &names);
  if(num_fds < 0)
  {
    perror("sd_listen_fds_with_names");
    return 1;
  }

  // this also works but we don't get the name of the fd
  // num_fds = sd_listen_fds(0);

  if(num_fds == 0 || names == NULL)
  {
    fprintf(stderr, SD_WARNING "Unable to find any file descriptors");
    return -1;
  }

  fprintf(stderr, SD_NOTICE "File Descriptor names are:\n");
  for(int i=0; i<num_fds; i++)
  {
    fprintf(stderr, SD_NOTICE " %s\n", names[i]);
    if(sd_is_socket_unix(i+SD_LISTEN_FDS_START, -1, SOCK_DGRAM, (const char*) names[i], strlen(names[i])))
      sockfd = i+SD_LISTEN_FDS_START;
  }
  free(names);

  return sockfd;
}

int
main(int argc, char *argv[])
{
  int sockfd; // we will get this from systemd and it will be foo.socket
  struct sockaddr_un client; // unix domain socket client address
  socklen_t addrlen;
  ssize_t num_bytes; // bytes received from the socket
  char buf[BUF_SIZE]; // buffer to receive from socket

  print_environ();

  fprintf(stderr, SD_NOTICE "foo service started\n");

  sockfd = get_sockfd();
  if(sockfd == -1)
  {
    fprintf(stdout, SD_ERR "Unable to get file descriptor for socket\n");
    sd_notify(0, "STOPPING=1");
    return -1;
  }

  // tell the service manager we're in the ready state
  sd_notify(0, "READY=1");
  while(1)
  {
    num_bytes = recvfrom(sockfd, buf, BUF_SIZE, 0, (struct sockaddr*) &client, &addrlen);
    if(num_bytes == -1)
    {
      perror("error receiving from unix domain socket");
      continue;
    }
    buf[num_bytes] = '\0';
    fprintf(stderr, SD_NOTICE "Received %ld bytes from %s: %s\n", num_bytes, client.sun_path, buf);
  }

  return 0;
}
{{< / highlight >}}

# Running the Example

Now let's send something to the socket and see it work. Here is an example Python snippet named `foocl`:

{{< highlight python >}}
#!/usr/bin/python3

import socket
import sys
import os, os.path
import time

ssock_file = "/var/run/foo.socket"
csock_file = "/home/pi/foo.client.socket"

if os.path.exists(csock_file):
  os.remove(csock_file)

csock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
csock.bind(csock_file)

print("sending", sys.argv[1])
csock.sendto(str.encode(sys.argv[1]), ssock_file)
csock.close()

if os.path.exists(csock_file):
  os.remove(csock_file)
{{< / highlight >}}

With our service started and looking at the syslog:

{{< highlight python >}}
$ foocl hello
sending hello
$ foocl world
sending world
{{< / highlight >}}

We can see:
{{< highlight text >}}
Jun 27 15:58:41 pi2 foo[12019]: Received 5 bytes from /home/pi/foo.client.socket: hello
Jun 27 15:58:44 pi2 foo[12019]: Received 5 bytes from /home/pi/foo.client.socket: world
{{< / highlight >}}

Download [foo-1.2](/code/foo-1.2.tar.gz) example. It is the full distribution with all the autotools code. Here is how to get started on it.

{{< highlight bash >}}
$ wget http://lloydrochester.com/code/foo-1.2.tar.gz
$ tar zxf foo-1.2.tar.gz
$ cd foo
$ ./configure
$ make
$ sudo make install
$ sudo systemctl daemon-reload
$ sudo systemctl start foo.socket
{{< / highlight >}}
