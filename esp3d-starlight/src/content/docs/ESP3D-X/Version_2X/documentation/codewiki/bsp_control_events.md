---
title: "BSP Control Events"
---

# BSP Control Events

## Introduction

The `bsp_control_events` module is the **hardware-to-UI event bridge** layer of the Board Support Package (BSP). It defines the unified event payload structure (`control_event_t`) and the custom LVGL event registration system (`control_events_init`) that translate physical hardware inputs — buttons, rotary encoders, 4-position switches, potentiometers, and touchscreens — into LVGL events consumable by UI screens.

Every supported board carries its own copy of these files, but the structure and API are identical across all boards. This uniformity lets upper-layer screen code handle control events independently of which physical hardware or board is present.

This module is a direct child of [bsp_board_initialization](bsp_board_initialization.md) (which calls `control_events_init()`) and a sibling of [bsp_physical_inputs](bsp.md) (which provides the raw hardware read functions). The events it produces are consumed by the [UI Framework screens](UI_Framework_and_Screens.md) and [CNC UI screens](cnc_shared.md).

---

## Architecture Overview

```mermaid
graph TD
    subgraph BSP["Board Support Package (BSP)"]
        direction TB
        HW["Physical Hardware Drivers<br/>(bsp_physical_inputs)"]
        CB["LVGL Read Callbacks<br/>button_read_cb / encoder_read_cb<br/>switch_read_cb / potentiometer_read_cb<br/>touch_read_cb"]
        CE["bsp_control_events<br/>control_event_t · control_family_t<br/>control_events_init()"]
    end

    subgraph LVGL["LVGL Event System"]
        STD["Standard Events<br/>LV_EVENT_PRESSED<br/>LV_EVENT_RELEASED<br/>LV_EVENT_KEY"]
        CUSTOM["Custom Events (registered at runtime)<br/>LV_EVENT_SWITCH_PRESSED<br/>LV_EVENT_SWITCH_RELEASED<br/>LV_EVENT_POTENTIOMETER_CHANGED"]
    end

    subgraph UI["UI Layer"]
        SCREEN["Active Screen<br/>(lv_screen_active())"]
        CNC["CNC Screens<br/>jog_screen · status_screen<br/>macro_screen…"]
    end

    HW -->|raw reads| CB
    CB -->|builds control_event_t| CE
    CE -->|lv_obj_send_event| STD
    CE -->|lv_obj_send_event| CUSTOM
    STD --> SCREEN
    CUSTOM --> SCREEN
    SCREEN --> CNC
```

---

## Module Files

The module is replicated per board under `boards/<board>/components/bsp/`. All boards share an **identical structure** for `control_event_t` and `control_family_t`.

| File | Role |
|------|------|
| `control_types.h` | Type definitions: `control_family_t` enum, custom event `extern` declarations, `control_events_init()` prototype |
| `control_types.c` | Implementation of `control_events_init()` — registers custom event IDs with LVGL |
| `control_event.h` | Defines the unified `control_event_t` payload struct (includes `control_types.h`) |
| `esp3d_snapshot.h` | *(pibot_pendant_v1_0 only)* Thread-safe `snapshot_state_t` for screen capture |

### Board Coverage

| Board | `control_event.h` | `control_types.c` | `esp3d_snapshot.h` |
|-------|:-----------------:|:-----------------:|:------------------:|
| `dlc32_max_lcd` | ✓ | — | — |
| `esp32_2432s028r` | ✓ | ✓ | — |
| `esp32_3248s035c` | ✓ | ✓ | — |
| `esp32_3248s035r` | ✓ | ✓ | — |
| `esp32s3_4827s043c` | ✓ | ✓ | — |
| `esp32s3_8048_touch_lcd_7` | ✓ | ✓ | — |
| `esp32s3_8048s043c` | ✓ | ✓ | — |
| `esp32s3_8048s050c` | ✓ | ✓ | — |
| `esp32s3_8048s070c` | ✓ | ✓ | — |
| `esp32s3_bzm_tft35_gt911` | ✓ | ✓ | — |
| `esp32s3_hmi43v3` | ✓ | ✓ | — |
| `esp32s3_zx3d50ce02s_usrc_4832` | ✓ | ✓ | — |
| `pibot_pendant_v1_0` | ✓ | ✓ | ✓ |

