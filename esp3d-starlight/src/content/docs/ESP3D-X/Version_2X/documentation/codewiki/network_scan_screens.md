---
title: "Network Scan Screens"
---

# Network Scan Screens

## Introduction

The **network scan screens** module provides three asynchronous scan-and-select screens that let the user discover and configure network endpoints directly from the pendant's touchscreen. Each screen scans for a different type of network target, presents results in a scrollable list, and persists the user's choice to NVS before initiating a connection.

| Screen | File | Build guard | Target |
|---|---|---|---|
| `wifiScanScreen` | `wifi_scan_screen.cpp` | `ESP3D_WIFI_FEATURE` | WiFi access points (802.11) |
| `scanBTScreen` | `scan_bt_screen.cpp` | `ESP3D_BT_SERIAL_FEATURE \|\| ESP3D_BT_BLE_FEATURE` | Bluetooth Classic / BLE devices |
| `serverScanScreen` | `server_scan_screen.cpp` | `ESP3D_IP_CNC_CLIENT_FEATURE` | CNC servers discovered via mDNS |

All three screens share an identical structural pattern: a `ListMenuScreen` base, a FreeRTOS scan task that runs off the LVGL thread, a polled completion timer, a loading spinner, and three virtual buttons (**Select / Refresh / Back**). The sections below describe the shared architecture, then document each screen's specialisations.

---

## Architecture Overview

```mermaid
graph TB
    subgraph UI_Framework["UI Framework (LVGL - Core 1)"]
        UM["UIManager"]
        GS["GenericScreen"]
        LMS["ListMenuScreen"]
        LMC["ListMenuComponent"]
        VBC["VirtualButtonsComponent"]
    end

    subgraph network_scan_screens["network_scan_screens (current module)"]
        WSS["wifiScanScreen\nwifi_scan_screen.cpp"]
        BTS["scanBTScreen\nscan_bt_screen.cpp"]
        SSS["serverScanScreen\nserver_scan_screen.cpp"]
    end

    subgraph Dependencies["External Dependencies"]
        WIFI["ESP3DWifiClient\nesp3d_wifi_client.h"]
        BT_S["ESP3DBTSerialClient\nesp3d_bt_serial_client.h"]
        BT_B["ESP3DBTBleClient\nesp3d_bt_ble_client.h"]
        NET["ESP3DNetwork\nesp3d_network.h"]
        mDNS["ESP3DmDNS\nesp3d_mdns.h"]
        SOCK["ESP3DSocketClient\nesp3d_socket_client.h"]
        WS["ESP3DWebsocketClient\nesp3d_websocket_client.h"]
        SETT["ESP3DSettings\nesp3d_settings.h"]
        TRANS["ESP3DTranslationService"]
        INP["inputScreen"]
        MSG["messageBoxScreen"]
        CONN["connectionStatusScreen"]
    end

    LMS -->|extends| GS
    LMS -->|owns| LMC
    GS -->|owns| VBC
    GS -->|registers with| UM

    WSS -->|instantiates| LMS
    BTS -->|instantiates| LMS
    SSS -->|instantiates| LMS

    WSS -->|scans via| WIFI
    WSS -->|checks mode| NET
    WSS -->|password via| INP
    WSS -->|connects via| SOCK
    WSS -->|connects via| WS
    WSS -->|navigates to| CONN

    BTS -->|scans via| BT_S
    BTS -->|scans via| BT_B
    BTS -->|checks mode| NET
    BTS -->|PIN via| INP

    SSS -->|discovers via| mDNS
    SSS -->|checks mode| NET
    SSS -->|connects via| SOCK
    SSS -->|connects via| WS

    WSS -->|reads/writes| SETT
    BTS -->|reads/writes| SETT
    SSS -->|reads/writes| SETT

    WSS -->|errors via| MSG
    BTS -->|errors via| MSG
    SSS -->|errors via| MSG

    WSS -->|i18n| TRANS
    BTS -->|i18n| TRANS
    SSS -->|i18n| TRANS
```

---

## Common Lifecycle Pattern

All three screens follow the same lifecycle governed by LVGL timers and FreeRTOS tasks.

