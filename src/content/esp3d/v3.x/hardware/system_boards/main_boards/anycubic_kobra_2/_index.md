+++
archetype = "section"
title = "Anycubic Kobra 2 - Trigorilla Pro B V1.0.2 board"
description = "No socket available"
weight = 2
+++

Trigorilla Pro B V1.0.2 board

![board](main.png?width=300px)

To connect you can use pins 2 and 3 of the CH340G chip.
(Orange = RX, White = TX)
GND and 3.3V can be taken from left side of the board.
Baud rate is 115200.

![step1](board.jpg?width=300px)

| <!-- -->  | <!-- --> |
|-|-|
| Board pins voltage | 3.3V |
| Board firmware | Marlin |
| Board configuration note | None, it use same serial as USB port so don't use both together|
| ESP3D configuration note | Raw serial, no SD |
