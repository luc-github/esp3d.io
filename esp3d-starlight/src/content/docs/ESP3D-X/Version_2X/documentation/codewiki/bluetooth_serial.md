---
title: "Bluetooth Serial (BT SPP) Transport Module"
---

# Bluetooth Serial (BT SPP) Transport Module

The `bluetooth_serial` module implements a **Bluetooth Classic Serial Port Profile (SPP)** transport for the ESP3D pendant firmware. It provides a wireless serial link to a CNC machine controller (FluidNC, grbl, grblHAL) without any cable, using the same message pipeline as the [Serial](serial_client.md) and [Socket Client](socket_client.md) transports.

> **Build gate:** the entire module is compiled only when `ESP3D_BT_SERIAL_FEATURE` is defined. Bluetooth and WiFi are mutually exclusive on the ESP32 (no PSRAM); see [Build Constraints](#build-constraints).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Connection State Machine](#connection-state-machine)
4. [Data Flow](#data-flow)
5. [Initialization Sequence](#initialization-sequence)
6. [Reconnection Logic](#reconnection-logic)
7. [Device Discovery (Scan)](#device-discovery-scan)
8. [Authentication & PIN Handling](#authentication--pin-handling)
9. [Configuration](#configuration)
10. [NVS Settings](#nvs-settings)
11. [Connection Status Values](#connection-status-values)
12. [API Reference](#api-reference)
13. [Thread Safety Model](#thread-safety-model)
14. [Memory Constraints](#memory-constraints)
15. [Build Constraints](#build-constraints)
16. [Related Modules](#related-modules)

---

## Architecture Overview

The module sits in the **Communication Transports** layer, alongside the serial, BLE, USB-serial, socket, and WebSocket clients. All transports share the same `ESP3DClient` base class and feed into the same GCode pipeline.

```mermaid
graph TD
    subgraph "Core Platform"
        CMD["esp3dCommands\n(command dispatcher)"]
        VAL["esp3dXValues\n(observable values)"]
        SET["esp3dXSettings\n(NVS settings)"]
        GCH["esp3dGcodeHandler\n(CNC protocol)"]
    end

    subgraph "Communication Transports"
        SER["Serial Client\n(UART)"]
        BTS["ESP3DBTSerialClient\n(BT SPP) ← current module"]
        BLE["BT BLE Client\n(GATT)"]
        SOC["Socket Client\n(WiFi TCP)"]
    end

    subgraph "Bluetooth Stack (ESP-IDF)"
        GAP["GAP Layer\nesp_bt_gap_*"]
        SPP["SPP Layer\nesp_spp_*"]
        BTC["BT Controller\nesp_bt_controller_*"]
        BDR["Bluedroid Stack\nesp_bluedroid_*"]
    end

    subgraph "UI Layer"
        SCN["scan_bt_screen\n(device picker)"]
        SET_SCN["settings_list_screen\n(address / PIN config)"]
        CON_SCN["connection_status_screen\n(live status)"]
    end

    BTS -->|"process() / handle()"| CMD
    BTS -->|"set_value(connection_status)"| VAL
    BTS -->|"readString / writeString"| SET
    BTS -->|"getInitCommand()"| GCH

    BTS -->|"esp_bt_gap_register_callback"| GAP
    BTS -->|"esp_spp_enhanced_init\nesp_spp_connect\nesp_spp_write"| SPP
    GAP -->|"GAP callbacks"| BTS
    SPP -->|"SPP callbacks"| BTS

    SPP --> BTC
    GAP --> BDR
    BTC --> BDR

    SCN -->|"btSerialClient.scan()"| BTS
    SET_SCN -->|"setCurrentAddress/Name"| BTS
    CON_SCN -->|"subscribes connection_status"| VAL

    style BTS fill:#4a90d9,color:#fff,stroke:#2c6fad
```

---

## Component Structure

```mermaid
classDiagram
    class ESP3DClient {
        <<abstract base>>
        +begin() bool
        +handle()
        +end()
        +flush()
        +process(msg) void
        +addRxData(msg) bool
        +addTxData(msg) bool
        +popRx() ESP3DMessage*
        +popTx() ESP3DMessage*
        +enqueueTxByPriority(msg) bool
        +clearRxQueue() bool
        +clearTxQueue() bool
        +getRxMsgsCount() size_t
        +getTxMsgsCount() size_t
        -_rx_queue deque
        -_tx_queue deque
        -_rx_mutex pthread_mutex_t*
        -_tx_mutex pthread_mutex_t*
    }

    class ESP3DBTSerialClient {
        +begin() bool
        +handle()
        +end()
        +process(msg) void
        +flush()
        +connect() bool
        +disconnect() bool
        +scan(devices) bool
        +isConnected() bool
        +canSendData() bool
        +clearBondedDevices() bool
        +clearTargetDevice() bool
        +setCurrentName(name) bool
        +setCurrentAddress(addr) bool
        +getCurrentName() const char*
        +getCurrentAddress() const char*
        +sppWriteSafe(data, size) esp_err_t
        +resetInitCommand()
        +isReconnectActive() bool
        -_connection_state ConnectionState
        -_spp_handle int
        -_rxBuffer uint8_t*
        -_rxBufferPos size_t
        -_autoconnect bool
        -_reconnect_attempts uint8_t
        -_reconnect_delay_ms uint32_t
        -_init_command_sent bool
        -_auth_failed_ volatile bool
        -_connection_closing volatile bool
        -_connection_mutex pthread_mutex_t
        -_rxbuf_mutex pthread_mutex_t
        -_tx_mutex pthread_mutex_t
        -_rx_mutex pthread_mutex_t
        -sendInitCommand()
        -setConnectionState(state)
        -sppCallback(event, param)
        -esp_bt_gap_cb(event, param)
    }

    class ConnectionState {
        <<enumeration>>
        DISCONNECTED
        CONNECTING
        STABILIZING
        CONNECTED
    }

    class BTDevice {
        +addr esp_bd_addr_t
        +name std::string
        +rssi int8_t
    }

    class esp3d_bt_serial_config_t {
        +spp_channel uint32_t
        +device_name char[32]
        +discoverable bool
        +connectable bool
        +scan_duration uint16_t
        +rx_buffer_size size_t
        +tx_buffer_size size_t
    }

    ESP3DBTSerialClient --|> ESP3DClient : inherits
    ESP3DBTSerialClient --> ConnectionState : uses
    ESP3DBTSerialClient --> BTDevice : discovers / stores
    ESP3DBTSerialClient --> esp3d_bt_serial_config_t : configured by
```

### Key Files

| File | Purpose |
|---|---|
| `esp3d_bt_serial_client.h` | `ESP3DBTSerialClient` class declaration |
| `esp3d_bt_serial_client.cpp` | Full implementation – lifecycle, GAP/SPP callbacks, queue management |
| `esp3d_bt_serial_config.h` | `esp3d_bt_serial_config_t` struct + extern `esp3dBTSerialConfig` |
| `esp3d_bt_device.h` | `BTDevice` struct (scan result: address, name, RSSI) |

---

## Connection State Machine

The client tracks the link through four states. Transitions are driven by SPP and GAP callbacks arriving on the Bluedroid BTC task.

```mermaid
stateDiagram-v2
    [*] --> DISCONNECTED : "begin() / end()"

    DISCONNECTED --> CONNECTING : "connect() called\naddress valid in NVS"

    CONNECTING --> STABILIZING : ESP_SPP_OPEN_EVT success\nhandle = valid
    CONNECTING --> DISCONNECTED : ESP_SPP_OPEN_EVT failure\nor ESP_SPP_CLOSE_EVT while CONNECTING\n(stale bond cleared)

    STABILIZING --> CONNECTED : "CONNECTION_STABILIZATION_DELAY_MS elapsed (500 ms)\ncanSendData() triggers sendInitCommand()"
    STABILIZING --> DISCONNECTED : ESP_SPP_CLOSE_EVT

    CONNECTED --> DISCONNECTED : ESP_SPP_CLOSE_EVT\nor ESP_SPP_WRITE_EVT failure (no connection)\nor Auth failure (ESP_BT_GAP_AUTH_CMPL_EVT)

    DISCONNECTED --> CONNECTING : Auto-reconnect\n(up to 5 attempts, exponential back-off)
```

**State effects:**

| Transition | Side effect |
|---|---|
| `→ DISCONNECTED` | TX queue cleared immediately; `_spp_handle = -1` |
| `→ CONNECTING` | Timestamps zeroed; `connection_status = "T"` |
| `→ STABILIZING` | Connection timestamp saved; `connection_status = "C"` |
| `→ CONNECTED` | `sendInitCommand()` called (GCode handler init string) |
| Auth fail `→ DISCONNECTED` | `autoconnect = false`; `connection_status = "A"` |

---

## Data Flow

### Receive Path (CNC → Pendant)

```mermaid
sequenceDiagram
    participant CNC as CNC Machine
    participant SPP as ESP-IDF SPP Stack<br/>(BTC task)
    participant CB as sppCallback()<br/>ESP_SPP_DATA_IND_EVT
    participant BUF as _rxBuffer<br/>(accumulation)
    participant RXQ as RX Queue<br/>(ESP3DClient)
    participant HDL as handle()<br/>(main loop task)
    participant CMD as esp3dCommands

    CNC->>SPP: Bluetooth frame
    SPP->>CB: DATA_IND_EVT callback
    CB->>BUF: lock _rxbuf_mutex<br/>byte-by-byte append
    alt end char detected (\n or \r)
        BUF->>RXQ: pushMsgToRxQueue()
        Note over BUF: _rxBufferPos reset
    else buffer full (overflow)
        BUF->>RXQ: flush partial buffer to pushMsgToRxQueue()
    end
    CB-->>SPP: unlock _rxbuf_mutex

    loop handle() polling
        HDL->>HDL: RX_FLUSH_TIMEOUT_MS check (1500 ms)<br/>flush stale partial line
        HDL->>RXQ: getRxMsgsCount() > 0?
        RXQ-->>HDL: msg
        HDL->>CMD: esp3dCommands.process(msg)
    end
```

> **RX queue eviction policy:** when the queue is full, the oldest messages are dropped to make room—never processed from inside the BTC callback, which avoids re-entrant BT API calls and stack stalls from heavy `[ESP]` commands.

### Transmit Path (Pendant → CNC)

```mermaid
sequenceDiagram
    participant CMD as esp3dCommands<br/>/ GCode host
    participant PROC as process()
    participant TXQ as TX Queue<br/>(ESP3DClient)
    participant HDL as handle()<br/>(main loop task)
    participant SPP as sppWriteSafe()<br/>esp_spp_write()
    participant CNC as CNC Machine

    CMD->>PROC: ESP3DMessage (normal or high-priority)
    PROC->>PROC: canSendData()?
    alt not ready
        PROC->>PROC: deleteMsg() - discard
    else ready
        PROC->>TXQ: enqueueTxByPriority()<br/>high priority → front, normal → back
    end

    loop handle() main loop
        HDL->>HDL: canSendData()?
        HDL->>TXQ: popTx()
        TXQ-->>HDL: msg
        HDL->>SPP: sppWriteSafe(data, size)
        Note over SPP: holds _connection_mutex<br/>verifies state atomically
        SPP->>CNC: Bluetooth SPP frame
    end
```

---

## Initialization Sequence

```mermaid
sequenceDiagram
    participant APP as ESP3DX::begin()
    participant CLI as btSerialClient.begin()
    participant ESP as ESP-IDF BT APIs
    participant GAP as GAP callback
    participant SPP as SPP callback
    participant GCH as esp3dGcodeHandler

    APP->>CLI: begin()
    CLI->>CLI: configure(esp3dBTSerialConfig)
    CLI->>CLI: malloc(_rxBuffer)
    CLI->>CLI: pthread_mutex_init x4
    CLI->>ESP: esp_bt_controller_mem_release(BLE)<br/>free BLE RAM - not needed
    CLI->>ESP: esp_bt_controller_init(CLASSIC_BT)
    CLI->>ESP: esp_bt_controller_enable(CLASSIC_BT)
    CLI->>ESP: esp_bluedroid_init_with_cfg(ssp_en=false)
    CLI->>ESP: esp_bluedroid_enable()
    CLI->>ESP: esp_bt_gap_register_callback()
    CLI->>ESP: esp_bt_gap_set_device_name(hostname)
    CLI->>ESP: esp_spp_register_callback()
    CLI->>ESP: esp_spp_enhanced_init(MODE_CB)
    CLI->>CLI: connect() calls esp_spp_connect()
    Note over CLI: connection_status = 'T'

    ESP-->>SPP: ESP_SPP_OPEN_EVT success
    SPP->>CLI: setConnectionState(STABILIZING)
    Note over CLI: connection_status = 'C'

    Note over CLI: wait 500 ms in STABILIZING state
    CLI->>CLI: canSendData() triggers CONNECTED
    CLI->>GCH: getInitCommand()
    CLI->>ESP: esp_spp_write(initCmd)
    Note over CLI: _init_command_sent = true
    GCH->>GCH: resetStartupCommandsSent()
```

---

## Reconnection Logic

The module implements an **exponential back-off** reconnection strategy, driven entirely by `handle()` polling — no background reconnection task.

```mermaid
flowchart TD
    A([handle called]) --> B{_started?}
    B -- No --> Z([return])
    B -- Yes --> C{canSendData?}
    C -- Yes --> D[Process RX and TX queues]
    D --> E{_autoconnect?}
    C -- No --> E

    E -- No --> Z
    E -- Yes --> F{state == DISCONNECTED?}
    F -- No --> Z
    F -- Yes --> G{_reconnect_active?}

    G -- No --> H["Init: attempts=0<br/>delay=5000 ms<br/>record timestamp"]
    H --> I{"attempts less than 5<br/>AND delay elapsed?"}
    G -- Yes --> I

    I -- No --> Z
    I -- Yes --> J["connect()<br/>attempts++<br/>delay times 2"]
    J --> K{"attempts >= 5?"}
    K -- No --> Z
    K -- Yes --> L["Reset counters<br/>autoconnect = false<br/>connection_status = '?'"]
    L --> Z
```

**Back-off schedule:**

| Attempt | Delay before attempt |
|---|---|
| 1 | 5 s |
| 2 | 10 s |
| 3 | 20 s |
| 4 | 40 s |
| 5 | 80 s |
| — | Auto-reconnect disabled, `connection_status = "?"` |

> `_autoconnect` is permanently disabled after an **authentication failure** (`ESP_BT_GAP_AUTH_CMPL_EVT` non-success). The user must reconfigure the PIN and manually initiate a new connection.

---

## Device Discovery (Scan)

The `scan()` method is called by the [`scan_bt_screen`](UI_Framework_and_Screens.md) UI screen. It is **blocking** for the duration of the inquiry (scan duration + 10 s safety margin).

```mermaid
sequenceDiagram
    participant UI as scan_bt_screen<br/>bt_scan_task
    participant CLI as btSerialClient.scan()
    participant GAP as esp_bt_gap_*
    participant CB as esp_bt_gap_callback

    UI->>CLI: scan(devices)
    CLI->>CLI: clear discovered_devices
    CLI->>GAP: esp_bt_gap_register_callback()
    CLI->>GAP: esp_bt_gap_start_discovery(GENERAL_INQUIRY, duration)

    loop Until scan_completed OR timeout
        CLI->>CLI: wait 100 ms
        GAP-->>CB: DISC_RES_EVT (device found)
        CB->>CB: parse EIR for name and RSSI
        CB->>CB: update or append to discovered_devices[]
        alt name not in EIR
            CB->>GAP: esp_bt_gap_read_remote_name()
            GAP-->>CB: READ_REMOTE_NAME_EVT
            CB->>CB: update name in discovered_devices[]
        end
        GAP-->>CB: DISC_STATE_CHANGED_EVT STOPPED
        CB->>CLI: _scan_completed = true
    end

    CLI-->>UI: devices via move semantics
```

**Scan result deduplication:** devices are matched by `esp_bd_addr_t`. Duplicate reports update the name and RSSI of the existing entry. The list is capped at `ESP3D_BT_MAX_SCAN_RESULTS` entries.

---

## Authentication & PIN Handling

The module uses **legacy PIN-based authentication** (SSP disabled: `ssp_en = false` in the Bluedroid config):

```mermaid
sequenceDiagram
    participant BT as BT Controller
    participant GAP as esp_bt_gap_callback
    participant NVS as esp3dXSettings

    BT->>GAP: ESP_BT_GAP_PIN_REQ_EVT
    GAP->>NVS: readString(esp3d_btserial_pin)
    alt PIN empty or unset
        NVS-->>GAP: empty string
        GAP->>GAP: default to '1234'
    else PIN configured
        NVS-->>GAP: configured PIN string
    end
    GAP->>BT: esp_bt_gap_pin_reply(bda, true, len, pin_code)

    BT->>GAP: ESP_BT_GAP_AUTH_CMPL_EVT
    alt success
        GAP->>GAP: log authentication success
    else failure
        GAP->>GAP: _auth_failed_ = true<br/>_autoconnect = false<br/>connection_status = 'A'
        GAP->>GAP: setConnectionState(DISCONNECTED)
    end
```

> **Auth-fail / CLOSE_EVT race:** `_auth_failed_` is a `volatile bool` written by the GAP task before `ESP_SPP_CLOSE_EVT` fires on the BTC task. `sppCallback()` reads it to suppress the duplicate `"?"` status update and to skip bond-clearing when the auth failure was already handled.

---

## Configuration

The module is configured via the `esp3d_bt_serial_config_t` struct. The board-specific default instance `esp3dBTSerialConfig` is defined in the board's `bt_services_def.h`.

```c
typedef struct {
    uint32_t spp_channel;      // SPP channel number (typically 1)
    char     device_name[32];  // Pendant's own BT name (overridden by NVS hostname at begin())
    bool     discoverable;     // Whether the pendant is visible to other devices
    bool     connectable;      // Whether the pendant accepts incoming connections
    uint16_t scan_duration;    // Inquiry scan length in seconds
    size_t   rx_buffer_size;   // Line accumulation buffer in bytes
    size_t   tx_buffer_size;   // TX buffer size in bytes (reference only)
} esp3d_bt_serial_config_t;
```

**Runtime overrides applied in `begin()`:**
- `device_name` is overwritten from the NVS setting `esp3d_hostname` (e.g., `"PibotCNC"`).
- `rx_buffer_size` determines the heap allocation for `_rxBuffer`; the RX queue max is hard-coded to 4096 bytes via `setRxMaxSize(4096)`.

---

## NVS Settings

The module reads and writes the following NVS-backed settings via [`ESP3DSettings`](Core_Platform_and_Infrastructure.md):

| Setting Index | Purpose | Read by | Written by |
|---|---|---|---|
| `esp3d_btserial_address` | Target device MAC (`"AA:BB:CC:DD:EE:FF"`) | `connect()` | `setCurrentAddress()` |
| `esp3d_btserial_name` | Target device friendly name | `connect()` | `setCurrentName()`, `clearTargetDevice()` |
| `esp3d_btserial_pin` | PIN code for authentication | `esp_bt_gap_cb()` PIN_REQ_EVT | UI settings screen |
| `esp3d_hostname` | Pendant's own Bluetooth advertised name | `begin()` | — |

MAC address parsing is tolerant of three formats: `AA:BB:CC:DD:EE:FF`, `AA-BB-CC-DD-EE-FF`, and `AABBCCDDEEFF`.

---

## Connection Status Values

The module sets `ESP3DValuesIndex::connection_status` via `esp3dXValues.set_value()`. These values are consumed by the UI [`connection_status_screen`](UI_Framework_and_Screens.md) and the `ConnectionStatusComponent`.

| Value | Meaning |
|---|---|
| `"T"` | **Trying** – SPP connection initiated (`connect()` called or `SPP_CL_INIT_EVT`) |
| `"C"` | **Connected** – SPP link open (`ESP_SPP_OPEN_EVT` success) |
| `"?"` | **Disconnected** – Link dropped (`ESP_SPP_CLOSE_EVT`) or max reconnects exhausted |
| `"A"` | **Auth failed** – Wrong PIN (`ESP_BT_GAP_AUTH_CMPL_EVT` failure) |

`server_status` (set to `"?"` on disconnect, then set to `"C"` by the GCode handler after the init command is acknowledged) follows the same model as the serial and socket transports — see [`CNC_Firmware_Integration`](CNC_Firmware_Integration.md).

---

## API Reference

### Lifecycle

| Method | Description |
|---|---|
| `begin()` | Initializes BT stack (controller → Bluedroid → GAP → SPP), allocates buffers, starts connection. Returns `false` on any stack init failure. |
| `handle()` | Drains RX/TX queues, flushes partial lines on timeout, drives reconnect state machine. Must be called frequently from the main loop task. |
| `end()` | Orderly shutdown: deinits SPP → Bluedroid → BT controller, then destroys mutexes and frees `_rxBuffer`. Safe to call even if not started. |
| `flush()` | No-op (deprecated). TX is driven entirely by `handle()`. |

### Connection Control

| Method | Description |
|---|---|
| `connect()` | Reads MAC address from NVS, calls `esp_spp_connect()`. Disconnects first if already connected. |
| `disconnect()` | Disables auto-reconnect, calls `esp_spp_disconnect()`. |
| `isConnected()` | Returns `true` if `_spp_handle != -1` (handle assigned by `ESP_SPP_OPEN_EVT`). |
| `canSendData()` | Thread-safe check: returns `true` only in CONNECTED, or when STABILIZING delay has elapsed. Triggers CONNECTED transition when delay passes. |
| `clearTargetDevice()` | Clears NVS address and name, disables auto-reconnect. Used by the "Forget BT host" settings action. |
| `clearBondedDevices()` | Removes all bonded devices from the BT controller bond list. Called automatically on CLOSE without OPEN while CONNECTING (stale bond recovery). |

### Device Discovery

| Method | Description |
|---|---|
| `scan(devices)` | Blocking inquiry scan. Populates `devices` vector with `BTDevice` entries. Returns `false` on timeout or stack error. |
| `getScanMaxDuration()` | Returns total timeout in ms for `scan()`: `(scan_duration + 10) * 1000`. |

### Message Handling

| Method | Description |
|---|---|
| `process(msg)` | Entry point from `esp3dCommands`. Checks `canSendData()`, enqueues to TX with priority. Discards message if not ready. |
| `pushMsgToRxQueue(buf, size)` | Wraps a raw buffer into an `ESP3DMessage` and enqueues to the RX queue. Evicts oldest entries on overflow. |
| `isEndChar(ch)` | Returns `true` for `'\n'` or `'\r'` — line terminator detection for message framing. |

### Utility

| Method | Description |
|---|---|
| `bda2str(bda, str, size)` | Converts binary BT address to `"XX:XX:XX:XX:XX:XX"` string. |
| `str2bda(str, bda)` | Parses MAC string (colon, dash, or bare hex formats) to binary `esp_bd_addr_t`. |
| `rssi_to_percentage(rssi)` | Maps RSSI dBm (−100 to −30) to 0–100 % signal strength. |
| `setCurrentName(name)` | Persists friendly name to NVS and updates `_current_name`. |
| `setCurrentAddress(addr)` | Persists MAC address to NVS and updates `_current_address`. |

---

## Thread Safety Model

The module runs across two execution contexts simultaneously:

| Context | Runs on | Accesses |
|---|---|---|
| **Main loop task** | `handle()`, `process()` | TX/RX queues, reconnect state, `_rxBuffer` flush |
| **Bluedroid BTC task** | GAP & SPP callbacks | `_spp_handle`, `_rxBuffer`, `_connection_state`, queues |

Four pthread mutexes coordinate concurrent access:

```mermaid
graph LR
    subgraph Mutexes
        TXM["_tx_mutex\nbase class TX queue"]
        RXM["_rx_mutex\nbase class RX queue"]
        CNX["_connection_mutex\n_spp_handle, _connection_state\n_connection_closing, timestamps"]
        RXB["_rxbuf_mutex\n_rxBuffer and _rxBufferPos\naccumulation only"]
    end

    subgraph "Main loop task"
        HDL["handle()"]
        SND["sppWriteSafe()"]
    end

    subgraph "BTC task (callbacks)"
        SPP_CB["sppCallback()"]
        GAP_CB["esp_bt_gap_cb()"]
    end

    HDL --- TXM
    HDL --- RXM
    HDL --- RXB
    SND --- CNX
    SPP_CB --- CNX
    SPP_CB --- RXB
    GAP_CB --- CNX
```

> **Shutdown ordering (`end()`):** the BT stack (`esp_spp_deinit()` → `esp_bluedroid_disable()` → `esp_bt_controller_deinit()`) is torn down **before** mutexes are destroyed and `_rxBuffer` is freed. This prevents in-flight callbacks from writing to freed memory — replacing the previous blind 1000 ms wait that neither stopped callbacks nor waited for their completion.

---

## Memory Constraints

> This module runs on a **memory-constrained ESP32** with approximately **10 KB usable heap** in Bluetooth mode.

| Resource | Size / Notes |
|---|---|
| `_rxBuffer` | `rx_buffer_size` bytes — heap-allocated in `begin()`, freed in `end()` |
| RX queue max | 4096 bytes, set via `setRxMaxSize(4096)` |
| `discovered_devices` | `std::vector<BTDevice>`, capped at `ESP3D_BT_MAX_SCAN_RESULTS`; released after scan via move semantics and `shrink_to_fit()` |
| Bond-list buffer | Temporary `malloc(sizeof(esp_bd_addr_t) * N)` in `clearBondedDevices()`, freed immediately after use |
| BLE memory reclaim | `esp_bt_controller_mem_release(ESP_BT_MODE_BLE)` in `begin()` recovers approximately 60 KB |

**Allocation guard pattern (enforced throughout):**
```c
uint8_t* buf = (uint8_t*)malloc(size);
if (!buf) {
    esp3d_log_e("alloc failed (free=%u largest=%u)",
                heap_caps_get_free_size(MALLOC_CAP_INTERNAL),
                heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL));
    return false;
}
```

See [`docs/guides/esp32_memory_constraints.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) for the general fragmentation playbook.

---

## Build Constraints

```mermaid
graph TD
    F1["ESP3D_BT_SERIAL_FEATURE ON"]
    F2["ESP3D_BT_BLE_FEATURE ON"]
    F3["ESP3D_WIFI_FEATURE ON"]
    F4["SOCKET_CLIENT_SERVICE ON"]

    F1 -- "mutually exclusive\nno PSRAM shared radio" --> F3
    F2 -- "mutually exclusive\nno PSRAM shared radio" --> F3
    F1 -- "mutually exclusive\nboth require BT radio" --> F2
    F4 -- "mutually exclusive\nWiFi required for TCP" --> F1

    style F1 fill:#4a90d9,color:#fff
    style F3 fill:#e07040,color:#fff
    style F2 fill:#888,color:#fff
    style F4 fill:#888,color:#fff
```

- **BT Serial + WiFi:** cannot be active simultaneously on the standard ESP32 (no PSRAM). Enforced by `cmake/sanity_check.cmake`.
- **BT Serial + BT BLE:** only one BT mode can be active at a time. BLE memory is explicitly released in `begin()` via `esp_bt_controller_mem_release(ESP_BT_MODE_BLE)`.
- **BT Serial + Socket Client:** Socket Client requires WiFi, which is incompatible with BT.
- **Memory reclaimed at `begin()`:** releasing BLE mode RAM is the prerequisite that makes the Classic BT stack fit in available DRAM.

Refer to [`docs/features/feature_resource_matrix.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/feature_resource_matrix.md) for the full feature compatibility matrix and resource ticket accounting.

---

## Related Modules

| Module | Relationship |
|---|---|
| [`serial_client`](serial_client.md) | Sibling UART transport — same `ESP3DClient` base, same queue and init-command model |
| [`bluetooth_ble`](bluetooth_ble.md) | Sibling BLE/GATT transport — mutually exclusive with this module at build time |
| [`socket_client`](socket_client.md) | Sibling WiFi TCP transport — mutually exclusive with this module at build time |
| [`Core_Platform_&_Infrastructure`](Core_Platform_and_Infrastructure.md) | `ESP3DClient` base class, `ESP3DMessage`, `ESP3DSettings`, `ESP3DValues` |
| [`CNC_Firmware_Integration`](CNC_Firmware_Integration.md) | `esp3dGcodeHandler.getInitCommand()` and `resetStartupCommandsSent()` used by `sendInitCommand()` |
| [`UI_Framework_&_Screens`](UI_Framework_and_Screens.md) | `scan_bt_screen` (device picker), `settings_list_screen` (PIN/address), `connection_status_screen` (live status) |
| [`docs/features/feature_resource_matrix.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/feature_resource_matrix.md) | BT vs. WiFi resource trade-offs and feature flag combinations |
| [`docs/guides/esp32_memory_constraints.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) | Heap fragmentation guidance for BT mode (~10 KB available heap) |
| [`docs/architecture/connection_management.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) | Shared initialization sequence and `"U"/"T"/"C"/"?"` status model across all transports |
