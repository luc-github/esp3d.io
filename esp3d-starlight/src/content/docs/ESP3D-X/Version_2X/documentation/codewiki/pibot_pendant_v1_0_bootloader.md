---
title: "PiBot Pendant v1.0 — Custom Bootloader"
---

# PiBot Pendant v1.0 — Custom Bootloader

## Overview

The `pibot_pendant_v1_0_bootloader` module implements **custom ESP-IDF bootloader hooks** for the PiBot CNC Pendant v1.0 hardware. Its sole responsibility is enabling a **hardware-triggered factory recovery** without any host PC or serial connection.

When the device powers on with **BTN3 (GPIO17) held**, the bootloader intercepts the boot sequence, backs up the current OTA routing data to a reserved flash sector, erases the live OTA data so the ESP-IDF bootloader will select the factory partition on the next boot, and then performs a software reset. After the user releases the button the device boots directly into the [factory app](pibot_pendant_v1_0_factory_app.md), which restores the OTA routing data from the backup — so a subsequent power cycle returns to whichever OTA partition was running before recovery.

This module operates **before FreeRTOS starts** and therefore uses only ROM-level primitives (`esp_rom_*`, `gpio_ll_*`). No IDF drivers, no LVGL, no heap.

---

## Module Source Layout

```
boards/pibot_pendant_v1_0/Factory/
├── bootloader_components/
│   └── custom_bootloader/
│       └── hooks.c          ← ESP-IDF v5 component integration path
└── custom_bootloader/
    └── hooks.c              ← Legacy integration path (identical logic)
```

Both files implement exactly the same logic. The **`bootloader_components/`** path is the current ESP-IDF 5.x recommended integration method (placed alongside the main project as a component). The **`custom_bootloader/`** path is the older method. Both are kept to support different build configurations.

---

## Architecture

### Position in the Boot Sequence

```
Power-on / Reset
      │
      ▼
ESP32 ROM Bootloader
      │
      ▼
Custom Bootloader binary @ 0x1000
      ├── bootloader_before_init()   [reserved / no-op]
      │
      ├── IDF Bootloader Init (flash, clock, etc.)
      │
      └── bootloader_after_init()    ← custom hook fires here
            │
            ├── BTN3 not held ──► IDF Partition Selection via otadata
            │                           │
            │                           ├── otadata valid ──► OTA App Partition (main firmware)
            │                           └── otadata erased ──► Factory Partition
            │
            └── BTN3 held ──► Recovery Sequence
                                    │
                                    └── Software Reset ──► (loop back to bootloader)
                                                                 │
                                                                 └── Factory Partition
                                                                       │
                                                                       └── Factory App restores otadata backup
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────┐
│              Bootloader Space (before FreeRTOS)         │
│                                                         │
│  hooks.c                                                │
│  bootloader_after_init()                                │
│       │                                                 │
│       ├── is_button_pressed()  ← GPIO17 (BTN3)         │
│       ├── buzzer_tone / beep_* ← GPIO26 (Buzzer)       │
│       └── backup_and_erase_otadata()                    │
│                 │                                       │
└─────────────────┼───────────────────────────────────────┘
                  │  ROM SPI flash ops
                  ▼
┌──────────────────────────────────────────────────┐
│                SPI Flash Layout                  │
│                                                  │
│  otadata       @ 0x10000  (2 × 4 KB sectors)    │
│  Backup sector @ 0xB000   (4 KB — copy + magic) │
│  Partition table @ 0xC000                        │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼  (after reset → factory boots)
┌──────────────────────────────────────────────────┐
│            Factory App (app_main)                │
│  restore_otadata_from_backup()                   │
│    reads magic from 0xB000                       │
│    restores otadata @ 0x10000                    │
│    erases backup sector                          │
└──────────────────────────────────────────────────┘
```

---

## Flash Memory Layout

The bootloader and its backup sector must be carefully placed to avoid overlapping with the partition table or any data partition. The constraints are documented inline in `hooks.c` and summarised below.

