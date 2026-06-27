---
categories: ["c"]
comments: true
date: "2019-08-22T18:32:31Z"
title: Why static declarations are confusing in C
aliases:
  - /c/static/2019/08/22/static-variables-c.html
---

The `static` variable in C is unnecessarily confusing because it is used for both the memory management model and for linkage. Since these two concerns are mutually exclusive another keyword would have really cleared things up in the linkage case.

### A single keyword for memory management and linkage?

As you may know in C there are 3 methods of memory management models: automatic, static and manual. Automatic variables are what most programming languages use. Manual is memory allocated with `malloc()` and de-allocated with `free()`. It's manual meaning you control allocation and de-allocation of memory. It's static memory management we're focused on in this post.

Conversely, in C we have linkage. What is linkage? According to Wikipedia: "linkage describes how names can or can not refer to the same entity throughout the whole program or one single translation unit". We won't get into translations units, but think about the object file from each C header and source file. In terms of C we can explain this better by referring to the `extern` keyword. Using the `extern` keyword a file can refer to a variable that is defined in another file. The linker figures this out.

### The static memory management model

In C static variables exist in the same place throughout the life of a program. These variables are set to zero on startup, can be scope limited, and can be initialized. Because the variables are in the same place they persist across function calls and can be global.

### The 3 Ways to Declare Static in C

There are really 3 ways to use the static keyword:

1. Declaring static global variables in a C file. Let's call them file scope variables
2. Declaring static variables inside a C function. Let's call them block scope variables.
3. Declaring static functions. For this post let's not consider nested functions.

#### Declaring static global variables

When you declare a global variable or struct, it will affect the linkage. The default linkage of a variable or struct is external so other files can use it, however, when declaring a file scope variable static it can only be accessed inside the file it is declared.

A slight gotcha here. When declaring global variables the static memory model is implicitly used. Global variables do not use the automatic memory model. Thus, we can say that declaring global variables or structures static doesn't affect the memory management model.

#### Declaring static variables inside a C function

When declaring variables inside a function as static, or should we say in block scope, this affects only the memory model and not the linkage. This static variable will keep the same value between invocations. See the [FIR Filter Implementation](/post/c/fir-filter/) for usage of static variables inside a function.

#### Declaring static functions

Declaring static functions affects only the linkage. Functions can only be defined at the file scope and the default linkage is external. The external linkage of a function declaration would mean that other C files could use those functions if they were included using the `include` keyword. However, declaring a function static would tell the linker that the function can only be accessed in the file it is declared and not externally in other files.

### Summary of the static keyword in C

When you use the static keyword for declarations a combination of the memory management model and linkage are impacted. For static global variables the static keyword impacts both the linkage and memory model. For static variables declared in a function only the memory model is impacted. For functions only the linkage is impacted. This table summarizes for each declaration what is impacted:

| Declarating static     | Memory Model | Linkage |
|------------------------|--------------|---------|
| global variables       | x            |         |
| variables in functions | x            |         |
| functions              |              | x       |

### What would make static declarations less confusing?

Since static declarations impact both the linkage and memory management model it would be prudent to separate these two paradigms with keywords. Let's introduce the `intern` keyword as a converse to the `extern` keyword for linkage. We could declare file scope variables and functions as `intern` to affect the linkage. We could leave the block scope variables declared static which impacts only the memory management model.

### Reference

For this post the information was gathered from the book *21st Century C: C Tips from the New School* by *Ben Klemens*. ISBN-13: 978-1491903896. It's a great book and if you're interested in C you should check it out!
