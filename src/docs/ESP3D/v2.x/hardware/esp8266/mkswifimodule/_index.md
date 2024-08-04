---
archetype : "section"
title : "MKS WiFi Module V1.1 (16 pins)"
description : "MKS WiFi Module V1.1 (16 pins)"
weight : 9
---

## Specs
* ESP8266 with 4MB flash memory, ceramic antenna

[github](https://github.com/makerbase-mks/MKS-WIFI)

![image](mkswifimodule.png?width=400px)

### Pinout

| 1 | 2 |
|:-:|:-:|
|RESET|TX|
|ADC|RX|
|CH_PD|IO5 |
|IO16|IO4|
|IO14|IO0|
|IO12|IO2|
|IO13|IO15|
|3.3V|GND|

{{% notice style="warning" title="Note"  %}}
MKS file upload is not supported, use ESP3D 3.0 or later for MKS protocol support
{{% /notice %}}
