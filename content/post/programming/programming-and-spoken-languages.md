---
title: Number of Programming Languages
comments: true
date: "2018-09-21T09:14:48Z"
categories: ["programming"]
---

# {{ <title> }}

What are the similarities and differences between spoken languages and programming languages?

What are the effects of having a large number of programming languages?

When I mow the lawn or drive to work I often listen to Podcasts if I don't listen to audio books. I recently came across a Podcast [Freakonomics - Why Don’t We All Speak the Same Language? (Earth 2.0 Series)](http://freakonomics.com/podcast/why-dont-we-speak-language/) and being a programmer myself I related the discussion of human languages to programming languages. Here are the points from the Podcast relevant to this dicussion on human languages that I want to use to relate to my view on Programming Languages:

* There are 7,000 languages spoken on Earth Today
* Linguists predict 3,000 languages will go away in the next century
* The concept of *Linguistic Distance* on how similar languages are to one another
* The impact of *Linguistic Diversity*

### Number of Spoken Languages, Linguistic Distance and Linguistic Diversity

An estimate of 7,000 languages is a lot and a great number must be redundant, which is evident as 3,000 are going away in the next century. However, this still leaves 4,000 languages which is still a large number when you consider there are some 241 countries in the world today. When looking at a pair of languages or even families of languages there is the concept of a *Linguistic Distance*. This obviously can have many metrics but conceptually it is how similar a language is to another mathematically. Romantic Languages have closer distances to one another, however, the distance between a Romantic Language and say Mandarin Chinese is large. We'll soon relate this to programming languages. Hopefully, I was able to quickly make the point that there are a lot of languages and you get roughly the concept of *Linguistic Distance*.

The second concept introduced in this Freakonomics Podcast is that off *Linguistic Diversity* and for this think of the European Union in comparison to the United States. In the EU the *Linguistic Diversity* is high and the USA the diversity is low. The concept of *Linguistic Diversity* relates to the number of languages in a given area. Let's take an example of contractual agreements between Germany and Spain, and Germany and England. Because there is a language barrier between Germany and Spain, as well as Germany and England a contract has to be translated twice. The Podcast states that "linguistic diversity has a negative impact on economic growth. There’s also the roughly $40 billion a year we spend on “global language services” — primarily translation and interpretation. And another $50-plus billion a year spent learning other languages. There are obviously many reasons you might want to learn another language, but the primary driver seems to be economics".

### Differences between Spoken Languages and Programming Languages

Spoken Languages allow us to communicate with one another as well as serve many other purposes. Programming languages we can over simplify and say they instruct a computer to perform instructions. In a Spoken Language we don't have the concept of performance, although, people can communicate more efficiently in some languages and not in others it would be quite unlikely two people would learn a new language to communicate more quickly. This differs when you think of someone rewriting a Ruby Script in C to increase performance, it happens and isn't rare. Another notable difference is Programming Languages build on top of one another. TypeScript is transpiled into Javascript, scripting languages like PHP, Perl, and Python use C, nearly everything ultimately is translated to native assembly code. One of the starkest differences is that Programming Languages are very simple in comparison to any Spoken Languages. Spoken Languages have many structures, words with the same meaning, interpretations, meanings, etc ... Just think of English and how many ways you can describe something. Lastly, there are arguably more differences in how languages can describe things. To describe a tree in a spoken language most languages would have that covered, however, there maybe large differences between the spoken languages. Whereas, programming languages also can describe say an array in different ways, but, they are very limited in what and how efficiently they can describe them.


### Number of Programming Languages

We have around 7,000 spoken languages according to the Podcast, how many programming Languages are there? The Software Quality Company [Tiobe](https://www.tiobe.com/tiobe-index/) ranks 100 languages and there are likely 100 more that are not ranked putting us easily around 200. Googling around the internet 256 looks like a popular answer but answers range up well into the thousands. From my standpoint is easy to conclude that since people are the same, and computers are quite similar there is an over abundance of both spoken languages and programming languages. When you consider [Domain Specific Languages](https://en.wikipedia.org/wiki/Domain-specific_language) the number of programming languages can explode. As new modern languages come out, older languages die, my prediction is that DSL languages will be the tipping point in making more languages in the future. Where Spoken Languages will converge I would argue that Programming Languages will increase when you consider DSL languages. This is all because programming languages can build on top of other languages. Regardless, the purpose of this post isn't on the number of programming languages, but the comparison to spoken languages and the effects of having so many.

### Programming Language Distance and Diversity

There is certainly a way to quantify programming language distance; but a method to accurately quantify them would be difficult. Quantification would involve many different metrics such as typing, compiled or interpreted, keyword comparisons, and functional or Object Oriented to name some metrics. We can start to think about the differences of these languages as we know them. Take the top 5 Languages by [Tiobe](https://www.tiobe.com/tiobe-index/) which are 1) Java, 2) C, 3) Python, 4) C++ and 5) Visual Basic .NET. This list has both large language distances say Java in comparison to Python, and similarities for say C versus C++. As you work down the list however, the languages can start to be grouped into sets that have smaller diversity.

#### Object Oriented
* Java
* C#
* C++
* Swift

#### Scripted Languages
* Python
* Perl
* Bash
* Lua
* PHP

### The Problem with so many Programming Languages

General problems are solved in every programming language. A generic web server can be made in Golang, Java, C++, Javascript. Similarly, you can even more generically do math problems in every language. However, the hotter the technology the smaller the subset of languages that implement the technology. Python for example has arguably a leading implementation of Machine Learning. To utilize these Machine Learning Algorithms in Lua they would have to wait, port the libraries from Python to Lua, or change the application from Lua to Python. This doesn't increase any efficiency to our community who has a large number of applications written in various languages. This causes the same effect as what high Language Diversity has on the Economy. Language interpretation and translation is counter effective. The overall Programming GDP - overall output of software solving problems - is reduced. To go from a new technology to convert to each programming language has minimal impact. Another downside is APIs that we have. Different APIs can be found in one language but not another, time wasted interpreting and translating these APIs to new once or learning them in a new language is wasted.

In summary:
* APIs become available in some languages but others have to wait for interpretation and translation. This takes time.
* In some cases software needs to be ported to a new language because of lack of good API support
* Having so many languages leads to wasteful "shopping around" to find the proper support and paradigm
* No one language fits all the needs of large applications today
* Combining applications written in different languages is rarely possible, which is giving rise to microservices