```mermaid
sequenceDiagram
    participant Caller as Caller (e.g. settings_list_screen)
    participant CRT as create
    participant LVGL as LVGL / UIManager
    participant Task as FreeRTOS Scan Task
    participant Timer as scan_check_timer (250 ms)
    participant User as User

    Caller->>CRT: create()
    CRT->>CRT: validate radio mode
    CRT->>LVGL: new ListMenuScreen(initial 'loading' item)
    CRT->>LVGL: registerScreen() + onScreenDestroy callback
    CRT->>CRT: onScreenCreated()
    CRT->>LVGL: lv_timer 500 ms → start_xxx_scan()

    note over LVGL: Screen visible, spinner shown, buttons hidden

    LVGL->>Task: esp3d_task_create_unpinned(scan_task)
    LVGL->>Timer: lv_timer_create(scan_check_timer_cb, 250ms)

    Task-->>Task: blocking scan (WiFi / BT / mDNS)
    Task-->>LVGL: scan_completed = true, vTaskDelete()

    Timer->>LVGL: scan_check_timer_cb fires
    LVGL->>LVGL: destroy_loading_spinner(), re-enable buttons
    LVGL->>LVGL: updateItemList(results), move_to_index(current)

    User->>LVGL: touch/encoder → select item OR press button

    alt Item confirmed (Select / touch)
        LVGL->>LVGL: save to NVS
        LVGL->>LVGL: initiate connection
        LVGL->>LVGL: ESP3D_TRANSITION_START → cleanup_timer_cb
    else Refresh
        LVGL->>LVGL: start_xxx_scan() (clear cache first)
    else Back
        LVGL->>LVGL: clear cache, ESP3D_TRANSITION_START → settings
    end

    LVGL->>LVGL: prepareForDestruction()
    LVGL->>LVGL: UIManager::unregisterScreen()
    LVGL->>LVGL: delete ListMenuScreen instance
```

---

## Screen Transition & Destruction Guard

All three screens use a consistent set of macros to avoid double-free and race conditions between LVGL callbacks and navigation transitions.

```mermaid
stateDiagram-v2
    [*] --> Created : "create()"
    Created --> Scanning : "onScreenCreated() + start_xxx_scan()"
    Scanning --> Displaying : "scan_check_timer_cb (scan_completed)"
    Displaying --> Confirming : user selects item
    Confirming --> Destroying : "cleanup_timer_cb fires - prepareForDestruction()"
    Displaying --> Destroying : "Back button - prepareForDestruction()"
    Scanning --> Error : "scan_result_valid=false - messageBoxScreen.show_error()"
    Error --> Destroying : user acknowledges

    Destroying --> [*] : onScreenDestroy (LV_EVENT_DELETE) - delete ListMenuScreen
```

Key lifecycle guards:

| Variable | Purpose |
|---|---|
| `is_prepared_for_destruction_` | Set by `prepareForDestruction()`; prevents re-entry via `ESP3D_PREPARE_DESTRUCTION_GUARD` |
| `cleanup_executed_` | Prevents the cleanup body from running more than once |
| `transition_timer` | Delayed screen switch; destroyed by `cleanup_timer_cb` before the next screen is created |
| `cleanup_timer` | Bridges the gap between button-release and destruction; created by `ESP3D_TRANSITION_START` |

---

## Component Dependencies

```mermaid
graph LR
    subgraph network_scan_screens
        WSS["wifiScanScreen"]
        BTS["scanBTScreen"]
        SSS["serverScanScreen"]
    end

    subgraph screen_base_infrastructure
        LMS["ListMenuScreen"]
        GS["GenericScreen"]
        LMC["ListMenuComponent"]
        VBC["VirtualButtonsComponent"]
    end

    subgraph modal_dialog_screens
        INP["inputScreen"]
        MSG["messageBoxScreen"]
    end

    subgraph connection_status_screen
        CONN["connectionStatusScreen"]
    end

    WSS --> LMS
    BTS --> LMS
    SSS --> LMS
    LMS --> GS
    LMS --> LMC
    GS --> VBC

    WSS --> INP
    BTS --> INP
    WSS --> MSG
    BTS --> MSG
    SSS --> MSG
    WSS --> CONN
```

> See [screen_base_infrastructure](screen_base_infrastructure.md) for `ListMenuScreen`, `GenericScreen`, `ListMenuComponent`, and `VirtualButtonsComponent`.
>
> See [modal_dialog_screens](modal_dialog_screens.md) for `inputScreen` and `messageBoxScreen`.
>
> See [connection_status_screen](connection_status_screen.md) for the post-connect status screen used after WiFi credential confirmation.

