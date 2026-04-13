---
description : "ESP32-S3 7' (800×480) TFT"
archetype : "section"
title : " 7.0' Waveshare ESP32-S3-Touch-LCD-7 V1.1"
weight : 70
---

* ESP32-S3 based + SDReader + PSRAM + 7' TFT (800x480) with Capacitive touch screen
  * [Wavesshare](https://www.waveshare.com/wiki/ESP32-S3-Touch-LCD-7)   
  * [Aliexpress](https://www.aliexpress.com/item/1005007096249725.html)

![image](front.png?width=400px)
![image](back.png?width=400px)


## Features
* ESP32-S3 dual-core Xtensa 32-bit LX7 microprocessor, up to 240 MHz with 384KB ROM, 512KB SRAM. 2.4GHz WiFi and Bluetooth 5
* FLASH: 8MB
* PSRAM: 8MB(OPI)
* Micro-SD card slot (SPI)
* 7-inch 800x480 TFT display - EK9716 (Parallel RGB-565 interface)
* Capacitive touch panel - GT911 (I2C - 0x5D or 0x14)
* IO Expander: CH422G (I2C - 0x24)
* 1 USB-C to Serial 0 (CH343P)
* 1 USB-C OTG
* I2C / SPI / GPIOs
* Boot and reset buttons
* UART1/2 switch 
* Dimension: 192.96mm x 110.76mm
* Header P1 (4 pins) (UART2): Gnd, Rx, Tx, +3.3V
* Header P2 (3 pins) (Sensor AD): 3.3v, Gnd, AD
* Header P3 (2 pins) (CAN): L, H\
* Header P4 (4 pins) (I2C): VCC,Gnd, SDA, SCL
* Header P5 (2 pins) (RS-485): A, B
* Header P6 (2 pins) (Battery): A, B

## Pins
Pin | Usage
----|-----
GPIO 0 | G1 / D6
GPIO 1 | R0 / D9
GPIO 2 | R1 / D10
GPIO 3 | VSYNC
GPIO 4 | TP_IRQ
GPIO 5 | DE
GPIO 6 | AD
GPIO 7 | PCLK
GPIO 8 | TP_SDA
GPIO 9 | TP_SCL
GPIO 10 | B4 / D4
GPIO 11 | SD_MOSI
GPIO 12 | SD_SCK
GPIO 13 | SD_MISO
GPIO 14 | B0 / D0
GPIO 15 | RS485_TX
GPIO 16 | RS485_RX
GPIO 17 | B3 / D3
GPIO 18 | B2 / D2
GPIO 19 | USB_DN/CANRX
GPIO 20 | USB_DP/CANTX
GPIO 21 | G5 / D10
GPIO 38 | B1 / D1
GPIO 39 | G0 / D5
GPIO 40 | R4 / D15
GPIO 41 | R3 / D14
GPIO 42 | R2 / D13
GPIO 43 | U0TXD
GPIO 44 | U0RXD
GPIO 45 | G2 / D7
GPIO 46 | HSYNC
GPIO 47 | G4 / D9
GPIO 48 | G3 / D8
EXI01   | TP_RST
EXI02   | DISP
EXI03   | LCD_RST
EXI04   | SD_CS
EXI05   | USB (Low) / CAN (High)
