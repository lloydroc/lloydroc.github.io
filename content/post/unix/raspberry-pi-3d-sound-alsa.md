---
title: USB 3D Sound on the Raspberry Pi
date: "2021-01-01"
categories:
 - unix
 - alsa
---

I recently bought the USB 3D Sound Card to play around with some C ALSA Programming on the Raspberry Pi. It worked without a problem and wanted to jot down some notes in this post on it's specifications and how to use it. I didn't have to make any modifications to the Raspberry Pi at all and sound worked right out of the box. I ran this on a Raspberry Pi B+ on Raspian.

To jump right to the chase you can easily play and record audio with the `aplay` and `arecord` commands. You'll need to specify the `plughw:1,0` or `hw:1,0` device. The USB 3D Sound is a 16-Bit, 2 Channel device with rates of 44,100 and 48,000 Hz. It can buffer about 1M of data corresponding to 5.9 seconds.

![USB 3D Sound](/assets/jpg/usb_3d_sound_raspberry_pi.jpg)

# ALSA Command Utilities to get Sound Card Information

The Raspberry Pi comes with the `aplay` and `arecord` commands to play and record audio. These commands both offer many options to play and record audio. The `a` stands for ALSA which stands for the *Advanced Linux Sound Architecture*.

## Playing Audio on the USB 3D Sound

To play sound is simple. This is also known as *playback*. Simply run:

{{< highlight bash >}}
$ aplay --device=plughw:1,0 yourfile
{{< / highlight >}}

There are many options - see them all by typing `aplay -h`.

## Recording Audio on the USB 3D Sound

To record sound is simple:

{{< highlight bash >}}
$ arecord --device=plughw:1,0 yourfile
{{< / highlight >}}

There are many options - see them all by typing `arecord -h`.

# Listing Sound Devices on the Raspberry Pi

The first thing that we'll do is list the HW devices and go a bit into how ALSA names them. This is an important detail later. The following `aplay` command will list our hardware devices.

{{< highlight bash >}}
$ aplay -l
**** List of PLAYBACK Hardware Devices ****
card 0: ALSA [bcm2835 ALSA], device 0: bcm2835 ALSA [bcm2835 ALSA]
  Subdevices: 7/7
  Subdevice #0: subdevice #0
  Subdevice #1: subdevice #1
  Subdevice #2: subdevice #2
  Subdevice #3: subdevice #3
  Subdevice #4: subdevice #4
  Subdevice #5: subdevice #5
  Subdevice #6: subdevice #6
card 0: ALSA [bcm2835 ALSA], device 1: bcm2835 IEC958/HDMI [bcm2835 IEC958/HDMI]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
card 0: ALSA [bcm2835 ALSA], device 2: bcm2835 IEC958/HDMI1 [bcm2835 IEC958/HDMI1]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
card 1: Device [USB Audio Device], device 0: USB Audio [USB Audio]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
{{< / highlight >}}

Looking closely at this we have 2 cards:

* Card 0 has 3 devices. The first card is what is built into the Raspberry Pi and is the default device.
* Card 1 is the 3D Sound device that is found on USB

## Listing the PCM Devices

We can now list the PCM Devices on the Raspberry Pi.

{{< highlight bash >}}
$ aplay -L
null
    Discard all samples (playback) or generate zero samples (capture)
default:CARD=ALSA
    bcm2835 ALSA, bcm2835 ALSA
    Default Audio Device
sysdefault:CARD=ALSA
    bcm2835 ALSA, bcm2835 ALSA
    Default Audio Device
dmix:CARD=ALSA,DEV=0
    bcm2835 ALSA, bcm2835 ALSA
    Direct sample mixing device
dmix:CARD=ALSA,DEV=1
    bcm2835 ALSA, bcm2835 IEC958/HDMI
    Direct sample mixing device
dmix:CARD=ALSA,DEV=2
    bcm2835 ALSA, bcm2835 IEC958/HDMI1
    Direct sample mixing device
dsnoop:CARD=ALSA,DEV=0
    bcm2835 ALSA, bcm2835 ALSA
    Direct sample snooping device
dsnoop:CARD=ALSA,DEV=1
    bcm2835 ALSA, bcm2835 IEC958/HDMI
    Direct sample snooping device