```
Address         Contents
────────────────────────────────────────────────────────────
0x1000          Bootloader start
0x1000–0x5980   Bootloader binary (~18 KB, 0x4980 bytes)
0x6000–0xAFFF   Free gap (no content, all 0xFF)
0xB000          ◄── OTA data BACKUP sector (4 KB)
                    [0x000] otadata entry 1 copy  (32 B)
                    [0x020] otadata entry 2 copy  (32 B)
                    [0x040] magic 0xAA55AA55      ( 4 B)
                    [0x044–0xFFF] 0xFF (erased)
0xC000          Partition table
0xD000          NVS (first data partition)
  ...
0x10000         otadata  (2 × 4 KB = 8 KB, 2 sectors)
0x12000         factory partition
  ...           OTA_0 / OTA_1 partitions
```

### Backup Sector Constraints

| Constraint | Value / Reason |
|---|---|
| **Minimum address** | `≥ 0x6000` — must be after bootloader binary end (~0x5980) |
| **Maximum address** | `≤ 0xB000` — must be before partition table at 0xC000 (backup + 4 KB ≤ 0xC000) |
| **Alignment** | Must be 4 KB-aligned (flash sector boundary) |
| **Outside partitions** | ESP-IDF's `CONFIG_SPI_FLASH_DANGEROUS_WRITE_ABORTS` (default) aborts writes to known-partition addresses. 0xB000 is before NVS at 0xD000, so it is safe. |
| **Chosen offset** | **0xB000** (satisfies all constraints for the 8 MB pibot_pendant_v1_0 layout) |

> ⚠️ **Porting warning**: When adapting to a different board, recalculate `OTADATA_BACKUP_OFFSET` using the actual bootloader binary size and `CONFIG_PARTITION_TABLE_OFFSET`. The **same value must be defined identically** in both `hooks.c` (bootloader) and `main.c` (factory app).

> ⚠️ **SDK config requirement**: The factory app sdkconfig **must** set `CONFIG_SPI_FLASH_DANGEROUS_WRITE_ALLOWED=y` so `esp_flash_erase_region()` can clear the backup sector (which is below the first partition). See `sdkconfig.8mb` and `docs/Factory/factory_app_technical_doc.md`.

---

## Recovery Sequence (Detailed Flow)

```
[Power-on, BTN3 held]

bootloader_after_init()
  │
  ├── Configure GPIO26 output (buzzer)
  ├── Configure GPIO17 input + pull-up (BTN3)
  ├── wait 100 ms  (pull-up stabilise)
  │
  ├── is_button_pressed(GPIO17)?  ← 5 samples over 25 ms, need ≥ 3 LOW
  │       │
  │       └── NO → return   (normal boot, nothing modified)
  │
  ├── beep_short()           2700 Hz, 100 ms
  │
  ├── Poll every 10 ms, max 5 s:
  │       is_button_pressed(GPIO17)?
  │           YES → keep waiting
  │           NO  → proceed
  │
  ├── Held > 5 s? → HOOK_LOGW, return  (abort, normal boot)
  │
  ├── wait 100 ms
  │
  ├── backup_and_erase_otadata()
  │       ├── Read otadata sector 1 @ 0x10000  (32 B)
  │       ├── Read otadata sector 2 @ 0x11000  (32 B)
  │       ├── Erase backup sector   @ 0xB000
  │       ├── Write backup sector   @ 0xB000   (entry1 + entry2 + magic)
  │       ├── Erase otadata sector 1 @ 0x10000
  │       └── Erase otadata sector 2 @ 0x11000
  │
  ├── beep_confirm()          2700 Hz 150 ms + 100 ms silence + 3200 Hz 150 ms
  ├── wait 200 ms
  └── esp_rom_software_reset_system()

[Second boot — otadata all 0xFF]

bootloader selects factory partition
  │
  └── Factory App (app_main)
        ├── Read magic @ 0xB040 → 0xAA55AA55 (valid backup)
        ├── Restore otadata entry1 → 0x10000
        ├── Restore otadata entry2 → 0x11000
        └── Erase backup sector @ 0xB000  (invalidate)

[Normal factory UI — user can power off safely]
[Next power cycle → OTA partition restored]
```

