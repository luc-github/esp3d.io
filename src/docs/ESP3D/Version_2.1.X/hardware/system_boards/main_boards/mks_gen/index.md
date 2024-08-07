---
archetype : "section"
title : "MKS GEN v1.2 to 1.4 board"
description : "No socket available"
weight : 13
---


An ESP12E with the standard schematics, the two resistor connected to the RX pin are substituted by a 1N4148 diode, like in the Adafruit Huzzah board.  

![step1](wires.png?width=300px)

ESP12E is connected to the AUX1

ESP12E RX is connected to the pin NEAR GND of the upper row (Marked TXD on pinout.)  
ESP12E TX is connected to the adiacent pin at the end of the upper row (Marked RXD on pinout.)

![step2](board.png?width=300px)


| <!-- -->  | <!-- --> |
|-|-|
| Board pins voltage | 5v |
| Board firmware | Marlin | 
| Board configuration note | None, it use same serial as USB port so don't use both together |
| ESP3D configuration note | Raw serial, no SD |