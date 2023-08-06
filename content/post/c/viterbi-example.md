---
title: Viterbi Example
categories:
 - c
tags:
 - signal-processing
math: true
date: "2020-05-01"
---

# {{ <title> }}

Here we go! In this post I'm going to go through how Viterbi Decoders work. There is a lot to cover since we need to touch on Convolutional Coding, State Machines, Trellis Diagrams, Hamming Distances and Trellis Diagrams. I'll illustrate this with the absolute simplest example possible and walk you through every step of the way. I highly recommending taking out a pencil and paper for this.

# What is Viterbi Decoding?

Viterbi Decoding allows us to detect and correct errors that were transmitted through a noisy channel.

We want to send a message. To do this we have a transmitter and receiver. However, in between the transmitter and receiver we have a noisy channel where the message can be garbled. Transmit power coupled with noise can make the signals so faint that the receiver can think zeros are ones and vice-versa. Not to even mention interference.

Well how can we make this better? One way is when we transmit information we use previous information. Think about a shift register where what we transmit isn't just the current bit, but also formed from bits of previous samples. This is *Convolutional Encoding*. This helps us a lot since each time we receive now we have a portion of what came before. Since each time we receive something we have a little chunk that was sent before we can track this along the way to fix some errors. These smart decisions are made in what is called a Trellis Diagram and we will later explain soft and hard decisions to make it.

I like to think about a Viterbi Decoder the following way. If you have a finite state machine with 10-bits of input for example. This 10-bits is what we will be transmitting and is perfectly known. We will know the output of the state machine exactly, as well as, the state it will be in as we input a bit at a time. There is only set of inputs to produce that state machine's outputs. From this fact we should be able to guess the input from the output. A Viterbi Decoder guesses the output of a state machine and decodes that output to what that input was.

## What are we decoding, and how do we decode it?

The receiver will be receiving outputs from a *Convolutional Code*. These outputs map to the states of a state machine via generator functions which are simple *Boolean Polynomials*. We are guessing outputs of the Convolutional Code. From those outputs we can then guess what the state of the state machine is at a point in time. Once we have guesses for each point in time what state the state machine was in we can construct what inputs would have been given to the state machine. Once we have those inputs we've made the best guess of what was transmitted.

Let's break this down:
* We observe outputs from a Convolutional Code. We know the output could have some errors. These outputs are the inputs to our Viterbi Decoder and can be confused with the input to the Convolutional Encoder.
* From these outputs we can guess what state caused those outputs.
* From these states we can look from state-to-state what the transitions were
* From these state transitions we can guess the inputs that caused them
* From these inputs we can guess what was transmitted

It's a 3-step process:
* State Machine outputs are produced inputs to our Convolutional Encoder and generator functions
* State Machine states can be guessed by what the output was knowing the generator functions and the current state
* State Machine inputs can be guessed by looking at the state transitions

Why do we use the word *guess*? The main problem is that the state machine can have the same output for inputs depending on what state the state machine is in. So we have to guess based on what state we think we're in.

Wow! It's a lot of steps, yep, unfortunately it is convoluted! A lot of this is probably information overload so let's break it all down in the following sections.

# Boom! A Convolutional Code

Convolutional Codes model shift registers. The shift register has a memory depth `K`. This means we store the last `K` samples. For this example our shift register will hold \\(2\\) bits that can be either a  \\(0\\)  or a  \\(1\\) . Our shift register has a memory depth `K=2`. We store the current sample and one in the past.

{{< figure src="/assets/svg/simplest-convolutional-code.svg" title="Figure 1: A Simple Convolutional Code storing 2 bits with 2 bits of output for 1 bit of input" >}}

Convolutional codes are classified by 3 aspects:
* Input data rate \\( n \\)
* Output data rate \\( k \\)
* Constraint Length \\( K \\). How many inputs are stored.

For this code we have:
$$
\begin{bmatrix}
n & k & K \\\\
\end{bmatrix} =
\begin{bmatrix}
1 & 2 & 2
\end{bmatrix}
$$

