---
title: "FluidNC Module — Change Tool Screen"
---

# FluidNC Module — Change Tool Screen

The **Change Tool Screen** is the FluidNC-specific UI for managing CNC tool changes from the pendant. It provides two operating modes — a full motorized tool change via FluidNC's `atc_manual` macro (`M6T`) and an instant in-place tool registration (`M61Q`) — plus live machine and work position readouts and an optional post-change probing workflow.

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Architecture Position](#architecture-position)
3. [Core Abstractions](#core-abstractions)
   - [Tool Change State Machine](#tool-change-state-machine)
   - [Tool Change Modes](#tool-change-modes)
   - [Panel Items](#panel-items)
4. [Component Architecture](#component-architecture)
5. [Data Flow & Value Subscriptions](#data-flow--value-subscriptions)
6. [Position Display & Throttle](#position-display--throttle)
7. [User Interaction Model](#user-interaction-model)
   - [Virtual Buttons](#virtual-buttons)
   - [Panel Encoder Interaction](#panel-encoder-interaction)
   - [Probe Prompt Flow](#probe-prompt-flow)
8. [Screen Lifecycle](#screen-lifecycle)
9. [Memory Safety](#memory-safety)
10. [Key Constants & Timeouts](#key-constants--timeouts)
11. [Dependencies](#dependencies)

---

## Module Overview

| Property | Value |
|---|---|
| **File** | `main/display/cnc/fluidnc/screens/change_tool_screen.cpp` |
| **Namespace** | `changeToolScreen` |
| **Public API** | `changeToolScreen::create()` |
| **Return screen** | `ESP3DScreenType::main` |
| **Firmware target** | FluidNC only |

The screen is a **FluidNC-specific** implementation. Equivalent screens for grbl and grblHAL firmwares live in their own sibling modules. All three share the CNC-shared infrastructure described in [cnc_shared.md](cnc_shared.md).

---

## Architecture Position

```
UI Framework (UIManager, GenericScreen, PanelComponent, VirtualButtonsComponent)
       |
       +--> changeToolScreen::create()          [this module]
                  |
                  +--> FirmwareStatusComponent  [cnc_shared.md]
                  +--> ConnectionStatusComponent [fluidnc_module_connection_status.md]
                  +--> probeScreen              [fluidnc_module_probe.md]
                  +--> inputScreen::create()    [common_screens.md]
                  |
                  +--> ESP3DValues (subscribe)  [Core_Platform_&_Infrastructure.md]
                  +--> esp3dGcodeHandler        [CNC_Firmware_Integration.md]
```

The screen is reached from `main_screen.cpp` (see [cnc_shared.md](cnc_shared.md) — navigation_screens) via `createScreen(ESP3DScreenType::change_tool)`.

---

## Core Abstractions

### Tool Change State Machine

The screen owns a local `ToolChangeState` enum that drives all UI updates, button states, and GCode dispatch. The state machine advances exclusively through firmware status callbacks and user actions — never by polling.

```
                     ┌─────────────────────────────────────────────────────┐
                     │                    create()                          │
                     ▼                                                      │
               ┌───────────┐                                               │
         ┌────▶│   IDLE    │◀── recovery (fw → IDLE after HOLD/error)     │
         │     └─────┬─────┘                                               │
         │           │ Button1 (START, CHANGE mode)                        │
         │           │ M6T<target> sent                                    │
         │           ▼                                                      │
         │  ┌──────────────────┐   Button1 (CANCEL)   ┌───────────────┐   │
         │  │ MOVING_TO_CHANGE │─────────────────────▶│   CANCELLED   │   │
         │  └────────┬─────────┘                       └───────────────┘   │
         │           │ fw → HOLD                                            │
         │           │ (atc_manual pauses)                                  │
         │           ▼                                                      │
         │  ┌──────────────────┐   Button1 (CANCEL)   ┌───────────────┐   │
         │  │  WAITING_USER    │─────────────────────▶│   CANCELLED   │   │
         │  └────────┬─────────┘                       └───────────────┘   │
         │           │ Button1 (RESUME)                                     │
         │           │ GRBL_RT_CYCLE_START sent                             │
         │           │ fw → RUN                                             │
         │           ▼                                                      │
         │  ┌──────────────────┐   Button1 (CANCEL)   ┌───────────────┐   │
         │  │    PROBING       │─────────────────────▶│   CANCELLED   │   │
         │  └────────┬─────────┘                       └───────────────┘   │
         │           │ fw → IDLE                                            │
         │           ▼                                                      │
         │     ┌──────────┐   Button1 (SET mode)   ┌───────────┐          │
         │     │ SUCCESS  │◀───────────────────────│   IDLE    │          │
         │     └──────────┘   M61Q sent            └───────────┘          │
         │                                                                  │
         │  ALARM / timeout (60s) → FAILED from any active state           │
         └──────────────────────────────────────────────────────────────────┘
```

**Recovery path**: When `last_firmware_state` contained `HOLD` or `error` and the firmware transitions to `IDLE`, any `FAILED` or `CANCELLED` state is automatically cleared back to `IDLE` (or back to `FAILED` if target equals current tool in CHANGE mode).

**Timeout handling**: If the 60-second timeout fires while the firmware is still busy, `pending_timeout_revert` is set and the FAILED state is applied on the next firmware status callback rather than immediately, to avoid a race between the revert command and any in-flight firmware state change.

---

### Tool Change Modes

| Mode | GCode sent | FluidNC behaviour | Movement |
|---|---|---|---|
| **SET** (`M61Q`) | `M61Q<num>` | Registers tool number in parser state only | None |
| **CHANGE** (`M6T`) | `M6T<num>` | Triggers `atc_manual` macro: moves to change position, pauses in HOLD, resumes after user confirmation, probes with ETS | Yes |

The mode button label reflects the active mode:
- **SET mode**: label shows `M61Q`
- **CHANGE mode**: label shows `TX >` where `X` is the current tool number

Tapping the mode button (or pressing Button 0 while mode is focused) toggles instantly between the two modes. The toggle is always instant-action — it never enters encoder editing mode.

---

### Panel Items

The interactive panel contains exactly two items managed by `PanelComponent`:

| Constant | `panel_id` variable | Widget | Action |
|---|---|---|---|
| `ITEM_ID_MODE = 0` | `panel_id_mode` | `mode_btn` | Toggle SET / CHANGE mode |
| `ITEM_ID_TARGET = 1` | `panel_id_target` | `target_btn` | Select target tool (0–255) |

Both items are disabled whenever the state is non-editable (`MOVING_TO_CHANGE`, `WAITING_USER`, `PROBING`) or while `awaiting_probe_decision` is true.

---

## Component Architecture

```
GenericScreen (screen_instance)
│
├── Container (lv_obj_t)
│   │
│   ├── createToolSelectorHeader()
│   │     mode_btn  ──┐
│   │     target_btn ─┴── PanelComponent (2 items)
│   │
│   ├── createPositionDisplay()
│   │     MPos title │ WPos title
│   │     X: [mpos]  │ [wpos]
│   │     Y: [mpos]  │ [wpos]
│   │     Z: [mpos]  │ [wpos]
│   │
│   └── createStatusBar()
│         status_label
│         status_spinner (hidden unless MOVING/PROBING)
│         └── createProbePromptButtons() (hidden until M61Q succeeds)
│               probe_btn │ ignore_btn
│
├── Overlays (on container)
│   ├── FirmwareStatusComponent
│   └── ConnectionStatusComponent
│
└── Bottom button bar (GenericScreen)
      Button 0: ok_b
      Button 1: change_b / stop_b  (dynamic)
      Button 2: back_b
```

### Static Variable Groups

All UI state is held in static file-scope variables (single-instance screen):

| Group | Key variables |
|---|---|
| Screen/component instances | `screen_instance`, `panel_component`, `firmware_status_component`, `connection_status_component` |
| State tracking | `current_state`, `current_mode`, `current_tool`, `target_tool`, `previous_tool`, `saved_target_tool` |
| Firmware tracking | `last_firmware_state`, `pending_timeout_revert` |
| Probe flow | `awaiting_probe_decision`, `returning_from_probe` |
| Position throttle | `last_wpos_display_update_ms`, `last_mpos_display_update_ms`, `wpos_update_pending`, `mpos_update_pending` |
| Timers | `timeout_timer`, `position_flush_timer`, `transition_timer`, `cleanup_timer` |

---

## Data Flow & Value Subscriptions

The screen subscribes to 8 indices in the [ESP3DValues](Core_Platform_and_Infrastructure.md) observable store during `create()` and unsubscribes in `prepareForDestruction()`.

| Index | Callback | Effect |
|---|---|---|
| `parser_state` | `on_parser_state_update` | Extracts `T` value → updates `current_tool` (editable states only) |
| `firmware_status` | `on_firmware_status_update` | Drives the full state machine |
| `position_wx/wy/wz` | `on_positions_update` (WPos) | Updates WPos labels with 250 ms throttle |
| `position_mx/my/mz` | `on_positions_update` (MPos) | Updates MPos labels with 250 ms throttle |
| `server_status` | `on_connection_status_update` | Logged only (no UI action) |

### `on_firmware_status_update` — Transition Logic

```
Received firmware status string
│
├── pending_timeout_revert == true?
│     YES → setToolChangeState(FAILED, timeout msg), clear flag, return
│
├── current_state == MOVING_TO_CHANGE?
│     "HOLD" in value → → WAITING_USER ("Install tool TN")
│
├── current_state == WAITING_USER?
│     "RUN" in value  → → PROBING
│
├── current_state == PROBING?
│     "IDLE" in value → → SUCCESS
│                         current_tool = target_tool
│                         auto-advance: target_tool = current_tool + 1
│
├── "ALARM" in value AND state is non-editable?
│     revertToolToFirmware(), → FAILED, cancel timeout_timer
│
└── (was HOLD/error) AND (now IDLE) AND (state is FAILED/CANCELLED)?
      → IDLE  (or FAILED if same-tool conflict in CHANGE mode)
```

### `on_parser_state_update` — Tool Extraction

The helper `extract_tool_from_parser_state()` calls `esp3dGcodeHandler.extractValue(str, 'T')` to parse the `T` field from the FluidNC GCode parser state string (e.g., `"G0 G54 G17 T2 F0 S0"`). The result updates `current_tool` only when the screen is in an editable state.

---

## Position Display & Throttle

The position display shows Machine Position (MPos) and Work Position (WPos) for X, Y, Z simultaneously. Because the firmware emits all six axes in rapid succession within a single status report cycle, a two-tier throttle prevents excessive LVGL label updates.

**Tier 1 — per-callback gate (250 ms)**

```
on_positions_update(idx, value)
│
├── idx is wx/wy/wz?  → WPos group, check last_wpos_display_update_ms
│   └── interval < 250ms → wpos_update_pending = true, return (skip)
│   └── interval >= 250ms → read all 3 WPos from store, update labels, reset timestamp
│
└── idx is mx/my/mz?  → MPos group, check last_mpos_display_update_ms
    └── interval < 250ms → mpos_update_pending = true, return (skip)
    └── interval >= 250ms → read all 3 MPos from store, update labels, reset timestamp
```

**Tier 2 — flush timer (300 ms)**

```
position_flush_timer_cb()  [runs every 300ms]
│
└── wpos_update_pending OR mpos_update_pending?
      YES → clear both flags, call updatePositionDisplay() (reads all 6 values from store)
      NO  → no-op
```

**Why separate timestamps and flags per group**: `handle()` dispatches all position callbacks from one status report in the same LVGL tick. A shared timestamp would allow the WPos pass-through to reset the gate for MPos, starving one group. Separate state per group ensures each advances independently.

**Why read from the store rather than the callback value**: When the first callback of a group passes the throttle gate, the remaining two axes of that group would be blocked. Re-reading from `esp3dXValues.get_value()` inside the passing callback ensures all three labels are updated atomically from the latest stored values.

---

## User Interaction Model

### Virtual Buttons

Button configuration is dynamic — it changes on every `setToolChangeState()` and `updateVirtualButtons()` call:

| State | Button 0 | Button 1 | Button 2 |
|---|---|---|---|
| IDLE / SUCCESS / FAILED / CANCELLED | `ok_b` enabled | `change_b` enabled (if valid op) | `back_b` enabled |
| MOVING\_TO\_CHANGE / PROBING | disabled | `stop_b` enabled (CANCEL) | disabled |
| WAITING\_USER | disabled | `change_b` enabled (RESUME) | disabled |
| Awaiting probe decision | all disabled | all disabled | all disabled |

A "valid operation" for CHANGE mode requires `current_tool != target_tool`. SET mode is always valid.

**Button 0 (OK)** — toggles encoder between `PANEL_NAVIGATION_MODE` and `PANEL_EDITING_MODE` for the TARGET item; instantly toggles mode when MODE item is focused.

**Button 1** — context-sensitive:

```
Button 1 released
│
├── awaiting_probe_decision → ignored
│
├── editable state (IDLE/SUCCESS/FAILED/CANCELLED)
│   ├── CHANGE mode
│   │   ├── current_tool == target_tool → FAILED (same tool error)
│   │   └── else → startToolChange() [M6T<target>]
│   └── SET mode → executeSetCurrentTool() [M61Q<target>]
│
├── WAITING_USER → send GRBL_RT_CYCLE_START → PROBING
│
└── MOVING_TO_CHANGE or PROBING → stopToolChange()
      revertToolToFirmware() [M61Q<previous_tool>]
      → CANCELLED
```

**Button 2 (BACK)** — blocked during `MOVING_TO_CHANGE`, `WAITING_USER`, `PROBING`, and `awaiting_probe_decision`. Otherwise triggers the standard `ESP3D_TRANSITION_START` cleanup sequence back to `RETURN_SCREEN` (main).

### Panel Encoder Interaction

| Event | Item | Effect |
|---|---|---|
| `ON_ACTIVE` on MODE | mode button | Toggle CHANGE ↔ SET instantly; stay in navigation mode |
| `ON_ACTIVE` on TARGET | target button | Open `inputScreen` for numeric entry (0–255, max 3 digits) |
| `ON_CHANGE` (encoder rotate) on TARGET | target button | Increment/decrement `target_tool` (wraps 0↔255) — only in editing mode |
| `ON_FOCUS` | either | Logged only |

### Probe Prompt Flow

After a successful `M61Q` (SET mode), the screen overlays two buttons and disables everything else to offer an optional tool-length probe:

```
executeSetCurrentTool()
│
├── M61Q<target> sent
├── current_tool = target_tool  (immediate, no wait)
└── showProbePrompt(true)
      awaiting_probe_decision = true
      Probe btn + Ignore btn shown
      status_label = "probe prompt" translation
      all panel items disabled
      all virtual buttons disabled

User taps "Probe tool"                User taps "Ignore"
│                                     │
├── showProbePrompt(false)            ├── showProbePrompt(false)
├── returning_from_probe = true       └── → SUCCESS ("Current tool set to TX")
├── prepareForDestruction()
├── navigate to probeScreen
│     probeScreen::setReturnScreen(change_tool)
│     probeScreen::clearResult()
│
└── (back in create() next cycle)
      handleProbeScreenReturn()
        getResult() == SUCCESS  → → SUCCESS ("Probe success")
        getResult() == FAILED   → → FAILED ("Probe failed")
        getResult() == CANCELLED/NONE → → SUCCESS ("Probe cancelled — tool set")
```

---

## Screen Lifecycle

### Creation (`create()`)

1. `ESP3D_SAVE_SOUND_STATE_AND_DISABLE` — mutes audio during construction
2. Destroy any pre-existing `screen_instance` (guard against double-create)
3. Reset transition flags via `ESP3D_TRANSITION_RESET`
4. Read `parser_state` from store → initialize `current_tool`
5. Restore `target_tool` from `saved_target_tool` if applicable (preserves user's selection across FAILED/CANCELLED cycles)
6. `new (std::nothrow) GenericScreen` with 3 virtual button configs
7. `createToolSelectorHeader()` → `PanelComponent` with 2 items
8. `createPositionDisplay()` → 6 position labels
9. `createStatusBar()` → status label + spinner + probe prompt buttons (hidden)
10. `new (std::nothrow) FirmwareStatusComponent` + `ConnectionStatusComponent`
11. Start `position_flush_timer` (300 ms)
12. Subscribe to 8 `ESP3DValues` indices
13. Initialize position labels from current store values
14. `setToolChangeState(IDLE or FAILED)` based on current firmware state
15. `handleProbeScreenReturn()` — handles result if returning from probe screen
16. `ESP3D_RESTORE_SOUND_STATE`

### Destruction (`prepareForDestruction()` + `onScreenDestroy()`)

`prepareForDestruction()` is guarded by `cleanup_executed` and `is_prepared_for_destruction` to prevent double-execution. It:

1. Saves `target_tool` → `saved_target_tool` (for FAILED/CANCELLED; clears on SUCCESS)
2. Unsubscribes all 8 `ESP3DValues` indices
3. Calls `prepareForDestruction()` on all three components
4. Deletes `timeout_timer` and `position_flush_timer`
5. Removes LVGL encoder event callback
6. Calls `GenericScreen::prepareForDestruction()`
7. Nulls all UI element pointers (prevents dangling LVGL object references)

`onScreenDestroy()` (LVGL `LV_EVENT_DELETE` handler) then deletes the C++ objects (`panel_component`, `firmware_status_component`, `connection_status_component`, `screen_instance`) and calls `ui_manager.unregisterScreen()`.

### Target Tool Persistence

`saved_target_tool` (static, initialized to `-1`) bridges consecutive `create()` calls. After FAILED or CANCELLED, the value is saved so the user does not have to re-enter their target. On SUCCESS it is cleared to `-1` so the next open starts fresh with `current_tool + 1`.

---

## Memory Safety

This module follows the project's embedded memory safety rules (see `docs/guides/esp32_memory_constraints.md`):

| Pattern | Where applied |
|---|---|
| `new (std::nothrow)` | All four heap-allocated objects (`GenericScreen`, `PanelComponent`, `FirmwareStatusComponent`, `ConnectionStatusComponent`) |
| Null + validity check after every allocation | `if (!ptr \|\| !ptr->isValid())` guard, log error, delete, set nullptr, return or degrade |
| `lv_obj_is_valid()` before every LVGL access | All UI element pointer dereferences |
| Fixed-size `snprintf` buffers | All string formatting — no `std::string` in hot paths |
| No uncaught exceptions in LVGL context | Degraded-overlay pattern: failed overlay is skipped silently rather than throwing |
| Double-free guard | `cleanup_executed` flag prevents `prepareForDestruction()` from running twice |
| Encoder callback cleanup | `lv_obj_remove_event_cb()` called in `prepareForDestruction()` before the LVGL object is deleted |

---

## Key Constants & Timeouts

| Constant | Value | Purpose |
|---|---|---|
| `TOOL_CHANGE_TIMEOUT_MS` | 60 000 ms | Auto-cancel M6T operation and revert tool if firmware does not complete |
| `POSITION_DISPLAY_MIN_INTERVAL_MS` | 250 ms | Minimum interval between label updates per axis group (WPos and MPos tracked separately) |
| Flush timer period | 300 ms | `position_flush_timer` period (throttle interval + 50 ms margin) |
| `RETURN_SCREEN` | `ESP3DScreenType::main` | Navigation target for Button 2 (BACK) |
| Tool number range | 0 – 255 | Valid range for `current_tool` and `target_tool` (`uint8_t`), wraps on encoder rotate |
| Input editor max length | 3 digits | Enforced by `inputScreen` for numeric tool entry |

---

## Dependencies

| Module | Role |
|---|---|
| [fluidnc_module_connection_status.md](fluidnc_module_connection_status.md) | `ConnectionStatusComponent` and `ConnectionStatusConfig` — overlay showing transport / server link state |
| [cnc_shared.md](cnc_shared.md) — `firmware_status` | `FirmwareStatusComponent` and `FirmwareStatusConfig` — overlay showing live FluidNC status string |
| [fluidnc_module_probe.md](fluidnc_module_probe.md) | Optional post-change tool length probe; result consumed via `probeScreen::getResult()` and `probeScreen::clearResult()` |
| [common_screens.md](common_screens.md) — modal dialogs | `inputScreen::create()` for numeric tool number entry (0–255, max 3 digits) |
| [ui_components.md](ui_components.md) | `GenericScreen`, `PanelComponent`, `VirtualButtonsComponent`, `RotaryBaseComponent` |
| [Core_Platform_&_Infrastructure.md](Core_Platform_and_Infrastructure.md) — values | `ESP3DValues` observable store — `subscribe`, `unsubscribe`, `get_value` |
| [CNC_Firmware_Integration.md](CNC_Firmware_Integration.md) — cnc\_fluidnc | `esp3dGcodeHandler.sendGcode()` dispatches `M6T`, `M61Q`, `GRBL_RT_CYCLE_START`; `extractValue()` parses parser state |
| [Core_Platform_&_Infrastructure.md](Core_Platform_and_Infrastructure.md) — translations | `esp3dTranslationService.translate()` for all UI label strings |
| [ui_core.md](ui_core.md) | `UIManager` (`ui_manager`) — screen registration, style helpers, orientation angle |


## Documents de conception (depot)

- [change_tool_screen](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ux_flows/fluidnc/change_tool_screen.md)
