---
title: COI with Dovecot
comments: true
date: "2020-11-20"
categores:
 - unix
tags:
 - coi
---

# {{< title >}}

I recently discovered [Chat Over IMAP](https://www.coi-dev.org). It looks like a promising technology that has a lot to offer. I'm currently hosting email on my [lloydroc.github.io](/) domain with Postfix/Dovecot and in this post I'll modify my Dovecot configuration to work with COIand then try the [Delta Chat](https://delta.chat) application. I had originally planned for an hour or two of work, however, to get COI configured on Dovecot literally less than 5 minutes!

TL;DR In this post I'll create a COI Compliant Email Server and use it with the [Delta Chat](https://delta.chat) application.

At the time of this writing the Dovecot COI functionality is in Beta.

# Current Email Server Setup

I have Postfix and Dovecot running on my Linode Server that hosts this very site. To be fair OpenDKIM is sprinklined in as well. To get these technologies set up is a decent learning curve but once you climb up the curve, I've found it to be enjoyable and fun. Yep, I'm crazy. I'd like to hope that I have a pretty much plain vanilla email server setup going. Here are the bullet points on the email server configuration. I didn't want to turn this post into my entire email server configuration. Just the parts to make it COI compliant.

* MTA is Postfix
* MUA is Dovecot
* SMTPS/IMAP/POP3 and I have SSL certs for imap.lloydroc.github.io, smtp.lloydroc.github.io and mail.lloydroc.github.io
* DKIM is Enabled with OpenDKIM
* Postfix is setup to have `virtual_aliases`, `virtual_domains`. I originally had these alias served by MySQL, but now host them directly through the `hash` database that is provided by Postfix since it's more simple and less work than MySQL for my small use case.
* Postfix delivers mail over LMTP via Unix Domain Socket to Dovecot. Dovecot has a static `userdb` and I'm using `sqlite` for the `passdb`. Again, this choice was made for simplicity on a small scale.
* Sieve is not enabled

If you haven't setup a Postfix/Dovecot stack or a Mail Server the above may look quite foreign.

# COI Setup

Let's first look at my directory structure configuration for Dovecot:

{{< highlight bash "linenos=table,hl_lines=9">}}
$ tree /etc/dovecot
/etc/dovecot
├── conf.d
│   ├── 10-auth.conf
│   ├── 10-logging.conf
│   ├── 10-mail.conf
│   ├── 10-master.conf
│   ├── 10-ssl.conf
│   ├── 20-coi.conf
│   └── auth-sql.conf.ext
├── dovecot.conf
└── dovecot-sql.conf.ext

1 directory, 9 files
{{< /highlight >}}

The main file here is `20-coi.conf` where the content comes straight out of the [Dovecot Configuration](https://doc.dovecot.org/configuration_manual/coi/). Here are the contents:

## Dovecot COI Configuration

{{< highlight bash >}}
# file /etc/dovecot/conf.d/20-coi.conf
mail_plugins = $mail_plugins notify push_notification webpush

protocol imap {
  mail_plugins = $mail_plugins imap_coi
}

protocol lmtp {
  mail_plugins = $mail_plugins lmtp_coi
}

mail_attribute_dict = file:%h/dovecot-attributes
imap_capability = +IDLE WEBPUSH
{{< /highlight >}}

# Dovecot Main Configuration

There is nothing exciting in the Dovecot Configuration. It's pretty much what you get out of the box. See line 9 where it will reference our file `conf.d/20-coi.conf` via regular expression.

{{< highlight bash "linenos=table,hl_lines=9">}}
# file /etc/dovecot/dovecot.conf
!include_try /usr/share/dovecot/protocols.d/*.protocol
protocols = imap pop3 lmtp
auth_verbose = yes
verbose_ssl = yes
auth_debug = yes
mail_debug = yes
postmaster_address=lloyd at lloydroc.github.io
!include conf.d/*.conf
{{< /highlight >}}

# Delta Chat Application

The Delta Chat application supports COI and is perfect use for our Dovecot server. Messages are stored on the email server where you have your mail. There are not "central chat servers". The hitch here is you have to log into your email account and put it's password into another app. This is a security risk, but I digress.

Signing into Delta Chat just works with Dovecot. I had no issues and was able to sign in. You can see above I have logging fully enabled and it looked good.

## Download the Delta Chat App

Once the Delta Chat App is installed you'll see a screen like this:

![Delta Chat Welcome](/assets/jpg/coi/delta_chat_welcome.jpg)

Push the "LOG IN TO YOUR SERVER" button.

## Sign into your Dovecot Server

Now is where you type in your email address and your password that Dovecot has. The mail server needs to be configured so that it's auto-discoverable.

![Delta Chat Login](/assets/jpg/coi/delta_chat_login.jpg)

Press the checkmark and it will attempt to log in.

## Send a Message

Now that we're logged into Delta Chat we can send a message.

![Delta Chat chat](/assets/jpg/coi/delta_chat_chat.jpg)

I just typed "Hello" and waited in suspense.

# Chat Message on Dovecot

My Dovecot configuration puts mail into the folder `/var/mail/vhosts/lloydroc.github.io/lloyd/` for the user `lloyd.rochester@gmail.com`. We can see a folder was created. There are 3 chat messages in the `.DeltaChat/cur` folder. Note, after the picture above with the "Hello" message I sent some from another COI messenger app to it.

{{< highlight bash >}}
$ tree .DeltaChat/
.DeltaChat/
├── cur
│   ├── 1605904324.M526664P2772750.lloydroc.github.io,S=3088,W=3158:2,S
│   ├── 1605904919.M721464P2772874.lloydroc.github.io,S=3075,W=3144:2,S
│   └── 1605904949.M343848P2772874.lloydroc.github.io,S=3067,W=3136:2,S
├── dovecot.index.cache
├── dovecot.index.log
├── dovecot-uidlist
├── maildirfolder
├── new
└── tmp

3 directories, 7 files
{{< /highlight >}}

## COI Message Content

Let's look at the content of a COI Message. Note, the content is all encrypted. This encryption is happening by Delta Chat.

{{< highlight bash >}}
$ cat .DeltaChat/cur/1605904949.M343848P2772874.lloydroc.github.io,S=3067,W=3136:2,S
Return-Path: <lloyd.rochester@gmail.com>
Delivered-To: lloyd.rochester@gmail.com
Received: from smtp.lloydroc.github.io
	by lloydroc.github.io with LMTP
	id +LpqFDUquF+KTyoAvZbG3w
	(envelope-from <lloyd.rochester@gmail.com>)
	for <lloyd.rochester@gmail.com>; Fri, 20 Nov 2020 20:42:29 +0000
Received: from localhost (174-29-249-252.hlrn.qwest.net [174.29.249.252])
	by smtp.lloydroc.github.io (Postfix) with UTF8SMTPSA id 4005DF0A0B
	for <lloyd.rochester@gmail.com>; Fri, 20 Nov 2020 20:42:29 +0000 (UTC)
DKIM-Signature: v=1; a=rsa-sha256; c=simple/simple; d=lloydroc.github.io;
	s=default; t=1605904949;
	bh=IGwd6M/fTlId6E4aeOCaM4V1HIvYSOjYrunVhFXOcZc=;
	h=Date:To:From:Subject;
	b=XCwXwflQtbKwrQAWOhRnZ6LY0RZzWk+Lmg7yiaGC5d5HIvKvfCFn/fxAtoOIgSTRY
	 Vfi9n+no66rL6B+n2M67REW1db1oo8wj5sY2NoauTbUDIAY5lU/j4jFqvyUGj8sXBK
	 QcHMZrXaXAp4hXZ2rK/zhRraZqBbgIzefTvsxEBEjgsFqV/FCb+w7xVzQwE/ZHVvnh
	 DyO1ZKQ0Rjhf7YieDvbA/9SCSzmdWd5G34fVIYnHEL9Bm+0e/9TqI8ealEXYwFi9YN
	 v2R/eNB+HivQsZUEcVOBiSYalsDhA95Fj7I8bUr8mpMgQ+OLHiI7vkab38xxuNCD3v
	 nhEqXI8T7DTrA==
Date: Fri, 20 Nov 2020 20:42:28 +0000
X-Mailer: Delta Chat Core 1.28.0/Android
Chat-Version: 1.0
Autocrypt: addr=lloyd.rochester@gmail.com; prefer-encrypt=mutual;
	keydata=xjMEX7gqBxYJKwYBBAHaRw8BAQdAP/Yoxk3z1njxbd8UoBGeEj/67JdpHfNlC8RipJCicm
	fNGjxsbG95ZEBsbG95ZHJvY2hlc3Rlci5jb20+wosEEBYIADMCGQEFAl+4KgcCGwMECwkIBwYVCAkK
	CwIDFgIBFiEETYWnDA6T3i86tV4kYkPyN8OmE0cACgkQYkPyN8OmE0ekNAD/R1VnRPWqr2BLvvoP+K
	6rfWXEWpgwTWNqKyK92WPgRokBAKQ1VI2XjrwTa/Fnc0565QmRMlGA4TdAqLAremcg4W4HzjgEX7gq
	BxIKKwYBBAGXVQEFAQEHQN+upAW1TK31+/aMkpOWZPOrnLeng9Wm3MWNwQsZDnVqAwEIB8J4BBgWCA
	AgBQJfuCoHAhsMFiEETYWnDA6T3i86tV4kYkPyN8OmE0cACgkQYkPyN8OmE0dg/AEAhpFCjvPK4hAC
	Z4eJkQmECkDPVvfln6pLxahaSiiIxqQA+wYWoGKg2FJzxS1yZmoYEIg9kug24wUPC+Fid2B+ncoI
Message-ID: <chat$LLpikKHw-3O.YBLKmPcQ-xL@lloydroc.github.io>
To: <lloyd.rochester@gmail.com>
From: =?utf-8?q??= <lloyd.rochester@gmail.com>
Subject: ...
Content-Type: multipart/encrypted; protocol="application/pgp-encrypted";
	boundary="iQZ34QxJGUFu3AKB7J7Q0BgQcuDc1r"


--iQZ34QxJGUFu3AKB7J7Q0BgQcuDc1r
Content-Type: application/pgp-encrypted
Content-Description: PGP/MIME version identification

Version: 1


--iQZ34QxJGUFu3AKB7J7Q0BgQcuDc1r
Content-Type: application/octet-stream; name="encrypted.asc"
Content-Description: OpenPGP encrypted message
Content-Disposition: inline; filename="encrypted.asc";

-----BEGIN PGP MESSAGE-----

wU4DVxejlenTP7oSAQdAco3yoewrjM6w5ZjR6t6uwbLpdM3rwQPn0ludn8UbYz4g
UKaBH1zM2vWYPjtCY10VNoqzHD9ogPfItigjy65XsXnSwKkBS7TEoCJfwMmsp/3j
nHiB948p4I1DsO2Tamy3gf7ni/gi5B5CEiFCZqt4IztYAXZ87DAdU4GG29XIg10M
POppm/V/5y6lOUqKTQFQV30xaAecgTvEn600zLer5ad5gFse2lZ1m3DDkJbjLtqz
rONJtQ/gF5EHf9hQ++VJ5po+14b1+hwWEbPoQVHL/DPTGzoSDmoQYRqa04z1pQjh
jvQkJTAfKdLQGh+C5iuvaELbVabMgK2sEaVn9eIXIJ4NVa4xVhYm6LSgxWkMnjMC
iKywgav3hzDkT3/nZP/kgI/oGBLns7kS3cALVSQrWqgwAieHV0GEMyb0LBvtgOTq
8EqKPAGnERL/0jbOOOZtExzvYmM3rk9TFQYAJegWvGlKETWI/piHiFLFuXn+fgGv
ooBgVbutoIZB2vIFt69IdY6foOc5+nj/NK58OLzo20+SMbDCVteLWV9p6zN/wrsS
ZfiVXbdlx4c+0Xhv
=zLdD
-----END PGP MESSAGE-----


--iQZ34QxJGUFu3AKB7J7Q0BgQcuDc1r--
{{< /highlight >}}

# Final Thoughts

This is a cool technology that opens a lot of doors. If you want to build Chat into your application it's easier to do. You do have to ensure the email your user provides is COI Compliant, and have a means to send and receive the chats over IMAP. But once you do this you can send chats with attachments and all sorts of other things the mail system provides.

The fact that you have to provide your IMAP password to a 3rd party is a risk and it makes it more risky to use the same email account for both email and chat if you have separate applications.

From what I know so far is that each Application does their own encryption, thus, having multiple applications used for the same chat isn't possible. Here is an example. I downloaded Delta Chat App and created a chat to myself. I then downloaded the [OX COI Messenger](https://github.com/coi-dev/ox-coi) - which is currently not active. I then sent a message from the *OX COI Messenger* to myself which popped up on the Delta Application. The problem is you cannot read the message sent from *OX COI Messenger* in the *Delta Chat* since it cannot create it. Note, this maybe limitations in features on the *OX COI Messenger* application as when I send messages in *Delta Chat* I don't see them in the *OX COI Messenger App*.

Here is the chat I sent to myself:
![OX Messenger Chat to Self](/assets/jpg/coi/ox_messenger_self_chat.jpg)

Here is what popped up in Delta Chat:
![Delta Chat Unable to Decrypt](/assets/jpg/coi/delta_unable_to_decrypt.jpg)
