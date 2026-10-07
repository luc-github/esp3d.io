---
title: "Settings Selection Screens"
---

# Settings Selection Screens

## Overview

The **Settings Selection Screens** module is a collection of five single-purpose list-picker screens that allow the user to choose a value from a predefined set of options and save it to NVS (Non-Volatile Storage). Each screen is built on top of [`ListMenuScreen`](UI_Framework_and_Screens.md) and follows a strictly uniform lifecycle pattern, making them consistent, memory-safe, and safe to destroy from within LVGL event callbacks.

The five screens are:

| Screen | Namespace | Setting modified |
|---|---|---|
| Baud Rate | `baudrateScreen` | `esp3d_baud_rate` |
| Polling Interval | `pollingScreen` | `esp3d_polling_interval` (via GCode handler) |
| Screen Timeout | `screenTimeoutScreen` | `esp3d_screen_timeout` |
| Output Client | `outputSelectionScreen` | `esp3d_output_client` / `esp3d_radio_mode` |
| Language | `languagesScreen` | active translation pack |

---

## Architecture

### Position in the UI Hierarchy

The settings selection screens are leaf nodes reached from the settings navigation flow:

```
main_screen
  └── settings_screen (circular menu)
        ├── baudrate_screen          ← this module
        ├── output_selection_screen  ← this module
        ├── languages_screen         ← this module
        └── settings_list_screen
              ├── polling_screen              ← this module
              └── screen_timeout_screen (*)   ← this module
                  (* requires ESP3D_BRIGHTNESS_CONTROL_FEATURE)
```

None of the screens in this module open further sub-screens, except `output_selection_screen`, which may open a `message_box_screen` confirmation dialog before restarting.

### Component Dependencies

| Dependency | Used by |
|---|---|
| `ListMenuScreen` | all five screens (base class) |
| `UIManager` (`esp3d_ui.h`) | all five screens |
| `ESP3DSettings` | baudrate, polling, screen\_timeout, output\_selection |
| `ESP3DTranslationService` | all five screens (labels and language list) |
| `esp3d_resources` (icons) | all five screens (`back_b`, `ok_b`, `refresh_b`) |
| `message_box_screen` | output\_selection (restart confirmation) |
| `ActivityMonitoring` | screen\_timeout (live timeout update) |
| `ESP3DGCodeHandlerService` | polling (live interval update) |
| `ESP3DSerialClient` / `ESP3DUartExtClient` | baudrate (live baud rate change) |
| `ESP3DNetwork` | output\_selection (radio mode switch) |

---

## Common Screen Lifecycle

All five screens implement the same state machine enforced through shared macros
(`ESP3D_TRANSITION_START`, `ESP3D_TRANSITION_RESET`, `ESP3D_CLEANUP_TIMER_BODY`,
`ESP3D_PREPARE_DESTRUCTION_GUARD`, `ESP3D_TRANSITION_TIMER_BODY`).

```
create()
  ├── reset transition state  (ESP3D_TRANSITION_RESET)
  ├── build item list
  ├── new ListMenuScreen(...)  [std::nothrow + try/catch]
  ├── ui_manager.registerScreen(...)
  ├── lv_obj_add_event_cb(..., LV_EVENT_DELETE, onScreenDestroy)
  └── move_to_index(initial_selection)

─── user presses Back ───────────────────────────────────────────
  └── onBackButtonRelease()
        └── ESP3D_TRANSITION_START → cleanup_timer_cb scheduled

cleanup_timer_cb()
  ├── prepareForDestruction()
  │     └── screen->prepareForDestruction()   [idempotent guard]
  └── schedule transition_timer_cb(delay)

transition_timer_cb()
  └── createScreen(next_screen_target)   [dispatches to target]

─── LVGL deletes screen object ──────────────────────────────────
  └── onScreenDestroy()
        ├── prepareForDestruction()  (if not already called)
        ├── ui_manager.unregisterScreen(...)
        └── delete instance_ptr; ptr = nullptr
```

### Key Lifecycle Functions

