+++
archetype = "section"
title = "Arduino IDE"
weight = 2
+++

## Prepare the development environment
* Please download ide from https://www.arduino.cc/en/software
{{% notice style="orange" title="Warning" icon="exclamation" %}}
Please use the Legacy IDE (1.8.X) or the latest Arduino IDE 2.X 
{{% /notice %}}


* Install the esp core according your target: 
   - [ESP8266](https://github.com/esp8266/arduino#contents)

     {{% notice style="orange" title="Warning" icon="exclamation" %}}
Please use the version 3.1.1. 
{{% /notice %}}  

   - [ESP32](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)

      {{% notice style="orange" title="Warning" icon="exclamation" %}}
Please use the version 2.0.6.
{{% /notice %}}  

* Copy the content of the [libraries directory](https://github.com/luc-github/ESP3D/tree/3.0/libraries) and [extra libraries directory](https://github.com/luc-github/ESP3D/tree/3.0/extra-libraries) (according your target [ESP8266](https://github.com/luc-github/ESP3D/tree/3.0/extra-libraries/ESP8266) or [ESP32](https://github.com/luc-github/ESP3D/tree/3.0/extra-libraries/ESP32) ) to your arduino library directory

   {{% notice style="orange" title="Warning" icon="exclamation" %}}
Do not try any version different than the ones provided, they may not work properly. 
{{% /notice %}}  


## Open esp3d/esp3d.ino file in Arduino IDE

![vscode](/esp3d/v3.x/installation/arduinoIde.png?width=400px)

## ESP3D configuration   

Open esp3d/configuration.h and set features you want.

You can also generate it, using the ESP3D configurator, which simplify a lot this step.    
{{% iobadge url="https://luc-github.github.io/" path="https://img.shields.io/badge/ESP3D-Configurator-red?plastic&logo=preact" %}} 

{{% include file="esp3d/v3.x/installation/configuration.md" %}}

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

