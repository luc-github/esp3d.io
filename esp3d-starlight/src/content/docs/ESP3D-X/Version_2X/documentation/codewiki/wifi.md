---
title: "WiFi Module"
---

# WiFi Module

The WiFi module (`main/modules/wifi/`) provides the low-level WiFi driver lifecycle for the Pibot CNC pendant firmware. It encapsulates both **Station (STA)** mode — where the pendant joins an existing access point — and **Access Point (AP)** mode — where the pendant itself becomes an AP for direct client connections. All higher-level network services (HTTP, mDNS, SSDP, WebSocket) are started and stopped by this module as a consequence of connection events.

> **See also:**
> - [Network module](network.md) — orchestrates which radio mode is active and calls into this module
> - [Connection Management](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) — overall connection lifecycle across all transports
> - [Feature / Resource Matrix](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/feature_resource_matrix.md) — WiFi vs CNC transport usage model and build constraints
> - [ESP32 Memory Constraints](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) — heap impact of running WiFi

---

## Architecture Overview

```mermaid
graph TD
    subgraph Core_Platform
        ESP3DX["ESP3DX\n(main.cpp)"]
        ESP3DSettings["ESP3DSettings\n(NVS-backed config)"]
        ESP3DValues["ESP3DValues\n(observable state)"]
        ESP3DCommands["ESP3DCommands\n(message dispatch)"]
    end

    subgraph Network_Layer
        ESP3DNetwork["ESP3DNetwork\norchestrator"]
        ESP3DXNetwork["ESP3DXNetwork\n(networkTask / FreeRTOS)"]
        ESP3DNetworkServices["ESP3DNetworkServices\n(HTTP, mDNS, SSDP…)"]
    end

    subgraph WiFi_Module["WiFi Module (current)"]
        ESP3DWifiClient["ESP3DWifiClient\n(singleton esp3dWifiClient)"]
        STA["STA implementation\nesp3d_wifi_sta.cpp"]
        AP["AP implementation\nesp3d_wifi_ap.cpp"]
    end

    subgraph ESP_IDF
        esp_wifi["esp_wifi_*\n(radio driver)"]
        esp_netif["esp_netif_*\n(TCP/IP stack)"]
        esp_event["esp_event\n(event loop)"]
        freertos_eg["FreeRTOS EventGroup"]
    end

    ESP3DX --> ESP3DXNetwork
    ESP3DXNetwork --> ESP3DNetwork
    ESP3DNetwork --> ESP3DWifiClient

    ESP3DWifiClient --> STA
    ESP3DWifiClient --> AP

    STA --> esp_wifi
    STA --> esp_netif
    STA --> esp_event
    STA --> freertos_eg

    AP --> esp_wifi
    AP --> esp_netif
    AP --> esp_event

    STA --> ESP3DValues
    STA --> ESP3DSettings
    STA --> ESP3DNetworkServices
    STA --> ESP3DCommands
    AP  --> ESP3DSettings
    AP  --> ESP3DNetworkServices
    AP  --> ESP3DCommands

    style WiFi_Module fill:#d4edff,stroke:#0077cc
```

---

## Key Files

| File | Purpose |
|------|---------|
| `main/modules/wifi/esp3d_wifi_client.h` | Class declaration: `ESP3DWifiClient`, `ESP3DIpInfos`, `ESP3DIpMode` |
| `main/modules/wifi/esp3d_wifi_sta.cpp` | STA event handler, `connect()`, `disconnect()`, `deinit()` |
| `main/modules/wifi/esp3d_wifi_ap.cpp` | AP event handler, `startAP()`, `stopAP()` |

All three files compile only when `ESP3D_WIFI_FEATURE` is enabled in the build configuration.

---

## Class Reference: `ESP3DWifiClient`

A `final` singleton class exposed as `extern ESP3DWifiClient esp3dWifiClient`. It manages both the STA and AP netifs and the underlying ESP-IDF WiFi driver.