There is a shorthand to this classification as well called the *base code rate* where it is in the form of \\( n / k \\). Here, we have a \\( 1 / 2 \\) base code rate since \\(1\\) input corresponds to \\(2\\) outputs.

## Generating the Convolutional Code

The Convolutional Code has so called generator functions. In this case our generator functions are \\( g_0 \\) and \\( g_1 \\). We can use some simple *Linear Algebra* to come up with the output matrix \\( y \\) from the input matrix \\( x \\) by using the 2x2 generator matrix.

$$
\begin{bmatrix}
y_0 \\\\
y_1 \\\\
\end{bmatrix} =
\begin{bmatrix}
g_{00} & g_{01} \\\\
g_{10} & g_{11} \\\\
\end{bmatrix}
\begin{bmatrix}
x_0 \\\\
x_1 \\\\
\end{bmatrix} =
\begin{bmatrix}
1 & 0 \\\\
0 & 1 \\\\
\end{bmatrix}
\begin{bmatrix}
x_0 \\\\
x_1 \\\\
\end{bmatrix}
$$

Breaking down this matrix multiplication it's about as simple as can be. The input directly corresponds to the output.

$$
y_0 = x_0
$$
$$
y_1 = x_1
$$

This representation is needed later for implementation. When we implement a convolutional code we need to handle the input, current state, and generator functions to produce the Convolutional Encoders output.

# The State Machine

From our Convolutional Code output \\( y \\) we can create a *Finite State Machine*. This state machine has \\(4\\) states:  \\(00\\) ,  \\(10\\) ,  \\(11\\) , and  \\(01\\) . These \\(4\\) states are shown inside the circles. For each input to the state machine it will transition to two other states. On each transition it will output two bits. For example if we're in state  \\(10\\)  and the input is  \\(1\\)  then the output is  \\(11\\) . This is represented by the `1/11`. Where in `X/YZ` the `X` is the input and `YZ` is the output of the state machine. Note that from each state we go to two other states, and each state has two state transitions coming into it. This comes in handy later.

{{< figure src="/assets/svg/convolutional-code-state-machine.svg" title="Figure 2: A Simple Convolutional Code shown as Mealy Finite State Machine" >}}

Regarding state machines we typically have a Moore or Mealy Machine. The Moore machine's output values are determined only by it's current state. Whereas the Mealy machine has output values determined by it's current state and current inputs. In our state machine the output is the current input and what state we're in, and thus a Mealy Machine.

We can sum up this state machine very concisely by saying that states are \\(2\\) bits. The output will be equal to the state being transitioned to and on state transitions only 1-bit can change at a time.

Lastly, notice this state machine naturally goes counter-clockwise. Instead of a counting order \\( 1,2,3,4 \\) we have an order \\( 0,2,3,1 \\).

# An Example

Let's get to a concrete example here.

For the **input** to our Convolutional Encoder we will have:

$$
1,1,0,1,1,0,0,1,0,0
$$

We will *pad* our input with a  \\(11\\)  at the beginning and a  \\(00\\)  at end end. Thus, we have 6-bits we're sending, and \\(2\\) start-bits and \\(2\\) stop bits. Our data bits will be in the middle: ```011001```.

From the input we will have the following **states**:

$$
10,11,01,10,11,01,00,10,01,00
$$

From those states and input we will have the following **outputs**. They are the SAME as above.

$$
10,11,01,10,11,01,00,10,01,00
$$

Since, our Convolutional Code is so nice and easy our outputs align perfectly with our states.

Now, we need to decode our outputs back to our inputs.

# The Trellis Diagram

The *Trellis Diagram* shows the path through the state machine. Notice, I re-ordered the states on the left of the Trellis Diagram since this state machine naturally goes counter-clockwise, so we put state  \\(01\\)  at the end.

Let's depict what is on this Trellis diagram below:
* The very left we have the states corresponding state machine (shift register) going at each point. For example state  \\(00\\)  is the top row and goes all the way across.
* Across the top of diagram we have the states that we observed at each time `t`. We received states  \\(10\\) ,  \\(11\\) ,  \\(01\\) , ... We also assume we start in state  \\(00\\)  and end in state  \\(00\\) .
* Across the bottom we have the state that we observe at each time t. We receive \\(9\\) outputs starting at time `t=0` going to time `t=9`.
* The arrows represent state transistions between states. The first transition is from state  \\(00\\)  to state  \\(10\\) . This transition is possible with an input of  \\(1\\)  and the output of the state machine is  \\(10\\) .

