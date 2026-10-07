---
title: "Entry Point Module"
---

# Entry Point Module

## Overview

The **entry point** module is the single-file bridge between the ESP-IDF runtime and the entire ESP3D-X firmware. It consists of `main/main.cpp`, which contains only the mandatory `app_main()` function required by ESP-IDF. All real boot logic is delegated immediately to `ESP3DX::begin()`, making this module a thin but architecturally significant gateway.

```cpp
// main/main.cpp  — the complete file
static ESP3DX myTft;
extern "C" void app_main(void) { myTft.begin(); }
```

The `ESP3DX` class (defined in `main/core/includes/esp3d_x.h`, implemented in `main/core/esp3d_x.cpp`) orchestrates every subsystem startup in a strict, dependency-ordered sequence. Understanding this sequence is essential for anyone working on boot behavior, feature gating, or memory budgeting.

---

## Architecture

### Position in the System

```mermaid
graph TD
    ESPIDF["ESP-IDF Runtime\n(FreeRTOS scheduler starts)"]
    MAIN["main/main.cpp\napp_main()"]
    ESP3DX["ESP3DX::begin()\nmain/core/esp3d_x.cpp"]

    BOARD["BSP: board_init()\nboards/&lt;target&gt;/components/bsp/"]
    NVS["NVS Flash\nSettings persistence"]
    SETTINGS["ESP3DSettings\nNVS-backed config"]
    FS["Flash Filesystem\nFlash + optional SD"]
    VALUES["ESP3DValues\nObservable system state"]
    UI["ESP3DXUi → tft_ui_task\nLVGL on Core 1"]
    STREAM["ESP3DXStream\nGCode pipeline"]
    NETWORK["ESP3DXNetwork → networkTask\nWiFi / BT on Core 0"]

    ESPIDF --> MAIN
    MAIN --> ESP3DX
    ESP3DX --> BOARD
    ESP3DX --> NVS
    NVS --> SETTINGS
    ESP3DX --> FS
    ESP3DX --> VALUES
    ESP3DX --> UI
    ESP3DX --> STREAM
    ESP3DX --> NETWORK
```

`app_main()` is called once by the ESP-IDF scheduler on **Core 0** after all hardware peripherals are ready. It is a `C`-linkage symbol (`extern "C"`) because the ESP-IDF startup code is C, while the firmware is C++.

---

## Component Relationships

```mermaid
graph LR
    MAIN["main/main.cpp"]
    X["esp3d_x.h / esp3d_x.cpp\nESP3DX"]
    LOG["esp3d_log\nSerial logging backend"]
    BSP["board_init.h\nBSP (board-specific)"]
    NVS_LIB["nvs_flash (ESP-IDF)"]
    SETTINGS["esp3d_settings.h\nESP3DSettings"]
    FS["esp3d_flash.h / esp3d_sd.h\nFilesystem"]
    UPDATE["esp3d_update_service.h\nOTA + resource update"]
    VALUES["esp3d_values.h\nESP3DValues"]
    TRANS["esp3d_translation_service.h\nTranslations"]
    UI["esp3d_x_ui.h\nESP3DXUi"]
    STREAM["esp3d_x_stream.h\nESP3DXStream"]
    NET["esp3d_x_network.h\nESP3DXNetwork"]
    BUZZER["esp3d_buzzer.h"]
    SENSOR["esp3d_sensor.h"]
    LUA["EspLuaEngine"]
    CAM["camera.h"]

    MAIN -->|"instantiates &\ncalls begin()"| X
    X --> LOG
    X --> BSP
    X --> NVS_LIB
    X --> SETTINGS
    X --> FS
    X --> UPDATE
    X --> VALUES
    X --> TRANS
    X --> UI
    X --> STREAM
    X --> NET
    X -.->|"#if ESP3D_BUZZER_FEATURE"| BUZZER
    X -.->|"#if ESP3D_SENSOR_FEATURE"| SENSOR
    X -.->|"#if ESP3D_LUA_INTERPRETER_FEATURE"| LUA
    X -.->|"#if ESP3D_CAMERA_FEATURE"| CAM
```

Dashed lines represent **compile-time optional** subsystems controlled by CMake feature flags.

---

## Initialization Sequence (Boot Flow)

`ESP3DX::begin()` executes on the main task (Core 0) and follows a strict, sequential order. Steps marked `[optional]` are compiled in only when the corresponding CMake feature flag is enabled.

