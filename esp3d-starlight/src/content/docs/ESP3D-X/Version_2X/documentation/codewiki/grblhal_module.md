---
title: "grblHAL Module"
---

# grblHAL Module

## Overview

The `grblhal_module` is the dedicated UI integration layer for the **grblHAL CNC firmware**. It lives under `main/display/cnc/grblhal/` and provides all screen logic, components, and protocol handling that are specific to grblHAL — as opposed to the shared CNC infrastructure in `cnc_shared` or the firmware-agnostic screens in `common_screens`.

grblHAL is an advanced real-time CNC motion controller with features that require specialized UI handling:
- A **manual tool change protocol** based on grblHAL-specific realtime bytes (`0xA3`) and firmware states (`TOOL`)
- A **flat SD card file listing** via `$F` (recursive, full paths, no directory markers)
- A **PASSIVE connection mode** (`R` status) where the remote session has read-only access because another client holds the control token
- **Extended axis naming** configurable via `$376` (UVW renaming scheme)
- **Probe-disconnected detection** via `|Pn:O` in status reports

This module mirrors the structure of the `grbl_module` and `fluidnc_module`, each implementing firmware-specific screen variants on top of the shared `cnc_shared` infrastructure and the common UI framework.

---

## Architecture Overview

```mermaid
graph TD
    subgraph grblhal_module["grblHAL Module (main/display/cnc/grblhal/)"]
        Router["Screen Router\nesp3d_screen_type.cpp\ncreateScreen()"]
        ConnStatus["Connection Status Component\ncomponents/connection_status.h"]
        ChangeTool["Change Tool Screen\nscreens/change_tool_screen.cpp"]
        Files["Files Screen\nscreens/files_screen.cpp"]
        Probe["Probe Screen\nscreens/probe_screen.cpp"]
    end

    subgraph shared["Shared CNC (cnc_shared)"]
        MainScr["main_screen"]
        JogScr["jog_screen"]
        StatusScr["status_screen"]
        MacrosScr["macros_screen"]
        SettingsScr["settings_screen / settings_list_screen"]
        InfoScr["information_screen"]
        FirmwareStatus["FirmwareStatusComponent"]
    end

    subgraph common["Common Screens"]
        InputScr["input_screen"]
        MsgBox["message_box_screen"]
        SplashScr["splash_screen"]
    end

    subgraph platform["Core Platform"]
        Values["ESP3DValues\n(event bus)"]
        GCodeHandler["esp3d_gcode_handler_service\n(grblHAL target)"]
        UIManager["UIManager"]
    end

    Router -->|dispatches to| ChangeTool
    Router -->|dispatches to| Files
    Router -->|dispatches to| Probe
    Router -->|dispatches to| MainScr
    Router -->|dispatches to| JogScr
    Router -->|dispatches to| StatusScr
    Router -->|dispatches to| MacrosScr
    Router -->|dispatches to| SettingsScr

    ChangeTool --> ConnStatus
    ChangeTool --> FirmwareStatus
    Probe --> ConnStatus
    Probe --> FirmwareStatus

    ChangeTool -->|subscribes| Values
    Files -->|subscribes| Values
    Probe -->|subscribes| Values

    ChangeTool -->|sendGcode| GCodeHandler
    Files -->|sendGcode| GCodeHandler
    Probe -->|sendGcode| GCodeHandler

    ConnStatus -->|reads| Values
    UIManager -->|calls| Router
```

---

## Module Components

The module is organized into five distinct sub-components:

| Sub-module | File | Responsibility |
|---|---|---|
| [Screen Router](#screen-router) | `screens/esp3d_screen_type.cpp` | Central `createScreen()` dispatcher for all screen types |
| [Connection Status](#connection-status-component) | `components/connection_status.h` | Clickable connection indicator with grblHAL PASSIVE state support |
| [Change Tool Screen](#change-tool-screen) | `screens/change_tool_screen.cpp` | M6 / M61Q tool change with full grblHAL protocol state machine |
| [Files Screen](#files-screen) | `screens/files_screen.cpp` | SD card browser using grblHAL's flat `$F` listing |
| [Probe Screen](#probe-screen) | `screens/probe_screen.cpp` | Multi-step G38.2 probe sequence with offset application |

---

## Screen Navigation Flow

```mermaid
flowchart LR
    Main["main_screen"] --> Jog["jog_screen"]
    Main --> Status["status_screen"]
    Main --> Settings["settings_screen"]
    Main --> Files["files_screen ★"]
    Main --> Macros["macros_screen"]

    Settings --> SettingsList["settings_list_screen"]
    Settings --> Info["information_screen"]

    Status --> ChangeTool["change_tool_screen ★"]
    Jog --> ChangeTool

    ChangeTool -->|probe prompt| Probe["probe_screen ★"]
    Probe -->|result returned| ChangeTool

    Files -->|run file| Status
    Files -->|confirm/delete| MsgBox["message_box_screen"]
    MsgBox -->|return| Files

    ChangeTool -->|numeric input| Input["input_screen"]
    Input -->|return| ChangeTool

    Probe -->|numeric input| Input
    Input -->|return| Probe

    style ChangeTool fill:#d4edda,stroke:#28a745
    style Files fill:#d4edda,stroke:#28a745
    style Probe fill:#d4edda,stroke:#28a745
```

> ★ = grblHAL-specific screens. All other screens are shared via `cnc_shared` or `common_screens`.

---

## Screen Router

**File:** `main/display/cnc/grblhal/screens/esp3d_screen_type.cpp`  
**Detailed docs:** [grblhal_module_screen_router.md](grblhal_module_screen_router.md)

The module's single `createScreen(ESP3DScreenType)` function is the **sole entry point** for all screen transitions within the grblHAL firmware target. It is called by all timer-based transition callbacks system-wide.

**Key behaviors:**
- Dispatches to `mainScreen::create()`, `filesScreen::create()`, `probeScreen::create()`, `changeToolScreen::create()`, and all shared screens
- Conditionally compiles transport-specific screens (`scan_bt`, `wifi_scan`, `server_scan`, `output_selection`) based on build flags
- Falls back to `mainScreen::create()` on unknown screen types
- Handles the `connection_status` screen with a pre-configured return target of `ESP3DScreenType::settings`

---

## Connection Status Component

**File:** `main/display/cnc/grblhal/components/connection_status.h`  
**Detailed docs:** [grblhal_module_connection_status.md](grblhal_module_connection_status.md)

The `ConnectionStatusComponent` is a clickable overlay widget displayed on all grblHAL CNC screens. It renders a connection icon that reflects the current transport and server state, and navigates to `connection_status_screen` on click.

**grblHAL-specific connection states:**

| Status Char | Meaning |
|---|---|
| `?` | Disconnected / not connected |
| `A` | Authentication failed |
| `T` | Connecting (transport or server handshake in progress) |
| `C` | Connected — full control |
| `R` | Connected — **read-only** (grblHAL PASSIVE: token held by another client) |
| `.` | Radio off |

The `R` (PASSIVE) state is unique to grblHAL: it signals that another client currently holds the control token, making the pendant read-only. This state is absent from the grbl and fluidnc variants.

```mermaid
stateDiagram-v2
    [*] --> Disconnected : initial
    Disconnected --> Connecting : transport start
    Connecting --> Connected : server ack
    Connecting --> AuthFailed : bad credentials
    Connected --> ReadOnly : grblHAL PASSIVE\n(token held by other client)
    ReadOnly --> Connected : token released
    Connected --> Disconnected : link lost
    AuthFailed --> Disconnected : retry
```

---

## Change Tool Screen

**File:** `main/display/cnc/grblhal/screens/change_tool_screen.cpp`  
**Detailed docs:** [grblhal_module_change_tool.md](grblhal_module_change_tool.md)

The change tool screen implements grblHAL's **manual tool change protocol** (`T<n> M6`) and the instant **set-current-tool** command (`M61Q<n>`). It exposes a two-item panel (mode toggle + target tool selector) and a virtual 3-button bar that adapts dynamically to the current protocol state.

### Tool Change Modes

| Mode | Command | Description |
|---|---|---|
| **SET** (default) | `M61Q<n>` | Sets current tool number without movement (instant) |
| **CHANGE** | `T<n> M6` | Full grblHAL manual tool change: machine moves to change position, user installs tool, then resumes |

### grblHAL Tool Change Protocol State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> MOVING_TO_CHANGE : T&#60;n&#62; M6 sent\n(CHANGE mode)
    IDLE --> SUCCESS : M61Q&#60;n&#62; sent\n(SET mode)
    MOVING_TO_CHANGE --> WAITING_ACK : firmware enters\n"TOOL" state
    WAITING_ACK --> WAITING_USER : user sends 0xA3 ack
    WAITING_USER --> PROBING : user requests $TPW\n(tool setter probe)
    WAITING_USER --> COMPLETING : user sends ~ (cycle start)
    PROBING --> WAITING_USER : $TPW probe done\n(TOOL state re-entered)
    COMPLETING --> SUCCESS : firmware returns to IDLE

    MOVING_TO_CHANGE --> FAILED : timeout / ALARM
    WAITING_ACK --> FAILED : timeout
    WAITING_USER --> CANCELLED : user cancels
    PROBING --> FAILED : ALARM / timeout
    COMPLETING --> FAILED : timeout / ALARM
    SUCCESS --> IDLE : new cycle
    FAILED --> IDLE : reset
    CANCELLED --> IDLE : reset
```

### Virtual Button Layout by State

| State | Button 0 (Left) | Button 1 (Center) | Button 2 (Right) |
|---|---|---|---|
| IDLE / SUCCESS / FAILED | OK (encoder nav) | START (if valid) | BACK |
| MOVING_TO_CHANGE | — | CANCEL | — |
| WAITING_ACK | — | ACK (0xA3) | — |
| WAITING_USER | $TPW (probe) | FINISH (~) | — |
| PROBING | — | CANCEL | — |
| COMPLETING | — | CANCEL | — |

After a successful `M61Q`, a **probe prompt** appears asking the user whether to run the tool-setter probe (`$TPW`) or skip it. Navigating to the probe screen sets `probeScreen::setReturnScreen(change_tool)` and the result is consumed on re-entry via `handleProbeScreenReturn()`.

---

## Files Screen

**File:** `main/display/cnc/grblhal/screens/files_screen.cpp`  
**Detailed docs:** [grblhal_module_files.md](grblhal_module_files.md)

The files screen provides an SD card browser tailored to grblHAL's flat file listing protocol. Unlike per-directory querying (used by other firmwares), grblHAL returns **all files recursively in a single `$F` response** with full absolute paths.

### grblHAL SD Card Protocol

| Command | Purpose |
|---|---|
| `$F` | List all CNC files recursively (flat, no `[DIR:]` entries) |
| `$F=<path>` | Run / execute a file |
| `$FD=<path>` | Delete a file |

**No rename command** exists in grblHAL. The 4-position hardware switch maps: Run / Macro / Delete / Run (position 3 repeats Run instead of Rename).

### File Listing Architecture

```mermaid
flowchart TD
    A["$F command sent"] --> B["grblHAL streams flat list\n[FILE:/path/name.gcode|SIZE:n]"]
    B --> C["onFileEntryUpdate() callback\nper line received"]
    C --> D["process_listing_line()\nall_files_ master list populated"]
    D --> E{"is_end_marker?\n[FILE_LIST_END]"}
    E -->|No| C
    E -->|Yes| F["finalize_listing()\nbuild_current_view()"]
    F --> G["display_file_list()\nrender ListMenuScreen"]

    H["User navigates directory"] --> I["get_parent_path() / append_to_path()"]
    I --> F

    J["Watchdog timer (1s interval)"] -->|"10s stall"| K["Timeout: show error"]
```

**Key design decisions:**
- The flat `all_files_` master list is built once per scan and persists across screen transitions (survives message box dialogs)
- Directory navigation is **purely local** — no per-directory rescan needed
- The `[FILE_LIST_END]` sentinel is synthesized by the grblHAL gcode handler on the terminating `ok` response
- Memory guard: collection stops if free heap drops below 30 KB

### File Action Modes (Switch Control)

| Switch Position | Action | Icon |
|---|---|---|
| 0 | Run file (`$F=<path>`) | Drive |
| 1 | Toggle macro tag (pendant-side) | Robot |
| 2 | Delete file (`$FD=<path>`) | Trash |
| 3 | Run file again (no rename in grblHAL) | Drive |

---

## Probe Screen

**File:** `main/display/cnc/grblhal/screens/probe_screen.cpp`  
**Detailed docs:** [grblhal_module_probe.md](grblhal_module_probe.md)

The probe screen executes a **4-step CNC probing sequence** using standard G-code commands supported by grblHAL. It supports up to 6 axes (X/Y/Z/A/B/C) with axis naming configurable via grblHAL's `$376` parameter (UVW renaming).

### Probe Sequence State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE : screen opens
    IDLE --> PRE_CHECK : user presses START
    PRE_CHECK --> SEEK : firmware confirms IDLE\n(? query response)
    SEEK --> RETRACT : [PRB:...:1] contact detected
    SEEK --> FAILED : [PRB:...:0] no contact / timeout
    RETRACT --> FEED : firmware returns to IDLE
    FEED --> APPLY_OFFSET : [PRB:...:1] precise contact
    FEED --> FAILED : [PRB:...:0] no contact / timeout
    APPLY_OFFSET --> SUCCESS : firmware returns to IDLE

    SEEK --> CANCELLED : user presses STOP
    RETRACT --> CANCELLED : user presses STOP
    FEED --> CANCELLED : user presses STOP
    APPLY_OFFSET --> CANCELLED : user presses STOP

    PRE_CHECK --> FAILED : ALARM / error state
    SEEK --> FAILED : ALARM
    RETRACT --> FAILED : ALARM
    FEED --> FAILED : ALARM
    APPLY_OFFSET --> FAILED : ALARM

    SUCCESS --> IDLE : new probe
    FAILED --> IDLE : retry
    CANCELLED --> IDLE : retry
```

### G-code Commands per Step

| Step | G-code Sent | Description |
|---|---|---|
| PRE_CHECK | `?` (realtime byte) | Query machine state — must be IDLE to proceed |
| SEEK | `G91 G38.2 <axis><max_travel> F<feedrate>` | Fast first-pass probe |
| RETRACT | `G91 G1 <axis><retract> F200` | Back off from contact point |
| FEED | `G91 G38.2 <axis><max_travel> F<feedrate/2>` | Slow precise second-pass probe |
| APPLY_OFFSET | `G10 L20 P0 <axis><offset>` | Set work coordinate origin |

### Probe Parameters (per axis)

Each axis maintains its own configurable probe parameters, editable via the PanelComponent:

| Parameter | Label | Default (Z) | Description |
|---|---|---|---|
| Offset | `O:` | 10.0 mm | Tool length / surface offset applied after contact |
| Max Travel | `T:` | −50.0 mm | Maximum probe travel (negative = downward for Z) |
| Retract | `R:` | 3.0 mm | Distance to back off before the second pass |
| Feed Rate | `F:` | 200 mm/min | First-pass probe speed (second pass = F/2) |

### Multi-Axis and Switch Behavior

```mermaid
graph LR
    Switch["Hardware Switch\n(4 positions)"] -->|pos 0| X["Axis X"]
    Switch -->|pos 1| Y["Axis Y"]
    Switch -->|pos 2| Z["Axis Z"]
    Switch -->|"pos 3 (≤3 axes)"| Lock["User Lock (toggle)"]
    Switch -->|"pos 3 (≥4 axes)"| ExtAxis["Extended Axis\nA / B / C"]
    ExtAxis -->|btnAxe tap| NextAxis["Cycles A → B → C → A"]
```

The probe screen is also callable from the [Change Tool Screen](#change-tool-screen) as part of the `M61Q` post-change probe workflow. Results are communicated back via `probeScreen::getResult()` / `setReturnScreen()`.

---

## Key Dependencies

```mermaid
graph LR
    grblhal_module --> cnc_shared["cnc_shared\n(main, jog, status, macros,\nsettings screens)"]
    grblhal_module --> common_screens["common_screens\n(input_screen, message_box,\nconnection_status_screen)"]
    grblhal_module --> ui_core["ui_core\n(UIManager, ThemeStyles,\nResources)"]
    grblhal_module --> values["ESP3DValues\n(observable event bus)"]
    grblhal_module --> gcode_target["CNC Firmware Integration\n(cnc_grblhal target:\nesp3d_gcode_handler_service)"]
    grblhal_module --> ui_components["ui_components\n(PanelComponent,\nGenericScreen, ListMenuScreen,\nVirtualButtonsComponent)"]
```

| Dependency | Purpose |
|---|---|
| `cnc_shared` | Shared CNC screens (main, jog, status, macros, settings) |
| `common_screens` | Modal dialogs (input, message box), network scan screens |
| `ui_core` | UIManager, theme tokens, resource loading |
| `ui_components` | PanelComponent, GenericScreen, ListMenuScreen |
| `CNC_Firmware_Integration / cnc_grblhal` | grblHAL gcode handler, PositionData, FirmwareMessage |
| `ESP3DValues` | Observable system state: firmware_status, parser_state, positions, probe_status, pin_states |
| `translations` | Localized strings for all UI text |

---

## Comparison with grbl and FluidNC Modules

| Feature | grblHAL | grbl | FluidNC |
|---|---|---|---|
| Tool change protocol | `T<n> M6` + `0xA3` ack + `$TPW` | — | `M6T<n>` (single command) |
| Set current tool | `M61Q<n>` | — | — |
| File listing | `$F` flat (all files, full paths) | `$F` per-directory | Per-directory via firmware entries |
| File delete | `$FD=<path>` | `$FD=<path>` | Firmware command |
| File rename | ❌ Not supported | ❌ Not supported | ✅ Supported |
| SD end marker | `[FILE_LIST_END]` (synthesized) | Firmware-driven | Firmware-driven |
| PASSIVE / read-only mode | ✅ `R` status | ❌ | ❌ |
| Probe disconnected detection | ✅ `\|Pn:O` flag | ❌ | ❌ |
| Axis UVW renaming (`$376`) | ✅ | ❌ | ❌ |

---

## Sub-module Documentation

- [grblhal_module_screen_router.md](grblhal_module_screen_router.md) — Centralized screen creation dispatcher
- [grblhal_module_connection_status.md](grblhal_module_connection_status.md) — Connection state component with PASSIVE mode
- [grblhal_module_change_tool.md](grblhal_module_change_tool.md) — M6/M61Q tool change protocol and state machine
- [grblhal_module_files.md](grblhal_module_files.md) — SD card file browser with flat `$F` listing
- [grblhal_module_probe.md](grblhal_module_probe.md) — G38.2 multi-step probe sequence


## Documents de conception (depot)

- [grblhal](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ux_flows/grblhal/)


## Documents de conception (depot)

- [grblHAL_pendant_connection_flow](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ux_flows/grblhal/grblHAL_pendant_connection_flow.md)
