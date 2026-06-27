---
title: Flex/Bison Autotools Project Creation
categories:
  - autotools
  - flex/bison
date: "2019-06-25T11:15:00Z"
aliases:
  - /c/autotools/flex-bison/2019/06/25/create-flex-bison-autotools-project.html
---

Let's create a basic Flex/Bison Project with Autotools. The GNU Documentation for Automake specifies [Flex/Bison Support](https://www.gnu.org/software/automake/manual/html_node/Yacc-and-Lex.html). We will take it a step further and provide a complete example with a Flex Scanner and Bison parser.

See the previous post [Autotools Project Create Template](/post/autotools/create-project/). This allows us to create a boilerplate Autotools project. Then we can add the Flex/Bison support on top of the basic autotools project.

Let's create a project called `fbbasic` with the Autotools Project Creation Template:

## Creating the Boilerplate Autotools Project

Let's use the `atprj` script and make a basic project. Again, this script was provided in the following [post](/post/autotools/create-project/).

```
$ atprj fbbasic
$ cd fbbasic
$ find .
./Makefile.am
./src
./src/Makefile.am
./src/main.c
./.gitignore
./autogen.sh
./configure.ac
./README
$
```

Now we have a basic project that has source of `main.c`, but we need to add our Flex and Bison Files and configure our `src/Makefile.am` and `configure.ac` accordingly.

## Modifying our configure.ac for Flex/Bison

We first have to modify our configure.ac file so that it checks for Flex and Bison. It's contents looks like this:

```
AC_INIT([fba], [1.0], [lloyd@lloydrochester.com])
AM_INIT_AUTOMAKE([-Wall -Werror foreign])
AC_PROG_CC
AC_PROG_YACC
AC_PROG_LEX
AC_CONFIG_HEADERS([config.h])
AC_CONFIG_FILES([Makefile src/Makefile])
AC_OUTPUT
```

We only added the lines `AC_PROG_YACC` and `AC_PROG_LEX`.

## Modifying the src/Makefile.am for Flex/Bison

We need to modify our src/Makefile.am to have Flex/Bison. Our Flex lexer will be named `scanner.l` and our Bison Parser will be named `parser.y`. The name of our binary will be called `fba` which is short for Flex/Bison Autotools. Here is the contents of this file:

```
# src/Makefile.am
BUILT_SOURCES = parser.h
bin_PROGRAMS = fba
fba_SOURCES = parser.y scanner.l
AM_YFLAGS = -d
```

## Simple Flex Scanner

Let's use a very basic scanner. We will just find numbers and tokenize them and send to our parser. We will accept whitespace but anything other than numbers and space will be an error.

```
%{
// filename: scanner.l
#include "parser.h"
#include <string.h>

extern void yyerror(const char * message);
extern int yylval;

%}

%option noyywrap

%%

[0-9]+ { yylval = atof(yytext); return NUM; }

" " { }
. { yyerror("invalid character"); }

%%
```

## Simple Bison Parser

Now the parse will just output when we get a line and that fact that we got a number. Here is it's contents:

```
%{

// filename: parser.y
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int yylex();
void yyerror(const char *s);

// gives good debug information
//int yydebug=1;

%}

%token NUM

%%

line: line expr1 '\n' { printf("here\n"); }
    | /* Empty production rule */
    ;

expr1: numb expr1
     | /* empty production rule */
     ;

numb: NUM { printf("got a number %d\n", $1); }

%%

int
main(int argc, char *argv[])
{
  printf("please enter some numbers:\n");
  yyparse();
  return EXIT_SUCCESS;
}

void
yyerror(const char *s)
{
  fprintf(stderr,"error %s\n",s);
}
```

## Building our Project

Once we modified our configure.ac, src/Makefile.am and added scanner.l and parser.y we can now build our project. Here we go:

```
$ ./autogen.sh
$ ./configure
checking for a BSD-compatible install... /usr/bin/install -c
checking whether build environment is sane... yes
checking for a thread-safe mkdir -p... /usr/bin/mkdir -p
checking for gawk... gawk
checking whether make sets $(MAKE)... yes
checking whether make supports nested variables... yes
checking for gcc... gcc
checking whether the C compiler works... yes
checking for C compiler default output file name... a.out
checking for suffix of executables...
checking whether we are cross compiling... no
checking for suffix of object files... o
checking whether we are using the GNU C compiler... yes
checking whether gcc accepts -g... yes
checking for gcc option to accept ISO C89... none needed
checking whether gcc understands -c and -o together... yes
checking whether make supports the include directive... yes (GNU style)
checking dependency style of gcc... gcc3
checking for bison... bison -y
checking for flex... flex
checking lex output file root... lex.yy
checking lex library... -lfl
checking whether yytext is a pointer... yes
checking that generated files are newer than configure... done
configure: creating ./config.status
config.status: creating Makefile
config.status: creating src/Makefile
config.status: creating config.h
config.status: executing depfiles commands
$ make
make  all-recursive
make[1]: Entering directory '/home/lloydroc/fbbasic'
Making all in src
make[2]: Entering directory '/home/lloydroc/fbbasic/src'
/bin/sh ../ylwrap parser.y y.tab.c parser.c y.tab.h `echo parser.c | sed -e s/cc$/hh/ -e s/cpp$/hpp/ -e s/cxx$/hxx/ -e s/c++$/h++/ -e s/c$/h/` y.output parser.output -- bison -y -d
updating parser.h
make  all-am
make[3]: Entering directory '/home/lloydroc/fbbasic/src'
gcc -DHAVE_CONFIG_H -I. -I..     -g -O2 -MT parser.o -MD -MP -MF .deps/parser.Tpo -c -o parser.o parser.c
mv -f .deps/parser.Tpo .deps/parser.Po
/bin/sh ../ylwrap scanner.l lex.yy.c scanner.c -- flex
gcc -DHAVE_CONFIG_H -I. -I..     -g -O2 -MT scanner.o -MD -MP -MF .deps/scanner.Tpo -c -o scanner.o scanner.c
mv -f .deps/scanner.Tpo .deps/scanner.Po
gcc  -g -O2   -o fba parser.o scanner.o
make[3]: Leaving directory '/home/lloydroc/fbbasic/src'
make[2]: Leaving directory '/home/lloydroc/fbbasic/src'
make[2]: Entering directory '/home/lloydroc/fbbasic'
make[2]: Leaving directory '/home/lloydroc/fbbasic'
make[1]: Leaving directory '/home/lloydroc/fbbasic'
```

In these steps we ran an `autogen.sh` then we did a `./configure` and finally a `make`. Notice in the `./configure` it checked for `flex` and `bison` and not `lex` and `yacc`. I believe if I didn't have `flex` and `bison` installed it would check for the older versions of `lex` and `yacc`.

## Running the Program

Now we can try out our program:

```
$ ./src/fba
please enter some numbers:
123432 23432 5322
got a number 123432
got a number 23432
got a number 5322

^C
$
```

There we go we have a working simple Autotools Project running with Flex and Bison!
