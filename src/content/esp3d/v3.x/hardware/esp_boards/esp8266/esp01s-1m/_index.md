+++
archetype = "section"
title = "ESP01S 1M"
description = "ESP01S 1M"
weight = 3
+++

## Specs
* ESP8266 in ESP01 format (8 pins, VCC/CH_DP internally bridged ) with 1MB flash memory, ceramic antenna  

![image](front.png?width=400px)

{{% notice style="warning" title="Note"  %}}
Because flash is only 1MB, OTA/Web Update are not possible
{{% /notice %}}

### Pinout

| 1 | 2 | 3 | 4 |
|:-:|:-:|:-:|:-:|
|GND|IO02|IO0|RXD|
|TXD|CH_PD|RESET|VCC|
