---
categories:
 - hardware
tags:
 - lidar
 - "Range Finder"
date: "2020-10-12"
title: TF Mini Plus Unix Agent for the Raspberry Pi
---

# {{< title >}}

In this post we will create a Unix agent for the TF Mini+ LiDAR Range Finder. We'll run the agent on a Raspberry Pi B+ as a daemon. This agent will send out UDP datagrams with each LiDAR Reading. Also, we can use the `tfmini` program as a command line tool to read from the LiDAR and change the configuration. Overall, I've noticed the TF Mini+ is quite accurate and snappy.

# Wiring

Wiring the TF Mini to the Raspberry Pi is simple. It's only 4 wires and we'll wire it to the UART. LiDAR frames from the TF Mini+ are sent to the Raspberry Pi at the default 115,200 Baud rate. Each frame will come at a rate of 100Hz by default.

| RPI Pin | RPI Desc         | TF Mini+ Pin | TF Mini Desc |
|---------|------------------|--------------|--------------|
| +5V     | +5V Power Supply | 1 Red        | +5V Supply   |
| 8       | GPIO 14 UART TXD | 2 White      | RXD UART     |
| 10      | GPIO 15 UART RXD | 3 Blue       | TXD UART     |
| GND     | Ground           | 4 Black      | Ground       |

![Raspberry Pi to TF Mini+ Wiring](/assets/jpg/rpi_tf_mini_wiring.jpg)

# Raspberry Pi Setup

The Raspberry Pi involves enabling the UART and giving proper permissions to the `pi` user. Use the `raspi-config` command to enable the UART. This code will use the UART mapped `/dev/ttyAMA0` on the filesystem.

This is how my user is configured:
{{< highlight bash >}}
$ whoami
pi
$ groups
pi adm tty dialout cdrom sudo audio video plugdev games users input netdev gpio i2c spi
$ ls -l /dev/ttyAMA0
crw-rw---- 1 root dialout 204, 64 Oct  7 17:31 /dev/ttyAMA0
{{< / highlight >}}

Note, the Unix user running the program will need to be in the `dialout` and `tty` groups. Being added to these groups won't take effect until you log back out and into the session again.

{{< highlight bash >}}
$ sudo usermod -a -G dialout pi
$ sudo usermod -a -G tty pi
$ exit # logout for groups to take effect
{{< / highlight >}}

# Installing the Agent

Here are the steps to install the agent. The software comes packaged as an `autotools` project. Enter this on a terminal on the Raspberry Pi as the `pi` user.

{{< highlight bash >}}
$ wget {{ absURL "/code/tf_mini_plus_rpi-1.1.tar.gz" }}
$ tar zxf tf_mini_plus_rpi-1.1.tar.gz
$ cd tf_mini_plus_rpi-1.1
$ ./configure
$ make
{{< / highlight >}}

Once built we can install it on the system.

{{< highlight bash >}}
$ sudo make install # sudo make uninstall will remove it
{{< / highlight >}}

Now run the `tfmini` program.

{{< highlight bash >}}
$ tfmini --help
Usage: ./tfmini [OPTIONS]

A command line tool to interact with the TF Mini+.
OPTIONS:
-h, --help                  Print help
-r, --reset                 SW Reset
    --firmware-version      Read firmware version
    --measure-mm            Set measurment units to mm
    --measure-cm            Set measurment units to cm
    --disable-lidar-output  Disable output of the LiDAR
    --enable-lidar-output   Enable output of the LiDAR
    --disable-lidar-output  Disable output of the LiDAR
    --set-update-rate RATE  Set Lidar Frame Rate [1-1000]Hz
-x, --discard-bad-checksum  Discard LiDAR frames with bad checksums
-v, --verbose               Verbose Output
-u, --socket-udp HOST:PORT  Output data to a UDP Socket
-p, --poll                  Poll the LiDAR and print to STDOUT
-d, --daemon                Run as a Daemon

Version: 1.1
{{< / highlight >}}

If you choose to not install the `tfmini` program system wide just run the binary from the `src` folder like so:

{{< highlight bash >}}
$ ./src/tfmini -h
{{< / highlight >}}

You could then add the binary to your path:

{{< highlight bash >}}
export PATH=$PATH:$HOME/tf_mini_plus_rpi/src
{{< / highlight >}}

# Source Code in Github

