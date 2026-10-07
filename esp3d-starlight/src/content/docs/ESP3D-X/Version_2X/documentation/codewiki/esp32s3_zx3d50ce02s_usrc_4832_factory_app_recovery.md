---
title: "ESP32S3-ZX3D50CE02S-USRC-4832 Factory Recovery Module"
---

# ESP32S3-ZX3D50CE02S-USRC-4832 Factory Recovery Module

## Overview

The `esp32s3_zx3d50ce02s_usrc_4832_factory_app_recovery` module is the **recovery application logic** embedded in the factory partition of the ESP32S3-ZX3D50CE02S-USRC-4832 board. It provides a minimal, touch-navigable menu that runs independently of the main firmware, allowing field recovery of the device through SD-card-based firmware and resource updates, and manual selection of boot partitions.

This module is the recovery sub-module of the parent [esp32s3_zx3d50ce02s_usrc_4832_factory_app](esp32s3_zx3d50ce02s_usrc_4832_factory_app.md). It is implemented in two files:

| File | Purpose |
|---|---|
| `boards/esp32s3_zx3d50ce02s_usrc_4832/Factory/main/main.c` | Recovery application: menu, OTA restore, SD flash, UI rendering |
| `boards/esp32s3_zx3d50ce02s_usrc_4832/Factory/main/factory_log.h` | Compile-time debug log gating and SD stack silencer |

---

## Board-Specific Constraints

This board has **no physical buttons, no encoder, and no buzzer** — all corresponding GPIO pins are `GPIO_NUM_NC`. Navigation is exclusively **touch-based** using three virtual on-screen buttons rendered at the bottom of the display.

| Hardware | Present | Detail |
|---|---|---|
| Display | ✅ | ST7796, 480×320, Intel 8080 (I80) parallel bus |
| Touch | ✅ | FT5x06, I2C |
| Physical buttons | ❌ | All `GPIO_NUM_NC` |
| Rotary encoder | ❌ | All `GPIO_NUM_NC` |
| Buzzer | ❌ | `GPIO_NUM_NC` |
| SD card | ✅ | SPI bus, FAT filesystem, mounted at `/sdcard` |
| Snapshot (GPIO0) | Optional | `ENABLE_SNAPSHOT` compile flag |

> **Shared reset line**: `TFT_RST_PIN` resets both the ST7796 display panel and the FT5x06 touch controller simultaneously. `st7796_i80_init()` must always run **before** `touch_init()`. See the [Display sub-module](esp32s3_zx3d50ce02s_usrc_4832_factory_app_display.md) for driver details.

The button/encoder/buzzer driver code is **identical to other boards** (e.g., `pibot_pendant_v1_0`) and simply no-ops when the GPIO is `GPIO_NUM_NC`, so the same firmware source builds cleanly for all variants.

---

## Module Architecture

```mermaid
graph TD
    subgraph Recovery["Recovery Module (main.c + factory_log.h)"]
        APP["app_main()"]
        OTA["restore_otadata_from_backup()"]
        MENU["Menu System\ndraw_menu / draw_menu_item\nmenu_move / menu_select"]
        DISPATCH["dispatch_button()"]
        ACTIONS["Actions\naction_boot_partition()\naction_sd_update()\naction_sd_update_res()"]
        TOUCH_HIT["touch_hint_hit_test()"]
        STATUS["show_status() / clear_status()"]
        PROGRESS["draw_progress() / draw_result()"]
        SNAP["Snapshot System\nsnapshot_take() / snapshot_check()\nsnap_find_next_number()"]
        LOG["factory_log_silence_sd_stack()"]
    end

    subgraph Display["Display Sub-module"]
        GFX["gfx.c\ngfx_clear / fill_rect / draw_string\ngfx_hline / vline / rect\ngfx_snapshot_begin / end"]
        ST7796["st7796_i80.c\nst7796_i80_init()\nst7796_i80_flush()"]
    end

    subgraph Input["Input Sub-module"]
        BTN["buttons.c\nbuttons_init()\nbutton_wait_press()"]
        ENC["encoder.c\nencoder_init()\nencoder_read()"]
        TCH["touch.c\ntouch_init()\ntouch_read()"]
        BUZ["buzzer.c\nbuzzer_init()\nbuzzer_beep_short()"]
    end

    subgraph Storage["Storage"]
        SD["sdcard.c\nsdcard_mount()\nsdcard_unmount()"]
        FLASH["ESP-IDF Flash\nesp_ota_begin/write/end\nesp_partition_write\nesp_flash_read/write"]
    end

    APP --> LOG
    APP --> OTA
    APP --> ST7796
    APP --> GFX
    APP --> BTN
    APP --> ENC
    APP --> TCH
    APP --> BUZ
    APP --> MENU
    APP --> DISPATCH

    MENU --> GFX
    MENU --> STATUS
    MENU --> PROGRESS

    DISPATCH --> MENU
    DISPATCH --> ACTIONS

    TOUCH_HIT --> DISPATCH

    ACTIONS --> SD
    ACTIONS --> FLASH
    ACTIONS --> GFX

    OTA --> FLASH
    SNAP --> SD
    SNAP --> GFX
```

