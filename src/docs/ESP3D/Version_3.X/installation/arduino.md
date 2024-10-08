---
archetype : "section"
title : "Arduino IDE"
weight : 2
---

## Prepare the development environment
* Please download ide from https://www.arduino.cc/en/software

!!! warning "Note"
      Please use the Legacy IDE (1.8.X) or the latest Arduino IDE 2.X 



* Install the esp core according your target:    

      &#9755;&nbsp;If [ESP8266](https://github.com/esp8266/arduino#contents)

!!! warning "Note"
      Please use the version 3.1.1. 
   
   &nbsp;&nbsp;&nbsp;&nbsp;&#9755;&nbsp;If [ESP32](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)

!!! warning "Note"
      Please use the version 3.0.4.


* Copy the content of the [libraries directory](https://github.com/luc-github/ESP3D/tree/3.0/libraries) and [extra libraries directory](https://github.com/luc-github/ESP3D/tree/3.0/extra-libraries) (according your target [ESP8266](https://github.com/luc-github/ESP3D/tree/3.0/extra-libraries/ESP8266) or [ESP32](https://github.com/luc-github/ESP3D/tree/3.0/extra-libraries/ESP32) ) to your arduino library directory

!!! warning "Note"
      Do not try any version different than the ones provided, they may not work properly. 


## Open esp3d/esp3d.ino file in Arduino IDE

<center>
![image](./arduinoIde.png){ width="400" }
</center>

## ESP3D configuration   

Open esp3d/configuration.h and set features you want.

You can also generate it, using the ESP3D configurator, which simplify a lot this step.   

[![badge](https://img.shields.io/badge/ESP3D-Configurator-red?plastic&logo=preact)](https://luc-github.github.io/)

{% include-markdown "./configuration.md" %}

## Configure Flash settings

### For ESP8266 with 4MB of flash

* Board: Generic ESP8266 Module
* Upload Speed:  115200
* CPU frequency: 160 MHz
* Flash Size:  4M (2M SPIFFS)
* Flash Mode: DIO
* Flash Frequency: 40Mhz
* Reset Method: CK
* Debug Port: Disabled
* Debug Level: None

### For ESP8266 with 1MB of flash (this one may not support Web Update due to limited flash size)

* Board: Generic ESP8266 Module
* Upload Speed:  115200
* CPU frequency: 160 MHz
* Flash Size:  1M (128K SPIFFS)
* Flash Mode: DIO
* Flash Frequency: 40Mhz
* Reset Method: CK
* Debug Port: Disabled
* Debug Level: None

### For ESP32 with 4MB of flash

* Board: ESP32 Dev Module
* Upload Speed:  115200
* CPU frequency: 240 MHz 
* Flash Frequency: 80Mhz
* Flash Mode: QIO
* Flash Size:  4MB
* Partition Scheme: Default 4MB with SPIFFS
* Core Debug Level: None
* PSRAM: Disabled

### For ESP32 with 4MB of flash and Camera

* Board: ESP32 Dev Module
* Upload Speed:  115200
* CPU frequency: 240 MHz 
* Flash Frequency: 80Mhz
* Flash Mode: QIO
* Flash Size:  4MB
* Partition Scheme: Default 4MB with SPIFFS
* Core Debug Level: None
* PSRAM: Enabled


## [Connect your board](/esp3d/v3.x/installation/#connect-your-board)

## Compile and flash your module

Select the port you device is connected to and select `Upload` from sketch menu to compile and flash.