---

## API Reference

All functions are `static` (module-private) except the three ESP-IDF hook entry points. No header file is published; the hooks are called by the IDF bootloader framework by name convention.

### Bootloader Hook Entry Points

#### `void bootloader_hooks_include(void)`

**Purpose**: Linker-visible symbol required by the ESP-IDF custom bootloader hook mechanism. Calling this function forces the linker to include the hooks object file. Contains no logic.

---

#### `void bootloader_before_init(void)`

**Purpose**: Called by the IDF bootloader framework **before** any hardware initialisation. Currently reserved for future use (empty body).

**Timing**: Before clock, flash, or GPIO initialisation.

---

#### `void bootloader_after_init(void)`

**Purpose**: Main hook entry point. Called **after** the IDF bootloader has completed its own hardware initialisation. Implements the full recovery trigger logic.

**Sequence**:
1. Enable GPIO26 as output (buzzer).
2. Enable GPIO17 as input with pull-up (BTN3).
3. Wait 100 ms for pull-up to stabilise.
4. Sample GPIO17; if not pressed → return immediately (normal boot).
5. If pressed → `beep_short()`, wait for release (max 5 s).
6. If held > 5 s → `HOOK_LOGW`, abort → return (normal boot).
7. `backup_and_erase_otadata()` → `beep_confirm()` → software reset.

**Constraints**: Must not use any IDF driver API, FreeRTOS, heap allocation, or LVGL. Uses only `esp_rom_*` and `gpio_ll_*` primitives.

---

### Internal Functions

#### `static bool is_button_pressed(gpio_num_t pin)`

**Purpose**: Debounced button read. Samples the GPIO 5 times over 25 ms and returns `true` if ≥ 3 samples read LOW (active-low buttons, pull-up enabled).

| Parameter | Description |
|---|---|
| `pin` | GPIO number to sample |

**Returns**: `true` if button is considered pressed (majority vote).

**Why debounce at ROM level**: At bootloader stage there is no interrupt or hardware filter available. The 5-sample majority vote over 25 ms eliminates contact bounce and short glitches without requiring a timer peripheral.

---

#### `static void backup_and_erase_otadata(void)`

**Purpose**: Reads both otadata sectors from flash, writes them plus a magic marker to the backup sector at `OTADATA_BACKUP_OFFSET`, then erases the live otadata sectors. After this function returns, the IDF bootloader (on the next reset) will find empty otadata and fall back to the factory partition.

**Flash operations** (all via `esp_rom_spiflash_*`):

| Step | Operation | Address |
|---|---|---|
| 1 | Read otadata entry 1 (32 B) | `0x10000` |
| 2 | Read otadata entry 2 (32 B) | `0x11000` |
| 3 | Erase backup sector (4 KB) | `0xB000` |
| 4 | Write backup sector (entry1 + entry2 + magic) | `0xB000` |
| 5 | Erase otadata sector 1 (4 KB) | `0x10000` |
| 6 | Erase otadata sector 2 (4 KB) | `0x11000` |

**Error handling**: Any ROM SPI failure triggers `beep_error()` (400 Hz, 500 ms) and early return. The function does **not** reset; the caller's recovery sequence is aborted and a normal boot proceeds.

**Backup sector layout** (within a single 4 KB sector at 0xB000):

```
Offset  Size  Content
0x000   32 B  otadata entry 1 copy
0x020   32 B  otadata entry 2 copy
0x040    4 B  magic marker: 0xAA55AA55
0x044  rest   0xFF (erased flash)
```

---

#### `static void buzzer_tone(uint32_t frequency, uint32_t duration_ms)`

**Purpose**: Bit-banged square-wave buzzer driver. Toggles GPIO26 at the requested frequency for the requested duration using `esp_rom_delay_us` busy-wait loops.

