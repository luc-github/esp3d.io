---
title: "Factory — SD Flash Update Actions"
---

# Factory — SD Flash Update Actions

## Introduction

`factory_update_actions_sd_flash` is the sub-module of the factory recovery
application responsible for **flashing firmware and UI resources from an SD
card into internal flash**. It provides three functions that form the core of
the SD-based update path:

| Function | Purpose |
|---|---|
| `probe_sd_files` | Non-destructive SD scan — detects which update files are present |
| `action_sd_update` | Flashes `esp3dfw.bin` from SD into a named OTA app partition |
| `action_sd_update_res` | Flashes `ui_resources.bin` from SD into the `ui_resources` data partition |

These functions are cross-board: the same logic is replicated inside each
board's `Factory/main/main.c`, with only the display driver include and a
few board-specific layout constants differing between variants.

---

## Context in the Factory Application

The factory recovery application is a standalone ESP-IDF app stored in a
dedicated `factory` partition. It is entered either from the custom bootloader
(boards with a physical recovery button) or via the main firmware's
`[ESP444]FACTORY` software trigger. See [factory_app_entry.md](factory_app_entry.md)
for the full factory application entry-point and
[factory_update_actions_otadata.md](factory_update_actions_otadata.md) for the
OTA-data restore step that runs before the menu is shown.

```mermaid
graph TD
    subgraph "Factory App"
        A[app_main] --> B[restore_otadata_from_backup]
        B --> C[draw_menu]
        C --> D{User selects action}
        D --> E[execute_selected_action]
        E --> F[action_boot_partition]
        E --> G["action_sd_update(label)"]
        E --> H[action_sd_update_res]
    end

    subgraph "factory_update_actions_sd_flash - this module"
        I[probe_sd_files]
        G
        H
    end

    C --> I
    G --> I
    H --> I

    style G fill:#1e3a5f,color:#cce5ff,stroke:#4a90d9
    style H fill:#1e3a5f,color:#cce5ff,stroke:#4a90d9
    style I fill:#1e3a5f,color:#cce5ff,stroke:#4a90d9
```

### Module Position in the Factory Hierarchy

```mermaid
graph TD
    FA["Factory_Application_&_Bootloader"]
    APP["factory_app / factory_app_core"]
    CORE["factory_core"]
    UA["factory_update_actions"]
    OTAD["factory_update_actions_otadata"]
    FLASH["factory_update_actions_sd_flash ◀ this module"]
    DISP["factory_update_actions_dispatch"]

    FA --> APP --> CORE --> UA
    UA --> OTAD
    UA --> FLASH
    UA --> DISP

    style FLASH fill:#1e3a5f,color:#cce5ff,stroke:#4a90d9
```

Sibling modules:

- [`factory_update_actions_otadata.md`](factory_update_actions_otadata.md) —
  restores the OTA-data backup on startup so a power-off from recovery returns
  to the correct application partition.
- [`factory_update_actions.md`](factory_update_actions.md) — parent module
  overview covering all three update-action sub-modules together.

---

## Component Overview

### `probe_sd_files`

Mounts the SD card, tries to open each expected update file, and sets the
global `sd_has_fw` / `sd_has_res` flags. These flags are read by
`draw_sd_indicators()` (part of [factory_visual_feedback](factory_menu_system.md)
) to show or hide the "FW" and "RES" labels in the menu header.

```mermaid
flowchart LR
    A([probe_sd_files]) --> B{sdcard_mount}
    B -- fail --> Z([return - flags stay false])
    B -- ok --> C{fopen esp3dfw.bin}
    C -- found --> D[sd_has_fw = true\nfclose]
    C -- not found --> E[sd_has_fw = false]
    D --> F{fopen ui_resources.bin}
    E --> F
    F -- found --> G[sd_has_res = true\nfclose]
    F -- not found --> H[sd_has_res = false]
    G --> I([sdcard_unmount])
    H --> I
```

**Call sites:**
- `app_main` — called once during initialisation, before the first
  `draw_menu`.
- `action_sd_update` (failure path) — called after a failed flash attempt so
  the re-drawn menu reflects the current SD state (the `.bad` rename will have
  removed the original `.bin`).
- `action_sd_update_res` (failure path) — same reason.

---

### `action_sd_update`

Flashes a firmware binary from the SD card into a named OTA application
partition using the ESP-IDF OTA API. The target partition label is passed by
the caller (`"app0"` or `"app1"`), making the same function service both menu
entries.

#### Firmware Flash — Happy Path