{{< figure src="/assets/svg/viterbi-trellis-paths.svg" title="Figure 3: The path through our Trellis Diagram" >}}

# We have some hard decisions to make!

Um,  Houston we have a problem. If we look at each state, it will transition to \\(2\\) other states. Well, what's the problem with that? Let's think about what we need to do. We're going to guess along the way what state the state machine is in. Each sample we'll transistion to another state.

When we get deep into our Trellis at \\(t>3\\) each state can transition to \\(2\\) other states. Later, we will need to consider these \\(8\\) transitions between states when we decode what was sent from our Convolutional Encoder.

{{< figure src="/assets/svg/viterbi-trellis-transitions.svg" title="Figure 4: The 8 transitions between states" >}}

We can also see these transitions numerically with the following table.

$$
\begin{split}
0/00 \Rightarrow 00\\\\
1/00 \Rightarrow 10\\\\
0/10 \Rightarrow 01\\\\
1/10 \Rightarrow 11\\\\
0/11 \Rightarrow 01\\\\
1/11 \Rightarrow 11\\\\
0/01 \Rightarrow 00\\\\
1/01 \Rightarrow 10
\end{split}
$$

Another way to look at the same thing. See below the \\(2\\) ways to transition into state  \\(00\\) :

$$
\begin{split}
0/00 \Rightarrow 00\\\\
0/01 \Rightarrow 00\\\\
\end{split}
$$

The two ways to transition into state  \\(10\\) :

$$
\begin{split}
1/00 \Rightarrow 10\\\\
1/01 \Rightarrow 10
\end{split}
$$

The two ways to transition into state  \\(11\\) :

$$
\begin{split}
1/10 \Rightarrow 11\\\\
1/11 \Rightarrow 11\\\\
\end{split}
$$

The two ways to transition into state  \\(01\\) :

$$
\begin{split}
0/10 \Rightarrow 01\\\\
0/11 \Rightarrow 01\\\\
\end{split}
$$

As we do computations to decode what was sent to the Convolutional Encoder these transitions, outputs from the transitions and comparision by what was received will all need to be taken into account.

# Paths through the Trellis

We have our start bits  \\(11\\) . We also know we'll be in the  \\(00\\)  state to begin with. Thus, when we receive  \\(10\\) ,  \\(01\\) , or hopefully  \\(11\\)  we know we will receive \\( 6 \\) bits followed by our stop bits  \\(00\\) .

At \\( t=2 \\) is when we receive our 6-bit sequence and we will be in state  \\(11\\) . We must be in state  \\(11\\)  when we send  \\(11\\)  as our start sequence.

{{< figure src="/assets/svg/viterbi-trellis-path-possibilities.svg" title="Figure 5: The Possible Paths through our Trellis Diagram" >}}

Notice when we get to \\( t=2 \\) we can go \\( 2 \\) ways. Then at \\( t=3 \\) we can go \\( 4 \\) ways, then at \\( t>3 \\) we can go \\( 8 \\) ways each time. For states at \\( t=3 \\) and \\( t>3 \\) we have \\( 4 \\) states. However, there is a distinction, at \\( t>3 \\) we can go \\( 8 \\) ways but those \\( 8 \\) ways must result in \\( 4 \\) states!

| Time | Possible Paths | Possible States |
|------|----------------|-----------------|
| 0    | 1              | 00              |
| 1    | 1              | 10              |
| 2    | 1              | 11              |
| 3    | 2              | 01,11           |
| 4    | 4              | 00,10,11,01     |
| 5    | 8              | 00,10,11,01     |
| 6    | 8              | 00,10,11,01     |
| 7    | 8              | 00,10,11,01     |
| 8    | 4              | 00,10,11,01     |
| 9    | 2              | 00,01           |
| 10   | 2              | 00              |

