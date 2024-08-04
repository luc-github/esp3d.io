---
archetype : "section"
title : "VSCode & Platformio"
weight : 2
---

## Prepare the development environment

* Download and install [VSCode](https://code.visualstudio.com/download)

* Add [PlatformIO IDE extension](https://platformio.org/install/ide?install=vscode) to VSCode

## Open the ESP3D directory folder in VSCode
The first time you open the project, vscode need to download all necessary files, so be patient

![vscode](/esp3d/v2.x/installation/open_vscode2_1.png?width=400px)

{% include-markdown "./configuration.md" %}

## Select the target in VSCode

![vscode](/esp3d/v2.x/installation/vscode2_1.png?width=400px)

* [env:esp32dev] for ESP32 boards   
* [env:esp8266] for ESP8266 boards with 4MB flash   
* [env:esp01s_160mhz-2.7.4] for ESP8266 boards with 1MB flash   

## [Connect your board](/esp3d/v2.x/installation/#connect-your-board)

## Compile and flash your module

Use Upload and monitor from the target environment you selected to compile and flash your module.