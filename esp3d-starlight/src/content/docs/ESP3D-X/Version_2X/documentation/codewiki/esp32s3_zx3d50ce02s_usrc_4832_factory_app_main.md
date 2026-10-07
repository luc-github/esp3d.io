---
title: "esp32s3_zx3d50ce02s_usrc_4832_factory_app_main"
---

# esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_main

Factory recovery application entry point and orchestration logic for the **ESP32S3-ZX3D50CE02S-USRC-4832** board (480×320, ST7796 via Intel 8080). This module implements the complete recovery menu: hardware bring-up, OTA backup restore, touch-navigated menu, SD-card firmware flashing, UI resources flashing, and optional screen snapshot capture.

---

## Table of Contents

1. [Module Role and Scope](#1-module-role-and-scope)
2. [Board Context](#2-board-context)
3. [Architecture Overview](#3-architecture-overview)
4. [Module Decomposition](#4-module-decomposition)
5. [Hardware Initialization Sequence](#5-hardware-initialization-sequence)
6. [OTA Backup Restore Mechanism](#6-ota-backup-restore-mechanism)
7. [Menu System](#7-menu-system)
8. [Flash Operations](#8-flash-operations)
9. [Display Layout](#9-display-layout)
10. [Virtual Button and Touch System](#10-virtual-button-and-touch-system)
11. [Snapshot System](#11-snapshot-system)
12. [Logging System](#12-logging-system)
13. [Key Constants and Configuration](#13-key-constants-and-configuration)
14. [Data Flow](#14-data-flow)
15. [Related Modules](#15-related-modules)

---

## 1. Module Role and Scope

This module is the **top-level orchestrator** of the factory recovery application for the ZX3D50CE02S-USRC-4832 board. It runs from the ESP32-S3's `factory` OTA partition and is entered exclusively via the software `[ESP444]FACTORY` command issued by the main pendant firmware — **not** through a physical button held at boot (the board has no physical buttons).

**What this module owns:**

| Responsibility | Function |
|---|---|
| Application entry point | `app_main()` |
| Hardware init orchestration | Ordered init of display → backlight → gfx → buttons → encoder → touch → buzzer |
| OTA backup restore | `restore_otadata_from_backup()` |
| Menu rendering and navigation | `draw_menu()`, `menu_move()`, `menu_select()` |
| Partition boot switching | `boot_partition()`, `action_boot_partition()` |
| Firmware OTA flash from SD | `action_sd_update()` |
| UI resources flash from SD | `action_sd_update_res()` |
| Input dispatch (touch + physical) | `dispatch_button()`, `touch_hint_hit_test()` |
| Progress and result rendering | `draw_progress()`, `draw_result()` |
| Screen snapshot (optional) | `snapshot_take()`, `snapshot_check()` |

**What this module does NOT own** (delegated to sibling modules):

- Raw display driver and pixel-level drawing primitives → see [esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_display.md](esp32s3_zx3d50ce02s_usrc_4832_factory_app_display.md)
- Button, encoder, touch, buzzer drivers → see [esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_input.md](esp32s3_zx3d50ce02s_usrc_4832_factory_app_input.md)
- SD card mount/unmount → see [esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_storage.md](esp32s3_zx3d50ce02s_usrc_4832_factory_app_storage.md)
- Flash and factory deployment tooling → see [esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_tools.md](esp32s3_zx3d50ce02s_usrc_4832_factory_app_tools.md)

---

## 2. Board Context

| Property | Value |
|---|---|
| SoC | ESP32-S3 |
| Board ID | ESP32S3-ZX3D50CE02S-USRC-4832 |
| Display | 480×320, ST7796 controller via Intel 8080 (I80) parallel bus |
| Display driver | `st7796_i80` (see [esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_display.md](esp32s3_zx3d50ce02s_usrc_4832_factory_app_display.md)) |
| Touch controller | Capacitive (shares RESET GPIO with display) |
| Physical buttons | **None** — all `GPIO_NUM_NC` |
| Physical encoder | **None** — `GPIO_NUM_NC` |
| Buzzer | **None** — `GPIO_NUM_NC` |
| IO expander | **None** (unlike esp32s3\_hmi43v3 which uses TCA9554) |
| Backlight | Plain active-high GPIO (`TFT_LED`) |
| Custom bootloader | **None** — no physical trigger mechanism exists |
| Factory entry path | Software only: main firmware `[ESP444]FACTORY` command |

The absence of physical inputs is the primary design difference from boards like `pibot_pendant_v1_0` or `esp32s3_hmi43v3`. All user interaction occurs through the **virtual button hints** rendered at the bottom of the touchscreen.

---

## 3. Architecture Overview

```mermaid
graph TB
    subgraph "Main Firmware (pendant app)"
        ESP444["[ESP444]FACTORY command"]
    end

    subgraph "Factory Recovery Partition"
        AppMain["app_main()\nmain.c"]
    end

    subgraph "Hardware Bring-up"
        DisplayInit["st7796_i80_init()\n(resets touch too)"]
        BacklightGPIO["gpio_config / gpio_set_level\n(TFT_LED, active-high)"]
        GFXInit["gfx_init()"]
        InputInit["buttons_init() / encoder_init()\ntouch_init() / buzzer_init()"]
    end

    subgraph "Recovery Logic (main.c)"
        OtaRestore["restore_otadata_from_backup()"]
        MenuBuild["Build menu_items[]"]
        ProbeSD["probe_sd_files()"]
        DrawMenu["draw_menu()"]
        MainLoop["Main Event Loop"]
    end

    subgraph "User Input Sources"
        TouchInput["touch_read()"]
        ButtonInput["button_wait_press()"]
        EncoderInput["encoder_read()"]
    end

    subgraph "Actions"
        BootAction["action_boot_partition()\nboot_partition()"]
        FWFlash["action_sd_update()\nOTA API flash"]
        ResFlash["action_sd_update_res()\nPartition direct write"]
    end

    subgraph "Sibling Modules"
        DisplayMod["factory_app_display\ngfx + st7796_i80"]
        InputMod["factory_app_input\nbuttons/encoder/touch/buzzer"]
        StorageMod["factory_app_storage\nsdcard_mount/unmount"]
    end

    ESP444 -->|"sets boot partition to factory\nbacks up otadata"| AppMain
    AppMain --> DisplayInit
    DisplayInit --> BacklightGPIO
    BacklightGPIO --> GFXInit
    GFXInit --> InputInit
    InputInit --> OtaRestore
    OtaRestore --> MenuBuild
    MenuBuild --> ProbeSD
    ProbeSD --> DrawMenu
    DrawMenu --> MainLoop

    MainLoop --> TouchInput
    MainLoop --> ButtonInput
    MainLoop --> EncoderInput

    TouchInput -->|"touch_hint_hit_test()"| MainLoop
    ButtonInput --> MainLoop
    EncoderInput --> MainLoop

    MainLoop -->|"dispatch_button()"| BootAction
    MainLoop -->|"dispatch_button()"| FWFlash
    MainLoop -->|"dispatch_button()"| ResFlash

    AppMain -.->|"gfx_*() calls"| DisplayMod
    AppMain -.->|"buttons_*, touch_*, encoder_*"| InputMod
    AppMain -.->|"sdcard_mount/unmount"| StorageMod
```

---

## 4. Module Decomposition

The `esp32s3_zx3d50ce02s_usrc_4832_factory_app_main` module consists of exactly two source files:

```mermaid
graph LR
    subgraph "esp32s3_zx3d50ce02s_usrc_4832_factory_app_main"
        MainC["main.c\nAll recovery logic\nUI draw, OTA, SD flash"]
        FactoryLog["factory_log.h\nConditional debug logging\nSD stack silencing"]
    end

    MainC -->|"#include"| FactoryLog
```

### `main.c` — Functional Groups

```mermaid
graph TB
    subgraph "main.c functional groups"
        G1["OTA Backup/Restore\nrestore_otadata_from_backup()"]
        G2["Partition Helpers\nboot_partition()\nget_active_ota_label()"]
        G3["SD Probe\nprobe_sd_files()"]
        G4["Menu System\nmenu_item_t, menu_move()\nmenu_select(), draw_menu_item()"]
        G5["UI Drawing\ndraw_header(), draw_menu()\ndraw_footer_zone(), draw_progress()\ndraw_flashing_screen(), draw_result()\ndraw_sd_indicators()"]
        G6["Button Hint Icons\ndraw_circle(), draw_up_arrow()\ndraw_down_arrow(), draw_check_mark()\ndraw_button_hint_at(), draw_button_hints()\ndraw_button_hint_pressed()"]
        G7["Touch Navigation\ntouch_hint_hit_test()"]
        G8["Actions\naction_boot_partition()\naction_sd_update()\naction_sd_update_res()"]
        G9["Input Dispatch\ndispatch_button()\nexecute_selected_action()"]
        G10["Snapshot (optional)\nsnap_find_next_number()\nsnapshot_take()\nsnapshot_check()"]
        G11["Entry Point\napp_main()"]
        G12["Status Bar\nshow_status(), clear_status()"]
    end
```

### `factory_log.h` — Compile-time Log Gate

| Symbol | Behaviour |
|---|---|
| `FACTORY_LOGD(tag, fmt, ...)` | Expands to `ESP_LOGI` if `FACTORY_LOG_LEVEL != 0`, otherwise to `do {} while (0)` |
| `FACTORY_LOG_LEVEL` | Set by `ENABLE_FACTORY_DEBUG_LOG` in `Factory/CMakeLists.txt`; default `0` (silent) |
| `factory_log_silence_sd_stack()` | Calls `esp_log_level_set()` on 8 SD/FAT driver tags to suppress runtime chatter |

`ESP_LOGW` and `ESP_LOGE` always remain active regardless of `FACTORY_LOG_LEVEL`.

---

## 5. Hardware Initialization Sequence

The init order in `app_main()` is **strictly constrained** by shared hardware lines:

```mermaid
sequenceDiagram
    participant App as app_main()
    participant Display as st7796_i80_init()
    participant BL as Backlight GPIO
    participant GFX as gfx_init()
    participant Btn as buttons_init()
    participant Enc as encoder_init()
    participant Touch as touch_init()
    participant Buzz as buzzer_init()

    App->>Display: st7796_i80_init()
    Note over Display,Touch: CRITICAL: Display RESET GPIO is physically<br/>shared with touch controller RESET.<br/>st7796_i80_init() issues the panel reset<br/>pulse that also brings touch out of reset.
    Display-->>App: ESP_OK or abort()

    App->>BL: gpio_config(TFT_LED, OUTPUT)
    App->>BL: gpio_set_level(TFT_LED, 1)
    Note over BL: Active-high, no IO expander,<br/>no PWM on this board

    App->>GFX: gfx_init()
    Note over GFX: Frame buffer and font setup

    App->>Btn: buttons_init()
    Note over Btn: No-op - BUTTON_n_PIN all NC

    App->>Enc: encoder_init()
    Note over Enc: No-op - ENCODER_n_PIN all NC

    App->>Touch: touch_init()
    Note over Touch: Must run AFTER st7796_i80_init().<br/>touch.c rst_pin is NC.

    App->>Buzz: buzzer_init()
    Note over Buzz: No-op - BUZZER_PIN is NC
```

> **Critical constraint:** On this board, `touch_init()` must always be called after `st7796_i80_init()`. The display and touch controller share the same `TFT_RST_PIN` GPIO. If `touch_init()` tried to toggle reset independently before the display init, it could corrupt the panel's state. This is unlike boards with an IO expander (e.g., `esp32s3_hmi43v3` using TCA9554) where the lines can be controlled independently.

---

## 6. OTA Backup Restore Mechanism

### Purpose

The main pendant firmware writes a backup of the ESP32's OTA metadata (`otadata` partition) to a reserved flash sector **before** switching the boot partition to `factory`. This ensures that if the device powers off during recovery, a subsequent boot still targets the correct main firmware partition (`app0`) rather than looping back to factory indefinitely.

### Flash Layout

```
Flash address space
┌────────────────────┬──────────┐
│ 0x0000  Bootloader │          │
├────────────────────┤          │
│ 0x8000  ... (gap)  │          │
├────────────────────┤          │
│ 0xB000  BACKUP     │ ← OTADATA_BACKUP_OFFSET (4 KB sector)
│         sector     │   Written by main firmware (esp444.cpp)
│  +0x00  entry1[32] │   Magic at +0x40 = 0xAA55AA55
│  +0x20  entry2[32] │
│  +0x40  MAGIC[4]   │
├────────────────────┤          │
│ 0xC000  Partition  │          │
│         table      │          │
├────────────────────┤          │
│ 0xD000  NVS part.  │          │
├────────────────────┤          │
│ 0x10000 otadata    │ ← OTADATA_OFFSET (2×4 KB)
│  entry1[32]        │   Restored to here from backup
│  entry2[32]        │
├────────────────────┤          │
│ ...     app0       │          │
│ ...     app1       │          │
│ ...     factory    │ ← We are here
│ ...     ui_res     │          │
└────────────────────┘
```

### Restore Flow

```mermaid
flowchart TD
    Start["restore_otadata_from_backup()"]
    ReadMagic["esp_flash_read(NULL, &magic,\nOTADATA_BACKUP_OFFSET + 0x40, 4)"]
    CheckMagic{magic == 0xAA55AA55?}
    LogNoBackup["FACTORY_LOGD: No backup found\nreturn false"]
    ReadEntries["Read entry1[32] and entry2[32]\nfrom OTADATA_BACKUP_OFFSET"]
    CheckEmpty{Both entries\nall 0xFF?}
    LogEmpty["ESP_LOGW: empty backup\ngoto clear_backup"]
    EraseOtadata["esp_flash_erase_region(NULL,\n0x10000, 0x1000)\nesp_flash_erase_region(NULL,\n0x11000, 0x1000)"]
    WriteEntry1{entry1 not empty?}
    WriteE1["esp_flash_write(NULL, entry1, 0x10000, 32)"]
    WriteEntry2{entry2 not empty?}
    WriteE2["esp_flash_write(NULL, entry2, 0x11000, 32)"]
    ClearBackup["esp_flash_erase_region(NULL,\n0xB000, 0x1000)\n(prevents re-restore on next boot)"]
    ReturnTrue["return true"]

    Start --> ReadMagic
    ReadMagic --> CheckMagic
    CheckMagic -->|No| LogNoBackup
    CheckMagic -->|Yes| ReadEntries
    ReadEntries --> CheckEmpty
    CheckEmpty -->|Yes| LogEmpty
    LogEmpty --> ClearBackup
    CheckEmpty -->|No| EraseOtadata
    EraseOtadata --> WriteEntry1
    WriteEntry1 -->|Yes| WriteE1
    WriteE1 --> WriteEntry2
    WriteEntry1 -->|No| WriteEntry2
    WriteEntry2 -->|Yes| WriteE2
    WriteE2 --> ClearBackup
    WriteEntry2 -->|No| ClearBackup
    ClearBackup --> ReturnTrue
```

### Important Constraints

| Constraint | Detail |
|---|---|
| `OTADATA_BACKUP_OFFSET` alignment | Must be 4 KB-aligned |
| `OTADATA_BACKUP_OFFSET` range | After bootloader end, before partition table at `0xC000` |
| No partition overlap | First partition (NVS) starts at `0xD000` |
| `CONFIG_SPI_FLASH_DANGEROUS_WRITE_ALLOWED=y` | Required in factory `sdkconfig` — addresses below the first partition are written directly. The factory app is a privileged recovery tool; this is intentional. |
| Must match main firmware | `OTADATA_BACKUP_OFFSET` and `BACKUP_MAGIC` values **must be identical** in both `main.c` and the main firmware's `esp444.cpp`. |

---

## 7. Menu System

### Menu Items

Menu items are built dynamically at startup based on detected partitions and the static `menu_item_t` struct:

```c
typedef struct {
    const char *label;      // Display label
    menu_action_t action;   // Action enum
    uint16_t color;         // Text color when not selected
} menu_item_t;
```

| Condition | Items Added |
|---|---|
| Always | `"Boot app0"` (MENU_ACTION_BOOT_APP0) |
| `has_app1 == true` | `"Boot app1"` (MENU_ACTION_BOOT_APP1) |
| Always | `"SD -> app0"` (MENU_ACTION_SD_UPDATE_APP0) |
| `has_app1 == true` | `"SD -> app1"` (MENU_ACTION_SD_UPDATE_APP1) |
| Always | `"SD -> resources"` (MENU_ACTION_SD_UPDATE_RES) |

`has_app1` is detected with `esp_partition_find_first(APP, ANY, "app1")` at startup. On this board variant, only `app0` is shipped by default.

### Menu State

```
Static state:
  menu_items[]      — array of up to MENU_MAX_ITEMS (8) items
  menu_count        — actual item count (3 without app1, 5 with app1)
  menu_selected     — index of currently highlighted item
  last_status_msg   — footer status text (or "" for default message)
  last_status_color — footer text color
  sd_has_fw         — true if /sdcard/esp3dfw.bin exists
  sd_has_res        — true if /sdcard/ui_resources.bin exists
  has_app1          — true if app1 partition found
```

### Navigation Logic

```mermaid
flowchart LR
    subgraph "Navigation (menu_move)"
        MoveUp["menu_move(-1)\ndirection = -1"]
        MoveDown["menu_move(+1)\ndirection = +1"]
        CalcTarget["target = selected + direction"]
        WrapTop{"target < 0?"}
        WrapBot{"target >= count?"}
        SetBottom["target = count - 1"]
        SetTop["target = 0"]
        MenuSelect["menu_select(target)"]
    end

    MoveUp --> CalcTarget
    MoveDown --> CalcTarget
    CalcTarget --> WrapTop
    WrapTop -->|Yes| SetBottom
    WrapTop -->|No| WrapBot
    WrapBot -->|Yes| SetTop
    WrapBot -->|No| MenuSelect
    SetBottom --> MenuSelect
    SetTop --> MenuSelect
```

`menu_select()` additionally calls `clear_status()` if a status message is showing, then redraws only the two affected menu items (old and new selection) rather than the full screen.

---

## 8. Flash Operations

### 8.1 Firmware Flash (`action_sd_update`)

Flashes `esp3dfw.bin` from the SD card to a target OTA partition using the ESP-IDF OTA API.

```mermaid
sequenceDiagram
    participant Main as action_sd_update()
    participant Part as esp_partition_find_first()
    participant SD as sdcard_mount()
    participant File as fopen(FW_FILENAME)
    participant OTA as esp_ota_begin/write/end
    participant Display as draw_flashing_screen() + draw_progress()

    Main->>Part: Find target partition by label
    Part-->>Main: update_part or NULL → show_status error

    Main->>SD: sdcard_mount()
    SD-->>Main: ESP_OK or → show_status error

    Main->>File: fopen('/sdcard/esp3dfw.bin', 'rb')
    File-->>Main: fw_file or NULL → show_status error

    Main->>Main: Validate fw_size (>0, ≤partition size)

    Main->>Display: draw_flashing_screen()

    Main->>OTA: esp_ota_begin(update_part, fw_size, &handle)

    loop 1 KB chunks until fw_size written
        Main->>File: fread(buf, 1, 1024, fw_file)
        File-->>Main: read_len bytes
        Main->>OTA: esp_ota_write(handle, buf, read_len)
        Main->>Display: draw_progress(percent) on change
    end

    Main->>OTA: esp_ota_end(handle)
    Main->>OTA: esp_ota_set_boot_partition(update_part)
    Main->>Main: rename esp3dfw.bin → esp3dfw.ok (or .bad)
    Main->>SD: sdcard_unmount()
    Main->>Main: draw_result(ok, ...) then esp_restart() or draw_menu()
```

**Error handling:** If any step fails, `esp_ota_abort()` is called, the file is renamed to `.bad`, and the recovery menu is redrawn. Heap size is logged before and after SD mount to aid diagnosing allocation failures on constrained builds.

### 8.2 Resources Flash (`action_sd_update_res`)

Flashes `ui_resources.bin` from the SD card to the `ui_resources` partition using direct partition write (not OTA API, since it is a data partition).

```mermaid
sequenceDiagram
    participant Main as action_sd_update_res()
    participant Part as esp_partition_find_first(DATA, ANY, 'ui_resources')
    participant SD as sdcard_mount()
    participant File as fopen(RES_FILENAME)
    participant Flash as esp_partition_erase_range + write
    participant Display as draw_flashing_screen() + draw_progress()

    Main->>Part: Find 'ui_resources' data partition
    Main->>SD: sdcard_mount()
    Main->>File: fopen('/sdcard/ui_resources.bin', 'rb')

    Note over File: Reads first 16 bytes to check build header:<br/>'ESP3' magic + 12-char variant string.<br/>Logs variant for mismatch detection.

    Main->>Main: Validate res_size (>0, ≤partition size)
    Main->>Display: draw_flashing_screen()
    Main->>Flash: esp_partition_erase_range(res_part, 0, res_part->size)

    loop 1 KB chunks until res_size written
        Main->>File: fread(buf, 1, 1024, res_file)
        Main->>Flash: esp_partition_write(res_part, offset, buf, read_len)
        Main->>Display: draw_progress(percent) on change
    end

    Main->>Main: rename ui_resources.bin → .ok or .bad
    Main->>SD: sdcard_unmount()
    Main->>Main: esp_restart() on success, or draw_menu() on failure
```

**Build header check:** The first 16 bytes of `ui_resources.bin` contain `"ESP3"` + a 12-character variant string (generated by `generate_resources.py`). This is logged for early detection of board/transport mismatches — the flash is not blocked by a mismatch, only a warning is logged.

### File Naming Convention

| Stage | Firmware filename | Resources filename |
|---|---|---|
| Before flash | `esp3dfw.bin` | `ui_resources.bin` |
| After success | `esp3dfw.ok` | `ui_resources.ok` |
| After failure | `esp3dfw.bad` | `ui_resources.bad` |

This prevents re-flashing a broken binary on subsequent entries if the rename succeeds before the reboot.

---

## 9. Display Layout

The recovery UI uses **font8×16** (not font12×24) because the 480 px canvas is narrower than boards that use the wider font (e.g., `esp32s3_hmi43v3` at 800 px). The 320 px height provides more vertical room than some other boards (e.g., `esp32s3_4827s043c` at 272 px), leaving extra margin with the same layout constants.

```
┌──────────────────────────────────────────────────┐ y=0
│          Recovery v1.x.x   (COLOR_CYAN)          │ y=13
│──────────────────────────────────────── y=40 ────│
│        Active: app0 (default)  (YELLOW)           │ y=45
│ SD:  FW  RES  (right-aligned, GREEN/CYAN)         │ y=68
│──────────────────────────────────────── y=88 ────│
│ ┌────────────────────────────────────┐            │ y=94  MENU_START_Y
│ │  Boot app0   ← highlight box      │ item 0     │       MENU_ITEM_H=34
│ └────────────────────────────────────┘            │
│   Boot app1                                       │ item 1
│   SD -> app0                                      │ item 2
│   SD -> app1                                      │ item 3
│   SD -> resources                                 │ item 4
│                                                   │
│─────────────────────────────── STATUS_Y-7 ───────│
│    Power off to cancel  (or status message)       │ STATUS_Y
│─────────────────────────────── BTN_HINT_BASE_Y ──│
│     ↑              ↓              ✓               │ BTN_HINT_CY
│  (BTN_1/blue)  (BTN_2/blue)  (BTN_3/green)       │
└──────────────────────────────────────────────────┘ y=319
 x=0                                            x=479
```

### Layout Constants

| Constant | Value | Description |
|---|---|---|
| `MENU_START_Y` | 94 | Y of first menu item |
| `MENU_ITEM_H` | 34 | Height per menu item (including gap) |
| `MENU_PAD_X` | 20 | Left/right padding for menu items |
| `FONT_WIDTH` | 8 | Pixel width of one character |
| `FONT_HEIGHT` | 16 | Pixel height of one character |
| `BTN_CIRCLE_R` | 22 | Radius of virtual button circles |
| `BTN_HINT_H` | 53 | Total height of button hint bar (2×22+9) |
| `STATUS_Y` | `SCREEN_HEIGHT - 28 - BTN_HINT_H` | Y of status/footer line |
| `BTN_HINT_BASE_Y` | `SCREEN_HEIGHT - BTN_HINT_H` | Y of hint bar top separator |
| `BTN_HINT_CY` | `BTN_HINT_BASE_Y + 5 + BTN_CIRCLE_R` | Centre Y of all hint circles |
| `BTN_HINT_CX1` | `SCREEN_WIDTH/2 - 100` = 140 | Centre X: up button |
| `BTN_HINT_CX2` | `SCREEN_WIDTH/2` = 240 | Centre X: down button |
| `BTN_HINT_CX3` | `SCREEN_WIDTH/2 + 100` = 340 | Centre X: OK button |

### Color Palette

| Constant | RGB values | Usage |
|---|---|---|
| `MENU_HIGHLIGHT` | `GFX_RGB565(0,80,160)` | Selection box fill |
| `MENU_HIGHLIGHT_TXT` | `GFX_RGB565(80,160,255)` | Selected item text |
| `BTN_NAV_COLOR` | `GFX_RGB565(100,160,255)` | Up/down button icons |
| `BTN_OK_COLOR` | `GFX_RGB565(100,220,100)` | OK/select button icon |
| `BTN_PRESSED_COLOR` | `GFX_RGB565(180,80,220)` | Touch press feedback flash |

---

## 10. Virtual Button and Touch System

Because the board has no physical buttons, the only real input is the capacitive touchscreen. The recovery app renders three **virtual button hints** at the bottom of the screen and maps touch coordinates to them.

### Virtual Button Mapping

| Virtual Button | Icon | Action | Circle Centre X |
|---|---|---|---|
| `BTN_1` | ↑ Up arrow | `menu_move(-1)` | 140 (`SCREEN_WIDTH/2 - 100`) |
| `BTN_2` | ↓ Down arrow | `menu_move(+1)` | 240 (`SCREEN_WIDTH/2`) |
| `BTN_3` | ✓ Check mark | `execute_selected_action()` | 340 (`SCREEN_WIDTH/2 + 100`) |

### Touch Hit Test

The hit test uses **column midpoints between button centres**, not screen thirds, because the icons are clustered around screen centre. Using screen thirds would map BTN_1 and BTN_3 to the wrong columns.

```mermaid
flowchart TD
    Touch["touch_hint_hit_test(x, y)"]
    CheckY{"y < BTN_HINT_BASE_Y?"}
    ReturnNone["return BTN_NONE"]
    Boundary12["boundary_1_2 = (CX1 + CX2) / 2\n= (140 + 240) / 2 = 190"]
    Boundary23["boundary_2_3 = (CX2 + CX3) / 2\n= (240 + 340) / 2 = 290"]
    CheckX1{"x < 190?"}
    CheckX2{"x < 290?"}
    RetBtn1["return BTN_1 (up)"]
    RetBtn2["return BTN_2 (down)"]
    RetBtn3["return BTN_3 (OK)"]

    Touch --> CheckY
    CheckY -->|Yes| ReturnNone
    CheckY -->|No| Boundary12
    Boundary12 --> Boundary23
    Boundary23 --> CheckX1
    CheckX1 -->|Yes| RetBtn1
    CheckX1 -->|No| CheckX2
    CheckX2 -->|Yes| RetBtn2
    CheckX2 -->|No| RetBtn3
```

### Touch Event Processing (main loop)

```mermaid
flowchart TD
    ReadTouch["touch = touch_read()"]
    WasPressed{touch.pressed &&\n!touch_was_pressed?}
    HitTest["vbtn = touch_hint_hit_test(touch.x, touch.y)"]
    ValidBtn{vbtn != BTN_NONE?}
    PressFeedback["draw_button_hint_pressed(vbtn)\nbuzzer_beep_short()\nvTaskDelay(80ms)"]
    RedrawHints["draw_button_hints()"]
    Dispatch["dispatch_button(vbtn)"]
    UpdateState["touch_was_pressed = touch.pressed"]

    ReadTouch --> WasPressed
    WasPressed -->|Yes| HitTest
    WasPressed -->|No| UpdateState
    HitTest --> ValidBtn
    ValidBtn -->|Yes| PressFeedback
    ValidBtn -->|No| UpdateState
    PressFeedback --> RedrawHints
    RedrawHints --> Dispatch
    Dispatch --> UpdateState
```

The `touch_was_pressed` edge-detection (`pressed && !was_pressed`) prevents repeated triggers from a held finger. The violet flash (`BTN_PRESSED_COLOR`) and 80 ms delay provide haptic-equivalent visual feedback before the action executes.

### Icon Drawing Primitives

All icon primitives are built from `gfx_hline()` spans only (no diagonal line support required):

| Function | Icon | Geometry |
|---|---|---|
| `draw_circle(cx,cy,r,color)` | Circle outline | Midpoint algorithm, 8-way symmetry |
| `draw_up_arrow(cx,cy,color)` | ↑ Arrow | 7-row head + 10-row stem; fits inside r=22 |
| `draw_down_arrow(cx,cy,color)` | ↓ Arrow | 10-row stem + 7-row head; fits inside r=22 |
| `draw_check_mark(cx,cy,color)` | ✓ Checkmark | 4 px thick, two arms with junction row |

Each button circle is drawn twice (radii `r` and `r-1`) for a bolder outline without a fill.

---

## 11. Snapshot System

The snapshot system is **conditionally compiled** via `#ifdef ENABLE_SNAPSHOT`. When enabled, pressing GPIO0 (the ESP32-S3 BOOT button on the devkit footprint) captures the current screen state to a `.raw` file on the SD card. This is primarily a development and documentation aid.

```mermaid
flowchart TD
    Check["snapshot_check()\ncalled each main loop iteration\nand at key flash milestones"]
    GPIO0{"gpio_get_level(GPIO_NUM_0) == 0?"}
    Debounce["vTaskDelay(50ms)"]
    Recheck{still pressed?}
    Take["snapshot_take()"]
    WaitRelease["Wait for GPIO0 release\n+ 50ms debounce"]
    Return["return (no snapshot)"]

    Check --> GPIO0
    GPIO0 -->|No| Return
    GPIO0 -->|Yes| Debounce
    Debounce --> Recheck
    Recheck -->|No| Return
    Recheck -->|Yes| Take
    Take --> WaitRelease
    WaitRelease --> Return
```

### Snapshot Capture Sequence

```mermaid
sequenceDiagram
    participant Snap as snapshot_take()
    participant SD as sdcard_mount()
    participant GFX as gfx_snapshot_begin/end()
    participant Draw as Full screen redraw

    Snap->>SD: sdcard_mount()
    Snap->>Snap: snap_find_next_number() on first call\n(scans /sdcard/snap000.raw .. snap999.raw)
    Snap->>GFX: gfx_snapshot_begin('/sdcard/snap###.raw')
    Note over GFX: All subsequent gfx_* calls<br/>write pixels to both display and file
    Snap->>Draw: draw_menu() - or - draw_flashing_screen() + draw_progress()
    Snap->>GFX: gfx_snapshot_end()
    Snap->>Snap: s_snapshot_count++
```

### Snapshot State Variables

| Variable | Purpose |
|---|---|
| `s_snap_in_flash` | `true` during OTA/resource flash; snapshot redraws the flash progress screen instead of the menu |
| `s_flash_last_percent` | Last progress percentage; passed to `draw_progress()` when redrawing during a flash snapshot |
| `s_snapshot_count` | Monotonically incremented after each capture; initialized on first snapshot by scanning existing files |

`snapshot_check()` is also called at these strategic flash checkpoints: after `draw_flashing_screen()`, at each progress percentage update, and after `draw_result()`.

---

## 12. Logging System

### `factory_log.h` Design

```mermaid
graph LR
    ENABLE_FLAG["ENABLE_FACTORY_DEBUG_LOG\n(Factory/CMakeLists.txt option)"]
    LOG_LEVEL["FACTORY_LOG_LEVEL\n(compile-time define:\n0=silent, 1=active)"]
    LOGD_MACRO["FACTORY_LOGD(tag, fmt, ...)\n→ ESP_LOGI if level≠0\n→ do {} while(0) if level=0"]
    SILENCE_FN["factory_log_silence_sd_stack()\n→ esp_log_level_set() × 8 tags\n→ ESP_LOG_NONE at runtime"]

    ENABLE_FLAG -->|"ON → =1"| LOG_LEVEL
    ENABLE_FLAG -->|"OFF → =0"| LOG_LEVEL
    LOG_LEVEL --> LOGD_MACRO
```

### SD Stack Tags Silenced at Runtime

`factory_log_silence_sd_stack()` (first call in `app_main`) sets these tags to `ESP_LOG_NONE`:

```
"sdmmc"         "vfs_fat_sdmmc"   "sdmmc_periph"   "sdmmc_req"
"sdmmc_common"  "fatfs"           "sdspi"          "sd_diskio"
```

These are silenced because:
- **Production builds (level 0):** `sdkconfig.prod_log` already suppresses them, but runtime silencing ensures correctness if the sdkconfig baseline is ever changed.
- **Debug builds (level 1):** `sdkconfig` ceiling is raised to `INFO` for everything, which makes the SD stack verbose and obscures the factory app's own logic.

ESP-IDF internal startup logs emitted before `app_main()` are handled separately via `sdkconfig.prod_log`, not this runtime mechanism.

---

## 13. Key Constants and Configuration

### Flash Layout Constants

| Constant | Value | Notes |
|---|---|---|
| `OTADATA_OFFSET` | `0x10000` | Standard ESP32-S3 otadata address |
| `OTADATA_SECTOR_SIZE` | `0x1000` | 4 KB |
| `OTADATA_ENTRY_SIZE` | `32` | Bytes per OTA entry |
| `OTADATA_BACKUP_OFFSET` | `0xB000` | **Must match `esp444.cpp` in main firmware** |
| `BACKUP_MAGIC_OFFSET` | `0x40` | Byte offset within backup sector for magic word |
| `BACKUP_MAGIC` | `0xAA55AA55` | Sentinel; **must match main firmware** |

### SD File Paths

| Constant | Path | Description |
|---|---|---|
| `FW_FILENAME` | `/sdcard/esp3dfw.bin` | Main firmware binary |
| `FW_OK_FILENAME` | `/sdcard/esp3dfw.ok` | Rename target on success |
| `FW_BAD_FILENAME` | `/sdcard/esp3dfw.bad` | Rename target on failure |
| `RES_FILENAME` | `/sdcard/ui_resources.bin` | UI resources binary |
| `RES_OK_FILENAME` | `/sdcard/ui_resources.ok` | Rename target on success |
| `RES_BAD_FILENAME` | `/sdcard/ui_resources.bad` | Rename target on failure |

### Flash Buffer

```c
uint8_t buf[1024];   // 1 KB static read buffer — shared by both flash operations
```

A 1 KB static buffer avoids heap fragmentation during recovery. Both `action_sd_update()` and `action_sd_update_res()` reuse this pattern with separate local declarations.

### Menu Limits

| Constant | Value | Description |
|---|---|---|
| `MENU_MAX_ITEMS` | 8 | Maximum total menu entries (array size) |
| Typical count (no app1) | 3 | Boot app0, SD→app0, SD→resources |
| Typical count (with app1) | 5 | + Boot app1, SD→app1 |

---

## 14. Data Flow

### Main Event Loop

```mermaid
flowchart TD
    Start["app_main() - init complete\nmenu drawn"]
    Loop["Main loop (infinite)"]

    Snap["snapshot_check()\nif ENABLE_SNAPSHOT"]
    Enc["encoder_read()"]
    EncUp{"enc > 0?"}
    EncDown{"enc < 0?"}
    MoveUp["menu_move(-1)\nCW = up"]
    MoveDown["menu_move(+1)\nCCW = down"]

    Btn["button_wait_press(100ms timeout)"]
    DispBtn["dispatch_button(btn)"]

    Touch["touch_read()"]
    EdgeDetect{pressed &&\n!was_pressed?}
    HitTest["touch_hint_hit_test(x,y)"]
    ValidBtn{BTN_NONE?}
    Feedback["draw_button_hint_pressed\nbuzzer_beep_short\nvTaskDelay(80ms)\ndraw_button_hints"]
    DispTouch["dispatch_button(vbtn)"]
    UpdateWas["touch_was_pressed = touch.pressed"]

    Start --> Loop
    Loop --> Snap
    Snap --> Enc
    Enc --> EncUp
    EncUp -->|Yes| MoveUp
    EncUp -->|No| EncDown
    EncDown -->|Yes| MoveDown
    EncDown -->|No| Btn
    MoveUp --> Btn
    MoveDown --> Btn
    Btn --> DispBtn
    DispBtn --> Touch
    Touch --> EdgeDetect
    EdgeDetect -->|No| UpdateWas
    EdgeDetect -->|Yes| HitTest
    HitTest --> ValidBtn
    ValidBtn -->|Yes, none| UpdateWas
    ValidBtn -->|No, found| Feedback
    Feedback --> DispTouch
    DispTouch --> UpdateWas
    UpdateWas --> Loop
```

### Action Execution Path

```mermaid
flowchart TD
    Dispatch["dispatch_button(btn)"]
    BTN1{BTN_1?}
    BTN2{BTN_2?}
    BTN3{BTN_3?}
    MenuUp["menu_move(-1)"]
    MenuDown["menu_move(+1)"]
    Execute["execute_selected_action()"]
    GetAction["switch(menu_items[selected].action)"]
    BootApp0["action_boot_partition('app0')\n→ esp_ota_set_boot_partition\n→ esp_restart()"]
    BootApp1["action_boot_partition('app1')\n→ esp_ota_set_boot_partition\n→ esp_restart()"]
    SDApp0["action_sd_update('app0')\n→ OTA API write\n→ esp_restart() on OK"]
    SDApp1["action_sd_update('app1')\n→ OTA API write\n→ esp_restart() on OK"]
    SDRes["action_sd_update_res()\n→ direct partition write\n→ esp_restart() on OK"]

    Dispatch --> BTN1
    BTN1 -->|Yes| MenuUp
    BTN1 -->|No| BTN2
    BTN2 -->|Yes| MenuDown
    BTN2 -->|No| BTN3
    BTN3 -->|Yes| Execute
    Execute --> GetAction
    GetAction --> BootApp0
    GetAction --> BootApp1
    GetAction --> SDApp0
    GetAction --> SDApp1
    GetAction --> SDRes
```

---

## 15. Related Modules

This module orchestrates the recovery application by calling into all sibling modules of `esp32s3_zx3d50ce02s_usrc_4832_factory_app`. Documentation for each subsystem:

| Module | Documentation | Responsibility |
|---|---|---|
| `esp32s3_zx3d50ce02s_usrc_4832_factory_app_display` | [esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_display.md](esp32s3_zx3d50ce02s_usrc_4832_factory_app_display.md) | GFX abstraction layer (`gfx_*`) and ST7796 I80 driver (`st7796_i80_init`, `st7796_i80_flush_ready_cb`) |
| `esp32s3_zx3d50ce02s_usrc_4832_factory_app_input` | [esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_input.md](esp32s3_zx3d50ce02s_usrc_4832_factory_app_input.md) | Physical input drivers: buttons, encoder, touch (`touch_read`, `touch_point_t`), buzzer — all are no-ops on this board |
| `esp32s3_zx3d50ce02s_usrc_4832_factory_app_storage` | [esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_storage.md](esp32s3_zx3d50ce02s_usrc_4832_factory_app_storage.md) | SD card mount/unmount (`sdcard_mount`, `sdcard_unmount`) |
| `esp32s3_zx3d50ce02s_usrc_4832_factory_app_tools` | [esp32s3\_zx3d50ce02s\_usrc\_4832\_factory\_app\_tools.md](esp32s3_zx3d50ce02s_usrc_4832_factory_app_tools.md) | Host-side tooling: `flash_all.py`, `flash_factory.py`, font generator, raw-to-PNG converter |
| `esp32s3_zx3d50ce02s_usrc_4832_bsp` | [esp32s3\_zx3d50ce02s\_usrc\_4832\_bsp.md](esp32s3_zx3d50ce02s_usrc_4832_bsp.md) | Board support package for the main pendant firmware (LVGL integration, `board_init`, I80 vsync callback) — separate from the factory app |

For analogous factory apps on other boards:

- **PiBot Pendant v1.0** (has physical buttons, encoder, buzzer, ILI9341 SPI display): [pibot\_pendant\_v1\_0\_factory\_app\_main.md](pibot_pendant_v1_0_factory_app_main.md)
- **esp32s3\_hmi43v3** (I80 display like this board, but uses TCA9554 IO expander for independent display/touch reset, and RM68120 controller): [esp32s3\_hmi43v3\_factory\_app\_main.md](esp32s3_hmi43v3_factory_app_main.md)

For project-level reference documentation:

- `docs/Factory/` — factory app and bootloader documentation
- `docs/guides/esp32_memory_constraints.md` — heap and fragmentation reference
- `docs/guides/board_build_guidelines.md` — per-board build configuration
- `docs/ui_resources/development.md` — `ui_resources` partition binary format and update mechanisms