```mermaid
sequenceDiagram
    participant IDF as ESP-IDF Runtime
    participant MAIN as app_main()
    participant X as ESP3DX::begin()
    participant BSP as board_init()
    participant NVS as nvs_flash
    participant SET as ESP3DSettings
    participant FS as Flash / SD FS
    participant UPD as UpdateService
    participant VAL as ESP3DValues
    participant UI as ESP3DXUi
    participant STR as ESP3DXStream
    participant NET as ESP3DXNetwork

    IDF->>MAIN: app_main() [Core 0]
    Note over MAIN: ESP3DX constructor → esp3d_log_init()
    MAIN->>X: myTft.begin()

    X->>NVS: nvs_flash_init() [erase if corrupt]
    X->>BSP: board_init() [LCD, touch, LVGL tick]
    X->>SET: isValidSettingsNvs() → read or reset()

    Note over X: [optional] Buzzer, Lua, Sensor, USB, Camera

    X->>FS: flashFs.begin()
    X->>FS: sd.begin() [optional: SD_CARD_FEATURE]

    X->>UPD: detect() [optional: UPDATE_FEATURE]
    Note over UPD: Scans SD for firmware/config/resources - does NOT apply yet

    X->>VAL: esp3dXValues.initialize()

    X->>UI: esp3dTranslationService.begin() + esp3dXui.begin() [optional: DISPLAY_FEATURE]
    Note over UI: Spawns tft_ui_task on Core 1 (LVGL loop)

    alt Update pending [UPDATE_FEATURE]
        X->>UI: waitFirstFrameRendered(3000ms)
        X->>UPD: begin() → apply update + reboot
        Note over X: Returns false - system reboots
    else No update
        X->>STR: esp3dXstream.begin() [GCode pipeline]
        X->>NET: esp3dXnetwork.begin() [optional: WIFI or BT]
        Note over NET: Spawns networkTask on Core 0
        X-->>MAIN: return true
    end
```

### Key Observations

| Step | Notes |
|---|---|
| `esp3d_log_init()` | Called in the `ESP3DX` **constructor**, before `begin()`. The serial log backend is active from the very first line. |
| `board_init()` | BSP-specific. Initializes the display panel, touch controller, LVGL tick timer, and any board-specific GPIO. See [Board Support Packages documentation](Board_Support_Packages.md). |
| NVS validation | If NVS is corrupt or version-mismatched, `ESP3DSettings::reset()` is called to restore factory defaults before anything else reads from settings. |
| `esp3dXValues.initialize()` | Always runs regardless of the display feature flag. Network and CNC code may call `set_value` / `get_value` even on headless builds. |
| `esp3dXui.begin()` | Returns immediately after spawning `tft_ui_task`. The UI runs independently on **Core 1**. The calling task only blocks when an update is pending. |
| Update path | If an update is detected, `begin()` waits for the update screen to become visible (`waitFirstFrameRendered`), applies the update, then **returns `false`**. The system reboots. The normal boot path never executes. |
| `esp3dXnetwork.begin()` | Spawns `networkTask`, which initializes the TCP/IP stack (`esp_netif_init`) and starts WiFi or Bluetooth depending on build configuration. WiFi and Bluetooth are mutually exclusive (hardware constraint). |

---

## Feature-Gate Summary

The entry point's behavior changes significantly depending on compile-time flags set in `CMakeLists.txt`:

```mermaid
graph TD
    FLAGS["CMake Feature Flags"]
    DISPLAY["ESP3D_DISPLAY_FEATURE\n→ UI task, translations,\n  update screen"]
    UPDATE["ESP3D_UPDATE_FEATURE\n→ SD update detection &\n  application before normal boot"]
    WIFI["ESP3D_WIFI_FEATURE\n→ networkTask with TCP/IP stack"]
    BT["ESP3D_BT_SERIAL_FEATURE /\nESP3D_BT_BLE_FEATURE\n→ networkTask with Bluetooth\n(mutually exclusive with WiFi)"]
    SD["ESP3D_SD_CARD_FEATURE\n→ SD FS init, update detection"]
    USB["ESP3D_USB_SERIAL_FEATURE\n→ USB OTG host init/deinit"]
    BUZZER["ESP3D_BUZZER_FEATURE\n→ buzzer.begin()"]
    SENSOR["ESP3D_SENSOR_FEATURE\n→ sensor.begin()"]
    LUA["ESP3D_LUA_INTERPRETER_FEATURE\n→ lua_interpreter.begin()"]
    CAM["ESP3D_CAMERA_FEATURE\n→ camera.begin()"]

    FLAGS --> DISPLAY
    FLAGS --> UPDATE
    FLAGS --> WIFI
    FLAGS --> BT
    FLAGS --> SD
    FLAGS --> USB
    FLAGS --> BUZZER
    FLAGS --> SENSOR
    FLAGS --> LUA
    FLAGS --> CAM
```

