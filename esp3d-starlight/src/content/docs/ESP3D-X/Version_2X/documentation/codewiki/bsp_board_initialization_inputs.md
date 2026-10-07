---
title: "BSP Board Initialization — Physical Inputs"
---

# BSP Board Initialization — Physical Inputs

## Overview

The `bsp_board_initialization_inputs` module contains the four LVGL input-device (indev) read callbacks that bridge raw physical hardware into LVGL's event system on the **PiBot CNC Pendant v1.0** board. It is the only board in the multi-board firmware that includes this module, because it is the only target that ships a full physical control panel in addition to a touchscreen.

The four callbacks defined here are:

| Callback | Guard | Physical device | LVGL indev type |
|---|---|---|---|
| `button_read_cb` | `ESP3D_HARDWARE_BUTTONS_FEATURE` | 3 push-buttons | `LV_INDEV_TYPE_BUTTON` |
| `encoder_read_cb` | `ESP3D_HARDWARE_ENCODER_FEATURE` | Rotary quadrature encoder | `LV_INDEV_TYPE_ENCODER` |
| `switch_read_cb` | `ESP3D_HARDWARE_SWITCH_FEATURE` | 4-position selector switch | `LV_INDEV_TYPE_BUTTON` |
| `potentiometer_read_cb` | `ESP3D_HARDWARE_POTENTIOMETER_FEATURE` | Analog potentiometer (ADC) | `LV_INDEV_TYPE_POINTER` |

All four callbacks share the same design contract:

1. **Read** raw hardware state from the underlying physical driver (see [bsp_physical_inputs.md](bsp_physical_inputs.md)).
2. **Validate** state changes with edge-detection — only transitions fire events, not sustained levels.
3. **Gate** events through the `activity_manager` so the first input after a display timeout wakes the screen without triggering a functional action.
4. **Dispatch** a typed `control_event_t` payload to the active LVGL screen via `lv_obj_send_event()`.

The callbacks are *registered* inside `init_lvgl()` (see [bsp_board_initialization_lvgl.md](bsp_board_initialization_lvgl.md)), and the custom LVGL event codes they use are registered by `control_events_init()` (see [bsp_bsp_control_events.md](bsp_bsp_control_events.md)).

---

## Module Location

| Attribute | Value |
|---|---|
| **Source file** | `boards/pibot_pendant_v1_0/components/bsp/board_init.c` |
| **Board** | `pibot_pendant_v1_0` only |
| **Parent module** | [bsp_board_initialization.md](bsp_board_initialization.md) |
| **Sibling modules** | [bsp_board_initialization_lvgl.md](bsp_board_initialization_lvgl.md), [bsp_board_initialization_display.md](bsp_board_initialization_display.md), [bsp_board_initialization_touch.md](bsp_board_initialization_touch.md) |
| **Physical drivers** | [bsp_physical_inputs.md](bsp_physical_inputs.md) |
| **Event types** | [bsp_bsp_control_events.md](bsp_bsp_control_events.md) |

---

## Architecture Overview

