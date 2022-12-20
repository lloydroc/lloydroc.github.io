---
categories:
 - c
date: "2020-02-24T17:40:14Z"
title: Listing files in a Directory using C
lastmod: "2020-04-13"
---

# {{< title >}}

Use the glibc `scandir` function from `<dirent.h>` to list all the files in a directory using the C programming language. The `scandir` function allows for sorting, comparing and filtering the names of files in the directory. There are default options to list alphabetically through the `alphasort()` glibc standard function. We'll make an example in C that shows how to list all the files in a directory and give the name and type of each file in the directory.

### Running the Example

To run the example we must specify the name of the directory to list. I will just specify the source directory from which the example was built to show how it works. This is a good use case since it shows both files and directories. The example is showing a number of regular files an directories in an autotools project. The name of the binary is called `cdirlist` and it takes an argument for the directory to list; we just give it `.` to list. For each file the program finds it will print the name of file, the record length and the type.

{{< highlight bash >}}
$ ./src/cdirlist .
NAME: test-driver RECORD LENGTH: 32 TYPE: regular
NAME: stamp-h1 RECORD LENGTH: 32 TYPE: regular
NAME: src RECORD LENGTH: 24 TYPE: directory
NAME: missing RECORD LENGTH: 32 TYPE: regular
NAME: install-sh RECORD LENGTH: 32 TYPE: regular
NAME: depcomp RECORD LENGTH: 32 TYPE: regular
NAME: configure.scan RECORD LENGTH: 40 TYPE: regular
NAME: configure.ac RECORD LENGTH: 32 TYPE: regular
NAME: configure RECORD LENGTH: 32 TYPE: regular
NAME: config.status RECORD LENGTH: 40 TYPE: regular
NAME: config.log RECORD LENGTH: 32 TYPE: regular
NAME: config.h.in RECORD LENGTH: 32 TYPE: regular
NAME: config.h RECORD LENGTH: 32 TYPE: regular
NAME: compile RECORD LENGTH: 32 TYPE: regular
NAME: cdirlist-1.0.tar.gz RECORD LENGTH: 40 TYPE: regular
NAME: autoscan.log RECORD LENGTH: 32 TYPE: regular
NAME: autom4te.cache RECORD LENGTH: 40 TYPE: directory
NAME: autogen.sh RECORD LENGTH: 32 TYPE: regular
NAME: aclocal.m4 RECORD LENGTH: 32 TYPE: regular
NAME: README RECORD LENGTH: 32 TYPE: regular
NAME: Makefile.in RECORD LENGTH: 32 TYPE: regular
NAME: Makefile.am RECORD LENGTH: 32 TYPE: regular
NAME: Makefile RECORD LENGTH: 32 TYPE: regular
NAME: .gitignore RECORD LENGTH: 32 TYPE: regular
NAME: .git RECORD LENGTH: 24 TYPE: directory
NAME: .. RECORD LENGTH: 24 TYPE: directory
NAME: . RECORD LENGTH: 24 TYPE: directory
$
{{< / highlight >}}

## The scandir function

To list files in a directory we will use the `scandir` function from `dirent.h`. There is also a `scandirat` function that allows us to pass in a file descriptor instead of a directory name in a `char*`. See `man 2 scandir` for details. Here is the function signature for `scandir`.

{{< highlight c >}}
int scandir(const char *dirp, struct dirent ***namelist,
            int (*filter)(const struct dirent *),
            int (*compar)(const struct dirent **, const struct dirent **));
{{< / highlight >}}

The `dirp` is the directory to list. The `namelist` will be populated from all the files in the directory. The `filter` function is optional but will filter out files from `namelist` based on user specified criteria. The `compar` function will control how the file listing is done. The glibc library provides `alphasort` and `versionsort` for this. Again, see `man 3 scandir` for all the details.

## C code to List files in Directory

Below is a simple example, mainly taken from `man scandir`, with the exception of adding filtering logic. The filtering logic would typically be done on the name of the file which is found in the `dirent.d_name` structure member. With filtering it allows us to easy skip over files we don't want returned. There is more on the the `dirent` structure later. If you don't want a filter instead of passing in the function you can simply set the argument to `NULL`.

