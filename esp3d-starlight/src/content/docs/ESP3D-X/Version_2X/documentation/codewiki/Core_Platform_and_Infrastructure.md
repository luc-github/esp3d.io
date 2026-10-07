---
title: "Core Platform & Infrastructure"
---

# Core Platform & Infrastructure

## Purpose

`Core_Platform_&_Infrastructure` is the foundational layer of the ESP3D-X CNC pendant firmware. It owns the complete firmware lifecycle from the ESP-IDF `app_main` entry point through all subsystem initialization, and provides the shared services every other module depends on: persistent settings, the inter-module message bus, the `[ESPxxx]` command dispatcher, an observable runtime state system, a structured logging subsystem with pluggable backends, a multi-language translation service, and a centralized user-activity tracking system. All other modules (UI, CNC integration, network, transports) build on the services defined here.

---

## Architecture

### Module Composition

```mermaid
graph TB
    subgraph CPI["Core Platform & Infrastructure"]
        direction TB
        EP["entry_point\nmain/main.cpp\napp_main()"]
        CORE["esp3d_core\nmain/core/\nESP3DX · Settings · Messages\nCommands · HAL · LVGL utils"]
        CMD["esp3d_commands\nmain/core/commands/\nESP0…ESP950 handlers"]
        LOG["esp3d_log\ncomponents/esp3d_log/\nMacros · Backends · Hooks"]
        VAL["values\nmain/modules/values/\nESP3DValues observable bus"]
        ACT["esp3d_activity_manager\ncomponents/esp3d_activity_manager/\nInput detection · Inactivity timeouts"]
        TRANS["translations\nmain/modules/translations/\nESP3DTranslationService\nLNG1 blob format"]
    end

    EP --> CORE
    CORE --> CMD
    CORE --> LOG
    CORE --> VAL
    CORE --> TRANS
    ACT --> VAL
    CMD --> VAL
    CMD --> CORE
```

### Initialization Sequence

```mermaid
sequenceDiagram
    participant IDF as ESP-IDF Runtime
    participant EP  as app_main()
    participant X   as ESP3DX::begin()
    participant NVS as nvs_flash
    participant BSP as board_init()
    participant SET as ESP3DSettings
    participant LOG as esp3d_log_init()
    participant VAL as ESP3DValues
    participant TR  as ESP3DTranslationService
    participant UI  as ESP3DXUi (LVGL task Core 1)
    participant STR as ESP3DXStream
    participant NET as ESP3DXNetwork

    IDF->>EP: app_main() [Core 0]
    EP->>X: ESP3DX::begin()
    X->>LOG: esp3d_log_init()
    X->>NVS: nvs_flash_init()
    X->>BSP: board_init() - display, touch, LVGL tick
    X->>SET: validate NVS schema / reset() if needed
    X->>VAL: initialize() - allocate buffer pool
    X->>TR: begin() - pin LNG1 blob from partition
    X->>UI: begin() - spawn tft_ui_task on Core 1
    X->>STR: begin() - GCode pipeline
    X->>NET: begin() - WiFi or BT networkTask
```

### FreeRTOS Task Layout After Boot

```mermaid
graph LR
    subgraph "Core 0"
        NET["networkTask\nESP3DXNetwork"]
        STR["streamTask\nESP3DXStream"]
        SER["esp3d_serial_rx_task"]
    end
    subgraph "Core 1"
        UI["tft_ui_task\nLVGL handler"]
    end
    subgraph "Shared Services"
        VAL2["ESP3DValues\n(observable, mutex-protected)"]
        SET2["ESP3DSettings\n(NVS)"]
        LOG2["esp3d_log\n(mutex-protected)"]
    end
    NET <--> VAL2
    STR <--> VAL2
    UI  <--> VAL2
    NET <--> SET2
    UI  <--> SET2
```

### Message Bus Data Flow

