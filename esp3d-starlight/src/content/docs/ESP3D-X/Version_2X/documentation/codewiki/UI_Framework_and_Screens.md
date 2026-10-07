---
title: "UI Framework & Screens"
---

# UI Framework & Screens

## Purpose

The `UI_Framework_&_Screens` module (`main/display/`) is the complete display and interaction layer of the Pibot CNC Pendant firmware. It owns every pixel on screen: the LVGL task lifecycle, theme system, resource loading from flash, screen navigation, reusable widget components, and all CNC firmware-specific UI screens. It runs exclusively on **Core 1** and is the sole consumer of LVGL APIs anywhere in the codebase.

The module is structured in four tiers:

| Tier | Sub-module | Responsibility |
|------|-----------|----------------|
| Foundation | `ui_core` | LVGL task runner, `UIManager`, theme tokens/styles, flash resource loader |
| Components | `ui_components` | Reusable widgets: circular menu, list menu, panel, virtual buttons, custom keyboard |
| Screens | `common_screens`, `activity_monitoring` | Transport-agnostic screens (splash, input, message box, scan, settings pickers) |
| CNC firmware UI | `cnc_shared`, `fluidnc_module`, `grbl_module`, `grblhal_module` | Machine-specific screens: main, jog, status, files, probe, tool change |

---

## Architecture

### Module Overview

```mermaid
graph TD
    subgraph UI_Framework_and_Screens["UI_Framework_&_Screens (main/display/)"]
        direction TB
        CORE["ui_core\nesp3d_x_ui / UIManager\nTheme system / Resources"]
        COMP["ui_components\nCircularMenu / ListMenu\nPanel / VirtualButtons\nCustomKeyboard"]
        COMMON["common_screens\nSplash / Input / MessageBox\nNetworkScan / SettingsPickers\nConnectionStatus / Update"]
        ACT["activity_monitoring\nScreen timeout / Backlight fade"]
        SHARED["cnc_shared\nMain / Jog / Status\nSettings / Macros\nFirmwareStatus"]

        subgraph Firmware_Modules["Firmware-specific modules"]
            FLUID["fluidnc_module\nConnectionStatus\nChangeTool / Files / Probe"]
            GRBL["grbl_module\nConnectionStatus\nChangeTool / Files / Probe\nScreen Router"]
            GRBLHAL["grblhal_module\nConnectionStatus\nChangeTool / Files / Probe\nScreen Router"]
        end

        CORE --> COMP
        CORE --> COMMON
        COMP --> COMMON
        COMP --> SHARED
        COMMON --> SHARED
        ACT --> SHARED
        SHARED --> Firmware_Modules
    end

    subgraph Platform["Core Platform & Infrastructure"]
        VALS["ESP3DValues\n(observable system)"]
        SETS["ESP3DSettings (NVS)"]
        TRANS["ESP3DTranslationService"]
        LOG["esp3d_log"]
    end

    subgraph Hardware["BSP / Hardware Drivers"]
        BSP["board_init.c\nlvgl_flush_cb / increase_lvgl_tick"]
        BL["disp_backlight"]
        PART["ui_resources partition\n(flash, XIP)"]
    end

    subgraph CNC["CNC Firmware Integration"]
        GH["esp3dGcodeHandler\n(per firmware target)"]
    end

    CORE -->|reads/writes| SETS
    CORE -->|notifies orientation| VALS
    CORE -->|restarts on lang change| TRANS
    CORE -->|spi_flash_mmap| PART
    CORE -->|pinned Core 1 task| BSP
    ACT -->|backlight_set| BL
    ACT -->|subscribe server_status| VALS
    SHARED -->|subscribe observables| VALS
    Firmware_Modules -->|sendGcode| GH
    GH -->|update observables| VALS
```

### LVGL Task Lifecycle

```mermaid
sequenceDiagram
    participant Boot as main.cpp (app_main)
    participant XUi  as ESP3DXUi
    participant Task as tft_ui_task (Core 1)
    participant UM   as UIManager
    participant LVGL as LVGL

    Boot->>XUi: esp3dXui.begin()
    XUi->>Task: xTaskCreatePinnedToCore(Core 1)
    Task->>UM: ui_manager.initialize()
    UM->>UM: esp3d_resources_init() → spi_flash_mmap
    UM->>UM: loadThemeNames / applyTheme / initializeStyles
    UM->>UM: esp3dXValues.initialize()
    UM->>UM: esp3dTranslationService.begin()
    Task->>LVGL: create_application() → splash_screen::create()
    loop Every LVGL tick
        Task->>LVGL: _lock_acquire
        Task->>LVGL: esp3dXValues.handle()
        Task->>LVGL: lv_timer_handler()
        Task->>LVGL: _lock_release
    end
    Task-->>XUi: notifyFirstFrameRendered()
    Boot->>XUi: waitFirstFrameRendered(timeout_ms)
```

