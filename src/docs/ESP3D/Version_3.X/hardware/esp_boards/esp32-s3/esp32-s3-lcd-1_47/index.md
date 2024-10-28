---
archetype : "section"
title : "ESP32-S3-LCD-1.47"
description :  "Waveshare ESP32-S3-LCD-1.47"
weight : 1
---

[Documentation](https://www.waveshare.com/esp32-s3-lcd-1.47.htm)   
[wiki](https://www.waveshare.com/wiki/ESP32-S3-LCD-1.47)

## Specs
* ESP32-S3 with 16MB flash memory, 8MB PSRAM, ceramic antenna, RGB led, Octal SPI, OTG port, 1.47inch Display (ST7789 SPI), Micro SD (SPI/SDIO 4 bit)

![image](front.png?width=400px)
![image](back.jpg?width=400px)
1 - ESP32-S3R8   
dual-core processor, up to 240MHz operating frequency   
2 - 16MB Flash   
3 - TF card slot   
4 - ME6217C33M5G   
Low dropout regulator, 800mA output (Max.)   
5 - Onboard ceramic antenna    
6 - RESET button   
7 - BOOT button    

![image](pinout.jpg?width=400px)

## Pinmap

|LCD | ESP32-S3 |
| -------- | ----------------- |
|MOSI |	GPIO45 |
|SCLK	| GPIO40 |
|LCD_CS | GPIO42 |
|LCD_DC | GPIO41 |
|LCD_RST | GPIO39 |
|LCD_BL	| GPIO48 |

| RGB LED | ESP32-S3 |
| -------- | ----------------- |
|LED_R |	GPIO38 |

| SD Card | ESP32-S3 |
| -------- | ----------------- |
| SD_D0 / MISO	| GPIO16 |
| SD_CMD / MOSI	| GPIO15 |
| SD_SCK / SCLK | GPIO14 |
| SD_D3 / CS | GPIO21 |
| SD_D1	| GPIO18 | 
| SD_D2	| GPIO17 |

!!! Note "Note"
    If doing soldering on this board be very careful, the board seems easy to damage if you are not careful.