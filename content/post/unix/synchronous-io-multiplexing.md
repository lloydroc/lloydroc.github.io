---
categories:
 - unix
 - c
date: "2020-04-26"
title: I/O Multiplexing in Unix
---

# {{< title >}}

In Unix a process performs I/O on a single file descriptor at a time. When we talk about I/O on a file think `read()` and `write()` calls which are blocking. To get around blocking on a I/O call there are a number of ways. You can imagine how blocking on a single I/O call could bring the performance of a program to it's knees. In this post we'll quickly compare non-blocking I/O Models. Namely, `select()`, `poll()`, Signal Driven I/O, and `epoll()`.

If you're not familiar with I/O Multiplexing, stop reading right now and go look at some information on `select()`. I'd say it's the best to start with. If you want to read it right from the man pages do a `man 2 select`. This document has a good explanation and nice example at the end. By the end you'll know what I'm talking about.

## The Synchronous I/O Multiplexing Use Case

If you have a program and you need to read and write from a number of file descriptors without blocking you're essentially forced to use I/O multiplexing. Any one of these file descriptors could be *ready* at any time. If we had to wait on each one to be ready before we go to the next would be madness and incredibly slow.

By multiplexing we can essentially monitor sets of file descriptors that are ready for reading or writing at once. We can only process ones that are ready, and not have to wait on the others. A list of file descriptors we're *interested in* is maintained. After the call completes we can be sure I/O on at least one of the file descriptors will not block. This is what is meant by the term *Synchronous I/O Multiplexing*. It's synchronous in the sense that we have to wait until at least one of them is ready. It's multiplexed in the sense that we can monitor a list of file descriptors these function calls will return at least one that is ready for I/O.

## What are the common I/O Multiplexing methods in Unix?

* The `select()` function provides synchronous I/O Multiplexing
* The `poll()` function also provides synchronous I/O Multiplexing very similar to `select()`
* Signal Driven I/O will allow the kernel to notify a process about a ready file descriptor
* The `epoll()` function with provides an I/O event notification facility.

When I think these four I group `select()` and `poll()` into the same group, where *Signal Driven I/O* and `epoll()` are in classes of their own. Essentially, there are 3 classes, and some sub-classes I'll get into later.

## Summary Comparing Each Method

* `select()` and `poll()` are level-triggered and the slowest performance.
* `select()` and `poll()` are best used for simplicity and a small number (< 1024) of file descriptors
* `select()` and `poll()` have poor performance because they must pass the sets of file descriptors back and forth from the terminal each time, and the process must also continually manage the set.
* Signal-Driven I/O is edge-triggered and has better performance than `select()` and `poll()`
* Signal-Driven I/O allows the kernel to poll a file descriptor and send a signal `SIGIO` to a process when "I/O" is possible on a file descriptor.
* Signal-Driver I/O is edge-triggered needs consideration for signal-queues. Applications could hit limits causing signal-queue overflow.
* `epoll()` is the fastest of them all. It is for Linux (>2.6) only, not on BSD. It's performance is on-par with Signal-Driven I/O.
* `epoll()` permits usage of both edge-triggered and level-triggered notifications.

## Comparing `select()` and `poll()`

These two are very similar. You can create a set of file descriptors to monitor for reading and writing. The `select()` call monitors 3 sets: `readfds`, `writefds`, and `exceptfds`. It should be noted that `exceptfds` is not for "errors" but for "exceptional" conditions. The `poll()` call doesn't have 3 sets of file descriptors but a single set. Once, it's call returns we can look at the events that place on the sets of files. In these events there can be *normal*, *priority* and *high-priority* data. Although, *priority* isn't really supported, only *high-priority*. Also, on `poll()` we can have some exception events for terminal hangups, non-open file descriptors and so forth. These priorities are file and device specific. For example we need to consider if the file is a FIFO, pipe, socket, terminal, pseudo-terminal or normal file. Essentially, *normal* calls are blocking and *priority* calls are non-blocking.

In both of these functions the caller can specify a timeout and once the call returns the caller needs to check for the timeout condition. Also, the timeout value can specify forever.

Furthermore, when `select()` or `poll()` return we know an I/O call on a set of file descriptors wouldn't block, we don't know if the I/O call would transfer data. There is a slight distinction.

## The problem with `select()` and `poll()`

The main problem is back-and-forth from user space to the kernel space. Each time we make a call to `select()` and `poll()` they have to transfer the set of file descriptors to the kernel. The kernel doesn't "remember" the set each time it goes through what is passed. This takes time when we have a lot of file descriptors. Each time we loop we also need to initialize data structures for the file descriptors, and then analyze them after the calls return. This takes up valuable CPU time that scales with the number of file descriptors.

## Edge-Triggered versus Level-Triggered Notifications

Before we get into *Signal Driven I/O* and `epoll()` we need to define *edge-triggered* and *level-triggered* notifications. A great description of this is in `man 3 epoll`. I'll summarize their example in the man `epoll()` man page. Imagine we have a pipe, the writer of the pipe will notify the reader of the pipe when data is available. Suppose the writer puts 2k of data into the pipe and notifies the reader. Now suppose the reader pulls out 1k then stops. With *edge-triggered* the *edge* is when the writer put 2k of data in the pipe and notified the reader. With *level-triggered* the *level* is that there is data in the pipe. You can imagine here with edge-driven we can get into situations where the reader is starved. Here the reader took 1k out, but another 1k is left. It will not get notified again with edge-triggered. Which one is used depends highly on the application.

## Signal-Driven I/O

I tend to like this method since it's simple and clean. It can provide better performance than `select()` and `poll()`. Essentially, we can have the kernel send us a signal when a file descriptor is ready using the `SIGIO` signal. The kernel does most the work, and the code can be small and concise. We can do this by using the `fnctl()` and passing `F_SETOWN` to tell the kernel a process owns the file descriptor. This I/O method is *edge-triggered*. This is where the squeeze is, you may have to handle a queue of signals and deal with the limit of queued signals. The other disadvantage is you don't get much flexibility with how you monitor the file descriptors. All will depend on your application, the type of files your monitoring, and how many.

## The `epoll()` API

The `epoll()` API is built for a large number of file descriptors, it will allow for edge-triggered or level-triggered notifications. Remember `epoll()` is only for Linux 2.6 or later. It's not on BSD. Based on performance numbers I've seen it is hands down the fastest of all the multiplexed I/O methods.

When we call `epoll()` we get back a file descriptor that is a reference into the kernel's data structure. We declare an *interest list* of file descriptors and the kernel will maintain a *ready list* for multiplexing. The *ready list* is always a subset of the *interest list*. Through a bit mask the caller can tell the kernel the interest list, and the kernel will keep track of it. The bit mask for interest corresponds to `poll()` with some differences. For example if we're interested when a file is ready for reading we can specify this through the bit mask. The main difference on the bit mask for `epoll()` is only the notion of *normal* and *high-prioity*, whereas, *priority* isn't present.

Since the kernel maintains the list of file descriptors there isn't a need to pass it back and forth on each call. This is one of the main reasons that `epoll()` has better performance than `select()` and `poll()`.

## See Also

I didn't mention in here `ppoll()` or `pselect()` which are Posix Compliant.

## Where to go from here?

Hopefully, this post was short and sweet. I didn't want to go into all the detail and write a novel. Go get *The Linux Programming Interface* by Michael Kerrisk and you'll get code examples, performance metrics and much more detail than my short overview. There are plenty of examples elsewhere on usage and code samples. What isn't there is a comparison between them.

