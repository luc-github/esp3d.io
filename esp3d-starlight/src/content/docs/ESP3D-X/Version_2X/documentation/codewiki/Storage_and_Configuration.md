---
title: "Storage & Configuration Module"
---

# Storage & Configuration Module

## Purpose

The `Storage_&_Configuration` module (`main/modules/`) provides unified, memory-safe access to all persistent storage and configuration data on the ESP32 pendant. It abstracts internal flash and SD card filesystems behind a single POSIX-like API, handles all SD-card-sourced firmware and resource update operations during boot, parses INI-style configuration files, and manages optional sensor hardware polling. Every other module that reads or writes files — HTTP handlers, GCode host, update screen, translation service — goes through this layer.

---

## Architecture Overview

```mermaid
graph TD
    subgraph Consumers
        HTTP[HTTP Handlers]
        CMD[ESP Commands\n720 / 740 / 780]
        GH[GCode Host]
        UI[CNC File Screens]
        TRANS[Translation Service]
        MACRO[Macro Manager]
    end

    subgraph Storage_Configuration["Storage & Configuration"]
        direction TB

        GFS["globalFs\nESP3DGlobalFileSystem\n(path router)\nmain/modules/filesystem/esp3d_globalfs.h"]

        subgraph Flash["Flash Backend"]
            FLH["flashFs · ESP3DFlash\nmount: /fs\nmain/modules/filesystem/esp3d_flash.h"]
            FATFS["esp_flash_fatFs.cpp\nESP3D_FATFS_FEATURE"]
            LFSF["esp_flash_littleFs.cpp\nESP3D_LITTLEFS_FEATURE"]
        end

        subgraph SD["SD Backend (ESP3D_SD_CARD_FEATURE)"]
            SDDRV["sd · ESP3DSd\nmount: /sd\nmain/modules/filesystem/esp3d_sd.h"]
            SPI["esp_sd_spi.cpp\nSD_INTERFACE_TYPE=0"]
            SDIO["esp_sd_sdio.cpp\nSD_INTERFACE_TYPE=1"]
        end

        UPD["ESP3DUpdateService\nmain/modules/update/"]
        CFG["ESP3DConfigFile\nmain/modules/config_file/"]
        SEN["ESP3DSensor\nmain/modules/sensors/\n(dormant - no active SKU)"]
    end

    Consumers --> GFS
    GFS -->|"/fs/..."| FLH
    GFS -->|"/sd/..."| SDDRV
    FLH --> FATFS
    FLH --> LFSF
    SDDRV --> SPI
    SDDRV --> SDIO
    UPD --> GFS
    UPD --> CFG
    CFG --> GFS
```

---

## Sub-module Detail

### 1. Filesystem — Three-Tier Path Router

```mermaid
graph LR
    path([path argument]) --> pfx{Prefix?}
    pfx -->|"/fs/..."| FLASH["flashFs\n(internal flash)"]
    pfx -->|"/sd/..."| SDCARD["sd\n(SD card)"]
    pfx -->|"/"| ROOT["virtual root\nlists fs/ and sd/"]
    pfx -->|other| ERR["NULL / false"]
```

**Tier 1 — Router** (`esp3d_globalfs.h`): Inspects path prefix and dispatches to the correct backend. Exposes a unified POSIX-like API (`open`, `close`, `exists`, `remove`, `rename`, `opendir`, `readdir`, `stat`, `getSpaceInfo`).

**Tier 2 — Backends**:
- `ESP3DFlash` (`esp3d_flash.h`): Internal flash, mount point `/fs`, partition label `flashfs`. Uses a `uint16_t` nesting counter for access control.
- `ESP3DSd` (`esp3d_sd.h`): SD card, mount point `/sd`. Uses a `pthread_mutex_t` + watchdog counter for safe concurrent and long-lived access.

**Tier 3 — Implementations** (compile-time selected, one per medium):
- Flash: `esp_flash_fatFs.cpp` (`ESP3D_FATFS_FEATURE`) or `esp_flash_littleFs.cpp` (`ESP3D_LITTLEFS_FEATURE`)
- SD: `esp_sd_spi.cpp` (`SD_INTERFACE_TYPE=0`) or `esp_sd_sdio.cpp` (`SD_INTERFACE_TYPE=1`)

---

### 2. Update Service

Runs **once at boot** before LVGL starts. Detects and executes one SD-card-sourced update per boot cycle in priority order:

```mermaid
flowchart LR
    P1["① firmware\nesp3dfw.bin\n→ OTA partition"]
    P2["② config\nesp3dcnf.ini\n→ NVS"]
    P3["③ resources\nui_resources.bin\n→ ui_resources partition"]
    P4["④ theme_colors\nesp3dtheme.ini\n→ ui_resources partition"]
    P5["⑤ language_packs\n/ui_*.lng\n→ ui_resources partition"]
    P6["⑥ resource_patches\n/esp3dres/*.bin|*.fnt\n→ ui_resources partition"]
    P1 --> P2 --> P3 --> P4 --> P5 --> P6
```

After each update the source file is renamed to `.ok` (success, with secrets scrambled for config) or `.bad` (failure), and the device reboots. Progress is pushed to the LVGL Update Screen via `ESP3DValues`.

---

### 3. Config File — INI Parser

`ESP3DConfigFile` (`esp3d_config_file.h`) is a lightweight INI parser operating entirely on fixed-size stack buffers (no heap allocation). Used by:

| Caller | File | Action |
|---|---|---|
| Update Service | `/sd/esp3dcnf.ini` | Parse all settings → NVS; revoke with secrets masked |
| Translation Service | `/fs/*.lng` | Parse language key/value pairs |
| UIManager | `/sd/esp3dtheme.ini` | Parse theme token overrides |
| Macro Manager | `/fs/macros.ini` | Parse stored GCode macro list |

Two modes: **full-scan with callback** (`processingFunction_t`) or **single-key lookup** (`processFile(section, key, buf, size)`). `revokeFile()` atomically replaces the original with a sanitized copy masking protected keys (passwords, tokens, PINs).

---

### 4. Sensors (Dormant)

`ESP3DSensor` (`esp3d_sensor.h`) manages periodic polling of one compile-time-selected hardware sensor — DHT11/22, BMP280/BME280, or ADC analog. Results are normalized into `ESP3DSensorData` and exposed via `[ESP210]` command and mDNS. **No board currently enables `SENSOR_SERVICE`**; this is reserved groundwork for future SKUs.

---

## Dependency Map

```mermaid
graph TD
    GFS["globalFs\nESP3DGlobalFileSystem"]
    FLH["flashFs\nESP3DFlash"]
    SDDRV["sd\nESP3DSd"]
    UPD["ESP3DUpdateService"]
    CFG["ESP3DConfigFile"]
    SET["ESP3DSettings\n(NVS)"]
    RES["esp3d_resources\n(ui_resources partition)"]
    VAL["ESP3DValues\n(observables)"]
    TRANS["ESP3DTranslationService"]
    UI_SCR["Update Screen\n(LVGL)"]

    UPD --> GFS
    UPD --> CFG
    UPD --> SET
    UPD --> RES
    UPD --> VAL
    CFG --> GFS
    TRANS --> CFG
    GFS --> FLH
    GFS --> SDDRV
    VAL --> UI_SCR
```

---

## Core Components Reference

| Component | File | Description |
|---|---|---|
| `ESP3DGlobalFileSystem` | `main/modules/filesystem/esp3d_globalfs.h` | Path-routing façade — preferred entry point for all callers |
| `ESP3DFlash` | `main/modules/filesystem/esp3d_flash.h` | Internal flash filesystem driver |
| `ESP3DSd` | `main/modules/filesystem/esp3d_sd.h` | SD card filesystem driver with watchdog and mutex |
| `esp3d_sd_config_t` | `main/modules/filesystem/esp3d_sd_config.h` | Board-level SD pin/interface configuration struct |
| `ESP3DUpdateService` | `main/modules/update/esp3d_update_service.h` | Boot-time SD update orchestrator |
| `ESP3DConfigFile` | `main/modules/config_file/esp3d_config_file.h` | INI-style file parser and revoker |
| `ESP3DSensor` / `ESP3DSensorData` | `main/modules/sensors/esp3d_sensor.h` | Sensor polling facade (dormant) |

## Related Documentation

- `docs/architecture/shared_sd_mechanism_V2.0.md` — Shared SD bus protocol (ESP32 ↔ MCU ownership handoff)
- `docs/guides/esp32_memory_constraints.md` — Heap budget; SD/flash allocation rules
- `docs/guides/ui_resources_guide.md` — UI resource partition format validated by the update service
- `docs/ui_resources/development.md` — Binary format, partition structure, and patch mechanism
- `main/core/includes/esp3d_settings.h` — NVS settings read by update service and sensor module
- `main/modules/values/esp3d_values.h` — Observable system used for update-progress feedback to LVGL

## Modules complementaires

- [sensors](sensors.md)


## Documents de conception (depot)

- [shared_sd_mechanism_V2.0.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/shared_sd_mechanism_V2.0.md)
- [update_ota.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/update_ota.md)