| Function | Role |
|---|---|
| `create()` | Builds item list, creates `ListMenuScreen`, registers with `UIManager`, attaches `LV_EVENT_DELETE` callback |
| `onScreenDestroy()` | LVGL delete callback: triggers `prepareForDestruction()` if not yet done, then unregisters and frees the `ListMenuScreen` |
| `prepareForDestruction()` | Idempotent (via `ESP3D_PREPARE_DESTRUCTION_GUARD`): calls `screen->prepareForDestruction()` to cancel pending LVGL timers and callbacks |
| `cleanup_timer_cb()` | Fires after button release; calls `prepareForDestruction()`, then schedules `transition_timer_cb` |
| `transition_timer_cb()` | Fires after `ESP3D_TRANSITION_SCREEN_DELAY_MS`; calls `createScreen(next_screen_target)` |

### Common Button Layout

| Position | Default assignment | `languages_screen` |
|---|---|---|
| Button 1 (left) | OK | Set / Select |
| Button 2 (middle) | *(empty)* | Refresh |
| Button 3 (right) | Back | Back |

### Memory Safety

All `new` calls use `std::nothrow` inside a `try/catch` block. An uncaught `std::bad_alloc` inside an LVGL callback would call `std::terminate` and reset the ESP32. On failure the function logs the error and returns, leaving the previous screen intact.

Item list vectors also wrap their construction in `try/catch`: if allocation fails partway through, `create()` detects the empty or partial list and returns early without creating a broken screen.

### List Item Display Pattern

Every screen's `display*Item()` callback follows the same layout:

1. `lv_obj_clean(container)` — clear before redraw.
2. If item is the current active value: create `LV_SYMBOL_OK` label at `LV_ALIGN_LEFT_MID` with `ESP3D_INDICATOR_SUCCESS_COLOR`.
3. Create text label at `ESP3D_LIST_START_TEXT` offset with `LV_LABEL_LONG_DOT` overflow handling.
4. Disable scrollbars on both label and container.

---

## Screen Reference

### `baudrate_screen`

**File:** `main/display/screens/baudrate_screen.cpp`

**Purpose:** Lets the user pick a serial baud rate from `SupportedBaudList`. The change is applied immediately to the UART driver without a restart.

#### Item Structure

```cpp
struct BaudrateItem {
    uint32_t baudrate;   // e.g. 115200
    std::string display; // e.g. "115200 bps"
};
```

#### Data Flow on Selection

```
onBaudrateItemClick(item)
  ├── esp3dXsettings.writeUint32(esp3d_baud_rate, value)
  └── serialClient.change_baud_rate(value)        [or uartExtClient if active]
        └── on success → refresh_visible_items()  [update checkmark]
```

#### Behaviour Notes

- Item list is built from the board-specific `SupportedBaudList[]` / `SupportedBaudListSize` compile-time constants.
- Each entry is labelled `"<value> bps"` using the `ESP3DLabel::bps` translation.
- When `ESP3D_UART_EXT_FEATURE` is enabled, the live baud rate change is routed to `uartExtClient.change_baud_rate()` if that is the active output client.
- **Navigation:** Back → `ESP3DScreenType::settings`

---

### `polling_screen`

**File:** `main/display/screens/polling_screen.cpp`

**Purpose:** Lets the user pick the CNC status-report polling interval from `SupportedPollingList`. The change is applied live via the GCode handler service.

#### Item Structure

```cpp
struct PollingItem {
    uint32_t interval;   // milliseconds; 0 = disabled
    std::string display; // e.g. "200 ms", "1 sec", "None"
};
```

#### Data Flow on Selection

```
onPollingItemClick(item)
  └── esp3dGcodeHandler.updateReportingInterval(interval_ms)
        ├── saves to NVS (esp3d_polling_interval)
        ├── updates live reporting timer
        └── on success → refresh_visible_items()  [update checkmark]
```

#### Behaviour Notes

- Display formatting: `0` → `"None"`, `< 1000 ms` → `"X ms"`, `≥ 1000 ms` → `"X sec"`.
- **grblHAL constraint:** values `> 1000 ms` are skipped from the list because grblHAL's `$481` auto-report interval is capped at 1000 ms.
- The `updateReportingInterval()` call handles both NVS persistence and live timer update in one step.
- **Navigation:** Back → `ESP3DScreenType::settings_list`

---

### `screen_timeout_screen`

**File:** `main/display/screens/screen_timeout_screen.cpp`