---

## Startup Sequence

`app_main()` runs a strict initialization sequence. The order is critical due to the shared reset line between display and touch.

```mermaid
sequenceDiagram
    participant OS as FreeRTOS / ESP-IDF
    participant APP as app_main()
    participant LOG as factory_log.h
    participant OTA as OTA Restore
    participant DISP as ST7796 I80
    participant GFX as gfx.c
    participant IN as Buttons / Encoder / Touch / Buzzer
    participant SD as sdcard.c

    OS->>APP: app_main() called
    APP->>LOG: factory_log_silence_sd_stack()
    Note over LOG: Mutes sdmmc / vfs_fat / sdspi tags at runtime
    APP->>OTA: restore_otadata_from_backup()
    Note over OTA: Reads magic at 0xB040<br/>Restores otadata at 0x10000<br/>Clears backup sector
    APP->>DISP: st7796_i80_init()
    Note over DISP: Resets both display AND touch controller<br/>(shared TFT_RST_PIN)
    APP->>APP: gpio_config(TFT_LED) + gpio_set_level HIGH
    APP->>GFX: gfx_init()
    APP->>IN: buttons_init() - no-op (GPIO_NUM_NC)
    APP->>IN: encoder_init() - no-op (GPIO_NUM_NC)
    APP->>IN: touch_init()
    Note over IN: FT5x06 via I2C<br/>Must run after st7796_i80_init()
    APP->>IN: buzzer_init() - no-op (GPIO_NUM_NC)
    APP->>APP: Detect partitions (app1 present?)
    APP->>APP: Build menu_items[]
    APP->>SD: probe_sd_files()
    Note over SD: Checks /sdcard/esp3dfw.bin<br/>and /sdcard/ui_resources.bin
    APP->>GFX: draw_menu()
    APP->>APP: Enter main event loop
```

---

## OTA Data Backup & Restore

This is the first critical operation performed at startup. The main firmware (`esp444.cpp`) backs up the OTA partition table entries to a reserved flash region before switching to the factory partition. The recovery app restores this backup on startup so that power-cycling from recovery always returns the device to the correct firmware slot.

```mermaid
flowchart TD
    START([app_main starts])
    READ_MAGIC["Read 4 bytes at 0xB000 + 0x40\nOTADATA_BACKUP_OFFSET + BACKUP_MAGIC_OFFSET"]
    CHECK_MAGIC{magic == 0xAA55AA55?}
    NO_BACKUP["Log: No backup found\nReturn false"]
    READ_ENTRIES["Read entry1[32] from 0xB000\nRead entry2[32] from 0xB020"]
    CHECK_EMPTY{Both entries\n0xFF filled?}
    SKIP["Skip restore → goto clear_backup"]
    ERASE_OTA["Erase otadata sector 1 at 0x10000\nErase otadata sector 2 at 0x11000"]
    WRITE_OTA["Write entry1 to 0x10000\nWrite entry2 to 0x11000\n(if not empty)"]
    CLEAR_BACKUP["Erase backup sector at 0xB000"]
    DONE([Continue startup])

    START --> READ_MAGIC --> CHECK_MAGIC
    CHECK_MAGIC -- No --> NO_BACKUP --> DONE
    CHECK_MAGIC -- Yes --> READ_ENTRIES --> CHECK_EMPTY
    CHECK_EMPTY -- Yes --> SKIP --> CLEAR_BACKUP
    CHECK_EMPTY -- No --> ERASE_OTA --> WRITE_OTA --> CLEAR_BACKUP
    CLEAR_BACKUP --> DONE
```

