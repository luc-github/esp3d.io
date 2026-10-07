---
title: "CNC Firmware Integration"
---

# CNC Firmware Integration

## Purpose

The `CNC_Firmware_Integration` module is the **bidirectional bridge between the pendant firmware and the connected CNC controller**. It is responsible for:

- Scheduling, pacing, and acknowledging every outbound G-code or ESP command through a priority queue and FreeRTOS streaming engine (`ESP3DGCodeHostService`).
- Parsing firmware protocol responses (status reports, `ok`/`error` acknowledgements, file listings, parser state) and publishing decoded values into the observable `ESP3DValues` store so the UI reacts in real time.
- Enforcing flow-control gates before each transmitted line to avoid overrunning the controller's RX buffer and planner queue.
- Managing firmware-family-specific session lifecycle (startup sequences, MPG token negotiation, status polling).

The module is **compiled once per firmware target**. CMake selects exactly one firmware handler and one flow-control implementation at build time — there is no runtime polymorphism overhead.

---

## Architecture Overview

### Module Position in the Firmware Stack

```mermaid
graph TD
    subgraph Producers["Command Producers"]
        UI["UI Screens\njog / status / macros / probe"]
        CMD["ESP3DCommands\nESP700 / ESP701"]
        HTTP["HTTP / WebSocket\nhandlers"]
        MACRO["Macro Manager\nSD / Flash scripts"]
    end

    subgraph CNC_Firmware_Integration["CNC Firmware Integration"]
        XS["ESP3DXStream\nTransport orchestrator"]
        GHS["ESP3DGCodeHostService\nScheduler · State machine · File I/O"]
        FLOW["gcodeHostFlow*\nFlow control gates"]
        HANDLER["ESP3DGCodeHandlerService\nFirmware protocol handler"]
    end

    subgraph Transports["Output Transports - one active"]
        SER["Serial UART"]
        USB["USB Serial"]
        BT["BT SPP / BLE"]
        SOCK["Socket / WebSocket"]
    end

    subgraph Values["Core - ESP3DValues"]
        EV["esp3dXValues\nObservable state store"]
    end

    UI & CMD & HTTP & MACRO -->|process msg| GHS
    XS --> GHS
    XS --> Transports
    GHS <-->|gcodeHostFlow*| FLOW
    GHS <-->|classify RX / send| HANDLER
    HANDLER -->|set_value| EV
    EV -->|subscriptions| UI
    GHS -->|dispatch| Transports
    Transports <-->|bytes| CNC["CNC Firmware\nFluidNC / grblHAL / GRBL"]
```

### Build-Time Layer Selection

```mermaid
graph LR
    subgraph Core["Core - shared across all targets"]
        GHS2["ESP3DGCodeHostService\nmain/modules/gcode_host/"]
        XS2["ESP3DXStream\nmain/modules/gcode_host/"]
    end

    subgraph Flow["Flow layer - one compiled per build"]
        CNC_F["CNC flow\ntarget/cnc/modules/gcode_host/\nok credit + planner + RX gates"]
        NONE_F["None flow\ntarget/none/modules/gcode_host/\nPermissive stubs"]
    end

    subgraph Handler["Handler - one compiled per build"]
        FNC["cnc_fluidnc\ntarget/cnc/fluidnc/"]
        GBH["cnc_grblhal\ntarget/cnc/grblhal/"]
        GBL["cnc_grbl\ntarget/cnc/grbl/"]
        NONE_H["none_target\ntarget/none/"]
    end

    GHS2 -->|gcodeHostFlow*| Flow
    GHS2 -->|esp3dGcodeHandler.*| Handler
```

---

## Dual Queue System

The host service maintains two independent stream queues processed every 10 ms tick:

```mermaid
graph TB
    subgraph Scripts["_scripts - immediate / priority queue"]
        S1["single_command"]
        S2["multiple_commands"]
        S3["fs_script / sd_script"]
    end

    subgraph Streams["_streams - long-running file job queue"]
        M1["fs_stream - job 1"]
        M2["fs_stream - job 2"]
    end

    SEL["_handle_stream_selection()"]
    ACT["Active stream\n_current_stream_ptr"]

    Scripts -->|"takes precedence"| SEL
    Streams -->|"fallback when _scripts empty"| SEL
    SEL --> ACT
```

Scripts always preempt file streams at `ready_to_read_cursor` or `paused` states. A file stream paused while scripts run auto-resumes once the script queue drains.

---

## Stream State Machine

Each queued stream advances through the following states (up to 4 steps per 10 ms tick):

```mermaid
stateDiagram-v2
    direction LR
    [*] --> start
    start --> ready_to_read_cursor : file opened / command ready
    ready_to_read_cursor --> read_cursor : no pending request
    ready_to_read_cursor --> pause : pause requested
    read_cursor --> send_gcode_command : G-code line read
    read_cursor --> end : cursor == totalSize
    send_gcode_command --> wait_for_ack : at in-flight cap
    send_gcode_command --> ready_to_read_cursor : credits available
    send_gcode_command --> ready_to_read_cursor : flow gate closed - yield + save line
    wait_for_ack --> ready_to_read_cursor : ok received
    wait_for_ack --> error : timeout 10 s
    pause --> paused
    paused --> resume : resume notification
    resume --> paused : _resume_pending set
    error --> end
    end --> [*]
```