**Compile guard:** `ESP3D_BRIGHTNESS_CONTROL_FEATURE`

**Purpose:** Lets the user pick a screen auto-off timeout from `SupportedTimeoutList`. The change is saved to NVS and immediately applied to the activity monitoring subscriber.

#### Item Structure

```cpp
struct TimeoutItem {
    uint32_t timeout_seconds; // 0 = disabled
    std::string display;      // e.g. "30 sec", "5 min", "1 hour", "None"
};
```

#### Data Flow on Selection

```
onTimeoutItemClick(item)
  ├── esp3dXsettings.writeUint32(esp3d_screen_timeout, seconds)
  └── ActivityMonitoring::g_screenSubscriber.setTimeout(seconds * 1000)
        └── on success → refresh_visible_items()  [update checkmark]
```

#### Behaviour Notes

- Display formatting: `0` → `"None"`, `< 60 s` → `"X sec"`, `< 3600 s` → `"X min"`, `≥ 3600 s` → `"X hour"`.
- The timeout value is converted to milliseconds before being passed to `ActivitySubscriber::setTimeout()`.
- This screen is absent from the build when `ESP3D_BRIGHTNESS_CONTROL_FEATURE` is not defined. The `settings_list_screen` also conditionally omits its menu entry under the same guard.
- **Navigation:** Back → `ESP3DScreenType::settings_list`

---

### `output_selection_screen`

**File:** `main/display/screens/output_selection_screen.cpp`

**Compile guard:** `(ESP3D_BT_SERIAL_FEATURE || ESP3D_BT_BLE_FEATURE) || ESP3D_WIFI_FEATURE || ESP3D_UART_EXT_FEATURE`

**Purpose:** Lets the user select the active CNC communication output client. Depending on which clients are involved, the change either applies live or requires a board restart.

#### Available Clients (by Feature Flag)

| Client type | Feature flag | Display label |
|---|---|---|
| `serial` | always included | `ESP3DLabel::serial` |
| `bt_serial` | `ESP3D_BT_SERIAL_FEATURE` | `ESP3DLabel::bluetooth` |
| `bt_ble` | `ESP3D_BT_BLE_FEATURE` | `ESP3DLabel::bluetooth_ble` |
| `socket_client` | `ESP3D_SOCKET_CLIENT_FEATURE` | `ESP3DLabel::wifi` |
| `websocket_client` | `ESP3D_WS_CLIENT_SERVICE_FEATURE` | `ESP3DLabel::wifi_websocket` |
| `uart_ext` | `ESP3D_UART_EXT_FEATURE` | `ESP3DLabel::external_module` |

#### Decision Flow on Selection

```
onOutputItemClick(item)
  ├── [same as current?] → beep, return
  ├── writeByte(esp3d_output_client, new_client)
  ├── writeByte(esp3d_radio_mode, derived_radio_mode)
  └── [involves BT or UART_EXT?]
        ├── YES → show_confirmation() via message_box_screen
        │           ├── [confirmed] → show_information("Board will restart...")
        │           │                  → esp_restart() after 2 s
        │           └── [cancelled] → return to settings
        └── NO  → apply live:
                    ├── setOutputClient(new_client)
                    ├── [IP client?] → writeByte(esp3d_socket_client_on, 1)
                    │                  setModeAsync(wifi_sta)
                    └── [serial?]   → disconnect active IP client
                                      writeByte(esp3d_socket_client_on, 0)
                                      setModeAsync(off)
                    └── navigate back to settings
```

#### NVS Fields Written

| Field | Type | Notes |
|---|---|---|
| `esp3d_output_client` | `uint8_t` | The selected `ESP3DClientType` |
| `esp3d_radio_mode` | `uint8_t` | Derived from client type: `off`, `wifi_sta`, `bluetooth_serial`, `bluetooth_ble` |
| `esp3d_socket_client_on` | `uint8_t` | `1` when switching to an IP client, `0` otherwise |

#### Behaviour Notes

- Both `esp3d_output_client` and `esp3d_radio_mode` are written atomically so they remain consistent across reboots.
- BT changes require a hardware restart because the radio stack cannot be switched at runtime.
- UART Ext changes also require a restart because the active client is chosen at boot time.
- The `prepareForDestruction` function pointer is passed to `message_box_screen` so the current screen is properly torn down before the dialog appears.
- **Navigation:** Back → `ESP3DScreenType::settings`

