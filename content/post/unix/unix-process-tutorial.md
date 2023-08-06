---
title: Unix Process Tutorial
date: "2020-11-28"
categories:
 - unix
---

# {{< title >}}

In this blog post I'll go over a quick tutorial on Unix Processes. We'll start with some theory and then go into some real world examples. It's meant to be quick, to the point, and provide the necessary information to have a good understanding about how Unix Processes are designed.

# SSH'ing into a Unix Machine

Let's start with a common scenario. This scenario is to simply `ssh` into another Unix machine. From a Unix process perspective what happens?

{{< highlight bash >}}
$ ssh lloydrochester.com
Last login: Sun Nov 29 16:15:19 2020 from 174.27.249.252
lloydrochester.com$ who
lloydroc pts/0        2020-11-29 17:17 (174.27.249.252)
{{< / highlight >}}

* A successful login will start a *session* which all processes will be a part of.
* The shell will establish a *controlling terminal*. The user can provide input through STDIN to processes for commands.
* When commands are run from the shell they will be put into *process groups*. Only one process in a process group will be the *leader*.
* Only one process group will be running in the foreground. Only the foreground process group is granted the controlling terminal.
* Optionally, more *process groups* can be run in the background.

# Brief Theory on Unix Processes

A *process* will have an ID (pid), a parent process ID (ppid), and a process group ID (pgid).

A process group is a collection of processes and has a pgid, a session ID (sid) to which it belongs, and will be running in the foreground or background. A single process in the process group will be the process group leader. The process group leader has the same process (pid) as the (pgid).

The session is a collection of multiple process groups. One of the process groups will be the session leader.

The controlling terminal is established for the session and is granted to the foreground process group. This ensures that only the foreground process group can read from standard input and progress groups in the background are prohibited access.

As a side note, signals can be sent to an individual process or the process group as a whole. This depends on the signal itself.

Attributes of a Process:
* Process ID
* Parent Process ID
* Process Group ID
* Session ID

Attributes of a Process Group:
* Foreground of Background
* Session ID
* The process group leader is the process where with PGID=PID

Attributes of a Session
* Controlling Terminal
* The session leader is the process where the SID=PID

# Example 1 - A Command runs as a Process

The `$$` in a shell is the process ID of the current shell. Let's first examine the shell process.

{{< highlight shell >}}
$  ps -p $$ -o "pid ppid pgid sid command"
    PID    PPID    PGID     SID COMMAND
2948273 2948272 2948273 2948273 -zsh
{{< / highlight >}}

From this we can see that the shell `zsh` has PID=SID=PGID. Thus, this shell is the session leader and is the process group leader. As for the parent process of the shell:

{{< highlight shell >}}
$ ps -p 2948272 -o "pid ppid pgid sid command"
    PID    PPID    PGID     SID COMMAND
2948272 2948270 2948270 2948270 sshd: lloydroc@pts/0
{{< / highlight >}}

Now let's run a process in the background with the `&` operator.

{{< highlight shell >}}
$ sleep 30 &
[1] 2948815
$ ps -p 2948815 -o "pid ppid pgid sid command"
    PID    PPID    PGID     SID COMMAND
2948815 2948273 2948815 2948273 sleep 30
{{< / highlight >}}

Notice the `sleep` command has the PPID of the `shell`. Also, notice it is running in a different PGID and it is the leader of this process group because the PID=PGID.

Let's look at everything under the shell process:

{{< highlight shell >}}
$ pstree 2948273
zsh─┬─pstree
    └─sleep
{{< / highlight >}}

We have only two processes running under the shell: the `pstree` itself and the `sleep` command.

# Example 2 - Examine the NGINX Process

Let's look at `nginx` processes. The `nginx` process is a popular web server which has a master and worker process running on my machine. This process is running as a daemon under the `http` user.

{{< highlight shell >}}
$ pidof nginx
2465659 2465658
$ ps -p 2465658 -o "pid ppid pgid sid user command tty"
    PID    PPID    PGID     SID USER     COMMAND                     TT
2465658       1 2465658 2465658 root     nginx: master process /usr/ ?
$ ps -p 2465659 -o "pid ppid pgid sid user command tty"
    PID    PPID    PGID     SID USER     COMMAND                     TT
2465659 2465658 2465658 2465658 http     nginx: worker process       ?
$ pstree -p 2465658
nginx(2465658)───nginx(2465659)
{{< / highlight >}}

We can see that the two processes have no `tty` as they are daemons. The worker is in the same process group and session as the master. The master is the session and process group leader. The worker process is a child of the master process.

# Example 3 - Examine the Postfix Process

Let's look at `postfix` a mail server.

{{< highlight bash >}}
$ pidof /usr/lib/postfix/bin/master
2706371
$ pstree -p 2706371
master(2706371)─┬─anvil(2947817)
                ├─pickup(2948209)
                ├─proxymap(2949292)
                ├─qmgr(2706373)
                ├─smtpd(2948645)
                ├─smtpd(2949291)
                ├─smtpd(2949293)
                └─tlsmgr(2706572)
$ ps -p 2706371 -o "pid ppid pgid sid user command"
    PID    PPID    PGID     SID USER     COMMAND
2706371       1 2706371 2706371 root     /usr/lib/postfix/bin/master -w
$ ps -p 2947817 -o "pid ppid pgid sid user command"
    PID    PPID    PGID     SID USER     COMMAND
2947817 2706371 2706371 2706371 postfix  anvil -l -t unix -u
$ ps -p 2948209 -o "pid ppid pgid sid user command"
    PID    PPID    PGID     SID USER     COMMAND
2948209 2706371 2706371 2706371 postfix  pickup -l -t unix -u
{{< / highlight >}}

We can see the master `postfix` process is running under the root user. The other child processes are running as different users in the same process group. These processes are in the same session.

# Example 4 - Commands piped together become Processes

Here we can see how the shell will split commands using the `|` operator into separate processes and in their own process group.

{{< highlight bash >}}
$ find $HOME -type f 2>/dev/null | xargs cat | sort | uniq > lotsoflines &
[3] 2949631 2949632 2949633 2949634
$ pstree -p 2949631
find(2949631)
$ ps -p 2949631 -o "pid ppid pgid sid user command"
    PID    PPID    PGID     SID USER     COMMAND
2949631 2948273 2949631 2948273 lloydroc find /home/lloydroc -type f
$ ps -p 2949632 -o "pid ppid pgid sid user command"
    PID    PPID    PGID     SID USER     COMMAND
2949632 2948273 2949631 2948273 lloydroc xargs cat
$ ps -p 2949633 -o "pid ppid pgid sid user command"
    PID    PPID    PGID     SID USER     COMMAND
2949633 2948273 2949631 2948273 lloydroc sort
$ ps -p 2949634 -o "pid ppid pgid sid user command"
    PID    PPID    PGID     SID USER     COMMAND
2949634 2948273 2949631 2948273 lloydroc uniq
{{< / highlight >}}

We have 4 commands split between `|`. We can see that each process is in the same PGID and SID. The first command is the leader of the process group.
