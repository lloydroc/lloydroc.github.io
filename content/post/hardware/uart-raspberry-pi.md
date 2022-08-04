---
title: "Uart Raspberry Pi"
date: 2022-08-04T22:02:05Z
draft: false
---

@startuml
binary  "Data Frame" as D

@0
D is 1

@10
D is 0


@20
D is 0
@30
D is 0
@40
D is 1
@50
D is 0
@60
D is 0
@70
D is 1
@80
D is 0
@90
D is 0

@100
D is 1

@110
D is 1

highlight 0 to 10 #Gold;line:DimGrey : Start
highlight 100 to 110 #Gold;line:DimGrey : Parity
highlight 110 to 120 #Gold;line:DimGrey : Stop
@enduml

[UART Timing Diagram](/assets/svg/uart.svg)