```mermaid
classDiagram
    class ESP3DWifiClient {
        -bool _useStaticIp
        -bool _auto_reconnect_disabled
        -bool _wifi_sta_active
        -bool _wifi_driver_started
        -bool _need_services_restart
        -esp_netif_t* _wifiApPtr
        -esp_netif_t* _wifiStaPtr
        -EventGroupHandle_t _s_wifi_event_group
        -string _hostname

        +connect() bool
        +disconnect() bool
        +deinit() bool
        +isConnected() bool
        +userDisconnect() void

        +startAP(configMode, limited) bool
        +stopAP() bool

        +hasLostIp() bool
        +getLocalIp(ipInfo) bool
        +getLocalIpString() const char*
        +getSignal(RSSI, filter) int32_t
        +getAPMac() const char*
        +getSTAMac() const char*

        +disableAutoReconnect() void
        +clearAutoReconnectDisabled() void
        +isAutoReconnectDisabled() bool
        +isWifiDriverStarted() bool
        +setNeedServicesRestart(v) void
        +needServicesRestart() bool
        +useStaticIp() bool
        +getEventGroup() EventGroupHandle_t
        +getHostName() const char*
    }

    class ESP3DIpInfos {
        +esp_netif_ip_info_t ip_info
        +esp_netif_dns_info_t dns_info
    }

    class ESP3DIpMode {
        <<enumeration>>
        dhcp = 0
        staticIp = 1
    }

    ESP3DWifiClient --> ESP3DIpInfos : returns via getLocalIp()
    ESP3DWifiClient --> ESP3DIpMode : reads from NVS
```

### State Flags

| Flag | Meaning |
|------|---------|
| `_wifi_sta_active` | STA is fully connected and network services are running |
| `_wifi_driver_started` | `esp_wifi_start()` was called and not yet followed by `esp_wifi_stop()` |
| `_auto_reconnect_disabled` | User explicitly disconnected; auto-reconnect is suppressed |
| `_need_services_restart` | IP re-acquired during auto-reconnect; network services must be restarted by the next `handle()` cycle |

---

## STA Mode: Connection Lifecycle

### `connect()` Flow

```mermaid
flowchart TD
    A([connect called]) --> B{SSID configured?}
    B -->|No| Z([return false])
    B -->|Yes| C[Create FreeRTOS EventGroup]
    C --> D{_wifiStaPtr exists?}
    D -->|No| E[esp_netif_create_default_wifi_sta]
    D -->|Yes| F{WiFi driver initialized?}
    E --> F
    F -->|No| G["esp_wifi_init\n+ WIFI_STORAGE_RAM"]
    F -->|Yes| H[Reuse existing driver]
    G --> I["Register event handlers\nWIFI_EVENT + IP_EVENT"]
    H --> I
    I --> J[Read NVS: SSID, password, IP mode]
    J --> K{Static IP mode?}
    K -->|Yes| L[Stop DHCP client\nSet static IP / GW / mask / DNS]
    K -->|No| M[Start DHCP client]
    L --> N[Configure wifi_config_t\nSSID, password, scan method]
    M --> N
    N --> O["Set hostname + NetBIOS init"]
    O --> P[esp_wifi_start]
    P --> Q[xEventGroupWaitBits\nmax 45 seconds]
    Q --> R{Bits received?}
    R -->|WIFI_CONNECTED_BIT| S[Read IP from netif]
    R -->|WIFI_FAIL_BIT| T[Log failure]
    R -->|Timeout| U[Log timeout\nset status to '?']
    S --> V[dispatch IP message\nset status 'C'\nstart NetworkServices]
    T --> W([return false])
    U --> W
    V --> X([return true])
```

### Retry and Reconnect State Machine

The STA event handler (`wifi_sta_event_handler`) implements a layered retry strategy coordinated through a FreeRTOS `EventGroupHandle_t`.