---

## Data Structures

### `control_family_t` — Hardware Input Family

Defined in `control_types.h`. Classifies the physical source of a control event.

```c
typedef enum {
    CONTROL_FAMILY_BUTTONS      = 0, // Momentary push buttons (up to 3)
    CONTROL_FAMILY_SWITCH,           // 4-position rotary/toggle switch
    CONTROL_FAMILY_TOUCH,            // Touchscreen (reserved for future use)
    CONTROL_FAMILY_ENCODER,          // Rotary quadrature encoder
    CONTROL_FAMILY_POTENTIOMETER     // Analog potentiometer (ADC)
} control_family_t;
```

### `control_event_t` — Unified Event Payload

Defined in `control_event.h`. This struct is passed as the `user_data` pointer in every `lv_obj_send_event()` call made by the BSP read callbacks. The receiving screen casts the event data back to `control_event_t *`.

```c
typedef struct {
    lv_indev_t        *indev;          // LVGL input device handle for this control
    uint32_t           btn_id;         // 0-based index: which button/switch position fired
    lv_indev_type_t    type;           // LVGL device type (BUTTON, ENCODER, POINTER…)
    control_family_t   family_id;      // Which hardware family fired this event
    int32_t            steps;          // Encoder: ±1 per detent; Potentiometer: 0–100 mapped
    uint32_t           press_duration; // Time button was held (ms); 0 for non-buttons
} control_event_t;
```

**Field semantics by family:**

| `family_id` | `btn_id` | `steps` | `press_duration` | LVGL event code sent |
|-------------|----------|---------|------------------|----------------------|
| `CONTROL_FAMILY_BUTTONS` | 0, 1, 2 | 0 | ms held | `LV_EVENT_PRESSED` / `LV_EVENT_RELEASED` |
| `CONTROL_FAMILY_SWITCH` | 0–3 (position) | 0 | 0 | `LV_EVENT_SWITCH_PRESSED` / `LV_EVENT_SWITCH_RELEASED` |
| `CONTROL_FAMILY_ENCODER` | 0 | +1 (CW) / -1 (CCW) | 0 | `LV_EVENT_KEY` |
| `CONTROL_FAMILY_POTENTIOMETER` | 0 | 0–100 (mapped ADC) | 0 | `LV_EVENT_POTENTIOMETER_CHANGED` |
| `CONTROL_FAMILY_TOUCH` | — | — | — | LVGL native touch events (no `control_event_t`) |

### `snapshot_state_t` — Screen Capture State *(pibot_pendant_v1_0 only)*

Defined in `esp3d_snapshot.h`, conditionally compiled under `#if ESP3D_SNAPSHOT_FEATURE`.

```c
typedef struct {
    FILE                *file;              // Open output file handle
    volatile bool        error;             // Error flag (set on I/O failure)
    uint32_t             expected_pixels;   // Total pixel count for the full capture
    volatile uint32_t    captured_pixels;   // Pixels written so far (volatile, atomic access)
    SemaphoreHandle_t    mutex;             // FreeRTOS mutex for concurrent access
    volatile bool        initialized;       // System initialised flag
    volatile bool        ongoing;           // Capture in progress (replaces .active)
} snapshot_state_t;

extern snapshot_state_t g_snapshot;
```

This structure is accessed from both the LVGL render task (Core 1) and snapshot management code. The `mutex` and `volatile` markers ensure safe concurrent access. See the [Factory App Snapshot documentation](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/Factory/Snapshot%20system.md) for snapshot lifecycle management.

---

## Custom LVGL Events

The module registers three events that extend LVGL's built-in event set. Because they are registered via `lv_event_register_id()` at runtime, they receive IDs outside LVGL's reserved range and are **never intercepted by LVGL's native widget event routing**.

| Global Variable | Registered By | Fired When |
|-----------------|---------------|------------|
| `LV_EVENT_SWITCH_PRESSED` | `control_events_init()` | A 4-position switch changes to a new position |
| `LV_EVENT_SWITCH_RELEASED` | `control_events_init()` | The previous switch position is released |
| `LV_EVENT_POTENTIOMETER_CHANGED` | `control_events_init()` | Potentiometer ADC value exceeds the adaptive change threshold |