{{< highlight c >}}
#define _DEFAULT_SOURCE
#include "../config.h"
#include <dirent.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 The filter function allows us
 to not list files in the directory.

 Typically we analyze name->d_name
 and return 0 if you DO NOT want
 it in the returned list of files.

 Returning 1 will allow all files
 to be listed.
*/
int
filter(const struct dirent *name)
{
  return 1;
}

int
main(int argc, char *argv[])
{
  struct dirent **namelist;
  int n;

  if(argc != 2)
  {
    printf("usage: %s path\n", argv[0]);
    return EXIT_FAILURE;
  }

  /*
   List files in the current working directory.
   These are the files that are in the directory
   from which the process was run.
  */
  n = scandir(argv[1], &namelist, filter, alphasort);
  if (n == -1) {
    perror("scandir");
    exit(EXIT_FAILURE);
  }

  while (n--) {
    printf("NAME: %s RECORD LENGTH: %d ", namelist[n]->d_name, namelist[n]->d_reclen);
    switch(namelist[n]->d_type)
    {
      case DT_UNKNOWN:
        puts("TYPE: unknown");
        break;
      case DT_FIFO:
        puts("TYPE: fifo");
        break;
      case DT_CHR:
        puts("TYPE: character device");
        break;
      case DT_DIR:
        puts("TYPE: directory");
        break;
      case DT_BLK:
        puts("TYPE: block device");
        break;
      case DT_REG:
        puts("TYPE: regular");
        break;
      case DT_LNK:
        puts("TYPE: link");
        break;
      case DT_SOCK:
        puts("TYPE: unix domain socket");
        break;
      case DT_WHT:
        puts("TYPE: whiteout");
        break;
    }
    free(namelist[n]);
  }
  free(namelist);

  exit(EXIT_SUCCESS);
}
{{< / highlight >}}

### The dirent structure

When we scan the directory we get a list  `dirent` structures. This basic form of the structure is shown below.

{{< highlight c >}}
struct dirent
{
  unsigned short int d_reclen; /* number of records */
  unsigned char d_type; /* the type of the file, more on this later */
  char d_name[256]; /* the name of the file */
}
{{< / highlight >}}

See the `/usr/include/bits/dirent.h` for the full definition as it can change slightly.

Each file has the following types defined in `/usr/include/dirent.c`

{{< highlight c >}}
enum
{
  DT_UNKNOWN = 0, /* unknown file type */
  DT_FIFO = 1,    /* fifo file */
  DT_CHR = 2,     /* character device */
  DT_DIR = 4,     /* directory */
  DT_BLK = 6,     /* block device */
  DT_REG = 8,     /* regular */
  DT_LNK = 10,    /* link */
  DT_SOCK = 12,   /* unix domain socket */
  DT_WHT = 14     /* whiteout file in FreeBSD (exotic) */
};
{{< / highlight >}}

### Notes on the example

There are a couple of details to note. The `scandir` function will not list directories recursively.

We `#define _DEFAULT_SOURCE`. This will allow us to "enable features from the 2008 edition of POSIX, as well as certain BSD and SVID features without a separate feature test macro to control them". It's worth reading more on this macro definition as it could have some implications.

Another function is defined called `scandirat()`. This function accepts one more argument which is a file descriptor of a directory to scan a directory from. Again, consult `man scandir` for more information.

## Running the Example

If you want to try this example download <a href="/code/cdirlist-1.0.tar.gz">cdirlist-1.0.tar.gz</a> and run the following:

{{< highlight bash >}}
$ tar zxf cdirlist-1.0.tar.gz
$ cd cdirlist-1.0
$ ./configure
$ make
$ ./src/cdirlist .
{{< / highlight >}}

## Where to go from here?

Now we can list files in a directory and also know what type each file is here. We can now filter out by file name or file type. We could also build upon this example to recursively list files or to get more information about files. If you find this example useful, have questions, or want to know more, then let me know in the examples.