---

## CNC Flow Control Gates

`gcodeHostFlowCanSendLine()` evaluates four conditions before any normal G-code line may be sent:

```mermaid
flowchart TD
    SEND["gcodeHostFlowCanSendLine(line_len)"]
    C1{"pending_ok < max_in_flight?"}
    C2{"planner blocks > threshold?"}
    C3{"inflight_bytes + wire_len ≤ rx_buffer_size?"}
    C4{"wire_len ≤ rx_bytes_free snapshot?"}
    OK["✅ can send"]
    BLOCK["🚫 yield to ready_to_read_cursor\n(save line - scripts refresh Bf)"]

    SEND --> C1
    C1 -- No  --> BLOCK
    C1 -- Yes --> C2
    C2 -- No  --> BLOCK
    C2 -- Yes --> C3
    C3 -- No  --> BLOCK
    C3 -- Yes --> C4
    C4 -- No  --> BLOCK
    C4 -- Yes --> OK
```

| Gate | Threshold |
|------|-----------|
| **ok credit** | `getStreamMaxInFlight()` — 4 for FluidNC / grblHAL |
| **Planner buffer** | ≤ 5 free blocks → blocked |
| **RX window (hard)** | `getStreamRxBufferSize()` — grblHAL: 1024 B, FluidNC: 256 B |
| **RX bytes snapshot** | `|Bf:bytes|` from last status report |

---

## Firmware Handler Comparison

| Feature | `cnc_grbl` | `cnc_fluidnc` | `cnc_grblhal` |
|---------|-----------|--------------|---------------|
| Status reporting | Poll `?` at interval | Auto-report (`$Report/Interval`) | Poll `?` / auto-report (`$481`) |
| SD card files | Pendant SD only (streamed) | Firmware SD (`$SD/Run=`) | Firmware SD (firmware run cmd) |
| MPG token machine | No | No | Yes (4 states, `0x8B`) |
| Homing queries | `$22` only | Per-axis (`$/axes/x/homing/…`) | `$22` + `$44`–`$49` |
| Error format | `error:N` (codes 1–38) | `error:N` (codes 1–152) | `error:N` (codes 1–88, 253) |
| Alarm format | `ALARM:N` (codes 1–9) | `[MSG:ERR:…]` rich | `ALARM:N` (codes 1–21) |
| RX buffer | 128 B (from `[OPT:]`) | 256 B | 1024 B |
| Startup phases | 4-phase | 6-phase | 10-phase |
| Macro execution | Stream from pendant SD | `$SD/Run=<path>` | Firmware run command |

---

## Priority and Urgent Bypass

High-priority messages bypass flow control entirely:

```mermaid
flowchart LR
    MSG["process(msg)"]
    CHK{"msg->priority == high?"}
    URG["_forwardUrgent(msg)\nBypass flow - TX front\n(realtime: !, ~, 0x18, 0x85, ?)"]
    QUEUE["Normal RX queue\nStream state machine + flow control"]

    MSG --> CHK
    CHK -- Yes --> URG
    CHK -- No  --> QUEUE
```

---

## Source File Map

```
main/modules/gcode_host/
├── esp3d_gcode_host_service.h/.cpp   ← ESP3DGCodeHostService, dual queues, state machine
├── esp3d_gcode_host_types.h          ← Enums: stream type, stream state, host state, errors
├── esp3d_x_stream.h/.cpp             ← ESP3DXStream, transport orchestrator

main/target/cnc/modules/gcode_host/
└── esp3d_gcode_host_flow.cpp         ← CNC flow gates (ok credit + planner + RX window)

main/target/none/modules/gcode_host/
└── esp3d_gcode_host_flow.cpp         ← Permissive stubs (TARGET_FW_NONE)

main/target/cnc/fluidnc/
└── esp3d_gcode_handler_service.h/.cpp ← FluidNC protocol handler

main/target/cnc/grbl/
└── esp3d_gcode_handler_service.h/.cpp ← GRBL 1.1 protocol handler

main/target/cnc/grblhal/
└── esp3d_gcode_handler_service.h/.cpp ← grblHAL protocol handler

main/target/none/
└── esp3d_gcode_handler_service.h     ← Null stub handler (inline, header-only)
```

---

## Core Component Documentation

| Document | Topic |
|----------|-------|
| `docs/architecture/gcode_host_architecture.md` | Core + domain flow split, CMake wiring, testing scope |
| `docs/architecture/gcode_host_streaming_flow.md` | State machine detail, pause/resume/abort semantics, flow gates |
| `docs/architecture/esp3d_message_priority_system.md` | Normal vs high-priority message routing |
| `docs/architecture/connection_management.md` | Transport lifecycle, connection status |
| `docs/features/feature_resource_matrix.md` | Feature compatibility, WiFi/CNC usage model |
| `docs/guides/esp32_memory_constraints.md` | Heap, fragmentation, allocation rules for stream nodes |
| `docs/guides/esp3d_log_guide.md` | `esp3d_log` macros, flow instrumentation |

## Modules complementaires

- [none_target](none_target.md)


## Documents de conception (depot)

- [gcode_host_architecture.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/gcode_host_architecture.md)
- [gcode_host_streaming_flow.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/gcode_host_streaming_flow.md)
