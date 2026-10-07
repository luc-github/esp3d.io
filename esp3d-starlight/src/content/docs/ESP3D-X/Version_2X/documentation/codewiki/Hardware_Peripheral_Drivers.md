---
title: "Hardware Peripheral Drivers"
---

# Hardware Peripheral Drivers

## Purpose

The `Hardware_Peripheral_Drivers` module is the Hardware Abstraction Layer (HAL) for all on-board peripheral devices across the supported ESP32 and ESP32-S3 board family. It provides self-contained, board-agnostic C drivers for every hardware peripheral — displays, touch controllers, physical inputs, I/O expanders, buses, sensors, and the buzzer — with board-specific wiring injected at runtime through typed configuration structures.

The module is shared across all board variants (`boards/*/components/bsp/`) without modification. Each Board Support Package (BSP) selects, configures, and composes these drivers in its `board_init.c`.

---

## Architecture Overview

```mermaid
graph TD
    subgraph HAL["Hardware_Peripheral_Drivers  (hardware/)"]
        DISP_SPI["display_spi_drivers\nILI9341 · ST7796S\nhardware/common/drivers/"]
        DISP_I80["display_i80_drivers\nRM68120 · ST7796-i80\nhardware/drivers_video_i80/"]
        DISP_RGB["display_rgb_drivers\nEK9716 · ILI9485 · ST7262\nhardware/drivers_video_rgb/"]
        TOUCH["touch_drivers\nFT5x06 · FT6336U · GT911 · XPT2046\nhardware/common/drivers/"]
        BUS["bus_drivers\nbus_i2c · bus_sw_spi\nhardware/common/drivers/"]
        PHYS["physical_input\nphy_buttons · phy_encoder\nphy_potentiometer · phy_switch\nhardware/common/drivers/"]
        IOEXP["io_expanders\nCH422G · TCA9554\nhardware/common/drivers/"]
        SENSOR["analog_sensor\nADC oneshot\nhardware/common/drivers/"]
        BUZZER["buzzer\nLEDC PWM driver\nhardware/common/drivers/"]
    end

    subgraph BSP["Board Support Package  (boards/)"]
        BOARD["board_init.c\n(per-board)"]
    end

    subgraph LVGL["Application Layer  (Core 1)"]
        LV["LVGL / UIManager"]
    end

    subgraph IDF["ESP-IDF"]
        LCD["esp_lcd\n(SPI · I80 · RGB panels)"]
        ADC["esp_adc\n(oneshot)"]
        PCNT["pulse_cnt\n(encoder)"]
        GPIO["driver/gpio"]
        LEDC["driver/ledc"]
        I2C_IDF["driver/i2c"]
    end

    BOARD -->|"configure() calls"| DISP_SPI
    BOARD -->|"configure() calls"| DISP_I80
    BOARD -->|"configure() calls"| DISP_RGB
    BOARD -->|"configure() calls"| TOUCH
    BOARD -->|"bus_i2c_init()"| BUS
    BOARD -->|"phy_*_configure()"| PHYS
    BOARD -->|"io_*_configure()"| IOEXP
    BOARD -->|"sensor_analog_configure()"| SENSOR
    BOARD -->|"buzzer_configure()"| BUZZER

    DISP_SPI --> LCD
    DISP_I80 --> LCD
    DISP_RGB --> LCD
    TOUCH --> BUS
    IOEXP --> BUS
    BUS --> I2C_IDF
    PHYS --> GPIO
    PHYS --> PCNT
    PHYS --> ADC
    BUZZER --> LEDC
    SENSOR --> ADC

    LV -->|"lv_display_flush_ready()"| BOARD
    BOARD -->|"lvgl_flush_cb → draw_bitmap()"| DISP_SPI
    BOARD -->|"lvgl_flush_cb → draw_bitmap()"| DISP_I80
    BOARD -->|"lvgl_flush_cb → draw_bitmap()"| DISP_RGB
    BOARD -->|"touch_read_cb → *_read()"| TOUCH
    BOARD -->|"*_read_cb → lv_indev"| PHYS
```

---

## Sub-Module Architecture

### Display Driver Stack

Three parallel-bus families are supported. Each implements the standard `esp_lcd_panel_t` vtable, allowing LVGL and the BSP to call the same uniform panel API regardless of the underlying controller.

```mermaid
graph LR
    subgraph SPI["SPI - display_spi_drivers"]
        S1["ILI9341\ndisp_ili9341/"]
        S2["ST7796S\ndisp_st7796/"]
        S3["backlight_config_t\ndisp_backlight/"]
    end
    subgraph I80["I80 Parallel - display_i80_drivers"]
        I1["RM68120\ndisp_rm68120/"]
        I2["ST7796-i80\ndisp_st7796_i80/"]
    end
    subgraph RGB["RGB Parallel - display_rgb_drivers"]
        R1["ST7262\ndisp_st7262/"]
        R2["EK9716\ndisp_ek9716/"]
        R3["ILI9485\ndisp_ili9485/"]
    end
    ESP_LCD["esp_lcd_panel_t vtable\n(esp-idf)"]
    SPI --> ESP_LCD
    I80 --> ESP_LCD
    RGB --> ESP_LCD
```

