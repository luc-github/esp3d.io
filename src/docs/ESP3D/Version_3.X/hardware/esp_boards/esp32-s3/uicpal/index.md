---
archetype : "section"
title : "UICPAL ESP32 S3"
description :  "UICPAL ESP32 S3"
weight : 3
---

[AliExpress](https://aliexpress.com/item/1005006095863180.html)

## Specs
* ESP32-S3 with 16MB flash memory, 8MB PSRAM (qspi), 3D antenna, RGB led, Camera and SD card reader (SDIO 1bit)


![image](front.png?width=400px)
![image](schematic.png?width=400px)

## Pinout

SD:
| Function | GPIO|
| :-: | :-: |
| CMD | 39  |
| CLK | 42  | 
| D0  | 41  |

Camera: CAMERA_MODEL_UICPAL_ESP32S3

RGB Led:  WS2812_PIN  33
 

!!! warning "Note"
    The UART converter on this board requires DTR and RTS to be disabled in order to receive Serial output.

    In Platform.io, add the following lines:

    ```
    monitor_dtr = 0
    monitor_rts = 0
    ```

    Or if using arduino-cli, use the following arguments:

    ```
    $ arduino-cli monitor --port COM5 -c baudrate=115200,rts=off,dtr=off
    ```

    Arduino IDE does not support this board invidually and hacking the
    system files feels too much efforts. An easy workaround is to
    temporarily switch to "ESP Dev Module" when debugging and switch back
    to "ESPS3 Dev Module" when compiling.

    Solution found by [@levak](https://github.com/levak)



