+++
archetype = "section"
title = "Anycubic i3 mega - Trigorilla 8bit board"
description = "No socket available"
weight = 2
+++
To connect the ESP12e to the UART0. (Credits:[197-murdock](https://www.lesimprimantes3d.fr/forum/profile/197-murdock/)).  
(Green = RX, Blue = TX)  
5V (buck to 3.3v if directly connect to ESP - most development ESP boards already have this voltage limited built-in - but check!) and GND can be taken from the AUX3 exposed connector.  
UART0 is normally used by USB port so don't use both together - so this hack piggybacks on that same port at UART level.  

![step1](board.jpg?width=300px)

![step2](nodemcu.jpg?width=300px)

| <!-- -->  | <!-- --> |
|-|-|
| Board pins voltage | 5V |
| Board firmware | Marlin | 
| Board configuration note | None, it use same serial as USB port |
| ESP3D configuration note | Raw serial, no SD |