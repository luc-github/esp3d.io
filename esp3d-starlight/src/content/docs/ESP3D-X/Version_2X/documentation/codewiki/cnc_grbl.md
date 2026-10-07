---
title: "CNC GRBL Module"
---

# CNC GRBL Module

## Overview

The `cnc_grbl` module is the GRBL 1.1 firmware integration layer for the PiBot CNC pendant. It implements the `ESP3DGCodeHandlerService` interface specifically for the GRBL 1.1 protocol, handling bidirectional communication with a connected GRBL controller over any transport (serial UART, USB serial, Bluetooth SPP/BLE, or TCP socket).

The module is responsible for:

- **Protocol parsing** — decoding every response type produced by GRBL 1.1 (status reports, `ok` acknowledgements, error/alarm codes, settings, parser-state, probe results, firmware version)
- **Command emission** — sending G-code and GRBL realtime bytes through the unified message pipeline with correct priority and formatting
- **Connection lifecycle** — managing a 4-phase startup sequence that configures GRBL and populates the UI observables
- **Status polling** — issuing periodic `?` queries because GRBL has no firmware-side auto-reporting
- **Flow-control integration** — exposing planner-block and RX-buffer capacity to the streaming flow-control gates in `cnc_gcode_host_flow`
- **Message history** — maintaining a thread-safe ring buffer of firmware INFO/ERROR messages for display in the firmware-status screen

This module is one of three CNC target implementations. For the companion variants see [cnc_fluidnc.md](cnc_fluidnc.md) and [cnc_grblhal.md](cnc_grblhal.md). The abstract (null) interface that every target must satisfy is in `main/target/none/esp3d_gcode_handler_service.h`.

---

## Architecture

### Position in the Firmware Stack

```mermaid
flowchart TD
    subgraph UI["UI Framework (LVGL - Core 1)"]
        GrblScreens["grbl_module screens\n(status, jog, probe, files, change_tool)"]
        SharedScreens["Shared CNC screens\n(main, settings, macros, jog, status)"]
    end

    subgraph Core["Core Platform"]
        Values["ESP3DValues\n(observable store)"]
        Commands["ESP3DCommands\n(dispatch)"]
        Settings["ESP3DSettings\n(NVS)"]
    end

    subgraph Integration["CNC Firmware Integration"]
        GcodeHost["ESP3DGCodeHostService\n(gcode_host)"]
        FlowCtrl["gcodeHostFlow\n(cnc_gcode_host_flow)"]
        GrblHandler["ESP3DGCodeHandlerService\n(cnc_grbl - this module)"]
    end

    subgraph Transport["Communication Transports"]
        Serial["Serial / USB Serial"]
        BT["BT Serial / BLE"]
        Socket["TCP Socket Client"]
    end

    GrblScreens -->|reads| Values
    SharedScreens -->|reads| Values
    GrblHandler -->|writes| Values
    GrblHandler -->|"sendGcode → dispatch"| Commands
    Commands -->|routes| GcodeHost
    GcodeHost -->|flow gate| FlowCtrl
    FlowCtrl -->|queries capacity| GrblHandler
    GcodeHost -->|sends bytes| Transport
    Transport -->|RX bytes| GrblHandler
    GrblHandler -->|reads| Settings
```

### Component Relationships