```mermaid
graph TD
    subgraph BSP_Layer["BSP - pibot_pendant_v1_0"]
        BI["board_init()"]
        IL["init_lvgl()"]
        CE["control_events_init()"]

        subgraph Callbacks["Input Callbacks (this module)"]
            BRC["button_read_cb()"]
            ERC["encoder_read_cb()"]
            SRC["switch_read_cb()"]
            PRC["potentiometer_read_cb()"]
        end
    end

    subgraph Physical_Drivers["Physical Input Drivers\nbsp_physical_inputs"]
        PB["phy_buttons_read()"]
        PE["phy_encoder_read()"]
        PS["phy_switch_read()"]
        PP["phy_potentiometer_read()"]
    end

    subgraph LVGL_Layer["LVGL Indev Framework"]
        BINDEV["button_indev\nLV_INDEV_TYPE_BUTTON"]
        EINDEV["encoder_indev\nLV_INDEV_TYPE_ENCODER"]
        SINDEV["switch_indev\nLV_INDEV_TYPE_BUTTON"]
        PINDEV["potentiometer_indev\nLV_INDEV_TYPE_POINTER"]
    end

    subgraph Application["Application Layer"]
        AM["activity_manager\nactivity_process_event()"]
        AS["Active LVGL Screen\nlv_screen_active()"]
    end

    BI --> IL
    BI --> CE
    IL --> BINDEV & EINDEV & SINDEV & PINDEV

    BINDEV -- "read_cb poll" --> BRC
    EINDEV -- "read_cb poll" --> ERC
    SINDEV -- "read_cb poll" --> SRC
    PINDEV -- "read_cb poll" --> PRC

    BRC --> PB
    ERC --> PE
    SRC --> PS
    PRC --> PP

    BRC <--> AM
    ERC <--> AM
    SRC --> AM
    PRC --> AM

    BRC -- "control_event_t\nLV_EVENT_PRESSED / RELEASED" --> AS
    ERC -- "control_event_t\nLV_EVENT_KEY" --> AS
    SRC -- "control_event_t\nLV_EVENT_SWITCH_PRESSED / RELEASED" --> AS
    PRC -- "control_event_t\nLV_EVENT_POTENTIOMETER_CHANGED" --> AS
```

---

## Data Flow

```mermaid
flowchart LR
    HW["Physical Hardware\nGPIO / PCNT / ADC"]

    subgraph PHY["phy_* drivers"]
        PB["phy_buttons_read(states[3])"]
        PE["phy_encoder_read(&clicks)"]
        PS["phy_switch_read(states[4])"]
        PP["phy_potentiometer_read(&adc_value)"]
    end

    subgraph CBACKS["BSP Callbacks (this module)"]
        BRC["button_read_cb\nedge detect x3\nwake-up gating\npress_duration track"]
        ERC["encoder_read_cb\nadaptive speed throttle\nrotation invert option\nmax 5 events / poll"]
        SRC["switch_read_cb\nedge detect x4\ninvalid state reject"]
        PRC["potentiometer_read_cb\nADC to 0..100 map\nadaptive threshold\ndirection tracking"]
    end

    subgraph EVENTS["LVGL Events dispatched to active screen"]
        E1["LV_EVENT_PRESSED\nLV_EVENT_RELEASED\n(CONTROL_FAMILY_BUTTONS)"]
        E2["LV_EVENT_KEY\n(CONTROL_FAMILY_ENCODER)"]
        E3["LV_EVENT_SWITCH_PRESSED\nLV_EVENT_SWITCH_RELEASED\n(CONTROL_FAMILY_SWITCH)"]
        E4["LV_EVENT_POTENTIOMETER_CHANGED\n(CONTROL_FAMILY_POTENTIOMETER)"]
    end

    AM["activity_manager\nwake-up arbitration"]

    HW --> PB & PE & PS & PP
    PB --> BRC
    PE --> ERC
    PS --> SRC
    PP --> PRC

    BRC <--> AM
    ERC <--> AM
    SRC --> AM
    PRC --> AM

    BRC --> E1
    ERC --> E2
    SRC --> E3
    PRC --> E4
```

---

## `control_event_t` Payload

All four callbacks fill a `control_event_t` struct and pass it as the LVGL event user-data pointer. The receiving screen inspects `family_id` to distinguish the input source when multiple indev types are active simultaneously.

```c
typedef struct {
    lv_indev_t      *indev;          // Handle of the LVGL indev that fired
    uint32_t         btn_id;         // Button / switch position index (0-based)
    lv_indev_type_t  type;           // LVGL indev type
    control_family_t family_id;      // BUTTONS / ENCODER / SWITCH / POTENTIOMETER
    int32_t          steps;          // Encoder: +/-1 per click  |  Potentiometer: 0-100
    uint32_t         press_duration; // Buttons: hold time ms    |  others: 0
} control_event_t;
```

