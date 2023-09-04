+++
description = "ESP32 - 3.5' (480x320) TFT"
archetype = "section"
title = " 3.5' ESP32-3248S035 (Mod Required)"
weight = 9
+++

{{% notice style="red" title="Important"  %}}
ESP3D-TFT requires PSRAM for full functionality.

By default, this board does not have PSRAM, and is unsupported due to critical performance issues.

To restore full functionality, this board must be modded with external PSRAM. (See Hardware Mod section below...)
{{% /notice %}}

* ESP32 based + SDReader + 3.5' TFT (480x320) with Resistive or Capacitive touch screen
  * [Aliexpress](https://www.aliexpress.com/item/3256804446638703.html)

![image](front.jpg?width=400px)
![image](back.jpg?width=400px)


### Features
* ESP32
* PSRAM: NO* (*Up to 8MB with hardware mod - See Hardware Mod section below...)
* FLASH: 4MB* (*Up to 16MB with hardware mod)
* Micro-SD card slot (SPI)
* 3.5-inch 480x320 TFT display - ST7796 (SPI)   
* Touch panel options:
  * ESP32-3248S035R - Resistive touch panel - XPT2046 (SPI)
  * ESP32-3248S035C - Capacitive touch panel - GT911 (i2C 0x38)
* 1 RGB led
* 1 USB-Micro (Serial 0)
* Power Supply: 5V / 1A
* Header P3 : GND - GPIO 35 - GPIO 22 - GPIO 21 
* Header CN1 :  GND - NC (or GPIO 22 on some boards) - GPIO 21 - V3.3
* Header power : VIN - TX - RX - GND

### Pins
|ESP Pin|  GPIO   | Description                              |
| ----- | ------- | ---------------------------------------- |
|   1   |  GND    |  Ground                                  |
|   2   |  VCC    |  +3V3                                    |
|   3   |  EN     |  RST / TFT_RST (Reset / LCD)             |
|   4   |  GPIO36 |  SENSOR_VP / RTP_IRQ (Res. Touchscreen)  |
|   5   |  GPIO39 |  SENSOR_VN                               |
|   6   |  GPIO34 |  ADC                                     |
|   7   |  GPIO35 |  Header P3 Pin 3                         |
|   8   |  GPIO32 |  CTP_SCL (Cap. Touchscreen)              |
|   9   |  GPIO33 |  CTP_SDA (Cap. Touchscreen) / RTP_CS (Res. Touchscreen) |
|   10  |  GPIO25 |  CTP_RST (Cap. Touchscreen)              |
|   11  |  GPIO26 |  AUDIO IN-                               |
|   12  |  GPIO27 |  TFT_BL (TFT)                            |
|   13  |  GPIO14 |  TFT_SCK (TFT) / RTP_CLK (Res. Touchscreen) |
|   14  |  GPIO12 |  TFT_SDO (TFT) / RTP_OUT (Res. Touchscreen) |
|   15  |  GND    |  Ground                                  |
|   16  |  GPIO13 |  TFT_SDI (TFT) / RTP_DIN (Res. Touchscreen) |
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
|   33  |  GPIO21 |  CTP_INT (Cap. Touchscreen) / Headers: P3 Pin 1, CN1 Pin 2 |
|   34  |  RXD0   |  RXD2 Header P1 Pin 3                    |
|   35  |  TXD0   |  TXD2 Header P1 Pin 2                    |
|   36  |  GPIO22 |  Header P3 Pin 2 (also Header CN1 Pin 3 on some boards) |
|   37  |  GPIO23 |  MCU_MOSI (SD Card)                      |
|   38  |  GND    |  Ground                                  |
|   39  |  GND    |  Ground                                  |

\* Requires Hardware Mod

### Hardware Mod (Add External PSRAM)
This board has an external SOIC-8 footprint near the ESP32 module that is wired in parallel to the built-in SPI Flash.  This can be used (with some modifications) to add an external SPI PSRAM in order to achieve full functionality and performance.

NOTE: There are (at least) two revisions of this board.
* On one revision, the external SOIC-8 footprint is populated with the SPI Flash IC.  See Option 1 below for Mod details.
* On another revision, the external SOIC-8 footprint is un-populated (the SPI flash is built into the ESP32 module).  See Option 2 below for Mod details.

In either case, one will first need to acquire a compatible PSRAM IC.  This can be desoldered from an existing board (i.e. ESP32-CAM board), or purchased separately.  Make sure whatever IC you choose supports 3.3v and at least 80 MHz.  Ideally it should support Quad SPI (QIO) as well.

Some compatible 8MB PSRAM ICs are:
* ESP-PSRAM64H
* IPS6404L-SQ-SPN
* APM6404-SQ-SPN
* APS6404L-3SQR-SN

NOTE: Remember to choose the correct variant in CMakeLists.txt to enable PSRAM support.

#### Option 1
On this revision, the PSRAM must be piggy-backed on top of the external Flash IC.
* Place the PSRAM IC directly on top of the Flash IC (with the same orientation for Pin 1).
* Connect all Pins (except for Pins 1 & 6) directly to the cooresponding pins on the Flash IC below.
* Remove the RGB LED, as it conflicts with GPIO 16 & 17 that are needed for the new PSRAM IC.
* Connect a bodge wire from Pin 1 to GPIO 16.
* Connect a bodge wire from Pin 6 to GPIO 17.
* Attach a 10k resistor between Pins 1 & 8 of the PSRAM IC. This is a pull-up resistor that ensures the PSRAM is deselected by default (i.e. when the Flash IC is in use).

#### Option 2
On this revision, the PSRAM can be soldered to the un-populated SOIC-8 footprint.
* Cut the PCB trace going to Pin 1 as well as the PCB trace going to pin 6.
* Solder the PSRAM IC to the SOIC-8 footprint (making sure Pin 1 is in the correct orientation).
* Remove the RGB LED, as it conflicts with GPIO 16 & 17 that are needed for the new PSRAM IC.
* Connect a bodge wire from Pin 1 to GPIO 16.
* Connect a bodge wire from Pin 6 to GPIO 17.
* Attach a 10k resistor between Pins 1 & 8 of the PSRAM IC. This is a pull-up resistor that ensures the PSRAM is deselected by default (i.e. when the Flash IC is in use).