dsnoop:CARD=ALSA,DEV=2
    bcm2835 ALSA, bcm2835 IEC958/HDMI1
    Direct sample snooping device
hw:CARD=ALSA,DEV=0
    bcm2835 ALSA, bcm2835 ALSA
    Direct hardware device without any conversions
hw:CARD=ALSA,DEV=1
    bcm2835 ALSA, bcm2835 IEC958/HDMI
    Direct hardware device without any conversions
hw:CARD=ALSA,DEV=2
    bcm2835 ALSA, bcm2835 IEC958/HDMI1
    Direct hardware device without any conversions
plughw:CARD=ALSA,DEV=0
    bcm2835 ALSA, bcm2835 ALSA
    Hardware device with all software conversions
plughw:CARD=ALSA,DEV=1
    bcm2835 ALSA, bcm2835 IEC958/HDMI
    Hardware device with all software conversions
plughw:CARD=ALSA,DEV=2
    bcm2835 ALSA, bcm2835 IEC958/HDMI1
    Hardware device with all software conversions
default:CARD=Device
    USB Audio Device, USB Audio
    Default Audio Device
sysdefault:CARD=Device
    USB Audio Device, USB Audio
    Default Audio Device
front:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    Front speakers
surround21:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    2.1 Surround output to Front and Subwoofer speakers
surround40:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    4.0 Surround output to Front and Rear speakers
surround41:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    4.1 Surround output to Front, Rear and Subwoofer speakers
surround50:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    5.0 Surround output to Front, Center and Rear speakers
surround51:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    5.1 Surround output to Front, Center, Rear and Subwoofer speakers
surround71:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    7.1 Surround output to Front, Center, Side, Rear and Woofer speakers
iec958:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    IEC958 (S/PDIF) Digital Audio Output
dmix:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    Direct sample mixing device
dsnoop:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    Direct sample snooping device
hw:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    Direct hardware device without any conversions
plughw:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    Hardware device with all software conversions
{{< / highlight >}}

We can see that the 3D USB card is found on many device names. ALSA has both `hw` devices which interact directly with the hardware and `plughw` devices which are plugins that have another software layer on them to do things like the Surround Sound Specification.

I'm talking mainly about this bit:

{{< highlight bash >}}
hw:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    Direct hardware device without any conversions
plughw:CARD=Device,DEV=0
    USB Audio Device, USB Audio
    Hardware device with all software conversions
{{< / highlight >}}

Which says *Direct hardware device without any conversions* for the `hw` and *Hardware device with all software conversions* for the `plughw`.

## Getting HW Params for the 3D Sound

Knowing that the 3D Sound is on Card 0/Device 1. We can dump the Hardware Information for the 3D Sound:

{{< highlight bash >}}
$ aplay --device=hw:1,0 --dump-hw-params ~/test22.wav
Playing WAVE '/home/pi/test22.wav' : Signed 16 bit Little Endian, Rate 48000 Hz, Mono
HW Params of device "hw:1,0":
--------------------
ACCESS:  MMAP_INTERLEAVED RW_INTERLEAVED
FORMAT:  S16_LE
SUBFORMAT:  STD
SAMPLE_BITS: 16
FRAME_BITS: 32
CHANNELS: 2
RATE: [44100 48000]
PERIOD_TIME: [1000 2972155)
PERIOD_SIZE: [45 131072]
PERIOD_BYTES: [180 524288]
PERIODS: [2 1024]
BUFFER_TIME: [1875 5944309)
BUFFER_SIZE: [90 262144]
BUFFER_BYTES: [360 1048576]
TICK_TIME: ALL
--------------------
aplay: set_params:1345: Channels count non available
{{< / highlight >}}

## ALSA Mixer

You can check out the ALSA Mixer and increase volume and do different things.

{{< highlight bash >}}
$ alsamixer -c 1
{{< / highlight >}}

![alsamixer - USB 3D Sound](/assets/png/alsamixer_3d_sound.png)

## Making the USB 3d Sound Card the Default

To make the 3d Sound Card the default do:

{{< highlight json >}}
pcm.!default {
  type plug
  slave {
    pcm "hw:1,0"
  }
}

ctl.!default {
  type hw
  card 1
}
{{< / highlight >}}

Now you don't need to specify the device when running the `aplay` or `arecord` commands.
