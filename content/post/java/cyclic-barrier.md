---
title: Java Cyclic Barrier
categories: ["java"]
tags: ["concurrent", "thread"]
comments: true
date: "2019-02-25T08:00:00Z"
---

# {{< title >}}

Imagine a scenario where you have N threads and can only do something when M of them are ready. Java already has this built in since 1.5 with the [CyclicBarrier](https://docs.oracle.com/javase/10/docs/api/java/util/concurrent/CyclicBarrier.html#await(long,java.util.concurrent.TimeUnit)).

From the Javadoc we see the CyclicBarrier is *A synchronization aid that allows a set of threads to all wait for each other to reach a common barrier point. CyclicBarriers are useful in programs involving a fixed sized party of threads that must occasionally wait for each other. The barrier is called cyclic because it can be re-used after the waiting threads are released.*

Let's take an example:
1. We have an Alcoholic Bar that will only open if 4 drinkers are waiting for shots
2. Once the 4th person that is waiting at the bar arrives we open the bar
3. We want to print a message when the bar opens
4. Pay close attention to the 5th and 6th drinker

Let's jump right into the example. Here, we will create a Bar that serves alcohol, we'll create 6 drinkers with names and a shot of their choice. They will wait at the bar until the barrier condition of 4 waiting drinkers is met.

The implementation is as follows:
1. Drinkers are `java.util.concurrent.Callable` that return a Drinker Status.
2. The Bar itself is an `java.util.concurrent.ExecutorService` and Drinker `Callable`s are submitted to it returning `java.util.concurrent.Future`s.
3. In the call function of each Drinker we will await the `java.util.concurrent.CyclicBarrier` to be tripped.

Here we go. Let's create some `Callable`'s that will wait at a bar for their drink of choice. Only open the Bar doors for drinks where there are 4 drinkers.

{{< highlight java >}}
package examples;

import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class CyclicBarrierExample {

    public static void main(String[] args) {
        Integer minDrinkers = 4;
        AlcoholicBarOpen barOpen = new AlcoholicBarOpen();
        Party party = new Party(minDrinkers,barOpen);
        CyclicBarrier partyBarrier = party.getBarrier();

        // drinkers can go to the bar and their execution will start
        ExecutorService bar = Executors.newCachedThreadPool();

        // create the drinkers which are callables
        Drinker d1 = new Drinker("Jane","Everclear",partyBarrier);
        Drinker d2 = new Drinker("John","Pabst Blue Ribbon",partyBarrier);
        Drinker d3 = new Drinker("Anup","Blue Moon",partyBarrier);
        Drinker d4 = new Drinker("Vish","Fireball",partyBarrier);
        Drinker d5 = new Drinker("Lisa","Wild Turkey",partyBarrier);
        Drinker d6 = new Drinker("Mark","Laphroaig",partyBarrier);

        // a list of future drinkers who's execution will start asynchronously
        List<Future<DrinkerStatus>> futureDrinkers = new LinkedList<Future<DrinkerStatus>>();

        // convert callable drinkers into future drinkers
        futureDrinkers.add(bar.submit(d1));
        futureDrinkers.add(bar.submit(d2));
        futureDrinkers.add(bar.submit(d3));
        futureDrinkers.add(bar.submit(d4));
        futureDrinkers.add(bar.submit(d5));
        futureDrinkers.add(bar.submit(d6));

        // loop through the drinkers and wait for them to all be done
        for(Future<DrinkerStatus> futureDrinkerStatus: futureDrinkers) {
            try {
                System.out.println(futureDrinkerStatus.get());
            } catch (InterruptedException | ExecutionException e) {
                e.printStackTrace();
            }
        }

        try {
            boolean drinkersLeft = bar.awaitTermination(100, TimeUnit.MILLISECONDS);
            if(drinkersLeft == false) {
                System.err.println("We closed the bar with drinkers waiting");
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

}

// the class that will house the cyclic barrier
class Party {
    private CyclicBarrier barrier;
    public Party(int numPeople, Runnable partyStarted) {
        this.barrier = new CyclicBarrier(numPeople, partyStarted);
    }

    public CyclicBarrier getBarrier() {
        return barrier;
    }
}

// we will print a message when the bar opens
class AlcoholicBarOpen implements Runnable {
    @Override
    public void run() {
        System.out.println("Yay!! The bar is open.");
    }
}

// The Drinker callable that waits on the barrier for a drink or walks away
class Drinker implements Callable<DrinkerStatus> {
    private String name;
    private String drink;
    private CyclicBarrier barrier;

    public Drinker(String name, String drink, CyclicBarrier barrier) {
        this.name = name;
        this.drink = drink;
        this.barrier = barrier;
    }

    @Override
    public DrinkerStatus call() throws Exception {
        System.out.println(name + " is waiting at the bar door for a "+drink+" with "+this.barrier.getNumberWaiting()+" others");
        try {
            this.barrier.await(50, TimeUnit.MILLISECONDS);
            System.out.println(name + " can order a "+drink);
        } catch (InterruptedException | BrokenBarrierException e) {
            System.err.println(name+" abnormally left the party because of interruption, failure, or timeout. Barrier is broken.");
            return new DrinkerStatus(name,"walking away from the bar");
        } catch(TimeoutException e) {
            System.err.println(name + " waited too long and is going elsewhere for a drink. Others that are waiting are leaving");
            return new DrinkerStatus(name,"walking away from the bar");
        }
        return new DrinkerStatus(name,"drinking");
    }
}

// The result of the Drinker Callable where they can either be drinking or walking away
class DrinkerStatus {
    String name;
    String status;

    public DrinkerStatus(String name, String status) {
        super();
        this.name = name;
        this.status = status;
    }

    @Override
    public String toString() {
        return name + " is " + status;
    }
}
{{< / highlight >}}

The output of this example is as follows:
```
Jane is waiting at the bar door for a Everclear with 0 others
John is waiting at the bar door for a Pabst Blue Ribbon with 0 others
Anup is waiting at the bar door for a Blue Moon with 0 others
Vish is waiting at the bar door for a Fireball with 0 others
Mark is waiting at the bar door for a Laphroaig with 0 others
Lisa is waiting at the bar door for a Wild Turkey with 0 others
Yay!! The bar is open.
Lisa can order a Wild Turkey
John can order a Pabst Blue Ribbon
Vish can order a Fireball
Mark can order a Laphroaig
Anup waited too long and is going elsewhere for a drink. Others that are waiting are leaving
Jane abnormally left the party because of interruption, failure, or timeout. Barrier is broken.
Jane is walking away from the bar
John is drinking
Anup is walking away from the bar
Vish is drinking
Lisa is drinking
Mark is drinking
We closed the bar with drinkers waiting
```

Now, let's examine the output since there is more than meets the eye here.
1. We never got a good count of how many people were waiting on the cyclic barrier since all `Callable`s were called at once
2. The 4 Drinkers John, Vish, Lisa and Mark got past the cyclic barrier and started drinking
3. Anup waited to long and left the bar since there were only 6 people and we need multiples of 4 to trip the barrier
4. After Anup left the Bar and went elsewhere, Jane left too.
5. Jane and Anup didn't get into the Bar

So there are some details of the `CyclicBarrier` that may or may not be good for your application. Firstly, the barrier trips after N parties reach it. This N is set in the constructor. However, after the barrier is tripped we need to look further for ways to reset the barrier, create a new barrier in a thread safe manner or explore other means. This example works great for the 4 drinkers required to trip the barrier. But as you can see the complexity and ways to handle the 5th and 6th drinker become a bit unruly.
