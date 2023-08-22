+++
description = "ESP32 - 2.8' (320x240) TFT"
archetype = "section"
title = " 2.8' ESP32-2432S028R (Mod Required)"
weight = 8
+++

{{% notice style="red" title="Important"  %}}
ESP3D-TFT requires PSRAM for full functionality.

By default, this board does not have PSRAM, and is unsupported due to critical performance issues.

To restore full functionality, this board must be modded with external PSRAM. (See Hardware Mod section below...)
{{% /notice %}}

ESP32 based + SDReader + 2.8' resistive screen (320x240) [model](https://www.aliexpress.com/item/3256804315935867.html)

![image](front.jpg?width=400px)
![image](back.jpg?width=400px)


### Features
* ESP32
* PSRAM: NO* (*See Hardware Mod section below...)
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
|   17  | SHD/SD2 |  HOLD (SPI Flash / PSRAM*)               |
|   18  | SWP/SD3 |  WP (SPI Flash / PSRAM*)                 |
|   19  | SCS/CMD |  CS (SPI Flash)                          |
|   20  | SCK/CLK |  SCK (SPI Flash)                         |
|   21  | SDO/SD0 |  SO (SPI Flash / PSRAM*)                 |
|   22  | SDI/SD1 |  SI (SPI Flash / PSRAM*)                 |
|   23  |  GPIO15 |  TFT_CS (TFT)                            |
|   24  |  GPIO02 |  TFT_RS (TFT)                            |
|   25  |  GPIO0  |  BOOT_SW                                 |
|   26  |  GPIO04 |  LED_RGB                                 |
|   27  |  GPIO16 |  LED_RGB (PSRAM_CS*)                     |
|   28  |  GPIO17 |  LED_RGB (PSRAM_SCK*)                    |
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

* Requires Hardware Mod

### Hardware Mod (Add External PSRAM)
This board has an external SOIC-8 footprint near the ESP32 module that is wired in parallel to the built-in SPI Flash.  This can be used (with some modifications) to add an external SPI PSRAM in order to achieve full functionality and performance.

Note: There are (at least) two revisions of this board.
* On one revision, the external SOIC-8 footprint is populated with the SPI Flash IC.  See Option 1 below for Mod details.
* On another revision, the external SOIC-8 footprint is un-populated (the SPI flash is built into the ESP32 module).  See Option 2 below for Mod details.

In either case, one will first need to acquire a compatible PSRAM IC.  This can be desoldered from an existing board (i.e. ESP32-CAM board), or purchased separately.  Some compatible ICs are: IPS6404L-SQ-SPN, APM6404-SQ-SPN, APS6404L-3SQR-SN.  Make sure whatever IC you choose supports ~3.3v and at least 80 MHz.

sdkconfig need to be modified to enable PSRAM

#### Option 1
On this revision, the PSRAM must be piggy-backed on top of the external Flash IC.
* Place the PSRAM IC directly on top of the Flash IC (with the same orientation for Pin 1).
* Connect all Pins (except for Pins 1 & 6) directly to the cooresponding pins on the Flash IC below.
* Remove the RGB LED, as it conflicts with GPIO 16 & 17 that are needed for the new PSRAM IC.
* Connect a bodge wire from Pin 1 to GPIO 16 (can use the Pad of the RGB LED closest to the ESP32 module).
* Connect a bodge wire from Pin 6 to GPIO 17 (can use the Pad of the RGB LED farthest from the ESP32 module on the bottom row).
* Attach a 10k resistor between Pins 1 & 8 of the PSRAM IC. This is a pull-up resistor that ensures the PSRAM is deselected by default (i.e. when the Flash IC is in use).



#### Option 2
On this revision, the PSRAM can be soldered to the un-populated SOIC-8 footprint.
* Solder the PSRAM IC to the SOIC-8 footprint (making sure Pin 1 is in the correct orientation).
* Cut the PCB trace going to Pin 1 as well as the PCB trace going to pin 6.
* Remove the RGB LED, as it conflicts with GPIO 16 & 17 that are needed for the new PSRAM IC.
* Connect a bodge wire from Pin 1 to GPIO 16 (can use the Pad of the RGB LED closest to the ESP32 module).
* Connect a bodge wire from Pin 6 to GPIO 17 (can use the Pad of the RGB LED farthest from the ESP32 module on the bottom row).
* Attach a 10k resistor between Pins 1 & 8 of the PSRAM IC. This is a pull-up resistor that ensures the PSRAM is deselected by default (i.e. when the Flash IC is in use).

##### Before:
![image-before](opt2-before-mod.jpg?width=400px)
##### After:
![image-after](opt2-after-mod.jpg?width=400px)