| Callback | `btn_id` | `family_id` | `steps` | `press_duration` |
|---|---|---|---|---|
| `button_read_cb` | 0 / 1 / 2 | `CONTROL_FAMILY_BUTTONS` | 0 | ms since press |
| `encoder_read_cb` | 0 | `CONTROL_FAMILY_ENCODER` | +1 or -1 | 0 |
| `switch_read_cb` | 0 / 1 / 2 / 3 | `CONTROL_FAMILY_SWITCH` | 0 | 0 |
| `potentiometer_read_cb` | 0 | `CONTROL_FAMILY_POTENTIOMETER` | 0-100 | 0 |

---

## Callback Details

### `button_read_cb`

**Guard:** `ESP3D_HARDWARE_BUTTONS_FEATURE`  
**Manages:** 3 push-buttons (indices 0, 1, 2)  
**LVGL indev type:** `LV_INDEV_TYPE_BUTTON`

The callback uses full edge detection across all three buttons inside a single LVGL poll. It deliberately processes **all release edges before all press edges** to avoid losing transitions when both occur in the same poll window.

#### State variables

| Variable | Purpose |
|---|---|
| `last_states[3]` | Previous button state per button (edge detection) |
| `button_consumed_for_wakeup[3]` | Marks a press that caused a wake-up — its paired release is also suppressed |
| `press_start_time[3]` | Timestamp (ms) of each press start, used to compute `press_duration` on release |
| `button_events[3]` | Pre-allocated `control_event_t` per button; `btn_id` = 0/1/2, `family_id` = `CONTROL_FAMILY_BUTTONS` |

#### Process flow

```mermaid
flowchart TD
    A["button_read_cb invoked"] --> B["phy_buttons_read(states[3])"]
    B -- "ESP_ERR" --> Z["return - no events"]
    B -- "ESP_OK" --> C

    C["Pass 1: scan all buttons for RELEASE\nlast=pressed AND current=released"] --> D{{"Transition found\nfor button i?"}}
    D -- "yes" --> E{"consumed_for_wakeup[i]?"}
    E -- "yes" --> F["Clear flag\nSkip release event"]
    E -- "no" --> G["activity_process_event()\nCalculate press_duration\nSend LV_EVENT_RELEASED with control_event_t"]
    D -- "no" --> H["Continue to Pass 2"]
    F --> H
    G --> H

    H["Pass 2: scan all buttons for PRESS\nlast=released AND current=pressed"] --> I{{"Transition found\nfor button i?"}}
    I -- "yes" --> J{"activity_process_event()\nreturns true?"}
    J -- "true (active)" --> K["Record press_start_time\nSend LV_EVENT_PRESSED with control_event_t"]
    J -- "false (wake-up)" --> L["Set consumed_for_wakeup[i]=true\nSuppress event"]
    I -- "no" --> M["End"]
    K --> M
    L --> M
```

#### Events dispatched

| LVGL Event | Condition |
|---|---|
| `LV_EVENT_PRESSED` | Rising edge, system was already active |
| `LV_EVENT_RELEASED` | Falling edge, press was not a wake-up |

---

### `encoder_read_cb`

**Guard:** `ESP3D_HARDWARE_ENCODER_FEATURE`  
**Manages:** Single quadrature rotary encoder (ESP32 PCNT-based)  
**LVGL indev type:** `LV_INDEV_TYPE_ENCODER`

The encoder driver accumulates pulse counts between polls. This callback converts the accumulated count into throttled `LV_EVENT_KEY` events using an adaptive speed system that reduces latency for fast spins while still filtering noise at slow speeds.

#### Adaptive speed thresholds

| `time_since_last` | Applied `min_interval` | Effect |
|---|---|---|
| >= `ENCODER_SPEED_THRESHOLD_SLOW_MS` | 80 ms | Slow turn — relaxed gating |
| >= `ENCODER_SPEED_THRESHOLD_NORMAL_MS` | 40 ms | Normal turn |
| >= `ENCODER_SPEED_THRESHOLD_FAST_MS` | 20 ms | Fast turn |
| < `ENCODER_SPEED_THRESHOLD_FAST_MS` | 10 ms | Very fast — minimal suppression |

At most **5 events** are generated per poll cycle to prevent LVGL queue saturation during rapid spins.

#### Process flow

