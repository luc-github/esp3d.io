+++
description = "ESP32-S3 3.5' (480x320) TFT"
archetype = "section"
title = "3.5' ZX3D50CE02S-USRC-4832"
weight = 3
+++
ESP32-S3 based + SDReader + PSRAM + 3.5' capacitive screen (480x320) [model](https://www.aliexpress.com/item/1005004309826174.html)

![image](front.jpg?width=400px)
![image](back.jpg?width=400px)


### Features
* ESP32-S3 dual-core Xtensa 32-bit LX7 microprocessor, up to 240 MHz with 384KB ROM, 512KB SRAM. 2.4GHz WiFi and Bluetooth 5
* PSRAM: 2MB     
* FLASH: 8MB
* Micro-SD card slot (SPI)
* 3.5-inch display with 480×320 ST7796UI (8080 parallel bus)  RGB565
* I2C capacitive touch panel ft5x06 (i2C 0x38)
* Audio (NS4168)
* 1 USB-C OTG (DFU/CDC) port
* Wakeup and reset buttons, 
* Power switch
* Power Supply: 5V / 1A
* Dimension: 110 x 61 x 13.5mm   
* 1 Debug interface (7pins): V5 - V3.3 - TX - RX - EN - GPIO 0 - GND / GPIO 14 
* 1 Extended IO interface (8pins): V5 - GND - EXT_IO1- EXT_IO2- EXT_IO3- EXT_IO4- EXT_IO5- EXT_IO6
* 1 RS485 interface (4pins): RS485-A - RS485-B - GND - V5


### Pins
|ESP Pin|  GPIO   | Description                              |
| ----- | ------- | ---------------------------------------- |
|   1   |  GND    |  Ground                                  |
|   2   |  GPIO04 |  LCD_RESET / TP_RST (LCD / Touch Screen) |
|   3   |  GPIO05 |  TP_SCL (Touch Screen)                   |
|   4   |  GPIO06 |  TP_SDA (Touch Screen)                   |
|   5   |  GPIO07 |  TP_INT (Touch Screen)                   |
|   6   |  EN     |  (Debug Pin 5 / Reset Switch)            |
|   7   |  GPIO15 |  LCD_DB7 (LCD)                           |
|   8   |  GPIO16 |  LCD_DB6 (LCD)                           |
|   9   |  GPIO17 |  LCD_DB5 (LCD)                           |
|   10  |  GPIO18 |  LCD_DB4 (LCD)                           |
|   11  |  GPIO08 |  LCD_DB3 (LCD)                           |
|   12  |  GPIO03 |  LCD_DB2 (LCD)                           |
|   13  |  GPIO46 |  LCD_DB1 (LCD)                           |
|   14  |  GPIO19 |  USB_DN (USB OTG)                        |
|   15  |  GPIO20 |  USB_DP (USB OTG)                        |
|   16  |  GPIO09 |  LCD_DB0 (LCD)                           |
|   17  |  GPIO10 |  EXT_IO1 (Export IO)                     |
|   18  |  GPIO11 |  EXT_IO2 (Export IO)                     |
|   19  |  GPIO12 |  EXT_IO3 (Export IO)                     |
|   20  |  GPIO13 |  EXT_IO4 (Export IO)                     |
|   21  |  GPIO14 |  EXT_IO5 (Export IO)                     |
|   22  |  GPIO21 |  EXT_IO6 (Export IO)                     |
|   23  |  GPIO0  |  BOOT / LCD_RS (Debug Pin 6 / LCD)       |
|   24  |  GPIO47 |  LCD_WR (LCD)                            |
|   25  |  GPIO48 |  LCD_TE (LCD)                            |
|   26  |  VCC    |  +3V3                                    |
|   27  |  GPIO45 |  BL_PWM (LCD Blacklight)                 |
|   28  |  GPIO35 |  LRCK (Audio)                            |
|   29  |  GPIO36 |  BCLK (Audio)                            |
|   30  |  GPIO37 |  DOUT (Audio)                            |
|   31  |  GPIO38 |  SD_DO (MISO SD card)                    |
|   32  |  GPIO39 |  SD_CLK (SD card)                        |
|   33  |  RX0    |  RXD0 3.3V TTL Debug Pin 4               |
|   34  |  TX0    |  TXD0 3.3V TTL Debug Pin 3               |
|   35  |  GPIO40 |  SD_DI (MOSI SD card)                    |
|   36  |  GND    |  Ground                                  |
|   37  |  GPIO41 |  SD_CS (SD card)                         |
|   38  |  GPIO42 |  TXD (RS485)                             |
|   39  |  GPIO02 |  RTS (RS485)                             |
|   40  |  GPIO01 |  RXD (RS485)                             |
|   41  |  GND    |  Ground                                  |


