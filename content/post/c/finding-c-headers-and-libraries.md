---
categories:
 - c
date: "2021-05-27"
title: Finding Libriaries and Headers for C Programs in Unix
---

Need to list the installed libraries on a Unix system? Want to use a library in C and don't know the linker flags to use? Need to find where header files are located for a package? This post answers these questions.

# An example from the beginning

Let's say I want to write a C program that uses `libxml2`. We know we're going to need `#include` directives for the `libxml2` package to refer to the header files. When we compile the program we need to have a linker flag with `-l` to link in it's shared library. Keep this example in mind as you read this post. Here are the steps to arrive with what we need:

1. Is the `libxml2` library installed?
2. What are the header files we need and where are they located?
3. What are the linker flags?

Follow along and it will be easy to answer these 3 questions.

# The pkg-config tool

The `pkg-config` tool will return metainformation about installed libraries on a system. This program finds information by looking at metadata files with a `.pc` extension named after a package. It looks in some default places. The search path can be altered by setting the `PKG_CONFIG_PATH` environment variable.

Let's start out by listing all the install packages on my Raspberry Pi.
{{< highlight bash >}}
$ pkg-config --list-all
systemd            systemd - systemd System and Service Manager
libpng             libpng - Loads and saves PNG files
libpng16           libpng - Loads and saves PNG files
libsystemd         systemd - systemd Library
m17n-db            m17n-db - The m17n database used by the m17n library.
xkeyboard-config   XKeyboardConfig - X Keyboard configuration data
adwaita-icon-theme gnome-icon-theme - A collection of icons used as the basis for GNOME themes
freetype2          FreeType 2 - A free, high-quality, and portable font engine.
zlib               zlib - zlib compression library
poppler-data       poppler-data - Encoding files for use with poppler
udev               udev - udev
bash-completion    bash-completion - programmable completion for the bash shell
alsa               alsa - Advanced Linux Sound Architecture (ALSA) - Library
libgpiod           libgpiod - Library and tools for the Linux GPIO chardev
valgrind           Valgrind - A dynamic binary instrumentation framework
libmnl             libmnl - Minimalistic Netlink communication library
iso-codes          iso-codes - ISO country, language, script and currency codes and translations
shared-mime-info   shared-mime-info - Freedesktop common MIME database
{{< /highlight >}}

# First a Note about Installed Libraries

You may have libraries on your system that are *installed* but don't have header files and libraries you can link against. 
Let me show you an example.

{{< highlight bash >}}
$ apt search libxml
...
libxml2/stable,now 2.9.4+dfsg1-7+deb10u1 armhf [installed,automatic]
  GNOME XML library
...
libxml2-dbg/stable 2.9.4+dfsg1-7+deb10u1 armhf
  Debugging symbols for the GNOME XML library

libxml2-dev/stable 2.9.4+dfsg1-7+deb10u1 armhf
  Development files for the GNOME XML library

libxml2-doc/stable 2.9.4+dfsg1-7+deb10u1 all
  Documentation for the GNOME XML library
....
{{< /highlight >}}

From this we can see that only `libxml2` is installed but other packages are available. Using `pkg-config` do we have C flags and shared libraries?

{{< highlight bash >}}
$ pkg-config --list-all | grep xml
$
{{< /highlight >}}

It's not there, `pkg-config` doesn't show `libxml2` as a package? We need to install the `dev` libraries typically for this.

{{< highlight bash >}}
$ sudo apt install libxml2-dev libxml2-doc
{{< /highlight >}}

Once the development package is installed we can see the package is present.

{{< highlight bash >}}
$ pkg-config --list-all | grep xml
libxml-2.0         libXML - libXML library version2.
{{< /highlight >}}

# Listing 

Ok now that `libxml-2.0` is installed let's list C flags and shared libraries we would use for compilation and linkage.

{{< highlight bash >}}
$ pkg-config --cflags --libs libxml-2.0
-I/usr/include/libxml2 -lxml2
{{< /highlight >}}

If we look now at the `/usr/include/libxml2` directory we can see all the header files we have available to use.

# Another Example with `curl`

What if we want to create a program that uses `curl`. Let's sum this up, note you need to infer some things using `apt search curl`:

{{< highlight bash >}}
$ apt install libcurl4-doc libcurl4-openssl-dev
{{< /highlight >}}

Now we can see:
{{< highlight bash >}}
$ pkg-config --cflags --libs libcurl
-I/usr/include/arm-linux-gnueabihf -lcurl
{{< /highlight >}}

# Closing

I leave you with a question. If we go all the way back where I had the following on my system:

{{< highlight bash >}}
$ apt search libxml
...
libxml2/stable,now 2.9.4+dfsg1-7+deb10u1 armhf [installed,automatic]
  GNOME XML library
...
{{< /highlight >}}

When `pkg-config` doesn't show it listed then how is this package used? Let's look deeper into it?

{{< highlight bash >}}
$ apt search libxml
...
libxml2/stable,now 2.9.4+dfsg1-7+deb10u1 armhf [installed,automatic]
  GNOME XML library
...
{{< /highlight >}}

{{< highlight bash >}}
$ dpkg -l | grep libxml2                                                                                                                        1 ↵
ii  libxml2:armhf                       2.9.4+dfsg1-7+deb10u1               armhf        GNOME XML library
ii  libxml2-dev:armhf                   2.9.4+dfsg1-7+deb10u1               armhf        Development files for the GNOME XML library
ii  libxml2-doc
dpkg -L libxml2:armhf
/.
/usr
/usr/lib
/usr/lib/arm-linux-gnueabihf
/usr/lib/arm-linux-gnueabihf/libxml2.so.2.9.4
/usr/share
/usr/share/doc
/usr/share/doc/libxml2
/usr/share/doc/libxml2/AUTHORS
/usr/share/doc/libxml2/README
/usr/share/doc/libxml2/README.Debian
/usr/share/doc/libxml2/changelog.Debian.gz
/usr/share/doc/libxml2/changelog.gz
/usr/share/doc/libxml2/copyright
/usr/share/lintian
/usr/share/lintian/overrides
/usr/share/lintian/overrides/libxml2
/usr/lib/arm-linux-gnueabihf/libxml2.so.2
/usr/share/doc/libxml2/NEWS.gz
{{< /highlight >}}

From here we can see a shared library `libxml2.so.2.9.4` which other programs could dynamically link in. They'd have a challenge though if they needed to be locally built on the machine. Thus, this library is for pre-compiled programs that alreday know how to link this shared library in. 