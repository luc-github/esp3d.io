---
description : "ESP32 - 3.5' (480x320) TFT"
archetype : "section"
title : " 3.5' BZM-V1"
weight : 35
---

* ESP32 based + TFReader + OV2640 + 3.5' TFT (480x320) with Capacitive touch screen
  * [OSHWHub](https://oshwhub.com/liqijian101/esp3d-tft_spi)
  * [TaoBao](https://item.taobao.com/item.htm?spm=a1z10.1-c-s.w4004-24142695501.10.23c7177fA2MHvK&id=744376886851)

![image](front.jpg?width=400px)
![image](back.jpg?width=400px)


### Features
* ESP32S3
* FLASH: 8MB
* PSRAM: 8MB
* Micro-SD card slot (SPI)
* 3.5-inch 480x320 TFT display - ST7796U (SPI - RGB565)
* Capacitive touch panel - GT911 (i2C - 0x5D)
* Camera: OV2640 
* Power Supply: 5V / 500A
* Dimension: 98.5mm x 56.3mm
* Header H1 (4 pins) : +5v, Gnd, Rx, Tx


## Pins 
Pin | Usage 
----|-----
GPIO 0 | NA  
GPIO 1 | CTP_INT 
GPIO 2 | CTP_SCL  
GPIO 3 | OV_D7
GPIO 4 | OV_D1 
GPIO 5 | OV_D2
GPIO 6 | OV_D3
GPIO 7 | OV_D0 
GPIO 8 | OV_XCLK 
GPIO 9 | OV_VSYNC
GPIO 10 | SD_CS
GPIO 11 | SD_MOSI
GPIO 12 | SD_CLK
GPIO 13 | SD_MISO
GPIO 14 | OV_RESET
GPIO 15 | OV_D4
GPIO 16 | OV_PCLK
GPIO 17 | OV_D5
GPIO 18 | OV_D6
GPIO 19 | ESP_USB_DM
GPIO 20 | ESP_USB_DP
GPIO 21 | OV_SCL
GPIO 33 | NA
GPIO 34 | NA
GPIO 35 | NC / NA
GPIO 36 | NC / NA
GPIO 37 | NC / NA
GPIO 38 | LCD_MOSI 
GPIO 39 | LCD_CLK
GPIO 40 | LCD_DC
GPIO 41 | LCD_CS
GPIO 42 | CTP_SDA
GPIO 43 | U0TXD
GPIO 44 | U0RXD
GPIO 45 | LCD_RST / CTP_RST
GPIO 46 | OV_HREF
GPIO 47 | OV_SDA
GPIO 48 | LCD_BL