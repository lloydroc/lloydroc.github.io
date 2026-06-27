---
title: Parse JSON into an Abstract Syntax Tree using Flex/Bison
categories:
 - "flex/bison"
tags:
 - json
comments: true
date: "2020-10-25"
---

# {{< title >}}

In a previous post we [Parsed JSON using Flex/Bison](/post/flex-bison/json-parse/). This example was very basic. We used a FLEX scanner to tokenize our JSON and created grammar rules in BISON to parse this token stream. This post will take it further and create an Abstract Syntax Tree (AST). The AST is a power data structure typically used in compilers that will store the structure of our JSON. Effectively we will read in the JSON structure a tree-like data structure in C.

# Bison Grammar

We will use same grammar from [json.org](https://www.json.org/) for our Bison grammar. They represent this in *McKeeman Form*. Below is the converted *McKeeman Form* grammar from [json.org](https://www.json.org/) to Bison. Note, this grammar isn't exact to what is on json.org, but close. For example we don't have *characters*, *digit*, *digits*, *integer*, *fraction* ... our FLEX scanner is handling a lot of this and it's not found in the Bison parser.

{{< highlight c >}}
// from our parser.y Bison file
json:
    | value
    ;

value: object
     | array
     | STRING
     | NUMBER_FLOAT
     | NUMBER_INTEGER
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
     | LBRAC elements RBRAC
     ;

elements: element
        | elements COMMA element
        ;

element: value
       ;

{{< /highlight >}}

## Notes about this Grammar

Here are some notes to clarify the grammar.

* The result of JSON is a *value*. Here are some examples of valid JSON: `null`, `5`, `[]` and `{}`. These are all *values*.
* We have simple values: `"true"`, `"false"`, `null`, *number* and *string*.
* We have complex values which are the *array* and *object*.
* The *object* contains *members* which is a list of type *member*. Each *member* has a name and a *value*. *Members* are separated by a comma.
* The *array* contains *elements* which is a list of type *element*. Each *element* is a *value*. The *element* doesn't have a name like we have in the *memeber* which is a part of an *object*. Elements are separated by a comma.

# An AST for JSON

The AST for JSON only has two structures. One structure is a `value_type` which contains the type of value it is, and a `void *` to that data. The other structure is a `member_type` which is part of a JSON *object* that contains a name and a `struct value_type *value` to the value.

## AST Structures

We define our AST structures in a file called `ast.h`. These make up part of the Bison declaration section.

{{< highlight c >}}
// a blurb from ast.h
enum VALUE_TYPE
{
  OBJECT_TYPE,
  ARRAY_TYPE,
  STRING_TYPE,
  NUMBER_TYPE,
  INTEGER_TYPE,
  BOOLEAN_TYPE,
  NULL_TYPE
};

struct value_type
{
  enum VALUE_TYPE type;
  // the data pointer can be a primitive like a string, int, boolean or null
  // or to an array or object
  void *data;
};

struct member_type
{
  char *name;
  struct value_type *value;
};
{{< /highlight >}}

## Bison Declarations

The Bison declarations will map our C types in our AST to the [Rules Syntax of Bison](https://www.gnu.org/software/bison/manual/html_node/Rules-Syntax.html). Note the `struct List *` for `membs` and `elems`.

We don't define *members* or *elements* in our AST, we instead use a [Linked List](/post/c/useful-linked-list/) for them. The *members* list will be a list of the `member_type` and the *elements* list will be a list of `value_type`. The `value_type` for an *array* will have the void `data` pointer pointing to the list and the `value_type` for *object* will have the void `data` pointer pointing to the *members* list. We'll see this in the Bison Declarations.


{{< highlight c >}}
%start json

%union {
  char *string;
  float decimal;
  int integer;
  struct value_type *v;
  struct member_type *memb;
  struct List *membs;
  struct List *elems;
}

%token LCURLY RCURLY LBRAC RBRAC COMMA COLON
%token VTRUE VFALSE VNULL
%token <string> STRING;
%token <decimal> NUMBER_FLOAT;
%token <integer> NUMBER_INTEGER;

%type <v> value object array json element
%type <memb> member
%type <membs> members
%type <elems> elements
{{< /highlight >}}



## Bison Grammar Rules

Now that we have our AST definitions in place we can define the rules to build an AST structure as JSON is parsed.

{{< highlight bash >}}
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
     | STRING {
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

member: STRING COLON value {
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

%%
body
{{< /highlight >}}

## Implementation of the AST Functions

The implementation of the AST functions is simple and quite repetitive. Look particularly at the `new_array_element` and `new_object_member` and how they relate into the Bison parser.

{{< highlight c >}}
struct value_type*
new_value_array(struct List *elements)
{
  struct value_type *v = malloc(sizeof(struct value_type));

  v->type = ARRAY_TYPE;
  v->data = elements;

  return v;
}

struct value_type*
new_value_object(struct List *members)
{
  struct value_type *v = malloc(sizeof(struct value_type));

  v->type = OBJECT_TYPE;
  v->data = members;

  return v;
}

struct value_type*
new_value_string(char *string)
{
  struct value_type *v = malloc(sizeof(struct value_type));

  v->type = STRING_TYPE;
  v->data = strip_quotes(string);

  return v;
}

struct value_type*
new_value_integer(int i)
{
  struct value_type *v = malloc(sizeof(struct value_type));
  int *ii = malloc(sizeof(int));

  *ii = i;

  v->type = INTEGER_TYPE;
  v->data = ii;

  return v;
}

struct value_type*
new_value_boolean(int b)
{
  struct value_type *v = malloc(sizeof(struct value_type));
  int *bb = malloc(sizeof(int));

  *bb = b;

  v->type = BOOLEAN_TYPE;
  v->data = bb;

  return v;
}

struct value_type*
new_value_number(float f)
{
  struct value_type *v = malloc(sizeof(struct value_type));
  int *ff = malloc(sizeof(float));

  v->type = NUMBER_TYPE;
  v->data = ff;

  return v;
}

struct value_type*
new_value_null()
{
  struct value_type *v = malloc(sizeof(struct value_type));
  v->type = NULL_TYPE;
  v->data = NULL;

  return v;
}

struct List *
new_members()
{
 struct List *members = malloc(sizeof(struct List));
 list_init(members, member_match, member_free);
 return members;
}

struct member_type*
new_member_type(char *name, struct value_type *value)
{
  struct member_type *m = malloc(sizeof(struct member_type));
  size_t len;

  m->name = strip_quotes(name);
  m->value = value;

  return m;
}

struct List *
new_elements()
{
  struct List *elements = malloc(sizeof(struct List));
  list_init(elements, member_match, member_free);
  return elements;
}

int
new_array_element(struct List *elements, struct value_type *element)
{
  return list_add_last(elements, element);
}

int
new_object_member(struct List *members, struct member_type *member)
{
  return list_add_last(members, member);
}
{{< /highlight >}}

# Traversing the AST

Once we've parse a file that contains JSON into our AST we will then traverse through the AST and print out the values. This will be done with a recursive function.

Take the following formatted file as input to our parser.
{{< highlight json >}}
{
  "people":
    {
      "first": "bob",
      "last" : "stevens",
      "children": [ "sue", "anne" ],
      "wallet": null,
      "legs": true,
      "hair": false,
      "age" : 23,
      "height": 42.1
    }
}
{{< /highlight >}}

We can parse it and print it out. It's not pretty printed and the numeric types won't round out as exactly as passed in. However, it works.

{{< highlight bash >}}
$ ./parse_json test/test6.json
{"people":{"first":"bob","last":"stevens","children":["sue","anne"],"wallet":null,"legs":true,"hair":false,"age":23,"height":42.099998}}
{{< /highlight >}}

To recursively print the AST we have the following. The recursion happens only when we have an *object* or *array* type.
{{< highlight c >}}
void
json_print_recursive(struct value_type *value)
{
  struct List* members;
  struct List* elements;
  struct member_type *member;

  char *str;
  int *integer;
  float* number;

  if(value == NULL)
  {
    perror("value is null!?\n");
    return;
  }

  switch(value->type)
  {
  case OBJECT_TYPE:
    members = value->data;

    if(members == NULL)
    {
      printf("{}");
      break;
    }

    printf("{");
    for(int i=0; i<list_size(members); i++)
    {
      member = list_get_index(members, i);
      printf("\"%s\":", member->name);
      json_print_recursive(member->value);
      if(i < (list_size(members)-1))
      {
        printf(",");
      }
    }
    printf("}");

    break;
  case ARRAY_TYPE:
    elements = value->data;

    printf("[");
    for(int i=0; i<list_size(elements); i++)
    {
      value = list_get_index(elements, i);
      json_print_recursive(value);
      if(i < (list_size(elements)-1))
      {
        printf(",");
      }
    }
    printf("]");

    break;
  case STRING_TYPE:
    str = value->data;
    printf("\"%s\"", str);
    break;
  case INTEGER_TYPE:
    integer = value->data;
    printf("%d", *integer);
    break;
  case NUMBER_TYPE:
    number = value->data;
    printf("%f", *number);
    break;
  case BOOLEAN_TYPE:
    integer = value->data;
    if(*integer != 0)
      printf("true");
    else
      printf("false");
    break;
  case NULL_TYPE:
      printf("null");
    break;
  default:
    perror("unknown value type");
  }
  return;
}
{{< /highlight >}}

# Downloading and Usage

Download the full source of [parse_json](/code/parse_json-1.1.tar.gz).

To use it do the following.

{{< highlight bash >}}
$ tar xf parse_json-1.1.tar.gz
$ cd parse_json
$ ./configure
$ make
$ ./src/parse_json some_file.json
{{< /highlight >}}

The files are all inside the `src` folder:
* scanner.l the Flex Scanner
* parser.y the Bison Parser
* ast.h and ast.c the C code for the Abstract Syntax Tree
* main.c where the parsing starts
