---
title: "Factory App Core — Entry Point (`factory_app_core_factory_app_entry`)"
---

# Factory App Core — Entry Point (`factory_app_core_factory_app_entry`)

## Introduction

This module is the **ESP-IDF application entry point** for the factory recovery firmware. It implements the single exported symbol required by ESP-IDF — `app_main` — across all five actively-supported board variants of the `factory_app_core` group. Its responsibility is to:

1. Restore OTA partition bookkeeping from a flash backup (before any other work).
2. Bring up display and input hardware in the correct board-specific order.
3. Detect available flash partitions and SD card payload files.
4. Build and render the recovery menu.
5. Run an infinite event loop that accepts input from physical buttons, a rotary encoder, and the touchscreen.

The module exists as five near-identical per-board source files that compile into independent binaries. Differences are confined to the LCD driver call, screen geometry constants, and — on two boards — extra bus/expander init steps imposed by hardware sharing constraints.

| Board source file | Display driver | Factory entry method |
|---|---|---|
| `boards/esp32s3_8048s070c/Factory/main/main.c` | EK9716 (RGB parallel, 800 × 480) | Software `[ESP444]FACTORY` command |
| `boards/esp32s3_bzm_tft35_gt911/Factory/main/main.c` | ST7796 (SPI, 320 × 480) | Software `[ESP444]FACTORY` command |
| `boards/esp32s3_hmi43v3/Factory/main/main.c` | RM68120 (i80 parallel) | Software `[ESP444]FACTORY` command |
| `boards/esp32s3_zx3d50ce02s_usrc_4832/Factory/main/main.c` | ST7796 (i80 parallel) | Software `[ESP444]FACTORY` command |
| `boards/pibot_pendant_v1_0/Factory/main/main.c` | ILI9341 (SPI, 240 × 320) | Custom bootloader hook (button held at power-on) **or** software command |

---

## Module in Context

`factory_app_core_factory_app_entry` is a leaf of the `factory_core` sub-tree. All higher-level context is in [factory_core.md](factory_core.md) and [factory_app.md](factory_app.md). The sibling sub-modules that `app_main` delegates to at runtime are:

| Sibling module documentation | Responsibility |
|---|---|
| [factory_menu_system.md](factory_menu_system.md) | Menu data model, navigation, rendering |
| [factory_update_actions.md](factory_update_actions.md) | Firmware/resources flash, OTA partition selection |
| [factory_visual_feedback.md](factory_visual_feedback.md) | Progress bar, flash screen, result display |
| [factory_snapshot.md](factory_snapshot.md) | Debug screen-capture to SD card |
| [factory_input_dispatch.md](factory_input_dispatch.md) | Unified button/touch/encoder dispatch |
| [factory_hardware_drivers.md](factory_app.md) | Board LCD, touch, buttons, encoder, buzzer drivers |
| [factory_graphics.md](factory_graphics.md) | Low-level pixel drawing (`gfx_*`) |
| [factory_sdcard.md](factory_sdcard.md) | SD mount / unmount / file presence probe |
| [factory_logging.md](factory_logging.md) | Log silencing utilities |

---

## Architecture Overview

```mermaid
graph TD
    subgraph "factory_app_core_factory_app_entry - app_main"
        A[app_main] --> B[restore_otadata_from_backup]
        A --> C[Hardware Init]
        A --> D[Partition Detection]
        A --> E[Menu Construction]
        A --> F[Main Event Loop]
    end

    subgraph "Hardware Init - ordered"
        C --> C1[factory_log_silence_sd_stack]
        C --> C2["I2C bus + TCA9554 IO expander\nhmi43v3 only"]
        C --> C3[Display Driver Init]
        C --> C4[Backlight Enable]
        C --> C5[gfx_init]
        C --> C6[buttons_init]
        C --> C7[encoder_init]
        C --> C8[touch_init]
        C --> C9[buzzer_init]
    end

    subgraph "Main Event Loop"
        F --> F1["snapshot_check()\nif ENABLE_SNAPSHOT"]
        F --> F2[encoder_read]
        F --> F3["button_wait_press(100 ms)"]
        F --> F4[touch_read]
        F2 --> G[menu_move]
        F3 --> H[dispatch_button]
        F4 --> I[touch_hint_hit_test]
        I --> H
    end

    subgraph "Sibling Modules"
        H --> J[factory_input_dispatch]
        J --> K[factory_menu_system]
        J --> L[factory_update_actions]
    end
```

