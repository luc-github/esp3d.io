---
archetype : "section"
title : "Olimex ESP32-Gateway"
description :  "Olimex ESP32-Gateway"
weight : 21
---

From [Olimex](https://github.com/OLIMEX/ESP32-GATEWAY)

## Specs
* ESP32 with 4MB flash memory, Micro SDIO Card reader, ceramic antenna, RJ45 ethernet port

!!! info "Note"
    Network is available to only for one peripheral at a time. It support only Wi-Fi communications or only Ethernet communications or Bluetooth  communications not all at once.


![image](front.jpg?width=400px)
![image](back.jpg?width=400px)
![image](pinout.jpg?width=400px)

SD (SPIO 1bit):

| Function | GPIO|
|:-:|:-:|
|CMD | 15 |
|CLK|14| 
|D0|2|

## How to enable ?

In configuration.h:

```cpp
#define ETH_FEATURE

//Ethernet type (Check ETH.h eth_phy_type_t)
#define ESP3D_ETH_PHY_TYPE TYPE_ETH_PHY_LAN8720

//Ethernet board Clock mode
#define ESP3D_ETH_CLK_MODE ETH_CLOCK_GPIO17_OUT

//Pins of ethernet board
#define ESP3D_ETH_PHY_POWER_PIN 5
#define ESP3D_ETH_PHY_MDC_PIN 23
#define ESP3D_ETH_PHY_MDIO_PIN 18

//Address of ethernet board
#define ESP3D_ETH_PHY_ADDR 0
```