### Theme and Style Pipeline

```mermaid
flowchart LR
    PART["ui_resources partition\nblobs: theme 0..3\n104 bytes tokens + name"]
    FALLBACK["esp3d_theme_palettes.h\ncompiled-in defaults"]
    TOKENS["ThemeTokens\n26 semantic RGBA tokens\n(bg, text, accent, glow,\nindicator groups)"]
    STYLES["ThemeStyles\n~40 lv_style_t objects\napply* API"]
    WIDGETS["LVGL Widgets\n(all screens & components)"]

    PART -->|"esp3d_resources_get_blob()"| TOKENS
    FALLBACK -->|"partition absent or stale"| TOKENS
    TOKENS -->|"initializeStyles()"| STYLES
    STYLES -->|"applyButtonDefaultStyle()\napplyListNodeStyle()\napplyCircularMenuStyle()\n…"| WIDGETS
```

### Screen Navigation (CNC shared flow)

```mermaid
stateDiagram-v2
    [*] --> Splash
    Splash --> Main : connection established or timeout
    Main --> Jog : menu section → Jog
    Main --> Status : menu section → Status
    Main --> Settings : menu section → Settings
    Main --> FirmwareStatus : menu section → Console
    Settings --> SettingsList : sub-settings
    Settings --> Information : about
    Status --> ChangeTool : M6 requested (firmware event)
    Jog --> ChangeTool : user navigates
    ChangeTool --> Probe : optional tool probe
    Probe --> ChangeTool : result returned
    Status --> Files : file menu
    Files --> Status : job launched
    Files --> MessageBox : confirm / delete
    MessageBox --> Files : return
    Settings --> ConnectionStatus : transport info
    Settings --> WiFiScan : connect to WiFi
    Settings --> ServerScan : connect to TCP server
    Settings --> BtScan : connect to BT host
    Settings --> Baudrate : baud selection
    Settings --> Language : language picker
    Settings --> ScreenTimeout : timeout picker
    Settings --> Polling : polling interval picker
    Settings --> OutputSelection : transport picker
    Jog --> Input : edit step/feedrate
    Status --> Input : edit overrides
    Input --> Jog
    Input --> Status
```

### Component Hierarchy

```mermaid
classDiagram
    class RotaryBaseComponent {
        <<abstract>>
        +handleEncoderEvent(lv_event_t*)
        +setDebounceThreshold(int64_t)
        #processEncoderStep(dir, step, total)*
    }
    class CircularMenuComponent {
        +showMenu()
        +simulate_click(section_id)
        +updateOrientation(orientation)
        +updateThemeColor()
        +enableEncoderFor(index)
        +prepareForDestruction()
    }
    class ListMenuComponent {
        +move_up() / move_down()
        +updateItemList(items, count)
        +setEncoderInterceptCallback(cb)
        +prepareForDestruction()
    }
    class PanelComponent {
        +addItem(obj, values) int32_t
        +setFocusedItem(id)
        +enableEncoderFor(mode)
        +activateItem(id)
        +prepareForDestruction()
    }
    class VirtualButtonsComponent {
        +update_button(idx, icon, enabled)
        +simulate_click(idx)
        +updateOrientation(orientation)
        +attachSwitchEmulation(obj, n)$
        +prepareForDestruction()
    }
    class customKeyboard {
        <<namespace>>
        +create(KeyboardConfig) lv_obj_t*
        +set_type(obj, KeyboardType)
        +finalize_numeric_input(obj, allowLeadingZeros)
    }
    RotaryBaseComponent <|-- CircularMenuComponent
    RotaryBaseComponent <|-- ListMenuComponent
    RotaryBaseComponent <|-- PanelComponent
```

---

## Core Components Documentation