All three are declared `extern` in `control_types.h` and initialized to `LV_EVENT_ALL` (sentinel) at module scope in `control_types.c`. Valid IDs are assigned only after `control_events_init()` runs.

> ⚠️ **LVGL constraint:** Do not use these event code variables before `control_events_init()` has been called. Their initial value `LV_EVENT_ALL` will match every event and cause incorrect dispatch.

---

## API Reference

### `control_events_init()`

```c
void control_events_init(void);
// Declared in: control_types.h
// Implemented in: control_types.c
```

**Registers the three custom LVGL event codes.** Must be called **after** `lv_init()` and **before** any read callback can fire.

- Called unconditionally from `board_init()` on every board that has a display (`#if ESP3D_DISPLAY_FEATURE`).
- Internally calls `lv_event_register_id()` three times, storing returned codes in the global `lv_event_code_t` variables.
- Safe to call only once per boot; re-calling would double-register and waste event IDs.

---

## Initialization Flow

```mermaid
sequenceDiagram
    participant App as Application (main.cpp)
    participant BI as board_init()
    participant HW as Physical Hardware Init
    participant LVGL as init_lvgl()
    participant CEI as control_events_init()

    App->>BI: board_init()
    BI->>HW: phy_buttons_configure() [if BUTTONS feature]
    BI->>HW: phy_encoder_configure() [if ENCODER feature]
    BI->>HW: phy_switch_configure() [if SWITCH feature]
    BI->>HW: phy_potentiometer_configure() [if POTENTIOMETER feature]
    BI->>LVGL: init_lvgl() → lv_init() + register indev callbacks
    BI->>CEI: control_events_init()
    Note over CEI: lv_event_register_id() × 3<br/>assigns LV_EVENT_SWITCH_PRESSED<br/>assigns LV_EVENT_SWITCH_RELEASED<br/>assigns LV_EVENT_POTENTIOMETER_CHANGED
    CEI-->>BI: returns
    BI-->>App: ESP_OK
```

> ⚠️ **Critical ordering constraint:** `control_events_init()` must execute after `lv_init()`. This is enforced by the `board_init()` call sequence. Calling it before `lv_init()` will produce undefined event IDs.

---

## Data Flow: Hardware Input → LVGL Screen

```mermaid
flowchart LR
    subgraph HW["Hardware Layer"]
        PHY["Physical Input<br/>(GPIO / ADC / PCNT)"]
    end

    subgraph BSP_CB["BSP Callbacks (Core 1 - LVGL task)"]
        direction TB
        BCB["button_read_cb()"]
        ECB["encoder_read_cb()"]
        SCB["switch_read_cb()"]
        PCB["potentiometer_read_cb()"]
        TCB["touch_read_cb()"]
    end

    subgraph EVT["Event Construction"]
        CET["control_event_t<br/>{indev, btn_id, type,<br/>family_id, steps,<br/>press_duration}"]
    end

    subgraph LVGL_E["LVGL Send"]
        SEND["lv_obj_send_event(<br/>active_screen,<br/>event_code,<br/>&control_event)"]
    end

    subgraph UI_S["UI Screen Handler"]
        SCR["on_xxx_press() / on_xxx_release()<br/>encoder_event_handler()<br/>switch_event_cb()<br/>potentiometer_event_cb()"]
    end

    PHY -->|phy_buttons_read| BCB
    PHY -->|phy_encoder_read| ECB
    PHY -->|phy_switch_read| SCB
    PHY -->|phy_potentiometer_read| PCB
    PHY -->|touch driver| TCB

    BCB -->|PRESSED / RELEASED| CET
    ECB -->|KEY + steps| CET
    SCB -->|SWITCH_PRESSED / RELEASED| CET
    PCB -->|POTENTIOMETER_CHANGED| CET
    CET --> SEND
    SEND --> SCR
```

### Event Code Mapping

