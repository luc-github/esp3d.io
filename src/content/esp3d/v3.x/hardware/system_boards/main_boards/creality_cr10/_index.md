+++
archetype = "section"
title = "Creality CR10 Ender 3 board"
description = "No socket available"
weight = 11
+++
For the Sanguino based CR-10 and Ender printers you will need to solder to any of the via circled (can also be done in the backside of board), or to the legs of the Arduino or ftdi. Connect TX from the board to RX of Wemos D1 mini and RX from board to TX of Wemos D1 mini. 5v and GND are located in the six pin header next to the LCD connector.
  
![step1](board.jpg?width=300px)

Since soldering might be difficult because the solder points are so close to each other, another option is to scrape off the insulation from the traces on the backside and solder there. Be extra careful not to scrape the surrounding ground plane. You need suitable fine scraping tools for this. The picture below shows an Ender-2 PCB.

![step2](traces.jpg?width=300px)


| <!-- -->  | <!-- --> |
|-|-|
| Board pins voltage | 5v |
| Board firmware | Marlin | 
| Board configuration note | None, it use same serial as USB port so don't use both together |
| ESP3D configuration note | Raw serial, no SD |