```mermaid
sequenceDiagram
    participant M as Menu dispatch
    participant U as action_sd_update
    participant SD as SD Card
    participant OTA as ESP-IDF OTA API
    participant DISP as Display (visual_feedback)
    participant SNAP as Snapshot (ENABLE_SNAPSHOT)

    M->>U: action_sd_update('app0')
    U->>OTA: esp_partition_find_first(APP, label)
    OTA-->>U: update_part
    U->>SD: sdcard_mount()
    SD-->>U: ESP_OK
    U->>SD: fopen('/sdcard/esp3dfw.bin')
    SD-->>U: fw_file
    U->>SD: fseek/ftell - get fw_size
    U->>DISP: draw_flashing_screen()
    U->>SNAP: snapshot_check()
    U->>OTA: esp_ota_begin(update_part, fw_size)
    OTA-->>U: ota_handle

    loop Each 1024-byte chunk until written == fw_size
        U->>SD: fread(buf, 1, 1024, fw_file)
        SD-->>U: read_len bytes
        U->>OTA: esp_ota_write(ota_handle, buf, read_len)
        U->>DISP: draw_progress(percent) [on percent change]
        U->>SNAP: snapshot_check()
    end

    U->>SD: fclose(fw_file)
    U->>OTA: esp_ota_end(ota_handle)
    U->>OTA: esp_ota_set_boot_partition(update_part)
    U->>DISP: draw_result(true, 'Success! Rebooting...')
    U->>SNAP: snapshot_check()
    U->>SD: rename esp3dfw.bin → esp3dfw.ok
    U->>SD: sdcard_unmount()
    U->>OTA: esp_restart()
```

#### Firmware Flash — Failure Paths

```mermaid
flowchart TD
    A([action_sd_update]) --> B{Partition found?}
    B -- No --> ERR1[show_status\nPartition not found!]
    B -- Yes --> C{sdcard_mount OK?}
    C -- No --> ERR2[show_status\nNo SD card!]
    C -- Yes --> D{fopen esp3dfw.bin OK?}
    D -- No --> ERR3[show_status\nNo esp3dfw.bin on SD!]
    D -- Yes --> E{"0 < fw_size ≤ part size?"}
    E -- No --> ERR4[show_status\nInvalid firmware size!]
    E -- Yes --> F{esp_ota_begin OK?}
    F -- No --> ERR5[show_status\nOTA begin failed!]
    F -- Yes --> G[Chunk loop]
    G --> H{All chunks written?}
    H -- read error --> FAIL
    H -- write error --> FAIL
    H -- Yes --> I{esp_ota_end OK?}
    I -- No --> FAIL
    I -- Yes --> J{set_boot_partition OK?}
    J -- No --> FAIL
    J -- Yes --> K["rename → .ok\nesp_restart()"]

    FAIL[ok = false] --> L[esp_ota_abort\ndraw_result false]
    L --> N["rename → .bad\nsdcard_unmount"]
    N --> O[probe_sd_files]
    O --> P[draw_menu]

    ERR1 & ERR2 & ERR3 & ERR4 & ERR5 --> Q([return])
```

---

### `action_sd_update_res`

Flashes a UI resources binary from the SD card into the `ui_resources` DATA
partition. This path uses the raw partition API (`esp_partition_erase_range` +
`esp_partition_write`) because `ui_resources` is a DATA partition, not an OTA
app partition, and has no OTA integrity metadata.

#### Resources Flash — Happy Path

```mermaid
sequenceDiagram
    participant M as Menu dispatch
    participant U as action_sd_update_res
    participant SD as SD Card
    participant PART as ESP-IDF Partition API
    participant DISP as Display (visual_feedback)
    participant SNAP as Snapshot (ENABLE_SNAPSHOT)

    M->>U: action_sd_update_res()
    U->>PART: esp_partition_find_first(DATA, 'ui_resources')
    PART-->>U: res_part
    U->>SD: sdcard_mount()
    SD-->>U: ESP_OK
    U->>SD: fopen('/sdcard/ui_resources.bin')
    SD-->>U: res_file
    U->>SD: fread(bin_hdr, 16) - read build header
    Note over U: Validate 'ESP3' magic + log variant string<br/>(warning only, does not abort on mismatch)
    U->>SD: fseek(0, SEEK_END) / ftell - get res_size
    U->>DISP: draw_flashing_screen()
    U->>SNAP: snapshot_check()
    U->>PART: esp_partition_erase_range(res_part, 0, res_part->size)

    loop Each 1024-byte chunk until written == res_size
        U->>SD: fread(buf, 1, 1024, res_file)
        SD-->>U: read_len bytes
        U->>PART: esp_partition_write(res_part, offset, buf, read_len)
        U->>DISP: draw_progress(percent) [on percent change]
        U->>SNAP: snapshot_check()
    end

    U->>SD: fclose(res_file)
    U->>DISP: draw_result(ok, 'Done! Rebooting...')
    U->>SNAP: snapshot_check()
    U->>SD: rename ui_resources.bin → ui_resources.ok
    U->>SD: sdcard_unmount()
    U->>PART: esp_restart()
```

---

## SD File Protocol

