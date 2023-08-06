---
title: Copy Paste with Neovim in WSL
comments: true
date: "2019-06-25"
lastmod: "2020-04-11"
categories:
 - vim
tags:
 - wsl
---

{{< figure src="/assets/svg/yank.svg">}}

# {{ <title> }}

Copy (Yank) and Paste doesn't work in [neovim](https://neovim.io/doc/user/provider.html) because it cannot access the System Clipboard on WSL - Windows Subsystem Linux. This simple small hack solves this issue. This hack works without having to install X Windows or any other tools.

**Update [Neovim Official Solution](https://github.com/neovim/neovim/wiki/FAQ#how-to-use-the-windows-clipboard-from-wsl)**. The solution posted in this blog post works, however, at the time there was no official solution. Now see the official solution using the `win32yank` binary. I honestly have not tried the solution posted herein for sometime as I no longer have WSL. There maybe a `neovim` clipboard provider that works and is built in. In the solution provided we create a pair of Unix scripts to act as that provider if you don't have the `win32yank` binary.

# Output from Neovim's Clipboard Help

If you run from `:help clipboard` in `neovim` you will see the following:

```
Nvim has no direct connection to the system clipboard. Instead it is
accessible through a |provider| which transparently uses shell commands for
communicating with the clipboard.

Clipboard access is implicitly enabled if any of the following clipboard tools
are found in your $PATH.

    xclip
    xsel (newer alternative to xsel)
    pbcopy/pbpaste (Mac OS X)
    lemonade (for SSH) https://github.com/pocke/lemonade
    doitclient (for SSH) http://www.chiark.greenend.org.uk/~sgtatham/doit/
```

Since we are running WSL let's eliminate `pbcopy` and `pbpaste` since they are options for OS X,  but `xsel` is an option we can use in WSL. To use `xsel` we would need the X Window System installed, but that's WAY more than we need here and overly complex. We will create our own script named `xsel` to without needing to install X Windows.

# The Script for Copy/Paste to work in NeoVim

Somewhere in your shell's `$PATH` create a new file called `xsel` with the following contents, it needs to have executable privileges. Use `chmod u+x xsel` command for this. The following script will make `nvim` think that we are using the system tool `xsel`, but we will override it's behavior. I recommend creating this in `$HOME/bin` directory. Ensure this is in your path with the `echo $PATH` command and you may have to create the `$HOME/bin` folder. Note, this should be added near the beginning in your `$PATH`, however, if you do end up installing a `xsel` say in `/usr/local/bin` or `/usr/bin` a different `xsel` could be called depending where it is in your `$PATH`.

## Our own `xsel` script

```
#!/bin/bash

# filename: xsel
# make sure this file has executable privileges
# neovim will paste "xsel -o -b"
# neovim will copy using "xsel --nodetach -i -b"

for i in "$@"
do
  case "$i" in
  -o )
    # for paste we will grab contents from powershell.exe
    # powershell.exe Get-Clipboard always adds an extra
    # line break so we will added sed with -z
    powershell.exe Get-Clipboard | sed 's/\r$//' | sed -z '$ s/\n$//'
    exit 0
    ;;
  -i )
    # for copy we'll direct stdin to clip.exe
    tee <&0 | clip.exe
    exit 0
  esac
done
```

Since `nvim` doesn't allow for adding external providers we will effectively alias `powershell.exe Get-Clipboard` to `xsel` for paste, and `tee <&0 | clip.exe` for copy. But this alone won't work for `nvim` to pull from the system clipboard. We also need to set our DISPLAY environment variable which is what X Windows uses. In your `~/.bashrc` if you use the bash shell or in your `~/.zshrc` file file if your are using zsh put the following:

```
# in your .bashrc or .zshrc set the DISPLAY variable
export DISPLAY=:0
```

After you've done this be sure to source the file with `source ~/.bashrc` or `source ~/.zshrc` so it will take effect.

# Testing our Copy/Paste Script for Neovim Works

To test that our script works first use your mouse to copy something with CTRL-C into the system clipboard. You can copy this sentence on this blog.

```
# first copy something on your screen with Ctrl-C

$ which xsel
/home/lloyd/bin/xsel # <- make sure this is the right path to the file we created above
$ echo $DISPLAY
:0
$ xsel -o
<you should see contents of something you copied output here>
$ xsel -i
type some stuff here then type Ctrl+D 2x, it will be in your system clipboard
$
```

Copy and Paste should now work in `nvim` if the above commands execute to what we've specified above.

Let's go into `nvim` and try it. Just open up `nvim` and do a `"+` you will see the contents of the system clipboard get pasted into the buffer. Now, write some more text in your buffer then copy the entire contents of the buffer to the system clipboard by doing a `:%y+"`. Then go somewhere in Windows and paste. You should see your entire buffer pasted in.

## Neovim Version output that was used

As of this post I was using the following:

```
$ nvim --version
                                                                                                                                                                                                                                                                   NVIM 0.1.7
Build type: None
Compilation: /usr/bin/cc -g -O2 -fdebug-prefix-map=/build/neovim-wew7PE/neovim-0.1.7=. -fstack-protector-strong -Wformat -Werror=format-security -Wdate-time -D_FORTIFY_SOURCE=2 -DDISABLE_LOG -Wconversion -U_FORTIFY_SOURCE -D_FORTIFY_SOURCE=1  -Wall -Wextra -
Compiled by pkg-vim-maintainers@lists.alioth.debian.org
                                                                                                                                                                                                                                                                   Optional features included (+) or not (-): +acl   +iconv    +jemalloc +tui
For differences from Vim, see :help vim-differences
                                                                                                                                                                                                                                                                      system vimrc file: "$VIM/sysinit.vim"
  fall-back for $VIM: "/usr/share/nvim"
$
```

Hit me up with comments at lloyd@lloydrochester.com if you have any suggested improvements.