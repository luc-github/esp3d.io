---
title: "Pibot-cnc-pendant-firmware Repository Overview"
---

# Pibot-cnc-pendant-firmware Repository Overview

## Purpose

`Pibot-cnc-pendant-firmware` is an ESP-IDF 5.x firmware project for a touchscreen CNC pendant running on ESP32/ESP32-S3 hardware. It provides a multi-transport, multi-firmware-target pendant UI for CNC machines controlled by FluidNC, grbl, or grblHAL. The firmware handles real-time GCode streaming, machine status display, jog control, probing, file management, and remote access — all on a single constrained MCU with no external PSRAM on the primary target board.

---

## End-to-End Architecture

### Top-Level Module Map

```mermaid
graph TD
    subgraph Host["Host / Developer Machine"]
        TOOLS["Build & Development Tools\ntools/ · build_scripts/\nui_studio · fw_simulator · comm clients"]
    end

    subgraph ESP32["ESP32 / ESP32-S3 Target"]
        subgraph BSP["Board Support Package\nboards/*/components/bsp/"]
            BOARD["board_init.c\nDisplay · Touch · LVGL tick\nButtons · Encoder · Potentiometer"]
        end

        subgraph HAL["Hardware Peripheral Drivers\nhardware/"]
            DISP["Display drivers\nSPI · I80 · RGB"]
            TOUCH["Touch drivers\nFT5x06 · FT6336U · GT911 · XPT2046"]
            INPUT["Physical inputs\nButtons · Encoder · Switch · Potentiometer"]
            BUZZ["Buzzer\nLEDC PWM"]
        end

        subgraph CORE["Core Platform & Infrastructure\nmain/core/ · components/esp3d_log/"]
            ENTRY["app_main → ESP3DX::begin()"]
            SETTINGS["ESP3DSettings (NVS)"]
            VALUES["ESP3DValues\nObservable pub/sub bus"]
            CMD["ESP3DCommands\n[ESPxxx] handlers"]
            LOG["esp3d_log\nMacros · Backends · Hooks"]
            TRANS["ESP3DTranslationService\nLNG1 binary blobs"]
        end

        subgraph UI["UI Framework & Screens\nmain/display/"]
            UICORE["UIManager · ESP3DXUi\ntft_ui_task (Core 1)"]
            THEME["Theme system\n26 semantic tokens · 4 themes"]
            RES["esp3d_resources\nFlash partition XIP"]
            COMP["Reusable components\nCircularMenu · ListMenu\nPanel · VirtualButtons · Keyboard"]
            SCREENS["Screens\nSplash · Main · Jog · Status\nFiles · Probe · Settings · …"]
            CNC_UI["CNC-specific UI\ncnc/fluidnc · cnc/grbl · cnc/grblhal"]
        end

        subgraph CNC["CNC Firmware Integration\nmain/modules/gcode_host/ · main/target/"]
            GHOST["ESP3DGCodeHostService\nDual queue · State machine\nFlow control gates"]
            HANDLER["ESP3DGCodeHandlerService\nFluidNC / grbl / grblHAL\nProtocol parser"]
            FLOW["gcodeHostFlow*\nOk credit · Planner · RX window"]
        end

        subgraph TRANSPORT["Communication Transports\nmain/modules/"]
            SER["Serial UART"]
            BTS["BT SPP"]
            BLE["BT BLE GATT"]
            USB["USB Serial OTG"]
            SOCK["Socket TCP"]
            WSC["WebSocket Client"]
        end

        subgraph NETWORK["Network & Web Services\nmain/modules/network/"]
            WIFI["ESP3DWifiClient\nSTA · AP"]
            HTTP["HTTP Server\nWebUI · Files · WebDAV"]
            WSRV["WebSocket Server\nWebUI · Data stream"]
            MDNS["mDNS"]
            SSDP["SSDP / UPnP"]
        end

        subgraph STORAGE["Storage & Configuration\nmain/modules/filesystem/"]
            FLASH["Flash FS\n/fs (FAT or LittleFS)"]
            SD["SD Card\n/sd (SPI or SDIO)"]
            UPD["Update Service\nBoot-time SD update"]
            CFG["Config File\nINI parser"]
        end
    end

    TOOLS -->|idf.py build / flash| ESP32
    BOARD --> HAL
    ENTRY --> CORE
    CORE --> VALUES
    VALUES --> UI
    VALUES --> CNC
    UICORE --> COMP
    COMP --> SCREENS
    SCREENS --> CNC_UI
    CNC_UI --> GHOST
    GHOST <--> HANDLER
    HANDLER --> VALUES
    GHOST --> TRANSPORT
    TRANSPORT <-->|UART bytes| CNC_HW["CNC Controller\nFluidNC · grbl · grblHAL"]
    WIFI --> NETWORK
    NETWORK --> VALUES
    CORE --> STORAGE
    UPD --> VALUES
    LOG --> LOGBE["Log Backends\nSD · UART2 · Telnet · WebSocket"]
```