**Flash layout constants** — must match `esp444.cpp` in the main firmware exactly:

| Constant | Value | Description |
|---|---|---|
| `OTADATA_OFFSET` | `0x10000` | Live OTA data region start |
| `OTADATA_SECTOR_SIZE` | `0x1000` | 4 KB per OTA entry sector |
| `OTADATA_ENTRY_SIZE` | `32` | Bytes per OTA entry |
| `OTADATA_BACKUP_OFFSET` | `0xB000` | Backup region (pre-partition space, below `0xC000`) |
| `BACKUP_MAGIC_OFFSET` | `0x40` | Byte offset of magic word within backup sector |
| `BACKUP_MAGIC` | `0xAA55AA55` | Presence sentinel value |

> ⚠️ **`CONFIG_SPI_FLASH_DANGEROUS_WRITE_ALLOWED=y` is required** in the factory sdkconfig. Erasing `0xB000` (below the first partition at `0xD000`) is aborted by default. The factory app is a privileged recovery tool that manages flash directly, making this opt-in intentional.

---

## Recovery Menu System

The menu is a simple indexed list with selection highlight, rendered directly via the GFX layer — no LVGL, no FreeRTOS scheduler dependency beyond `vTaskDelay`. All menu state is stored in module-level globals.

### Menu Data Model

```c
typedef struct {
    const char   *label;    // Display text
    menu_action_t action;   // Action identifier (enum)
    uint16_t      color;    // Text color when not selected
} menu_item_t;

static menu_item_t menu_items[MENU_MAX_ITEMS];  // Max 8 items
static int menu_count    = 0;
static int menu_selected = 0;
```

### Dynamically Built Menu Items

| Menu Item Label | Condition | Action Enum |
|---|---|---|
| `Boot app0` | Always | `MENU_ACTION_BOOT_APP0` |
| `Boot app1` | Only if `app1` partition found | `MENU_ACTION_BOOT_APP1` |
| `SD -> app0` | Always | `MENU_ACTION_SD_UPDATE_APP0` |
| `SD -> app1` | Only if `app1` partition found | `MENU_ACTION_SD_UPDATE_APP1` |
| `SD -> resources` | Always | `MENU_ACTION_SD_UPDATE_RES` |

> This board ships with only `app0`. `app1` items appear only if the partition table includes it.

### Screen Layout

```
┌──────────────────────────────────────────────────────────────┐  y=0
│              Recovery vX.Y.Z                                  │
│                                                               │  y=40
├───────────────────────────────────────────────────────────────┤
│              Active: app0                                     │  y=45
│ SD: FW RES                                                    │  y=68
├───────────────────────────────────────────────────────────────┤  y=88
│ ▌ Boot app0           (selected - highlight box)             │  y=94
│   Boot app1                                                   │  y=128
│   SD -> app0                                                  │  y=162
│   SD -> app1                                                  │  y=196
│   SD -> resources                                             │  y=230
├───────────────────────────────────────────────────────────────┤  STATUS_Y-7
│              Power off to cancel                              │  STATUS_Y
├───────────────────────────────────────────────────────────────┤  BTN_HINT_BASE_Y
│           (▲)          (▼)          (✓)                      │
└──────────────────────────────────────────────────────────────┘  y=320
```

**Layout constants** (480×320 canvas, 8×16 font):

| Constant | Value | Description |
|---|---|---|
| `SCREEN_WIDTH` | 480 | From `hw_config.h` |
| `SCREEN_HEIGHT` | 320 | From `hw_config.h` |
| `MENU_START_Y` | 94 | Y-coordinate of first menu item |
| `MENU_ITEM_H` | 34 | Pixels per menu item row |
| `MENU_PAD_X` | 20 | Left/right padding |
| `FONT_WIDTH` | 8 | Glyph width in pixels |
| `FONT_HEIGHT` | 16 | Glyph height in pixels |
| `BTN_CIRCLE_R` | 22 | Virtual button circle radius |
| `BTN_HINT_H` | `2*R+9` | Total height of the button hint bar |
| `STATUS_Y` | `SCREEN_HEIGHT - 28 - BTN_HINT_H` | Footer / status text Y |
| `MENU_HIGHLIGHT` | `RGB565(0,80,160)` | Dark blue selection box fill |
| `MENU_HIGHLIGHT_TXT` | `RGB565(80,160,255)` | Bright blue selected label |