See the source code in Github [tfmini_agent](https://github.com/lloydroc/tfmini_agent).

# Verifying the Installation

We can read and write settings to the TF Mini+, but need to disable the LiDAR output to do so. From there we can read the firmware version. Lastly, we'll enable the LiDAR output again.

To ensure the wiring is correct and you can read from the UART try this:

{{< highlight bash >}}
$ tfmini --disable-lidar-output
LiDAR output disabled
$ tfmini --firmware-version
V3.9.1
$ tfmini --measure-cm
Measurement unit set to centimeters
$ tfmini --poll
LiDAR output enabled
Distance: 04 Strength: 1736 Good Frames: 00000286 Bad Frames: 00000000
^C
{{< / highlight >}}

When we run `tfmini --poll` it will poll the LiDAR and output distance and strength to the command line. It looks like this:


<video width="320" height="240" controls>
  <source src="/assets/mp4/tf_mini_realtime.mp4" type="video/mp4"/>
</video>


# Running the Agent as a Unix Daemon

The `tfmini` program is meant to run as a Unix daemon where it sends out UDP datagrams. Another client program would be written listen on the port the agent is sending UDP datagrams to, decode them and do something useful with them. Let's run `tfmini` as a daemon and then see how we can inspect the UDP datagrams.

By doing a `sudo make install` a systemd service unit will be installed.
{{< highlight bash "linenos=table,hl_lines=15">}}
sudo make install
Making install in src
make[1]: Entering directory '/home/pi/tf_mini_plus_rpi/src'
make[2]: Entering directory '/home/pi/tf_mini_plus_rpi/src'
 /bin/mkdir -p '/usr/local/bin'
  /usr/bin/install -c tfmini '/usr/local/bin'
make[2]: Nothing to be done for 'install-data-am'.
make[2]: Leaving directory '/home/pi/tf_mini_plus_rpi/src'
make[1]: Leaving directory '/home/pi/tf_mini_plus_rpi/src'
Making install in systemd
make[1]: Entering directory '/home/pi/tf_mini_plus_rpi/systemd'
make[2]: Entering directory '/home/pi/tf_mini_plus_rpi/systemd'
make[2]: Nothing to be done for 'install-exec-am'.
 /bin/mkdir -p '/lib/systemd/system'
 /usr/bin/install -c -m 644 tfmini.service '/lib/systemd/system'
make[2]: Leaving directory '/home/pi/tf_mini_pls_rpi/systemd'
make[1]: Leaving directory '/home/pi/tf_mini_plus_rpi/systemd'
make[1]: Entering directory '/home/pi/tf_mini_plus_rpi'
make[2]: Entering directory '/home/pi/tf_mini_plus_rpi'
make[2]: Nothing to be done for 'install-exec-am'.
 /bin/mkdir -p '/usr/local/share/doc/tf_mini_plus_rpi'
 /usr/bin/install -c -m 644 README '/usr/local/share/doc/tf_mini_plus_rpi'
make[2]: Leaving directory '/home/pi/tf_mini_plus_rpi'
make[1]: Leaving directory '/home/pi/tf_mini_plus_rpi'u
{{< / highlight >}}

From there we need to reload the systemd manager configuration and start the service.

{{< highlight bash >}}
$ sudo systemctl daemon-reload
$ sudo systemctl start tfmini
$ sudo systemctl status tfmini
sudo systemctl status tfmini
● tfmini.service - TF Mini Service sending LiDAR Frames over UDP
   Loaded: loaded (/lib/systemd/system/tfmini.service; disabled; vendor preset: enabled)
   Active: active (running) since Sun 2020-10-18 15:31:59 MDT; 5s ago
  Process: 26231 ExecStart=/usr/local/bin/tfmini --measure-cm --daemon --socket-udp 127.0.0.1:2210 (code=exited, status=0/SUCCESS
 Main PID: 26233 (tfmini)
    Tasks: 1 (limit: 2077)
   Memory: 296.0K
   CGroup: /system.slice/tfmini.service
           └─26233 /usr/local/bin/tfmini --measure-cm --daemon --socket-udp 127.0.0.1 2210

Oct 18 15:31:59 pi2 systemd[1]: Starting TF Mini Service sending LiDAR Frames over UDP...
Oct 18 15:31:59 pi2 tf_mini[26231]: LiDAR output disabled
Oct 18 15:31:59 pi2 tf_mini[26231]: Measurement unit set to centimeters
Oct 18 15:31:59 pi2 systemd[1]: Started TF Mini Service sending LiDAR Frames over UDP.
Oct 18 15:31:59 pi2 tf_mini[26233]: LiDAR output enabled
{{< / highlight >}}

# Verifying the Agent Works using Netcat

By default the agent is sending to localhost on port 2210. We can use the `nc` Unix tool to see if we're receiving UDP datagrams.

{{< highlight bash >}}
$ nc -v -l -u 127.0.0.1 2210
Listening on [localhost] (family 2, port 2210)
Connection from localhost 34970 received!
YY{P	�YYsP	�YYqP	�YYtP	�YYuP	�YYrP	�YYsP	�YYqP	�YYwP	�YYuP	�YYyP	�YYxP	�YYyP	�YYtP	�YYtP	�YYvP	�YYwP	�YYvP	�YYyP	�YYxP	�YYpP	�YYuP	�YYwP	�YYxP	�YYuP	�YYvP	�YYpP	�YYzP	�YYyP	�YYuP	�YYwP	�YYwP	�YYrP	�YYtP	�YYpP	�YYtP	�YYqP	�YYvP	�YYsP	�YYxP	�YYuP	�YYqP	�YYpP	�YYuP	�YYxP	�YYsP	�YYwP	�YYuP	�YYpP	�YYpP	�YYxP	�YYuP	�YYsP	�YYqP	�YYxP	�YYwP	�YYsP	�YYtP	�YYoP	�YYyP	�YYtP	�YYrP	�YYsP	�YYuP	�YYvP	�YYqP	�YYuP	�YYsP	�YYyP	�YYrP	�YYwP	�YYrP	�YYvP	�YYwP	�YYoP	�YYrP 	�YYtP	�YYrP	�YYqP	�YYvP	�YYpP	�YYuP	�YYsP	�YYxP	�YYzP	�YYwP	�YYrP	�YYuP	�YYvP	�YYwP	�YYvP  	�YYwP	�YYrP	�YYuP	�YYvP	�YYsP	�YYuP	�YYqP	�YY}P	�YYuP	�YYxP	�YYwP	�YYyP	�YYlP	�YYqP	�YYqP	�YYmP	�YYsP	�YYwP	�YYuP	�^C
{{< / highlight >}}

# Example Reading LiDAR Frames with Python

To read LiDAR Frames from the Agent all you need to do is create a Datagram UDP socket, bind to the host and port then receive from the socket. Here is a python example.

{{< highlight python >}}
import socket
import sys

HOST = 'localhost'
PORT = 2210

# Create a Datagram (UDP) socket
try :
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    print 'Socket created'
except socket.error, msg :
    print 'Failed to create socket. Error Code : ' + str(msg[0]) + ' Message ' + msg[1]
    sys.exit()

# Bind socket to HOST and PORT
try:
    s.bind((HOST, PORT))
except socket.error , msg:
    print 'Bind failed. Error Code : ' + str(msg[0]) + ' Message ' + msg[1]
    sys.exit()

while 1:

    (string, address) = s.recvfrom(9)
    frame = bytes(string)
    header1 = ord(frame[0])
    header2 = ord(frame[1])

    distance_low = ord(frame[2])
    distance_high = ord(frame[3])
    distance_high <<= 8
    distance = distance_low + distance_high

    strength_low = ord(frame[4])
    strength_high = ord(frame[5])
    strength_high <<= 8
    strength = strength_low + strength_high

    checksum = ord(frame[8])

    if header1 + header2 != (0x59 + 0x59):
        print("error in headers")

    print str(distance) + ' ' + str(strength)
t.close()
{{< / highlight >}}

When we run this example we'll see the distance and strength printed to standard output.

{{< highlight bash >}}
$ python exsock.py
Socket created
4 1616
4 1620
4 1621
4 1623
4 1618
3 1627
{{< / highlight >}}

# CPU Usage

The CPU usage is quite low. The `top` command is shows about 1.3-1.7% CPU.

{{< highlight bash >}}
top - 15:45:53 up 7 days, 24 min,  2 users,  load average: 0.70, 0.32, 0.11
Tasks: 109 total,   1 running, 108 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.2 us,  0.6 sy,  0.0 ni, 99.2 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :    874.5 total,    591.5 free,     66.7 used,    216.3 buff/cache
MiB Swap:    100.0 total,     97.0 free,      3.0 used.    735.8 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
27826 root      20   0    1868     84      0 S   1.3   0.0   0:00.49 tfmini
27863 pi        20   0   10296   2984   2476 R   1.0   0.3   0:00.23 top
{{< / highlight >}}

# Changing the UDP Port and other settings

It's very likely that the loopback address `127.0.0.1` and port `2210` isn't what you desire. To change this simple edit the `systemd/tfmini.service` file. The file looks something like this.

{{< highlight systemd "linenos=table,hl_lines=6">}}
[Unit]
Description=TF Mini Service sending LiDAR Frames over UDP

[Service]
Type=forking
ExecStart=/usr/local/bin/tfmini --measure-cm --daemon --socket-udp 127.0.0.1:2210
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
{{< / highlight >}}

# Known Issues

The TF Mini+ sends out LiDAR frames on it's `TXD` Pin asynchronously to what it receives on it's `RXD` pin. If you send it a command by the time it receives it and send the response it may send out some more LiDAR frames. Currently, the software won't discard these frames and receive the respose to the command. For example if you disable LiDAR output it might send a couple frames by the time the TF Mini+ sends back the LiDAR output is disabled. Typically this is fine but it may manifest it self a couple of failed checksums. I've also noticed this when the `--reset` flag is used.

I typically will run:

{{< highlight bash >}}
$ tfmini --disable-lidar-output
{{< / highlight >}}

This will allow for sending some commands until the `--poll` or `--socket-udp` options are used. If there ends up being a lot of usage of this I'll go ahead and make sure this cannot happen.
