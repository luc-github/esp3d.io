+++
archetype = "section"
title = "Freenove ESP32 S3"
description =  "Freenove ESP32 S3"
weight = 3
+++

[Github](https://github.com/Freenove/Freenove_ESP32_S3_WROOM_Board)

## Specs
* ESP32-S3 with 8MB flash memory, 8MB PSRAM (opi), ceramic antenna, RGB led, Camera and SD card reader (SDIO 1bit)


![image](front.jpg?width=400px)
![image](pinout.png?width=400px)

## Pinout

SD:
| Function | GPIO|
|:-:|:-:|
|CMD | 38 |
|CLK|39| 
|D0|40|

Camera: CAMERA_MODEL_ESP32S3_EYE

RGB Led:  WS2812_PIN  48
 

{{% notice style="orange" title="Warning" icon="exclamation" %}}
This board may have a significant grounding or EMI issue.    

If you experience poor performance when PSRAM is enabled, such as the web UI taking 20 seconds to load in the browser or camera lag, you can try a workaround:

Plug the board into a breadboard, making sure that each pin does not connect to any others, in order to shield the external pins. Additionally, apply pressure to the ESP shield with your finger. The performance should return to normal within a couple of seconds.   

Solution found by [@levak](https://github.com/levak)
{{% /notice %}}