See `cmake/features.cmake` for macro definitions and `cmake/sanity_check.cmake` for mutual-exclusion rules (e.g., WiFi + BT, socket client + WebUI).

---

## FreeRTOS Task Topology After Boot

Once `begin()` completes successfully, the system stabilizes into the following task layout:

```mermaid
graph LR
    subgraph "Core 0"
        MAIN_TASK["main task\n(app_main returns,\ntask is deleted)"]
        NET_TASK["networkTask\n(ESP3DXNetwork)"]
        STREAM_TASK["streamTask\n(ESP3DXStream)"]
        SERIAL_TASK["esp3d_serial_rx_task\n(optional)"]
        USB_TASK["usb_lib_task\n(optional)"]
        CAM_TASK["Camera task\n(optional)"]
    end

    subgraph "Core 1"
        UI_TASK["tft_ui_task\n(LVGL handler)"]
    end

    subgraph "Shared State"
        VALUES_SYS["ESP3DValues\n(mutex-protected)"]
        SETTINGS_SYS["ESP3DSettings\n(NVS)"]
    end

    NET_TASK <--> VALUES_SYS
    STREAM_TASK <--> VALUES_SYS
    UI_TASK <--> VALUES_SYS
    NET_TASK <--> SETTINGS_SYS
    UI_TASK <--> SETTINGS_SYS
```

> ⚠️ **Critical constraint**: LVGL is single-threaded and runs exclusively on **Core 1** inside `tft_ui_task`. All other tasks must never call LVGL APIs directly. Shared data is exchanged through `ESP3DValues` (observable, mutex-protected). See [UI Framework & Screens documentation](UI_Framework_and_Screens.md) for the full LVGL threading model.

---

## Update Boot Path Detail

When a firmware or resource update is detected on the SD card, the boot sequence diverges from normal operation:

```mermaid
flowchart TD
    A["begin() starts"] --> B["FS + SD init"]
    B --> C{SD available?}
    C -- No --> D[Skip update detection]
    C -- Yes --> E["UpdateService::detect()"]
    E --> F{Update found?}
    F -- No --> D
    D --> G["esp3dXValues.initialize()"]
    G --> H["esp3dXui.begin()"]
    H --> I["esp3dXstream.begin()"]
    I --> J["esp3dXnetwork.begin()"]
    J --> K[return true - normal operation]

    F -- Yes --> L["esp3dXValues.initialize()"]
    L --> M["esp3dXui.begin()\nshows update_screen"]
    M --> N[waitFirstFrameRendered 3000ms]
    N --> O["UpdateService::begin()\napply firmware / resources / config"]
    O --> P{Success?}
    P -- Yes --> Q["waitUpdateCompletionRendered\n+ fixed delay"]
    P -- No --> Q
    Q --> R[System reboot]
    R --> A
```

---

## Related Modules

| Module | Relationship |
|---|---|
| [Core Platform & Infrastructure](Core_Platform_and_Infrastructure.md) | Defines `ESP3DX`, `ESP3DSettings`, `ESP3DValues`, `ESP3DCommands`, and the logging system initialized at boot |
| [Board Support Packages](Board_Support_Packages.md) | `board_init()` called directly in `begin()` — provides display, touch, and LVGL tick for each hardware target |
| [UI Framework & Screens](UI_Framework_and_Screens.md) | `ESP3DXUi::begin()` starts the LVGL task; the entry point gates the update flow on `waitFirstFrameRendered` |
| [CNC Firmware Integration](CNC_Firmware_Integration.md) | `ESP3DXStream::begin()` starts the GCode pipeline task after the update check |
| [Network & Web Services](Network_and_Web_Services.md) | `ESP3DXNetwork::begin()` spawns the network task (WiFi or Bluetooth, build-exclusive) |
| [Storage & Configuration](Storage_and_Configuration.md) | Flash and SD filesystems initialized early in `begin()` before any service that reads files |
| [Hardware Peripheral Drivers](Hardware_Peripheral_Drivers.md) | Low-level drivers consumed by `board_init()` for display, touch, encoder, buzzer |
