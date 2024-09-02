---
archetype : "section"
title : "WT32-ETH1"
description :  "WT32-ETH1"
weight : 21
---

From [Wireless Tag](https://en.wireless-tag.com/product-item-2.html)

## Specs
* ESP32 with 4MB flash memory, ceramic antenna, RJ45 ethernet port

!!! info "Note"
    Network is available to only for one peripheral at a time. It support only Wi-Fi communications or only Ethernet communications or Bluetooth  communications not all at once.


![image](front.png?width=400px)
![image](back.png?width=400px)
![image](pinout.jpg?width=400px)

## How to enable ?

In configuration.h:

```cpp
#define ETH_FEATURE

//Ethernet type (Check ETH.h eth_phy_type_t)
#define ESP3D_ETH_PHY_TYPE TYPE_ETH_PHY_LAN8720

//Ethernet board Clock mode
#define ESP3D_ETH_CLK_MODE MODE_ETH_CLOCK_GPIO0_IN

//Pins of ethernet board
#define ESP3D_ETH_PHY_POWER_PIN 16
#define ESP3D_ETH_PHY_MDC_PIN 23
#define ESP3D_ETH_PHY_MDIO_PIN 18

//Address of ethernet board
#define ESP3D_ETH_PHY_ADDR 1
```

!!! Note "Note"
    Do not use GPIO 0 because it is used by ethernet board.    
    e.g if you have these settings then comment them:   

    ```cpp
    //#define PIN_RESET_FEATURE

    /* Reset pin
    * The pin used to reset ESP3D setting if set to low for more than 1 second at start
    */
    //#define ESP3D_RESET_PIN 0
    ```