---
categories:
 - hardware
tags:
 - lora
 - wireless
 - ebyte-e32-lora
date: "2021-06-18"
title: Ebyte E32 Lora Module - systemd service
---

# {{< title >}}

The `e32` program is intended to be run as a service in the backround with [communication through sockets](/post/hardware/ebyte-e32-lora-sockets). This way you can write software in any langauge and just have to deal with the easy job of reading and writing to a socket. Once the `e32` service is started and running it can be accessed at any time by a client. In this post we'll document the actual systemd service. We have some [client examples](/post/hardware/ebyte-e32-lora-socket-client-examples) demonstrating clients interfacing with the socket.

# Using the Service

If you take the normal installation steps it's already setup.

{{< highlight bash >}}
$ ./configure
$ make
$ sudo make install
{{< / highlight >}}

From here you just need to:
{{< highlight bash >}}
$ systemctl daemon-reload
$ systemctl start e32
$ systemctl status e32
{{< / highlight >}}

Now, you should see the following sockets. These come from the `ExecStart` line in the `e32.service` file shown below.
{{< highlight bash >}}
# file /run/e32.control
/run/e32.control: socket
# file /run/e32.data
/run/e32.data: socket
# ls -l /run/e32.data
srw-rw---- 1 root dialout 0 Jul 23 15:07 /run/e32.data
# ls -l /run/e32.control
srw-rw---- 1 root dialout 0 Jul 23 15:08 /run/e32.control
{{< / highlight >}}

Note, the permissions of these sockets. The `e32` process and the client needs ability to read and write to and from these sockets.

## Service Definition

The *autotools* package will install the service files on a `sudo make install`, there is no need to do anything. The service that is created is called `e32`. Here are the contents for reference. The service runs the `e32` in daemon mode using the `--daemon` flag.

{{< highlight bash >}}
[Unit]
Description=ebyte e32 systemd service

[Service]
Type=forking
PIDFile=/run/e32.pid
ExecStartPre=stat /dev/serial0
ExecStartPre=/usr/local/bin/e32 --reset
ExecStart=/usr/local/bin/e32 -v --daemon --sock-unix-data /run/e32.data --sock-unix-ctrl /run/e32.control
ExecStartPost=chown --reference=/dev/serial0 /run/e32.data /run/e32.control
ExecStartPost=chmod --reference=/dev/serial0 /run/e32.data /run/e32.control
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
{{< / highlight >}}

When we do a `sudo make install` the services are already installed for us.
{{< highlight bash >}}
$ sudo make install
...
 /bin/mkdir -p '/lib/systemd/system'
 /usr/bin/install -c -m 644 e32.service e32tx.timer e32tx.service '/lib/systemd/system'
...
$
{{< / highlight >}}

# Service status

We can see the status like any normal service.

{{< highlight bash >}}
root@raspberrypi:/home/pi# systemctl status e32
$ systemctl status e32
● e32.service - ebyte e32 systemd service
   Loaded: loaded (/lib/systemd/system/e32.service; disabled; vendor preset: enabled)
   Active: active (running) since Wed 2021-07-28 16:44:09 MDT; 4h 40min ago
  Process: 19141 ExecStartPre=/usr/bin/stat /dev/serial0 (code=exited, status=0/SUCCESS)
  Process: 19142 ExecStartPre=/usr/local/bin/e32 --reset (code=exited, status=0/SUCCESS)
  Process: 19144 ExecStart=/usr/local/bin/e32 -v --daemon --sock-unix-data /run/e32.data --sock-uni
  Process: 19147 ExecStartPost=/usr/bin/chown --reference=/dev/serial0 /run/e32.data /run/e32.contr
  Process: 19148 ExecStartPost=/usr/bin/chmod --reference=/dev/serial0 /run/e32.data /run/e32.contr
 Main PID: 19146 (e32)
    Tasks: 1 (limit: 4915)
   CGroup: /system.slice/e32.service
           └─19146 /usr/local/bin/e32 -v --daemon --sock-unix-data /run/e32.data --sock-unix-ctrl /

{{< / highlight >}}

We can also view the journal:
{{< highlight bash >}}
# journalctl -u e32
-- Logs begin at Mon 2021-07-12 16:23:49 MDT, end at Sun 2021-07-18 07:19:40 MDT
Jul 15 17:27:47 raspberrypi systemd[1]: Starting ebyte e32 systemd service...
{{< / highlight >}}

# Transfer Files using the Socket

Now we can have a [client send data over the socket](/post/hardware/ebyte-e32-lora-socket-client-examples).