---

## Input Handling & Event Loop

The main loop polls three input sources concurrently: encoder, physical buttons, and touchscreen. All three converge on `dispatch_button()` with a `button_id_t`, keeping action logic unified regardless of input source.

```mermaid
flowchart TD
    LOOP([Main loop iteration])
    SNAP_CHK["snapshot_check()\n#ifdef ENABLE_SNAPSHOT"]
    ENC["encoder_read()"]
    ENC_UP{"enc > 0?"}
    ENC_DN{"enc < 0?"}
    BTN["button_wait_press(100ms)"]
    TCH["touch_read()"]
    TCH_PRESS{pressed &&\nnot prev pressed?}
    HIT["touch_hint_hit_test(x, y)"]
    HIT_VALID{vbtn != BTN_NONE?}
    FEEDBACK["draw_button_hint_pressed(vbtn)\nbuzzer_beep_short() - no-op\nvTaskDelay(80ms)\ndraw_button_hints()"]
    DISPATCH["dispatch_button(btn / vbtn)"]
    MENU_UP["menu_move(-1) → Up"]
    MENU_DN["menu_move(+1) → Down"]
    EXEC["execute_selected_action()"]

    LOOP --> SNAP_CHK --> ENC
    ENC --> ENC_UP
    ENC_UP -- Yes --> MENU_UP --> BTN
    ENC_UP -- No --> ENC_DN
    ENC_DN -- Yes --> MENU_DN --> BTN
    ENC_DN -- No --> BTN
    BTN -->|BTN_1| DISPATCH
    BTN -->|BTN_2| DISPATCH
    BTN -->|BTN_3| DISPATCH
    BTN -->|BTN_NONE| TCH
    TCH --> TCH_PRESS
    TCH_PRESS -- No --> LOOP
    TCH_PRESS -- Yes --> HIT --> HIT_VALID
    HIT_VALID -- No --> LOOP
    HIT_VALID -- Yes --> FEEDBACK --> DISPATCH
    DISPATCH -->|BTN_1| MENU_UP
    DISPATCH -->|BTN_2| MENU_DN
    DISPATCH -->|BTN_3| EXEC
    EXEC --> LOOP
    MENU_UP --> LOOP
    MENU_DN --> LOOP
```

### Virtual Button Touch Hit-Testing

The three virtual buttons (up / down / ok) are horizontally centered on the screen. The hit-test divides the screen using **midpoints between the icon centers**, not screen-width thirds, to correctly account for the non-uniform icon spacing.

```
Screen width: 480 px

  BTN_HINT_CX1 = 240 - 100 = 140   (▲ up)
  BTN_HINT_CX2 = 240             = 240   (▼ down)
  BTN_HINT_CX3 = 240 + 100 = 340   (✓ ok)

  boundary_1_2 = (140 + 240) / 2 = 190
  boundary_2_3 = (240 + 340) / 2 = 290

  Touch zones (y >= BTN_HINT_BASE_Y only):
    x < 190         -> BTN_1 (up)
    190 <= x < 290  -> BTN_2 (down)
    x >= 290        -> BTN_3 (ok)
```

---

## SD Card Firmware Flash Flow

`action_sd_update(target_label)` flashes `/sdcard/esp3dfw.bin` into the named OTA application partition using the ESP-IDF OTA API.

```mermaid
sequenceDiagram
    participant U as User (BTN_3)
    participant M as main.c
    participant SD as sdcard.c
    participant OTA as ESP-IDF OTA API
    participant FLASH as SPI Flash

    U->>M: execute_selected_action() -> action_sd_update('app0')
    M->>M: esp_partition_find_first(TYPE_APP, ANY, 'app0')
    M->>SD: sdcard_mount()
    M->>M: fopen('/sdcard/esp3dfw.bin', 'rb')
    M->>M: Validate size: > 0 and <= partition size
    M->>M: draw_flashing_screen()
    M->>OTA: esp_ota_begin(update_part, fw_size, &handle)
    loop 1 KB chunks
        M->>M: fread(buf, 1, 1024, file)
        M->>OTA: esp_ota_write(handle, buf, read_len)
        M->>M: draw_progress(percent)
    end
    M->>OTA: esp_ota_end(handle)
    M->>OTA: esp_ota_set_boot_partition(update_part)
    M->>M: rename esp3dfw.bin to esp3dfw.ok  (or .bad on failure)
    M->>SD: sdcard_unmount()
    alt Success
        M->>M: draw_result(true, 'Success! Rebooting...')
        M->>FLASH: esp_restart()
    else Failure
        M->>M: draw_result(false, 'FAILED! Power cycle.')
        M->>M: probe_sd_files() + draw_menu()
    end
```

