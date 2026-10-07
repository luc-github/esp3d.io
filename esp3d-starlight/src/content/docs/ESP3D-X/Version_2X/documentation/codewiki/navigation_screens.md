---
title: "Navigation Screens"
---

# Navigation Screens

> **Module:** `cnc_shared > navigation_screens`
> **Files:** `main/display/cnc/screens/main_screen.cpp`, `main/display/cnc/screens/information_screen.cpp`

---

## Overview

The `navigation_screens` module contains the two screens that form the top-level navigation layer of the CNC pendant UI.

- **Main screen** — radial hub; first screen after the splash. Provides access to all functional screens via a circular menu. Hosts the connection-status and firmware-status overlay components. Owns the user-facing lock button and reacts in real time to CNC connection changes.
- **Information screen** — read-only system info panel; accessed from main screen section 1. Displays eight labeled lines of static or runtime-resolved data.

Both screens follow the safe transition protocol and are built on the screen base infrastructure. Neither screen performs any UI mutation inside an LVGL event callback.

---

## Position in the Screen Tree

```
Splash
  └── Main  ←── this module
        ├── Settings
        ├── Information  ←── this module
        ├── Status
        ├── Jog
        ├── Files
        ├── Macros        (optional, NVS flag)
        ├── Probe         (optional, NVS flag)
        └── Change Tool   (optional, NVS flag; disabled for GRBL targets)
```

---

## Main Screen

### Files

| File | Namespace |
|---|---|
| `main/display/cnc/screens/main_screen.h` | `mainScreen` |
| `main/display/cnc/screens/main_screen.cpp` | `mainScreen` |

### Public API

```cpp
namespace mainScreen {
    void create();
}
```

`create()` is the only public entry point. It is called by `createScreen(ESP3DScreenType::main)` from the transition system.

---

### Base Class

`CircularMenuScreen` — adds a radial section-picker (`CircularMenuComponent`) to the `GenericScreen` foundation. See [ui_core.md](ui_core.md) for the screen base infrastructure.

---

### Circular Menu Sections

The main screen defines 8 sections in a fixed `circular_menu_section_conf_t` array. The section index directly maps to the `ESP3DScreenType` in `onMenuSectionRelease`:

| Index | Icon | Label | Target screen | Lock-sensitive | Enabled |
|:---:|---|---|---|:---:|---|
| 0 | `settings_m` | `ESP3DLabel::settings` | `settings` | No | Always |
| 1 | `information_m` | `ESP3DLabel::information` | `information` | No | Always |
| 2 | `positions_m` | `ESP3DLabel::status` | `status` | No | Always |
| 3 | `jog_m` | `ESP3DLabel::jog` | `jog` | **Yes** | Always |
| 4 | `files_m` | `ESP3DLabel::files` | `files` | **Yes** | Always |
| 5 | `macros_m` | `ESP3DLabel::macros` | `macros` | **Yes** | NVS `esp3d_macros_enabled` |
| 6 | `probe_m` | `ESP3DLabel::probe` | `probe` | **Yes** | NVS `esp3d_probe_enabled` |
| 7 | `changetool_m` | `ESP3DLabel::change_tool` | `change_tool` | **Yes** | NVS `esp3d_change_tool_enabled`; **always `false`** for `TARGET_IS_GRBL` |

Sections 0–2 are accessible regardless of lock state. Sections 3–7 are disabled when the UI is locked. Sections 5–7 can also be removed at run time by NVS settings.

When the menu is first displayed, `activateFirstAllowedSection()` selects the first section that is both enabled and permitted under the current lock state.

---

### Virtual Buttons

| Button index | Role | Icon | Condition |
|:---:|---|---|---|
| 0 (button 1) | OK — confirms the highlighted section | `ok_b` | Always visible |
| 1 (button 2) | Empty (no action) | — | Always empty |
| 2 (button 3) | Lock / Unlock toggle | `lock_b` / `unlock_b` | Shown only when connected and `getHideLock()` is false |

**OK button behavior:** `onOKButtonPress` calls `simulate_click()` on the current section if the action is allowed; `onOKButtonRelease` calls `releaseSection()` to complete the tap gesture.

**Lock button behavior:** `onLockButtonPress` immediately toggles `userSetLockState()`, updates the button icon, re-runs `activateFirstAllowedSection()`, and plays `ESP3D_LOCK_BEEP` or `ESP3D_SELECTION_BEEP`. The lock state is persisted via `UIManager`.

---

### Connection-Aware Lock System

The main screen manages two independent lock layers through `UIManager`:

| Layer | Persisted | Set by | Cleared by |
|---|:---:|---|---|
| **User lock** (`userSetLockState`) | Yes (NVS) | Lock button press | Lock button press |
| **System lock** (`systemSetLockState`) | No | Disconnect event | Connect event |

`getLockState()` returns `true` if either layer is active.

**At `create()` time:**
1. `locked_at_startup_` captures the current user lock state from NVS.
2. If the CNC connection is already `"C"` (Connected), system lock is cleared immediately and user lock is restored to `locked_at_startup_`.
3. If not connected, system lock is set to `true` and the lock button is hidden.

**On connection state change** (`onConnectionStatusUpdate`):

```
status == "C"  →  systemSetLockState(false)
               →  userSetLockState(locked_at_startup_)
               →  show lock button
               →  update button icon to current user lock state

status != "C"  →  hide lock button
               →  systemSetLockState(true)
```

`ESP3D_NO_CONNECTION_LOCK_FEATURE` (development build flag): forces `is_connected = true` so the lock button is always shown and can be exercised without a live CNC link. The system lock itself stays released.

---

### `server_status` Value Subscription

`onScreenCreated()` subscribes to `ESP3DValuesIndex::server_status` via `esp3dXValues.subscribe()`. The callback `onConnectionStatusUpdate` fires on every status change:

| Value | Meaning |
|---|---|
| `"C"` | Connected to CNC |
| `"T"` | Trying (connecting) |
| `"U"` | Unknown |
| `"?"` | Disconnected / lost connection |

The subscription is removed in `prepareForDestruction()` via `esp3dXValues.unsubscribe()` before any LVGL objects are invalidated. See [values.md](values.md) for the full `ESP3DValues` subscription system.

---

### Overlay Components

Two overlay components are created inside `main_screen_obj_instance->getContainer()`:

| Component | Class | Failure mode |
|---|---|---|
| `ConnectionStatusComponent` | `components/connection_status.h` | Degraded: screen stays usable, overlay omitted |
| `FirmwareStatusComponent` | `components/firmware_status.h` | Degraded: screen stays usable, overlay omitted |

Both components receive `prepareForDestruction` as a callback so they can initiate a screen transition back to `ESP3DScreenType::main` from their own event handlers without holding a raw pointer to the screen namespace. See [ui_components.md](ui_components.md).

Destruction order in `onScreenDestroy`:
1. `connection_status_component` deleted first.
2. `firmware_status_component` deleted second.
3. Screen unregistered from `UIManager`.
4. `main_screen_obj_instance` deleted last.

---

### ActivityMonitoring

`ActivityMonitoring::setup()` is called inside `create()`, not in the splash screen. This is intentional: activity monitoring must not start before the main screen is ready because its idle callbacks may trigger screen transitions. See [activity_monitoring.md](activity_monitoring.md).

---

### Module-Level State Variables

```cpp
lv_timer_t *transition_timer;                    // created by cleanup_timer_cb
static lv_timer_t *cleanup_timer;                // created by ESP3D_TRANSITION_START
static bool is_prepared_for_destruction_;
static bool cleanup_executed_;
static ESP3DScreenType next_screen_target;
ConnectionStatusComponent *connection_status_component;
FirmwareStatusComponent   *firmware_status_component;
CircularMenuScreen        *main_screen_obj_instance;
static bool locked_at_startup_;                  // user lock state captured at create()
```

---

### Lifecycle

```
mainScreen::create()
    │
    ├── ActivityMonitoring::setup()
    ├── ESP3D_TRANSITION_RESET(...)          reset transition state
    ├── locked_at_startup_ = userGetLockState()
    ├── [optional] systemSetLockState(true)  if not connected at creation
    ├── new (nothrow) CircularMenuScreen(...)  LVGL screen + menu
    ├── showMenu()
    ├── new (nothrow) ConnectionStatusComponent(...)  overlay (degraded on failure)
    ├── new (nothrow) FirmwareStatusComponent(...)    overlay (degraded on failure)
    ├── ui_manager.registerScreen(main, ...)
    ├── lv_obj_add_event_cb(..., LV_EVENT_DELETE, onScreenDestroy)
    └── onScreenCreated()
            ├── esp3dXValues.subscribe(server_status, onConnectionStatusUpdate)
            ├── sync lock state with current server_status
            ├── configure lock button visibility
            └── activateFirstAllowedSection()

--- user selects a menu section ---

onMenuSectionRelease(section_id, duration_ms)
    └── ESP3D_TRANSITION_START(cleanup_timer, ..., cleanup_timer_cb)

cleanup_timer_cb()  [0 ms — runs outside LVGL event context]
    └── ESP3D_CLEANUP_TIMER_BODY(...)
            ├── prepareForDestruction()
            │       ├── esp3dXValues.unsubscribe(server_status, ...)
            │       ├── connection_status_component->prepareForDestruction()
            │       ├── firmware_status_component->prepareForDestruction()
            │       └── screen->prepareForDestruction()
            └── lv_timer_create(transition_timer_cb, ESP3D_TRANSITION_SCREEN_DELAY_MS)

transition_timer_cb()  [ESP3D_TRANSITION_SCREEN_DELAY_MS later]
    └── createScreen(next_screen_target)

--- LVGL destroys the old screen object ---

onScreenDestroy(LV_EVENT_DELETE)
    ├── [emergency] prepareForDestruction() if not already called
    ├── delete connection_status_component
    ├── delete firmware_status_component
    ├── ui_manager.unregisterScreen(main)
    └── delete main_screen_obj_instance
```

