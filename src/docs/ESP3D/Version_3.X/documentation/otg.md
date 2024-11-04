---
description : "USB Serial OTG"
archetype : "section"
title : "About USB Serial OTG"
menuPre : "<i class='fas fa-file-upload'></i> "
weight : 7
---

## About USB Serial OTG

On ESP32-S2 and ESP32-S3 the USB Serial OTG can be enabled.
This allows to connect the USB OTG port to the 3D printer/CNC usb port if this one has Silicon Labs CP210x, FTDI FT23x or CP34x USB to UART converter.

!!! Note
    Be noted the printer 3D/CNC usb port may not provide current to power the ESP board. So you may need to add a power supply to the ESP3D board.

!!! Note
    Enabling USB Serial OTG at compilation does not activate the default output as USB Serial, by default it is Serial output.   
    To allow manual configuration, you need to enable USB output using WebUI or [ESP950] command