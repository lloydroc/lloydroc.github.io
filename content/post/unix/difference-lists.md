---
title: Differences between lists in Unix
date: "2022-06-27"
categories:
 - unix
---

Using the [comm(1)](https://man7.org/linux/man-pages/man1/comm.1.html) command in Unix we can see the difference between lists. The `comm` command takes two files as inputs and will output lines unique in `FILE1`, lines unique in `FILE2` and lines common to `FILE1` and `FILE2`. These difference comparisons are synonymous with taking the union between lists, and left or right joins between them. Note, for the `comm` command to work the lists need to be sorted.

# Example Comparison

Let's construe an example by creating two lists in `a.txt` and `b.txt` and show how the `comm` command can be used to find the differences in the lists.

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