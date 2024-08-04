---
archetype : "section"
title : "Features"
menuPre : "<i class='fas fa-list'></i> "
weight : 1
---
The V2.1.X features are :   

* Support for ESP8266, ESP8285 and standard ESP32 board with at least 1Mb of flash
* Serial/Wifi bridge using configurable port 8888
* Reset settings using GPIO2 pin 
* Complete configuration by web browser (Station or Access point) or by Serial/telnet commands
* Authentication (optional) for better security
* Update firmware by web browser for 4MB boards
* Captive portal in Access point mode which redirect all unknow call to main page
* mDNS, this feature is a discovery protocol, it need bonjour installed on computer, supported outof the box by OSX, on Windows and Linux need to be installed
* SSDP, this feature is a discovery protocol, supported on Windows out of the box
* Fail safe mode (Access point)is enabled if cannot connect to defined station at boot.
* Embedded FS uploader and updater
* Basic OLED screen support  
* Notifications using Line / Pushover / Email
* DHT sensor support
* Direct pins control using ESP commands