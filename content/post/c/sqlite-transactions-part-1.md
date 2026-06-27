---
categories:
  - database
tags:
  - sqlite
comments: true
date: "2019-07-09T06:43:41Z"
title: SQLite Transactions Part 1
aliases:
  - /sqlite/transactions/commit/part1/2019/07/09/sqlite-transactions-part-1.html
---

In the world of software these days it is expected that applications do multiple things at once. With that said it's pretty typical that multiple processes or threads have read and write access to a database. In this post we will go over transactions in SQLite which prohibits changes made to the database unless they are inside a transaction.

## Defining a Database Transaction

Let's first define a database transaction which is essentially to carry out or conduct to a conclusion. In the context of a database a transaction is a grouping of SQL commands. We can consider this transaction to be atomic in the sense that all the commands will execute successfully or it will fail.

## Beginning and Ending a Transaction in SQLite

In SQLite you can start and end a transaction with the SQL commands below.

* The `BEGIN TRANSACTION` command will start a transaction. Once started, nothing else can modify the database.
* The `COMMIT TRANSACTION` or `END` will end the transaction or if error will `ROLLBACK` which we won't discuss here.

### SQLite Database Example with Transactions

Here we will create a database called `animals.db` and we will then open two shells which will try to read and write to the database at the same time. Each of these shells will be in their own transaction.

{{< highlight sql >}}
$ sqlite3 animals.db "CREATE TABLE animals(name);"
$ sqlite3 animals.db
sqlite> INSERT INTO animals(name) values("cat");
sqlite> INSERT INTO animals(name) values("dog");
sqlite> .prompt "s1> "
s1> BEGIN TRANSACTION;
                                               $ sqlite3 animals.db
                                               sqlite> animals.db
                                               sqlite> .prompt "s2> "
                                               s2> BEGIN TRANSACTION;
                                               s2> SELECT name FROM animals;                   s2 has a shared lock
                                               cat
                                               dog
s1> SELECT name FROM animals;                                                                  s1 and s2 have shared locks
cat
dog
s1> INSERT INTO animals(name) values("bird");                                                  s1 has a reserved lock
                                               s2> SELECT name FROM animals;
                                               cat
                                               dog
s1> SELECT name FROM animals;
cat
dog
bird
                                               s2> INSERT INTO animals(name) VALUES("fish");  s2 cannot write since s1 has reserved lock
                                               Error: database is locked
s1> COMMIT TRANSACTION;                                                                       s1 cannot write since s1 has a shared lock
Error: database is locked
                                               s2> COMMIT TRANSACTION;                        s2 ends transaction and releases shared lock
s1> COMMIT TRANSACTION;                                                                       s1 can to from pending to exclusive locks
s1> SELECT name FROM animals;                                                                 all locks are relinquished
cat
dog
bird
                                               s2> SELECT name FROM animals;
                                               cat
                                               dog
                                               bird
                                               s2> .exit
                                               $
s1> .exit
$
{{< / highlight >}}

## Explanation of the two transaction example

In the example above we create an example animals database called `animals.db` where we have a single column called `name` where we insert names of animals. Before we open any transactions we insert a cat and a dog. Then on two different shells we open the same database file and enter into two different transactions. We issue a select in both transactions and we can see the two animals in the database. We then insert an animal named bird and we observe that only the first shell can see the bird, whereas, a select from the second shell cannot see a bird. Where things get interesting is when the second shell tries to insert a fish. We get an error saying the database is locked. We then try to commit from the first shell and it also says the database is locked. Only when we end the transaction from the second shell can we commit the transaction from the first shell. After we've ended both shell sessions we can see the 3 animals: cat, dog and bird.

## Overview of Locks in SQLite

There are 3 types of transactions in SQLite: deferred, immediate, and exclusive. The default is deferred and it is the type of transaction in the example above. With deferred transactions no locks are acquired until the database is accessed. Since an access can be a read or written we also distinguish the access type. If the access is a read - which is what we did with a select after staring both transactions - then a shared lock is created. Shared locks allow for multiple processes to access the database and that is why the second shell can access the database. When shared locks are active no other thread or process can write to the database. When the first shell inserts the bird - a write access - a reserved lock is obtained. A single reserved lock maybe active at one time. After this insert of the bird the first shell has the reserved lock, the second shell has shared lock. Now that we have the reserved lock neither shell can write to the database. This is because of the lock state of pending. In the pending lock state a process holding a reserved lock wants to write to the database, but it cannot until all shared locks are cleared so it can get an exclusive lock. This is why once we see shell two end it's transaction only then can shell one obtain an exclusive lock in the commit and write the animal named bird in it's transaction.

## Where to go from Here

This example just scratches the surface of transactions and locks in SQLite. We only discussed the deferred transaction, where transactions can also be immediate and exclusive. The types of locks we were able to explore. All of this is documented in SQLite in the [transaction](https://sqlite.org/lang_transaction.html) documentation as well as the [locking](https://sqlite.org/lockingv3.html) documentation. In the next blog post we will discuss doing SQLite Transactions in the C API in a program.
