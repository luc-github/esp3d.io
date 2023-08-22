+++
description = "ESP32-S3 4.3' (480x272) TFT"
archetype = "section"
title = " 4.3' ESP32-4827S043"
weight = 5
+++
* ESP32-S3 based + SDReader + PSRAM + 4.3' capacitive screen IPS (480x272) [model](https://www.aliexpress.com/item/1005004788147691.html)   
![image](front.jpg?width=400px)
![image](back.jpg?width=400px)


## Features
* ESP32-S3 dual-core Xtensa 32-bit LX7 microprocessor, up to 240 MHz with 384KB ROM, 512KB SRAM. 2.4GHz WiFi and Bluetooth 5
* PSRAM: 8MB     
* FLASH: 16MB
* Micro-SD card slot (SPI)
* 4.3-inch display with 480x272 ILI9485 (Parallel RGB-565 interface)  (https://lang-ship.com/blog/work/esp32-4827s043/)
* I2C capacitive touch panel GT911 (i2C 0x38)
* Audio amplifier MA98357 (i2s) Speaker
* 1 USB-C Serial port
* I2C / SPI / GPIOs
* Boot and reset buttons, 
* Dimension: 181.0mm x 108.0mm   
* Header 1 (4 pins) (SPI): IO13, IO12, IO11, IO19 
* Header 2 (4 pins) (USB/UART): IO20, IO19, IO18, IO17 
* Header 3 (4 pins) : IO18, IO17, +3.3v, Gnd 
* Header 4 (4 pins) : IO18, IO17, +3.3v, Gnd 
* Header 5 (2 pins) Speaker: (+) (-)  
* Header 6 (4 pins) (UART): Gnd, Rx, Tx, +5V

## Pins 
Pin | Usage 
----|-----
GPIO 0 | I2S_BCLK  
GPIO 1 | LCD_B4    
GPIO 2 | TFT_BL  
GPIO 3 | LCD_B1  
GPIO 4 | LCD_G5   
GPIO 5 | LCD_G0  
GPIO 6 | LCD_G1  
GPIO 7 | LCD_G2  
GPIO 8 | LCD_B0   
GPIO 9 | LCD_B3  
GPIO 10 | SD_CS   
GPIO 11 | SD_MOSI    
GPIO 12 | SD_SCK    
GPIO 13 | SD_MISO   
GPIO 14 | LCD_R4  
GPIO 15 | LCD_G3  
GPIO 16 | LCD_G4  
GPIO 17 | I2S_DOUT  
GPIO 18 | I2S_LRC  
GPIO 19 | TOUCH_SDA / I2S_BCLK 
GPIO 20 | TOUCH_SCL  
GPIO 21 | LCD_R3  
GPIO 33 | NA  
GPIO 34 | NA  
GPIO 35 | NC / NA    
GPIO 36 | NC / NA   
GPIO 37 | NC / NA    
GPIO 38 | TOUCH_RST  
GPIO 39 | LCD_HSYNC  
GPIO 40 | LCD_DE
GPIO 41 | LCD_VSYNC 
GPIO 42 | LCD_PCLK  
GPIO 43 | U0TXD  
GPIO 44 | U0RXD  
GPIO 45 | LCD_R0  
GPIO 46 | LCD_B2  
GPIO 47 | LCD_R2  
GPIO 48 | LCD_R1    
