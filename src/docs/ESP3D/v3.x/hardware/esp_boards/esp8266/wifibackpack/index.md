---
archetype : "section"
title : "WiFI backpack"
description : "WiFI backpack"
weight : 15
---

## Specs
* ESP8266 with 4MB flash memory, ceramic antenna/ipex connector, allow to share SD card SPI pins between ESP and printer SD card reader 

Fom [Panucatt devices](https://www.panucatt.com/product_p/wb8266.htm)

![image](wifibackpack_rrdgl.png?width=400px)
![image](wifibackpack_viki.png?width=400px)

## Pinout

|Pin | Function | Description |
|:-:|:-:|:-:|
|IO05| CS SPI||
|IO04| SD Detect pin| Low = SD present|
|IO0| Flag pin| ESP = LOW, Printer = HIGH|
