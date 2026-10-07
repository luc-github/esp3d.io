---
title: "FluidNC Module — Connection Status Component"
---

# FluidNC Module — Connection Status Component

## Introduction

The `fluidnc_module_connection_status` module defines a compact, **clickable LVGL UI widget** that continuously reflects the live connection state between the pendant and the FluidNC CNC controller. It renders an icon (or animated spinner) in a corner of any host screen and navigates to the [`connection_status_screen`](connection_status_screen.md) when the user taps it.

**Source file:** `main/display/cnc/fluidnc/components/connection_status.h`

> **Sibling components:** Structurally identical variants exist for the other supported CNC firmwares:
> - Grbl — `main/display/cnc/grbl/components/connection_status.h`
> - GrblHAL — `main/display/cnc/grblhal/components/connection_status.h`
>
> All three share the same public API and behaviour; only the firmware-specific status parsing differs in their `.cpp` implementations.

---

## Architecture Overview

```mermaid
graph TD
    subgraph FluidNC_Module["fluidnc_module (FluidNC-specific UI)"]
        CSC["ConnectionStatusComponent\n(connection_status.h)"]
        CTC["change_tool_screen.cpp"]
        FS["files_screen.cpp"]
        PS["probe_screen.cpp"]
    end

    subgraph CommonScreens["Common Screens"]
        CSS["connection_status_screen\n(connection_status_screen.h/.cpp)"]
    end

    subgraph CorePlatform["Core Platform"]
        V["ESP3DValues\n(esp3d_values.h)"]
        ST["ESP3DScreenType\n(esp3d_screen_type.h)"]
    end

    subgraph LVGL["LVGL (Core 1 - UI Thread)"]
        LObj["lv_obj_t objects\n(img, spinner, click_container,\npress_circle)"]
        LTimer["lv_timer_t\n(screen transition timer)"]
    end

    CSC -->|"subscribes transport & server status"| V
    V -->|"callback: static_on_status_update"| CSC
    CSC -->|"spawns on click"| LTimer
    LTimer -->|"open_status_screen_cb"| CSS
    CSC -->|"creates / manages"| LObj
    CSS -.->|"return_screen"| ST
    CTC & FS & PS -->|"embed"| CSC
```

The component is an **embedded sub-widget** — host screens (change_tool, files, probe) instantiate it directly, passing their own `lv_obj_t*` as the parent. It is not a full screen; it lives on top of whatever screen currently has focus.

---

## Component Types

### `ConnectionStatusConfig`

A plain-data configuration struct passed to the component at construction (and updatable at runtime via `updateConfig()`).

```cpp
struct ConnectionStatusConfig {
    lv_align_t align = LV_ALIGN_TOP_RIGHT;          // LVGL alignment anchor
    int32_t    x_offset = 0;                         // Pixel offset from anchor (X)
    int32_t    y_offset = 0;                         // Pixel offset from anchor (Y)
    ESP3DScreenType return_screen = ESP3DScreenType::main; // Where to go after connection_status_screen closes
    void (*prepare_parent_screen_destruction)(void) = nullptr; // Optional teardown hook
};
```

| Field | Purpose |
|---|---|
| `align` | LVGL alignment constant — defaults to top-right corner |
| `x_offset` / `y_offset` | Fine-tune pixel position relative to the anchor |
| `return_screen` | The screen to restore when the user closes the connection status screen |
| `prepare_parent_screen_destruction` | Callback invoked just before the host screen is destroyed during a navigation transition |

---

### `ConnectionStatusComponent`

The widget class. It owns the LVGL object tree for the indicator and manages the full lifecycle of subscriptions and timers.

#### Public API

| Method | Description |
|---|---|
| `ConnectionStatusComponent(parent, host_screen, config, angle)` | Constructor — builds LVGL objects, subscribes to value callbacks, sets initial visual state |
| `~ConnectionStatusComponent()` | Destructor — unsubscribes callbacks (if not already done), deletes LVGL objects |
| `updateOrientation(angle)` | Repositions the indicator when the screen rotates (0°, 90°, 180°, 270°) |
| `updatePosition(align, x, y)` | Moves the indicator to a new anchor without reconstructing it |
| `updateConfig(config)` | Replaces the full config at runtime |
| `prepareForDestruction()` | Unsubscribes from `ESP3DValues` and marks a flag; safe to call inside an LVGL event callback |
| `isValid()` | Returns `true` if construction succeeded and the component is operational |
| `get_x_position(get_orientation)` | Static helper — returns the correct X offset for the current or a default orientation |
| `get_y_position(get_orientation)` | Static helper — Y offset |
| `get_alignment(get_orientation)` | Static helper — `lv_align_t` for the current orientation |
| `getHostScreen()` | Static — returns which screen type currently owns the component |

---

## LVGL Object Hierarchy