| Sub-module | Path | Key files | Documentation |
|-----------|------|-----------|---------------|
| **ui_core** — LVGL task, UIManager, theme, resources | `main/display/` | `esp3d_x_ui.h/cpp`, `esp3d_ui.h/cpp`, `esp3d_resources.cpp`, `esp3d_snapshot.h`, `esp3d_translations_id_map.h` | [`docs/architecture/screens_architecture.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md), [`docs/ui_resources/development.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md), [`docs/ui_resources/theme_palette.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/theme_palette.md), [`docs/ui_resources/ui_style_guide.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/ui_style_guide.md) |
| **ui_components** — reusable widgets | `main/display/components/` | `circular_menu_component.h`, `list_menu_component.h`, `panel_component.h`, `virtual_buttons_component.h`, `custom_keyboard_component.h/cpp` | [`docs/architecture/Input_system.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/Input_system.md), [`docs/architecture/screen_transitions_flow.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md) |
| **common_screens** — transport-agnostic screens | `main/display/screens/` | `generic_screen.h`, `circular_menu_screen.h`, `list_menu_screen.h`, `input_screen.*`, `message_box_screen.*`, `splash_screen.*`, `wifi_scan_screen.*`, `connection_status_screen.*` | [`docs/architecture/screens_architecture.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md), [`docs/architecture/screen_transitions_flow.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md) |
| **activity_monitoring** — screen timeout/backlight | `main/display/activity_monitoring.cpp` | `activity_monitoring.cpp/.h` | `components/esp3d_activity_manager/` |
| **cnc_shared** — shared CNC screens | `main/display/cnc/screens/` | `main_screen.cpp`, `jog_screen.cpp`, `status_screen.cpp`, `settings_screen.cpp`, `macros_screen.cpp`, `macro_manager.h/cpp`, `firmware_status_screen.cpp`, `information_screen.cpp` | [`docs/ux_flows/`](docs/ux_flows/) |
| **fluidnc_module** — FluidNC-specific UI | `main/display/cnc/fluidnc/` | `connection_status.h`, `change_tool_screen.cpp`, `files_screen.cpp`, `probe_screen.cpp` | [`docs/ux_flows/`](docs/ux_flows/) |
| **grbl_module** — grbl-specific UI | `main/display/cnc/grbl/` | `esp3d_screen_type.cpp`, `connection_status.h`, `change_tool_screen.cpp`, `files_screen.cpp`, `probe_screen.cpp` | [`docs/ux_flows/`](docs/ux_flows/) |
| **grblhal_module** — grblHAL-specific UI | `main/display/cnc/grblhal/` | `esp3d_screen_type.cpp`, `connection_status.h`, `change_tool_screen.cpp`, `files_screen.cpp`, `probe_screen.cpp` | [`docs/ux_flows/`](docs/ux_flows/) |

### Related documentation

| Topic | Document |
|-------|---------|
| Screen architecture, `GenericScreen` base, registration patterns | [`docs/architecture/screens_architecture.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md) |
| Safe timer-based screen transition idiom | [`docs/architecture/screen_transitions_flow.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md) |
| Input system (encoder, buttons, switch, potentiometer) | [`docs/architecture/Input_system.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/Input_system.md) |
| Display driver architecture (SPI / RGB / I80, orientation math) | [`docs/architecture/display_drivers.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/display_drivers.md) |
| `ui_resources` partition binary format, `generate_resources.py`, SD update | [`docs/ui_resources/development.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md) |
| 26 semantic color tokens, per-theme RGBA values, design conventions | [`docs/ui_resources/theme_palette.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/theme_palette.md) |
| `ThemeStyles` architecture, `apply*` catalog, per-screen style inventory | [`docs/ui_resources/ui_style_guide.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/ui_style_guide.md) |
| Adding/modifying icons and fonts, SD-card update workflow | [`docs/guides/ui_resources_guide.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/ui_resources_guide.md) |
| FluidNC / grblHAL screen-by-screen UX flows | [`docs/ux_flows/`](docs/ux_flows/) |
| Memory constraints (heap, fragmentation, WiFi vs BT) | [`docs/guides/esp32_memory_constraints.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) |

---

## Critical Constraints

| Rule | Reason |
|------|--------|
| All `lv_obj_*` / `lv_style_*` calls must be inside `_lock_acquire` / `_lock_release` or within LVGL event/timer callbacks | LVGL is strictly single-threaded on Core 1 |
| Never destroy LVGL objects inside an event callback | Use `lv_timer_create()` cleanup timers — see `screen_transitions_flow.md` |
| `initializeStyles()` / `resetStyles()` only from the LVGL task or before it starts | `lv_style_*` APIs are not thread-safe |
| Never call `lv_obj_remove_style_all()` on widgets styled via `apply*Style()` | Styles are shared objects; removing all strips them from the shared pool |
| After `esp3d_resources_write_blob()`, the mmap view is stale | The update service must reboot immediately after a successful blob write |
| All `calloc`/`malloc` in display code must be checked; log total free + largest block on failure | Heap can drop to ~10 KB in Bluetooth mode; silent allocation failure crashes the system |