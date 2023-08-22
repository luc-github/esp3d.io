+++
description = "ESP32 - 2.8' (320x240) TFT"
archetype = "section"
title = "Deprecated - ESP32-2432S028R "
weight = 8
+++

{{% notice style="red" title="Important"  %}}
Only boards with PSRAM are supported in ESP3D-TFT due to performances issue without PSRAM.   

So this board is no more supported.
{{% /notice %}}

ESP32 based + SDReader + 2.8'resistive screen (240x320) [model](https://www.aliexpress.com/item/3256804315935867.html)

![image](front.jpg?width=400px)
![image](back.jpg?width=400px)


### Features
* ESP32
* PSRAM: NO     
* FLASH: 4MB
* Micro-SD card slot (SPI)
* 2.8-inch display with 320 x 240 ILI9341 (SPI)   
* SPI resitive touch panel XPT2046 (SPI)    
* 1 RGB led
* 1 USB-Micro (Serial 0)
* Power Supply: 5V / 1A
* Header P3 : GND - GPIO 35 - GPIO 22 - GPIO 21 
* Header CN1 :  GND - NC (or GPIO 22 on some boards) - GPIO 27 - V3.3
* Header power : VIN - TX - RX - GND

### Pins
|ESP Pin|  GPIO   | Description                              |
| ----- | ------- | ---------------------------------------- |
|   1   |  GND    |  Ground                                  |
|   2   |  VCC    |  +3V3                                    |
|   3   |  EN     |  RST / TFT_RST (Reset / LCD)             |
|   4   |  GPIO36 |  SENSOR_VP / TP_IRQ (Touchscreen)        |
|   5   |  GPIO39 |  SENSOR_VN / TP_OUT (Touchscreen)        |
|   6   |  GPIO34 |  ADC                                     |
|   7   |  GPIO35 |  Header P3 Pin 3                         |
|   8   |  GPIO32 |  TP_DIN (Touchscreen)                    |
|   9   |  GPIO33 |  TP_CS (Touchscreen)                     |
|   10  |  GPIO25 |  TP_CLK (Touchscreen)                    |
|   11  |  GPIO26 |  AUDIO IN-                               |
|   12  |  GPIO27 |  Header CN1 Pin 2                        |
|   13  |  GPIO14 |  TFT_SCK (TFT)                           |
|   14  |  GPIO12 |  TFT_SDO (TFT)                           |
|   15  |  GND    |  Ground                                  |
|   16  |  GPIO13 |  TFT_SDI (TFT)                           |
|   17  | SHD/SD2 |  HOLD (SPI Flash)                        |
|   18  | SWP/SD3 |  WP (SPI Flash)                          |
|   19  | SCS/CMD |  CS (SPI Flash)                          |
|   20  | SCK/CLK |  SCK (SPI Flash)                         |
|   21  | SDO/SD0 |  SO (SPI Flash)                          |
|   22  | SDI/SD1 |  SI (SPI Flash)                          |
|   23  |  GPIO15 |  TFT_CS (TFT)                            |
|   24  |  GPIO02 |  TFT_RS (TFT)                            |
|   25  |  GPIO0  |  BOOT_SW                                 |
|   26  |  GPIO04 |  LED_RGB                                 |
|   27  |  GPIO16 |  LED_RGB                                 |
|   28  |  GPIO17 |  LED_RGB                                 |
|   29  |  GPIO05 |  TF_CS (SD Card)                         |
|   30  |  GPIO18 |  TF_CLK (SD Card)                        |
|   31  |  GPIO19 |  MCU_MISO (SD Card)                      |
|   32  |  NC     |  NA                                      |
|   33  |  GPIO21 |  TFT_BL / Header P3 Pin 1                |
|   34  |  RXD0   |  RXD2 Header P1 Pin 3                    |
|   35  |  TXD0   |  TXD2 Header P1 Pin 2                    |
|   36  |  GPIO22 |  Header P3 Pin 2 (also Header CN1 Pin 3 on some boards) |
|   37  |  GPIO23 |  MCU_MOSI (SD Card)                      |
|   38  |  GND    |  Ground                                  |
|   39  |  GND    |  Ground                                  |


