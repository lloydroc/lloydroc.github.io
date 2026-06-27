---
categories:
  - c
  - unix
date: "2022-11-29"
title: Understanding Process Execution
---

# {{< title >}}

In this post we will dive in to command execution from inside a program. The ability to execute commands from inside a program to obtain their output and exit code is very common for automation and testing use cases. Unfortunately, due to how Operating Systems work it is not a simple process to obtain the output and exit code from a running program.

{{< figure src="/assets/png/remote-process-execution.png" title="Remote Process Execution">}}

Take for an example a program that from within we execute a command and capture the output in real time, as well as, capture the exit code once the program ends.

If you've ever stared at the console output of a Jenkins job running a shell script it should be familiar what I'm describing.

In this post I'll unravel some of the complexities and trade-offs when executing a command from a program. As usual I have an example in the C Programming language.

# Table of Contents

{{< toc >}}

## Example Program requirements

Her will be our build requirements:
* Ability to pass into the program the command to be executed
* Print the command's near real time output as our program awaits
* Capture the exit code when the program ends
* Specify a timeout in the event the command hangs
* Take into account efficiency and performances

The above requirements are the bare-minimum for a nice solution. There are shortcuts where we either fire off a command and don't obtain the output or get the output but don't obtain the command's exit code.

Note, on the near-real time output requirement. This doesn't mean we wait until the program has finished executing and we print all the output it created. This means the calling process is continually waiting for output from the command and when it is obtained it will be printed to the standard output.

## We have two possibilities in Unix

