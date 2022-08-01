---
categories:
  - c
tags:
  - thread
  - concurrent
date: "2019-08-12T14:30:06Z"
title: pthread barrier example
---

A Barrier in computing is a synchronization method where a group of threads cannot proceed until a condition allows the blocked threads to proceed. In this post we will construct an example of a Barrier that relates to men and women at the dinner table using pthreads. We will men waiting to get their food, but the men will be blocked until the woman has eaten, thus, trigger the start state of the Barrier. Ladies First!

For this example we will utilize the `pthread_cond_wait`, `pthread_cond_broadcast` library functions. These functions rely on a mutex.

## Barrier Pthread Example: Ladies First!

Let's outline the following scenario for our Barrier. Ladies are first so all the men must wait until the woman has eaten.

* We have 2 man pthreads and 1 woman pthread
* The men will wait until the woman has eaten. Implicitly, the men pthreads must start before the woman
* Once the woman has eaten the men are free to eat
* Men will eat and the program will end

### Relation of the Barrier Example in pthreads

A Barrier needs a means to synchronize. In `pthreads` the fundamental building block for synchronization is the mutex. We will use the mutex for our example. We will also use another tool in the pthread library called the condition variable.

#### Distinction between a pthread Mutex and Condition variable

The mutex in the pthread library allows a threads to synchronize by blocking. A mutex has the states of unlocked and locked, and only one thread should ever own the mutex in an unlocked state. The condition variable is a step further where it allows threads to synchronize value of data. Think of them as a one-to-many relationship. For a single mutex you could have multiple condition variables. For the purposes of this exercise we'll have one mutex which relates to a single condition variable. Having the same condition variable map to multiple mutex variables wouldn't be good. I'll quote the `pthread_cond_wait` man pages: "The effect of using more than one mutex for concurrent `pthread_cond_wait()` or `pthread_cond_timedwait()` operations on the same condition variable is undefined; that is, a condition variable becomes bound to a unique mutex when a thread waits on the condition variable, and this (dynamic) binding ends when the wait returns."

### Relating the Barrier Example to - Ladies First

In the *Ladies First Barrier Example* we have the following synchronization details:

* 2 pthreads for the men, 1 pthread for the woman
* The men pthreads will have to go first. More on why later.
* The men will wait on a condition variable called `men_can_go_now_cond`
* The woman, once done eating will broadcast to all men waiting on the condition variable
* Underlying this will be a mutex called `food_mutex`

## Ladies First Barrier Example in C using Pthreads

We've gotten a lot of background already, at this point let's get straight to our example in c using pthreads.

{{< highlight c >}}
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

void* woman_dinner(void *data);
void*   man_dinner(void *data);

pthread_mutex_t food_mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t men_can_go_now_cond = PTHREAD_COND_INITIALIZER;
int thread_ids[3] = {0,1,2};

int
main(int argc, char *argv[])
{
  pthread_t threads[3];

  pthread_create(&threads[1], NULL,   man_dinner, &thread_ids[1]);
  pthread_create(&threads[2], NULL,   man_dinner, &thread_ids[2]);

  // a condition so that by the time the woman thread starts
  // the men threads have already started and are waiting
  // on the condition
  sleep(1);
  pthread_create(&threads[0], NULL, woman_dinner, &thread_ids[0]);

  for(int i=0;i<3;i++)
  {
    pthread_join(threads[i], NULL);
    printf("thread %i joined\n",i);
  }

  return 0;
}

void* woman_dinner(void *data)
{
  int *id = (int *) data;

  printf("woman %d - letting the men eat - waiting on food mutex\n",*id);
  pthread_mutex_lock(&food_mutex);
  printf("woman %d - letting the men eat - got food mutex - broadcast\n",*id);
  pthread_cond_broadcast(&men_can_go_now_cond);
  printf("woman %d - unlocking mutex\n",*id);
  pthread_mutex_unlock(&food_mutex);
  printf("woman %d - unlocked mutex\n",*id);

  return NULL;
}

