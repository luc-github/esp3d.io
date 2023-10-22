+++
description = "ESP32 - 3.5' (480x320) TFT"
archetype = "section"
title = " 3.5' BZM-V1"
weight = 9
+++

* ESP32 based + TFReader + 3.5' TFT (480x320) with Capacitive touch screen
  * [LiChuang](https://oshwhub.com/liqijian101/esp3d-tft)
  * [TaoBao](https://item.taobao.com/item.htm?spm=a1z10.1-c-s.w4004-24142695501.10.23c7177fA2MHvK&id=744376886851)

![image](front.jpg?width=400px)
![image](back.jpg?width=400px)


### Features
* ESP32
* FLASH: 8MB
* PSRAM: 8MB
* Micro-SD card slot (SDIO)
* 3.5-inch 480x320 TFT display - ST7796U (8080 parallel bus - RGB565)
* Capacitive touch panel - GT911 (i2C - 0x5D)
* Reset buttons
* Power Supply: 5V / 1A
* Dimension: 98.5mm x 56.3mm
* Header H1 (3 pins) : +5v, Gnd, IO42 
* Header H2 (3 pins) : +5v, Gnd, IO41


## Pins 
Pin | Usage 
----|-----
GPIO 0 | BOOT_BTN  
GPIO 1 | NA 
GPIO 2 | NA  
GPIO 3 | LCD_RST
GPIO 4 | LCD_BL 
GPIO 5 | LCD_DB7
GPIO 6 | LCD_DB6
GPIO 7 | LCD_DB5 
GPIO 8 | LCD_DB0 
GPIO 9 | LCD_WR
GPIO 10 | LCD_DC
GPIO 11 | LCD_CS
GPIO 12 | LCD_TE
GPIO 13 | TF_DATA1
GPIO 14 | TF_DATA0
GPIO 15 | LCD_DB4
GPIO 16 | LCD_DB3
GPIO 17 | LCD_DB2
GPIO 18 | LCD_DB1
GPIO 19 | ESP_USB_DM
GPIO 20 | ESP_USB_DP
GPIO 21 | TF_CLK
GPIO 33 | NA
GPIO 34 | NA
GPIO 35 | NC / NA
GPIO 36 | NC / NA
GPIO 37 | NC / NA
GPIO 38 | CTP_INT 
GPIO 39 | CTP_SCL
GPIO 40 | CTP_SDA
GPIO 41 | IO41
GPIO 42 | IO42
GPIO 43 | U0TXD
GPIO 44 | U0RXD
GPIO 45 | TF_DATA2
GPIO 46 | LCD_RD
GPIO 47 | TF_CMD
GPIO 48 | TF_DATA3