Unix gives us really two options: [system](https://man7.org/linux/man-pages/man3/system.3.html) and [exec](https://man7.org/linux/man-pages/man3/exec.3.html) calls. Let's first eliminate why the [system]() call cannot meet the requirements. Then we'll go into why the `exec` family of functions makes things complicated.

### The `system` command is limited and slow

The [system](https://man7.org/linux/man-pages/man3/system.3.html) helper function will "execute a shell command". However, we don't have a way to capture any of the output this command provided. We can only capture the return code, that may or may not be sufficient.

Since the `system` command executes from a shell it has to first fork a process for a shell, then fork another process to execute the command inside this shell. Two forks ... that's slow ... we don't need an entire shell to execute this command so it's one fork too many. However, in some cases some of the behavior inherited from this command maybe desired.

### The Unix `exec` family of commands have complexities

Now, that I've hopefully convinced you that the `system` command is a no-go above let's look at the [exec](https://man7.org/linux/man-pages/man3/exec.3.html) family of functions.

Here in lies the challenge:

*The exec() family of functions replaces the current process image with a new process image.*

This means if you call `exec` your current process is replaced and there is no coming back. After the `exec` call it's done.

Because `exec` replaces our process image we must [fork](https://man7.org/linux/man-pages/man2/fork.2.html) a child to execute our command for us.

But after we `fork` the parent and child process need to communicate. The parent and child can communicate using file descriptors with a call to [pipe](https://man7.org/linux/man-pages/man2/pipe.2.html). Using the [dup](https://man7.org/linux/man-pages/man2/dup.2.html) system call we can wire the child process' `stdout` and `stderr` to the write end of the pipe and the parent processes `stdin` to the read end of the pipe.

We can then use [select](https://man7.org/linux/man-pages/man2/select.2.html) to asynchronously poll for output.

One last problem will arise ... how do we know when the process is finished? The most elegant way I've found is to wait for the child process to send the parent process a `SIGCHLD`. Fortunately, the [pselect](https://man7.org/linux/man-pages/man3/pselect.3p.html) call will allow us to not only poll for file descriptors but also signals.

Wow! That is A LOT just to run a process. I will submit to you any other programing language will also have to submit to this same complexity assuming that Unix is the operating system that is running.

## Code Example

Here is a code example demonstrating our example program.

### Usage

Here is how the command can be used once compiled. Simply compile with `gcc -o example example.c`.

{{< highlight bash >}}
$ ./example /bin/ls $PWD
stdout: (bettersystem
config.h
config.h.in
main.c
main.o
Makefile
Makefile.am
Makefile.in
stamp-h1
test
test.c
test.o
test.sh
)
SIGCHLD caught
got signal
waiting on pid

normal exit
child exited with code 0
{{< /highlight >}}

### Source Code 

Here is the source.

{{< highlight c >}}
#include <errno.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
#include <sys/wait.h>
#include <sys/select.h>
#include <sys/types.h>

static void
signal_handler(int sig)
{
  if(sig == SIGCHLD)
    printf("SIGCHLD caught\n");
  if(sig == SIGINT)
    printf("SIGINT caught\n");
}

void
signal_handler_install()
{
  if (signal(SIGCHLD, signal_handler) == SIG_ERR)
    perror("installing SIGINT signal handler");
}

void
system_better_exec(const char *pathname, char *const argv[], const int pairfd[], const int pairfderr[])
{
  dup2(pairfd[0], STDIN_FILENO);

  // connect stdout, stderr to the write end of the pipe
  dup2(pairfd[1], STDOUT_FILENO);
  dup2(pairfderr[1], STDERR_FILENO);

  if(execv(pathname, argv) == -1)
  {
    perror("execv error");
    _exit(127); /* something wrong happened such as pathname doesn't exist */
  }
}

int
system_better_poll(pid_t pid, const int fdout, const int fderr)
{
  char outbuf[4096];
  ssize_t bytes_read, bytes_read_err;

  fd_set rfds;
  struct timespec tv;
  int retval, retwait, wait_status;

  /* Watch stdin (fd 0) to see when it has input. */

  FD_ZERO(&rfds);
  FD_SET(fdout, &rfds);
  FD_SET(fderr, &rfds);

  /*sigset_t sig_set;
  sigemptyset(&sig_set);
  sigaddset(&sig_set, SIGCHLD);*/

  struct sigaction sa;
  sigset_t blockset, allowset;

  sigemptyset(&blockset);
  sigaddset(&blockset, SIGINT);
  sigaddset(&blockset, SIGCHLD);
  sigprocmask(SIG_BLOCK, &blockset, NULL);

  sa.sa_handler = signal_handler;
  sa.sa_flags = 0;
	sa.sa_mask = blockset;
  sigaction(SIGINT, &sa, NULL);
  sigaction(SIGCHLD, &sa, NULL);

  sigfillset(&allowset);
  sigdelset(&allowset, SIGINT);
  sigdelset(&allowset, SIGCHLD);

  tv.tv_sec = 5;
  tv.tv_nsec = 0;

  bool got_sig = false;

  while(got_sig == false)
  {
    retval = pselect(fderr+1, &rfds, NULL, NULL, &tv, &allowset);
    if(retval == -1)
    {
      if(errno == EINTR)
      {
        puts("got signal");
        got_sig = true;
      }
      else
      {
        perror("select failed");
        return -1;
      }
    }
    else if(retval == 0)
    {
      puts("timeout expired");
    }

    if(FD_ISSET(fdout, &rfds))
    {
      FD_CLR(fdout, &rfds);
      bytes_read = read(fdout, outbuf, sizeof(outbuf));
      outbuf[bytes_read] = '\0';
      printf("stdout: (%s)\n", outbuf);
    }

    if(FD_ISSET(fderr, &rfds))
    {
      FD_CLR(fderr, &rfds);
      bytes_read_err = read(fderr, outbuf, sizeof(outbuf));
      outbuf[bytes_read_err] = '\0';
      printf("stderr: (%s)\n", outbuf);
    }
  }

  puts("waiting on pid\n");
  retwait = waitpid(pid, &wait_status, 0);

  if(retwait == -1)
  {
    perror("waitid failed");
    return -1;
  }

  // TODO check retwait == pid
  if(WIFEXITED(wait_status) == true) /* a normal exit */
  {
    puts("normal exit");
    return WEXITSTATUS(wait_status); // return code of system command
  }
  /* we should check for signal and core dump exists*/

  printf("exit status 2 is %d\n", WEXITSTATUS(wait_status));
  return retwait;
}

int
system_better(char *const args[])
{

  int pairfd[2], pairfderr[2];
  pid_t pid;
  int exit_code;

  /*
    after pipe call the
    - pairfd[0] will be the read end of the pipe
    - pairfd[1] will be the write end of the pipe
  */
  if(pipe(pairfd) == -1)
  {
    perror("pipe failed");
    return EXIT_FAILURE;
  }

  if(pipe(pairfderr) == -1)
  {
    perror("pipe failed");
    return EXIT_FAILURE;
  }

  pid = fork();
  switch(pid)
  {
    case -1:
      perror("fork failed");
      exit(EXIT_FAILURE);
    case 0: /* child process*/
      system_better_exec(args[0], args, pairfd, pairfderr);
      break;
    default: /* parent process where pid = child's pid */
      exit_code = system_better_poll(pid, pairfd[0], pairfderr[0]);
      printf("child exited with code %d\n", exit_code);
  }
  return exit_code;
}

int
main(int argc, char *argv[])
{
  char *argv2[argc];
  const char *command = NULL;
  int command_exit_code;

  if(argc < 2)
  {
    fprintf(stderr, "usage %s <command> [command args ...]\n", argv[0]);
    return EXIT_FAILURE;
  }

  // TODO we copy the command in two spots, not needed
  memcpy(argv2, argv+1, (argc-1)*sizeof(char*));
  argv2[argc-1] = 0;

  command_exit_code = system_better(argv2);

  return EXIT_SUCCESS;
}
{{< /highlight >}}


## Unix System Call References

* [PSELECT[3p]](https://man7.org/linux/man-pages/man3/pselect.3p.html)
* [PIPE(2)](https://man7.org/linux/man-pages/man2/pipe.2.html)
* [DUP(2)](https://man7.org/linux/man-pages/man2/dup.2.html)
* [FORK(2)](https://man7.org/linux/man-pages/man2/fork.2.html)
* [EXEC(3)](https://man7.org/linux/man-pages/man3/exec.3.html)
* [SYSTEM(3)](https://man7.org/linux/man-pages/man3/system.3.html)