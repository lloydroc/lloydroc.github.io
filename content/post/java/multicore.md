---
title: Java Multicore Example
categories: ["java"]
tags: ["concurrent", "thread"]
comments: true
date: "2019-02-24T14:57:00Z"
aliases:
  - /java/multicore/concurrency/2019/02/24/java-multicore.html
---

# {{< title >}}

Any program these days that does any significant computational load should utilize the available processor cores. In this post we'll show an example using Java where we schedule [Callables](https://docs.oracle.com/javase/10/docs/api/java/util/concurrent/Callable.html) on all available processor cores. In Java a Callable is task that returns a result and may throw an exception. It is very similar to a [Thread](https://docs.oracle.com/javase/10/docs/api/java/lang/Thread.html), but gives a much easier way to return the result asynchronous computation. I typically don't see many reasons to not use Callables over Threads, since even if you don't want or need to return the result you can still return some sort of status code. This blurb is directly from the Javadoc *The Callable interface is similar to Runnable, in that both are designed for classes whose instances are potentially executed by another thread. A Runnable, however, does not return a result and cannot throw a checked exception.*

To obtain a [Future](https://docs.oracle.com/javase/10/docs/api/java/util/concurrent/Future.html) in Java we need to submit the Callable to an [Executor Service](https://docs.oracle.com/javase/10/docs/api/java/util/concurrent/ExecutorService.html). A Future represents the result of an asynchronous computation. You have a reference to a future, it is working in the background. To block and wait until it is done call the get method. The process is pretty straightforward for divvying up tasks on multiple cores if you use the so called "Boss-Worker" Model. Where you break a computation down into different sub-computations, have workers work on each one, then collect and aggregate the result at the end.

I think of it in this way:
1. Define a unit of computation. This will be implemented in your class that implements the Callable Interface.
2. Create an Executor Service where the Callables can be submitted and Futures are returned.
3. Wait until all the Futures have completed and store the results from each of them
4. Combine all the results

This 4-step method allows unlocks the full potential of the processor and completes much faster than if we did the computational load on a single core and waited for the result. At the end of this we can look at some real results.

The devil is in all the details. For the Executor Service there are a number of types of thread pools that can be used. Here we'll use the modern [Work Stealing Pool](https://docs.oracle.com/javase/10/docs/api/java/util/concurrent/Executors.html#newWorkStealingPool()). Read along and with the comments it's pretty easy to follow.

{{< highlight java >}}
package examples;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Multicore Processor Example in Java to use all available processor cores
 * to average lists of random numbers.
 * Uses the Java 8's Executor service for a Work Stealing Pool to divvy the
 * work onto the available processor cores.
 * Example was run on a 8 Core 2.6 GHz Intel i7 with 16GB of 2133 LPDDR3
 * which takes around 14 seconds;
 */
public class MulticoreExample {

    public static void main(String[] args) throws InterruptedException, ExecutionException {

        int cores = Runtime.getRuntime().availableProcessors();
        int numWorkers = 100;
        System.out.println("Available processor cores is "+cores);

        Instant now = Instant.now(); // Start clock at now

        // Work Stealing Pool is new in Java 8
        //ExecutorService threadPool = Executors.newSingleThreadExecutor();
        ExecutorService threadPool = Executors.newWorkStealingPool();
        //ExecutorService threadPool = Executors.newFixedThreadPool(1);

        // Each future will have the average of the list of random doubles
        List<Future<Double>> futures = new LinkedList<Future<Double>>();

        // Populate the list of futures by submitting callables to the thread pool
        for(int i=0;i<numWorkers;i++) {
            futures.add(i,threadPool.submit(new Worker(i))); // non-blocking
        }

        Double avg = 0.0;
        for(int i=0;i<numWorkers;i++) {
            // Future::get() is a blocking call until the task is done
            // while we block (wait) on one task to finish the others are still working
            avg += futures.get(i).get();
        }
        System.out.println("Average is: "+avg/numWorkers);

        Duration d = Duration.between(now, Instant.now());
        System.out.println("Time Taken multi-core:  "+d); // Total time taken

        now = Instant.now();
        avg = 0.0;
        for(int i=0;i<numWorkers;i++) {
            Worker worker = new Worker(i);
            try {
                avg += worker.call();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        System.out.println("Average is: "+avg/numWorkers);
        d = Duration.between(now, Instant.now());
        System.out.println("Time Taken single core: "+d); // Total time taken
    }
}

/**
 *  Class represents a worker that is put onto an available processor
 *  to get an average of a list of doubles. In the example this represents
 *  the work that would be done concurrently.
 */
class Worker implements Callable<Double> {
    Integer workerId;

    /**
     * Size of the list of random numbers.
     * Need to find a "sweet spot" for the memory
     * your machine has for this to take a decent
     * amount of time and to be able to use memory
     * without hitting the disk.
     */
    Integer workSize = 2 << 19;
    List<Double> workList;

    // Constructor
    Worker(Integer id) {
        this.workerId = id;
        workList = new ArrayList<Double>();

        // Populate the array with random numbers
        for(int i=0;i<workSize;i++) {
            workList.add(i,Math.random());
        }
    }

    /**
     * The function that does the work. If you didn't want to
     * average random numbers, which I'm sure is the case
     * replace this with something meaningful.
     */
    @Override
    public Double call() throws Exception {
        Instant now = Instant.now();
        Double avg = 0.0;

        // A bit of a complex functional call that uses mutable reduction to get the average
        WorkerTask collect = workList.stream().collect(WorkerTask::new, WorkerTask::accept, WorkerTask::combine);

        // Compute the average
        avg = collect.average();

        Duration d = Duration.between(now, Instant.now());
        //System.out.println(String.format("Worker %d done with average %f on %d numbers in %s seconds",workerId,avg,collect.count,d.toString()));
        return avg;
    }
}

/**
 * Arguably more complex than it needs to be but this class
 * allows us to use mutable reduction to get the average of
 * all the numbers. It is essentially a class that stores a
 * total of all the numbers and a count of them since
 * total/count is the average. With one distinction is that
 * it has a combine method that will allow the
 * classes to be combined together for the mutable reduction.
 * The combine won't be called unless the collection of the
 * stream is done in parallel, which it isn't in this example.
 * See the line of workList.stream would need to be replaced
 * by workList.parallelStream.
 */
class WorkerTask {
    Double total = 0.0; // sum of every number given to the task
    Integer count = 0; // count of every number given

    // Simple average function
    public Double average() {
        return count > 0 ? total / (double) count : 0;
    }

    // Adds a number from the list
    public void accept(Double i) {
        total += i;
        count ++;
    }

    // Will combine with another of itself
    public void combine(WorkerTask other) {
        System.out.println("Combine Called");
        total += other.total;
        count += other.count;
    }
}

{{< / highlight >}}

The output of this program is as follows:

```
Available processor cores is 8
Time Taken multi-core:  PT8.551061S
Time Taken single core: PT15.523523S
```

The multicore code is around twice as fast as the single core. Why not 8x since we have 8 cores? That's a tougher question. We need to go back and analyze hits to the disk drive, total memory used, as well as, set-up and tear down time for the executor.

[Here](https://youtu.be/juahfpQQgIc) is a video where I go through all the code and give a more detailed explanation.


