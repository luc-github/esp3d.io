---
archetype : "section"
title : "MKS Robin Nano board"
description : "Socket available"
weight : 14
---
This board has a socket for MKS WiFi module (16 pins)
![step1](board.png?width=300px)

| <!-- -->  | <!-- --> |
|-|-|
| Board pins voltage | 3.3v |
| Board firmware | Marlin | 
| Board configuration note | Enable MKS UI to be able to use MKS protocol  |
| ESP3D configuration note | MKS serial, no SD |

alternative solution using raw serial:
| <!-- -->  | <!-- --> |
|-|-|
| Board configuration note |  Enable second serial port in firmware configuration |
| ESP3D configuration note | Raw serial, no SD |
