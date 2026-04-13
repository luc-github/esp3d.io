---
archetype : "home"
title : "Version 1.X"
weight : 1
---

[![badge](https://img.shields.io/badge/ESP3D-1.X_alpha-red?style=plastic&logo=github)](https://github.com/luc-github/ESP3D-TFT/tree/main)
[![badge](https://img.shields.io/github/commit-activity/y/luc-github/ESP3D-TFT/main?style=plastic)](https://github.com/luc-github/ESP3D-TFT/tree/main)
[![badge](https://img.shields.io/github/last-commit/luc-github/ESP3D-TFT/main?style=plastic)](https://github.com/luc-github/ESP3D-TFT/tree/main)
[![badge](https://github.com/luc-github/ESP3D-TFT/workflows/build-ci/badge.svg)](https://github.com/luc-github/ESP3D-TFT/actions/workflows/build-ci.yml)
[![badge](https://img.shields.io/discord/752822148795596940?color=blue&label=discord-esp3d&logo=discord)](https://discord.gg/Z4ujTwE)
[![badge](https://img.shields.io/badge/IDF-v5.1.2-blue?style=plastic&label=IDF&logo=espressif)](https://github.com/espressif/esp-idf)


This version is the development version, features can change anytime, feedback, PR and suggestions are welcome.

Firmware should work with the following firmwares:   

* [Repetier 1.0](https://www.repetier.com/documentation/repetier-firmware/)
* [Marlin 1.X/2.X](https://marlinfw.org/)
* [Smoothieware 1.x](https://smoothieware.org/)
* [grbl 1.x](https://github.com/gnea/grbl) 
* [grblHAL](https://github.com/grblHAL)

The communication between ESP board and target board is done by serial or by USB depending of ESP32 board. 

The firmware must be used with [ESP3D-WEBUI 3.X](/esp3d-webui/v3.x/)

### Estimated planning
```mermaid
gantt
        dateFormat  YYYY-MM-DD
        title ESP3D-TFT Planning
        section Code Study
        IDF FrameWork Study        :done,    des1, 2022-08-24,2022-09-05
        Code project definition    :done,    des2, 2022-09-06, 2022-09-16
        section Code implementation
        Drivers implementation     :done,    des3, 2022-09-16, 2022-10-06
        Serial implementation      :done,    des4, 2022-10-07, 2022-10-12
        ESP3D Commands API         :done,    des5, 2022-10-13, 2022-10-23
        Filesystem API             :done,    des6, 2022-10-24, 2022-10-27
        Network implementation     :done,    des7, 2022-10-28, 2022-11-03
        SD API                     :done,    des8, 2022-11-04, 2022-11-06
        HTTP Server                :done,    des9, 2022-11-07, 2022-12-04
        WebSocket Server code base :done,    des10, 2022-12-04, 2022-12-05
        Tests and Bug fixes        :done,    des11, 2022-12-05, 2022-12-11
        Update feature             :done,    des12, 2022-12-11, 2022-12-12
        Notifications feature      :done,    des13, 2022-12-13, 2022-12-19
        mDNS feature               :done,    des14, 2022-12-19, 2022-12-20
        SSDP feature               :done,    des15, 2022-12-19, 2022-12-30
        Telnet server feature      :done,    des16, 2022-12-31, 2023-01-07
        Tests and Bug fixes        :done,    des17, 2022-12-31, 2023-01-15
        USB Host feature           :done,    des18, 2023-01-16, 2023-01-18
        Build-CI implementation    :done,    des19, 2023-01-18, 2023-01-22
        Authentication implementation    :done,    des20, 2023-01-23, 2023-02-12
        esp3d.io setup     :done,    des21, 2023-02-13, 2023-02-26
        Tests and Bug fixes        :done,    des22, 2023-02-26, 2023-02-27
        Streaming Host             :active, des23, 2023-02-27, 60d
        TFT UI definition          :        des24, after des23, 7d
        TFT UI mockup              :        des25, after des24, 7d
        TFT UI implementation      :        des26, after des25, 60d
        Tests and Bug fixes        :        des27, after des26, 7d
        WebDAV implementation      :        des28, after des27, 14d
        Bluetooth implementation   :        des29, after des28, 7d
        Buzzer support             :        des30, after des29, 7d
        Pins control support       :        des31, after des30, 7d
        Auto script support at start :      des32, after des31,  7d
```
