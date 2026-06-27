---
title: Processing Emails with a script in Postfix
date: "2019-04-27T07:56:00Z"
categories:
 - unix
tags:
 - postfix
aliases:
  - /postfix/mysql/dovecot/script/2019/04/27/process-mail-script-postfix.html
---

Updated Feb 7, 2020

After thinking about this post more, it's true you can process emails with a script in Postfix. The post provides the right answer to the **wrong question**!! You can certainly process emails with Postfix but it's hard, brittle, reduces performance and really isn't recommended. What is better is to have a client program that reads the mail and does what you desire. This client can be put on a cron job, triggered or run however you want. The client is very flexible and so many different programming languages support them. This gives a lot of power to mark emails read, manage folders, etc ... It's just a cleaner, better, easier to use and test architecture than having a script in Postfix. So I'll leave this up, but, I wouldn't use it unless there is some reason I cannot think of how it would be better.

This blog post will show you how to get access to the mail on a Postfix/Dovecot/MySQL system with virtual users and virtual domains. The access will be with a bash script, but any script or program could do. The script we show could be replaced with Python, Java, Perl, C, or any other program. Note, later in this post there are some performance drawbacks to the methodology described.

The configuration covered:
* Postfix as the MTA
* Dovecot as the MDA
* MySQL for Virtual Users, Virtual Domains and Virtual Aliases

This configuration can be explained through this masterpiece documented by the Linode folks. It is entitled [Email with Postfix, Dovecot, and MySQL](https://www.linode.com/docs/email/postfix/email-with-postfix-dovecot-and-mysql), and there is plenty more good content there on the specifics for Postfix and Dovecot. I used the generic post from Linode that doesn't address the specific OS since other articles didn't address Arch Linux. One thing to note when installing Dovecot on Arch Linux is when upon installation the configuration file are not in `/etc/dovecot` with default values. This can be easily alleviated since the Dovecot install puts the configuration files in `/usr/share/doc/dovecot` for reference.

After the long hard slog of installation and configuration the Postfix, Dovecot and MySQL. Then getting DNS records correct. Then finally getting email clients to handle incoming and outgoing mails I went into the wormhole of how to process a mail through a script. The internet seems riddled with solutions that don't work. Ultimately, I landed on this gem with clearly shows how to do it in Postfix. It is entitled [Simple Content Filter Example](http://www.postfix.org/FILTER_README.html#simple_filter). Be sure to see the performance impacts in here which illustrate a 4x decrease.

Effectively to make this work you can edit the `master.cf` file in `/etc/postfix/master.cf`:

```
submission inet n       -       y      -       -        smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_sasl_type=dovecot
  -o smtpd_sasl_path=private/auth
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
  -o content_filter=filter:dummy
```

Where the `content_filter` is what gives us direct email access. Then create a directory `/var/spool/filter` owned by the `filter` user. This script also has `rw` privledges for only the `filter` user to see. Below is `filter` script recommented by the Postfix project:

{{< highlight bash >}}
#!/bin/sh

# Simple shell-based filter. It is meant to be invoked as follows:
#       /path/to/script -f sender recipients...

# Localize these. The -G option does nothing before Postfix 2.3.
INSPECT_DIR=/var/spool/filter
SENDMAIL="/usr/sbin/sendmail -G -i" # NEVER NEVER NEVER use "-t" here.

# Exit codes from <sysexits.h>
EX_TEMPFAIL=75
EX_UNAVAILABLE=69

# Clean up when done or when aborting.
trap "rm -f in.$$" 0 1 2 3 15

# Start processing.
cd $INSPECT_DIR || {
    echo $INSPECT_DIR does not exist; exit $EX_TEMPFAIL; }

cat >in.$$ || {
    echo Cannot save mail to file; exit $EX_TEMPFAIL; }

# Specify your content filter here.
/var/spool/filter/c <in.$$ || {
   echo Message content rejected; exit $EX_UNAVAILABLE; }

$SENDMAIL "$@" <in.$$ || {
   echo Unable to send mail; exit $EX_UNAVAILABLE;
}

exit $?
{{< / highlight >}}

From here I created a script called `c` which is in the same directory which also needs to be `rwx` by only the `filter` user. The `c` script is the script that processes the email. The name `c` can be replaces with any program you would like. To get started we can simply just save the email to a file in the `/tmp` directory.

{{< highlight bash >}}
#!/bin/bash

# the mail will be in the $1 variable
# we will just create a temp file with
# the content of the mail
cat $1 > /tmp/mail
{{< / highlight >}}

Now every time any mail comes in, and I really mean any mail. All mails. That raw mail will be in the `/tmp/mail` file since it comes through the `filter` script then through the `c` script. This of course is constantly being overwritten for every mail that comes in, but you get the point.

