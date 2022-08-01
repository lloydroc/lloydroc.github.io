---
categories: ["c"]
tags: ["sqlite"]
comments: true
date: "2019-07-06T10:43:41Z"
title: Adding SQLite to a C Project
---

Let's add SQLite to your C project. It's easy and straightforward. We'll use the SQLite.org recommended way by adding the so-called "amalgamation" to our C project and compile from source. In the words of [SQLite.org](https://sqlite.org/howtocompile.html) "the use of the amalgamation is recommended for all applications." In this blog post we'll download, compile and use SQLite in our C project.

## Step 1 - Download the SQLite Amalgamation
In Step 1 we'll download the amalgamation and look at the contents of the files. This is done by doing to the [SQLite downloads](https://sqlite.org/downloads.html) and downloading the zip file in the "C Source Code as an amalgamation" section. Let's download the zip file and see what is inside it:

{{< highlight shell >}}

$ unzip -l sqlite-amalgamation-3280000.zip
Archive:  sqlite-amalgamation-3280000.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
        0  2019-04-16 20:06   sqlite-amalgamation-3280000/
  7864301  2019-04-16 20:06   sqlite-amalgamation-3280000/sqlite3.c
   527983  2019-04-16 20:06   sqlite-amalgamation-3280000/shell.c
    33981  2019-04-16 20:06   sqlite-amalgamation-3280000/sqlite3ext.h
   559572  2019-04-16 20:06   sqlite-amalgamation-3280000/sqlite3.h
---------                     -------
  8985837                     5 files
$
{{< / highlight >}}

We can see the amalgamation contains 4 files:
* sqlite3.c - recommended to ONLY use this file.
* shell.c - the command line shell which we won't discuss here. See the docs on [SQLite.org](https://sqlite.org)
* sqlite3ext.h - the extensions, also not discussed here
* sqlite3.h - you will need the header file to reference the sqlite functions

As the docs say on SQLite.org using ONLY the `sqlite3.c` file is recommended. This isn't 100% true since using the header file is also needed when compiling source that uses the SQLite API. It's that simple, add in `sqlite3.c` and `sqlite3.h` to your C Project as source and we can write C source code that using the API.

## Step 2 - Compiling SQLite the Recommended Way

To compile the amalgamation you need to link in `-lpthread` and `-ldl`. Here is an example:

{{< highlight shell >}}
gcc -lpthread -ldl -o sqlite3.o -c sqlite3.c
{{< / highlight >}}

After compilation - which does take a while - the `sqlite3.o` object file is built and can be linked in to your C project. FYI, the `sqlite3.c` file is 222,876 lines as of this writing.

### Some SQLite Compile Options to Consider

Compiling in some options into your project is in some cases an easier way to go than setting them programatically. These can be added in for example by adding in compiler flags with the `-D` option.

{{< highlight shell >}}
gcc -DSQLITE_DEFAULT_FOREIGN_KEYS=1 -lpthread -ldl -o sqlite3.o -c sqlite3.c
{{< / highlight >}}

#### SQLITE_DEFAULT_FOREIGN_KEYS
The option `SQLITE_DEFAULT_FOREIGN_KEYS` should be considered. It is set to 0 by default which allows deleting table rows that have a foreign key reference to them from another table. The default value of this option specifies foreign keys constraints are not enforced. The default of 0 can be good for development and testing but when the application is running, it's probably best you do check for foreign key constraints. The implication to leaving the default at compilation time is at runtime you have to issue the `PRAGMA` statement after connecting to the SQLite database.

#### SQLITE_DEFAULT_WAL_SYNCHRONOUS

Checkout the Write-Ahead Logging feature in SQLite also known as [WAL Mode](https://sqlite.org/wal.html).

## Step 3 - using SQLite in your project

Now that you have compiled the `sqlite3.c` source and have the `sqlite3.o` object file you're ready to use the SQLite API in your C project. It's just a matter of linking and including the header file. Check out my previous blog post [Simple SQLite C API Example](/post/c/sqlite-api/) for an example.

