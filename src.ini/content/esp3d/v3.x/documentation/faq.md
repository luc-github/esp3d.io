+++
description = "Frequent asked questions and their answers"
archetype = "section"
title = "FAQ"
menuPre = "<i class='fas fa-question'></i> "
weight = 7
+++
* [Make boot silent](/esp3d/v3.x/documentation/faq/#make-boot-silent)
<hr> 


### Make boot silent

At start the ESP board bootloader generate a report displayed on serial, this report may disturb communication with connected board.
It may vary depending on boards but generally look like this:
```
ets Jun  8 2016 00:22:57

rst:0x1 (POWERON_RESET),boot:0x17 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:1184
load:0x40078000,len:13104
load:0x40080400,len:3036
entry 0x400805e4
```
So make it silent is a must.

#### On ESP32
Bootloader report is not displayed if GPIO15 is connected to GND at startup.

#### On ESP32-S3 / ESP32-S2 / ESP32-C3

On ESP32-S3/S2/C3 bootloader report is always displayed by default, changing the behavior can be done only once for the pin GPIO46.

Use `[ESP999]QUIETBOOT pwd=<admin/user password>`

#### On ESP8266
It is not possible to make the boot silent on ESP8266.