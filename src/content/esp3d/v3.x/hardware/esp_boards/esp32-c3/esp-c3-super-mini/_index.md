+++
archetype = "section"
title = "ESP-C3-Super-Mini"
description =  "ESP-C3-Super-Mini"
weight = 3
+++

[Specifications](https://www.tindie.com/products/adz1122/esp32-c3-development-board-esp32-supermini/)

## Specs
* ESP32-C3 (single-core)  with 4MB flash memory, ceramic antenna, USB port is USB not UART


![image](front.jpeg?width=400px)
![image](back.png?width=400px)


{{% notice style="orange" title="Warning" icon="exclamation" %}}
This board has been reporting having hardware issues, please check the [forum](https://github.com/espressif/arduino-esp32/issues/6430) for more information.

A workaround is to add or enable in configuration.h:

`#define ESP32_WIFI_TX_POWER WIFI_POWER_15dBm`

You may also need to lower the value if not working, the possible values are `WIFI_POWER_5dBm`, `WIFI_POWER_8_5dBm`, `WIFI_POWER_15dBm` 

{{% /notice %}}