The module defines a deterministic rename protocol that serves as a persistent
outcome marker surviving any subsequent reboot:

```mermaid
stateDiagram-v2
    [*] --> Present : File placed on SD card

    state "esp3dfw.bin present" as Present
    state "Flashing in progress" as InProgress
    state "esp3dfw.ok - success" as OK
    state "esp3dfw.bad - failure" as BAD

    Present --> InProgress : action_sd_update called
    InProgress --> OK : Flash succeeded\nrename .bin → .ok
    InProgress --> BAD : Flash failed\nrename .bin → .bad

    OK --> Present : User renames .ok → .bin\n(manual retry)
    BAD --> Present : User renames .bad → .bin\n(manual retry)
```

The identical state machine applies to `ui_resources.bin / .ok / .bad`.

### Defined Filenames

```c
#define FW_FILENAME      "/sdcard/esp3dfw.bin"
#define FW_OK_FILENAME   "/sdcard/esp3dfw.ok"
#define FW_BAD_FILENAME  "/sdcard/esp3dfw.bad"

#define RES_FILENAME     "/sdcard/ui_resources.bin"
#define RES_OK_FILENAME  "/sdcard/ui_resources.ok"
#define RES_BAD_FILENAME "/sdcard/ui_resources.bad"
```

### Protocol Rationale

| Property | Benefit |
|---|---|
| **Re-entry safety** | After a reboot back into the factory app, the `.bin` file is absent so no automatic re-flash occurs |
| **Post-mortem visibility** | A technician can check the SD card to determine the last flash outcome without UART logs |
| **Manual retry** | Renaming `.bad` → `.bin` on a host machine queues a retry without re-copying the original binary |

---

## Build Header Validation (Resources Only)

`action_sd_update_res` reads the first 16 bytes of `ui_resources.bin` before
any erase:

```
Offset  Size  Content
0       4     Magic bytes: 'E' 'S' 'P' '3'
4       12    Variant string (null-padded, e.g. "fluidnc_ser")
```

The variant string (written by `generate_resources.py` since the header was
introduced) encodes the firmware type and transport combination. A mismatch
between the binary variant and the target board's configuration is logged as a
warning but does **not** abort the flash — this preserves compatibility with
older binaries that pre-date the header.

