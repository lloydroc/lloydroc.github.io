---
title: Simple SQLite C API Example
categories: ["c", "database"]
tags: ["sqlite"]
comments: true
date: "2019-02-02T16:45:00Z"
aliases:
  - /c/sqlite/2019/02/02/sqlite3-c-api.html
---

When getting started on the SQLite C API they recommend 2 basic ways: `sqlite3_exec()` and `sqlite3_get_table()` both are convenience wrappers around the core API Calls. They give good examples for the `sqlite3_exec()` call, and the `sqlite3_get_table()` is deprecated in the documentation. Using `sqlite3_exec()` employs a callback function which gives the advantage of speed and low memory usage - due to being able to process each row at a time. It however, does not allow for knowing when all the rows are returned, as well as, being synchronous.

Below is a simple example using the core API functions in SQLite where we synchronously read all rows from a database into memory row-by-row. It uses a table called `people` with two text columns `name`, and `state`.

Let's start with the actual database schema:

{{< highlight sql >}}
--schema.sql
CREATE TABLE IF NOT EXISTS people(name,state);
{{< /highlight >}}

We can create a database with:
{{< highlight bash >}}
$ sqlite3 people.db < schema.sql
{{< /highlight >}}

Create a quick seed script to populate our table:
{{< highlight sql >}}
-- seed.sql
INSERT INTO people(name,state) VALUES ('Bob','CA');
INSERT INTO people(name,state) VALUES ('Linda','GA');
INSERT INTO people(name,state) VALUES ('Tim','WA');
INSERT INTO people(name,state) VALUES ('Sally','TX');
INSERT INTO people(name,state) VALUES ('Steve','CO');
INSERT INTO people(name,state) VALUES ('Gretchen','FL');
INSERT INTO people(name,state) VALUES ('Mark','VT');
{{< /highlight >}}

Then go ahead and seed the database:
{{< highlight bash >}}
$ sqlite3 people.db < seed.sql
{{< /highlight >}}

A example written in C is below. It takes the following steps:
```
1. Open the database
2. Prepare the SQL Command creating a prepared statement
3. Bind the parameters in the prepared statement
4. Step through the result set
5. Close the prepared statement
6. Close the database
```

It might look like a lot, but logically this is what is required. Working in other databases and other languages you will see the same procedure. Some you'll actually see an extra step to execute the statement. Here, we can step through the results without executing the prepared statement. We have to be careful about errors on every step to both finalize our prepared statement and close our database to not cause memory leaks.

{{< highlight c >}}
// main.c
#include <stdio.h>
#include "sqlite3.h"

int
main(int argv, char **argc)
{

  // the sql we will turn in to a prepared statement
  char* sql = "SELECT name, state FROM people WHERE state = ?1;";
  sqlite3 *db; // pointer to our db
  sqlite3_stmt *pstmt; // prepared statements corresponding to sql
  const unsigned char *name,*state; // text columns from our queries
  char *zErrMsg = 0;
  int rc; // return code from sqlite library

  if (argv != 3)
  {
    printf("usage: %s db state\n",argc[0]);
    return(1);
  }

  // 1 open the database
  rc = sqlite3_open_v2(argc[1], &db, SQLITE_OPEN_READONLY, NULL);
  if (rc)
  {
    fprintf(stderr, "Can't open database: %s\n", sqlite3_errmsg(db));
    sqlite3_close_v2(db);
    return(1);
  }

  // 2 create a prepared statement
  rc = sqlite3_prepare_v3(db, sql, -1, 0, &pstmt, NULL);
  if (rc)
  {
    fprintf(stderr, "Couldn't prepare sql statement: %s\n", sqlite3_errmsg(db));
    sqlite3_finalize(pstmt);
    sqlite3_close_v2(db);
    return(1);
  }

  // 3 bind the ?1 in the prepared statement
  // to our text we passed into the program
  rc = sqlite3_bind_text(pstmt, 1, argc[2], -1, NULL);
  if (rc)
  {
    fprintf(stderr, "Couldn't bind to prepared sql stmt: %s\n", sqlite3_errmsg(db));
    sqlite3_finalize(pstmt);
    sqlite3_close_v2(db);
    return(1);
  }

  // 4 fetch columns from our query
  while(sqlite3_step(pstmt) == SQLITE_ROW)
  {
    name = sqlite3_column_text(pstmt,0);
    state = sqlite3_column_text(pstmt,1);
    printf("name: %s state: %s\n",name,state);
  }

  // 5 close the prepared statement
  sqlite3_finalize(pstmt);

  // 6 close the database
  sqlite3_close_v2(db);

  return 0;
}
{{< /highlight >}}

Before we build the c source we need to talk about getting including SQLite into the system. I take the recommended approach of downloading the source and compiling it onto my system. This is the recommended approach on the website. Once all said and done we will have two files `sqlite3.c` and `sqlite3.h`.

Our `Makefile` is as follows:
{{< highlight make >}}
main: main.c sqlite3.o

%.o: %.c
	$(CC) -c $< -o $@

{{< /highlight >}}

Building and running the example:
{{< highlight bash >}}
$ make
cc -c sqlite3.c -o sqlite3.o
cc     main.c sqlite3.o   -o main
$ ./main people.db CO
name: Steve state: CO
{{< /highlight >}}

That's it! Nice and easy. To extend this would be easy. Make more complex queries are parameterize them as you like with ?1, ?2 or even use named parameters. See the SQLite Docs. When binding be sure to use the correct binding type: text, int, blob ... Then be sure when extracting the columns choose the right type and index.

