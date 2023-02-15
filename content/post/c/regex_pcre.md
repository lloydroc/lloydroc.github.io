---
categories:
 - c
date: "2020-02-01T13:29:10Z"
title: Regular Expressions in C
---

In this blog post we will construe some simple examples of regular expressions in C, also known as a `regex`. We will use the popular libraries PCRE and PCRE2. If you don't know what a regex is or have never used them, then you can close this tab right now! Learning regular expressions in in C is probably the wrong way to go. Start with something more easy like Python, Perl, or anything else because doing them in C is difficult. If you know regular expressions from other languages, learning them in C will strengthen your understanding of the concept. This example is meant to be easy to understand, simple and useful.

## First, Some Background
* Regexes are not part of ANSI C, a library needs to be used.
* There are 2 main libraries: POSIX or PCRE
* Be aware of the text you're doing regex's on. If you're doing UTF we don't cover that here. We'll delve into "8-bit" Code Points such as ASCII.

### POSIX Regular Expressions
If you see the following included in the C source then it's POSIX Regular Expressions. POSIX Regular expressions have lost the popularity battle and you won't see them used much.
{{< highlight c >}}
#include <regex.c>
{{< / highlight >}}

We won't discuss POSIX regular expressions in this blog post from here on.

### Perl Compatible Regular Expressions
Regular expressions from Perl gained widespread popularity and it's syntax is what you'll normal see in Java, Javascript, Python, Perl and other languages. The library PCRE is written in C and claims to be much more powerful and flexible than POSIX. I actually can't confirm that opinion because I've only learned the popularized Perl regular expression format. I can definitely attest to this format being very powerful and simple.