```mermaid
classDiagram
    class ESP3DGCodeHandlerService {
        +begin() bool
        +handle()
        +end()
        +sendGcode(data, origin, requestId, cmdType, priority) bool
        +processCommand(data) bool
        +getType(data) ESP3DDataType
        +hasAck(command) bool
        +sendStartupCommands() bool
        +sendPingCommand() bool
        +resetStartupCommandsSent()
        +updateReportingInterval(interval) bool
        +runMacroFile(path) bool
        +getStreamPlannerBlocksFree() uint8_t
        +getStreamRxBytesFree() uint16_t
        +getStreamRxBufferSize() uint16_t
        +getStreamMaxInFlight() uint8_t
        +addMessageToHistory(type, content)
        +getMessageHistory() vector~FirmwareMessage~
        +clearMessageHistory()
        -_startup_commands_phase uint8_t
        -_startup_reset_generation atomic_uint32
        -_stream_planner_blocks uint8_t
        -_stream_rx_bytes uint16_t
        -_stream_rx_buffer_size uint16_t
        -_message_history deque~FirmwareMessage~
        -_message_history_mutex pthread_mutex_t
    }

    class FirmwareMessage {
        +type FirmwareMessageType
        +content string
    }

    class ESP3DGCodeHostService {
        +addStream(path, auth, asMacro) bool
        +process(msg)
    }

    class gcodeHostFlow {
        +gcodeHostFlowCanSendLine(len) bool
        +gcodeHostFlowOnAck()
        +gcodeHostFlowOnLineSent(len)
    }

    class ESP3DValues {
        +set_value(index, value)
        +get_value(index) const char*
    }

    ESP3DGCodeHandlerService "1" --> "0..*" FirmwareMessage : stores
    ESP3DGCodeHandlerService ..> ESP3DGCodeHostService : addStream macros
    ESP3DGCodeHandlerService ..> ESP3DValues : publishes state
    gcodeHostFlow ..> ESP3DGCodeHandlerService : queries capacity
```

---

## Source Files

| File | Role |
|---|---|
| `main/target/cnc/grbl/esp3d_gcode_handler_service.h` | Public interface, type definitions, GRBL realtime command macros |
| `main/target/cnc/grbl/esp3d_gcode_handler_service.cpp` | Full implementation of all parsing, dispatch, and lifecycle logic |

The global singleton is `esp3dGcodeHandler` (defined in the `.cpp`).

---

## GRBL Realtime Command Reference

Realtime commands are single-byte values sent without a newline and without waiting for an `ok`. They are processed immediately by GRBL's interrupt handler.

```mermaid
mindmap
  root((GRBL Realtime Commands))
    Core
      ? Status report 0x3F
      ! Feed hold 0x21
      ~ Cycle start 0x7E
      Ctrl-X Soft reset 0x18
    Extended
      0x83 Safety door toggle
      0x84 Safety door
      0x85 Jog cancel
    Feed Overrides
      0x90 100%
      0x91 +10%
      0x92 -10%
      0x93 +1%
      0x94 -1%
    Rapid Overrides
      0x95 100%
      0x96 50%
      0x97 25%
    Spindle Overrides
      0x99 100%
      0x9A +10%
      0x9B -10%
      0x9C +1%
      0x9D -1%
      0x9E Stop
    Coolant Overrides
      0xA0 Flood toggle
      0xA1 Mist toggle
```

All constants are defined as string-literal macros (`GRBL_RT_*`) in the header and are passed directly to `sendGcode()` with `cmdType = ESP3DCommandType::realtime`.

---

## Command Dispatch Flow

All commands — realtime or normal — travel through the same unified pipeline. Priority and command type are orthogonal: a realtime command can be either high-priority (e.g., emergency stop) or normal-priority (e.g., `?` status query that must respect queue order).

```mermaid
sequenceDiagram
    participant Caller as Screen / Handler
    participant sendGcode as sendGcode()
    participant Commands as ESP3DCommands::dispatch()
    participant GcodeHost as ESP3DGCodeHostService
    participant FlowCtrl as gcodeHostFlow
    participant Transport as Output Transport

    Caller->>sendGcode: data, cmdType, priority
    sendGcode->>sendGcode: Determine needsNewline\nrealtime=false, normal=append newline if missing
    sendGcode->>sendGcode: Allocate ESP3DMessage\norigin to stream, set priority
    sendGcode->>Commands: dispatch(msg)
    Commands->>GcodeHost: process(msg)

    alt priority == high
        GcodeHost->>Transport: Forward immediately bypass flow
    else priority == normal
        GcodeHost->>FlowCtrl: gcodeHostFlowCanSendLine(len)
        FlowCtrl->>FlowCtrl: Check in-flight cap max 4\nCheck planner blocks\nCheck RX window
        GcodeHost->>Transport: Send when gates clear
    end

    Transport-->>GcodeHost: RX response
    GcodeHost->>sendGcode: async processCommand(response)
```

