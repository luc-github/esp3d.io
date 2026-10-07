---
title: "ESP32-S3 HMI43V3 Board Support Package (BSP)"
---

# ESP32-S3 HMI43V3 Board Support Package (BSP)

The `esp32s3_hmi43v3_bsp` module is the Board Support Package for the **ESP32-S3 HMI43V3** — a 4.3-inch capacitive-touch display board built around an ESP32-S3 SoC. It initialises every hardware subsystem (display, touch, IO expander, LVGL) and exposes a uniform BSP interface consumed by the main firmware. Because all hardware access is encapsulated here, the rest of the application firmware is board-agnostic.

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Hardware Topology](#2-hardware-topology)
3. [Software Architecture](#3-software-architecture)
4. [Initialization Sequence](#4-initialization-sequence)
5. [Component Reference](#5-component-reference)
   - 5.1 [board\_init.c](#51-board_initc)
   - 5.2 [control\_event.h](#52-control_eventh)
   - 5.3 [control\_types.c](#53-control_typesc)
6. [LVGL Integration](#6-lvgl-integration)
7. [Display Pipeline](#7-display-pipeline)
8. [Touch Pipeline](#8-touch-pipeline)
9. [Control Event System](#9-control-event-system)
10. [Snapshot Feature](#10-snapshot-feature)
11. [Build System](#11-build-system)
12. [Factory Application](#12-factory-application)
13. [Dependencies](#13-dependencies)
14. [Configuration Constants (Quick Reference)](#14-configuration-constants-quick-reference)

---

## 1. Module Overview

| Property | Value |
|---|---|
| **Board identifier** | `esp32s3_hmi43v3` |
| **SoC** | ESP32-S3 |
| **Display controller** | RM68120 (4.3 ″, Intel 8080 / I80 parallel bus) |
| **Touch controller** | FT5x06 capacitive (I²C) |
| **IO expander** | TCA9554 (I²C, shared bus with touch) |
| **Shared I²C bus** | Backlight enable + touch reset routed through TCA9554 |
| **Color format** | RGB 565 |
| **LVGL render mode** | Partial, single or double DMA buffer |
| **Touch indev polling** | 10 ms |
| **LVGL tick period** | `LVGL_TICK_PERIOD_MS` (from `tasks_def.h`) |

### Module tree location

```
esp32s3_hmi43v3_bsp           ← this BSP (current module)
boards/esp32s3_hmi43v3/
  components/bsp/
    board_init.c              ← hardware initialisation & LVGL wiring
    control_event.h           ← control_event_t struct
    control_types.c           ← custom LVGL event registration
  build_scripts/              → esp32s3_hmi43v3_build
  Factory/                    → esp32s3_hmi43v3_factory_app
```

---

## 2. Hardware Topology

```mermaid
graph TD
    subgraph ESP32-S3 SoC
        I80["Intel 8080 (I80)\nParallel Bus"]
        I2C["I²C Bus\n(shared)"]
        DMA["DMA Engine"]
        TIMER["esp_timer\n(LVGL tick)"]
        CPU["CPU Cores"]
    end

    subgraph Display Subsystem
        RM68120["RM68120\nDisplay Controller\n4.3 ″ TFT Panel"]
    end

    subgraph Touch Subsystem
        FT5x06["FT5x06\nCapacitive Touch\nController"]
    end

    subgraph IO Expander
        TCA9554["TCA9554\n8-bit GPIO Expander\n(Backlight + Touch Reset)"]
    end

    I80 -->|"16-bit parallel data\n+ control signals"| RM68120
    DMA -->|"pixel data"| I80
    I2C -->|"command/status"| TCA9554
    I2C -->|"touch coordinates"| FT5x06
    TCA9554 -->|"GPIO: BL_EN"| RM68120
    TCA9554 -->|"GPIO: RST"| FT5x06
    TIMER -->|"lv_tick_inc()"| CPU
    CPU -->|"lv_task_handler()"| DMA
```

> **Key constraint**: the TCA9554 IO expander **must be initialised before** both the RM68120 display and the FT5x06 touch controller, because backlight enable and touch reset signals are routed through it.

---

## 3. Software Architecture

```mermaid
graph TD
    subgraph "Application Layer"
        APP["main/main.cpp\n(app_main)"]
        LVGL_SYS["esp3d_lvgl.cpp\n(LVGL task handler)"]
        UI["UIManager\n(esp3d_ui.cpp)"]
    end

    subgraph "BSP Layer  -  esp32s3_hmi43v3_bsp"
        BOARD_INIT["board_init()\nboard_init.c"]
        INIT_IO["init_io_expander()"]
        INIT_DISP["disp_rm68120_configure()"]
        INIT_TOUCH["init_touch_controller()"]
        INIT_LVGL["init_lvgl()"]
        CTRL_EVT["control_events_init()\ncontrol_types.c"]
        FLUSH_CB["lvgl_flush_cb()"]
        I80_CB["i80_flush_ready_cb()  [ISR]"]
        TOUCH_CB["touch_read_cb()"]
        TICK_CB["increase_lvgl_tick()"]
        EVT_STRUCT["control_event_t\ncontrol_event.h"]
    end

    subgraph "Hardware Driver Layer"
        RM68120_DRV["disp_rm68120\n(display_drivers_i80)"]
        FT5X06_DRV["touch_ft5x06\n(touch_drivers)"]
        TCA9554_DRV["io_tca9554\n(io_expander_drivers)"]
        BUS_I2C_DRV["bus_i2c\n(communication_bus_drivers)"]
    end

    subgraph "LVGL Stack"
        LV_DISPLAY["lv_display_t"]
        LV_INDEV["lv_indev_t"]
        LV_TICK["lv_tick_inc()"]
        LV_EVENTS["lv_event_register_id()"]
    end

    subgraph "Cross-cutting"
        ACTIVITY["activity_manager\n(activity_manager)"]
        LOG["esp3d_log\n(logging_system)"]
        SNAPSHOT["esp3d_snapshot\n(optional)"]
    end

    APP --> BOARD_INIT
    BOARD_INIT --> INIT_IO
    BOARD_INIT --> INIT_DISP
    BOARD_INIT --> INIT_TOUCH
    BOARD_INIT --> INIT_LVGL
    BOARD_INIT --> CTRL_EVT

    INIT_IO --> BUS_I2C_DRV
    INIT_IO --> TCA9554_DRV
    INIT_DISP --> RM68120_DRV
    INIT_TOUCH --> FT5X06_DRV

    INIT_LVGL --> LV_DISPLAY
    INIT_LVGL --> LV_INDEV
    INIT_LVGL --> TICK_CB
    TICK_CB --> LV_TICK
    FLUSH_CB --> RM68120_DRV
    I80_CB --> LV_DISPLAY
    TOUCH_CB --> FT5X06_DRV
    TOUCH_CB --> ACTIVITY

    CTRL_EVT --> LV_EVENTS
    CTRL_EVT --> EVT_STRUCT

    LVGL_SYS --> LV_DISPLAY
    UI --> LV_DISPLAY
    UI --> LV_INDEV

    FLUSH_CB -.->|"optional"| SNAPSHOT
    LOG -.-> BOARD_INIT
```

---

## 4. Initialization Sequence

`board_init()` enforces a strict ordering. Each step is a prerequisite for the next:

```mermaid
sequenceDiagram
    participant APP as app_main
    participant BSP as board_init()
    participant ACT as activity_manager
    participant IO as init_io_expander()
    participant I2C as bus_i2c
    participant TCA as io_tca9554
    participant DISP as disp_rm68120_configure()
    participant TOUCH as init_touch_controller()
    participant FT5 as touch_ft5x06
    participant LVGL as init_lvgl()
    participant LV as LVGL stack

    APP->>BSP: board_init()
    BSP->>ACT: activity_manager_init()
    ACT-->>BSP: ESP_OK

    BSP->>IO: init_io_expander()
    IO->>I2C: bus_i2c_init(port, SDA, SCL, freq)
    I2C-->>IO: ESP_OK
    IO->>TCA: io_tca9554_configure(&default_config)
    Note over TCA: Sets BL_EN output HIGH,<br/>touch RST output HIGH
    TCA-->>IO: ESP_OK
    IO-->>BSP: ESP_OK

    BSP->>DISP: disp_rm68120_configure(&config, i80_flush_ready_cb)
    Note over DISP: Creates I80 bus,<br/>panel IO, RM68120 panel,<br/>sends init sequence
    DISP-->>BSP: ESP_OK (panel_handle stored internally)

    BSP->>TOUCH: init_touch_controller()
    TOUCH->>FT5: touch_ft5x06_configure(&default_config)
    Note over FT5: Detects I²C address,<br/>applies swap/invert config
    FT5-->>TOUCH: ESP_OK
    TOUCH-->>BSP: ESP_OK

    BSP->>LVGL: init_lvgl()
    LVGL->>LV: lv_init()
    LVGL->>LV: lv_display_create(W, H)
    LVGL->>LV: heap_caps_malloc(DMA) → buf1 [, buf2]
    LVGL->>LV: lv_display_set_buffers()
    LVGL->>LV: lv_display_set_flush_cb(lvgl_flush_cb)
    LVGL->>LV: esp_timer_create / start_periodic → increase_lvgl_tick
    LVGL->>LV: lv_indev_create() + set_read_cb(touch_read_cb)
    LV-->>LVGL: OK
    LVGL-->>BSP: ESP_OK

    BSP->>BSP: control_events_init()
    Note over BSP: Registers custom LVGL event IDs
    BSP-->>APP: ESP_OK
```

---

## 5. Component Reference

### 5.1 `board_init.c`

Primary file: `boards/esp32s3_hmi43v3/components/bsp/board_init.c`

#### Public API

| Symbol | Signature | Description |
|---|---|---|
| `board_init` | `esp_err_t board_init(void)` | Top-level board initialisation. Returns `ESP_OK` on success; any sub-step failure is propagated immediately (fail-fast). |
| `board_get_name` | `const char *board_get_name(void)` | Returns `BOARD_NAME_STR` (compile-time constant from `board_config.h`). |
| `board_get_version` | `const char *board_get_version(void)` | Returns `BOARD_VERSION_STR`. |
| `get_lvgl_display` | `lv_display_t *get_lvgl_display(void)` | Accessor for the LVGL display handle (used by `ESP3DXUi`). Returns `NULL` when `ESP3D_DISPLAY_FEATURE` is disabled. |
| `get_lvgl_lock` | `_lock_t *get_lvgl_lock(void)` | Accessor for the LVGL API mutex (used by `ESP3DXUi`). Returns `NULL` when display is disabled. |
| `get_touch_indev` | `lv_indev_t *get_touch_indev(void)` | Accessor for the touch input device handle (guarded by `ESP3D_TOUCH_FEATURE`). |

#### Private / static functions

| Symbol | Description |
|---|---|
| `i80_flush_ready_cb` | Registered as the DMA-complete ISR callback with the RM68120 driver. Calls `lv_display_flush_ready()` to unblock LVGL rendering. Executes in ISR context. |
| `lvgl_flush_cb` | LVGL flush callback. Optionally writes pixels to the snapshot file (`ESP3D_SNAPSHOT_FEATURE`), optionally byte-swaps the RGB565 buffer (`DISPLAY_SWAP_COLOR_FLAG`), then calls `esp_lcd_panel_draw_bitmap()`. |
| `touch_read_cb` | LVGL input device read callback (10 ms period). Reads `touch_ft5x06_data_t`, implements wake-up suppression (first touch wakes screen but is not forwarded to LVGL), and calls `activity_process_event()`. |
| `increase_lvgl_tick` | `esp_timer` periodic callback. Calls `lv_tick_inc(LVGL_TICK_PERIOD_MS)` to advance the LVGL internal clock. |
| `init_io_expander` | Initialises the shared I²C bus via `bus_i2c_init()` then configures the TCA9554. Must be the first display-related call. |
| `init_touch_controller` | Initialises the FT5x06 over the shared I²C bus (already brought up by `init_io_expander`). |
| `init_lvgl` | Allocates DMA pixel buffers, creates the LVGL display and touch indev, starts the periodic tick timer. |

#### Key file-scope state variables

| Variable | Type | Purpose |
|---|---|---|
| `lvgl_api_lock` | `_lock_t` | Mutual exclusion for all `lv_*` API calls originating outside the LVGL task |
| `lvgl_display` | `lv_display_t *` | LVGL display object wrapping the RM68120 panel |
| `lvgl_buf1` / `lvgl_buf2` | `lv_color16_t *` | DMA-capable pixel buffers (allocated from `MALLOC_CAP_DMA`) |
| `lvgl_tick_timer` | `esp_timer_handle_t` | Periodic high-resolution timer driving `lv_tick_inc()` |
| `touch_indev` | `lv_indev_t *` | LVGL pointer input device backed by the FT5x06 |

---

### 5.2 `control_event.h`

File: `boards/esp32s3_hmi43v3/components/bsp/control_event.h`

Defines the unified event payload carried by every control input (touch, encoder, switch, potentiometer) when dispatched as an LVGL custom event.

```c
typedef struct {
    lv_indev_t        *indev;           // originating LVGL input device
    uint32_t           btn_id;          // button / control identifier
    lv_indev_type_t    type;            // LVGL indev type (pointer, encoder, …)
    control_family_t   family_id;       // logical grouping (switch, encoder, …)
    int32_t            steps;           // signed encoder step count
    uint32_t           press_duration;  // hold duration in milliseconds
} control_event_t;
```

This struct is passed as `event_data` in `lv_event_send()` calls throughout the UI layer. UI screens retrieve it with:

```c
control_event_t *evt = (control_event_t *)lv_event_get_param(e);
```

See [`pibot_pendant_v1_0_bsp.md`](pibot_pendant_v1_0_bsp.md) for the full control family design — the pendant BSP uses the same `control_event_t` pattern with additional physical input types (encoder, potentiometer, switches).

---

### 5.3 `control_types.c`

File: `boards/esp32s3_hmi43v3/components/bsp/control_types.c`

Registers three custom LVGL event IDs after `lv_init()` has run:

| Global variable | Registered event |
|---|---|
| `LV_EVENT_SWITCH_PRESSED` | A physical switch was pressed |
| `LV_EVENT_SWITCH_RELEASED` | A physical switch was released |
| `LV_EVENT_POTENTIOMETER_CHANGED` | Potentiometer value changed |

```c
void control_events_init(void);   // called by board_init() after init_lvgl()
```

All three variables are initialised to `LV_EVENT_ALL` at compile time and are assigned unique IDs by `lv_event_register_id()` at runtime.

> **LVGL threading rule**: `control_events_init()` must be called from the LVGL task (Core 1) strictly after `lv_init()` and before any UI screen subscribes to these events.

---

## 6. LVGL Integration

```mermaid
graph LR
    subgraph "LVGL Task  (Core 1)"
        TH["lv_task_handler()"]
        RENDER["Render engine\n(lv_draw_sw)"]
        FLUSH["lvgl_flush_cb()"]
        INDEV["touch_read_cb()\n(10 ms timer)"]
    end

    subgraph "ISR / Timer context"
        TICK["increase_lvgl_tick()\n(esp_timer periodic)"]
        I80ISR["i80_flush_ready_cb()\n(I80 DMA complete ISR)"]
    end

    subgraph "Hardware"
        DMA_BUF["DMA Buffers\nbuf1 [+ buf2]"]
        PANEL["RM68120\npanel_draw_bitmap()"]
        TOUCH_HW["FT5x06\ntouch_ft5x06_read()"]
    end

    TH --> RENDER
    RENDER --> DMA_BUF
    DMA_BUF --> FLUSH
    FLUSH --> PANEL
    PANEL -->|"DMA done ISR"| I80ISR
    I80ISR -->|"lv_display_flush_ready()"| TH
    TICK -->|"lv_tick_inc()"| TH
    INDEV --> TOUCH_HW
    INDEV --> TH
```

**Double-buffer mode** (`DISPLAY_USE_DOUBLE_BUFFER_FLAG`): when enabled, a second DMA buffer is allocated so LVGL can prepare the next frame while the previous one is being transferred over the I80 bus, eliminating the flush stall.

**Color byte-swap** (`DISPLAY_SWAP_COLOR_FLAG`): some RM68120 panel variants expect RGB565 bytes in swapped order. When the flag is set, `lv_draw_sw_rgb565_swap()` is called inside `lvgl_flush_cb()` before `esp_lcd_panel_draw_bitmap()`. This is applied in software and has a small CPU cost proportional to the dirty rectangle size.

**Tick accuracy**: `increase_lvgl_tick` fires via `esp_timer` (hardware timer, not FreeRTOS tick), giving sub-millisecond accuracy for LVGL animation timings regardless of FreeRTOS tick rate.

---

## 7. Display Pipeline

```mermaid
flowchart LR
    A["LVGL renders\npixels → buf1"] --> B{Snapshot\nongoing?}
    B -->|"yes (ESP3D_SNAPSHOT_FEATURE)"| C["Write tiles to\ng_snapshot.file\nin 120-byte chunks"]
    B -->|"no"| D{Swap color?}
    C --> D
    D -->|"yes (DISPLAY_SWAP_COLOR_FLAG)"| E["lv_draw_sw_rgb565_swap()"]
    D -->|"no"| F["esp_lcd_panel_draw_bitmap()"]
    E --> F
    F -->|"I80 parallel\n16-bit bus"| G["RM68120\nDisplay Controller"]
    G -->|"DMA complete ISR"| H["i80_flush_ready_cb()"]
    H -->|"lv_display_flush_ready()"| I["LVGL unblocks\nnext frame"]
```

The RM68120 driver (`display_drivers_i80` → `disp_rm68120`) handles:
- I80 bus creation with `esp_lcd_new_i80_bus()`
- Panel IO handle with `esp_lcd_new_panel_io_i80()`
- Panel initialisation sequence: SLEEP OUT → MADCTL → COLMOD → DISPLAY ON
- The internal `disp_rm68120_notify_flush_ready` ISR that invokes the BSP-supplied `i80_flush_ready_cb`

See [`display_drivers_i80.md`](display_drivers_i80.md) for the full driver reference.

---

## 8. Touch Pipeline

```mermaid
flowchart TD
    A["FT5x06 HW\n(capacitive sensor)"] -->|"I²C read"| B["touch_ft5x06_read()\n→ touch_ft5x06_data_t"]
    B --> C["touch_read_cb()\n(LVGL indev, 10 ms)"]
    C --> D{First press\nthis session?}
    D -->|"yes"| E["activity_process_event()"]
    E --> F{Screen was\nasleep?}
    F -->|"yes → wake up"| G["Set touch_consumed_for_wakeup = true\nForward: LV_INDEV_STATE_RELEASED"]
    F -->|"no → already awake"| H["Set touch_consumed_for_wakeup = false\nForward: LV_INDEV_STATE_PRESSED (x,y)"]
    D -->|"continuation press"| I{Wake-up\ncycle active?}
    I -->|"yes"| J["Forward: LV_INDEV_STATE_RELEASED\n(suppress)"]
    I -->|"no"| K["Forward: LV_INDEV_STATE_PRESSED (x,y)"]
    C --> L{Release\ndetected?}
    L -->|"yes + wake-up cycle"| M["Clear flag\nSuppress release event"]
    L -->|"yes + normal"| N["activity_process_event()\nForward: LV_INDEV_STATE_RELEASED"]
```

**Wake-up suppression** is implemented with two static booleans:
- `last_pressed_state` — tracks the previous touch state to detect edges
- `touch_consumed_for_wakeup` — when `true`, suppresses both the press and the matching release from reaching LVGL

This ensures no accidental UI tap fires on screen wake-up.

The FT5x06 driver configuration (`touch_ft5x06_config_t`) supports:
- Up to 3 candidate I²C addresses (auto-detected at init)
- Coordinate swap (`swap_xy`) and inversion (`invert_x`, `invert_y`) for rotated panel mounts
- Optional hardware reset (`rst_pin`) and interrupt (`int_pin`) GPIO pins
- Configurable coordinate range (`x_max`, `y_max`; 0 = read from device)

See [`touch_drivers.md`](touch_drivers.md) for the full driver API.

---

## 9. Control Event System

The HMI43V3 BSP registers three custom LVGL events for physical controls. The event payload (`control_event_t`) carries all information needed by UI screens without them needing to know the originating hardware.

```mermaid
graph TD
    CE["control_events_init()"] -->|"lv_event_register_id()"| E1["LV_EVENT_SWITCH_PRESSED"]
    CE -->|"lv_event_register_id()"| E2["LV_EVENT_SWITCH_RELEASED"]
    CE -->|"lv_event_register_id()"| E3["LV_EVENT_POTENTIOMETER_CHANGED"]

    E1 -->|"lv_event_send(obj, event, &evt)"| UI["UI screen\nevent handlers"]
    E2 --> UI
    E3 --> UI

    subgraph "control_event_t payload"
        P1["indev → originating lv_indev_t*"]
        P2["btn_id → control identifier"]
        P3["type → lv_indev_type_t"]
        P4["family_id → control_family_t"]
        P5["steps → signed encoder delta"]
        P6["press_duration → ms held"]
    end

    UI --> P1
    UI --> P2
    UI --> P3
    UI --> P4
    UI --> P5
    UI --> P6
```

**Registration timing**: IDs are assigned at runtime by `lv_event_register_id()` in `control_events_init()`, which is called by `board_init()` after `init_lvgl()` completes. The three global variables (`LV_EVENT_SWITCH_PRESSED`, `LV_EVENT_SWITCH_RELEASED`, `LV_EVENT_POTENTIOMETER_CHANGED`) hold the assigned numeric codes and are safe to use from any task after `board_init()` returns.

---

## 10. Snapshot Feature

When `ESP3D_SNAPSHOT_FEATURE` is defined, `lvgl_flush_cb()` captures every rendered tile into an open file handle before the pixels are sent to the display. The snapshot accumulates multiple flush calls until the full logical frame has been captured.

**Capture flow** (inside `lvgl_flush_cb`, guarded by `ESP3D_SNAPSHOT_FEATURE`):

1. Check `g_snapshot.ongoing` (non-atomic read — safe because only the LVGL task writes it here).
2. Take `g_snapshot.mutex` (non-blocking `xSemaphoreTake(... , 0)`) — skip the tile if the mutex is busy rather than block the render pipeline.
3. Write pixels in `CHUNK_SIZE = 120` byte chunks via `fwrite()` to avoid large stack usage.
4. Accumulate `g_snapshot.captured_pixels`; when `>= g_snapshot.expected_pixels`, clear `g_snapshot.ongoing`.
5. On any `fwrite` error: set `g_snapshot.error = true`, clear `ongoing`, and stop.

This integrates with the higher-level snapshot API documented in ``lvgl_system.md``.

---

## 11. Build System

Module: `esp32s3_hmi43v3_build`
Path: `boards/esp32s3_hmi43v3/build_scripts/`

```mermaid
flowchart TD
    A["build_one.py\nmain()"] --> B["check_variant()\ncommon.py"]
    B --> C["make_variant_args(*on_flags)\nvariants.py"]
    C -->|"CMake -D args list"| D["build_variant(config)\ncommon.py"]
    D --> E{"--clean\nflag?"}
    E -->|"yes"| F["clean_build_dir()\n+ installer dir"]
    E -->|"no"| G["generate_resources()\nui_resources partition"]
    G --> H["run_cmake_build()\nidf.py -B build_dir"]
    H --> I["_show_size_report()"]
    I --> J["copy_factory_artifacts()"]
    J --> K["_copy_ui_resources_bin()"]
    K --> L["_package_user_resources_kit()"]
    L --> M["generate_flash_map()"]
```

**`make_variant_args()`** (`variants.py`): starts from `DEFAULT_OFF_CMAKE_ARGS` (all features off) and enables only the flags passed in, producing a deterministic CMake argument list. This controls which features are compiled (WiFi, BT, WebUI, transport selection, etc.).

**Build pipeline steps**:
1. Generate the `ui_resources` binary partition (icons, fonts, theme palettes) before any compilation.
2. Run `idf.py` via CMake in the board-specific build directory.
3. Print a size report to catch memory regressions early.
4. Copy factory app artifacts into the installer directory.
5. Copy the `ui_resources.bin` into the installer.
6. Package the `ui_resources_kit/` for end-user SD-card updates (non-fatal if it fails).
7. Write the flash address map.

See [`docs/guides/board_build_guidelines.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/board_build_guidelines.md) for the full cross-board build workflow and [`docs/ui_resources/development.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md) for the `ui_resources` partition format.

---

## 12. Factory Application

Module: `esp32s3_hmi43v3_factory_app`
Path: `boards/esp32s3_hmi43v3/Factory/`

The factory application is a standalone ESP-IDF project used for production flashing and board validation. It does **not** use LVGL — it drives the RM68120 directly with a minimal framebuffer stack to keep the binary small and fully independent of the main firmware.

```mermaid
graph TD
    subgraph "Factory App  -  esp32s3_hmi43v3/Factory/"
        MAIN["main.c  ·  app_main()"]

        subgraph "Display"
            RM_FAC["rm68120.c\nrm68120_flush_ready_cb()\n(IRAM_ATTR ISR → semaphore)"]
            GFX["gfx.c\ngfx_init / gfx_flush\ngfx_draw_string / gfx_fill_rect\ngfx_snapshot_begin/end"]
        end

        subgraph "Input"
            TOUCH_FAC["touch.c\ntouch_init / touch_read"]
            BUTTONS["buttons.c\nbuttons_init\nbutton_is_pressed\nbutton_wait_press"]
            ENCODER["encoder.c\nencoder_init / encoder_read"]
            BUZZER["buzzer.c\nbuzzer_init\nbuzzer_beep_short"]
        end

        subgraph "Storage"
            SDCARD["sdcard.c\nsdcard_mount / unmount"]
        end

        subgraph "Recovery Actions"
            BOOT["action_boot_partition()\nselect OTA slot"]
            SD_UPD["action_sd_update()\nflash firmware from SD"]
            SD_RES["action_sd_update_res()\nflash ui_resources from SD"]
            RESTORE["restore_otadata_from_backup()"]
        end

        subgraph "Menu UI (framebuffer)"
            MENU["draw_menu / draw_menu_item\ndraw_header / draw_footer_zone\ndraw_progress / draw_result"]
        end
    end

    subgraph "Flash Tools"
        FLASH_ALL["tools/flash_all.py"]
        FLASH_FAC["tools/flash_factory.py"]
    end

    MAIN --> RM_FAC
    MAIN --> GFX
    MAIN --> TOUCH_FAC
    MAIN --> BUTTONS
    MAIN --> ENCODER
    MAIN --> BUZZER
    MAIN --> SDCARD
    MAIN --> MENU
    MENU --> BOOT
    MENU --> SD_UPD
    MENU --> SD_RES
    MENU --> RESTORE

    FLASH_ALL -->|"esptool"| MAIN
    FLASH_FAC -->|"esptool"| MAIN
```

**Key difference from the main BSP**: the factory `rm68120_flush_ready_cb` is `IRAM_ATTR` and posts to a FreeRTOS semaphore from ISR context (`xSemaphoreGiveFromISR` + `portYIELD_FROM_ISR`). This synchronous semaphore-wait pattern is appropriate for the single-purpose factory app but is incompatible with the LVGL async pipeline used in the main firmware.

See [`docs/Factory/`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/Factory/) for factory app architecture details shared across all boards.

---

## 13. Dependencies

```mermaid
graph LR
    BSP["esp32s3_hmi43v3_bsp"] --> D1["display_drivers_i80\ndisp_rm68120"]
    BSP --> D2["touch_drivers\ntouch_ft5x06"]
    BSP --> D3["io_expander_drivers\nio_tca9554"]
    BSP --> D4["communication_bus_drivers\nbus_i2c"]
    BSP --> D5["activity_manager"]
    BSP --> D6["logging_system\nesp3d_log"]
    BSP --> D7["lvgl_object_core"]
    BSP --> D8["lvgl_display"]
    BSP --> D9["input_device\nlv_indev"]
    BSP --> D10["lvgl_event_system"]
    BSP -.->|"optional"| D11["esp3d_snapshot\n(ESP3D_SNAPSHOT_FEATURE)"]
```

| Dependency | Role in this BSP |
|---|---|
| [`display_drivers_i80`](display_drivers_i80.md) | RM68120 panel driver over I80 bus; provides `disp_rm68120_configure()`, `disp_rm68120_get_panel_handle()`, and the internal flush-ready ISR hook |
| [`touch_drivers`](touch_drivers.md) | FT5x06 capacitive touch; provides `touch_ft5x06_configure()` and `touch_ft5x06_read()` |
| [`io_expander_drivers`](io_expanders.md) | TCA9554 8-bit IO expander; provides `io_tca9554_configure()` for backlight enable and touch reset GPIO |
| [`communication_bus_drivers`](bus_drivers.md) | Shared I²C bus helper; `bus_i2c_init()` is idempotent and safe to call once for the shared bus |
| [`activity_manager`](esp3d_activity_manager.md) | Screen-idle / wake-up logic; called in `board_init()` (init) and `touch_read_cb()` (event) |
| [`logging_system`](esp3d_log.md) | `esp3d_log` / `esp3d_log_e` macros throughout init and callbacks |
| LVGL core | `lv_display_t`, `lv_indev_t`, `lv_event_register_id()`, `lv_tick_inc()` — see ``lvgl_object_core``, ``lvgl_display``, [`input_device`](physical_input.md) |
| ``lvgl_system`` | Snapshot feature integration (`g_snapshot`, `esp3d_snapshot.h`) |

**Sibling BSPs using the same I80 interface** (for cross-reference):
- [`esp32s3_zx3d50ce02s_usrc_4832_bsp.md`](esp32s3_zx3d50ce02s_usrc_4832_bsp.md) — ST7796 over I80, same `i80_flush_ready_cb` pattern
- [`esp32s3_bzm_tft35_gt911_bsp.md`](esp32s3_bzm_tft35_gt911_bsp.md) — ST7796 over SPI with GT911 touch

**Boards using RGB parallel bus** (different display architecture):
- [`esp32s3_8048s043c`](bsp.md), [`esp32s3_8048s050c`](bsp.md), [`esp32s3_8048s070c`](bsp.md) — use `disp_on_vsync_event` instead of `i80_flush_ready_cb`

---

## 14. Configuration Constants (Quick Reference)

All board-specific constants are defined in `board_config.h` and `tasks_def.h`. The table below lists every symbol referenced in `board_init.c`:

| Constant | Used in | Meaning |
|---|---|---|
| `BOARD_NAME_STR` | `board_init`, `board_get_name` | Human-readable board name string |
| `BOARD_VERSION_STR` | `board_init`, `board_get_version` | Hardware revision string |
| `DISPLAY_WIDTH_PX` | `init_lvgl` | Logical display width in pixels |
| `DISPLAY_HEIGHT_PX` | `init_lvgl` | Logical display height in pixels |
| `DISP_BUF_SIZE_BYTES` | `init_lvgl` | Byte size of each DMA draw buffer |
| `DISPLAY_USE_DOUBLE_BUFFER_FLAG` | `init_lvgl` | `1` = allocate `buf2` for double-buffered rendering |
| `DISPLAY_SWAP_COLOR_FLAG` | `lvgl_flush_cb` | `1` = swap RGB565 byte order before panel write |
| `LVGL_TICK_PERIOD_MS` | `init_lvgl`, `increase_lvgl_tick` | LVGL tick increment period in milliseconds |
| `TOUCH_I2C_PORT_IDX` | `init_io_expander` | ESP-IDF I²C port number for the shared bus |
| `TOUCH_I2C_SDA_PIN` | `init_io_expander` | GPIO number for I²C SDA |
| `TOUCH_I2C_SCL_PIN` | `init_io_expander` | GPIO number for I²C SCL |
| `TOUCH_I2C_FREQ_HZ` | `init_io_expander` | I²C clock frequency in Hz |

### Compile-time feature flags

| Flag | Effect when defined |
|---|---|
| `ESP3D_DISPLAY_FEATURE` | Enables IO expander + display + touch + LVGL initialisation in `board_init()` |
| `ESP3D_TOUCH_FEATURE` | Enables `init_touch_controller()` and `lv_indev_t` registration in `init_lvgl()` |
| `ESP3D_SNAPSHOT_FEATURE` | Enables pixel-capture path inside `lvgl_flush_cb()` |

---

*For the general display driver architecture (SPI vs I80 vs RGB-parallel), see [`docs/architecture/display_drivers.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/display_drivers.md). For memory constraints relevant to DMA buffer sizing, see [`docs/guides/esp32_memory_constraints.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md).*