```mermaid
stateDiagram-v2
    [*] --> Connecting : "WIFI_EVENT_STA_START\nclearAutoReconnectDisabled()\nstatus = T"

    Connecting --> Associated : "esp_wifi_connect() OK"
    Associated --> GotIP : IP_EVENT_STA_GOT_IP\nWIFI_CONNECTED_BIT set
    GotIP --> Active : "connect() unblocked\nstatus = C\nNetworkServices.begin()"

    Connecting --> ConnectFailed : "esp_wifi_connect() error\nWIFI_FAIL_BIT set"

    Active --> LostIP : IP_EVENT_STA_LOST_IP\nstatus = ?
    LostIP --> Reconnected : IP_EVENT_STA_GOT_IP\nstatus = C\nneedServicesRestart = true
    Reconnected --> Active : "NetworkServices restarted\nby networkTask handle()"

    Active --> Disconnected : WIFI_EVENT_STA_DISCONNECTED

    Disconnected --> AuthFailed : reason == AUTH_FAIL\nor 4WAY_HANDSHAKE_TIMEOUT\nstatus = A\nauto_reconnect_disabled = true\nWIFI_FAIL_BIT set

    Disconnected --> Retrying : "retry_num < 10\nstatus = ?\nesp_wifi_connect()"
    Retrying --> Associated : connect OK
    Retrying --> RetryFailed : retry_num >= 10\nWIFI_FAIL_BIT set

    Disconnected --> Stopped : "isAutoReconnectDisabled()\ndo not retry"

    ConnectFailed --> [*]
    AuthFailed --> [*]
    RetryFailed --> [*]
```

**Disconnect reason codes handled explicitly:**

| Reason | Code | Behaviour |
|--------|------|-----------|
| `WIFI_REASON_AUTH_FAIL` | 202 | Stop retrying immediately; status → `"A"` |
| `WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT` | 204 | Same as AUTH_FAIL (typical wrong-password indicator) |
| Any other reason | — | Retry up to `ESP3D_STA_MAXIMUM_RETRY` (10) times |

**Timeout:** `connect()` waits at most `ESP3D_WIFI_CONNECT_TIMEOUT_MS` (45 000 ms) for `WIFI_CONNECTED_BIT` or `WIFI_FAIL_BIT`. This prevents the network task from blocking forever when an AP associates but never answers DHCP.

---

## AP Mode: Startup and Teardown

### `startAP()` Flow

```mermaid
flowchart TD
    A([startAP called]) --> B{_wifiApPtr set?}
    B -->|Yes| C[stopAP first]
    C --> D{WiFi driver initialized?}
    B -->|No| D
    D -->|No| E["esp_wifi_init\n+ WIFI_STORAGE_RAM"]
    D -->|Yes| F[Reuse existing driver]
    E --> G[Register wifi_ap_event_handler]
    F --> G
    G --> H[Read NVS: SSID, password,\nchannel, static IP]
    H --> I[esp_netif_create_default_wifi_ap]
    I --> J[Stop DHCP server\nSet IP info\nRestart DHCP server]
    J --> K[esp_wifi_set_mode WIFI_MODE_AP]
    K --> L[esp_wifi_set_config]
    L --> M[esp_wifi_start]
    M --> N[Set hostname]
    N --> O[esp_netif_get_ip_info]
    O --> P{IP info OK?}
    P -->|Yes| Q[Build success message]
    P -->|No| R[Build failure message]
    Q --> S[dispatch message to all clients]
    R --> S
    S --> T{success AND NOT limited?}
    T -->|Yes| U[NetworkServices.begin]
    T -->|No| V([return success flag])
    U --> V
```

**`configMode` vs normal AP:**

| Flag | Gateway in netif | Use case |
|------|-----------------|---------|
| `configMode = true` | Same as AP IP | Configuration portal — AP acts as default gateway |
| `configMode = false` | `0` (none) | Standard AP — clients get IP but no routing |

**`limited = true`:** AP starts but `NetworkServices.begin()` is suppressed. Used when only the WiFi PHY is required without starting the full HTTP/mDNS/SSDP stack.

**Open vs secured AP:**

| Password | Auth mode |
|----------|-----------|
| Empty string | `WIFI_AUTH_OPEN` |
| Non-empty | `WIFI_AUTH_WPA_WPA2_PSK` |

---

## Driver Lifecycle: Soft vs Full Teardown

The WiFi driver (`esp_wifi_init` / `esp_wifi_deinit`) is **not** called on every `disconnect()` or `stopAP()`. Reusing the initialized driver avoids repeated heap fragmentation and startup latency across reconnect cycles.