### Fixed Stack Buffer Safety

`sendGcode()` uses a 256-byte stack buffer (no heap allocation, no VLA) when a newline must be appended. Commands longer than 254 bytes are rejected with an error log. This satisfies the embedded memory safety rules: single bounded allocation, no `malloc`, no `std::string` in the hot path.

---

## Connection Lifecycle

### Startup Sequence (4-Phase State Machine)

On first connection (or reconnect), `sendStartupCommands()` runs a sequential 4-phase initialization. Each call advances one phase per invocation to avoid blocking the LVGL task.

```mermaid
stateDiagram-v2
    [*] --> Phase0 : "begin() called"

    Phase0 : Phase 0 - Report mask\n$10=3\nenables MPos + Bf in every status
    Phase1 : Phase 1 - Settings dump\n$$\nparses $22 homing enable
    Phase2 : Phase 2 - Parser state\n$G\nresolves unit G20/G21, WCS, M-codes
    Phase3 : Phase 3 - First status\n?\npopulates positions + firmware state
    Done : startup_sent = true\nPolling active

    Phase0 --> Phase1 : ok received
    Phase1 --> Phase2 : ok received
    Phase2 --> Phase3 : ok received
    Phase3 --> Done : status parsed

    Done --> Phase0 : "resetStartupCommandsSent()\ntransport reconnect"
```

#### Thread-Safe Reset (Generation Counter Pattern)

Any task (serial RX, BT connect, LVGL reconnect handler) may call `resetStartupCommandsSent()` at any time. The function only atomically increments a generation counter. The actual reset (`_startup_commands_sent = false`, `_startup_commands_phase = 0`) is applied by the host task at the **start** of `sendStartupCommands()`, between phase transitions, so the phase machine never observes a half-reset state.

```mermaid
sequenceDiagram
    participant AnyTask as Any Task RX or LVGL
    participant HostTask as GCode Host Task
    participant Handler as esp3dGcodeHandler

    AnyTask->>Handler: resetStartupCommandsSent()\n_startup_reset_generation++
    HostTask->>Handler: sendStartupCommands() next tick
    Handler->>Handler: gen != _startup_reset_applied\napplyStartupReset()\nphase=0, sent=false
    Handler->>Handler: Send Phase 0 $10=3
```

---

## Protocol Parsing

### Data Type Classification (`getType`)

Before dispatching a received line, the gcode host calls `getType()` to classify it. This determines whether an `ok` credit is released, whether the line routes to `processCommand()`, etc.

```mermaid
flowchart TD
    IN[Received line] --> STRIP[Strip leading whitespace]
    STRIP --> EMPTY{Empty or CRLF?}
    EMPTY -->|yes| T_EMPTY[empty_line]
    EMPTY -->|no| STATUS{Starts with angle bracket?}
    STATUS -->|yes| T_RESP[response to processStatus]
    STATUS -->|no| ACK{Anchored ok at start?}
    ACK -->|yes| T_ACK[ack - releases flow credit]
    ACK -->|no| COMMENT{Semicolon hash or paren?}
    COMMENT -->|yes| T_COMMENT[comment]
    COMMENT -->|no| GCODE{M or G or T followed by number?}
    GCODE -->|yes| T_GCODE[gcode]
    GCODE -->|no| DOLLAR{Starts with dollar sign?}
    DOLLAR -->|yes| T_ESP[esp_command]
    DOLLAR -->|no| RT{Single realtime char?}
    RT -->|yes| T_GCODE2[gcode]
    RT -->|no| ERRPFX{error colon or ALARM colon?}
    ERRPFX -->|yes| T_ERR[error]
    ERRPFX -->|no| GRBLPUSH{Grbl / MSG / GC / PRB / VER / OPT?}
    GRBLPUSH -->|yes| T_RESP2[response]
    GRBLPUSH -->|no| T_UNK[unknown]
```

