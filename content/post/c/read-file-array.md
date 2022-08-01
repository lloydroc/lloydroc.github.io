---
title: "Read into an File Array using C"
date: 2022-08-01
draft: false
---

In this post we'll explore how to read a file into an array of strings. Doing this in C isn't as trivial as it maybe in other languages because of memory allocation and the dynamic nature of a text file. The file will be read into a jagged array. This program uses [realloc(3)](https://man7.org/linux/man-pages/man3/realloc.3p.html) to make the most efficent use of the heap possible.

Skip the background and go directly to [the code]({{< permalink >}}#the-code).

![Alligator Teeth](/assets/jpg/alligator-teeth.jpg)

I think of Alligator teeth when thinking of a jagged array as each tooth is a different size and length.

# The Jagged Array

We want to read the file into an array of strings. What structure in C represents this file with the highest efficiency and least amount of memory usage? An array of pointers where each pointer will point to a null-terminated `char *` - or **string** as we will call it. A text file is a highly dynamic data structure because of both the number of lines and the length of each line. Essentially, an efficient way to represent a text file is with a jagged array.

Let's say we have the following file:

{{< highlight bash >}}
a
bc
def
{{< / highlight >}}

This file is 3 lines long and is 9 bytes total since each line ends with a newline. Thus, we're going to have a jagged array that has 3+1 pointers for each line. The last pointer's value will be null so we can determine the end. The first three pointers will point to strings in memory. Here is an example of how it looks in memory.

| Index | Line | Pointer Value | Comment |
|-------|------|---------------|---------|
| 0     | 1    | 0x1000        | a\n\0   |
| 1     | 2    | 0x1003        | bc\n\0  |
| 2     | 3    | 0x1007        | def\n\0 |
| 3     | -    | null          |         |

Let's take an example in C for the file above.

{{< highlight c >}}
// file jagged.c
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

int
main(int argc, char *argv[])
{
  char *lines[4];
  int line = 1;

  lines[0] = strdup("a\n");
  lines[1] = strdup("bc\n");
  lines[2] = strdup("def\n");
  lines[3] = NULL;

  for(char **str = lines; str != NULL; str++)
    printf("line %d, address %p, length: %ld, value: %s", line++, str, strlen(*str), *str);

  return 0;
}
{{< / highlight >}}

Running this code will produce:

{{< highlight bash >}}
$ ./jagged
line 1, address 0x7ffe00f50bb0, length: 2, value: a
line 2, address 0x7ffe00f50bb8, length: 3, value: bc
line 3, address 0x7ffe00f50bc0, length: 4, value: def
{{< / highlight >}}

Note, the memory addresses are real, whereas, the example above with `0x1000` addresses is made-up. From this example we see that malloc will align to 8-byte boundaries. Note `0xc0-0xb8=8`.

# The Code

Here is the code to read a file into a jagged array of strings in C. For input, the program takes one command line argument. This argument is the file that to read and print. For output, the program will print the lines to standard out with line numbers and some diagnostic lines.

Usage is as follows:
{{< highlight bash >}}
./file2strings <file-to-read-and-print>
{{< / highlight >}}

I'll let the code speak for itself except for a couple of fine points:
* We initially assume the number of lines in our file is 64 lines long. Thus, we initially allocate 64 pointers.
* As our number of lines exceeds 64 we increase the length of the jagged array by 64 using [realloc(3)](https://man7.org/linux/man-pages/man3/realloc.3p.html)
* After we read the file to the end we decrease the jagged array size to the exact number of lines. Plus, one line for the ending null.
* The lines we read from the file do not have the newline trimmed from the end.
* We make heavy usage of (getline(3))[https://man7.org/linux/man-pages/man3/getline.3.html]. See the description for the details of memory allocation.

{{< highlight c >}}
// filename file2strings.c
#define _GNU_SOURCE
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

/*
Our array of interest. This will be an array with pointers to malloc'd char buffers.
These lines will contain newlines at the end
*/
char **lines;

/*
Read the number of lines from a file that is numbytes long.
*/
ssize_t
read_lines(FILE *file, long numbytes)
{
    long numlines_allocated;
    char **ptr;
    ssize_t numchars;
    size_t maxbytes = 0;
    int numlines = 0;
    size_t buffer_increment = 64 * sizeof(char *); // initial guess
    numlines_allocated = buffer_increment;

    printf("allocating %ld bytes\n", numlines_allocated);

    lines = malloc(numlines_allocated);
    ptr = lines;

    while((numchars = getline(ptr, &maxbytes, file)) != -1)
    {
        ptr++; numlines++;

        /*
            Though we passed 0 to getline after the call
            it will be set the number of bytes it allocated.
            The value set appears to be powers of 2.
        */
        maxbytes = 0;

        if(numlines > (numlines_allocated/sizeof(char *)))
        {
            puts("allocating more buffer");
            lines = realloc(lines, numlines_allocated + buffer_increment);
            if(lines == NULL)
            {
                perror("realloc");
                return -1;
            }
            numlines_allocated += buffer_increment;
            ptr = lines+numlines;
        }

    }

    // we know to stop by setting the last string pointer to null
    *(ptr) = 0;

    // resize the array to the number of lines read + 1
    lines = realloc(lines, sizeof(char *)*(numlines+1));

    return numlines;
}

void
print_lines(char **strings)
{
    char **ptr;
    int count = 1;
    for(ptr = strings; *ptr != NULL; ptr++)
    {
        printf("%3d %s", count++, *ptr);
    }
    puts("");
}

void
free_lines(char **lines)
{
    for(char **ptr = lines; *ptr != NULL; ptr++)
    {
        free(*ptr);
    }
    free(lines);
}

int
main(int argc, char *argv[])
{
    char *filename;
    long filesize, numlines;
    int err;
    if(argc != 2)
    {
        fprintf(stderr, "usage: %s filename\n", argv[0]);
        return 1;
    }

    filename = argv[1];
    FILE *file = fopen(filename, "r");
    if(file == NULL)
    {
        perror("fopen: ");
        return 2;
    }

    err = fseek(file, 0, SEEK_END);
    if(err)
    {
        perror("fseek: ");
        return err;
    }

    filesize = ftell(file);
    if(filesize == -1L)
    {
        perror("ftell: ");
        return -1;
    }

    printf("filesize is %ld bytes\n", filesize);

    rewind(file);

    numlines = read_lines(file, filesize);
    print_lines(lines);
    free_lines(lines);

    printf("file is %ld lines long\n", numlines);

    fclose(file);

    return 0;
}
{{< / highlight >}}

# Example Makefile

Here is the makefile I used for the program above named `file2strings.c`.

{{< highlight make >}}
file2strings: main.c
        gcc -g -O0 -Wall -Werror -o file2strings file2strings.c

clean:
        rm file2strings
{{< / highlight >}}