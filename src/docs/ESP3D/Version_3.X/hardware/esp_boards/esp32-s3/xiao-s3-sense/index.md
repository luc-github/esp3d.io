---
archetype : "section"
title : "Seeed Studio XIAO ESP32S3 Sense"
description :  "Seeed Studio XIAO ESP32S3 Sense"
weight : 5
---
[Documentation](https://www.seeedstudio.com/XIAO-ESP32S3-Sense-p-5639.html)

## Specs
* ESP32-S3 with 8MB flash memory, 8MB PSRAM (opi), ipex connector antenna, oV2640 camera, Digital Microphone, SD Card reader


![image](front.png?width=400px)
![image](back.png?width=400px)
![image](pinout.png?width=400px)


SD (SPI):

| Function | GPIO|
|:-:|:-:|
|CS | 21 |
|CLK|7| 
|MISO|8|
|MOSI|9|

Camera: CAMERA_MODEL_XIAO_ESP32S3

!!! Note "Note"
    The USB port is USB Serial OTG, so it can be connected to printer/cnc USB port if supported, but it cannot be used as Serial communication with PC USB port, Serial port emulation is not implemented. For this you must use Serial pins of board and any ftdi or Serial/USB adaptor.

!!! Note "Note 2"
    The printer / CNC usb port usually does not provide any power, so you may need to power the board to mske it work.