> **Note on `ok` detection**: `getType()` uses an anchored check — `ptr[0]=='o' && ptr[1]=='k'` followed by a terminator check — not `strstr`. A substring match would incorrectly classify filenames or other lines containing "ok" as ACKs, corrupting the streaming flow-control credit accounting.

### Response Processing (`processCommand`)

```mermaid
flowchart TD
    CMD[processCommand data] --> OK{Starts with ok?}
    OK -->|yes| RETURN_OK[return true]

    OK -->|no| STAT{isStatus?}
    STAT -->|yes| PS[processStatus]

    STAT -->|no| BANNER{Starts with Grbl space?}
    BANNER -->|yes| CONN[Set connection_status=C\nSet server_status=C\nExtract fw_version]

    BANNER -->|no| ERR{Starts with error colon?}
    ERR -->|yes| ERRTBL[Lookup grbl_error_text N\nSet firmware_status=ERROR:N\nSet last_error_status=text\naddMessageToHistory ERR]

    ERR -->|no| ALARM{Starts with ALARM colon?}
    ALARM -->|yes| ALARMTBL[Lookup grbl_alarm_text N\nSet firmware_status=ALARM:N\naddMessageToHistory ERR]

    ALARM -->|no| SETTING{Dollar N equals value?}
    SETTING -->|yes| S22{Is dollar 22 equals homing?}
    S22 -->|yes| HOMING[Set homing_cycle_x/y/z\nhoming_single_x/y/z=0]

    SETTING -->|no| GC{Starts with bracket GC colon?}
    GC -->|yes| PARSER[Set parser_state\nExtract G20/G21 to current_unit]

    GC -->|no| MSG{Starts with bracket MSG colon?}
    MSG -->|yes| MSGSTORE[addMessageToHistory INFO\nIf Pgm End set job_status=completed]

    MSG -->|no| PRB{Starts with bracket PRB colon?}
    PRB -->|yes| PROBE[Set probe_status]

    PRB -->|no| VER{Starts with bracket VER colon?}
    VER -->|yes| FWVER[Set fw_version\nSet target_fw_info]

    VER -->|no| OPT{Starts with bracket OPT colon?}
    OPT -->|yes| FLOWCAP[Set planner_blocks\nSet _stream_rx_buffer_size]

    OPT -->|no| FWD[forwardToScreen - check M117]
```

### Status Report Parsing (`processStatus`)

A GRBL status report has the form:
```
<State|MPos:x,y,z|WCO:x,y,z|FS:feed,spindle|Ov:fo,ro,so|Bf:blocks,bytes|Pn:pins|A:acc>
```
WCO is only included periodically by GRBL; WPos is inferred when absent using stored WCO values.

```mermaid
flowchart TD
    SR[Status report string] --> STATE[Extract state\nbetween angle brackets and first pipe]
    STATE --> SET_FW[Set firmware_status\nSet server_status=C\nSet connection_status=C if serial transport]

    SR --> MPOS{Pipe MPos colon present?}
    MPOS -->|yes| PM[Parse MPos coords into mpos_data]
    MPOS -->|no| SKIP_MP[mpos_data.present = false]

    SR --> WPOS{Pipe WPos colon present?}
    WPOS -->|yes| PW[Parse WPos coords into wpos_data]

    SR --> WCO{Pipe WCO colon in message?}
    WCO -->|yes| PWC[Parse WCO into wco_data]
    WCO -->|no| LOAD[Load stored WCO from ESP3DValues]

    PM & PW & PWC & LOAD --> DERIVE["Derive missing positions\nWPos = MPos - WCO\nMPos = WPos + WCO"]

    DERIVE --> DISPATCH_POS[Dispatch MPos to position_mx/my/mz/ma/mb/mc\nDispatch WPos to position_wx/wy/wz/wa/wb/wc\nDispatch WCO to wco_x/y/z/a/b/c if present in message]

    SR --> FS{Pipe FS colon present?}
    FS -->|yes| FEEDSPIN[Set feed_rate and spindle_speed]
    FS -->|no| FSEP{Pipe F colon and Pipe S colon separately?}
    FSEP -->|yes| FEEDSPIN2[Set separately]

    SR --> OV{Pipe Ov colon present?}
    OV -->|yes| OVS[Set feed_override\nrapid_override\nspindle_override]

    SR --> BF{Pipe Bf colon present?}
    BF -->|yes| BFPARSE[Set buffer_blocks and buffer_bytes\nUpdate _stream_planner_blocks\nUpdate _stream_rx_bytes for flow control]

    SR --> PN{Pipe Pn colon present?}
    PN -->|yes| PINS[Set pin_states]

    SR --> AC{Pipe A colon present?}
    AC -->|yes| ACC[Set accessory_states]

    SR --> LN{Pipe Ln colon present?}
    LN -->|yes| LINE[Set job_current_line]

    SR --> AX[Set axis_count from max detected axes]
```

