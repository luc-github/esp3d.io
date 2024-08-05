---
archetype : "section"
title : "ESP01 1M Generic"
description : "ESP01 1M Generic Black"
weight : 2
---

## Specs
* ESP8266 in ESP01 format (8 pins) with 1MB flash memory, ceramic antenna 

![image](front.png?width=400px)

{{% notice style="warning" title="Note"  %}}
Because flash is only 1MB, OTA/Web Update are not possible
{{% /notice %}}

{{% notice style="warning" title="Be aware"  %}}
This ESP01 cannot be used on Bigtreetech boards as it is, a small rework is necessary to bridge VCC pin with CH_PD pin
![bridge](bridge.png?width=400px)

{{% /notice %}}

### Pinout

| 1 | 2 | 3 | 4 |
|:-:|:-:|:-:|:-:|
|GND|IO02|IO0|RXD|
|TXD|CH_PD|RESET|VCC|