---

### Allocation Safety

`CircularMenuScreen`, `ConnectionStatusComponent`, and `FirmwareStatusComponent` are all allocated with `new (std::nothrow)` inside a `try/catch`. An uncaught `std::bad_alloc` in the LVGL task context would call `std::terminate` and reboot the board.

- Failure of `CircularMenuScreen` → `create()` returns early; no screen is shown.
- Failure of either overlay → screen continues in degraded mode; no throw.
- Failure of `ui_manager.registerScreen` → `std::runtime_error` thrown (fatal; screen cannot function without UIManager registration).

---

## Information Screen

### Files

| File | Namespace |
|---|---|
| `main/display/cnc/screens/information_screen.h` | `informationScreen` |
| `main/display/cnc/screens/information_screen.cpp` | `informationScreen` |

### Public API

```cpp
namespace informationScreen {
    void create();
}
```

---

### Base Class

`GenericScreen` — base class providing LVGL screen, full-screen container, and virtual buttons. No rotary menu component. See [ui_core.md](ui_core.md).

---

### Virtual Buttons

| Button index | Role | Icon |
|:---:|---|---|
| 0 (button 1) | Empty | — |
| 1 (button 2) | Empty | — |
| 2 (button 3) | Back → returns to `main` | `back_b` |

`onBackButtonPress` plays `ESP3D_BACK_BEEP`. `onBackButtonRelease` calls `ESP3D_TRANSITION_START` targeting `ESP3DScreenType::main` (defined via the constant `RETURN_SCREEN`).

---

### Content Lines

The screen renders 8 left-aligned labels stacked vertically with:

```cpp
const int line_height = ESP3D_MENU_LINE_HEIGHT - 1;
```

The 1 px reduction prevents the last line (axis count) from being clipped by the container bottom edge.

| Line | Label key | Data source | Fallback |
|:---:|---|---|---|
| 0 | `version` | `ESP3D_X_VERSION` (compile-time constant) | — |
| 1 | `target_firmware` | `ESP3DValuesIndex::fw_version` → `target_fw_info` | `ESP3D_TARGET_NAME` |
| 2 | `unit` | `ESP3DValuesIndex::current_unit` (`"1"` = inches, else mm) | — |
| 3 | `communications` | `esp3dCommands.getOutputClient()` (switch + compile guards) | `"???"` |
| 4 | `board_name` | `ESP3DValuesIndex::board_name` → `target_fw_info` | `ESP3D_TARGET_NAME` |
| 5 | `ui_language` | `esp3dTranslationService.translate(ESP3DLabel::language)` | — |
| 6 | `lock_state` | `ui_manager.getLockState()` | — |
| 7 | `axis_count` | `ESP3DValuesIndex::axis_count` | — |

**Target firmware (line 1) and board name (line 4)** use the same two-step fallback: primary value → `target_fw_info` → `ESP3D_TARGET_NAME`. The fallback triggers when the value is empty or `"?"` (not yet received from the CNC controller).

All label text is resolved at `create()` time. The screen is static — values are not refreshed while it is displayed. Navigating away and back will show fresh values.

---

### Communication Mode Mapping

Line 3 is built from `esp3dCommands.getOutputClient()` with compile-time guards:

| `ESP3DClientType` | Displayed string | Guard |
|---|---|---|
| `serial` | `ESP3DLabel::serial` | always |
| `uart_ext` | `ESP3DLabel::external_module` | `#if ESP3D_UART_EXT_FEATURE` |
| `bt_serial` | `ESP3DLabel::bluetooth` | always |
| `bt_ble` | `ESP3DLabel::bluetooth_ble` | always |
| `socket_client` | `ESP3DLabel::socket_tcp` | `#if ESP3D_SOCKET_CLIENT_FEATURE` |
| `websocket_client` | `ESP3DLabel::wifi_websocket` | `#if ESP3D_WS_CLIENT_SERVICE_FEATURE` |
| default | `"???"` | — |

See [esp3d_commands.md](esp3d_commands.md) for the `getOutputClient()` implementation.

---

### Lifecycle

```
informationScreen::create()
    │
    ├── ESP3D_TRANSITION_RESET(...)
    ├── new (nothrow) GenericScreen(...)
    ├── showContainerFrame(true)
    ├── [create 8 lv_label objects with line_height stride]
    ├── ui_manager.registerScreen(information, ...)
    ├── lv_obj_add_event_cb(..., LV_EVENT_DELETE, onScreenDestroy)
    └── rotateContainer(ui_manager.getOrientationAngle())

--- back button release ---

onBackButtonRelease()
    └── ESP3D_TRANSITION_START(cleanup_timer, ..., RETURN_SCREEN=main)

cleanup_timer_cb()  [0 ms]
    └── prepareForDestruction()
            └── screen->prepareForDestruction()
        lv_timer_create(transition_timer_cb, ESP3D_TRANSITION_SCREEN_DELAY_MS)

transition_timer_cb()
    └── createScreen(ESP3DScreenType::main)

onScreenDestroy(LV_EVENT_DELETE)
    ├── [emergency] prepareForDestruction() if not already called
    ├── ui_manager.unregisterScreen(information)
    └── delete information_screen_obj_instance
```

`rotateContainer()` is called after all LVGL objects are created so the orientation transform applies to the fully built container in one pass.

---

### Allocation Safety

The `GenericScreen` instance uses `new (std::nothrow)` with an explicit null/validity check. On failure, `create()` deletes the partial object and returns early (no throw). The screen is simply not shown. Failure of `registerScreen` throws `std::runtime_error`.

---

## Shared Transition Pattern

Both screens implement the identical two-timer protocol:

```
button release  (runs inside LVGL event dispatch — nothing can be invalidated here)
    └── ESP3D_TRANSITION_START  →  creates cleanup_timer (0 ms)

cleanup_timer_cb  (next LVGL scheduler cycle — safe to invalidate objects)
    ├── prepareForDestruction()
    └── creates transition_timer (ESP3D_TRANSITION_SCREEN_DELAY_MS)

transition_timer_cb
    └── createScreen(next_screen_target)

LV_EVENT_DELETE  (LVGL tears down the old screen object)
    └── deallocate objects + unregister from UIManager
```

The 0 ms cleanup timer is mandatory because `prepareForDestruction()` invalidates LVGL objects that the input device (`indev`) may still reference during the current tick. Deferring to the next LVGL cycle ensures the event handler has returned before any objects are touched.

Key macros:

| Macro | Purpose |
|---|---|
| `ESP3D_TRANSITION_RESET` | Zero-initializes all transition state at `create()` |
| `ESP3D_TRANSITION_START` | Guards against double-start; creates `cleanup_timer` |
| `ESP3D_CLEANUP_TIMER_BODY` | Body of the 0 ms timer; calls `prepareForDestruction()`, then creates `transition_timer` |
| `ESP3D_TRANSITION_TIMER_BODY` | Body of the delay timer; calls `createScreen()` |
| `ESP3D_PREPARE_DESTRUCTION_GUARD` | Idempotency guard at the top of `prepareForDestruction()` |

---

## Related Documentation

- [ui_core.md](ui_core.md) — `GenericScreen` and `CircularMenuScreen` base classes
- [ui_components.md](ui_components.md) — `ConnectionStatusComponent` and `FirmwareStatusComponent`
- [system_lifecycle_screens.md](system_lifecycle_screens.md) — splash screen and boot sequence
- [settings_selection_screens.md](settings_selection_screens.md) — settings screen (section 0 of main menu)
- [values.md](values.md) — `ESP3DValues` subscription system, `server_status` index
- [translations.md](translations.md) — `ESP3DLabel` keys and translation service
- [activity_monitoring.md](activity_monitoring.md) — `ActivityMonitoring::setup()` called here
- [esp3d_commands.md](esp3d_commands.md) — `getOutputClient()` used on information screen


## Documents de conception (depot)

- [screens_architecture.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md)