---

## Streaming Flow Control

GRBL has no firmware-side handshake beyond `ok`. The pendant implements a 3-gate flow-control model via `cnc_gcode_host_flow` to avoid overrunning the controller's RX ring buffer and planner queue.

```mermaid
flowchart LR
    SEND[Attempt to send line\nlength N bytes]

    SEND --> INFLIGHT{"Pending oks\n>= max_in_flight 4?"}
    INFLIGHT -->|yes| BLOCK1[Block - in-flight cap]

    INFLIGHT -->|no| PLANNER{"Planner blocks free\n<= threshold 1?"}
    PLANNER -->|yes| BLOCK2[Block - planner full]

    PLANNER -->|no| RXWINDOW{"inflight_bytes + N+1\n> rx_buffer_size 128?"}
    RXWINDOW -->|yes| BLOCK3[Block - RX hard cap]

    RXWINDOW -->|no| RXFREE{"N+1 > rx_bytes_free\nfrom Bf field?"}
    RXFREE -->|yes| BLOCK4[Block - RX bytes]

    RXFREE -->|no| SEND_OK[Send line\ngcodeHostFlowOnLineSent]

    ACK[Receive ok] --> ONACK[gcodeHostFlowOnAck\npending_ok--\ninflight_bytes -= line_len]
```

### Capacity Values Supplied by This Module

| Method | Default | Source | Updated |
|---|---|---|---|
| `getStreamMaxInFlight()` | 4 | Hardcoded | Never |
| `getStreamPlannerBlocksFree()` | 15 | `\|Bf:blocks,…\|` | Every status report |
| `getStreamRxBytesFree()` | 0 | `\|Bf:…,bytes\|` | Every status report |
| `getStreamRxBufferSize()` | 128 | `[OPT:flags,blocks,rx]` | Once at startup via `$I` |

The `[OPT:]` response from `$I` (sent via `getInitCommand()`) refines the RX buffer size from the board's actual compile-time value. The flow-control gates use this as a hard ceiling regardless of what `|Bf:|` reports.

---

## Status Polling

GRBL does not auto-report; the pendant must poll. After startup completes, `handle()` sends a `?` command at the configured interval.

```mermaid
sequenceDiagram
    participant Tick as handle() every host loop tick
    participant Handler as esp3dGcodeHandler
    participant HAL as esp3d_hal::millis()
    participant Send as sendGcode realtime normal priority

    Tick->>Handler: handle()
    Handler->>Handler: sendStartupCommands() if not done
    Handler->>HAL: millis()
    HAL-->>Handler: now
    Handler->>Handler: now - last_ping >= polling_interval?
    alt interval elapsed
        Handler->>Send: GRBL_RT_STATUS_REPORT
        Send-->>Handler: dispatched
        Handler->>Handler: last_ping = now
    end
```

The polling interval is stored in NVS (`esp3d_polling_interval`) and updated at runtime via `updateReportingInterval()`. Realtime `?` commands use **normal** priority so they respect the outgoing queue order and do not jump ahead of user G-code.