```mermaid
flowchart TD
    SERIAL["Serial RX Task"] -->|ESP3DMessage| CMD2["ESP3DCommands\nprocess()"]
    BT["BT RX Task"]         -->|ESP3DMessage| CMD2
    HTTP["HTTP Handler"]      -->|ESP3DMessage| CMD2
    CMD2 -->|"[ESPxxx] → execute"| HANDLER["ESPxxx handler"]
    CMD2 -->|"GCode → forward"| GCODE["GCode Host"]
    HANDLER -->|"dispatch() normal"| TXQ["Target TX queue (back)"]
    HANDLER -->|"dispatch() high"| TXF["Target TX queue (front)"]
    TXQ --> TX["Transport TX"]
    TXF --> TX
```

### Observable Value Update Flow

```mermaid
sequenceDiagram
    participant T as Transport Task (Core 0)
    participant V as ESP3DValues
    participant Q as Update Queue (30 slots)
    participant L as LVGL Task (Core 1)
    participant CB as Screen Callback

    T->>V: set_value(index, '1.234', Update)
    V->>Q: enqueue (or replace duplicate)
    loop every LVGL tick
        L->>V: handle()
        V->>Q: dequeue → write buffer pool
        V->>V: snapshot subscriber list
        V->>CB: invoke callbacks (outside mutex)
        CB->>CB: update LVGL widget (safe on Core 1)
    end
```

---

## Sub-module Reference

| Sub-module | Path | Role |
|---|---|---|
| `entry_point` | `main/main.cpp` | Thin `app_main` bridge → `ESP3DX::begin()` |
| `esp3d_core` | `main/core/` | `ESP3DX`, `ESP3DSettings`, `ESP3DJsonSettings`, `ESP3DClient`/`ESP3DMessage`, `ESP3DCommands`, `esp3d_hal`, LVGL snapshot utilities, system message history, string helpers |
| `esp3d_commands` | `main/core/commands/` | `[ESP0]`–`[ESP950]` handler implementations |
| `esp3d_log` | `components/esp3d_log/` | Severity-gated macros (`esp3d_log`, `_d`, `_w`, `_e`), mutex-serialized output, 5 pluggable backends, runtime hook API |
| `values` | `main/modules/values/` | `ESP3DValues` pub/sub bus — single-block pool, circular update queue, subscriber linked lists, all callbacks on Core 1 |
| `esp3d_activity_manager` | `components/esp3d_activity_manager/` | BSP input aggregation → inactivity timeout → backlight fade/wake, first-touch suppression |
| `translations` | `main/modules/translations/` | `ESP3DTranslationService` — LNG1 blob binary search in mmapped flash, English `.rodata` fallback, SD-card language pack update |

---

## Key Constraints

| Constraint | Detail |
|---|---|
| LVGL runs on **Core 1 only** | Never call LVGL APIs from Core 0 tasks or ISRs |
| `ESP3DValues::handle()` called from LVGL task | All subscriber callbacks are therefore UI-safe |
| Log macros compile to zero at `ESP3D_LOG=0` | Always wrap in `{}` to prevent dangling `if` when logging is stripped |
| NVS writes serialized by mutex | Non-recursive; never call `write` from within a read callback |
| Buffer pool single-block allocation | Minimizes heap fragmentation on ~10 KB available heap (BT mode) |
| `std::string` in hot paths forbidden | Use `snprintf` into fixed buffers; protect any `std::string` with `try/catch(std::bad_alloc)` |

---

## Documentation References

| Document | Content |
|---|---|
| `docs/guides/esp32_memory_constraints.md` | Heap fragmentation playbook; worst-case RAM budgets per config |
| `docs/guides/esp3d_log_guide.md` | Log macro levels, backend selection, runtime hook registration |
| `docs/architecture/connection_management.md` | How transports set `connection_status` and `server_status` observable values |
| `docs/architecture/gcode_host_architecture.md` | How GCode handlers write CNC values into `ESP3DValues` |
| `docs/architecture/screens_architecture.md` | How UI screens subscribe to values and respond via callbacks |
| `docs/ui_resources/development.md` | `ui_resources` partition format; font/image/language blob pipeline |
| `docs/features/feature_resource_matrix.md` | Feature-flag compatibility matrix; mutual exclusion rules |
| `cmake/sanity_check.cmake` | Build-time enforcement of feature flag constraints |

## Documents de conception (depot)

- [esp32_memory_constraints.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md)
- [esp3d_log_guide.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp3d_log_guide.md)
