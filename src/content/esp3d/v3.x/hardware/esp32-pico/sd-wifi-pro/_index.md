+++
archetype = "section"
title = "FYSETC SD-WIFI-PRO"
description =  "FYSETC SD-WIFI-PRO"
weight = 17
+++

[github](https://github.com/FYSETC/SD-WIFI-PRO)


## Specs
* ESP32-PICO with 4MB flash memory, ceramic antenna, SD Card with no serial header, the sharing of SD card between ESP and printer/CNC is done by a multiplexer which make sharing reliable without risk of conflict, only one device can access to SD at once. 


![image](front.png?width=400px)
![image](pinout.png?width=400px)

{{% notice style="warning" title="Note"  %}}
Because there is no serial connection to printer, the features are limited to SD card access features
{{% /notice %}}