---

## Error and Alarm Code Tables

GRBL 1.1 reports numeric codes only (`error:N`, `ALARM:N`). Human-readable text lives entirely on the pendant side.

### Error Codes (`grbl_error_text`)

| Code | Text |
|---|---|
| 1 | Expected command letter |
| 2 | Bad number format |
| 3 | Invalid statement |
| 4 | Value < 0 |
| 5 | Setting disabled |
| 6 | Value < 3 usec |
| 7 | EEPROM read fail. Using defaults |
| 8 | Not idle |
| 9 | G-code lock |
| 10 | Homing not enabled |
| 11 | Line overflow |
| 12 | Step rate > 30kHz |
| 13 | Check Door |
| 14 | Line length exceeded |
| 15 | Travel exceeded |
| 16 | Invalid jog command |
| 17 | Setting disabled (laser requires PWM) |
| 20 | Unsupported command |
| 21 | Modal group violation |
| 22 | Undefined feed rate |
| 23 | Command value not integer |
| 24 | Axis command conflict |
| 25 | Word repeated |
| 26 | No axis words |
| 27 | Invalid line number |
| 28 | Value word missing |
| 29 | Unsupported coordinate system |
| 30 | G53 invalid motion mode |
| 31 | Axis words not allowed |
| 32 | G2/G3 arcs need axis words |
| 33 | Invalid motion target |
| 34 | Arc radius error |
| 35 | G2/G3 arcs need offset word |
| 36 | Unused value words |
| 37 | G43.1 dynamic tool length offset axis error |
| 38 | Tool number > max |

### Alarm Codes (`grbl_alarm_text`)

| Code | Text |
|---|---|
| 1 | Hard limit triggered |
| 2 | Motion target exceeds travel |
| 3 | Reset while in motion |
| 4 | Probe fail (initial state) |
| 5 | Probe fail (no contact) |
| 6 | Homing fail (reset) |
| 7 | Homing fail (door opened) |
| 8 | Homing fail (pull-off) |
| 9 | Homing fail (no limit switch) |

Malformed responses (no numeric code after `error:` or `ALARM:`) are stored as raw text rather than silently mapped to code 0.

---

## Message History

The module keeps a bounded ring buffer of firmware messages (`[MSG:…]`, `error:N`, `ALARM:N`) for the firmware-status screen.

```mermaid
flowchart LR
    MSG["[MSG:text]"] -->|INFO| ADD
    ERR["error:N"] -->|ERR| ADD
    ALARM["ALARM:N"] -->|ERR| ADD

    ADD["addMessageToHistory\nLock _message_history_mutex\nDeque push_back\nPop front if size > 30\nUnlock"]

    ADD -->|outside lock| NOTIFY["esp3dXValues.set_value\nmessage_history content\nNotifies LVGL screen"]

    SCREEN["FirmwareStatusScreen\nLVGL Core 1"] -->|"getMessageHistory()\nsnapshot copy under lock"| ADD
```

- **Capacity**: 30 messages (oldest evicted when full)
- **Thread safety**: `pthread_mutex_t` protects the deque. `set_value()` is called **outside** the mutex because it acquires the `ESP3DValues` mutex internally — holding both simultaneously would risk deadlock.
- **Consumer API**: `getMessageHistory()` returns a `std::vector` snapshot (copied under lock) so callers never iterate a live deque.

---

## M-Code and Parser State Utilities

The module provides static helpers used by the `grbl_module` UI screens:

```mermaid
classDiagram
    class StaticUtilities {
        +parseMCodes(gc_state) uint8_t
        +is_mcode_set(mcodes, mask) bool
        +extractWCS(parser_state) const char*
        +extractValue(parser_state, prefix) const char*
        +isRealTimeCommand(cmd) bool
    }

    class MCodeMask {
        <<enumeration>>
        M3 = 0x01 Spindle CW
        M4 = 0x02 Spindle CCW
        M5 = 0x04 Spindle OFF
        M7 = 0x08 Mist coolant
        M8 = 0x10 Flood coolant
        M9 = 0x20 Coolant OFF
    }
```

