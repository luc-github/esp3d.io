---
archetype : "section"
title : "Azteeg X5 mini WIFI"
description : "Azteeg X5 mini WIFI"
weight : 16
---

## Specs
* ESP8266 with 4MB flash memory, ceramic antenna, allow to share SD card SPI pins between ESP and Azteeg SD card reader 

Fom [Panucatt devices](https://www.panucatt.com/azteeg_X5_mini_reprap_3d_printer_controller_p/ax5mini.htm)

![image](azteeg.png?width=400px)

## Pinout

|Pin | Function | Description |
|:-:|:-:|:-:|
|IO05| CS SPI||
|IO04| SD Detect pin| Low = SD present|
|IO0| Flag pin| ESP = LOW, Printer = HIGH|
