---
description : "Frequent asked questions and their answers"
archetype : "section"
title : "FAQ"
menuPre : "<i class='fas fa-question'></i> "
weight : 7
---
* [Make boot silent](/esp3d-tft/v1.x/documentation/faq/#make-boot-silent)
<hr> 


### Make boot silent

At start the ESP board bootloader generate a report displayed on serial, this report may disturb communication with connected board.
It may vary depending on boards but generally look like this:
```
ets Jun  8 2016 00:22:57

rst:0x1 (POWERON_RESET),boot:0x17 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:1184
load:0x40078000,len:13104
load:0x40080400,len:3036
entry 0x400805e4
```
So make it silent is a must.

#### On ESP32
Bootloader report is not displayed if GPIO15 is connected to GND at startup.

#### On ESP32-S3
On ESP32-S3 bootloader report is always displayed by default, changing the behavior can be done only once for the pin GPIO46
in sdkconfig file change :
```
#
# Boot ROM Behavior
#
CONFIG_BOOT_ROM_LOG_ALWAYS_ON=y
# CONFIG_BOOT_ROM_LOG_ALWAYS_OFF is not set
# CONFIG_BOOT_ROM_LOG_ON_GPIO_HIGH is not set
# CONFIG_BOOT_ROM_LOG_ON_GPIO_LOW is not set
# end of Boot ROM Behavior
```   
by   
```
#
# Boot ROM Behavior
#
# CONFIG_BOOT_ROM_LOG_ALWAYS_ON=y
# CONFIG_BOOT_ROM_LOG_ALWAYS_OFF is not set
CONFIG_BOOT_ROM_LOG_ON_GPIO_HIGH=y
# CONFIG_BOOT_ROM_LOG_ON_GPIO_LOW is not set
# end of Boot ROM Behavior
```

Then flash the board, you can reverse the change in SDK config file after as it won't take in account anymore because the change is only allowed once.
On [Panlee](/esp3d-tft/v1.x/hardware/panlee/) and [HMI S3](/esp3d-tft/v1.x/hardware/hmis3/) the pin that trigger the bootloader report is the GPIO 46 and it is low at boot.