At \\(t=0\\) we receive our first start bit and transition to state  \\(10\\) , then at \\(t=1\\) we receive the second start bit and transition to state  \\(11\\) . At \\(t=3\\) we go from state  \\(01\\)  or  \\(11\\)  depending if we receive a  \\(0\\)  or a  \\(1\\)  when we receive our first start bit. By the time we reach \\(t=7\\) we receive our last of the \\(6\\) bits.

Since we send \\( 6 \\) bits we have \\( 2^6=64 \\) possible bit sequences. For each time \\(4\\) through \\(8\\) we have \\(8\\) paths, and at times \\(3\\) and \\(9\\) we have \\(4\\) paths each for a total of \\(64\\) paths total.

# Hamming Distance as a Metric

Before we go into metrics we need to discuss how we will compute a metric. The metric we will use is like Golf and the lower the score the better. We will use the **Hamming Distance** as our metric. It's as simple as possible and only counts the number of differences between the state machine outputs. Since our state machine can output two bits the maximum *Hamming Distance* can be \\(2\\). The best metric we can have is \\(0\\).

Here are some examples where \\(\\lVert a - b \\rVert\\) is the Hamming Distance between \\(a\\) and \\(b\\).

$$
\\lVert00-00\\rVert = 0
$$

$$
\\lVert00-11\\rVert = 2
$$

$$
\\lVert01-11\\rVert = 1
$$

$$
\\lVert11-11\\rVert = 0
$$

$$
\\lVert01-10\\rVert = 2
$$

# Path and Branch Metrics

With so many paths through the Trellis how do we chose the right one? The answer is metrics, and this is where the *Hamming Distance* comes in. The receiver gets the outputs from the Convolutional Encoder, we must go by these outputs to guess which one is closest to the state we're in. We're effectively trying all states the Convolutional Encoder could have been in by analyzing the distance between the receiver's state machine outputs and the outputs we received from the Convolutional Encoder.

Each state transition has a certain number of possible outputs depending how deep into the Trellis we are. Referring to **Figure 5**. For \\( t=2 \\) we have \\( 2 \\) state transitions and thus \\( 2 \\) outputs. Then, for \\(t=3\\) we have \\(4\\) outputs and for \\(t>3\\) we have \\(8\\) outputs. The number of computations can be crucial since this will be done on a computer with presumed limited resources.

## Path Metric

The **Path Metric** is a number that tells us how close an observed output is to an actual output. It's like Golf; the lower number the better and the number \\(0\\) is best. When we receive the output from the Convolutional Encoder we compute the metric using the output from each state transition.

| Time | Metrics to Compute |
|------|--------------------|
| 0    | 1                  |
| 1    | 1                  |
| 2    | 2                  |
| 3    | 4                  |
| 4    | 8                  |
| 5    | 8                  |
| 6    | 8                  |
| 7    | 8                  |
| 8    | 4                  |
| 9    | 2                  |
| 10   | 2                  |
| 11   | 1                  |

## Branch Metric

The **Branch Metric** is an accumulation of **Path Metrics**. The lower it is the better, and at the end if we have a **Branch Metric** that is \\(0\\) this means we have no bit-errors. The **Branch Metric** can tell us how many bit errors were corrected.

# Walking through the Trellis

We can now pull it all together and build an array that represents the path through the Trellis for the input we've received:

$$
10,11,01,10,11,01
$$

Note, this isn't the full \\(10\\) time samples but the first \\(7\\) time samples. This matrix is size \\(4\times7\\) where the rows represent our states  \\(00\\) ,  \\(10\\) ,  \\(11\\) , and  \\(01\\) . The columns represent the lowest accumulated *Branch Metric* into the state.

From this input we have the following matrix:

$$
\begin{bmatrix}
0 &     &     &     & 0+1 & \min(1+2,3+1) & \min(3+1, 1+2) \\\\
  & 0+0 &     &     & 0+0 & \min(1+1,3+1) & \min(3+2,1+2) \\\\
  &     & 0+0 & 0+1 & 1+1 & \min(0+0,2+0) & \min(2+1,0+1) \\\\
  &     &     & 0+0 & 1+2 & \min(2+1,0+1) & \min(2+1,0+0) \\\\