---

## Data Structures

Each screen defines a private `struct` that holds per-item data. The struct is passed generically through `ListMenuComponent`'s `void*`-based item API; the display callback casts it back to the concrete type.

```mermaid
classDiagram
    class WifiApInfo {
        +string ssid
        +string signal_str
        +int32_t signal
        +bool is_protected
    }

    class BTDeviceInfo {
        +string address
        +string display
        +string signal_strength
    }

    class ServerInfo {
        +string hostname
        +string ip_addr
        +string port_str
        +uint32_t port_num
    }
```

---

## Shared Async Scan Infrastructure

The following data flow is identical across all three screens. Only the blocking API call and result type differ.

```mermaid
flowchart TD
    subgraph LVGL_Thread["LVGL Thread (Core 1)"]
        A["start_xxx_scan()"] --> B["Clear list\nUpdate title to Scanning"]
        B --> C["create_loading_spinner\nHide all 3 buttons"]
        C --> D["esp3d_task_create_unpinned\n(xxx_scan_task, 4096 B stack)"]
        D --> E["lv_timer_create\n(scan_check_timer_cb, 250 ms)"]
        E --> F{scan_completed?}
        F -->|No - next tick| F
        F -->|Yes| G["stop_xxx_scan\ndestroy_loading_spinner\nShow all 3 buttons"]
        G --> H["updateItemList(results)\nmove_to_index(current_config)"]
    end

    subgraph FreeRTOS_Task["FreeRTOS Task (unpinned)"]
        T["Blocking scan API\nesp_wifi_scan_start\nbtClient.scan\nesp3dmDNS.servicesScan"] --> R["Build local result vector\nMove to static storage"]
        R --> S["scan_completed = true\nvTaskDelete(nullptr)"]
    end

    D -.->|creates| T
    S -.->|flag polled by| F
```

### Memory Safety

All scan tasks guard result-vector growth against `std::bad_alloc`. On allocation failure the loop breaks and whatever entries were collected so far are displayed. The `ListMenuScreen` is constructed with `new (std::nothrow)` and validated before registering with `UIManager`; a null result leaves the previous screen intact.

```cpp
// Pattern used in all three scan tasks:
try {
    local_xxx.emplace_back(...);
} catch (const std::exception &e) {
    esp3d_log_e("OOM: %s — keeping %d entries", e.what(), local_xxx.size());
    break;
}
```

---

## Button Layout

All three screens use the same three-button configuration.

```
┌──────────┬──────────┬──────────┐
│  Select  │ Refresh  │   Back   │
│ (ok_b)   │(refresh_b│ (back_b) │
│ Button 0 │ Button 1 │ Button 2 │
└──────────┴──────────┴──────────┘
```

| Button | Press sound | Release action |
|---|---|---|
| 0 – Select | `ESP3D_SELECTION_BEEP` | Invoke `onXxxItemClick` for the focused item |
| 1 – Refresh | `ESP3D_SELECTION_BEEP` | Clear cache, re-run scan |
| 2 – Back | `ESP3D_BACK_BEEP` | Clear cache, transition to `settings` |

All three buttons are hidden via `show_button(N, false)` during the active scan and restored in `destroy_loading_spinner()`.

---

## WiFi Scan Screen (`wifiScanScreen`)

### Purpose

Scans for visible 802.11 access points, displays them sorted by signal strength (descending), and lets the user connect by selecting an AP. Protected networks trigger a password prompt via `inputScreen`.

### Radio Mode Support

The screen guards creation with a radio mode check. It handles three distinct WiFi driver states at scan time:

| Radio mode | Driver state at scan | Behaviour |
|---|---|---|
| `wifi_sta` | Running STA | `esp_wifi_scan_start()` runs directly |
| `wifi_ap_config` | AP-only (`WIFI_MODE_AP`) | Temporarily switches to `WIFI_MODE_APSTA`; restores `WIFI_MODE_AP` after scan |
| Any (SSID empty / uninitialised) | Stopped or not initialised | Full `esp_wifi_init()` + `set_mode(STA)` + `start()`; torn down after scan |

### List Item Layout