**SD file naming conventions:**

| File | Role |
|---|---|
| `/sdcard/esp3dfw.bin` | Input — firmware binary to flash |
| `/sdcard/esp3dfw.ok` | Output — renamed from `.bin` on success |
| `/sdcard/esp3dfw.bad` | Output — renamed from `.bin` on failure |
| `/sdcard/ui_resources.bin` | Input — UI resources binary to flash |
| `/sdcard/ui_resources.ok` | Output — renamed from `.bin` on success |
| `/sdcard/ui_resources.bad` | Output — renamed from `.bin` on failure |

---

## SD Card Resource Flash Flow

`action_sd_update_res()` flashes `/sdcard/ui_resources.bin` into the `ui_resources` data partition using direct partition erase + write (not the OTA API, since this is a data partition).

```mermaid
sequenceDiagram
    participant M as main.c
    participant SD as sdcard.c
    participant PART as ESP-IDF Partition API

    M->>PART: esp_partition_find_first(TYPE_DATA, ANY, 'ui_resources')
    M->>SD: sdcard_mount()
    M->>M: fopen('/sdcard/ui_resources.bin', 'rb')
    M->>M: Read 16-byte build header
    Note over M: Bytes 0-3: 'ESP3' magic<br/>Bytes 4-15: 12-char variant string<br/>Log variant or warn if no header
    M->>M: Validate file size: > 0 and <= partition size
    M->>M: draw_flashing_screen()
    M->>PART: esp_partition_erase_range(res_part, 0, res_part->size)
    loop 1 KB chunks
        M->>M: fread(buf, 1, 1024, file)
        M->>PART: esp_partition_write(res_part, offset, buf, read_len)
        M->>M: draw_progress(percent)
    end
    M->>M: rename ui_resources.bin to .ok or .bad
    M->>SD: sdcard_unmount()
    alt Success
        M->>M: draw_result(true, 'Done! Rebooting...')
        M->>M: esp_restart()
    else Failure
        M->>M: draw_result(false, 'FAILED! Power cycle.')
        M->>M: probe_sd_files() + draw_menu()
    end
```

> **Build header**: `ui_resources.bin` files generated by `generate_resources.py` carry a 16-byte prefix: bytes 0–3 are `"ESP3"`, bytes 4–15 are a 12-character null-padded variant string identifying firmware type and transport. This enables early detection of wrong-variant binaries. Legacy binaries without the header are accepted with a log warning.

---

## Boot Partition Selection Flow

`action_boot_partition(label)` uses `esp_ota_set_boot_partition()` to redirect the next boot, then immediately restarts.

```mermaid
flowchart LR
    A["User selects\nBoot app0 or Boot app1"] --> B["show_status('Booting appX...')"]
    B --> C["vTaskDelay(500 ms)"]
    C --> D["esp_partition_find_first(label)"]
    D -- Found --> E["esp_ota_set_boot_partition()"]
    E -- OK --> F["esp_restart()"]
    D -- Not found --> G["show_status('appX not found!', RED)"]
    E -- Fails --> G
    G --> H[Return to menu]
```

---

## SD Probe & Status Indicators

Before rendering the initial menu, `probe_sd_files()` mounts the SD card, checks for both firmware and resource binaries, then unmounts. Two global flags store the result:

```c
static bool sd_has_fw  = false;   // /sdcard/esp3dfw.bin exists
static bool sd_has_res = false;   // /sdcard/ui_resources.bin exists
```

`draw_sd_indicators()` renders a one-line status at y=68 — `FW` in green when firmware is present, `RES` in cyan when resources are present — giving the user immediate visual confirmation before selecting an update action.

---

## Snapshot System (Optional)

When compiled with `ENABLE_SNAPSHOT`, pressing the physical BOOT button (GPIO0) saves a raw screenshot to the SD card. This is a development and diagnostics aid — it works during both the menu display and mid-flash progress screens.