| Read Callback | Event Trigger | LVGL Event Code Sent |
|---------------|--------------|----------------------|
| `button_read_cb` | Press detected (rising edge) | `LV_EVENT_PRESSED` |
| `button_read_cb` | Release detected (falling edge) | `LV_EVENT_RELEASED` (with `press_duration`) |
| `encoder_read_cb` | Rotation detected (adaptive throttle) | `LV_EVENT_KEY` (one event per detent, max 5 per call) |
| `switch_read_cb` | Previous position released | `LV_EVENT_SWITCH_RELEASED` |
| `switch_read_cb` | New position pressed | `LV_EVENT_SWITCH_PRESSED` |
| `potentiometer_read_cb` | ADC change exceeds adaptive threshold | `LV_EVENT_POTENTIOMETER_CHANGED` |

---

## Activity Manager Integration

All read callbacks interact with the activity manager (see [Core Platform & Application Services](Core_Platform_and_Infrastructure.md)) via `activity_process_event()` before dispatching events. This implements **screen wake-up logic**:

- If `activity_process_event()` returns `false`, the input was consumed as a **wake-up event** — no LVGL event is dispatched for that press/rotation.
- If `true`, normal LVGL event dispatch proceeds.
- The encoder callback applies a **100 ms throttle** on `activity_process_event()` calls to prevent excessive wake checks during sustained rotation.

```mermaid
flowchart TD
    A["Input detected"] --> B{"activity_process_event()"}
    B -->|"returns false\n(wake-up consumed)"| C["Suppress LVGL event\nmark button consumed"]
    B -->|"returns true\n(system already active)"| D["Build control_event_t\nlv_obj_send_event()"]
```

The button callback additionally tracks a `button_consumed_for_wakeup[]` flag per button index to suppress the corresponding **release** event when the press was used for wake-up.

---

## PiBot Pendant: Full Control Matrix

The `pibot_pendant_v1_0` board is the most input-rich configuration and exercises all `control_family_t` values simultaneously:

```mermaid
graph LR
    subgraph Inputs["Physical Inputs (pibot_pendant_v1_0)"]
        B0["Button 0"] & B1["Button 1"] & B2["Button 2"]
        ENC["Rotary Encoder"]
        SW0["Switch pos 0"] & SW1["Switch pos 1"] & SW2["Switch pos 2"] & SW3["Switch pos 3"]
        POT["Potentiometer (ADC)"]
        TS["Touchscreen (XPT2046)"]
    end

    subgraph LVGL_I["LVGL indev handles"]
        ID_B["button indev\n(CONTROL_FAMILY_BUTTONS)"]
        ID_E["encoder indev\n(CONTROL_FAMILY_ENCODER)"]
        ID_S["switch indev\n(CONTROL_FAMILY_SWITCH)"]
        ID_P["pointer indev\n(CONTROL_FAMILY_POTENTIOMETER)"]
        ID_T["touch indev\n(CONTROL_FAMILY_TOUCH)"]
    end

    B0 & B1 & B2 --> ID_B
    ENC --> ID_E
    SW0 & SW1 & SW2 & SW3 --> ID_S
    POT --> ID_P
    TS --> ID_T
```

### Encoder Adaptive Speed

The encoder callback implements **4-level adaptive throttling** to balance responsiveness vs. CPU load on Core 1:

| Time since last event | Min interval enforced | Use case |
|----------------------|-----------------------|----------|
| ≥ `ENCODER_SPEED_THRESHOLD_SLOW_MS` | 80 ms | Slow deliberate rotation |
| ≥ `ENCODER_SPEED_THRESHOLD_NORMAL_MS` | 40 ms | Normal rotation |
| ≥ `ENCODER_SPEED_THRESHOLD_FAST_MS` | 20 ms | Fast rotation |
| < fast threshold | 10 ms | Very fast spin |

A hard cap of **5 events per callback invocation** prevents LVGL task overload during rapid turns.

### Potentiometer Adaptive Threshold

The potentiometer callback uses a **direction-aware adaptive threshold** (ADC value mapped to 0–100) to distinguish intentional changes from ADC noise:

| Condition | Threshold | Reason |
|-----------|-----------|--------|
| After `POT_INACTIVITY_THRESHOLD_MS` of silence | `POT_WAKE_THRESHOLD_MAPPED` | Filters ADC noise during idle to prevent false wake-ups |
| Direction reversal detected | 1 | Ultra-sensitive on reversal (active use) |
| Descending value (100→0) | 2 | More responsive for CNC feed-rate override decrease |
| Ascending value (0→100) | 3 | Normal sensitivity |

---

## Component Interaction Diagram

```mermaid
graph TD
    subgraph BSP_CE["bsp_control_events (this module)"]
        CTH["control_types.h\ncontrol_family_t enum\nLV_EVENT_xxx extern declarations\ncontrol_events_init() prototype"]
        CTC["control_types.c\ncontrol_events_init() implementation\nlv_event_register_id() × 3"]
        CEH["control_event.h\ncontrol_event_t struct"]
        SSH["esp3d_snapshot.h\nsnapshot_state_t\n(pibot_pendant_v1_0 only)"]
    end

    subgraph BSP_BOARD["bsp_board_initialization"]
        BI["board_init()\ncalls control_events_init()\nafter lv_init()"]
        CB["Read callbacks\nbutton_read_cb()\nencoder_read_cb()\nswitch_read_cb()\npotentiometer_read_cb()"]
    end

    subgraph PHY["bsp_physical_inputs"]
        PHY_DRV["phy_buttons\nphy_encoder\nphy_switch\nphy_potentiometer"]
    end

    subgraph LVGL_LAYER["LVGL"]
        LVGL_INIT["lv_init()"]
        LVGL_REG["lv_event_register_id()"]
        LVGL_SEND["lv_obj_send_event()"]
    end

    subgraph UI["UI Screens"]
        GENERIC["Generic Screens\n(UI Framework)"]
        CNC_SCR["CNC Screens\n(CNC Firmware UI)"]
    end

    CTH --> CEH
    CTH --> CTC
    LVGL_INIT -->|must precede| CTC
    CTC -->|registers custom IDs| LVGL_REG

    BI -->|calls after lv_init| CTC
    CB -->|reads hardware via| PHY_DRV
    CB -->|builds| CEH
    CB -->|sends event via| LVGL_SEND

    LVGL_SEND --> GENERIC
    LVGL_SEND --> CNC_SCR
```

---

## Key Design Decisions

### Why a unified `control_event_t`?

Rather than separate structures per input type, a single payload lets screens register **one LVGL event handler** and dispatch on `family_id`. This keeps the UI layer decoupled from hardware specifics and avoids per-board screen code divergence.

### Why custom LVGL events for Switch and Potentiometer?

`LV_EVENT_PRESSED` and `LV_EVENT_RELEASED` are intercepted and consumed by LVGL's widget system (buttons, lists, etc.) before propagating to the screen object. Custom event codes registered via `lv_event_register_id()` bypass widget interception — they reach the screen object directly, enabling switch and potentiometer events to drive screen-level logic without interference.

### Why replicate per board instead of a shared component?

Each board's BSP component is intentionally self-contained. The `control_types.h` / `control_event.h` pair is small (no board-specific logic), making duplication low-cost. The build system remains simple — each board's `CMakeLists.txt` configures only its own BSP component with no cross-board dependencies.

---

## Related Documentation

| Document | Relationship |
|----------|-------------|
| [bsp_board_initialization](bsp_board_initialization.md) | Calls `control_events_init()` from `board_init()` after LVGL init; implements the read callbacks |
| [bsp (bsp_physical_inputs)](bsp.md) | Provides `phy_xxx_read()` functions consumed by the read callbacks |
| [UI Framework & Generic Screens](UI_Framework_and_Screens.md) | Screens receive and handle `control_event_t` via LVGL event handlers |
| [CNC Firmware UI Screens](cnc_shared.md) | `switch_event_cb`, `encoder_event_handler`, `potentiometer_event_cb` process control events |
| [Core Platform & Application Services](Core_Platform_and_Infrastructure.md) | `activity_manager` / `activity_process_event()` integrated in all read callbacks |
| [Input System Architecture](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/Input_system.md) | Higher-level description of the input handling strategy |
| [Factory App — Snapshot System](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/Factory/Snapshot%20system.md) | `snapshot_state_t` lifecycle and usage detail |