```
┌─────────────────────────────────────────────────────────┐
│ [✓]  MyNetwork                          75%  [lock]     │
│      OpenNetwork                        60%             │
│      AnotherAP                          30%  [lock]     │
└─────────────────────────────────────────────────────────┘
  ↑                                        ↑    ↑
  LV_SYMBOL_OK (active SSID)          signal  lock icon
```

- **Active SSID** (matches `esp3d_sta_ssid` NVS value): shown with `LV_SYMBOL_OK` in `ESP3D_INDICATOR_SUCCESS_COLOR`
- **Lock icon** (`ESP3D_SYMBOL_LOCK`): displayed when `authmode != WIFI_AUTH_OPEN`
- Long SSIDs are truncated with `LV_LABEL_LONG_DOT`; label width is reduced dynamically when the signal percentage and/or lock icon are present

### Selection and Credential Flow

```mermaid
flowchart TD
    A[User selects AP] --> B{Protected?}
    B -->|No| C[Write SSID to NVS\nClear password in NVS]
    B -->|Yes| D[Save list selection index\nRead current password from NVS]
    D --> E["inputScreen::show_text_input\n(Cancel returns to wifi_scan)"]
    E -->|onPasswordOK| F["Write SSID + password to NVS"]
    C --> G["Write esp3d_radio_mode = wifi_sta\nsetModeAsync(wifi_sta)"]
    F --> G
    G --> H["Navigate to connectionStatusScreen\n(return_screen = settings)"]
```

> `setModeAsync()` is used instead of the synchronous `setMode()` to avoid blocking the LVGL task for the duration of WiFi reconnection (`xEventGroupWaitBits(portMAX_DELAY)`, up to 10 retries).

### Scan Result Caching

`scanned_aps_` is **preserved** across the transition to `inputScreen` so the list is instantly restored on Cancel. The `saved_selection_` index restores the highlight to the previously focused item. The cache is only cleared on **Refresh** or **Back**.

### NVS Keys Written

| Setting index | Value written |
|---|---|
| `esp3d_sta_ssid` | Selected AP SSID |
| `esp3d_sta_password` | Password (empty for open networks) |
| `esp3d_radio_mode` | `wifi_sta` (ensures `begin()` auto-connects on next boot) |

### Scan Task

```mermaid
flowchart LR
    T["wifi_scan_task\n(FreeRTOS, unpinned)"] --> S["esp_wifi_scan_start\n(blocking, max 15 APs)"]
    S --> G["esp_wifi_scan_get_ap_records\nesp_wifi_clear_ap_list"]
    G --> F["Filter: getSignal > 0\nSort: descending by numeric RSSI"]
    F --> C["scanned_aps_ = std::move(local_aps)"]
    C --> R["Restore WIFI_MODE_AP if scan_was_ap_config\nStop/deinit driver if scan_started_driver"]
    R --> D["scan_completed = true\nvTaskDelete"]
```

---

## Bluetooth Scan Screen (`scanBTScreen`)

### Purpose

Scans for nearby Bluetooth Classic (SPP) or BLE (GATT) devices and lets the user select one as the CNC host. BT Classic requires a PIN confirmation (empty = `SEC_NONE`); BLE connects directly using the stack's own pairing mechanism.

### Countdown Timer

Because BT scanning has a known maximum duration (returned by `getScanMaxDuration()`), the spinner label shows a live countdown. Each `scan_check_timer_cb` tick recalculates remaining seconds from `(scan_max_duration - elapsed_ms) / 1000` and updates the label.

### List Item Layout

```
┌─────────────────────────────────────────────────────────┐
│ [✓]  None                                               │
│ [✓]  FluidNC CNC  (currently connected, inserted)       │
│      Printer001                                  88%    │
│      OtherDevice                                 45%    │
└─────────────────────────────────────────────────────────┘
```

- **None** (MAC `00:00:00:00:00:00`): always first; selects no host
- **Currently connected device**: if absent from scan results, inserted at position 1 with no signal percentage
- Devices whose name is empty after `str_trim` are discarded from the result set

### BT Classic PIN Flow