---

## Factory Partition Entry Paths

How the device reaches `app_main` in the factory partition differs between the pibot board and all others:

```mermaid
flowchart LR
    subgraph "pibot_pendant_v1_0"
        PB1["Power on\n+ button held"] --> PB2["Custom bootloader hook\nbootloader_before_init in hooks.c"]
        PB2 --> PB3["backup_and_erase_otadata()\nat offset 0xB000"]
        PB3 --> PB4["Set boot → factory partition"]
        PB4 --> PB5["esp_restart()"]
        PB5 --> PB6["app_main - factory partition"]
    end

    subgraph "All other boards"
        OB1["Main firmware running"] --> OB2["User sends\n[ESP444]FACTORY command"]
        OB2 --> OB3["esp444.cpp:\n1. Back up otadata → 0xB000\n2. Erase otadata\n3. Set boot → factory\n4. esp_restart()"]
        OB3 --> OB4["app_main - factory partition"]
    end
```

> **Key invariant:** In both paths, the caller backs up the current `otadata` to flash offset `0xB000` *before* switching the boot pointer to factory. `restore_otadata_from_backup()` inside `app_main` is symmetric to both paths.

---

## OTA Data Restore

The first action of `app_main` — before display, before any user interaction — is `restore_otadata_from_backup()`. This restores the ESP-IDF OTA slot selector so that power-cycling from inside recovery returns to the correct previously-active application partition, not to the factory partition.

### Flash Layout (Backup Region)

```
0x00000  Bootloader
         ...
0x0B000  ◄── OTADATA_BACKUP_OFFSET (4 KB sector, below partition table)
         [0x00 – 0x1F]  OTA Entry 1     (32 bytes)
         [0x20 – 0x3F]  OTA Entry 2     (32 bytes)
         [0x40 – 0x43]  BACKUP_MAGIC    = 0xAA55AA55
         ...
0x0C000  Partition table
0x0D000  NVS
         ...
0x10000  ◄── OTADATA_OFFSET (active otadata — two 4 KB sectors)
0x11000
```

> **⚠ `CONFIG_SPI_FLASH_DANGEROUS_WRITE_ALLOWED=y` required.** Offset `0xB000` is below the first normal partition. ESP-IDF aborts writes there by default. The factory app is an intentionally privileged recovery tool.

### Restore Decision Flowchart

```mermaid
flowchart TD
    A[app_main starts] --> B["esp_flash_read magic\nat 0xB040"]
    B --> C{magic ==\n0xAA55AA55?}
    C -- No --> D[No valid backup - skip restore]
    C -- Yes --> E["Read 32-byte Entry1 from 0xB000\nRead 32-byte Entry2 from 0xB020"]
    E --> F{Both entries\nall 0xFF?}
    F -- Yes --> G[Skip write - flash already erased]
    F -- No --> H["Erase 0x10000 sector\nErase 0x11000 sector"]
    H --> I["Write Entry1 → 0x10000 if not empty\nWrite Entry2 → 0x11000 if not empty"]
    I --> J[Otadata restored]
    J --> K["Erase backup sector 0xB000\nprevent retrigger"]
    G --> K
    D --> L[Continue hardware init]
    K --> L
```

### OTA Constants (identical across all five boards)

| Constant | Value | Purpose |
|---|---|---|
| `OTADATA_OFFSET` | `0x10000` | Active otadata flash address |
| `OTADATA_SECTOR_SIZE` | `0x1000` | 4 KB sector size |
| `OTADATA_ENTRY_SIZE` | `32` | Bytes per OTA slot descriptor |
| `OTADATA_BACKUP_OFFSET` | `0xB000` | Backup sector address |
| `BACKUP_MAGIC_OFFSET` | `0x40` | Offset of magic word within backup sector |
| `BACKUP_MAGIC` | `0xAA55AA55` | Sentinel confirming a valid backup exists |

> These constants **must match exactly** the values used in the main firmware's `esp444.cpp` (all boards except pibot) or `hooks.c` (pibot).

---

## Hardware Initialization Sequence

`app_main` initializes hardware in strict order. Deviating from this order causes invisible failures (blank display, unresponsive touch).

### Shared Sequence (All Boards)