```mermaid
graph TD
    parent["parent lv_obj_t\n(host screen root)"]
    cc["click_container_\n(lv_obj_t - transparent, sized for touch target)"]
    img["img_\n(lv_img - status icon)"]
    spinner["spinner_\n(lv_spinner - shown during 'T' state)"]
    pc["press_circle_\n(lv_obj - visual press feedback)"]

    parent --> cc
    cc --> img
    cc --> spinner
    cc --> pc
```

- **`click_container_`** — an invisible, touch-sized container registered with the `LV_EVENT_CLICKED` callback. Sizing it larger than the icon ensures a comfortable touch target on small displays.
- **`img_`** — renders the status icon image from the `ui_resources` partition.
- **`spinner_`** — an animated LVGL spinner, made visible only when the state is **connecting** (`T`).
- **`press_circle_`** — a translucent circle that flashes briefly when the user taps, providing tactile feedback.

---

## Connection State Model

The component tracks **two independent status characters** — one for the transport layer, one for the CNC server — and merges them into a single display state.

```mermaid
stateDiagram-v2
    [*] --> Unknown : initial (both = '?')

    Unknown --> RadioOff       : transport = '.'
    Unknown --> Connecting     : transport = 'T' or server = 'T'
    Unknown --> AuthFailed     : server = 'A'
    Unknown --> Connected      : server = 'C'

    RadioOff --> Connecting    : transport changes to 'T'
    Connecting --> Connected   : server = 'C'
    Connecting --> AuthFailed  : server = 'A'
    Connecting --> Unknown     : transport or server resets to '?'
    Connected --> Unknown      : server != 'C'
    Connected --> Connecting   : server = 'T'
    AuthFailed --> Connecting  : retrying

    Connected : C - Full control\nIcon: connected\nSpinner: hidden
    Connecting : T - Connecting\nIcon: hidden\nSpinner: visible
    AuthFailed : A - Auth failed\nIcon: warning\nSpinner: hidden
    RadioOff : dot - Radio off\nIcon: radio-off\nSpinner: hidden
    Unknown : ? - Disconnected\nIcon: disconnected\nSpinner: hidden
```

### Status Characters Reference

| Char | Semantic | Visual |
|------|----------|--------|
| `?` | Disconnected / no signal | Disconnected icon |
| `.` | Radio off (WiFi/BT disabled) | Radio-off icon |
| `T` | Transport or server connecting | Animated spinner |
| `A` | Authentication failed | Warning icon |
| `C` | Connected — full CNC control | Connected icon |

The private method `compute_display_state()` maps the combination of `_transport_status_` and `_server_status_` to a single `uint8_t` state code, which `update_connection_status()` then uses to select the correct LVGL visual.

---

## Data Flow — Status Update

```mermaid
sequenceDiagram
    participant Transport as Communication Transport<br/>(serial / BLE / socket / USB)
    participant Values as ESP3DValues
    participant Static as static_on_status_update()
    participant Instance as on_status_update() [instance]
    participant LVGL as LVGL UI Thread (Core 1)

    Transport->>Values: set_value(transport_status_index, 'T')
    Values->>Static: invoke subscribed callback
    Static->>Instance: delegates to current instance
    Instance->>Instance: update _transport_status_\nor _server_status_
    Instance->>Instance: compute_display_state()
    Instance->>LVGL: update_connection_status(state)\nshow/hide img_, spinner_, press_circle_
```

**Why static callbacks?** `ESP3DValues::subscribe()` accepts a plain function pointer (`callbackFunctionPtr_t`). C++ non-static member function pointers are not compatible with plain function pointers. The static wrapper `static_on_status_update` holds a reference to the current instance via `host_screen_static_`, bridging the two worlds while keeping instance state private.

---

## Click → Screen Transition Flow

```mermaid
sequenceDiagram
    actor User
    participant CC as click_container_ (LVGL)
    participant on_click as on_click_event() [static]
    participant Timer as lv_timer (one-shot)
    participant OpenCB as open_status_screen_cb() [static]
    participant CSS as connection_status_screen::create()

    User->>CC: tap
    CC->>on_click: LV_EVENT_CLICKED
    on_click->>on_click: store config in pending_config_\ncall prepare_parent_screen_destruction (if set)
    on_click->>Timer: lv_timer_create(open_status_screen_cb, 0ms, 1-shot)
    Note over Timer: deferred to next LVGL tick\nsafe: avoids destroying objects inside callback
    Timer->>OpenCB: fires on next tick
    OpenCB->>CSS: connection_status_screen::create(config)
    CSS-->>User: Connection Status Screen shown
```