> See [`ui_resources/development.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md) for the
> full binary format specification and the `generate_resources.py` pipeline.

---

## Key Design Decisions

### Fixed 1024-byte Stack Buffer — No Heap Allocation

```c
uint8_t buf[1024];
```

Both flash functions use a fixed stack-allocated 1024-byte chunk buffer. This
is intentional:

- The factory recovery app runs without LVGL, WiFi, or BT stacks — heap is
  larger than in production firmware but still constrained and potentially
  fragmented after SD mount.
- A `malloc` failure mid-flash would leave the partition in a half-written
  state with no graceful recovery path.
- 1024 bytes is within the project-wide safe stack buffer limit (see
  [esp32_memory_constraints.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md)).

### OTA API vs Raw Partition Write

| Target partition | API used | Reason |
|---|---|---|
| `app0` / `app1` | `esp_ota_begin` / `esp_ota_write` / `esp_ota_end` | App partitions need OTA integrity metadata for ESP-IDF rollback tracking |
| `ui_resources` | `esp_partition_erase_range` + `esp_partition_write` | DATA partition — no OTA metadata, raw write is correct and simpler |

### Snapshot Integration

When compiled with `ENABLE_SNAPSHOT`, both flash functions call
`snapshot_check()` at three points:

1. Immediately after `draw_flashing_screen()` — captures initial screen state.
2. Inside the chunk loop, once per percentage-point change (`s_flash_last_percent`
   caches the last value so a full-redraw after a snap is consistent with the
   actual progress at snapshot time).
3. After `draw_result()` — captures the final success or failure screen.

The `s_snap_in_flash` flag tells the snapshot subsystem which screen layout to
redraw during a capture (`draw_flashing_screen` + `draw_progress` vs
`draw_menu`).

> See [factory_snapshot.md](factory_snapshot.md) for the full snapshot
> mechanism.

---

## Dependencies

```mermaid
graph LR
    subgraph THIS["factory_update_actions_sd_flash"]
        PSF[probe_sd_files]
        ASU[action_sd_update]
        ASUR[action_sd_update_res]
    end

    subgraph SDMOD["factory_sdcard"]
        MOUNT[sdcard_mount]
        UMOUNT[sdcard_unmount]
    end

    subgraph VF["factory_visual_feedback"]
        DFS[draw_flashing_screen]
        DP[draw_progress]
        DR[draw_result]
        DM[draw_menu]
        SS[show_status]
    end

    subgraph SNAP["factory_snapshot (ENABLE_SNAPSHOT)"]
        SC[snapshot_check]
    end

    subgraph IDF["ESP-IDF"]
        OTAAPI["esp_ota_begin / write / end / abort\nesp_ota_set_boot_partition"]
        PAPI["esp_partition_find_first\nesp_partition_erase_range\nesp_partition_write"]
        SYS["esp_restart\nesp_get_free_heap_size"]
    end

    PSF --> MOUNT & UMOUNT
    ASU --> MOUNT & UMOUNT & DFS & DP & DR & DM & SS & SC & OTAAPI & PAPI & SYS
    ASUR --> MOUNT & UMOUNT & DFS & DP & DR & DM & SS & SC & PAPI & SYS
```

---

## Board-Specific Notes

The three functions are **identical in logic** across all boards. Board
differences are confined to:

- The display driver `#include` (`st7796.h`, `st7262.h`, `ili9341.h`, etc.)
- Layout constants (`MENU_START_Y`, `FONT_WIDTH`, `BTN_CIRCLE_R`, etc.) that
  control only the visual feedback helpers, not the flash logic.

One board-specific pre-condition exists outside this module: on
**`esp32s3_8048_touch_lcd_7`**, the CH422G IO expander must be initialised and
its SD_CS line (`EXIO3`) asserted **before** any call to `sdcard_mount()`. This
is handled in `app_main` via `io_ch422g_configure()` which runs after
`touch_init()` brings up the shared I2C bus. The functions in this module call
`sdcard_mount()` directly and rely on that initialisation having already
occurred.

### Supported Boards

| Board | Firmware Flash | Resources Flash |
|---|---|---|
| `esp32_3248s035c` | ✓ | ✓ |
| `esp32_3248s035r` | ✓ | ✓ |
| `esp32s3_4827s043c` | ✓ | ✓ |
| `esp32s3_8048_touch_lcd_7` | ✓ | ✓ |
| `esp32s3_8048s043c` | ✓ | ✓ |
| `esp32s3_8048s050c` | ✓ | ✓ |
| `esp32s3_8048s070c` | ✓ | ✓ |
| `esp32s3_bzm_tft35_gt911` | ✓ | ✓ |
| `esp32s3_hmi43v3` | ✓ | ✓ |
| `esp32s3_zx3d50ce02s_usrc_4832` | ✓ | ✓ |
| `pibot_pendant_v1_0` | ✓ | ✓ |

---

## Flash Safety Constraints

### Dangerous Write Permission

The factory `sdkconfig` must set `CONFIG_SPI_FLASH_DANGEROUS_WRITE_ALLOWED=y`.
`action_sd_update_res` calls `esp_partition_erase_range` which may target flash
addresses that ESP-IDF's default `CONFIG_SPI_FLASH_DANGEROUS_WRITE_ABORTS`
policy would reject. This is intentional — the factory app is a privileged
recovery tool with explicit flash management authority.

### `OTADATA_BACKUP_OFFSET` and Partition Boundaries

The OTA-data backup sector (written by the main firmware's `esp444.cpp`) sits
in the region below the partition table. The firmware flash path must not
overlap this region. `OTADATA_BACKUP_OFFSET` (0xB000) and `OTADATA_OFFSET`
(0x10000) are defined to be well below the first application partition and are
kept in sync between this factory app and the main firmware. When porting to a
new board, verify both values remain valid for the target flash layout.

### Logging During Flash

Factory logging uses the `FACTORY_LOGD` macro from `factory_log.h`. The SD
stack (FatFS/SDMMC) is silenced via `factory_log_silence_sd_stack()` called in
`app_main` to reduce UART noise during the flash progress display. Debug heap
values are logged at flash entry and after SD mount via `esp_get_free_heap_size()`
for diagnostic purposes.

> See [esp3d_log_guide.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp3d_log_guide.md) for the general
> logging convention. `FACTORY_LOGD` is a bare-C adaptation of the same
> pattern used in the main firmware.

---

## Related Documentation

| Document | Topic |
|---|---|
| [factory_app_entry.md](factory_app_entry.md) | Factory app entry point (`app_main`) — hardware init and menu bootstrap |
| [factory_update_actions.md](factory_update_actions.md) | Parent module — all update actions together |
| [factory_update_actions_otadata.md](factory_update_actions_otadata.md) | OTA-data backup restore before the menu |
| [factory_menu_system.md](factory_menu_system.md) | Menu draw, navigation, SD indicators |
| [factory_sdcard.md](factory_sdcard.md) | SD card mount / unmount implementation |
| [factory_snapshot.md](factory_snapshot.md) | Screen snapshot capture to SD (debug feature) |
| [ui_resources/development.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md) | `ui_resources` binary format and build pipeline |
| [guides/tools.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/tools.md) | Host-side flash helpers (`flash_factory.py`, `flash_all.py`) |
| [guides/esp32_memory_constraints.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) | Heap and fragmentation constraints |
