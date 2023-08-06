---
title: Parse JSON with Flex and Bison
categories:
 - "flex/bison"
tags:
 - json
comments: true
date: "2020-02-22"
lastmod: "2020-04-15"
---

# {{< title >}}

A simple example that will parse JSON in C using Flex and Bison. Forewarning, while this example works well it's not going to handle every JSON case. I'll highlight the limitations of what cannot be parsed towards the end of the post. It's a perfect example to build upon and extend though.

# FLEX Scanner to Parse JSON

The scanner will create a token stream. Tokens are just regex matches made by flex that can also have values. For example a `DECIMAL` token we return a float by calling `atof(yytext)`. Whereas, we also tokenize `{` to `LCURLY`, but there is no value. The `ECHO` macro is turned off, and can be turned on for further debug info.

If we had the following JSON:

{{< highlight json >}}
{
  "number": 1.0
}
{{< / highlight >}}

Our FLEX scanner would have the following token stream `LCURLY`, `STRING number`, `COLON`, `DECIMAL 1.0`, `RBRAC`. Let's look at the source for the FLEX scanner.

{{< highlight c >}}
%{
// flex file: scanner.l
#include "parser.h"
#include <string.h>

extern void yyerror(const char * message);
#define ECHO fwrite( yytext, yyleng, 1, yyout )

%}

%option noyywrap
EXP ([Ee][-+]?[0-9]+)

%%

"{" { ECHO; return LCURLY; }
"}" { ECHO; return RCURLY; }
"[" { ECHO; return LBRAC; }
"]" { ECHO; return RBRAC; }
"," { ECHO; return COMMA; }
":" { ECHO; return COLON; }
"true" { ECHO; return VTRUE; }
"false" { ECHO; return VFALSE; }
"null" { ECHO; return VNULL; }
[ \t\r\n]+ { /* eat whitespace */ }
\"[^"]*\" { yylval.string = strdup(yytext); ECHO; return STRING; }
[1-9]+\.?[0-9]*{EXP}? { ECHO; yylval.decimal = atof(yytext); return DECIMAL; }

%%
{{< / highlight >}}

## Bison Parser for JSON

Below is a Bison Parser for JSON. There are no semantic actions for each grammar rule. You'd have to code add to the rules to make the example useful. The code just runs through `yyparse()` and will return a 0 exit code if successful.

For example the rule:

{{< highlight text >}}
member: STRING COLON value { // put c code here: $1 will be the JSON member, and $3 the value }
      ;
{{< / highlight >}}

For this grammar I consulted <a href="https://www.json.org">json.org</a>. On the main page the JSON grammar is provided. The form of this grammar is specified in <a href="https://www.crockford.com/mckeeman.html">McKeeman Form</a>. The McKeeman Form is clean and concise. However, the grammar we define in Bison is not exactly what as specified, but follows the major cases. One, difference is how whitespace is handled. Getting into converting a McKeeman Grammar to a grammar in Bison is more than I wanted to cover in this post.

Let's look at the Bison Parser Code.

{{< highlight c >}}
%{

// bison file: parser.y
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern int yylineno;
extern char* yytext;
int yylex();
void yyerror(const char *s);

// gives good debug information
int yydebug=1;

%}

%token LCURLY RCURLY LBRAC RBRAC COMMA COLON
%token VTRUE VFALSE VNULL
%token <string> STRING;
%token <decimal> DECIMAL;

%union {
  char *string;
  double decimal;
}

%start json

%%

json:
    | value
    ;

value: object
     | STRING
     | DECIMAL
     | array
     | VTRUE
     | VFALSE
     | VNULL
     ;

object: LCURLY RCURLY
      | LCURLY members RCURLY
      ;

members: member
       | members COMMA member
       ;

member: STRING COLON value
      ;

array: LBRAC RBRAC
     | LBRAC values RBRAC
     ;

values: value
      | values COMMA value
      ;

%%

void
yyerror(const char *s)
{
  fprintf(stderr,"error: %s on line %d\n", s, yylineno);
}
{{< / highlight >}}

## C Example function to Parse JSON

Let's pull it all together using our Flex Scanner and Bison Parser to parse JSON. We'll define a C file called `main.c` that will read from `STDIN` or a file if provided. There is a section below where we test this exampe, there, I just created some example JSON files.

{{< highlight c >}}
// c file: main.c
#include <stdio.h>
#include <stdlib.h>
#include "parser.h"

extern FILE* yyin;

int
main(int argc, char *argv[])
{
  // if a file is given read from it
  // otherwise we'll read from STDIN
  if(argc == 2)
  {
    if(!(yyin = fopen(argv[1],"r")))
    {
      perror(argv[1]);
      return EXIT_FAILURE;
    }
  }
  return yyparse();
}
{{< / highlight >}}

## Usage and Downloading

If you want to use it then simply download [parse_json](/code/parse_json-1.0.tar.gz). From there untar it and run:

{{< highlight bash >}}
$ tar xf parse_json-1.0.tar.gz
$ cd parse_json
$ ./configure
$ make
$ ./src/parse_json some_file.json
$ ./src/parse_json <enter in text or paste in, harder this way though>
{{< / highlight >}}

Note: Debugging is turned on so you'll see the parser state as it pushes and pops tokens on the stack. If you want turn it off then I guess you'll have to message me and I'll need to make another tarball. I used flex 2.6.4 and bison version 3.5 for this. Although, I'd be surprised if it doesn't work for much older versions, including the older lex and yacc.

## Limitations

The following limitations are present:
* Doesn't handle the escape sequences. The escape sequences are defined as `\"`, `\\`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t`. This also includes hex, which would be `\u[a-fA-F]{4}`.
* The Flex tool generates 8-bit parsing. This means UTF-8 will work, unless you have characters classes. The JSON specification has 0x0020 through 0x10FFFF, which is is more than 8-bit. Thus, if we're talking UTF-16 or greater it's not going to work unless something major is done to Flex.
* There are probably limitations I don't know about.

Obviously, this example only parses! There are no semantic actions associated with each grammar rule. It simply parses the JSON and exits. If it can parse the JSON it returns 0, else a non-zero exit code. Actions would have to be added to the example for your use case.

## Test Cases

Here is what I used to test. It's easy to run make a file called `test1.json`, throw some JSON in there and then run:

{{< highlight bash >}}
$ ./src/parse_json test1.json
{{< / highlight >}}

### Here are some use cases to test the program with

#### Just Curly Brackets

Let's start out simple.

{{< highlight json >}}
{ }
{{< / highlight >}}

#### An Array of 2 Integers

Handling of an Array

{{< highlight json >}}
[1,1]
{{< / highlight >}}

#### Handling Arrays with different Types

An array with both integers and decimals, and also exponents. One of the elements is an array itself, showing handling of nested arrays.

{{< highlight json >}}
[2,2,2,2,2e3, 2.0, 1e-9, [1,2,3,4.0]]
{{< / highlight >}}

#### Handling a Member

A simple string and value.

{{< highlight json >}}
{ "hello" : "world" }
{{< / highlight >}}

#### A more complex case

Do some nesting with members and values of arrays. Throw, a boolean type of `false` in there as well as `null`.

{{< highlight json >}}
{
  "people":
    {
      "first": "bob",
      "last" : "stevens",
      "children": [ "sue", "anne" ],
      "wallet": null,
      "legs": true,
      "hair": false
    }
}
{{< / highlight >}}

##### Even more complex

Handle a bit more complex.

{{< highlight json >}}
{
  "glossary": {
    "title": "example glossary",
    "GlossDiv": {
      "title": "S",
      "GlossList": {
        "GlossEntry": {
          "ID": "SGML",
          "SortAs": "SGML",
          "GlossTerm": "Standard Generalized Markup Language",
          "Acronym": "SGML",
          "Abbrev": "ISO 8879:1986",
          "GlossDef": {
            "para": "A meta-markup language, used to create markup languages such as DocBook.",
            "GlossSeeAlso": [
              "GML",
              "XML"
            ]
          },
          "GlossSee": "markup"
        }
      }
    }
  }
}
{{< / highlight >}}