---

### Boot and Initialization Sequence

```mermaid
sequenceDiagram
    participant IDF as ESP-IDF Runtime
    participant Main as app_main (Core 0)
    participant X as ESP3DX::begin()
    participant BSP as board_init()
    participant UI as tft_ui_task (Core 1)
    participant NET as networkTask (Core 0)
    participant STR as streamTask (Core 0)

    IDF->>Main: app_main()
    Main->>X: ESP3DX::begin()
    X->>X: esp3d_log_init()
    X->>X: nvs_flash_init()
    X->>BSP: board_init() - display · touch · LVGL tick
    X->>X: ESP3DSettings::validate / reset NVS
    X->>X: ESP3DValues::initialize()
    X->>X: ESP3DTranslationService::begin()
    X->>UI: spawn tft_ui_task pinned to Core 1
    UI->>UI: UIManager::initialize() - load resources / theme
    UI->>UI: splash_screen::create()
    X->>X: ESP3DUpdateService::begin() - SD update check
    X->>STR: ESP3DXStream::begin() - GCode pipeline
    X->>NET: ESP3DXNetwork::begin() - WiFi or BT
    loop Every LVGL tick (Core 1)
        UI->>UI: ESP3DValues::handle() - drain update queue
        UI->>UI: lv_timer_handler()
    end
```

---

### Core Data Flow

```mermaid
flowchart LR
    subgraph Inputs["User Inputs (Core 1)"]
        TOUCH2["Touch / Buttons\nEncoder / Switch"]
    end

    subgraph UILayer["UI Layer (Core 1)"]
        SCR["Active Screen\n(jog / status / files / …)"]
    end

    subgraph Bus["ESP3DValues\n(observable bus)"]
        PUB(("publish\nset_value()"))
        SUB(("subscribe\ncallback"))
    end

    subgraph CNCLayer["CNC Integration (Core 0)"]
        GH["GCodeHostService\nScheduler + flow control"]
        PARSE["GCodeHandlerService\nProtocol parser"]
    end

    subgraph Wire["Transport"]
        UART["UART / BT / USB\n/ TCP / WS"]
    end

    subgraph HW["CNC Controller"]
        FW["FluidNC / grbl / grblHAL"]
    end

    TOUCH2 --> SCR
    SCR -->|"send_gcode(jog cmd)"| GH
    GH -->|flow-gated TX| UART
    UART <-->|bytes| FW
    FW -->|status reports / ok| UART
    UART -->|RX line| PARSE
    PARSE -->|"set_value(positions / status / …)"| PUB
    PUB --> Bus
    Bus --> SUB
    SUB -->|callback on Core 1| SCR
    SCR -->|"lv_obj_set_text(…)"| SCR
```

---

### FreeRTOS Task Layout

```mermaid
graph LR
    subgraph Core0["Core 0"]
        NET2["networkTask\nWiFi lifecycle + service startup"]
        STREAM["streamTask\nGCode host + transport dispatch"]
        RXSER["esp3d_serial_rx_task\nor BT / USB / Socket RX task"]
    end

    subgraph Core1["Core 1"]
        LVGL2["tft_ui_task\nLVGL handler · screen updates"]
    end

    subgraph Shared["Shared (mutex-protected)"]
        VAL2["ESP3DValues"]
        SET2["ESP3DSettings (NVS)"]
        GFS2["GlobalFileSystem"]
        LOG2["esp3d_log"]
    end

    NET2 <--> VAL2
    STREAM <--> VAL2
    LVGL2 <--> VAL2
    NET2 <--> SET2
    STREAM <--> GFS2
    LVGL2 <--> SET2
```

---

### CNC GCode Flow-Control State Machine

```mermaid
stateDiagram-v2
    direction LR
    [*] --> start
    start --> ready_to_read_cursor
    ready_to_read_cursor --> read_cursor : no pending request
    read_cursor --> send_gcode_command : line read
    read_cursor --> end : EOF
    send_gcode_command --> wait_for_ack : at in-flight cap
    send_gcode_command --> ready_to_read_cursor : credits ok
    wait_for_ack --> ready_to_read_cursor : ok received
    wait_for_ack --> error : timeout 10 s
    ready_to_read_cursor --> paused : pause requested
    paused --> ready_to_read_cursor : resume
    error --> end
    end --> [*]
```

---

