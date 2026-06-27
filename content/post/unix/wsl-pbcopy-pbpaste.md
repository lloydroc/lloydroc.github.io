---
title: pbcopy/pbpaste in WSL
comments: true
date: "2019-07-30"
lastmod: "2020-04-11"
categories:
 - unix
tags:
 - wsl
aliases:
  - /wsl/windows/linux/pbcopy/pbpaste/2019/07/30/wsl-pbcopy-pbpaste.html
---

# {{< title >}}

If you're looking to replicate the pbcopy and pbpaste commands in WSL then you've found the right place! In this post we will make some simple shell scripts to replicate pbcopy and pbpaste in OS X. If you're accustomed to pbcopy/pbpaste in Mac OS X, it's hard to not have the equivalent in WSL. One spoiler alert the commands just are not as fast as they are in OS X.

{{< figure src="/assets/svg/pbcopy-pbpaste.svg" title="pbcopy and pbpaste commands in WSL" >}}

## Your PATH environment variable

The `PATH` environment variable can be confusing, but it's very simple. The variable provides directories for the shell to search for executables on your system. Since we are going to create commands for pbcopy and pbpaste we are going to have to make scripts for them. We are also going to have to put them in our `PATH` so that they can be run anywhere on the file system. Here is the way I do it.

{{< highlight bash >}}
$ mkdir ~/bin
$ export PATH=$HOME/bin:$PATH
{{< / highlight >}}

This simple blurb will create a directory in your home called `bin` and it will add `$HOME/bin` directory to your `PATH`. The syntax of `~` and `$HOME` are equivalent. We will be placing the pbcopy and pbpaste scripts we create in this `bin` directory.

## The pbcopy script for WSL

Open up WSL then open your favorite editor and create a file named `~/bin/pbcopy` in there put the contents:

{{< highlight bash >}}
#!/bin/bash
# the pbcopy script
tee <&0 | clip.exe
exit 0
{{< / highlight >}}

Then we need to do a `chmod u+x ~/bin/pbcopy` so this script is an executable. This command simply just let's the user, you in this case, execute it. We're good to go, let's now create the pbpaste script.

## The pbpaste script for WSL

Same deal as above. Open up WSL then in your favorite editor put the contents below into a file called `~/bin/pbpaste`.

{{< highlight bash >}}
#!/bin/bash
# the pbpaste script
powershell.exe Get-Clipboard | sed 's/\r$//' | sed -z '$ s/\n$//'
exit 0
{{< / highlight >}}

Now let's make the script executable by doing a `chmod u+x ~/bin/pbpaste`.

## Testing pbcopy and pbpaste in WSL

Now lets test `pbcopy` and `pbpaste` to make sure they work. Add the `$HOME/bin` to your path so that the system can find the pbcopy and pbpaste commands. I'm doing an export below assuming you don't add it to your `~/.bashrc` or `~/.zsrhrc`. These files should be edited so your `~/bin` is always on your PATH. For now we'll just add it manually when you start the WSL shell. If you don't do this when you type pbcopy and pbpaste it will say command not found. Adding to your `PATH` will allow those scripts to be found.

{{< highlight bash >}}
export PATH=$HOME/bin:$PATH
{{< / highlight >}}

Now open up a browser and copy something. Hell, copy from this blog post. Then go into that WSL window and type pbpaste then enter. You should see what you copied into your window pasted into the terminal.

Now let's use pbcopy to put something into your paste buffer. Do a `echo "hello world" | pbcopy`. Now go back into your browser and paste it somewhere. The pbcopy command will have added "hello world" to the system copy/paste buffer.


## Where to go from here?

Now when you open WSL the `pbcopy` and `pbpaste` scripts can be run anywhere from your system. These tools greatly increase efficiency and reduce copy and paste errors.