```mermaid
flowchart TD
    A["encoder_read_cb invoked"] --> B["phy_encoder_read(&clicks)"]
    B -- "clicks == 0" --> Z["data->RELEASED, return"]
    B -- "clicks != 0" --> C

    C["Activity throttle: 100 ms window"] --> D{"activity_process_event()\nwake-up?"}
    D -- "wake-up (false)" --> Z2["Ignore all encoder events\ndata->RELEASED, return"]
    D -- "active (true)" --> E

    E["time_since_last = now - last_output_time"] --> F{"< 10 ms?"}
    F -- "yes" --> Z3["Skip: too fast\ndata->RELEASED, return"]
    F -- "no" --> G

    G["Select min_interval\nbased on time_since_last"] --> H{"time_since_last\n>= min_interval?"}
    H -- "no" --> Z4["Skip\ndata->RELEASED, return"]
    H -- "yes" --> I

    I["Apply ENCODER_INVERT_ROTATION flag\nstep = +/-1, key = LV_KEY_RIGHT/LEFT\nevents_to_send = min(abs_clicks, 5)"] --> J["Loop: send N x LV_EVENT_KEY\nwith control_event_t.steps = step"]
    J --> K["Update last_output_time after each event"]
```

#### Events dispatched

| LVGL Event | `data->key` | `control_event_t.steps` |
|---|---|---|
| `LV_EVENT_KEY` (clockwise) | `LV_KEY_RIGHT` | +1 |
| `LV_EVENT_KEY` (counter-CW) | `LV_KEY_LEFT` | -1 |

---

### `switch_read_cb`

**Guard:** `ESP3D_HARDWARE_SWITCH_FEATURE`  
**Manages:** 4-position selector switch (indices 0, 1, 2, 3)  
**LVGL indev type:** `LV_INDEV_TYPE_BUTTON`

The selector switch encodes a physical position as exactly one active GPIO among four. The callback validates the reading, rejects invalid states (e.g. multiple positions simultaneously active during mechanical bouncing), and fires one press event on position change and one release event on the old position de-asserting.

> **Important:** Invalid states (`ESP_ERR_INVALID_RESPONSE`) are silently discarded *without* calling `activity_process_event()`. This prevents spurious display wake-ups during mechanical switch transitions.

#### Process flow

```mermaid
flowchart TD
    A["switch_read_cb invoked"] --> B["phy_switch_read(states[4])"]
    B -- "ESP_ERR_INVALID_RESPONSE" --> W["Log warning\nDo NOT trigger activity\nreturn"]
    B -- "Other ESP_ERR" --> E2["Log error, return"]
    B -- "ESP_OK" --> C

    C["Scan for RELEASE\nlast=true AND current=false"] --> D{{"Position i released?"}}
    D -- "yes" --> F["Send LV_EVENT_SWITCH_RELEASED\nlast_states[i]=false\nreturn"]
    D -- "no match" --> G

    G["Scan for PRESS\nlast=false AND current=true"] --> H{{"Position i pressed?"}}
    H -- "yes" --> I["activity_process_event()\nSend LV_EVENT_SWITCH_PRESSED\nlast_states[i]=true\nreturn"]
    H -- "no match" --> Z["No change"]
```

#### Events dispatched (runtime-registered custom codes)

| LVGL Event | Registered by |
|---|---|
| `LV_EVENT_SWITCH_PRESSED` | `control_events_init()` via `lv_event_register_id()` |
| `LV_EVENT_SWITCH_RELEASED` | `control_events_init()` via `lv_event_register_id()` |

---

### `potentiometer_read_cb`

**Guard:** `ESP3D_HARDWARE_POTENTIOMETER_FEATURE`  
**Manages:** Single analog potentiometer on an ESP32 ADC channel  
**LVGL indev type:** `LV_INDEV_TYPE_POINTER`

The potentiometer provides a continuous 12-bit ADC reading (0–4095) mapped to a 0–100 integer range. ADC readings contain thermal and electrical noise that can oscillate around a stable mechanical position. The callback uses an adaptive threshold that tightens during active use and relaxes during inactivity to separate genuine movement from noise.

#### Adaptive threshold logic

