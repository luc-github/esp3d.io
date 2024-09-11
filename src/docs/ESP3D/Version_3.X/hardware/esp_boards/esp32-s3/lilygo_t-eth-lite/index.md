---
archetype : "section"
title : "Lilygo T-ETH Lite"
description :  "Lilygo ethernet board"
weight : 21
---

From [Lilygo](https://www.lilygo.cc/products/t-eth-lite)

[Github](https://github.com/Xinyuan-LilyGO/LilyGO-T-ETH-Series)

## Specs
* ESP32 with 16MB flash memory and 8MB PSRAM (OPI), Micro SPI Card reader, ceramic antenna, RJ45 ethernet port

!!! info "Note"
    Network is available to only for one peripheral at a time. It support only Wi-Fi communications or only Ethernet communications or Bluetooth  communications not all at once.


![image](front.png?width=400px)
![image](pinout.png?width=400px)

SD (SPI):

| Function | GPIO|
|:-:|:-:|
|MISO | 5 |
|MOSI|6| 
|CLK|7|
|CS|42|

!!! warning "Note"
    Ethernet SPI cannot be shared with SD card SPI. If you want to use SD card and ethernet at the same time, please use SPI2 instead of SPI for ethernet, leaving SPI for SD card.

## How to enable ?

In configuration.h:

```cpp
#define ETH_FEATURE

//Ethernet type (Check ETH.h eth_phy_type_t)
#define ESP3D_ETH_PHY_TYPE TYPE_ETH_PHY_W5500

//Ethernet SPI
#define ETH_SPI_SCK 10
#define ETH_SPI_MISO 11
#define ETH_SPI_MOSI 12
#define ETH_PHY_CS 9

// If use SD card and ethernet at the same time, ethernet need dedicated SPI, so we use SPI2
#define ETHERNET_SPI_USE_SPI2

// Ethernet board INTERRUPT
#define ETH_PHY_IRQ 13

// Ethernet board RESET
#define ETH_PHY_RST 14

//Address of ethernet board
#define ESP3D_ETH_PHY_ADDR 1
```