```mermaid
flowchart TD
    CHK["snapshot_check()\ncalled each loop iteration"]
    GPIO{GPIO0 low?}
    DEB1["vTaskDelay(50 ms) debounce"]
    STILL{Still low?}
    TAKE["snapshot_take()"]
    WAIT["Wait for GPIO0 release\n+ 50 ms debounce"]
    SKIP([Return])

    CHK --> GPIO
    GPIO -- No --> SKIP
    GPIO -- Yes --> DEB1 --> STILL
    STILL -- No --> SKIP
    STILL -- Yes --> TAKE --> WAIT --> SKIP

    subgraph TAKE_DETAIL["snapshot_take() internals"]
        SD_MOUNT["sdcard_mount()"]
        FIND_N["snap_find_next_number()\nScans snap000.raw to snap999.raw"]
        GFX_BEGIN["gfx_snapshot_begin('/sdcard/snapNNN.raw')\nWrites header: width(u32-LE) + height(u32-LE)\nPre-fills remaining bytes with zeros"]
        REDRAW["Full screen redraw\ndraw_menu() or draw_flashing_screen()\ndraw_progress() if mid-flash\nAll gfx_* calls also write via snap_write()"]
        GFX_END["gfx_snapshot_end() - close file"]
    end

    TAKE --> SD_MOUNT --> FIND_N --> GFX_BEGIN --> REDRAW --> GFX_END
```

**Raw file format**: 4-byte LE width + 4-byte LE height + `width × height × 2` bytes of RGB565 pixel data in row-major order (no compression; 480×320 = 300 KB per file).

---

## Debug Logging System

`factory_log.h` provides a two-level logging system with independent compile-time and runtime controls.

```mermaid
flowchart LR
    COMPILE{"ENABLE_FACTORY_DEBUG_LOG\nset in CMakeLists.txt"}
    LEVEL1["FACTORY_LOG_LEVEL = 1\nFACTORY_LOGD maps to ESP_LOGI\nsdkconfig ceiling raised to INFO"]
    LEVEL0["FACTORY_LOG_LEVEL = 0\nFACTORY_LOGD is a no-op\nsdkconfig.prod_log suppresses\nIDF startup banners"]
    RUNTIME["factory_log_silence_sd_stack() at runtime\nesp_log_level_set to NONE for:\nsdmmc / vfs_fat_sdmmc / sdmmc_periph\nsdmmc_req / sdmmc_common / fatfs\nsdspi / sd_diskio"]

    COMPILE -- ON --> LEVEL1 --> RUNTIME
    COMPILE -- OFF --> LEVEL0 --> RUNTIME
```

> `ESP_LOGW` and `ESP_LOGE` are **always active** regardless of `FACTORY_LOG_LEVEL`. Only routine info/progress logs (`FACTORY_LOGD`) are gated. The SD stack silencer is always called because debug builds raise the sdkconfig ceiling globally — making IDF-internal SD chatter visible again — while the factory app only cares about its own logic.

---

## Component Relationships

```mermaid
graph LR
    THIS["esp32s3_zx3d50ce02s_usrc_4832\n_factory_app_recovery\nmain.c + factory_log.h"]

    DISPLAY["Display sub-module\nesp32s3_zx3d50ce02s_usrc_4832\n_factory_app_display\nst7796_i80.c + gfx.c"]

    INPUT["Input sub-module\nesp32s3_zx3d50ce02s_usrc_4832\n_factory_app_input\nbuttons.c + encoder.c\ntouch.c + buzzer.c"]

    FLASH_TOOLS["Flash Tools sub-module\nesp32s3_zx3d50ce02s_usrc_4832\n_factory_app_flash_tools\nflash_all.py + flash_factory.py"]

    PARENT["Parent module\nesp32s3_zx3d50ce02s_usrc_4832\n_factory_app\nsdcard.c + all sub-modules"]

    ESPIDF["ESP-IDF APIs\nesp_ota_ops\nesp_partition\nesp_flash\nesp_vfs_fat / sdmmc"]

    THIS -->|"renders via"| DISPLAY
    THIS -->|"reads input via"| INPUT
    THIS -->|"reads / writes SD"| ESPIDF
    THIS -->|"manages partitions"| ESPIDF
    THIS -.->|"deployed by"| FLASH_TOOLS
    THIS -->|"part of"| PARENT
```