| Family | Framebuffer | Flush trigger | Boards |
|--------|------------|---------------|--------|
| SPI | Controller GRAM | `on_color_trans_done` ISR | `pibot_pendant_v1_0`, `esp32_2432s028r`, `esp32_3248s035*`, `esp32s3_bzm_tft35_gt911` |
| I80 | Controller GRAM | `notify_flush_ready` ISR | `esp32s3_hmi43v3`, `esp32s3_zx3d50ce02s_usrc_4832` |
| RGB | ESP32-S3 PSRAM | VSync semaphore | `esp32s3_4827s043c`, `esp32s3_8048s043c`, `esp32s3_8048s050c`, `esp32s3_8048s070c`, `esp32s3_8048_touch_lcd_7` |

### Touch and Input Stack

```mermaid
graph TD
    subgraph touch_drivers["touch_drivers"]
        FT5["touch_ft5x06\nCapacitive I²C"]
        FT6["touch_ft6336u\nCapacitive I²C"]
        GT9["touch_gt911\nCapacitive I²C"]
        XPT["touch_xpt2046\nResistive SPI"]
    end
    subgraph bus_drivers["bus_drivers"]
        I2C_DRV["bus_i2c\nshared I²C"]
        SWSPI["bus_sw_spi\nbit-bang SPI"]
    end
    FT5 --> I2C_DRV
    FT6 --> I2C_DRV
    GT9 --> I2C_DRV
    XPT --> SWSPI
    I2C_DRV --> io_expanders["io_expanders\nCH422G · TCA9554"]
```

```mermaid
graph TD
    subgraph physical_input["physical_input"]
        BTN["phy_buttons\n3× push-button\n(GPIO + debounce)"]
        ENC["phy_encoder\nQuadrature rotary\n(PCNT 4× decode)"]
        POT["phy_potentiometer\nAnalog wiper\n(ADC oneshot)"]
        SWT["phy_switch\n4-position selector\n(GPIO decode)"]
    end
    BSP_CB["BSP *_read_cb()"]
    LVGL_INDEV["LVGL lv_indev_t"]
    BTN --> BSP_CB
    ENC --> BSP_CB
    POT --> BSP_CB
    SWT --> BSP_CB
    BSP_CB --> LVGL_INDEV
```

### Buzzer — Two-Layer Stack

```mermaid
graph TD
    subgraph APP["Application Layer (C++)"]
        BZ_CLASS["Buzzer class\nmain/modules/buzzer/esp3d_buzzer.h\nNVS enable/disable · bip() · play()"]
    end
    subgraph DRV["Hardware Driver (C)"]
        BZ_DRV["buzzer.c\nLEDC PWM · FreeRTOS task\nhardware/common/drivers/buzzer/"]
    end
    BSP_INIT["board_init()\nbuzzer_configure()"]
    BSP_INIT --> BZ_DRV
    BZ_CLASS --> BZ_DRV
```

---

## Key Design Constraints

| Constraint | Applies to |
|-----------|-----------|
| **No heap allocation in drivers** — all state is static | All sub-modules |
| **Single driver instance per chip type** — singleton pattern | IO expanders, touch, sensor |
| **No blocking in LVGL task (Core 1)** — ISR-only flush signals | Display drivers (SPI, I80, RGB) |
| **FreeRTOS-safe ISRs** — only `xQueueSendFromISR` / volatile flags | Encoder PCNT ISR, touch INT ISRs |
| **I²C bus deduplication** — `s_installed[]` guard prevents double-init | `bus_i2c` |
| **ADC2 / WiFi conflict** — always use ADC1 when WiFi active | `sensor_analog`, `phy_potentiometer` |

---

## Core Components Documentation

| Sub-Module | Documentation |
|-----------|--------------|
| Display — SPI (ILI9341, ST7796S, backlight) | `docs/architecture/display_drivers.md` |
| Display — I80 parallel (RM68120, ST7796-i80) | `docs/architecture/display_drivers.md` |
| Display — RGB parallel (EK9716, ILI9485, ST7262) | `docs/architecture/display_drivers.md` |
| Touch controllers (FT5x06, FT6336U, GT911, XPT2046) | `docs/architecture/display_drivers.md`, `docs/architecture/Input_system.md` |
| Bus drivers (bus\_i2c, bus\_sw\_spi) | `docs/architecture/display_drivers.md` |
| Physical inputs (buttons, encoder, potentiometer, switch) | `docs/architecture/Input_system.md` |
| I/O expanders (CH422G, TCA9554) | `docs/architecture/shared_sd_mechanism_V2.0.md` |
| Analog sensor (ADC oneshot) | `docs/features/features.md` |
| Buzzer (LEDC driver + Buzzer class) | `docs/Factory/factory_app_technical_doc.md` |
| Board build guidelines and porting | `docs/guides/board_build_guidelines.md` |
| ESP32 memory constraints | `docs/guides/esp32_memory_constraints.md` |
| UI resources (icons, fonts, partition) | `docs/ui_resources/development.md` |

## Documents legacy (doublons de nommage phase-1)

- [sensor_analog](sensor_analog.md)
- [physical_inputs](physical_inputs.md)
- [display_drivers_spi](display_drivers_spi.md)
- [display_drivers_i80](display_drivers_i80.md)
- [display_drivers_rgb](display_drivers_rgb.md)
- [touch_controllers](touch_controllers.md)


## Documents de conception (depot)

- [display_drivers.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/display_drivers.md)
- [Input_system.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/Input_system.md)