| Condition | Threshold | Rationale |
|---|---|---|
| After `POT_INACTIVITY_THRESHOLD_MS` idle | `POT_WAKE_THRESHOLD_MAPPED` (high) | Noise at rest must not wake the display |
| Direction reversal (active use) | 1 | Catch reversals immediately for responsive UI |
| Descent (100 to 0) during active use | 2 | Slightly more sensitive going down |
| Ascent (0 to 100) during active use | 3 | Standard threshold going up |

#### Process flow

```mermaid
flowchart TD
    A["potentiometer_read_cb invoked"] --> B["phy_potentiometer_read(&adc_value)"]
    B -- "ESP_ERR_INVALID_RESPONSE\nno driver-level change" --> Z["data->RELEASED, return"]
    B -- "Other ESP_ERR" --> E2["Log error\ndata->RELEASED, return"]
    B -- "ESP_OK" --> C

    C["mapped = adc_value x 100 / 4095"] --> D{"First read\ninitialization?"}
    D -- "yes" --> INIT["Store last_mapped_value = mapped\nStore last_activity_time = now\nReturn RELEASED"]
    D -- "no" --> E

    E["delta = mapped - last_mapped_value\nDetect direction change"] --> F

    F{"Inactive > POT_INACTIVITY_THRESHOLD_MS?"}
    F -- "yes" --> G["threshold = POT_WAKE_THRESHOLD_MAPPED"]
    F -- "no" --> H{"Direction changed?"}
    H -- "yes" --> I["threshold = 1"]
    H -- "no, delta < 0" --> J["threshold = 2"]
    H -- "no, delta >= 0" --> K["threshold = 3"]

    G & I & J & K --> L{"abs(delta) >= threshold?"}
    L -- "no" --> Z2["data->RELEASED"]
    L -- "yes" --> M["Update last_activity_time\nactivity_process_event()\ncontrol_event_t.steps = mapped\nSend LV_EVENT_POTENTIOMETER_CHANGED\nUpdate last_mapped_value + direction"]
```

#### Events dispatched (runtime-registered custom codes)

| LVGL Event | Registered by | `control_event_t.steps` |
|---|---|---|
| `LV_EVENT_POTENTIOMETER_CHANGED` | `control_events_init()` via `lv_event_register_id()` | Mapped value 0–100 |

---

## Activity Manager Integration

Every callback integrates with `activity_process_event()` from the `esp3d_activity_manager` component. The function simultaneously resets the inactivity timer **and** returns a boolean that indicates whether the system was already awake:

- `true` — system was active; process the event normally and forward it to the UI.
- `false` — this event *caused* the wake-up; consume it silently, do not forward to the UI.

```mermaid
sequenceDiagram
    participant LVGL as LVGL tick
    participant CB as Input Callback
    participant AM as activity_manager
    participant SCR as Active Screen

    Note over LVGL,SCR: Display timeout - screen asleep
    LVGL->>CB: poll read_cb
    CB->>AM: activity_process_event()
    AM-->>CB: false (was sleeping, now awake)
    CB->>CB: mark event as consumed_for_wakeup
    CB-->>LVGL: data->RELEASED (event suppressed)

    Note over LVGL,SCR: Normal active use
    LVGL->>CB: poll read_cb
    CB->>AM: activity_process_event()
    AM-->>CB: true (already active)
    CB->>SCR: lv_obj_send_event(screen, LV_EVENT_*, &control_event_t)
    SCR-->>CB: LV_RES_OK
```

The switch callback does **not** call `activity_process_event()` on invalid states, preventing noise-driven wake-ups during mechanical bouncing.

---

## LVGL Indev Registration Summary

The following table summarises how each indev is configured inside `init_lvgl()`. Button and switch indевs use dummy point coordinates `{-1, -1}` because event routing is performed manually via `lv_obj_send_event()`, bypassing LVGL's internal button-to-point hit-testing.