| Parameter | Description |
|---|---|
| `frequency` | Tone frequency in Hz |
| `duration_ms` | Tone duration in milliseconds |

**Why bit-bang**: The LEDC and RMT peripherals are not yet initialised at bootloader stage. `esp_rom_delay_us` is the only available timing primitive.

---

#### `static void beep_short(void)`

Plays a short acknowledgment tone: **2700 Hz for 100 ms**. Fired immediately when BTN3 is detected as pressed, giving audio feedback that recovery mode was entered.

---

#### `static void beep_confirm(void)`

Plays a two-tone confirmation: **2700 Hz for 150 ms**, 100 ms silence, **3200 Hz for 150 ms**. Played after `backup_and_erase_otadata()` succeeds, just before the software reset.

---

#### `static void beep_error(void)` *(internal)*

Plays a low error tone: **400 Hz for 500 ms**. Played on any flash read/write failure inside `backup_and_erase_otadata()`.

---

## Hardware Pin Assignments

| Signal | GPIO | Direction | Notes |
|---|---|---|---|
| Buzzer | GPIO26 | Output | Bit-banged square wave |
| BTN3 | GPIO17 | Input | Active-low, internal pull-up enabled |
| BTN1 | GPIO4 | — | **Not used at boot** — GPIO4 is a strapping pin on ESP32; using it at bootloader stage risks changing the boot mode |
| BTN2 | GPIO16 | — | Not used by bootloader |

---

## Logging

The bootloader runs before the standard ESP-IDF log system is available. `ESP_LOG*` macros are stripped by `CONFIG_BOOTLOADER_LOG_LEVEL_NONE`. This module defines its own thin wrappers around `esp_rom_printf`:

| Macro | Always printed | Controlled by `FACTORY_LOG_LEVEL` |
|---|---|---|
| `HOOK_LOGE` | ✅ Errors | — |
| `HOOK_LOGW` | ✅ Warnings | — |
| `HOOK_LOGI` | — | ✅ set via `ENABLE_FACTORY_DEBUG_LOG` in CMakeLists.txt |

`FACTORY_LOG_LEVEL` defaults to `0` (info logs suppressed). Enable debug output by setting `ENABLE_FACTORY_DEBUG_LOG=1` in the board's `CMakeLists.txt`.

---

## Key Constants

| Constant | Value | Description |
|---|---|---|
| `FLASH_SECTOR_SIZE` | `0x1000` | 4 KB — defined locally; not available in bootloader context |
| `BUZZER_PIN` | `GPIO_NUM_26` | Buzzer output |
| `BUTTON_3_PIN` | `GPIO_NUM_17` | Recovery trigger button |
| `OTADATA_OFFSET` | `0x10000` | Start of otadata in flash — must match partition table |
| `OTADATA_SECTOR_1` | `0x10` (16) | Sector index of otadata entry 1 |
| `OTADATA_SECTOR_2` | `0x11` (17) | Sector index of otadata entry 2 |
| `OTADATA_BACKUP_OFFSET` | `0xB000` | Reserved backup sector — **must match factory app `main.c`** |
| `OTADATA_BACKUP_SECTOR` | `0x0B` (11) | Sector index of backup |
| `OTADATA_ENTRY_SIZE` | `32` | Size of one otadata entry (bytes) |
| `BACKUP_MAGIC_OFFSET` | `0x40` | Offset of magic marker within backup sector |
| `BACKUP_MAGIC` | `0xAA55AA55` | Magic value — signals valid backup to factory app |
| `RELEASE_TIMEOUT_US` | `5,000,000` | 5 s max wait for button release |
| `POLL_INTERVAL_US` | `10,000` | 10 ms polling interval during wait |

---

## Relationship to the Factory App

The bootloader and factory app form a **two-phase recovery handshake**. The bootloader writes the backup and triggers factory boot; the factory app reads the backup and restores OTA routing before presenting any UI.