```mermaid
sequenceDiagram
    participant RTOS as FreeRTOS
    participant AM as app_main
    participant LOG as factory_log
    participant FL as esp_flash / OTA API
    participant DISP as Board Display Driver
    participant GFX as gfx layer
    participant HW as Buttons / Encoder / Touch / Buzzer

    RTOS->>AM: app_main() invoked
    AM->>LOG: factory_log_silence_sd_stack()
    AM->>FL: restore_otadata_from_backup()
    FL-->>AM: done (backup found or absent - both safe)
    Note over AM,DISP: Board-specific extras may run here - see next section
    AM->>DISP: <board>_init()
    DISP-->>AM: ESP_OK or abort()
    AM->>DISP: <board>_backlight(true)
    AM->>GFX: gfx_init()
    AM->>HW: buttons_init()
    AM->>HW: encoder_init()
    AM->>HW: touch_init()
    AM->>HW: buzzer_init()
    AM->>AM: partition detect + menu build + draw_menu()
    AM->>AM: enter infinite event loop
```

### Board-Specific Ordering Constraints

Two boards impose additional ordering constraints due to hardware sharing:

```mermaid
graph LR
    subgraph "esp32s3_hmi43v3"
        H1["bus_i2c_init()\nShared I2C bus"] --> H2["io_tca9554_configure()\nTCA9554 controls:\n• LCD backlight bit\n• Touch controller reset bit"]
        H2 --> H3["rm68120_init()\nDisplay init"]
        H3 --> H4["touch_init()\nI2C bus already up"]
    end

    subgraph "esp32s3_zx3d50ce02s_usrc_4832"
        Z1["st7796_i80_init()\nPanel reset pulse issued here"] --> Z2["GPIO TFT_LED high\nPlain-GPIO backlight"]
        Z2 --> Z3["touch_init()\nMUST follow display:\nshared TFT_RST_PIN"]
    end

    subgraph "All other boards"
        O1["<board>_init()\nDisplay init"] --> O2["<board>_backlight(true)"]
        O2 --> O3["touch_init()"]
    end
```

**hmi43v3 rationale:** The TCA9554 IO expander controls both the LCD backlight enable bit and the touch controller's hardware reset line. The expander must be configured before display init (or the display is invisible) and before `touch_init()` (or the touch IC stays in reset).

**zx3d50ce02s_usrc_4832 rationale:** The display panel and the FT6336U touch controller share a single physical `TFT_RST_PIN`. The `st7796_i80_init()` routine issues a reset pulse that simultaneously releases the touch IC from reset. Calling `touch_init()` before display init would conflict with this reset sequence.

---

## Startup Flow

```mermaid
flowchart TD
    Start([ESP-IDF calls app_main]) --> SilenceLog[factory_log_silence_sd_stack]
    SilenceLog --> Restore[restore_otadata_from_backup]
    Restore --> BoardInit["board display init\nboard backlight on"]
    BoardInit --> Abort{Init returned\nESP_OK?}
    Abort -- No --> Die["esp3d_log_e error\nvTaskDelay 200 ms\nabort()"]
    Abort -- Yes --> GFX[gfx_init]
    GFX --> Input["buttons_init\nencoder_init\ntouch_init"]
    Input --> Buzzer[buzzer_init]
    Buzzer --> Parts["esp_partition_find_first app1\n→ has_app1 flag"]
    Parts --> BuildMenu[Build menu_items array]
    BuildMenu --> ProbeSD["probe_sd_files()\n→ sd_has_fw / sd_has_res"]
    ProbeSD --> DrawMenu[draw_menu]
    DrawMenu --> SnapCfg["gpio_config GPIO_NUM_0\nif ENABLE_SNAPSHOT"]
    SnapCfg --> Loop([Main event loop])
```

---

## Partition Detection and Menu Construction

After hardware init, `app_main` detects the flash layout and builds the menu accordingly:

```mermaid
flowchart TD
    A[Start menu build] --> B["Add: Boot app0 - always"]
    B --> C{app1 partition\nexists?}
    C -- Yes --> D["Add: Boot app1"]
    C -- No --> E
    D --> E["Add: Flash firmware SD → app0 - always"]
    E --> F{app1 exists?}
    F -- Yes --> G["Add: Flash firmware SD → app1"]
    F -- No --> H
    G --> H["Add: Flash UI resources SD - always"]
    H --> I["probe_sd_files()\nMount SD, check for esp3dfw.bin\nand ui_resources.bin, unmount"]
    I --> J[draw_menu\nshow FW / RES indicators in header]
```