See also:
- [Display sub-module](esp32s3_zx3d50ce02s_usrc_4832_factory_app_display.md) — ST7796 I80 driver and GFX drawing primitives
- [Input sub-module](esp32s3_zx3d50ce02s_usrc_4832_factory_app_input.md) — buttons, encoder, touch, and buzzer drivers
- [Flash Tools](esp32s3_zx3d50ce02s_usrc_4832_factory_app_flash_tools.md) — Python scripts to flash the factory partition onto the device

---

## Key Functions Reference

| Function | File | Description |
|---|---|---|
| `app_main()` | `main.c` | Recovery entry point; full hardware init + event loop |
| `restore_otadata_from_backup()` | `main.c` | Restores OTA table from flash backup; first call in `app_main` |
| `boot_partition(label)` | `main.c` | Sets OTA boot target by label and triggers `esp_restart()` |
| `action_boot_partition(label)` | `main.c` | UI wrapper: shows status message, calls `boot_partition()` |
| `action_sd_update(label)` | `main.c` | Full SD → OTA flash flow for application partitions |
| `action_sd_update_res()` | `main.c` | Full SD → direct-write flash flow for `ui_resources` data partition |
| `probe_sd_files()` | `main.c` | Mounts SD, checks for `esp3dfw.bin` / `ui_resources.bin`, unmounts |
| `draw_menu()` | `main.c` | Full screen redraw: header + partition info + items + footer + button bar |
| `draw_menu_item(index)` | `main.c` | Renders one menu row with optional selection highlight box |
| `draw_header()` | `main.c` | Clears screen, draws double border, title string, separator |
| `draw_footer_zone()` | `main.c` | Renders status message or default "Power off to cancel" text |
| `draw_sd_indicators()` | `main.c` | Renders `FW` (green) / `RES` (cyan) labels based on SD probe state |
| `draw_button_hints()` | `main.c` | Renders 3 virtual button circles with icons and separator line |
| `draw_button_hint_at(cx,cy,btn,color)` | `main.c` | Draws one button circle + icon at given center coordinates |
| `draw_button_hint_pressed(btn)` | `main.c` | Briefly recolors one virtual button for press feedback |
| `draw_progress(percent)` | `main.c` | Updates the progress bar during flash operations |
| `draw_result(ok, msg)` | `main.c` | Shows success or failure result after a flash operation |
| `draw_flashing_screen()` | `main.c` | Shows "Flashing... Do NOT power off!" full-screen warning |
| `menu_move(direction)` | `main.c` | Moves selection by ±1 with wrap-around; clears status |
| `menu_select(index)` | `main.c` | Sets selection index, clears status, redraws affected rows |
| `dispatch_button(btn)` | `main.c` | Maps BTN_1→up, BTN_2→down, BTN_3→execute; single dispatch point |
| `execute_selected_action()` | `main.c` | Invokes the action of the currently highlighted menu item |
| `touch_hint_hit_test(x, y)` | `main.c` | Maps touch coordinates to virtual BTN_1/2/3 or BTN_NONE |
| `show_status(msg, color)` | `main.c` | Stores and renders a status message in the footer zone |
| `clear_status()` | `main.c` | Clears status message; footer reverts to "Power off to cancel" |
| `snapshot_take()` | `main.c` | Saves a raw RGB565 screenshot to SD (`#ifdef ENABLE_SNAPSHOT`) |
| `snapshot_check()` | `main.c` | Non-blocking GPIO0 poll; triggers `snapshot_take()` on press |
| `snap_find_next_number()` | `main.c` | Scans SD for next available `snapNNN.raw` filename |
| `factory_log_silence_sd_stack()` | `factory_log.h` | Silences ESP-IDF SD/FAT log tags at runtime via `esp_log_level_set` |

---

## Entry Point Trigger

Unlike boards with a physical boot-hold button (e.g., `pibot_pendant_v1_0` with its custom bootloader hook), this board has **no custom bootloader**. Entry to the recovery partition is triggered exclusively by the **main firmware's `[ESP444]FACTORY` command** (`esp444.cpp`), which:

1. Backs up the current OTA partition table entries to flash at `0xB000`
2. Calls `esp_ota_set_boot_partition()` targeting the factory partition
3. Restarts the device

On the next boot, the ESP-IDF bootloader loads the factory app, and `app_main()` restores the OTA table backup before rendering the recovery menu. Power-cycling from recovery therefore returns the device to its original firmware slot without any further user action.
