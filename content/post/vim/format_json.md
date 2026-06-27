---
title: VIM formatting JSON
comments: true
date: "2020-01-28T08:44:41Z"
categories: ["vim"]
aliases:
  - /vim/json/2020/01/28/vim_format_json.html
---

# {{< title >}}

Have you ever needed to format some gnarly JSON that is unreadable and/or too large to look through? It's super easy to format it with `vim`. We can use the popular `jq` tool - link at the end of this blog post.

## Simple Steps to format JSON in VIM

Here is an example with a file called `hello.json`.

* Open a file `vim hello.json`
* Open the file in VIM `vim hello.json`
* We can format with the command `:%!jq . -`
* Save the file `:wq`

## Explanation

All we need is the command `:%!jq . -`. Let's break this command down.

* `:` is to run a command
* `%` will operatate on the entire file.
* `!` will execute an external command
* `jq .` is the external command
* `-` is the contents of the buffer

Note that we use `%`. We could instead do a visual selection using `'<,'>`, or select lines in the file. In the video we use the command `jq "." -`, which is the same thing as `jq . -` it's just a little more simple to not type the extra quotes.

Below is a video in YouTube showing how it's done.

You can also watch the video on [YouTube](https://www.youtube.com/watch?v=CCTOZiJrY-A).

## Links

Here are some links to both `vim` and `jq`. Note, I use Neovim these days for a number of reasons, but any VIM will work.

* [jq Tool](https://stedolan.github.io/jq/)
* [NeoVim](https://neovim.io/)

## Side Note

We can use VIM and any external tool to format other types of files. I hope to post soon on how to format XML using the `xmllint` tool which can be done very easily by what is taught in this blog post.