`probe_sd_files()` mounts the SD card, tests file existence, then immediately unmounts. The results (`sd_has_fw`, `sd_has_res`) drive the "FW" and "RES" visual indicators in the menu header line. SD file naming conventions are documented in [factory_sdcard.md](factory_sdcard.md).

---

## Main Event Loop

After initialization, `app_main` enters an infinite polling loop. No additional RTOS tasks are created; the entire factory app runs within the single `app_main` task.

```mermaid
flowchart TD
    LOOP["while (1)"] --> SNAP{"ENABLE_SNAPSHOT\ndefined?"}
    SNAP -- Yes --> SC["snapshot_check()\nGPIO0 / BOOT button debounce\n+ capture to SD"]
    SNAP -- No --> ENC
    SC --> ENC

    ENC["encoder_read()\nnon-blocking"] --> ENC_UP{"enc > 0?"}
    ENC_UP -- Yes --> MU["menu_move(-1)  scroll up"]
    ENC_UP -- No --> ENC_DN{"enc < 0?"}
    ENC_DN -- Yes --> MD["menu_move(+1)  scroll down"]
    ENC_DN -- No --> BTN
    MU --> BTN
    MD --> BTN

    BTN["button_wait_press(100 ms)\nblocking with timeout"] --> DB["dispatch_button(btn)"]
    DB --> TCH

    TCH["touch_read()\nnon-blocking"] --> TP{"pressed &&\n!touch_was_pressed?"}
    TP -- No --> TWP
    TP -- Yes --> HT["touch_hint_hit_test(x, y)"]
    HT --> VB{vbtn != BTN_NONE?}
    VB -- No --> TWP
    VB -- Yes --> VFDB["draw_button_hint_pressed(vbtn)\nbuzzer_beep_short()\nvTaskDelay 80 ms\ndraw_button_hints()"]
    VFDB --> DB2["dispatch_button(vbtn)"]
    DB2 --> TWP
    TWP["touch_was_pressed = touch.pressed"] --> LOOP
```

### Input Sources Unified by `dispatch_button`

All three input sources resolve to `dispatch_button(button_id_t)`:

| Input source | Condition | Maps to |
|---|---|---|
| Physical `BTN_1` | press | `menu_move(-1)` — scroll up |
| Physical `BTN_2` | press | `menu_move(+1)` — scroll down |
| Physical `BTN_3` | press | `execute_selected_action()` — confirm |
| Encoder CW step | `encoder_read() > 0` | `menu_move(-1)` |
| Encoder CCW step | `encoder_read() < 0` | `menu_move(+1)` |
| Touch BTN_1 zone | tap | `menu_move(-1)` |
| Touch BTN_2 zone | tap | `menu_move(+1)` |
| Touch BTN_3 zone | tap | `execute_selected_action()` |

On ESP32-S3 boards without physical hardware, `BUTTON_n_PIN` and `ENCODER_n_PIN` are `GPIO_NUM_NC`. The corresponding init and read calls silently no-op; touch is the only operational input.

For dispatch implementation details see [factory_input_dispatch.md](factory_input_dispatch.md).

### Touch Debounce

A rising-edge detector prevents repeat-triggering while a finger is held:

```c
touch_point_t touch = touch_read();
if (touch.pressed && !touch_was_pressed) {
    /* rising edge only — handle once per press */
    button_id_t vbtn = touch_hint_hit_test(touch.x, touch.y);
    if (vbtn != BTN_NONE) {
        draw_button_hint_pressed(vbtn);
        buzzer_beep_short();
        vTaskDelay(pdMS_TO_TICKS(80));
        draw_button_hints();
        dispatch_button(vbtn);
    }
}
touch_was_pressed = touch.pressed;
```

The 80 ms pause between `draw_button_hint_pressed` and `dispatch_button` provides visible press feedback before executing the action.

### Touch Hit-Test Strategy

The three virtual button zones cover the bottom of the screen. The hit-test uses different column-boundary strategies depending on canvas width:

| Canvas width | Strategy |
|---|---|
| ≤ 320 px (portrait) | Simple thirds: `x < W/3` → BTN_1, `x < 2W/3` → BTN_2, else BTN_3 |
| ≥ 480 px (landscape / large) | Midpoint boundaries between the actual rendered circle-center X coordinates — prevents zone mismapping on wide screens where a simple third-split does not align with the rendered icons |

---

## Optional Snapshot Subsystem