```mermaid
sequenceDiagram
    participant Network as ESP3DNetwork
    participant WifiClient as ESP3DWifiClient
    participant EspWifi as esp_wifi_*
    participant EspNetif as esp_netif_*

    Note over Network,EspNetif: Soft disconnect (STA) - driver stays alive
    Network->>WifiClient: disconnect()
    WifiClient->>EspWifi: esp_wifi_disconnect()
    WifiClient->>EspWifi: esp_wifi_stop()
    WifiClient->>EspNetif: esp_netif_dhcpc_stop()
    Note right of WifiClient: _wifiStaPtr kept\nDriver not deinited\n_wifi_driver_started = false

    Note over Network,EspNetif: Soft AP stop - driver stays alive
    Network->>WifiClient: stopAP()
    WifiClient->>EspWifi: esp_wifi_stop()
    WifiClient->>EspNetif: esp_wifi_clear_default_wifi_driver_and_handlers
    WifiClient->>EspNetif: esp_netif_destroy_default_wifi(_wifiApPtr)
    Note right of WifiClient: _wifiApPtr = nullptr\nDriver not deinited

    Note over Network,EspNetif: Full deinit - when leaving WiFi entirely
    Network->>WifiClient: deinit()
    WifiClient->>WifiClient: stopAP() if AP running
    WifiClient->>WifiClient: disconnect() if event group set
    WifiClient->>EspNetif: esp_wifi_clear_default_wifi_driver_and_handlers(_wifiStaPtr)
    WifiClient->>EspNetif: esp_netif_destroy_default_wifi(_wifiStaPtr)
    WifiClient->>EspWifi: esp_wifi_deinit()
    Note right of WifiClient: All netifs freed\nDriver fully released
```

| Method | Driver after | STA netif after | AP netif after |
|--------|-------------|-----------------|----------------|
| `disconnect()` | Stopped (not deinited) | Kept | Unchanged |
| `stopAP()` | Not deinited | Unchanged | Destroyed |
| `deinit()` | Fully deinited | Destroyed | Destroyed |

---

## NVS Settings Used

The module reads the following settings from `ESP3DSettings` (NVS-backed).

### STA Settings

| Setting Index | Type | Description |
|---------------|------|-------------|
| `esp3d_sta_ssid` | string (32) | Target AP SSID |
| `esp3d_sta_password` | string (64) | WPA2 passphrase |
| `esp3d_sta_ip_mode` | byte | `0` = DHCP, `1` = static |
| `esp3d_sta_ip_static` | uint32 | Static IP (packed IPv4) |
| `esp3d_sta_gw_static` | uint32 | Static gateway |
| `esp3d_sta_mask_static` | uint32 | Static netmask |
| `esp3d_sta_dns_static` | uint32 | Static primary DNS |

### AP Settings

| Setting Index | Type | Description |
|---------------|------|-------------|
| `esp3d_ap_ssid` | string (32) | AP SSID to broadcast |
| `esp3d_ap_password` | string (64) | WPA2 passphrase (empty = open network) |
| `esp3d_ap_channel` | byte | WiFi channel (1–13) |
| `esp3d_ap_ip_static` | uint32 | AP IP address (DHCP pool base) |

### Common

| Setting Index | Type | Description |
|---------------|------|-------------|
| `esp3d_hostname` | string (32) | mDNS / NetBIOS hostname (NetBIOS truncated to 15 chars) |

---

## Connection Status Observable Values

The WiFi module writes to `ESP3DValuesIndex::connection_status` (and conditionally `server_status`). These drive the UI via the `ESP3DValues` observable/subscription system.

| Value | Meaning | Written when |
|-------|---------|-------------|
| `"U"` | Uninitialized | System startup |
| `"T"` | Trying to connect | `WIFI_EVENT_STA_START` fires |
| `"C"` | Connected (IP obtained) | `IP_EVENT_STA_GOT_IP` / `connect()` success path |
| `"?"` | Disconnected / IP lost | `STA_DISCONNECTED`, `STA_LOST_IP`, connect timeout |
| `"A"` | Authentication failure | `AUTH_FAIL` / `4WAY_HANDSHAKE_TIMEOUT` reason |

