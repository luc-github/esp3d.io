+++
archetype = "section"
title = "Features"
menuPre = "<i class='fas fa-bullhorn'></i> "
weight = 1
+++

* Serial/Wifi bridge using configurable port 8888
* Use GPIO2 to ground to reset all settings in hard way - 2-6 sec after boot / not before!! Set GPIO2 to ground before boot change boot mode and go to special boot that do not reach FW. Currently boot take 10 sec - giving 8 seconds to connect GPIO2 to GND and do a hard recovery for settings
* Complete configuration by web browser (Station or Access point) or by Serial/telnet commands
* Authentication (optional) for better security
* Update firmware by web browser
* Captive portal in Access point mode which redirect all unknow call to main page
* mDNS which allows to key the name defined in web browser and connect only with bonjour installed on computer
* SSDP, this feature is a discovery protocol, supported on Windows out of the box
* Fail safe mode (Access point)is enabled if cannot connect to defined station at boot.
* Embedded FS uploader and updater.
* OLED screen support  
* Notifications using Line / Pushover / email