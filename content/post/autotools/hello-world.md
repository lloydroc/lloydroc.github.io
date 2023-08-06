---
title: Autotools Hello World
categories:
 - autotools
date: "2019-05-30T14:46:00Z"
---

# {{ <title> }}

# Don't Listen to the Autotools Haters
Being an avid C and Unix Geek, I decided to ignore all the hate out there about GNU Autotools and try it for myself. For those of you that don't know the GNU Autotools suite consists of Autoconf, Automake and Libtool. You'll see some major criticisms out there from people saying it's way too complex, challenging, hard to use as well as all sorts of other criticisms. Let's face it though, build systems are complex. I've used all sorts of them. Communities love to re-invent the wheel and build their own tool but at the end of the day to support everything is a massive endeavor.

# My Approach to Learning Autotools
My approach was to first read the book [Autotools by John Calcote](http://shop.oreilly.com/product/9781593272067.do). I will vouch for it being a good book with lots of great info. It definitely opens the mind and gives you a great idea for what is possible, the challenges for building user-space applications on Unix systems, issues around supporting all the different Unix platforms and how much flexibility you can build into an application to make it deployable on a large scale. What the book doesn't help too much with is starting and using projects easily, and it is pretty easy. For this the plain old [Automake Hello World](https://www.gnu.org/software/automake/manual/html_node/Hello-World.html#Hello-World) really goes a long way. There are so many details out there; but this tutorial really made it easy for me. In this blog post I'll basically go over the steps to create an Autotools Project.

# My Reasons for Learning Autotools
Here are my reasons for learning Autotools:
* Gain a better understanding of build systems and the build process
* Gain a better understanding of the Unix System
* Gain a better system of the C libraries on Unix Systems
* Every Time I build a project where GNU Make is needed I end up re-inventing what Autotools already does. Using Autotools gives you a huge amount out of the box.
* Get the benefit of having C projects buildable, installable and portable on any Unix System
* Be able to integrate with many different C libraries and packages

# The benefits you'll get
If you've ever "built from source" or downloaded and installed a tarball you've basically used Autotools. It's the famous 3 step process:
1) `./configure`
2) `make`
3) `sudo make install`

This basically ensures your system can build an application from source, then builds the application, then installs the application binaries that were built. This just touches the tip of the iceberg. With these 3 steps you can more or less rest assured any Unix user on any Unix platform can build and install the application using the standard 3 steps above. These steps are supported as convention by the entire Unix community to build and install from source.

# An Example Hello World
Before we dive in there are a number of files you need to have for any autotools project to start
* README - where info goes about your project and you need it, and should have it anyways
* configure.ac - this file is basically M4 macros to expand create the glorious `configure` script
* Makefile.am - this file is processed into a global Makefile and gives `automake` a way to know where items like the source folder lies
* src/Makefile.am a makefile in your source folder with your C source
# C files in the src folder - the actual code in your project

That's not too bad right? You'll get so much out of the box and only need 4 files. Let's look inside each one:

## README
A file explaining what our project is all about
```
A Hello World for Autotools
```

## configure.ac
Where M4 Macros are placed to expand into our configure script
```
AC_INIT([athw], [1.0], [lloyd@lloydrochester.com])
AM_INIT_AUTOMAKE([-Wall -Werror foreign])
AC_PROG_CC
AC_CONFIG_HEADERS([config.h])
AC_CONFIG_FILES([Makefile src/Makefile])
AC_OUTPUT
```

## Makefile.am
The top-level Makefile for your project.
```
SUBDIRS = src
dist_doc_DATA = README
```

## Source Level Makefile Macro src/Makefile.am
Source Level Makefile Macro.
```
bin_PROGRAMS = helloworld
helloworld_SOURCES = main.c
```

## The C Source for a Hello World
{{< highlight c >}}
#include <stdio.h>
#include <stdlib.h>

int
main(int argc, char* argv[])
{
  puts("hello world!");
  return EXIT_SUCCESS;
}
{{< / highlight >}}

## Initializing the Autotools Hello World Project
Now that we've gotten the boiler plate up and running let's see what this new autotools system can do. From the GNU Hello World referenced above it tells us to run the following:

```
autoreconf --install
```

Once this command is run without errors you will see a good number of files now in your project directory including a Makefile at the top level as well as one in the src level. A configure script can also be found.

