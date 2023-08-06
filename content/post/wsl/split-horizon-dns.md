---
title: Split Horizon DNS WSL
date: "2023-05-16"
categories:
- wsl
- networking
draft: true
---

# {{ <title> }}

netsh interface portproxy add v4tov4 listenport=53 listenaddress=172.17.253.106 connectport=53 connectaddress=172.17.253.106
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=172.17.253.106 connectport=8080 connectaddress=172.17.253.106

service rsyslog start

netsh interface portproxy show all

netsh interface portproxy reset

python3 -m http.server 7800