void* man_dinner(void *data)
{
  int *id = (int *) data;

  printf("man %d waiting on a woman - waiting on food mutex\n",*id);
  pthread_mutex_lock(&food_mutex);
  printf("man %d waiting on a woman - got food mutex - waiting on condition\n",*id);
  pthread_cond_wait(&men_can_go_now_cond,&food_mutex);
  printf("man %d eating - got condition - unlocking mutex\n",*id);
  pthread_mutex_unlock(&food_mutex);
  printf("man %d eating after the lady - mutex unlocked\n",*id);

  return NULL;
}
{{< / highlight >}}

When this program is run the following output was captured. These are pthreads so we cannot guarantee execution order can be different each time the program is run.

{{< highlight bash >}}
$ ./src/ladies_first
man 2 waiting on a woman - waiting on food mutex
man 2 waiting on a woman - got food mutex - waiting on condition
man 1 waiting on a woman - waiting on food mutex
man 1 waiting on a woman - got food mutex - waiting on condition
woman 0 - waiting on food mutex
woman 0 - letting the men eat - got food mutex - broadcast
woman 0 - unlocking mutex
man 2 eating - got condition - unlocking mutex
man 2 ate after the lady - mutex unlocked
man 1 eating - got condition - unlocking mutex
man 1 ate after the lady - mutex unlocked
woman 0 - unlocked mutex
thread 0 joined
thread 1 joined
thread 2 joined
{{< / highlight >}}

From the output above we can see the the 2 men pthreads will obtain the food mutex and then wait on the condition variable. The delay happens and then the woman comes in and locks food mutex right away. The woman thread then broadcasts out to all the men pthreads waiting on the food mutex and they get to eat. Pay some close attention to the mutex and how they are locked and unlocked.

### The Details of Ladies First Barrier example

The `pthread_cond_wait` will release the mutex!? Take the point where the men threads are waiting on the `pthread_cond_wait` function to return. This function MUST take a locked mutex AND a condition variable. After the woman thread calls `pthread_cond_broadcast` the `pthread_cond_wait` call from the men's threads will return with a released mutex. See the `pthread_cond_wait` man pages for more on this. Here is an excerpt from the man page: "These functions atomically release mutex and cause the calling thread to block on the condition variable cond; atomically here means atomically with respect to access by another thread to the mutex and then the condition variable"

Why must we have a call to `sleep`? This is because the `pthread_cond_wait` must be called with a locked mutex. This sleep ensures the two men threads call `pthread_cond_wait` with the mutex locked. The sleep avoids the situation where the `pthread_cond_broadcast` is called on an unlocked mutex. We probably could have a different way to do this, but didn't want to add more complexity to the example.

Perhaps a better way to justify the sleep is for a Barrier the group of threads blocked by the barrier should be waiting. Without the sleep we could have a situation where a man never hits the barrier since a woman could have unblocked the barrier before the man encounters the barrier.

## Where to go from here?

If this example is useful please say so in the comments below! This code could be much more robust by actually checking return codes from the pthread library calls which set the error number. A debugger can be used for this. The sleep call is crude, in a real world scenario we'd need to get rid of it.

The last part is we don't consider destroying our mutex and condition variable, this would be necessary.

### References

* [pthread_mutex_init](http://man7.org/linux/man-pages/man3/pthread_mutex_init.3p.html)
* [pthread_mutex_lock](http://man7.org/linux/man-pages/man3/pthread_mutex_lock.3p.html)
* [pthread_cond_broadcast](http://man7.org/linux/man-pages/man3/pthread_cond_broadcast.3p.html)
* [pthread_cond_wait](http://man7.org/linux/man-pages/man3/pthread_cond_timedwait.3p.html)
* [pthread_mutex_destroy](http://man7.org/linux/man-pages/man3/pthread_mutex_destroy.3p.html)
* [pthread_cond_destroy](http://man7.org/linux/man-pages/man3/pthread_cond_destroy.3p.html)