**`server_status` guard:** `server_status` is only written to `"?"` when the configured output client is `socket_client` (TCP-over-WiFi CNC). For serial, BT, or USB CNC configurations, WiFi is the remote-access transport only; writing `server_status` here would incorrectly flap the CNC connection indicator on every WiFi event.

---

## Data Flow: STA Connect

```mermaid
sequenceDiagram
    participant NET as ESP3DNetwork
    participant WIFI as ESP3DWifiClient
    participant EVT as wifi_sta_event_handler
    participant VAL as ESP3DValues
    participant SVC as ESP3DNetworkServices
    participant CMD as ESP3DCommands

    NET->>WIFI: connect()
    WIFI->>VAL: connection_status = '?'
    WIFI->>WIFI: create EventGroup\nregister WIFI + IP handlers

    WIFI->>WIFI: esp_wifi_set_mode(STA)\nesp_wifi_set_config\nesp_wifi_start()

    Note over EVT: WIFI_EVENT_STA_START fires
    EVT->>VAL: connection_status = 'T'
    EVT->>WIFI: esp_wifi_connect()

    Note over EVT: IP_EVENT_STA_GOT_IP fires
    EVT->>WIFI: xEventGroupSetBits(WIFI_CONNECTED_BIT)

    WIFI->>WIFI: xEventGroupWaitBits unblocks
    WIFI->>CMD: dispatch('Connected to SSID\n')
    WIFI->>VAL: connection_status = 'C'
    WIFI->>SVC: begin()

    Note over SVC: Starts HTTP, mDNS, SSDP,\nsocket client/server as configured
```

## Data Flow: AP Start

```mermaid
sequenceDiagram
    participant NET as ESP3DNetwork
    participant WIFI as ESP3DWifiClient
    participant SVC as ESP3DNetworkServices
    participant CMD as ESP3DCommands

    NET->>WIFI: startAP()
    WIFI->>WIFI: esp_wifi_init if not already done
    WIFI->>WIFI: register wifi_ap_event_handler
    WIFI->>WIFI: esp_netif_create_default_wifi_ap()
    WIFI->>WIFI: configure IP + DHCP server
    WIFI->>WIFI: esp_wifi_set_mode(AP)\nesp_wifi_set_config\nesp_wifi_start()
    WIFI->>WIFI: set hostname
    WIFI->>CMD: dispatch('Access Point SSID started…\n')
    WIFI->>SVC: begin()
```

---

## Interaction with ESP3DNetwork

`ESP3DWifiClient` is not called directly by application screens or CNC logic. All mode transitions are requested through `ESP3DNetwork::setMode()` or `ESP3DNetwork::setModeAsync()`. The `networkTask` (Core 0, `ESP3DXNetwork`) polls the module every 10 ms via `ESP3DXNetwork::handle()`.

```mermaid
graph LR
    settings["ESP3DSettings\nesp3d_radio_mode"]
    network["ESP3DNetwork\n.setMode()"]
    wificlient["ESP3DWifiClient"]
    sta["STA mode\n.connect()"]
    ap["AP mode\n.startAP()"]
    noradio["No Radio\n.startNoRadioMode()"]

    settings -->|on boot| network
    network -->|WIFI_STA| wificlient
    network -->|WIFI_AP| wificlient
    network -->|NO_RADIO| noradio
    wificlient --> sta
    wificlient --> ap
```

`ESP3DXNetwork::handle()` also monitors:
- `ESP3DWifiClient::hasLostIp()` — triggers AP fallback when configured
- `ESP3DWifiClient::needServicesRestart()` — restarts network services after IP re-acquired during auto-reconnect

---

## ESP Command Integration

WiFi settings are exposed through the `[ESP...]` command system dispatched via `ESP3DCommands`.

| Command | Action |
|---------|--------|
| `ESP100` | Get/set STA SSID |
| `ESP101` | Get/set STA password |
| `ESP102` | Get/set STA IP mode (DHCP / static) |
| `ESP103` | Get/set STA static IP |
| `ESP104` | Get/set STA static gateway |
| `ESP105` | Get/set STA static netmask |
| `ESP106` | Get/set STA static DNS |
| `ESP107` | Get/set AP SSID |
| `ESP108` | Get/set AP password |
| `ESP111` | Get current local IP address |
| `ESP410` | Scan available WiFi networks (used by WiFi scan screen) |

