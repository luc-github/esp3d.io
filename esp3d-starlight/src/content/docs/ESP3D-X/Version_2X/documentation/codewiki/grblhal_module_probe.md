---
title: "grblhal_module_probe"
---

# grblhal_module_probe

## Introduction

The `grblhal_module_probe` module implements the **tool-length / workpiece probing screen** for the **grblHAL** firmware target. It provides a touch/encoder-driven UI that guides the operator through a two-pass probing cycle (fast seek → retract → slow precise feed → apply offset), monitors the machine state via grblHAL real-time status reports, and communicates the probe result back to the calling screen.

The module lives at:
```
main/display/cnc/grblhal/screens/probe_screen.cpp
namespace probeScreen
```

It is one of three parallel probe-screen implementations — the other two target [grbl_module_probe](grbl_module_probe.md) and [fluidnc_module_probe](fluidnc_module_probe.md) — each adapted to its firmware's status-reporting protocol while sharing the same visual structure.

---

## Architecture Overview

```mermaid
graph TD
    subgraph grblhal_module["grblhal_module"]
        ROUTER["Screen Router<br/>(esp3d_screen_type.cpp)"]
        CONN["ConnectionStatusComponent<br/>(grblhal variant)"]
        FW["FirmwareStatusComponent<br/>(shared CNC)"]
        PROBE["probeScreen namespace<br/>(probe_screen.cpp)"]
        CHANGE["changeTool Screen"]
        FILES["files Screen"]
    end

    subgraph ui_framework["UI Framework"]
        GENERIC["GenericScreen"]
        PANEL["PanelComponent<br/>(4 probe params)"]
        VBTN["VirtualButtonsComponent<br/>(OK · Play/Stop · Back)"]
        INPUT_SCR["inputScreen (numeric)"]
    end

    subgraph core_platform["Core Platform"]
        VALUES["ESP3DValues<br/>(observable store)"]
        GCODE_HANDLER["esp3dGcodeHandler<br/>(grblHAL)"]
        UIMGR["UIManager"]
        TRANS["TranslationService"]
    end

    ROUTER -->|"createScreen(probe)"| PROBE
    PROBE --> GENERIC
    PROBE --> PANEL
    PROBE --> CONN
    PROBE --> FW
    GENERIC --> VBTN
    PROBE -->|"param edit"| INPUT_SCR
    PROBE -->|"subscribe/get"| VALUES
    PROBE -->|"sendGcode"| GCODE_HANDLER
    PROBE -->|"lock state"| UIMGR
    PROBE -->|"translate labels"| TRANS
```

See [grblhal_module](grblhal_module.md) for the broader screen set.  
See [cnc_grblhal](cnc_grblhal.md) for the GCode handler that dispatches commands.  
See [gcode_host](gcode_host.md) for streaming and flow-control mechanics.

---

## Component Inventory

### Data Structures

#### `ProbeAxisValues`
Per-axis probe parameter set. One instance is kept per axis index in a `std::map<uint32_t, ProbeAxisValues>` that **persists across axis switches** — user edits on one axis are not lost when the operator selects another axis.

| Field | Type | Default (Z) | Description |
|---|---|---|---|
| `offset` | `float` | `10.0` mm | Work-coordinate offset applied after contact via `G10 L20` |
| `max_travel` | `float` | `−50.0` mm | Maximum probe travel; negative = downward (Z), positive = upward |
| `retract` | `float` | `3.0` mm | Retract distance between seek and feed passes (always positive) |
| `feed_rate` | `float` | `200.0` mm/min | Fast-seek feed rate; feed pass runs at `feed_rate / 2` |

Default values per axis family:

| Axis | offset | max_travel | retract | feed_rate |
|---|---|---|---|---|
| X, Y | 0 mm | +30 mm | 5 mm | 300 mm/min |
| Z | 10 mm | −50 mm | 3 mm | 200 mm/min |
| A, B, C | 0 mm | +360 mm | 10 mm | 100 mm/min |

#### `ProbeInputContext`
Transient context passed to the [inputScreen](common_screens.md) when the operator opens a numeric editor for one of the four probe parameters.