---

### `languages_screen`

**Files:** `main/display/screens/languages_screen.cpp`, `main/display/screens/languages_screen.h`

**Purpose:** Lets the user select a UI language from the language packs stored in the `ui_resources` partition. The change is applied immediately — no restart required. The title bar itself updates to reflect the new locale.

#### `LanguageInfo` Structure (from `languages_screen.h`)

```cpp
struct LanguageInfo {
    std::string code;    // e.g. "fr-fr", "default"
    std::string display; // e.g. "Français", "English"

    LanguageInfo(const std::string& c, const std::string& d) : code(c), display(d) {}
};
```

#### Data Flow

```
create()
  └── build_language_list()
        ├── esp3dTranslationService.getLanguagesList()
        └── populate scanned_languages_ from values[] + labels[]
  └── ListMenuScreen(...)
  └── onScreenCreated() → select_current_language()

─── user taps item or Set button ────────────────────────────────
onLanguageItemClick(item)
  └── ui_manager.setLanguage(code)
        ├── on success → update_title_text(translate(select_language))
        └── refresh_visible_items()   [update checkmark]

─── user presses Refresh button ─────────────────────────────────
onRefreshButtonRelease()
  └── refresh_language_list()
        ├── build_language_list()          [re-read partition slots]
        ├── updateItemList(...)
        └── select_current_language()      [scroll to active entry]
```

#### Behaviour Notes

- Language data comes from `esp3dTranslationService`, which reads available language slots directly from the `ui_resources` partition — no filesystem scan is needed and the operation is instant.
- `select_current_language()` scrolls the list to the entry whose `code` matches `esp3dTranslationService.getLanguageCode()`, falling back to `"default"` if none is set.
- After a language change, `update_title_text()` is called with the re-translated `select_language` label so the screen title immediately reflects the new language.
- The Refresh button re-reads the partition in case a language pack was added via SD card update without rebooting.
- **Navigation:** Back → `ESP3DScreenType::settings`

---

## Caller Reference

The table below summarises where each screen is opened from and which function triggers the transition.

| Screen | Opened from | Trigger function |
|---|---|---|
| `baudrate_screen` | `settings_screen` | Baud rate menu entry callback |
| `output_selection_screen` | `settings_screen` | Output client menu entry callback |
| `languages_screen` | `settings_screen` | Language menu entry callback |
| `polling_screen` | `settings_list_screen` | `onPollingClick()` |
| `screen_timeout_screen` | `settings_list_screen` | `onScreenTimeoutClick()` |

All callers use the `ESP3D_TRANSITION_START` macro, which saves the current scroll position (`last_selected_index`), prepares the calling screen for destruction, and schedules the target screen creation via `transition_timer_cb`.

---

## Related Documentation

- **[UI_Framework_&_Screens](UI_Framework_and_Screens.md)** — `ListMenuScreen`, `UIManager`, screen lifecycle macros, `GenericScreen` base class
- **[Core_Platform_&_Infrastructure](Core_Platform_and_Infrastructure.md)** — `ESP3DSettings` (NVS read/write), `ESP3DTranslationService`
- **[Communication_Transports](Communication_Transports.md)** — `ESP3DSerialClient` (`change_baud_rate`), `ESP3DSocketClient`, `ESP3DBTSerialClient`
- **[Network_&_Web_Services](Network_and_Web_Services.md)** — `ESP3DNetwork` (`setModeAsync`)
- **[CNC_Firmware_Integration](CNC_Firmware_Integration.md)** — `ESP3DGCodeHandlerService` (`updateReportingInterval`)
- **[screens_architecture.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md)** — Full screen architecture reference
- **[screen_transitions_flow.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md)** — Transition timing and macro details
- **[ui_style_guide.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/ui_style_guide.md)** — Style tokens and `applyLabelStyle` / `applyListNodeStyle` usage
- **[theme_palette.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/theme_palette.md)** — `ESP3D_INDICATOR_SUCCESS_COLOR` and related color tokens
- **[development.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md)** — `ui_resources` partition: language pack binary format and SD-card update workflow
