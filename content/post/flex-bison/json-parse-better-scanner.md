---
title: Improved Scanning of JSON with Flex/Bison
categories:
 - "flex/bison"
tags:
 - json
comments: true
date: "2020-10-27"
---

# {{< title >}}

Using Flex/Bison in the last post we [Parsed JSON into an AST](/post/flex-bison/json-parse-ast/). In the first post we setup a [Simple Example to Parse JSON](/post/flex-bison/json-parse/). In this post we will improve our Flex Scanner to tokenize and validate more JSON cases. We will continue to align with the grammar at [json.org](https://www.json.org/). We will add rules and tokens for `DQUOTE` (double-quote), `string`, `HEX`, and `CHARACTERS` not in our previous implementation.

# Some Examples of Valid JSON

Here are some examples that the previous Flex scanner does not support; but the new implementation will. Many of them contrived and strange, but nevertheless they should be supported.

{{< highlight json >}}
{ "some hex": "\uBEEF" }
{{< / highlight >}}

{{< highlight json >}}
{"":""}
{{< / highlight >}}

{{< highlight json >}}
{"\b": "\\", "\"quoted\"": "thing"}
{{< / highlight >}}

{{< highlight json >}}
{"x": -0}
{{< / highlight >}}

The largest improvements are to support hex in the form of `\uXXXX` and support additional characters between the quotes. These additional characters are the escape characters in JSON of `" \ / b f n r t ` which are all escaped with `\`. See the grammar at [json.org](https://www.json.org) for another reference.

# Changes to the Token Stream

Previously, our scanner would include the quotes as part of a `STRING` token. For example we would have `"hello"` as a single token. We would just tokenize everything as a `char *` between two literal double quotes. This `char *` would include the double quotes. Below is the regex that includes the quotes.

{{< highlight bash >}}
\"[^"]*\" { yylval.string = strdup(yytext); return STRING; }
{{< / highlight >}}

This isn't aligned to the following grammar:

{{< highlight bash >}}
string: " characters "

characters: ""
          | characters character

j
{{< / highlight >}}

Now, we can tokenize the quotes and the characters between the quotes seperately. We can put our scanner into a state called `QUOTED` and then we'll read the characters until we hit another double quote. Once we reach and end quote we'll go back to the `INITIAL` state. All the characters between the quotes will be returned in a token called `CHARACTERS`. This tokenization will look like `DQUOTE CHARACTERS DQUOTE` where the `CHARACTERS` are a `char *`. See the following where we have a regex just for a single quote, which starts a Flex state, then tokenizes the characters then the state ends with another single quote.

{{< highlight bash >}}
\" { BEGIN QUOTED; return DQUOTE; }
<QUOTED>\" { BEGIN INITIAL; return DQUOTE; }
<QUOTED>\\u[a-fA-F0-9]{4} { yylval.characters = strdup(yytext); return HEX; }
<QUOTED>([\x20-\x7e]{-}[\"\\]|\\[\\"\/bfnrt])+ { yylval.characters = strdup(yytext); return CHARACTERS; }
{{< / highlight >}}

Remember that Flex will tokenize the longest regex match which is the concept of precedence here.

# New Flex Scanner File

Here is our new scanner file. Note, we will still handle decimal numbers and integers separately. I highlighted the major lines that changed between the previous scanner.

{{< highlight c "linenos=table,hl_lines=12 27-30" >}}
%{
// filename: scanner.l
#include "parser.h"
#include <string.h>
#include <math.h>

extern void yyerror(const char * message);

%}

%option noyywrap
%x QUOTED
EXP ([Ee][-+]?[0-9]+)

%%

"{" { return LCURLY; }
"}" { return RCURLY; }
"[" { return LBRAC; }
"]" { return RBRAC; }
"," { return COMMA; }
":" { return COLON; }
"true" { return VTRUE; }
"false" { return VFALSE; }
"null" { return VNULL; }
[ \t\r\n]+ { /* eat whitespace */ }
\" { BEGIN QUOTED; return DQUOTE; }
<QUOTED>\" { BEGIN INITIAL; return DQUOTE; }
<QUOTED>\\u[a-fA-F0-9]{4} { yylval.characters = strdup(yytext); return HEX; }
<QUOTED>([\x20-\x7e]{-}[\"\\]|\\[\\"\/bfnrt])+ { yylval.characters = strdup(yytext); return CHARACTERS; }
\-?[0-9]+[0-9]* {
    yylval.integer = atoi(yytext);
    return NUMBER_INTEGER;
}
\-?[0-9]+"."?[0-9]*{EXP}? {
  float f = atof(yytext);
  yylval.decimal = f;
  return NUMBER_FLOAT;
}

%%
{{< / highlight >}}

While writing this post I realized that a valid JSON number is `-0` which is strange, but accepted.

# New Parser File

Now instead of having a `STRING` token of type `char *` we will return a `CHARACTERS` token of type `char *`. Our new `string` type will be the rule on lines 131-139. The parser is less impacted than the scanner for these improvements. This also illustrates a good architecture and decoupling between scanning and parsing.

{{< highlight c "linenos=table,hl_lines=25 37-38 43 67-69 131-139" >}}
%{

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "ast.h"
#include "list.h"

extern struct value_type *json;

extern int yylineno;
extern char* yytext;
int yylex();
void yyerror(const char *s);

// gives good debug information
int yydebug=0;

%}

%start json

%union {
  char *characters;
  char *str;
  float decimal;
  int integer;
  struct value_type *v;
  struct member_type *memb;
  struct List *membs;
  struct List *elems;
};

%token LCURLY RCURLY LBRAC RBRAC COMMA COLON DQUOTE
%token VTRUE VFALSE VNULL
%token <characters> CHARACTERS;
%token <characters> HEX;
%token <decimal> NUMBER_FLOAT;
%token <integer> NUMBER_INTEGER;

%type <v> value object array json element
%type <str> string
%type <memb> member
%type <membs> members
%type <elems> elements

%%

json:
    {
     $$ = NULL;
    }
    | value
    {
      $$ = $1;
      json = $$;
    }
    ;

value: object {
        $$ = $1;
     }
     | array {
        $$ = $1;
     }
     | string {
        $$ = new_value_string($1);
     }
     | NUMBER_FLOAT {
       $$ = new_value_number($1);
     }
     | NUMBER_INTEGER {
       $$ = new_value_integer($1);
     }
     | VTRUE {
       $$ = new_value_boolean(1);
     }
     | VFALSE {
       $$ = new_value_boolean(0);
     }
     | VNULL {
       $$ = new_value_null();
     }
     ;

object: LCURLY RCURLY {
        $$ = new_value_object(NULL);
      }
      | LCURLY members RCURLY {
        $$ = new_value_object($2);
      }
      ;

members: member {
         $$ = new_members();
         list_add_last($$, $1);
       }
       | members COMMA member {
         list_add_last($1, $3);
       }
       ;

member: string COLON value {
        $$ = new_member_type($1, $3);
      }
      ;

array: LBRAC RBRAC {
       $$ = new_value_array(NULL);
     }
     | LBRAC elements RBRAC {
       $$ = new_value_array($2);
     }
     ;

elements: element {
          $$ = new_elements();
          new_array_element($$, $1);
        }
        | elements COMMA element {
          new_array_element($1, $3);
        }
        ;

element: value {
         $$ = $1;
       }
       ;

string: DQUOTE DQUOTE {
          $$ = strdup("\0");
        }
        | DQUOTE CHARACTERS DQUOTE {
          $$ = $2;
        }
        | DQUOTE HEX DQUOTE {
          $$ = $2;
        }
        ;

%%

void
yyerror(const char *s)
{
  fprintf(stderr,"error: %s on line %d\n", s, yylineno);
}
{{< / highlight >}}

# Downloading and Usage

Download the full source of [parse_json](/code/parse_json-1.2.tar.gz).

To use it do the following.

{{< highlight bash >}}
$ tar xf parse_json-1.2.tar.gz
$ cd parse_json
$ ./configure
$ make
$ ./src/parse_json some_file.json
{{< / highlight >}}

The files are all inside the `src` folder. See the following files that were changed in this post.
* scanner.l the Flex Scanner
* parser.y the Bison Parser
