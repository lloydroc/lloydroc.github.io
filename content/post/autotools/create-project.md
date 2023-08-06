---
title: Autotools Project Creation Template
categories:
 - autotools
date: "2019-06-24T07:26:00Z"
---

# {{ <title> }}

This post has a simple bash script to create a basic Hello World autotools project with a single command. The justification for this autotools script is I've not seen a consolidated script that keeps it simple in one place. The script creates a boiler plate autotools hello world project. Here is what it does:

* Creation of `configure.ac` with project name, version, and email
* Creation of root `Makefile.am` which just points to the `src/Makefile.am`
* Creation of `src/Makefile.am` which will make a binary and has a single source file `main.c`
* Creation of a `autogen.sh` which will run `autoreconf --install`
* Creation of a `.gitignore` so we know what autotools files should be under version control
* Creation of a `main.c` which just prints "hello world" to stdout.

After we have created the files above all we need to do is run a `./autogen.sh` and our project will be ready to run the infamous `./configure`, `make` and `make install`.

To create the project we can run our script by adding the project name. For this example let's call the project `autotools_helloworld`. This will create a binary called `autotools_helloworld` with our source in `main.c`. and create an autotools hello world project. Below is an example usage of the script to create the project, generate the autotools scripts, configure, make and run the program.

{{< highlight bash >}}
$ atprj autotools_helloworld
$ cd autotools_helloworld
$ ./autogen.sh
configure.ac:3: installing './compile'
configure.ac:2: installing './install-sh'
configure.ac:2: installing './missing'
src/Makefile.am: installing './depcomp'
$ ./configure
checking for a BSD-compatible install... /usr/bin/install -c
checking whether build environment is sane... yes
checking for a thread-safe mkdir -p... /usr/bin/mkdir -p
checking for gawk... gawk
checking whether make sets ... yes
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
lloydrochester :: ~/autotools_helloworld » make
make  all-recursive
make[1]: Entering directory '/home/lloydroc/autotools_helloworld'
Making all in src
make[2]: Entering directory '/home/lloydroc/autotools_helloworld/src'
gcc -DHAVE_CONFIG_H -I. -I..     -g -O2 -MT main.o -MD -MP -MF .deps/main.Tpo -c -o main.o main.c
mv -f .deps/main.Tpo .deps/main.Po
gcc  -g -O2   -o autotools_helloworld main.o
make[2]: Leaving directory '/home/lloydroc/autotools_helloworld/src'
make[2]: Entering directory '/home/lloydroc/autotools_helloworld'
make[2]: Leaving directory '/home/lloydroc/autotools_helloworld'
make[1]: Leaving directory '/home/lloydroc/autotools_helloworld'
$ ./src/autotools_helloworld
hello world
$
{{< / highlight >}}

Here is the script which I named `atprj`. This is short for "Autotools Project".

{{< highlight bash >}}
# filename atprj and add to your $PATH
#!/bin/bash

EMAIL="lloyd@lloydrochester.com"
VERSION="1.0"

if [ $# -ne 1 ]; then
  echo $0 progname
fi

mkdir $1
cd $1

touch README

cat << EOF > configure.ac
AC_INIT([$1], [$VERSION], [$EMAIL])
AM_INIT_AUTOMAKE([-Wall -Werror foreign])
AC_CONFIG_SRCDIR([config.h.in])
AC_CONFIG_HEADERS([config.h])

# Checks for programs.
AC_PROG_CC
AC_PROG_INSTALL

# Checks for libraries.
# check for the math library. round can be replaced with another call in the lib
# AC_CHECK_LIB([m], [round])

# Checks for header files.
# AC_CHECK_HEADERS([arpa/inet.h netinet/in.h strings.h sys/socket.h])

# Checks for typedefs, structures, and compiler characteristics.

# Checks for library functions.
# AC_CHECK_FUNCS([bzero socket])

AC_CONFIG_FILES([Makefile
                 src/Makefile])
AC_OUTPUT
EOF

cat << EOF > Makefile.am
SUBDIRS = src
dist_doc_DATA = README
EOF

mkdir src

cat << EOF > src/Makefile.am
bin_PROGRAMS = $1
$1_SOURCES = main.c

# if you want to link with the math library
# $1_LDADD = -lm
EOF

cat << EOF > autogen.sh
#!/bin/sh
autoreconf --install || exit 1
EOF

chmod u+x autogen.sh

cat << EOF > .gitignore
# http://www.gnu.org/software/automake

Makefile.in
/ar-lib
/mdate-sh
/py-compile
/test-driver
/ylwrap

# http://www.gnu.org/software/autoconf

autom4te.cache
/autoscan.log
/autoscan-*.log
/aclocal.m4
/compile
/config.guess
/config.h.in
/config.log
/config.status
/config.sub
/configure
/configure.scan
/depcomp
/install-sh
/missing
/stamp-h1

# https://www.gnu.org/software/libtool/

/ltmain.sh

# http://www.gnu.org/software/texinfo

/texinfo.tex

# http://www.gnu.org/software/m4/

m4/libtool.m4
m4/ltoptions.m4
m4/ltsugar.m4
m4/ltversion.m4
m4/lt~obsolete.m4(LIBDL)

Makefile
src/Makefile
*.o
src/.deps
src/test_become_daemon
config.h
tags
EOF

{{< / highlight >}}