```
Custom Bootloader                    Flash @ 0xB000         Factory App
─────────────────                    ──────────────         ───────────
Write otadata copy
  + magic 0xAA55AA55  ─────────────►
Erase live otadata
  @ 0x10000
Software reset

                                                    Read magic @ 0xB040
                                                    magic == 0xAA55AA55 ─► YES
                                                    Restore entry1 @ 0x10000
                                                    Restore entry2 @ 0x11000
                                                    Erase backup  @ 0xB000
                                                    (User can power off safely)
                                                    (Next boot → OTA partition)
```

See [pibot_pendant_v1_0_factory_app.md](pibot_pendant_v1_0_factory_app.md) for the `restore_otadata_from_backup` implementation in `main.c`.

---

## Integration Paths

The module provides two directory layouts corresponding to two ESP-IDF integration methods:

### `bootloader_components/custom_bootloader/` (current, ESP-IDF 5.x)

Placed as a **component** alongside the factory app project. ESP-IDF automatically discovers it and links the hooks into the bootloader binary at build time. Recommended for ESP-IDF 5.x projects.

### `custom_bootloader/` (legacy)

The older ESP-IDF approach: a `custom_bootloader` directory at project root level. Used by ESP-IDF 4.x. Kept for compatibility.

Both paths compile and link identically; choose based on the ESP-IDF version in use.

---

## Comparison with Other Board Bootloaders

The `ESP32_S3_WROOM_CAM` board uses a structurally identical bootloader hook pattern (`backup_and_erase_otadata`, `is_button_pressed`, `bootloader_after_init`) but without the buzzer feedback functions. The pibot_pendant_v1_0 bootloader extends this baseline with audio feedback suited to the pendant's physical buzzer.

| Feature | ESP32_S3_WROOM_CAM | pibot_pendant_v1_0 |
|---|---|---|
| `bootloader_before_init` | ✅ (no-op) | ✅ (no-op) |
| `bootloader_after_init` | ✅ | ✅ |
| `backup_and_erase_otadata` | ✅ | ✅ |
| `is_button_pressed` | ✅ | ✅ |
| `buzzer_tone` / `beep_*` | ❌ | ✅ (GPIO26) |
| Recovery button GPIO | board-specific | GPIO17 (BTN3) |

---

## Build Notes

- **Target**: ESP32 (Xtensa LX6 dual-core), 8 MB SPI flash
- **ESP-IDF version**: 5.x
- **Bootloader binary size**: ~18 816 bytes (~0x4980) — determines minimum backup sector address
- **Partition table offset**: `CONFIG_PARTITION_TABLE_OFFSET = 0xC000`
- **`CONFIG_SPI_FLASH_DANGEROUS_WRITE_ALLOWED=y`** must be set in the **factory app** sdkconfig (not the bootloader sdkconfig). See `sdkconfig.8mb`.
- Debug logging: set `ENABLE_FACTORY_DEBUG_LOG=1` in `boards/pibot_pendant_v1_0/Factory/CMakeLists.txt`

---

## Sibling Modules

| Module | Role |
|---|---|
| [pibot_pendant_v1_0_factory_app](pibot_pendant_v1_0_factory_app.md) | Factory application: restores otadata backup, provides SD update and partition management UI |
| [pibot_pendant_v1_0_bsp](pibot_pendant_v1_0_bsp.md) | Board Support Package: LVGL, touch, encoder, button, potentiometer, switch drivers for the main firmware |
| [pibot_pendant_v1_0_build_scripts](pibot_pendant_v1_0_build_scripts.md) | Python build automation scripts for variant builds |

For the hardware pin map and schematics, see `docs/hardware/pibot-cnc-pendant-hardware-documentation.md`.  
For the factory app technical constraints (dangerous-write, sdkconfig), see `docs/Factory/factory_app_technical_doc.md`.


## Documents de conception (depot)

- [factory_app_technical_doc.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/Factory/factory_app_technical_doc.md)


## Documents de conception (depot)

- [bootloader_technical_doc](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/Factory/bootloader_technical_doc.md)