### PCRE and PCRE2
The [PCRE Library](https://pcre.org/) has 2 versions: `pcre` and `pcre2`. The older `pcre` was released over 20 years ago in 1997 and is at version 8.43 as of this post. Future releases will be for bugfixes only. New features will be released in `pcre2` which was released in 2015 and is now at version 10.34 as of this writing. In this blog post we have an example for both `pcre` and `pcre2`.

### Installing PCRE
You can obviously install the `pcre` library from source. However, let's go the easy route and install through a package manager:

#### Yum - CentOS
{{< highlight bash >}}
yum install pcre pcre-devel
{{< / highlight >}}

#### Apt - Ubuntu
{{< highlight bash >}}
apt-get install libpcre3 libpcre3-dev
{{< / highlight >}}

#### Pacman - ArchLinux
{{< highlight bash >}}
pacman -Su pcre pcre2
{{< / highlight >}}

### A Useful, Simple Example
Before we get into the code let's create a good example with capture groups. A regex that matches a first and last name has some good value. Here we can have one group the first name and one group the last name.
#### Example Regex for a Person's First and Last Name
{{< highlight c >}}
^([A-Z][a-z]+) ([A-Z][a-z]+)$
{{< / highlight >}}

Here we have two "capture groups", the group is what is between the `()`. By having groups we can capture and use different parts of what is matched in the regex. Inside each `()` we have a representation of a very simple name. It has `[]` which is a character class that matches capital _A_ through _Z_, then we have another capture class _[a-z]+_ which matches _a_ through _z_ one or more times. To be explicit _A_ through _Z_ is A,B,C,D,E ... all the way to Z. Again, this regex is very simple and I'm sorry if I offended you by it not matching your name. For example _Jon McCarthy_ would not match since in the last name we have 2 capital letters. The `^` and `$` match the beginning and end of a line respectively.

#### Trying our Example
The PCRE library comes with a helper tool. Called `pcretest` and `pcre2test` respectively. I will use `pcre2test` as all of this is backward compatible since we're not doing anything advanced with regexes.

{{< highlight bash >}}
$ pcre2test
PCRE2 version 10.34 2019-11-21
  re> "^([A-Z][a-z]+) ([A-Z][a-z]+)$"
data> Lloyd Rochester
 0: Lloyd Rochester
 1: Lloyd
 2: Rochester
data> John McCarthy
No match
data>
$
{{< / highlight >}}

Now, we can see for the subject _Lloyd Rochester_ we got 3 matches? Huh, why not 2? The reason is if the regex matched at all we'll get 1 match, and the other 2 are for the groups. Sorry but _John McCarthy_ didn't match.

### How we'll use our Simple Example
Let's make 2 examples that are used like so:
{{< highlight bash >}}
$ ./pcre_ex "^([A-Z][a-z]+) ([A-Z][a-z]+)$" "Lloyd Rochester"
$ ./pcre_ex2 "^([A-Z][a-z]+) ([A-Z][a-z]+)$" "Lloyd Rochester"
{{< / highlight >}}

We will create 2 programs called `pcre_ex` and `pcre_ex2` which use their corresponding libraries. We will pass in 2 arguments to these libraries. The first argument will be our regular expression and the second argument will be our subject. The "subject" is the thing we will match against.

Let's dive into a PCRE example in the legacy library `pcre.h`.

### Simple PCRE Sample Program

Below is a simple example using `pcre`. It is linked with `-lpcre`.

{{< highlight c >}}
#include <stdio.h>
#include <pcre.h>
#include <string.h>

int
main(int argc, char *argv[])
{

  if(argc < 3)
  {
    fprintf(stderr,"usage: %s \"regex\" subject\n",argv[0]);
    return EXIT_FAILURE;
  }

  /* for pcre_compile */
  pcre *re;
  const char *error;
  int erroffset;

  /* for pcre_exec */
  int rc;
  int ovector[30];

  /* to get substrings from regex */
  int rc2;
  const char *substring;

  // we'll start after the first quote and chop off the end quote
  const char *regex = argv[1];
  const char *subject = argv[2];
  re = pcre_compile(regex, 0, &error, &erroffset, NULL);

  rc = pcre_exec(re, NULL, subject, strlen(subject), 0, 0, ovector, 30);

  if(rc == PCRE_ERROR_NOMATCH)
  {
    fprintf(stderr,"no match\n");
  }
  else if(rc < -1)
  {
    fprintf(stderr,"error %d from regex\n",rc);
  }
  else
  {
    // loop through matches and return them
    for(int i=0; i<rc; i++)
    {
      rc2 = pcre_get_substring(subject, ovector, rc, i, &substring);
      printf("%d: %s\n",i,substring);
      pcre_free_substring(substring);
    }
  }
  pcre_free(re);

  return rc;
}
{{< / highlight >}}

### Simple PCRE2 Sample Program

Below is a simple example using `pcre2`. It is linked with `-lpcre2-8`.

{{< highlight c >}}
#include <stdio.h>
#include <pcre2.h>
#include <string.h>

int
main(int argc, char *argv[])
{

  if(argc < 3)
  {
    fprintf(stderr,"usage: %s \"regex\" subject\n",argv[0]);
    return EXIT_FAILURE;
  }

  /* for pcre2_compile */
  pcre2_code *re;
  PCRE2_SIZE erroffset;
  int errcode;
  PCRE2_UCHAR8 buffer[128];

  /* for pcre2_match */
  int rc;
  PCRE2_SIZE* ovector;

  const char *pattern = argv[1];
  size_t pattern_size = strlen(pattern);

  const char *subject = argv[2];
  size_t subject_size = strlen(subject);
  uint32_t options = 0;

  pcre2_match_data *match_data;
  uint32_t ovecsize = 128;

  re = pcre2_compile(pattern, pattern_size, options, &errcode, &erroffset, NULL);
  if (re == NULL)
  {
    pcre2_get_error_message(errcode, buffer, 120);
    fprintf(stderr,"%d\t%s\n", errcode, buffer);
    return 1;
  }

  match_data = pcre2_match_data_create(ovecsize, NULL);
  rc = pcre2_match(re, subject, subject_size, 0, options, match_data, NULL);
  if(rc == 0) {
    fprintf(stderr,"offset vector too small: %d",rc);
  }
  else if(rc > 0)
  {
    ovector = pcre2_get_ovector_pointer(match_data);
    PCRE2_SIZE i;
    for(i = 0; i < rc; i++)
    {
      PCRE2_SPTR start = subject + ovector[2*i];
      PCRE2_SIZE slen = ovector[2*i+1] - ovector[2*i];
      printf( "%2d: %.*s\n", i, (int)slen, (char *)start );
    }
  }
  else if (rc < 0)
  {
    printf("No match\n");
  }

  pcre2_match_data_free(match_data);
  pcre2_code_free(re);

  return 0;
}
{{< / highlight >}}

In this example there is a loop that goes through the subject using the `ovector`. I wanted to use the helper functions `pcre2_substring_copy_bynumber` or `pcre2_substring_get_bynumber`, however, I could not get them to work. For `pcre2_substring_copy_bynumber` it would match both `Lloyd Rochester` and `Lloyd` but then would give me a `PCRE2_ERROR_NOMEMORY` on the third. For `pcre2_substring_get_bynumber` I mainly got segmentation faults. I'm still not sure why these helper functions couldn't be used.