#### `ProbeResult` (public API enum)
Terminal result returned to the caller after the screen exits:
- `NONE` — no probe has run yet
- `SUCCESS` — contact detected and offset applied
- `FAILED` — probe did not trigger or a grblHAL error occurred
- `CANCELLED` — operator pressed Stop

#### `ProbeState` (internal state machine enum)
See [Probe State Machine](#probe-state-machine) below.

---

### UI Components

```mermaid
graph TD
    SCR["GenericScreen (ESP3DScreenType::probe)"]
    SCR --> AXE["Axis Chip (btnAxe)<br/>tap-to-cycle axis"]
    SCR --> POS["Position Area<br/>WPos (large) / MPos (small)"]
    SCR --> PARAMS["4x Param Buttons (2x2 grid)<br/>O: Offset · T: MaxTravel<br/>R: Retract · F: FeedRate"]
    SCR --> STATBAR["Probe Status Bar<br/>text label · spinner · ok/close icon"]
    SCR --> PINS_LIN["Pin Indicators linear (XYZ)"]
    SCR --> PINS_ROT["Pin Indicators rotary (ABC · P · O)"]
    SCR --> VBTN["VirtualButtons<br/>btn0: OK/EncoderMode<br/>btn1: Play-Stop<br/>btn2: Back"]
    SCR --> FW_COMP["FirmwareStatusComponent<br/>(deferred, top-left)"]
    SCR --> CONN_COMP["ConnectionStatusComponent<br/>(deferred, top-right)"]
    PARAMS -->|"encoder nav + activate"| PANEL["PanelComponent<br/>(4 items, encoder focus ring)"]
    PARAMS -->|"edit value"| INPUT["inputScreen (numeric)"]
```

#### Probe Parameter Buttons (2 × 2 Grid)

| ID | Short Label | Full Label | Unit | Constraints |
|---|---|---|---|---|
| 0 | `O:` | Offset | mm / in | `-9999.9 … +9999.9`, 3 decimals |
| 1 | `T:` | Max Travel | mm / in | `-9999.9 … +9999.9`, 3 decimals |
| 2 | `R:` | Retract Distance | mm / in | `0 … +9999.9` (positive only), 3 decimals |
| 3 | `F:` | Feed Rate | mm/min | `1 … +9999`, 0 decimals (integer) |

The focused item is highlighted with a thicker `border_focus`-colored border; all others show `ESP3D_MENU_BORDER_COLOR` at standard width. The [PanelComponent](ui_components.md) drives encoder-based navigation between these four items.

#### Virtual Buttons

| Index | Idle icon | Active (probing) icon | Function |
|---|---|---|---|
| 0 | `ok_b` | `ok_b` | Toggle encoder mode (navigation vs editing) |
| 1 | `play_b` | `stop_b` | Start probe / stop probe. Disabled while probe is disconnected (`Pn:O`). |
| 2 | `back_b` | `back_b` | Navigate back (with transition cleanup) |

#### Pin Indicators
Eight square indicator labels are maintained — one per machine pin character:

| Index | Pin char | Container | Shown when |
|---|---|---|---|
| 0–2 | X, Y, Z | `pins_container_linear` | `axis_count` covers it AND pin is active |
| 3–5 | A / U, B / V, C / W | `pins_container_rotary` | `axis_count` covers it AND pin is active |
| 6 | P | `pins_container_rotary` | Probe contact triggered (`Pn:P`) |
| 7 | O | `pins_container_rotary` | Probe **disconnected** (`Pn:O`) |

`P` and `O` are mutually exclusive in grblHAL reports and share the same flex slot, so no extra horizontal space is consumed.

---

## Axis Management

### Axis Count Modes

The screen adapts to grblHAL's configured axis count (received via `ESP3DValuesIndex::axis_count`):

```mermaid
graph LR
    subgraph three["3 axes or fewer"]
        A0["switch pos 0-2 - X / Y / Z"]
        A3["switch pos 3 - LOCK"]
    end
    subgraph four["4 axes"]
        B0["switch pos 0-3 - X / Y / Z / A"]
    end
    subgraph five["5 or more axes"]
        C0["switch pos 0-2 - X / Y / Z"]
        C3["switch pos 3 - extended slot<br/>(tap axis chip to cycle A-B-C)"]
    end
```

The lock position (switch slot 3 on machines with 3 axes or fewer) sets `UIManager::userSetLockState(true)`, graying out all interactive elements and disabling the Play button.

### UVW Renaming (grblHAL `$376`)
`getAxisLetter(uint32_t axis_index)` reads the `axis_names` observable (`ESP3DValuesIndex::axis_names`). When grblHAL reports `"XYZUVW"`, axes 3/4/5 are named U/V/W instead of A/B/C. All GCode commands (`G38.2`, `G1`, `G10 L20`) and pin indicator labels automatically honor this naming.

---

## Probe State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE

    IDLE --> PRE_CHECK : Play pressed (probe connected)
    IDLE --> FAILED : Play pressed (probe disconnected Pn:O)

    PRE_CHECK --> SEEK : firmware_status IDLE - machine ready
    PRE_CHECK --> FAILED : firmware_status ALARM or ERROR

    SEEK --> RETRACT : PRB contact 1 - contact detected
    SEEK --> FAILED : PRB contact 0 - no contact or ALARM/ERROR

    RETRACT --> FEED : firmware_status IDLE - retract complete
    RETRACT --> FAILED : firmware_status ALARM or ERROR

    FEED --> APPLY_OFFSET : PRB contact 1 - contact detected
    FEED --> FAILED : PRB contact 0 - no contact or ALARM/ERROR

    APPLY_OFFSET --> SUCCESS : firmware_status IDLE - G10 complete
    APPLY_OFFSET --> FAILED : firmware_status ALARM or ERROR

    SEEK --> CANCELLED : Stop pressed
    RETRACT --> CANCELLED : Stop pressed
    FEED --> CANCELLED : Stop pressed
    APPLY_OFFSET --> CANCELLED : Stop pressed

    PRE_CHECK --> FAILED : timeout
    SEEK --> FAILED : timeout
    RETRACT --> FAILED : timeout
    FEED --> FAILED : timeout
    APPLY_OFFSET --> FAILED : timeout

    SUCCESS --> IDLE : Play pressed again
    FAILED --> IDLE : Play pressed again
    CANCELLED --> IDLE : Play pressed again

    SUCCESS --> [*] : Back pressed
    FAILED --> [*] : Back pressed
    CANCELLED --> [*] : Back pressed
    IDLE --> [*] : Back pressed
```

Each terminal state (`SUCCESS`, `FAILED`, `CANCELLED`) sets `ProbeResult` for inter-screen communication and updates the status-bar icon (`ok_b` green / `close_b` red).

---

## GCode Probe Sequence

```mermaid
sequenceDiagram
    participant UI as probeScreen
    participant GH as esp3dGcodeHandler
    participant FW as grblHAL Firmware
    participant VAL as ESP3DValues

    Note over UI: Play pressed - startProbeSequence()
    UI->>GH: '?' realtime status, high priority
    FW-->>VAL: firmware_status = IDLE
    VAL-->>UI: on_firmware_status_update - PRE_CHECK to SEEK
    UI->>GH: 'G91 G38.2 Z-50.0 F200' - SEEK fast pass

    FW-->>VAL: firmware_status = RUN
    FW-->>VAL: PRB 0.000,0.000,-12.345:1
    VAL-->>UI: on_probe_status_update - contact true - SEEK to RETRACT
    UI->>GH: 'G91 G1 Z3.0 F200' - RETRACT

    FW-->>VAL: firmware_status = IDLE
    VAL-->>UI: on_firmware_status_update - RETRACT to FEED
    UI->>GH: 'G91 G38.2 Z-50.0 F100' - FEED rate divided by 2

    FW-->>VAL: PRB 0.000,0.000,-12.347:1
    VAL-->>UI: on_probe_status_update - contact true - FEED to APPLY_OFFSET
    UI->>GH: 'G10 L20 P0 Z10.0' - APPLY_OFFSET

    FW-->>VAL: firmware_status = IDLE
    VAL-->>UI: on_firmware_status_update - SUCCESS
    Note over UI: ok_b icon shown, ProbeResult SUCCESS stored
```

### GCode Commands Per Step

| Step | GCode template | Notes |
|---|---|---|
| PRE_CHECK | `?` (realtime) | Sent at high priority; verifies machine is Idle before probing |
| SEEK | `G91 G38.2 {axis}{max_travel} F{feed_rate}` | Fast probe pass; incremental mode |
| RETRACT | `G91 G1 {axis}{±retract} F200` | Direction is opposite to `max_travel` sign |
| FEED | `G91 G38.2 {axis}{max_travel} F{feed_rate/2}` | Slow precise pass at half the seek speed |
| APPLY_OFFSET | `G10 L20 P0 {axis}{offset}` | Sets work-coordinate offset at probe contact point |
| STOP | `!` (feed hold, realtime) | High priority; sent on user cancel, axis change, or timeout |

---

## Safety and Timeout

```mermaid
graph LR
    START["startProbeSequence()"]
    CALC["Calculate timeout:\n(|max_travel| / feed_rate) x 60 x 1.5 + 5 s\nclamped to 10 s min, 120 s max"]
    TIMER["One-shot lv_timer\n- probeTimeoutCallback()"]
    TIMEOUT["Send Feed Hold (!)\nsetProbeUIState(FAILED, timeout)"]
    CANCEL["stopProbeSequence()\nTimer deleted"]

    START --> CALC --> TIMER
    TIMER -->|"fires"| TIMEOUT
    CANCEL -->|"user stop / axis change / screen destroy"| TIMER
```

Additionally, the screen **refuses to start** a probe sequence when `probe_disconnected_` is `true` (set by `Pn:O` in the pin-states string). The Play button is also proactively disabled in this state.

---

## Data Flow and Subscriptions

```mermaid
graph TD
    subgraph Store["ESP3DValues Observable Store"]
        FS["firmware_status"]
        PS["probe_status"]
        ES["last_error_status"]
        AC["axis_count"]
        PI["pin_states"]
        SS["server_status"]
        POS_W["position_w x y z a b c"]
        POS_M["position_m x y z a b c"]
        AN["axis_names"]
    end

    subgraph Subscriptions["probeScreen subscriptions"]
        FSU["on_firmware_status_update\n- state machine transitions"]
        PSU["on_probe_status_update\n- contact detection from PRB message"]
        ESU["on_error_status_update\n- force FAILED on firmware error"]
        ACU["on_axis_count_update\n- re-init params, redraw"]
        PIU["on_pins_state_update\n- pin indicators and probe_disconnected flag"]
        CSU["on_connection_status_update\n- system lock toggle"]
        POSU["on_positions_update\n- throttled WPos and MPos display"]
    end

    FS --> FSU
    PS --> PSU
    ES --> ESU
    AC --> ACU
    PI --> PIU
    SS --> CSU
    POS_W --> POSU
    POS_M --> POSU
    AN -->|"read directly"| GAL["getAxisLetter()"]
```

### Position Display Throttling

Position updates arrive at 10 Hz (grblHAL status poll). The screen applies a **250 ms minimum interval** per group (WPos and MPos independently), with a flush timer that fires 300 ms later to apply any pending update that was throttled. WPos and MPos each carry their own `last_*_display_update_ms` timestamp so that one group passing the gate cannot starve the other — both groups are dispatched from a single grblHAL status report in the same LVGL tick.

### Pin State Change Detection

`on_pins_state_update` compares the incoming string against the last known value using `strcmp`. If identical, all LVGL hide/show operations are skipped. This avoids 8+ object updates per second when the machine is idle.

---

## Screen Lifecycle

```mermaid
sequenceDiagram
    participant ROUTER as Screen Router
    participant NS as probeScreen::create()
    participant LVGL as LVGL Core
    participant TIMER as LVGL Timers

    ROUTER->>NS: create()
    NS->>NS: Reset transition state
    NS->>NS: Subscribe to ESP3DValues (firmware, probe, error, axis, pins, positions, server)
    NS->>LVGL: new GenericScreen(ESP3DScreenType::probe)
    NS->>LVGL: new PanelComponent (4 probe-param items)
    NS->>LVGL: Create axis chip, position labels, param buttons 2x2 grid
    NS->>LVGL: Create probe status bar (label + spinner + icon)
    NS->>LVGL: Create pin indicator containers (linear XYZ + rotary ABC P O)
    NS->>LVGL: Register encoder, switch, and destroy event callbacks
    NS->>TIMER: Deferred timer - new FirmwareStatusComponent
    NS->>TIMER: Deferred timer - new ConnectionStatusComponent
    NS->>TIMER: position_flush_timer (300 ms repeating)
    NS->>NS: updateAxisDisplay() - initial state

    Note over NS,TIMER: Screen is live

    ROUTER->>NS: Back button or transition
    NS->>NS: prepareForDestruction()
    NS->>NS: Unsubscribe all ESP3DValues
    NS->>NS: stopProbeSequence() if probe is active
    NS->>TIMER: Delete probe_timeout_timer
    NS->>TIMER: Delete position_flush_timer
    NS->>LVGL: prepareForDestruction() on all components
    NS->>LVGL: Remove encoder and switch event callbacks
    LVGL->>NS: LV_EVENT_DELETE fires - onScreenDestroy()
    NS->>NS: delete components, unregister screen, delete GenericScreen
```

All cleanup follows the **prepare-then-destroy** pattern used across the [UI Framework](ui_core.md): `prepareForDestruction()` unsubscribes and detaches event handlers first; the LVGL `LV_EVENT_DELETE` callback then frees memory. This prevents dangling callbacks from firing after object deletion.

---

## Inter-Screen Communication (Public API)

```cpp
namespace probeScreen {
    // Called before navigating to the probe screen to configure its return target
    void setReturnScreen(ESP3DScreenType screen);

    // Entry point — called by the screen router
    void create();

    // Called after returning from the probe screen to read the outcome
    ProbeResult getResult();

    // Reset result to NONE (call before launching a new probe sequence)
    void clearResult();
}
```

Typical caller pattern (e.g., from [changeTool screen](grblhal_module_change_tool.md)):
```cpp
probeScreen::clearResult();
probeScreen::setReturnScreen(ESP3DScreenType::change_tool);
// transition to probe screen via UIManager ...

// ... after returning:
if (probeScreen::getResult() == ProbeResult::SUCCESS) {
    // offset has been applied; resume tool change workflow
}
```

---

## Lock and Disable Behavior

| Condition | Effect |
|---|---|
| `server_status != "C"` (not connected) | `systemSetLockState(true)` — all elements grayed, Play disabled |
| Switch in position 3 on machine with 3 axes or fewer | `userSetLockState(true)` — same visual lockout |
| `probe_disconnected_` (`Pn:O` received) | Play button proactively disabled; probe start blocked with error feedback |
| Any of the above conditions cleared | Elements re-enabled, `panel_component->updateFocusVisuals()` called |

When locked, the four probe-parameter buttons receive `LV_STATE_DISABLED` and their label opacity drops to 30%. Position labels are similarly dimmed. The Back button (`isLockable = false`) always remains active.

---

## Component Interaction Diagram

```mermaid
graph LR
    subgraph State["probeScreen static state"]
        PM["probe_axis_values_map\nstd::map per axis index"]
        ST["current_probe_state\nProbeState enum"]
        AX["axis_index\nextended_axis_index"]
        PD["probe_disconnected_\nbool - Pn:O gate"]
    end

    subgraph LVGLObj["LVGL Objects"]
        BTN_AXE["btnAxe - axis chip"]
        POS_BIG["position_big_label - WPos"]
        POS_SM["position_small_label - MPos"]
        PARAM_BTN["probe_param_btns 0 to 3"]
        STAT_LABEL["probe_status_label"]
        SPINNER["processing_spinner"]
        ICON["probe_status_icon"]
        PIN_L["pins_labels 0 to 7"]
    end

    subgraph ChildComp["Child Components"]
        PANEL_C["PanelComponent\nencoder focus, 4 items"]
        VBTN_C["VirtualButtonsComponent\n3 buttons"]
        FW_C["FirmwareStatusComponent"]
        CONN_C["ConnectionStatusComponent"]
    end

    PM -->|"getCurrentProbeValues()"| PARAM_BTN
    ST -->|"setProbeUIState()"| SPINNER
    ST -->|"setProbeUIState()"| STAT_LABEL
    ST -->|"setProbeUIState()"| ICON
    ST -->|"update_button(1, play_b or stop_b)"| VBTN_C
    PD -->|"update_button(1, enabled?)"| VBTN_C
    AX -->|"getAxisName()"| BTN_AXE
    AX -->|"updatePositionDisplay()"| POS_BIG
    AX -->|"updatePositionDisplay()"| POS_SM
    PANEL_C -->|"ON_FOCUS - border highlight"| PARAM_BTN
    PANEL_C -->|"ON_ACTIVE - open inputScreen"| PARAM_BTN
```

---

## Key Design Decisions

1. **Persistent per-axis parameter map** — `probe_axis_values_map` is never cleared on axis switch. Defaults are only inserted for new entries (guarded by `map::find`), preserving any user modifications across axis changes within a single screen session.

2. **Two-pass probe (seek then feed)** — The fast seek at full feed rate quickly finds approximate contact; the slow feed pass at `feed_rate / 2` from the retracted position achieves precise repeatability. This is standard probing practice for grblHAL / Grbl controllers.

3. **grblHAL-specific `Pn:O` safety gate** — The `O` pin character signals that the probe input is open (disconnected). The screen detects this in `on_pins_state_update` and both disables the Play button and refuses `startProbeSequence()`, preventing a false-contact or runaway condition unique to grblHAL's extended pin reporting.

4. **No dynamic memory allocation during probing** — GCode command strings are built in stack-allocated `char cmd[128]` buffers. The `probe_axis_values_map` is the only heap allocation and is populated at creation time, not during the probe sequence itself.

5. **Deferred overlay component creation** — `FirmwareStatusComponent` and `ConnectionStatusComponent` are created via a single-shot LVGL timer (`ESP3D_DEFERED_SCREEN_CREATION_DELAY_MS`) after the main screen layout is complete, preventing LVGL task overload during the initial render.

6. **Per-group position throttle timestamps** — WPos and MPos each have independent `last_*_display_update_ms` timestamps. A shared timestamp would cause one group's gate-pass to starve the other, since both groups are dispatched from a single grblHAL status report in the same LVGL tick.

7. **Axis change aborts active probe** — If the hardware switch or touch axis selector changes while a probe sequence is running, `stopProbeSequence()` is called immediately (Feed Hold `!`) and the state transitions to `FAILED` with an "axis changed" message. This prevents probing on the wrong axis.

---

## Related Documentation

| Document | Relationship |
|---|---|
| [grblhal_module](grblhal_module.md) | Parent module — screen set, screen router |
| [grblhal_module_change_tool](grblhal_module_change_tool.md) | Primary caller of the probe screen for tool-change workflow |
| [grblhal_module_files](grblhal_module_files.md) | Sibling screen in the grblHAL screen set |
| [grblhal_module_connection_status](grblhal_module_connection_status.md) | `ConnectionStatusComponent` used as overlay |
| [grbl_module_probe](grbl_module_probe.md) | Equivalent probe screen for grbl firmware |
| [fluidnc_module_probe](fluidnc_module_probe.md) | Equivalent probe screen for FluidNC firmware |
| [cnc_shared](cnc_shared.md) | Shared `FirmwareStatusComponent`, jog screen, status screen |
| [cnc_grblhal](cnc_grblhal.md) | `esp3dGcodeHandler` — dispatches all probe GCode commands |
| [gcode_host](gcode_host.md) | Streaming, flow control, `ESP3DCommandType` priority levels |
| [ui_components](ui_components.md) | `PanelComponent`, `VirtualButtonsComponent` |
| [common_screens](common_screens.md) | `inputScreen` used for probe parameter numeric editing |
| [ui_core](ui_core.md) | `GenericScreen`, `UIManager`, `ThemeStyles` |
| [values](values.md) | `ESP3DValues` observable store — all subscribed indices |


## Documents de conception (depot)

- [probe_screen](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ux_flows/grblhal/probe_screen.md)
