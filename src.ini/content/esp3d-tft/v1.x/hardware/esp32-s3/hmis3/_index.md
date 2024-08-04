+++
description = "ESP32-S3 4.3' (800x480) TFT"
archetype = "section"
title = "4.3' HMI-V3"
weight = 4
+++

* ESP32-S3 based + SDReader + PSRAM + 4.3' TFT (800x480) with Capacitive touch screen
  * [Aliexpress](https://www.aliexpress.com/item/1005003814428825.html)

![image](front.png?width=400px)
![image](back.png?width=400px)


## Features
* ESP32-S3 dual-core Xtensa 32-bit LX7 microprocessor, up to 240 MHz with 384KB ROM, 512KB SRAM. 2.4GHz WiFi and Bluetooth 5
* PSRAM: 2MB     
* FLASH: 8MB
* Micro-SD card slot (SPI)
* 4.3-inch 800x480 TFT display - RM68120 (8080 parallel bus)  
* Capacitive touch panel - ft5x06 (i2C 0x38)
* Audio amplifier RealNetworks (i2C 0x68) Speaker
* Built-in microphone   
* 1 USB-C OTG (DFU/CDC) port
* 1 USB-C debug port
* 3-axis accelerometer /  3-axis gyroscope mpu6050 (i2C)
* temperature and humidity sensors hdc1080 / htu21 (i2C)
* I2C / SPI / GPIOs
* Wakeup and reset buttons, 
* Power switch
* Power Supply: 5V / 1A
* Dimension: 110 x 61 x 13.5mm   
* Header 1 (10 pins): GND, 5V, EXT_IO2, EXT_IO1, 3.3V, RXD, TXD, GND, SCL, SDA
* Header 2 (10 pins): GND, MOSI, CLK, MISO, CS, IO33, IO46, IO0, EXT_IO0

## Pins 
Pin | Usage 
----|-----
GPIO 0 | Upload mode  
GPIO 1 | LCD_D0 
GPIO 2 | LCD_D2  
GPIO 3 | LCD_D4
GPIO 4 | LCD_D6 
GPIO 5 | LCD_D8
GPIO 6 | LCD_D10
GPIO 7 | LCD_D12 
GPIO 8 | LCD_D14 
GPIO 9 | LCD_D1
GPIO 10 | LCD_D3
GPIO 11 | LCD_D5
GPIO 12 | LCD_D7
GPIO 13 | LCD_D9
GPIO 14 | LCD_D11
GPIO 15 | LCD_D13
GPIO 16 | LCD_D15
GPIO 17 | LCD_WR
GPIO 18 | BAT_ADC
GPIO 19 | ESP_USB_DM
GPIO 20 | ESP_USB_DP
GPIO 21 | LCD_RST
GPIO 33 | GPIO 33
GPIO 34 | ESP_SPI_CS_SD
GPIO 35 | ESP_SPI_MOSI
GPIO 36 | ESP_SPI_CLK
GPIO 37 | ESP_SPI_MISO
GPIO 38 | LCD_RS 
GPIO 39 | ESP_I2C_SCL
GPIO 40 | ESP_I2C_SDA
GPIO 41 | ESP_I2S0_ASDOUT
GPIO 42 | ESP_I2S0_SCLK
GPIO 43 | U0TXD
GPIO 44 | U0RXD
GPIO 45 | ESP_I2S0_MCLK
GPIO 46 | GPIO 46
GPIO 47 | ESP_I2S0_DSDIN
GPIO 48 | ESP_I2SS0_LRCK
