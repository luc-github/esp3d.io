---

title : "ESP01 1M Generic"
description : "ESP01 1M Generic Black"
---

## Specs
* ESP8266 in ESP01 format (8 pins) with 1MB flash memory, ceramic antenna 

![image](/img/hardware/esp_boards/esp8266/esp01-1m-generic/front.png?width=400px)

<aside class="warning-panel">
  <p><strong>Warning:</strong></p>
  Because flash is only 1MB, OTA/Web Update are not possible
</aside>


<aside class="warning-panel">
  <p><strong>Warning:</strong></p>
  This ESP01 cannot be used on Bigtreetech boards as it is, a small rework is necessary to bridge VCC pin with CH_PD pin
  ![bridge](/img/hardware/esp_boards/esp8266/esp01-1m-generic/bridge.png?width=400px)
</aside>



### Pinout

| 1 | 2 | 3 | 4 |
|:-:|:-:|:-:|:-:|
|GND|IO02|IO0|RXD|
|TXD|CH_PD|RESET|VCC|