| Helper | Purpose |
|---|---|
| `parseMCodes(gc_state)` | Returns a bitmask of active M-codes from the `[GC:]` parser state string |
| `is_mcode_set(mcodes, mask)` | Tests a single M-code bit |
| `extractWCS(parser_state)` | Extracts the active work coordinate system (G54–G59, G28, G30, G92) |
| `extractValue(parser_state, prefix)` | Extracts a numeric value by prefix char (e.g. `'F'`, `'S'`, `'T'`) |
| `isRealTimeCommand(cmd)` | Returns true for single-byte realtime bytes (0x3F, 0x21, 0x7E, 0x18, 0x83–0x85, 0x90–0x9E, 0xA0–0xA1) |

---

## Macro Execution

GRBL has no firmware SD card. Macros are files stored on the **pendant SD** and streamed by the gcode host.

```mermaid
sequenceDiagram
    participant Screen as macrosScreen / UI
    participant Handler as esp3dGcodeHandler
    participant GcodeHost as gcodeHostService

    Screen->>Handler: runMacroFile('/macros/mymacro.nc')
    Handler->>Handler: Prepend '/sd' to path
    Handler->>GcodeHost: addStream('/sd/macros/mymacro.nc', admin, executeAsMacro=true)
    GcodeHost-->>Screen: streaming begins at front of script queue
```

Setting `executeAsMacro = true` places the stream at the **front** of the script queue so it runs before any queued job.

---

## UI Screen Router

The `grbl_module` registers its own screen router `createScreen()` in `main/display/cnc/grbl/screens/esp3d_screen_type.cpp`. All screen creation for the GRBL variant passes through this function. Screens are shared with the other CNC variants where possible (see [screens_architecture.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md)).

```mermaid
flowchart TD
    CS[createScreen type] --> MAIN[main → mainScreen]
    CS --> STATUS[status → statusScreen]
    CS --> JOG[jog → jogScreen]
    CS --> PROBE[probe → probeScreen GRBL-specific]
    CS --> FILES[files → filesScreen pendant SD with file_scan_task]
    CS --> TOOL[change_tool → changeToolScreen GRBL-specific]
    CS --> MACROS[macros → macrosScreen]
    CS --> SETTINGS[settings → settingsScreen]
    CS --> SETTINGS_LIST[settings_list → settingsListScreen]
    CS --> INFO[information → informationScreen]
    CS --> SPLASH[splash → splashScreen]
    CS --> LANG[languages → languagesScreen]
    CS --> BAUD[baudrate → baudrateScreen]
    CS --> CONN[connection_status → connectionStatusScreen]
    CS --> POLL[polling → pollingScreen]
    CS --> SCAN[scan_bt / wifi_scan / server_scan conditional on build flags]
```

### GRBL-Specific Screens

| Screen | File | Key difference from siblings |
|---|---|---|
| `filesScreen` | `grbl/screens/files_screen.cpp` | Scans **pendant SD** using `file_scan_task` + `dirent`; no firmware file listing |
| `probeScreen` | `grbl/screens/probe_screen.cpp` | Reads `probe_status` value set by `[PRB:]` parser |
| `changeToolScreen` | `grbl/screens/change_tool_screen.cpp` | Tool change via ignore or probe sequence; no firmware-side tool table |

---

## Key Differences from Sibling Targets