### Transport Selection (Build-time)

```mermaid
graph TD
    BUILD["CMakeLists.txt\nfeature flags"]

    BUILD --> SER2["Serial UART\n(default)"]
    BUILD --> BTS2["BT SPP\nESP3D_BT_SERIAL_FEATURE"]
    BUILD --> BLE2["BT BLE GATT\nESP3D_BT_BLE_FEATURE"]
    BUILD --> USB2["USB Serial OTG\nESP3D_USB_SERIAL_FEATURE"]
    BUILD --> SOC2["Socket Client TCP\nSOCKET_CLIENT_SERVICE"]
    BUILD --> WSC2["WebSocket Client\nESP3D_WS_CLIENT_SERVICE_FEATURE"]

    BTS2 -- "no PSRAM: mutually exclusive" --> WIFI2["WiFi transports\n(SOC / WSC)"]
    BLE2 -- "no PSRAM: mutually exclusive" --> WIFI2
    BTS2 -- "one radio" --- BLE2
    SOC2 -- "same CNC-over-WiFi role" --- WSC2

    SANITY["cmake/sanity_check.cmake\nenforces all exclusions"]
    BUILD --> SANITY
```

---

### WiFi / CNC Product Model

```mermaid
graph LR
    subgraph SKU_A["SKU A - Serial CNC + WiFi Remote"]
        SA_CNC["Serial / USB UART → CNC controller"]
        SA_WIFI["WiFi → HTTP WebUI · WS Data · mDNS · SSDP"]
    end

    subgraph SKU_B["SKU B - WiFi CNC only"]
        SB_CNC["Socket Client TCP → CNC controller"]
        note["WebUI · SSDP · WS Server DISABLED\n(cmake/sanity_check.cmake)"]
    end

    subgraph SKU_C["SKU C - Bluetooth CNC"]
        SC_CNC["BT SPP or BLE → CNC controller"]
        SC_note["WiFi DISABLED (no PSRAM)\nonly ~10 KB heap available"]
    end
```

---

## Core Modules Reference

| Module | Path | Primary Documentation |
|---|---|---|
| **Board Support Packages** | `boards/*/components/bsp/` | `docs/guides/board_build_guidelines.md` |
| **Hardware Peripheral Drivers** | `hardware/` | `docs/architecture/display_drivers.md`, `docs/architecture/Input_system.md` |
| **Core Platform & Infrastructure** | `main/core/`, `components/esp3d_log/` | `docs/guides/esp32_memory_constraints.md`, `docs/guides/esp3d_log_guide.md` |
| **UI Framework & Screens** | `main/display/` | `docs/architecture/screens_architecture.md`, `docs/architecture/screen_transitions_flow.md`, `docs/ui_resources/theme_palette.md`, `docs/ui_resources/ui_style_guide.md` |
| **CNC Firmware Integration** | `main/modules/gcode_host/`, `main/target/` | `docs/architecture/gcode_host_architecture.md`, `docs/architecture/gcode_host_streaming_flow.md` |
| **Communication Transports** | `main/modules/serial/`, `bt_serial/`, `bt_ble/`, `usb_serial/`, `socket_client/`, `websocket_client/` | `docs/architecture/connection_management.md`, `docs/architecture/websockets_protocol.md` |
| **Network & Web Services** | `main/modules/network/`, `wifi/`, `http/`, `websocket_server/`, `mdns/`, `ssdp/` | `docs/features/feature_resource_matrix.md`, `docs/features/mdns.md` |
| **Storage & Configuration** | `main/modules/filesystem/`, `update/`, `config_file/` | `docs/architecture/shared_sd_mechanism_V2.0.md`, `docs/ui_resources/development.md` |
| **Build & Development Tools** | `tools/` | `docs/guides/tools.md`, `docs/guides/board_build_guidelines.md` |
| **Log Backends** | `main/modules/log/` | `docs/guides/esp3d_log_guide.md` |

### Key Architecture Documents