> **LVGL safety rule:** Screen objects must never be destroyed *inside* an event callback — doing so risks use-after-free within the same LVGL dispatch cycle. The one-shot timer defers the screen switch to the next tick, which is the established safe pattern throughout this codebase. See [`screen_transitions_flow.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md) for the full rationale.

---

## Orientation Support

The pendant may be mounted in any of four orientations. The component supports this via:

- **`updateOrientation(angle)`** — called by the host screen when the encoder or settings change the display angle.
- **Static helpers** (`get_x_position`, `get_y_position`, `get_alignment`) — allow host screens to query the correct placement *before* the component is constructed, so the initial `ConnectionStatusConfig` is already orientation-correct.

```mermaid
flowchart LR
    OS["Orientation Setting\n(0° / 90° / 180° / 270°)"]
    GH["get_alignment()\nget_x_position()\nget_y_position()"]
    Config["ConnectionStatusConfig\n.align / .x_offset / .y_offset"]
    CSC["ConnectionStatusComponent\nconstructor or updatePosition()"]

    OS --> GH --> Config --> CSC
```

---

## Lifecycle

```mermaid
flowchart TD
    A([Host Screen Creates Component]) --> B[Constructor\ncreate LVGL objects\nsubscribe ESP3DValues]
    B --> C{isValid?}
    C -- No --> ERR([Component inert\nis_valid_ = false])
    C -- Yes --> D[Running\nReceives status callbacks\nHandles tap events]
    D --> E[prepareForDestruction\nunsubscribe callbacks\nset flag]
    E --> F[Destructor\ndelete LVGL objects]
    F --> G([Destroyed])
```

`prepareForDestruction()` is intentionally separated from the destructor so host screens can call it safely during LVGL event callbacks before the C++ destructor runs. This two-phase teardown avoids stale callback invocations after the containing screen has begun destruction.

---

## Static Members — Design Rationale

Three members are `static` on the class:

| Static Member | Role |
|---|---|
| `host_screen_static_` | Tracks which `ESP3DScreenType` currently owns the component; used by the static callback to route updates to the correct instance |
| `screen_timer_` | Holds the pending one-shot timer handle; prevents double-creation if the user taps rapidly |
| `pending_config_` | Stores the config captured at click time so `open_status_screen_cb` can read it after the instance may have been torn down |

Only **one** `ConnectionStatusComponent` is active per screen at a time, which is why these can safely be static.

---

## Dependencies

| Dependency | What it provides |
|---|---|
| `esp3d_values.h` ([ESP3DValues module](values.md)) | Observable value bus — `subscribe()` / `unsubscribe()`, delivers transport and server status updates |
| `screens/esp3d_screen_type.h` | `ESP3DScreenType` enum identifying all navigable screens |
| `connection_status_screen.h/.cpp` ([Common Screens](connection_status_screen.md)) | The full-screen overlay opened on tap; accepts `ConnectionStatusScreenConfig` carrying `return_screen` |
| LVGL (`lvgl.h`) | Widget toolkit — `lv_obj_t`, `lv_img`, `lv_spinner`, `lv_timer`, event system |

---

## Integration Example

```cpp
// Inside a FluidNC host screen's create() function:

ConnectionStatusConfig cs_config;
cs_config.align          = ConnectionStatusComponent::get_alignment();
cs_config.x_offset       = ConnectionStatusComponent::get_x_position();
cs_config.y_offset       = ConnectionStatusComponent::get_y_position();
cs_config.return_screen  = ESP3DScreenType::main;
cs_config.prepare_parent_screen_destruction = myScreen::prepareForDestruction;

auto* cs_component = new ConnectionStatusComponent(
    screen_obj,                 // parent lv_obj_t*
    ESP3DScreenType::main,      // host screen identity
    cs_config,
    current_orientation_angle   // int32_t degrees
);

if (!cs_component->isValid()) {
    delete cs_component;
    // handle error
}
```

During screen teardown:

```cpp
// Safe to call from inside an LVGL event callback:
cs_component->prepareForDestruction();
// Destructor runs when the object goes out of scope or is deleted.
```

---

## Related Documentation

| Document | Topic |
|---|---|
| [`connection_status_screen.md`](connection_status_screen.md) | The full-screen overlay this component opens on tap |
| [`screen_transitions_flow.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md) | Safe screen transition patterns (timer-based destroy) |
| [`screens_architecture.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md) | Overall screen / component architecture |
| [`values.md`](values.md) | `ESP3DValues` observable system — how status subscriptions work |
| [`connection_management.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) | Transport lifecycle and the `?` / `T` / `C` / `A` / `.` status model |
| [`fluidnc_module_change_tool.md`](fluidnc_module_change_tool.md) | Sibling FluidNC screen that embeds this component |
| [`fluidnc_module_files.md`](fluidnc_module_files.md) | Sibling FluidNC screen that embeds this component |
| [`fluidnc_module_probe.md`](fluidnc_module_probe.md) | Sibling FluidNC screen that embeds this component |