\end{bmatrix}
$$

Evaluating this matrix becomes.

$$
\begin{bmatrix}
0 &   &   &   & 1 & 3 & 3 \\\\
  & 0 &   &   & 0 & 2 & 3 \\\\
  &   & 0 & 1 & 2 & 0 & 1 \\\\
  &   &   & 0 & 3 & 1 & 0 \\\\
\end{bmatrix}
$$

Each column above we need to take the *Hamming Distance* between the observed states and the output between each of our possible states. The first two columns we receive a  \\(10\\)  and a  \\(11\\)  and we take the distance between state  \\(00\\)  with a  \\(1\\)  as input which is `1/10`. Next we would be in state  \\(10\\)  and receiving a  \\(1\\)  would yield `1/11`. However, we copy over the  \\(0\\)  from the previous column. Thus, the *Branch Metric* would return  \\(0\\)  each time. Had the received start bits contained errors the first \\(2\\) columns would accumulate those errors and be the value  \\(0\\) .

When we write values to the array we consider both the *Path Metric* and the *Branch Metric*. At each column we compute the *Path Metric* based on the *Hamming Distance* between input received and the output of the state machine transition. The *Path Metric* isn't enough as we need to carry over the *Branch Metric* from the state we are in. This is why the elements in the array are written as \\(b+p\\) since we have the first value \\(b\\) as the *Branch Metric* and the \\(p\\) as the *Path Metric*.

The third column is the first data bit which can be a  \\(0\\)  or a  \\(1\\) . Hence, we need to compute *Path Metrics* based on the two transitions we can have. Referring to *Figure 5* depicting \\(2\\) possible transitions at \\(t=3\\). We know we're in state  \\(11\\)  from the two start bits. From state  \\(11\\)  we can go to either state  \\(11\\)  or  \\(01\\)  depending if the input to the Convolutional Encoder was a  \\(0\\)  or a  \\(1\\) . If we're in state  \\(11\\)  and we receive a  \\(1\\)  the output is  \\(11\\)  and we take the *Hamming Distance* between  \\(11\\)  and  \\(11\\)  which is \\(0\\). Or, we could go to state  \\(01\\)  with output of  \\(01\\)  giving a *Hamming Distance* of \\(1\\). We write the values \\(0+0\\) to the array and \\(0+1\\) where the first \\(0\\) represents the previous *Branch Metric* and the second value is our computed *Path Metrics*.

When we get to the sixth column we now have \\(8\\) transitions referring to **Figure 5**. For these transitions we need not only to compute the *Path Metrics* for each but also carry forward the *Branch Metric*. Since we have to we need to take the \\(\min\\) between them and use the smallest one. This is also known as the **Compare and Set**. Since at each state we compare the **Path Metric** plus the **Branch Metric** and only take the smallest one.

# Decoding the Trellis

Now that we the Array representing the **Branch Metrics** through our Trellis we can decode it by taking the smallest *Branch Metric* at each column. The row this smallest value has corresponds to the state. It's can be visually seen above by looking below where \\(0\\) is.

$$
\begin{bmatrix}
0 &   &   &   & 1 & 3 & 3 \\\\
  & 0 &   &   & 0 & 2 & 3 \\\\
  &   & 0 & 1 & 2 & 0 & 1 \\\\
  &   &   & 0 & 3 & 1 & 0 \\\\
\end{bmatrix}
$$

We have rows 1,2,3,4,2,3,4 where the value is \\(0\\). This corresponds to states:

$$
00,10,11,01,10,11,01
$$

Now we need to decode the inputs that would cause these state transitions. For example to go from state  \\(00\\)  to state  \\(10\\)  a \\(1\\) was shifted in. To go from  \\(10\\)  to  \\(11\\)  another \\(1\\) was shifted in. We can follow along and know the input was:

$$
1,1,0,1,1,0
$$

This corresponds to the first part of the bit sequence of our example at the beginning of this post.
