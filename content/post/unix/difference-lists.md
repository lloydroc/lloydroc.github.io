---
title: Differences between lists in Unix
date: "2022-06-27"
categories:
 - unix
---

# {{< title >}}

{{< figure src="/assets/png/unix-comm-command.png" title="Unix comm command - Difference between two lists" >}}

Using the [comm(1)](https://man7.org/linux/man-pages/man1/comm.1.html) command in Unix we can output the difference between **sorted** lists. The `comm` command takes two sorted files as inputs and will output lines unique in `FILE1`, lines unique in `FILE2` and lines common to `FILE1` and `FILE2`. The `comm` command requires the files to be sorted.

# Examples

{{< highlight bash >}}
       comm -12 file1 file2
              Print only lines present in both file1 and file2.

       comm -3 file1 file2
              Print lines in file1 not in file2, and vice versa.
{{< / highlight >}}


# Example with Files

Let's see an example by creating two lists in file `a.txt` and file `b.txt`. Then use the `comm` command to output what is only in `a.txt`, in `b.txt` and in both `a.txt` and `b.txt` - the union between them.

Here is an example file named `a.txt` with contents:

{{< highlight bash >}}
$ cat a.txt
a
b
c
d
e
{{< / highlight >}}

Another file named `b.txt` with contents:

{{< highlight bash >}}
$ cat b.txt
a
c
d
e
f
g
{{< / highlight >}}

Using the `comm` command we can see the differences between the list in various ways:

{{< highlight bash >}}
$ comm a.txt b.txt
		a
b
		c
		d
		e
	f
	g
$ comm -1 a.txt b.txt
	a
	c
	d
	e
f
g
$ comm -2 a.txt b.txt
	a
b
	c
	d
	e
$ comm -3 a.txt b.txt
b
	f
	g
$ comm -12 a.txt b.txt
a
c
d
e
{{< / highlight >}}

Note, in the last example above we can mix the 3 options of `123` to get different outputs.

## Additional options

If available the `--check-order` option will fail if the inputs are not correctly ordered.