```mermaid
flowchart TD
    A[User selects BT Classic device] --> B[Save selected_index_\nStore pending_address_ and pending_name_]
    B --> C["Read current PIN from NVS\ninputScreen::show_pin_input\n(allow_empty=true means SEC_NONE)"]
    C -->|onBtPinOK| D[Write PIN to NVS\nWrite MAC address to NVS]
    D --> E["btSerialClient.clearBondedDevices\nbtSerialClient.connect"]
    E --> F["Navigate to settings\nvia lv_timer 100 ms"]
    C -->|Cancel| G[Restore saved_selection_\nReturn to scan_bt list]
```

### BLE Flow

BLE selection saves the address immediately and calls `btBleClient.connect()`. No sub-screen is shown. `refresh_visible_items()` updates the active-device marker in-place on the existing list.

### NVS Keys Written

| Mode | Setting index | Value |
|---|---|---|
| BT Serial | `esp3d_btserial_address` | MAC address string |
| BT Serial | `esp3d_btserial_pin` | PIN string (empty = `SEC_NONE`) |
| BT BLE | `esp3d_btble_address` | MAC address string |

### Scan Task

```mermaid
flowchart LR
    T["bt_scan_task\n(FreeRTOS, unpinned)"] --> S["btSerialClient.scan\nor btBleClient.scan\n(blocking)"]
    S --> F["Filter: non-empty trimmed name\nSort: RSSI descending"]
    F --> A["Prepend None\nInsert connected device at pos 1 if not in results"]
    A --> C["scanned_devices_ = std::move(local_devices)"]
    C --> D["scan_completed = true\nvTaskDelete"]
```

---

## Server Scan Screen (`serverScanScreen`)

### Purpose

Discovers CNC servers on the LAN using mDNS service discovery. The mDNS service type is selected at build time:

- `ESP3D_SOCKET_CLIENT_FEATURE` → queries `_telnet._tcp`
- `ESP3D_WS_CLIENT_SERVICE_FEATURE` → queries `_ws._tcp`

The user selects a discovered server; its resolved IPv4 address and port are saved to NVS and a connection is initiated.

### List Item Layout

```
┌─────────────────────────────────────────────────────────┐
│ [✓]  fluidnc.local                                23    │
│      grblhal-machine.local                        80    │
└─────────────────────────────────────────────────────────┘
  ↑                                                  ↑
  hostname (mDNS service name)                    port
```

- **Active server**: `LV_SYMBOL_OK` when both IP and port match `esp3d_socket_client_address` / `esp3d_socket_client_port`
- Port is right-aligned; hostname is truncated with `LV_LABEL_LONG_DOT` when needed

### Selection Flow

```mermaid
flowchart TD
    A[User selects server] --> B["Write ip_addr to\nesp3d_socket_client_address"]
    B --> C["Write port_num to\nesp3d_socket_client_port"]
    C --> D{Already connected\nto same IP:port?}
    D -->|Yes| E["Skip connect()\navoid TLSF/lwIP race condition"]
    D -->|No| F["esp3dSocketClient.connect()\nor esp3dWebsocketClient.connect()"]
    E --> G["ESP3D_TRANSITION_START\nnavigate to settings"]
    F --> G
```

> The already-connected guard prevents a known crash: calling `connect()` on an active socket triggers `closeSocket()` while lwIP may be delivering packets. This corrupts TLSF free-block pointers and causes a `StoreProhibited` exception a few seconds later.

### NVS Keys Written

| Setting index | Value |
|---|---|
| `esp3d_socket_client_address` | Resolved IPv4 string |
| `esp3d_socket_client_port` | Port number (uint32) |

### Scan Task

```mermaid
flowchart LR
    T["server_scan_task\n(FreeRTOS, unpinned)"] --> M["esp3dmDNS.servicesScan\n(_telnet or _ws, _tcp)\nblocking ~3 s"]
    M --> I["Iterate records\nExtract first IPv4 from mdns_ip_addr_t\nip4addr_ntoa then copy immediately"]
    I --> C["scanned_servers_ = std::move(local_servers)"]
    C --> D["scan_completed = true\nvTaskDelete"]
```

> `ip4addr_ntoa` returns a pointer into a static buffer. The string must be copied into a `std::string` immediately to avoid stale-pointer bugs.

---

## Full Connection Setup Data Flow