---

## Build Constraints

```mermaid
graph TB
    subgraph Mutually_Exclusive["Mutually Exclusive - hardware limit, no PSRAM"]
        WIFI["ESP3D_WIFI_FEATURE\n(WiFi radio)"]
        BT["ESP3D_BT_SERIAL_FEATURE\nor ESP3D_BT_BLE_FEATURE\n(Bluetooth radio)"]
    end

    WIFI -.->|Cannot coexist| BT

    subgraph WiFi_Role["WiFi Transport Role"]
        WIFI --> REMOTE["Default build\nSERIAL or USB CNC + WiFi remote\nWebUI + SSDP ON"]
        WIFI --> SOCKET["SOCKET_CLIENT_SERVICE ON\nWiFi CNC via TCP\nWebUI + SSDP OFF"]
    end

    SOCKET -.->|sanity_check.cmake forbids| FORBIDDEN["SSDP_SERVICE\nWEBUI_SERVER\nWS_SERVER_SERVICE\nWS_CLIENT_SERVICE"]
```

**Key rules (enforced by `cmake/sanity_check.cmake`):**

- `ESP3D_WIFI_FEATURE` and any Bluetooth feature are **mutually exclusive** — no PSRAM means both radio stacks cannot coexist.
- When `SOCKET_CLIENT_SERVICE` is ON (WiFi as CNC transport), `SSDP_SERVICE`, `WEBUI_SERVER`, `WS_SERVER_SERVICE`, and `WS_CLIENT_SERVICE` are **forbidden**.
- The **default `CMakeLists.txt`** has `SOCKET_CLIENT_SERVICE` OFF, WebUI and SSDP ON — WiFi is the remote access transport while CNC runs over serial or USB serial.

See [`docs/features/feature_resource_matrix.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/feature_resource_matrix.md) §2–§4 for the full compatibility matrix.

---

## Memory Considerations

The WiFi stack is the largest consumer of DRAM on this platform.

| Configuration | Available heap (approx.) |
|---------------|--------------------------|
| WiFi active | ~75 KB |
| Bluetooth mode | ~10 KB (WiFi must be OFF) |
| WiFi + heavy services under load | Can drop below 1 KB contiguous block |

Design decisions made to minimise allocation pressure:

- `esp_wifi_init()` is called **once** on first use and the driver is **reused** across soft-disconnect cycles. `esp_wifi_deinit()` is only invoked from `deinit()` when fully leaving WiFi mode.
- AP and STA `esp_netif_t` pointers are created once and reused; only `_wifiApPtr` is destroyed on `stopAP()`. `_wifiStaPtr` persists until `deinit()`.
- WiFi settings are read into **stack-allocated** fixed-size char buffers (max 65 bytes), never into heap-allocated `std::string` in hot paths.
- `WIFI_STORAGE_RAM` is set immediately after `esp_wifi_init()` to prevent the WiFi driver from persisting configuration to flash (reduces write wear and init latency).

See [`docs/guides/esp32_memory_constraints.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) — subsection *Serial CNC + WiFi remote — fragmentation playbook* — for fragmentation analysis under mixed workloads.

---

## Summary

```mermaid
mindmap
  root((WiFi Module))
    STA Mode
      connect
        FreeRTOS EventGroup
        45s bounded timeout
        10 retry max
        Auth fail stops retries
        Static IP or DHCP
      disconnect
        Soft stop driver alive
      deinit
        Full driver teardown
      userDisconnect
        Disables auto-reconnect
    AP Mode
      startAP
        configMode gateway variant
        limited mode skips services
        DHCP server managed
      stopAP
        Netif destroyed driver kept
    Status Reporting
      connection_status observable
      Values U T C ? A
      server_status guarded by output client
    Integration
      ESP3DNetwork orchestrates mode
      ESP3DNetworkServices on connect
      ESP3DValues UI observables
      ESP3DCommands ESP1xx
      ESP3DSettings NVS reads
    Build Constraints
      WiFi XOR Bluetooth
      SOCKET_CLIENT XOR WebUI
      Driver reuse across reconnects
      WIFI_STORAGE_RAM always set
```
