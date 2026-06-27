---
draft: true
categories:
 - c
date: "2021-06-08"
title: Libgpiod Problems with Rising and Falling Edge Detection
---

{{< highlight bash >}}
$ apt show gpiod
Package: gpiod
Version: 1.2-3+rpi1
Priority: optional
Section: misc
Source: libgpiod
Maintainer: SZ Lin (林上智) <szlin@debian.org>
Installed-Size: 72.7 kB
Depends: libc6 (>= 2.16), libgpiod2 (>= 1.2)
Homepage: https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git
Download-Size: 13.9 kB
APT-Sources: http://raspbian.raspberrypi.org/raspbian buster/main armhf Packages
Description: Tools for interacting with Linux GPIO character device - binary
 libgpiod encapsulates the ioctl calls and data structures
 behind a straightforward API. This new character device
 interface guarantees all allocated resources are freed after
 closing the device file descriptor and adds several new
 features that are not present in the obsolete sysfs interface
 (like event polling, setting/reading multiple values at once or
 open-source and open-drain GPIOs).
 .
 This package contains the gpiod binary tools.
{{< /highlight >}}

It's detecting the falling edge as well, not consistently however.
{{< highlight bash >}}
gpiomon --rising-edge gpiochip0 4
event:  RISING EDGE offset: 4 timestamp: [     175.179032864]
event:  RISING EDGE offset: 4 timestamp: [     179.157480013]
event:  RISING EDGE offset: 4 timestamp: [     180.274100419]
event:  RISING EDGE offset: 4 timestamp: [     183.045253979]
event:  RISING EDGE offset: 4 timestamp: [     184.764385647]
event:  RISING EDGE offset: 4 timestamp: [     186.489639464]
event:  RISING EDGE offset: 4 timestamp: [     187.742800272]
event:  RISING EDGE offset: 4 timestamp: [     189.784077724]
event:  RISING EDGE offset: 4 timestamp: [     193.203268078]
event:  RISING EDGE offset: 4 timestamp: [     194.871859401]
event:  RISING EDGE offset: 4 timestamp: [     196.663584298]
event:  RISING EDGE offset: 4 timestamp: [     197.795192515]
event:  RISING EDGE offset: 4 timestamp: [     200.263065808]
event:  RISING EDGE offset: 4 timestamp: [     207.102455412]
{{< /highlight >}}

This seems to work fine
{{< highlight bash >}}
gpiomon gpiochip0 4
event: FALLING EDGE offset: 4 timestamp: [     490.900576864]
event:  RISING EDGE offset: 4 timestamp: [     493.057110089]
event: FALLING EDGE offset: 4 timestamp: [     494.720671097]
event:  RISING EDGE offset: 4 timestamp: [     496.137178494]
event: FALLING EDGE offset: 4 timestamp: [     497.347637389]
event:  RISING EDGE offset: 4 timestamp: [     498.834054648]
event: FALLING EDGE offset: 4 timestamp: [     500.137463960]
event:  RISING EDGE offset: 4 timestamp: [     501.948466437]
event: FALLING EDGE offset: 4 timestamp: [     503.277809548]
event:  RISING EDGE offset: 4 timestamp: [     504.918553716]
event: FALLING EDGE offset: 4 timestamp: [     505.998524335]
event:  RISING EDGE offset: 4 timestamp: [     507.268240841]
event: FALLING EDGE offset: 4 timestamp: [     507.842298103]
event:  RISING EDGE offset: 4 timestamp: [     508.450014598]
event: FALLING EDGE offset: 4 timestamp: [     508.846072785]
event:  RISING EDGE offset: 4 timestamp: [     509.259431162]
event: FALLING EDGE offset: 4 timestamp: [     509.629124512]
event:  RISING EDGE offset: 4 timestamp: [     510.091506891]
event: FALLING EDGE offset: 4 timestamp: [     510.527784694]
event:  RISING EDGE offset: 4 timestamp: [     510.969533288]
event: FALLING EDGE offset: 4 timestamp: [     511.471186220]
event:  RISING EDGE offset: 4 timestamp: [     511.974681551]
event: FALLING EDGE offset: 4 timestamp: [     512.445158908]
{{< /highlight >}}





{{< highlight bash >}}
$ apt show gpiod
Package: gpiod
Version: 1.2-3+rpi1
Priority: optional
Section: misc
Source: libgpiod
Maintainer: SZ Lin (林上智) <szlin@debian.org>
Installed-Size: 72.7 kB
Depends: libc6 (>= 2.16), libgpiod2 (>= 1.2)
Homepage: https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git
Download-Size: 13.9 kB
APT-Sources: http://raspbian.raspberrypi.org/raspbian buster/main armhf Packages
Description: Tools for interacting with Linux GPIO character device - binary
 libgpiod encapsulates the ioctl calls and data structures
 behind a straightforward API. This new character device
 interface guarantees all allocated resources are freed after
 closing the device file descriptor and adds several new
 features that are not present in the obsolete sysfs interface
 (like event polling, setting/reading multiple values at once or
 open-source and open-drain GPIOs).
 .
 This package contains the gpiod binary tools.

$ pi apt remove gpiod
Reading package lists... Done
Building dependency tree
Reading state information... Done
Package 'gpiod' is not installed, so not removed
0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
{{< /highlight >}}