```mermaid
flowchart TD
    Start([Settings screen\nuser taps network entry]) --> Open["open scan screen\ncreate()"]
    Open --> Scan["Async scan task starts\n(500 ms delay)"]
    Scan --> List["Results displayed\nin scrollable list"]
    List --> Select[User selects item]
    Select --> Sub{Needs credentials?}
    Sub -->|WiFi protected| PW["inputScreen: WiFi password\n(text input)"]
    Sub -->|BT Classic| PIN["inputScreen: PIN\n(numeric, allow_empty)"]
    Sub -->|WiFi open / BLE / Server| NVS[Write to NVS directly]
    PW -->|onPasswordOK| NVS
    PIN -->|onBtPinOK| NVS
    NVS --> Connect["Initiate connection\nsetModeAsync / btClient.connect\nor socketClient.connect"]
    Connect --> Nav{Navigate to}
    Nav -->|WiFi| ConnStatus["connectionStatusScreen\nreturn_screen = settings"]
    Nav -->|BT Serial| SettingsScreen[settings screen]
    Nav -->|BT BLE| ScanRefresh["Refresh list in place\nstay on scan_bt"]
    Nav -->|Server| SettingsScreen
```

---

## Integration in the Screen System

```mermaid
graph TB
    subgraph common_screens
        SBI["screen_base_infrastructure\nListMenuScreen, GenericScreen"]
        MDS["modal_dialog_screens\ninputScreen, messageBoxScreen"]
        CSS["connection_status_screen"]
        SLS["settings_selection_screens"]
        NSS["network_scan_screens\ncurrent module"]
        SYS["system_lifecycle_screens"]
    end

    CNC["cnc_shared\nsettings_list_screen"] -->|opens| NSS
    NSS -->|returns to| CNC
    NSS -->|uses| SBI
    NSS -->|uses| MDS
    NSS -->|uses| CSS
```

**Entry points** from `settings_list_screen.cpp`:

| Handler | Screen opened |
|---|---|
| `onWifiSSIDClick` / `onForgetWifiClick` | `wifiScanScreen::create()` |
| BT host selection / `onForgetBTHostClick` | `scanBTScreen::create()` |
| `onServerAddressClick` | `serverScanScreen::create()` |

---

## ESP32 Constraints

| Concern | Mitigation |
|---|---|
| **LVGL single-thread rule** | All blocking scan calls run in dedicated FreeRTOS tasks; LVGL objects are only touched from the 250 ms check-timer callback running on Core 1 |
| **RAM fragmentation** | Result vectors use `emplace_back` with `try/catch`; `shrink_to_fit()` after clearing; `ListMenuScreen` uses `new (std::nothrow)` |
| **Heap diagnostics** | Every `create()`, `prepareForDestruction()`, and `onScreenDestroy()` logs `esp_get_free_heap_size()` |
| **Stack size** | All three scan tasks use 4096 bytes of stack via `esp3d_task_create_unpinned` |
| **WiFi driver state** | `wifiScanScreen` handles three driver states: running STA, AP-only (APSTA workaround during scan), and uninitialised (full init + start, torn down after scan) |
| **Double connect crash** | `serverScanScreen` checks `isConnected() && same IP:port` before calling `connect()` to avoid a known race in the TLSF/lwIP allocator |
| **WiFi / BT mutual exclusion** | Both cannot be active simultaneously on this board; the radio mode guard at `create()` prevents opening the wrong scan screen |

---

## Related Documentation

- [screen_base_infrastructure](screen_base_infrastructure.md) — `ListMenuScreen`, `GenericScreen`, `ListMenuComponent`, `VirtualButtonsComponent`
- [modal_dialog_screens](modal_dialog_screens.md) — `inputScreen` (password / PIN entry) and `messageBoxScreen` (error dialogs)
- [connection_status_screen](connection_status_screen.md) — Post-WiFi-connect status screen with connecting spinner and auth-fail retry
- [screens_architecture](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md) — Overall screen system design and `UIManager`
- [screen_transitions_flow](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md) — Safe timer-based transition pattern (`ESP3D_TRANSITION_START`, `ESP3D_CLEANUP_TIMER_BODY`)
- [connection_management](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) — Transport lifecycle, radio modes, and connection states
- [`docs/features/feature_resource_matrix.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/feature_resource_matrix.md) — WiFi vs BT build exclusions and RAM budgets
- [`docs/features/mdns.md`](mdns.md) — mDNS registered services (relevant for `serverScanScreen`)
- [`docs/guides/esp32_memory_constraints.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) — Heap fragmentation, WiFi vs BT RAM allocation