| Feature | cnc_grbl (this module) | [cnc_fluidnc](cnc_fluidnc.md) | [cnc_grblhal](cnc_grblhal.md) |
|---|---|---|---|
| Status reporting | Poll `?` at interval | Auto-report (no polling needed) | Poll `?` at interval |
| SD card files | Pendant SD only | Firmware SD (FluidNC web FS) | Firmware SD (grblHAL) |
| Homing | All-axes `$H` only via `$22` | Per-axis configurable | Per-axis configurable |
| Error format | `error:N` numeric | `error:N` same | `error:N` same |
| Alarm format | `ALARM:N` numeric | `[MSG:ERR …]` rich format | `ALARM:N` same |
| Parser state query | `$G` yields `[GC:…]` | `$G` yields `[GC:…]` | `$G` yields `[GC:…]` |
| RX buffer capacity | 128 B default, refined from `[OPT:]` | Larger WebSocket framing | Configurable |
| Startup init command | `$I` via `getInitCommand()` | `$I` | `$I` |
| Multi-line reports | Not used | Not used | Used for some responses |
| Macro execution | Streamed from pendant SD | Run command to firmware SD | Run command to firmware SD |

---

## Observable Values Published

This module writes to `ESP3DValues` on every status parse cycle. See [values.md](values.md) for the full observable store reference.

| ESP3DValuesIndex | Set by | Trigger |
|---|---|---|
| `firmware_status` | `processStatus`, `processCommand` | State from status report, error, alarm |
| `server_status` | `processStatus`, banner | Valid status or `Grbl ` banner |
| `connection_status` | `processStatus`, banner | Serial/USB transport confirmed |
| `position_mx/my/mz/ma/mb/mc` | `processStatus` | `\|MPos:` in status |
| `position_wx/wy/wz/wa/wb/wc` | `processStatus` | `\|WPos:` or derived |
| `wco_x/y/z/a/b/c` | `processStatus` | `\|WCO:` when present in message |
| `axis_count` | `processStatus` | Max axes detected in positions |
| `feed_rate` | `processStatus` | `\|FS:` or `\|F:` |
| `spindle_speed` | `processStatus` | `\|FS:` or `\|S:` |
| `feed_override` | `processStatus` | `\|Ov:` field 0 |
| `rapid_override` | `processStatus` | `\|Ov:` field 1 |
| `spindle_override` | `processStatus` | `\|Ov:` field 2 |
| `buffer_blocks` | `processStatus` | `\|Bf:` field 0 |
| `buffer_bytes` | `processStatus` | `\|Bf:` field 1 |
| `pin_states` | `processStatus` | `\|Pn:` |
| `accessory_states` | `processStatus` | `\|A:` |
| `job_current_line` | `processStatus` | `\|Ln:` |
| `fw_version` | `processCommand` | `[VER:]` or `Grbl ` banner |
| `target_fw_info` | `processCommand` | `[VER:]` or `Grbl ` banner |
| `planner_blocks` | `processCommand` | `[OPT:]` |
| `parser_state` | `processCommand` | `[GC:]` |
| `current_unit` | `processCommand` | G20/G21 in `[GC:]` |
| `homing_cycle_x/y/z` | `processCommand` | `$22=` setting |
| `homing_single_x/y/z` | `processCommand` | `$22=` always `"0"` for GRBL |
| `probe_status` | `processCommand` | `[PRB:]` |
| `last_error_status` | `processCommand` | `error:N` or `ALARM:N` |
| `job_status` | `processCommand` | `[MSG:Pgm End]` |
| `message_history` | `addMessageToHistory` | Any INFO/ERR message |
| `status_bar_label` | `forwardToScreen` | `M117` command |

---

## Related Documentation

- [cnc_fluidnc.md](cnc_fluidnc.md) — FluidNC firmware integration (sibling target)
- [cnc_grblhal.md](cnc_grblhal.md) — grblHAL firmware integration (sibling target)
- [gcode_host.md](gcode_host.md) — Streaming pipeline and flow-control architecture
- [cnc_gcode_host_flow.md](cnc_gcode_host_flow.md) — 3-gate flow control implementation
- [values.md](values.md) — `ESP3DValues` observable store
- [connection_management.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) — Transport lifecycle and connection status model
- [gcode_host_architecture.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/gcode_host_architecture.md) — GCode host core and CNC flow split
- [gcode_host_streaming_flow.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/gcode_host_streaming_flow.md) — Streaming state machine detail
- [screens_architecture.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md) — UI screen system overview