| Document | Topic |
|---|---|
| `docs/architecture/connection_management.md` | Transport lifecycle, connection states (`U/T/C/?/A`) |
| `docs/architecture/gcode_host_architecture.md` | Core + CNC domain split, CMake wiring |
| `docs/architecture/gcode_host_streaming_flow.md` | State machine, pause/resume/abort, flow gates |
| `docs/architecture/esp3d_message_priority_system.md` | Normal vs high-priority message routing |
| `docs/architecture/screens_architecture.md` | Screen registration, `GenericScreen` base |
| `docs/architecture/screen_transitions_flow.md` | Safe timer-based transition idiom |
| `docs/architecture/Input_system.md` | Encoder, buttons, switch, potentiometer pipeline |
| `docs/architecture/display_drivers.md` | SPI/I80/RGB driver stack, orientation math |
| `docs/architecture/shared_sd_mechanism_V2.0.md` | SD bus arbitration between ESP32 and MCU |
| `docs/features/feature_resource_matrix.md` | Feature compatibility, WiFi/CNC SKU model |
| `docs/guides/esp32_memory_constraints.md` | Heap fragmentation, worst-case RAM budgets |
| `docs/guides/esp3d_log_guide.md` | Logging macros, backends, runtime hooks |
| `docs/ui_resources/development.md` | `ui_resources` partition binary format, SD update pipeline |
| `docs/ui_resources/theme_palette.md` | 26 semantic color tokens, per-theme RGBA values |
| `docs/ui_resources/ui_style_guide.md` | `ThemeStyles` architecture, `apply*` function catalog |
| `docs/guides/ui_resources_guide.md` | Adding icons and fonts, SD-card update workflow |
| `docs/hardware/pibot-cnc-pendant-hardware-documentation.md` | Physical pendant hardware reference |

### Build Commands

```bash
# Build for a specific board/variant
idf.py build

# Flash and monitor
idf.py flash monitor

# Multi-board build (via build manager)
python tools/build_scripts/build_mgr.py

# Generate UI resources partition
python tools/build_scripts/generate_resources.py

# Launch UI Studio (theme/image/font editor)
cd tools/ui_studio && python app.py
```

---

## Module Documentation

| Module | Contenu |
|---|---|
| [Board_Support_Packages](Board_Support_Packages.md) | Les 16 cartes supportees : BSP, factory apps, bootloaders, scripts de build |
| [Hardware_Peripheral_Drivers](Hardware_Peripheral_Drivers.md) | Pilotes d'affichage (SPI/I80/RGB), tactiles, entrees physiques, bus, buzzer |
| [Core_Platform_&_Infrastructure](Core_Platform_and_Infrastructure.md) | Point d'entree, esp3d_core, commandes [ESPxxx], valeurs observables, logs, traductions |
| [UI_Framework_&_Screens](UI_Framework_and_Screens.md) | Framework LVGL, composants reutilisables, ecrans generiques et CNC (FluidNC/grbl/grblHAL) |
| [CNC_Firmware_Integration](CNC_Firmware_Integration.md) | G-code host, streaming, parseurs de protocole FluidNC / grbl / grblHAL |
| [Communication_Transports](Communication_Transports.md) | UART, Bluetooth SPP/BLE, USB OTG, sockets TCP, WebSocket client |
| [Network_&_Web_Services](Network_and_Web_Services.md) | WiFi, serveur HTTP/WebUI, WebSocket serveur, mDNS, SSDP, authentification |
| [Storage_&_Configuration](Storage_and_Configuration.md) | Systemes de fichiers (flash/SD), service de mise a jour, fichier de config INI |
| [Build_&_Development_Tools](Build_and_Development_Tools.md) | Scripts de build, simulateur firmware, UI Studio, clients de communication |
| [embedded_webui](embedded_webui.md) | Page web embarquee minimale (terminal, fichiers, mise a jour) servie depuis la flash |
| [logging_backends](logging_backends.md) | Backends de journalisation (seriemoniteur, SD, reseau) |

---

## Modules complementaires

- [logging_backends](logging_backends.md)


---

## Developer Guides (tutorials)

Guides pratiques pour **etendre** le firmware (extraits de l'analyse DeepWiki) :

- [guide_development](guide_development.md) — vue d'ensemble des guides
- [guide_build_system](guide_build_system.md) — systeme de build et feature flags
- [guide_adding_screens](guide_adding_screens.md) — ajouter un ecran
- [guide_adding_settings](guide_adding_settings.md) — ajouter un setting persistant
- [guide_adding_realtime_values](guide_adding_realtime_values.md) — ajouter une valeur temps reel
- [guide_extending_gcode](guide_extending_gcode.md) — etendre le support G-code
- [guide_translations](guide_translations.md) — travailler avec les traductions
- [guide_custom_ui_components](guide_custom_ui_components.md) — creer un composant UI
- [guide_debugging](guide_debugging.md) — debogage et tests

References complementaires :

- [settings_reference](settings_reference.md) — catalogue complet des settings (clés NVS, types, defauts)
- [glossary](glossary.md) — glossaire du projet


## Documents de conception (depot)

- [features.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/features.md)
- [feature_resource_matrix.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/feature_resource_matrix.md)
- [esp32_memory_constraints.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md)


## Documents de conception (depot)

- [user_documentation](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/user%20documentation/user_doc/user_documentation.md)