When `ENABLE_SNAPSHOT` is defined, `app_main` configures `GPIO_NUM_0` (BOOT button) as an additional input. Pressing it at any point captures the full screen to a numbered `.raw` file on the SD card. This is a QA/debug feature; production builds leave `ENABLE_SNAPSHOT` undefined.

```mermaid
flowchart LR
    GPIO0["GPIO_NUM_0 pressed"] --> SC["snapshot_check()"]
    SC --> ST["snapshot_take()"]
    ST --> MNT["sdcard_mount()"]
    MNT --> FN["snap_find_next_number()\nscan snap000.raw … snap999.raw"]
    FN --> GB["gfx_snapshot_begin(filepath)"]
    GB --> RD{"Currently\nflashing?"}
    RD -- Yes --> RF["draw_flashing_screen()\ndraw_progress(last %)"]
    RD -- No --> RM["draw_menu()"]
    RF --> GE["gfx_snapshot_end()\nclose file, unmount"]
    RM --> GE
```

For full detail see [factory_snapshot.md](factory_snapshot.md).

---

## SD File Naming Convention

| Path | Meaning |
|---|---|
| `/sdcard/esp3dfw.bin` | Firmware image to flash |
| `/sdcard/esp3dfw.ok` | Renamed from `.bin` after successful flash |
| `/sdcard/esp3dfw.bad` | Renamed from `.bin` after failed flash |
| `/sdcard/ui_resources.bin` | UI resources partition image |
| `/sdcard/ui_resources.ok` | Renamed after successful flash |
| `/sdcard/ui_resources.bad` | Renamed after failed flash |
| `/sdcard/snap000.raw` … | Debug screen snapshots (`ENABLE_SNAPSHOT` builds only) |

---

## Porting to a New Board

When adding a new board:

1. **Copy** the closest existing `main.c` (match on display bus type: SPI, i80, or RGB).
2. **Replace** the display include and init call (`<board>_init()`, `<board>_backlight()`).
3. **Check reset sharing:** if display and touch share a reset pin, `touch_init()` **must** follow display init (see `zx3d50ce02s_usrc_4832`).
4. **Check IO expander:** if any expander gates backlight or touch reset, add bus + expander init before display init (see `hmi43v3`).
5. **Keep `OTADATA_BACKUP_OFFSET` in sync** with the value in the main firmware's `esp444.cpp` (or `hooks.c` for bootloader-based boards). Recalculate if the new board's bootloader extends past `0xB000`.
6. **Ensure** the factory `sdkconfig` sets `CONFIG_SPI_FLASH_DANGEROUS_WRITE_ALLOWED=y`.
7. **Scale layout constants** (`MENU_START_Y`, `MENU_ITEM_H`, `FONT_WIDTH`, `BTN_CIRCLE_R`, touch column boundaries) for the target resolution. In-source comments in the existing files document the scaling ratios used.

---

## Component Dependency Graph

```mermaid
graph TD
    AM["factory_app_core_factory_app_entry\napp_main()"]

    AM --> ESPAPI["ESP-IDF\nesp_flash · esp_ota_ops\nesp_partition · esp_system"]
    AM --> FLOG["factory_logging\nfactory_log_silence_sd_stack"]
    AM --> DISP["Board display driver\nfactory_hardware_drivers"]
    AM --> GFX["factory_graphics\ngfx_init"]
    AM --> BTN["factory_buttons\nbuttons_init / button_wait_press"]
    AM --> ENC["factory_encoder\nencoder_init / encoder_read"]
    AM --> TCH["factory_touch\ntouch_init / touch_read"]
    AM --> BUZ["factory_buzzer\nbuzzer_init / buzzer_beep_short"]

    AM --> MENU["factory_menu_system\ndraw_menu / menu_move"]
    AM --> UPD["factory_update_actions\nexecute_selected_action"]
    AM --> VIS["factory_visual_feedback\ndraw_flashing_screen / draw_progress"]
    AM --> SNAP["factory_snapshot\nsnapshot_check"]
    AM --> INP["factory_input_dispatch\ndispatch_button / touch_hint_hit_test"]

    MENU --> GFX
    UPD --> ESPAPI
    SNAP --> GFX
    INP --> MENU
    INP --> UPD

    subgraph "hmi43v3 only"
        AM --> I2C["esp_lcd I2C bus\nbus_i2c_init"]
        AM --> EXPR["TCA9554 IO expander\nio_tca9554_configure"]
    end
```