| Indev handle | `lv_indev_type_t` | `read_cb` | Extra configuration |
|---|---|---|---|
| `button_indev` | `LV_INDEV_TYPE_BUTTON` | `button_read_cb` | `button_points[3]` all set to `{-1, -1}` |
| `encoder_indev` | `LV_INDEV_TYPE_ENCODER` | `encoder_read_cb` | — |
| `switch_indev` | `LV_INDEV_TYPE_BUTTON` | `switch_read_cb` | `switch_points[4]` all set to `{-1, -1}` |
| `potentiometer_indev` | `LV_INDEV_TYPE_POINTER` | `potentiometer_read_cb` | — |

---

## Compile-time Feature Guards

Each callback and its corresponding indev registration are individually wrapped in feature guards, allowing the `pibot_pendant_v1_0` target to be built with any subset of physical inputs enabled.

```mermaid
graph LR
    subgraph Guards["Feature Guards - CMakeLists.txt"]
        F1["ESP3D_HARDWARE_BUTTONS_FEATURE"]
        F2["ESP3D_HARDWARE_ENCODER_FEATURE"]
        F3["ESP3D_HARDWARE_SWITCH_FEATURE"]
        F4["ESP3D_HARDWARE_POTENTIOMETER_FEATURE"]
    end

    F1 --> BRC["button_read_cb\n+ button_indev registration"]
    F2 --> ERC["encoder_read_cb\n+ encoder_indev registration"]
    F3 --> SRC["switch_read_cb\n+ switch_indev registration"]
    F4 --> PRC["potentiometer_read_cb\n+ potentiometer_indev registration"]
```

---

## Initialization Sequence Context

These callbacks are registered as the last hardware step inside `init_lvgl()`, which is itself called near the end of `board_init()`. `control_events_init()` must run *after* `init_lvgl()` because `lv_event_register_id()` requires LVGL to be initialised first.

```mermaid
sequenceDiagram
    participant APP as app_main / ESP3DX::begin()
    participant BI as board_init()
    participant DISP as Display Driver
    participant PHY as phy_* Drivers
    participant IL as init_lvgl()
    participant CE as control_events_init()

    APP->>BI: board_init()
    BI->>BI: activity_manager_init()
    BI->>DISP: backlight_configure() + ili9341_spi_configure()
    BI->>BI: init_touch_controller()         [if TOUCH_FEATURE]
    BI->>PHY: phy_buttons_configure()        [if BUTTONS]
    BI->>PHY: phy_encoder_configure()        [if ENCODER]
    BI->>PHY: phy_switch_configure()         [if SWITCH]
    BI->>PHY: phy_potentiometer_configure()  [if POTENTIOMETER]
    BI->>PHY: buzzer_configure()             [if BUZZER]
    BI->>IL: init_lvgl()
    Note over IL: Registers button_read_cb,<br/>encoder_read_cb,<br/>switch_read_cb,<br/>potentiometer_read_cb<br/>as LVGL indev read callbacks
    IL-->>BI: ESP_OK
    BI->>CE: control_events_init()
    Note over CE: lv_event_register_id() for<br/>LV_EVENT_SWITCH_PRESSED<br/>LV_EVENT_SWITCH_RELEASED<br/>LV_EVENT_POTENTIOMETER_CHANGED
    CE-->>BI: done
    BI-->>APP: ESP_OK
```

---

## Related Documentation

| Document | Relationship |
|---|---|
| [bsp_board_initialization.md](bsp_board_initialization.md) | Parent module — `board_init()` orchestration, all-boards overview |
| [bsp_board_initialization_lvgl.md](bsp_board_initialization_lvgl.md) | Sibling — `init_lvgl()` implementation; where these callbacks are registered |
| [bsp_board_initialization_display.md](bsp_board_initialization_display.md) | Sibling — `lvgl_flush_cb`, `notify_lvgl_flush_ready`, display pipeline |
| [bsp_board_initialization_touch.md](bsp_board_initialization_touch.md) | Sibling — `touch_read_cb`, `init_touch_controller()` |
| [bsp_physical_inputs.md](bsp_physical_inputs.md) | Physical driver layer: `phy_buttons`, `phy_encoder`, `phy_potentiometer`, `phy_switch` |
| [bsp_bsp_control_events.md](bsp_bsp_control_events.md) | `control_event_t` type, `control_events_init()`, custom LVGL event IDs |