## Configuring the Project
Great we've done a autoreconf and our project is setup. Now we can simply run our configure script. This script checks the build environment and ensures that we can build it. Let's see the output from an Arch-Linux System:

```
$ ./configure
checking for a BSD-compatible install... /usr/bin/install -c
checking whether build environment is sane... yes
checking for a thread-safe mkdir -p... /usr/bin/mkdir -p
checking for gawk... gawk
checking whether make sets $(MAKE)... yes
checking whether make supports nested variables... yes
checking for gcc... gcc
checking whether the C compiler works... yes
checking for C compiler default output file name... a.out
checking for suffix of executables...
checking whether we are cross compiling... no
checking for suffix of object files... o
checking whether we are using the GNU C compiler... yes
checking whether gcc accepts -g... yes
checking for gcc option to accept ISO C89... none needed
checking whether gcc understands -c and -o together... yes
checking whether make supports the include directive... yes (GNU style)
checking dependency style of gcc... gcc3
checking that generated files are newer than configure... done
configure: creating ./config.status
config.status: creating Makefile
config.status: creating src/Makefile
config.status: creating config.h
config.status: executing depfiles commands
```

If another user on another system tried to run the configurate script and got an error, the script would give a decently user-friendly error message on how the system needs to be changed to fix it. Above, you can see some `no` answers, but the `configure` script adapts and can handle many different scenarios from Linux, FreeBSD, ArchLinux, to OS X and any Unix System for that matter.

### Building the Project
Now it's all setup check out how easy it is to build.

```
$ make
make  all-recursive
make[1]: Entering directory '/home/lloydroc/athw'
Making all in src
make[2]: Entering directory '/home/lloydroc/athw/src'
gcc -DHAVE_CONFIG_H -I. -I..     -g -O2 -MT main.o -MD -MP -MF .deps/main.Tpo -c -o main.o main.c
mv -f .deps/main.Tpo .deps/main.Po
gcc  -g -O2   -o helloworld main.o
make[2]: Leaving directory '/home/lloydroc/athw/src'
make[2]: Entering directory '/home/lloydroc/athw'
make[2]: Leaving directory '/home/lloydroc/athw'
make[1]: Leaving directory '/home/lloydroc/athw'
```

### Installing the program
Now we can install this program on our system and all users can use it. Again it works on any Unix-flavor. Check it out:

Note: we can just run without installing system wide by simply doing
```
$ src/helloworld
hello world!
```

Installing System Wide
```
$ sudo make install
Making install in src
make[1]: Entering directory '/home/lloydroc/athw/src'
make[2]: Entering directory '/home/lloydroc/athw/src'
 /usr/bin/mkdir -p '/usr/local/bin'
  /usr/bin/install -c helloworld '/usr/local/bin'
make[2]: Nothing to be done for 'install-data-am'.
make[2]: Leaving directory '/home/lloydroc/athw/src'
make[1]: Leaving directory '/home/lloydroc/athw/src'
make[1]: Entering directory '/home/lloydroc/athw'
make[2]: Entering directory '/home/lloydroc/athw'
make[2]: Nothing to be done for 'install-exec-am'.
 /usr/bin/mkdir -p '/usr/local/share/doc/athw'
 /usr/bin/install -c -m 644 README '/usr/local/share/doc/athw'
make[2]: Leaving directory '/home/lloydroc/athw'
make[1]: Leaving directory '/home/lloydroc/athw'
$ which helloworld
/usr/local/bin/helloworld
lloydrochester :: ~/athw » helloworld
hello world!
$
```

### Uninstalling
An uninstall is simple
```
$ sudo make uninstall
Making uninstall in src
make[1]: Entering directory '/home/lloydroc/athw/src'
 ( cd '/usr/local/bin' && rm -f helloworld )
make[1]: Leaving directory '/home/lloydroc/athw/src'
make[1]: Entering directory '/home/lloydroc/athw'
 ( cd '/usr/local/share/doc/athw' && rm -f README
```

### Where to Go from Here
Using this in your normal project workflow is going to give many benefits for ease of use, system compatibility, portability, and flexibility for the application. The following, however, is not addressed

* Under what conditions would a `autoreconf --install` and/or a `./configure` need to be re-run?
* What files should be under version control to distribute this program?
* What changes need to be made to integrate system libraries and 3rd Party Libraries?
* How can unit testing be performed?
* How do I add in more source and can I build multiple programs inside a single Autotools project?

Thanks for Reading!

