---
title: "WebSocket Client Module"
---

# WebSocket Client Module

> **Scope:** `main/modules/websocket_client/` + `components/esp_websocket_client/` — outbound WebSocket transport for CNC communication
> **Build flag:** `ESP3D_WS_CLIENT_SERVICE_FEATURE`
> **Last updated:** 2026-09-03

---

## Overview

The WebSocket client module provides an outbound WebSocket (WS/WSS) transport that connects the pendant directly to a CNC controller running FluidNC or grblHAL. It is one of four independent CNC transports (Serial, BT Serial, BT BLE, WebSocket/TCP Socket) and is gated at build time by `ESP3D_WS_CLIENT_SERVICE_FEATURE`.

The module is **mutually exclusive** with the TCP Socket Client (`ESP3D_SOCKET_CLIENT_FEATURE`) — both fulfil the same outbound-TCP-to-CNC role; only one may be compiled in at a time (`cmake/sanity_check.cmake` enforces this).

| Transport | Source files | CNC link | Notes |
|---|---|---|---|
| Serial UART | `esp3d_serial_client.*` | UART | Always available |
| BT Serial (SPP) | `esp3d_bt_serial_client.*` | Classic BT | Mutually exclusive with WiFi |
| BT BLE (GATT) | `esp3d_bt_ble_client.*` | BLE | Mutually exclusive with WiFi |
| Socket Client (TCP) | `esp3d_socket_client.*` | WiFi TCP | Mutually exclusive with this module |
| **WebSocket Client** | `esp3d_websocket_client.*` | **WiFi WS/WSS** | **This module** |

See [connection_management.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) for the high-level connection flow and status observable semantics, and [feature_resource_matrix.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/feature_resource_matrix.md) §2 for the full build-exclusion matrix.

---

## File Layout

```
main/modules/websocket_client/
├── esp3d_websocket_client.h     — Class + enum declarations; extern singleton
└── esp3d_websocket_client.cpp   — Full implementation; RX task; event handler

components/esp_websocket_client/
├── esp_websocket_client.c       — Vendored IDF WS transport (TCP + RFC 6455 framing)
└── include/esp_websocket_client.h — API used by this module
```

**Global singleton** (defined in `esp3d_websocket_client.cpp`):

```cpp
ESP3DWebsocketClient esp3dWebsocketClient;
```

---

## Class Hierarchy

```
ESP3DClient  (esp3d_client.h — queue management, message lifecycle, mutex helpers)
    └── ESP3DWebsocketClient  (esp3d_websocket_client.h/.cpp)
```

`ESP3DClient` supplies:
- `addRxData()` / `popRx()` / `getRxMsgsCount()` / `clearRxQueue()`
- `addTxData()` / `popTx()` / `getTxMsgsCount()` / `clearTxQueue()`
- `enqueueTxByPriority()` — high-priority → front of deque, normal → back
- `setRxMutex()` / `setTxMutex()` — queue thread-safety hooks
- `newMsg()` / `deleteMsg()` / `setDataContent()` — `ESP3DMessage` lifecycle

---

## Internal Types

### `WsChunk` (anonymous namespace, `.cpp`)

Fixed-size struct passed through the FreeRTOS chunk queue from the WS event callback to the RX task. Avoids dynamic allocation in the ISR-context callback.

```cpp
struct WsChunk {
  uint16_t len;
  uint8_t  data[ESP3D_WS_CLIENT_CHUNK_MAX];   // 128 bytes (tasks_def.h)
};
```

### `ESP3DWebsocketClientState` (`uint8_t` enum, `.h`)

```cpp
enum class ESP3DWebsocketClientState : uint8_t {
  disconnected = 0,
  connected,
};
```

### `ESP3DWebSocketSubprotocol` (`uint8_t` enum, `.h`)

```cpp
enum class ESP3DWebSocketSubprotocol : uint8_t {
  none     = 0,   // No Sec-WebSocket-Protocol header
  webui_v3 = 1,   // "webui-v3" — FluidNC WebUI v3 binary machine stream
  esp3d_v1 = 2,   // "esp3d-v1"
  arduino  = 3,   // "arduino"
};
```

### Key Private Fields

| Field | Type | Purpose |
|---|---|---|
| `_ws_client` | `esp_websocket_client*` | Handle to the IDF WebSocket transport |
| `_state` | `ESP3DWebsocketClientState` | Connected / disconnected |
| `_host[64]` | `char[]` | CNC hostname or IP (scheme-prefix stripped) |
| `_path[32]` | `char[]` | WS path (e.g. `/ws`, default `/`) |
| `_uri[128]` | `char[]` | Assembled URI (`ws[s]://host:port/path`) |
| `_port` | `uint32_t` | CNC WebSocket port |
| `_started` | `bool` | True between `begin()` success and `end()` |
| `_isRunning` | `bool` | Controls the RX task loop |
| `_xHandle` | `TaskHandle_t` | RX task handle; set to `nullptr` on task exit |
| `_chunk_queue` | `QueueHandle_t` | ISR-safe queue: event callback → RX task |
| `_buffer` | `char*` | Line-assembly buffer (heap, allocated in `begin()`) |
| `_buffer_pos` | `size_t` | Write cursor in `_buffer` |
| `_rx_timeout_ms` | `uint64_t` | Timestamp of last chunk received (drives flush timer) |
| `_last_data_received_ms` | `uint64_t` | Timestamp of last CNC data (drives inactivity check) |
| `_last_ping_time_ms` | `uint64_t` | Timestamp of last ping (throttles `?\n` sends) |
| `_init_command_sent` | `bool` | Prevents duplicate GCode init command per connection |
| `_requires_explicit_connect` | `bool` | When set, `begin()` skips auto-start |
| `_subprotocol` | `ESP3DWebSocketSubprotocol` | Active subprotocol selection |

---

## Build Configuration

Enable in `CMakeLists.txt`:

```cmake
option(WS_CLIENT_SERVICE "WebSocket client to CNC" OFF)
```

`cmake/features.cmake` converts this to the `ESP3D_WS_CLIENT_SERVICE_FEATURE` preprocessor define.

`cmake/sanity_check.cmake` forbids combining:
- `WS_CLIENT_SERVICE` + `SOCKET_CLIENT_SERVICE` — two competing CNC-over-WiFi transports.
- `WS_CLIENT_SERVICE` + any Bluetooth transport — hardware mutual exclusion (no PSRAM on target boards).

---

## Lifecycle

### Connection State Machine

```
[firmware start / end()]
        │
        ▼
   Unconfigured
        │
        ├── feature OFF or no addr/port ──────► Disabled   (begin() → true, no-op)
        │
        ├── _requires_explicit_connect set ───► WaitingConnect
        │                                            │
        │                                       connect() called
        │                                            │
        └── all settings present ───────────────────┤
                                                     ▼
                                                  Starting
                                                     │
                                         chunk queue + buffer allocated
                                         esp_websocket_client init + start OK
                                         RX task spawned
                                                     │
                                                     ▼
                                                  Running  ◄──────────────────────────┐
                                              (RX task loop)                           │
                                                     │                                 │
                            WEBSOCKET_EVENT_CONNECTED │                                 │
                                                     ▼                                 │
                                                 Connected                             │
                                                     │                                 │
                       DISCONNECT / ERROR / CLOSED   │                                 │
                       inactivity timeout (30 s) ────┴─────────────────────────────► Running
                                                     │
                                              end() called
                                                     ▼
                                                  Stopped ──► begin() re-called ──► Starting
```

### `begin()` — Step by Step

1. Read `esp3d_socket_client_on` — return `true` (no-op) if disabled.
2. Check `_requires_explicit_connect` — return `true` (waiting) if set.
3. Read `_host`, `_port`, `_path`, `_subprotocol` from `ESP3DSettings`.
4. Detect and strip `wss://` / `ws://` prefix from `_host`; record the `use_wss` flag.
5. Ensure `_path` has a leading `/`; assemble `_uri = ws[s]://host:port/path`.
6. Set RX/TX queue byte budgets: `setRxMaxSize(ESP3D_WS_CLIENT_QUEUE_MAX_BYTES)` / `setTxMaxSize(...)`.
7. `xQueueCreate(_chunk_queue)` — depth 24 × `sizeof(WsChunk)`.
8. `malloc(_buffer)` — `ESP3D_WS_CLIENT_RX_BUFFER_SIZE` (1 024) + 1 bytes.
9. Build `esp_websocket_client_config_t` (URI, `buffer_size=2048`, `network_timeout_ms=10000`, internal task stack 4 096 / priority 5, `skip_cert_common_name_check=true` for WSS, subprotocol string).
10. `esp_websocket_client_init()` + `esp_websocket_register_events(ANY, handler, this)`.
11. `esp_websocket_client_start()` — begins TCP + WS handshake asynchronously.
12. Spawn `esp3d_ws_client_rx_task` pinned to `ESP3D_SOCKET_TASK_CORE` (core 0).

### `end()` — Self-Call Handling

`end()` detects whether it is running on the RX task itself (e.g. `[ESP134]OFF` arrives over WebSocket → `esp3dCommands.process()` → `disconnect()` → `end()` — all on the RX task):

**Self-call path:** Sets `_isRunning = false`, stops and destroys `_ws_client`, then returns. The RX task loop sees `_isRunning == false`, calls `resetTaskHandle()` (`_xHandle = nullptr`), and self-deletes. Resource cleanup (`_chunk_queue`, `_buffer`) runs after the guard loop, which exits immediately once `_xHandle` is null.

**External caller path:**
1. Set `_isRunning = false`; stop + destroy `_ws_client`.
2. Clear `_started`; flush and clear RX/TX queues; reset state fields.
3. Poll for `_xHandle → nullptr` up to 2 000 ms (10 ms slices).
4. Force-delete the task with `vTaskDelete()` if still alive (last resort, logged with `esp3d_log_e`).
5. Free `_chunk_queue` and `_buffer`.

> **Mutex lifecycle:** `_tx_mutex` and `_rx_mutex` are initialised in the constructor and destroyed in the destructor — **never** in `begin()`/`end()`. Re-initialising while the RX task holds a lock would cause `pthread_mutex_destroy()` to deadlock.

---

## Data Flow

### Inbound (CNC → Pendant)

```
CNC Controller
    │  WebSocket text or binary frame
    ▼
esp_websocket_client  (IDF internal task)
    │  WEBSOCKET_EVENT_DATA callback
    ▼
esp3d_ws_cnc_ws_event_handler()
    │
    ├── text frame ──► WsChunk{len, data} ──► xQueueSend(_chunk_queue) ──────────────────┐
    │                                                                                     │
    └── binary frame  (webui_v3 only) ──► feedIncomingByte() directly ──────────────────┐│
                                                                                         ││
esp3d_ws_client_rx_task  (RX task loop)                                                  ││
    │  drainIncomingChunks()                                                              ││
    │    └── xQueueReceive(_chunk_queue) ◄────────────────────────────────────────────── ┘│
    │         └── feedIncomingByte(byte) ◄───────────────────────────────────────────────┘
    │              └── _buffer[_buffer_pos++] = byte
    │                  on '\n' / '\r' / buffer full:
    │                  └── pushMsgToRxQueue(_buffer, _buffer_pos)
    │                       └── ESP3DMessage* → addRxData()
    │
    │  handle()
    │    └── popRx() → esp3dCommands.process(msg)
    ▼
esp3dCommands
```

**Binary shortcut (`webui_v3` only):** Binary frames bypass the chunk queue and feed `feedIncomingByte()` directly inside the event callback. This treats FluidNC's binary machine stream as a plain text-line stream without an extra copy through the queue.

### Outbound (Pendant → CNC)

```
UI Screen / GCode Host
    │  process(ESP3DMessage*)
    ▼
ESP3DWebsocketClient::process()
    │  enqueueTxByPriority(msg)
    │    high priority → addFrontTxData()  (front of deque)
    │    normal        → addTxData()       (back of deque)
    ▼
TX deque  (ESP3DClient)
    │  handle()  [called from RX task loop]
    │    └── popTx() → sendWsText(data, len)
    ▼
esp_websocket_client_send_text()
    │  WebSocket text frame
    ▼
CNC Controller
```

---

## Connection Event Handling

`esp3d_ws_cnc_ws_event_handler` is a free function declared as `friend` in the class, registered as the WS event callback via `esp_websocket_register_events()`. It delegates to `ESP3DWebsocketClient::onWebsocketEvent()` through the `handler_args` pointer:

| WS Event | State | Side effects |
|---|---|---|
| `WEBSOCKET_EVENT_CONNECTED` | → `connected` | `server_status = "T"`; reset ping/data timers; `_init_command_sent = false`; call `sendInitCommand()`; call `esp3dGcodeHandler.resetStartupCommandsSent()` |
| `WEBSOCKET_EVENT_DISCONNECTED` | → `disconnected` | `server_status = "?"`; `_init_command_sent = false` |
| `WEBSOCKET_EVENT_CLOSED` | → `disconnected` | `server_status = "?"`; `_init_command_sent = false` |
| `WEBSOCKET_EVENT_ERROR` | → `disconnected` | `server_status = "?"`; `_init_command_sent = false` |
| `WEBSOCKET_EVENT_DATA` | — | Text → chunk queue; binary (webui_v3) → `feedIncomingByte()` directly |

---

## Keepalive and Inactivity

`tickRxFlushAndPing()` is called from `drainIncomingChunks()` after draining the chunk queue on every RX task iteration:

```
tick
 │
 ├── rx_timeout_ms != 0  AND  elapsed > 1 500 ms  AND  buffer_pos > 0?
 │     YES → pushMsgToRxQueue(partial buffer); reset _buffer_pos, _rx_timeout_ms
 │
 ├── connected  AND  last_data_received > 10 000 ms  AND  last_ping > 10 000 ms?
 │     YES → sendWsText("?\n", 2);  update _last_ping_time_ms
 │
 └── connected  AND  last_data_received > 30 000 ms?
       YES → esp_websocket_client_stop()
             state = disconnected;  server_status = "?";
             reset _last_data_received_ms, _last_ping_time_ms
```

| Timer | Threshold | Action |
|---|---|---|
| RX flush | 1 500 ms | Flush partial line buffer to prevent stale partial messages |
| CNC ping | 10 000 ms | Send `?\n` GCode status poll to keep the link alive |
| Inactivity cutoff | 30 000 ms | Stop the WS client; transition to disconnected |

---

## Subprotocol Support

Configured via `ESP3DSettingIndex::esp3d_ws_client_subprotocol`; affects the HTTP Upgrade handshake header and the frame-handling path inside `onWebsocketEvent()`:

| Value | `Sec-WebSocket-Protocol` | Binary frame handling |
|---|---|---|
| `none` (0) | Not sent | Ignored |
| `webui_v3` (1) | `webui-v3` | Decoded as byte stream → `feedIncomingByte()` |
| `esp3d_v1` (2) | `esp3d-v1` | Ignored (text frames only) |
| `arduino` (3) | `arduino` | Ignored (text frames only) |

The `webui_v3` path enables compatibility with FluidNC's WebUI v3 binary machine stream. See [websockets_protocol.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/websockets_protocol.md) for the full binary framing specification (V1 opcodes, message layout).

---

## TLS / WSS Support

The host field in settings accepts an optional scheme prefix:

| Stored value | Transport | Certificate validation |
|---|---|---|
| `192.168.1.100` | Plain `ws://` | — |
| `ws://192.168.1.100` | Plain `ws://` (prefix stripped) | — |
| `wss://192.168.1.100` | Encrypted `wss://` | Skipped (`skip_cert_common_name_check = true`) |

Certificate validation is intentionally skipped — CNC controllers on a LAN typically use self-signed certificates. Full CA verification is on the roadmap (`docs/roadmap/ws_client_and_auth_roadmap.md`).

---

## Memory Layout

Values from `tasks_def.h` (pibot_pendant_v1_0 variant; other boards use the same defaults):

| Resource | Size | Allocation |
|---|---|---|
| `_buffer` (line assembly) | `ESP3D_WS_CLIENT_RX_BUFFER_SIZE + 1` = 1 025 B | `malloc()` in `begin()` |
| `_chunk_queue` | 24 slots × `sizeof(WsChunk)` ≈ 3 120 B | `xQueueCreate()` in `begin()` |
| `WsChunk.data` | `ESP3D_WS_CLIENT_CHUNK_MAX` = 128 B per slot | Inside the FreeRTOS queue buffer |
| RX / TX deques | Up to `ESP3D_WS_CLIENT_QUEUE_MAX_BYTES` = 2 048 B each | `ESP3DClient` deque (heap) |
| RX task stack | `ESP3D_WS_CLIENT_TASK_SIZE` = 8 192 B | FreeRTOS task |
| IDF WS internal buffer | 2 048 B (`cfg.buffer_size`) | IDF component internal |

**RX queue eviction:** When `addRxData()` fails (queue full), the oldest message is dropped to make room; the incoming message is retried once. If the retry also fails, the incoming message is dropped with `esp3d_log_e`. This is the same back-pressure pattern as `bt_serial`, `bt_ble`, and `usb_serial`. The eviction loop calls `ESP3DClient::deleteMsg()` without `esp3dCommands.process()` — safe from both the event callback and the RX task contexts.

For the overall heap fragmentation budget see [esp32_memory_constraints.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md).

---

## Integration Points

### Settings Keys Read on `begin()`

| `ESP3DSettingIndex` | Content |
|---|---|
| `esp3d_socket_client_on` | Feature enable/disable byte |
| `esp3d_socket_client_address` | CNC host string (optional `ws://`/`wss://` prefix) |
| `esp3d_socket_client_port` | CNC port (uint32) |
| `esp3d_ws_client_path` | WS path string (default `/`) |
| `esp3d_ws_client_subprotocol` | `ESP3DWebSocketSubprotocol` byte |

### Observable Value Updated

| `ESP3DValuesIndex` | Value | When |
|---|---|---|
| `server_status` | `"T"` | `WEBSOCKET_EVENT_CONNECTED` |
| `server_status` | `"?"` | Disconnect / error / inactivity / `disconnect()` / `stopAutoConnect()` |

Full token semantics (`"U"`, `"T"`, `"C"`, `"?"`, `"A"`) are documented in [connection_management.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md).

### GCode Handler

On `WEBSOCKET_EVENT_CONNECTED`:
- `esp3dGcodeHandler.getInitCommand()` — firmware-specific init string (e.g. `$I\n` for grbl/grblHAL).
- `esp3dGcodeHandler.resetStartupCommandsSent()` — restarts the startup sequence for the new connection.

`sendInitCommand()` enqueues the init string as an `ESP3DMessage` in the TX queue. It is guarded by `_init_command_sent` to ensure it fires exactly once per WS connection.

---

## Public API

```cpp
// Lifecycle — called by ESP3DNetworkServices
bool begin();              // Read settings, allocate resources, start WS client + RX task
void end();                // Stop WS client, wait for RX task exit, free all resources

// Explicit connection control ([ESP134] ON / OFF)
bool connect();            // Clear _requires_explicit_connect, then call begin()
void disconnect();         // end() + server_status = "?"
void stopAutoConnect();    // end() + set _requires_explicit_connect = true

// Init command — sent once per connection
void sendInitCommand();    // Enqueue GCode init string in TX queue (guarded by _init_command_sent)

// Called from the RX task loop
void drainIncomingChunks(); // Dequeue WsChunks → feedIncomingByte() → RX queue
void handle();              // Dispatch one RX msg to commands; send one TX msg over WS

// GCode / command pipeline
void process(ESP3DMessage* msg); // Priority-aware enqueue into TX queue
void flush();                    // No-op — satisfies ESP3DClient interface contract

// State accessors
bool started();         // true after begin() succeeds, before end()
bool canSendData();     // started && state == connected && _ws_client != nullptr
bool isConnected();     // state == ESP3DWebsocketClientState::connected
bool isRunning();       // RX task loop is active
void resetTaskHandle(); // RX task calls this on exit: _xHandle = nullptr

const char* host();     // Configured CNC host (scheme-prefix stripped)
uint32_t    port();     // Configured CNC port
```

---

## Task and Concurrency Model

```
Core 0                              ESP3D_SOCKET_TASK_CORE (core 0)          IDF internal task
────────────────────────────        ──────────────────────────────────────    ──────────────────────────────────
networkTask                         esp3d_ws_client_rx_task                   esp_websocket_client_task
 └── ESP3DNetworkServices            └── drainIncomingChunks()                 └── TCP + RFC 6455 framing
       ├── begin()                         └── xQueueReceive(_chunk_queue)           └── WEBSOCKET_EVENT_*
       └── end()                           └── feedIncomingByte()                         └── esp3d_ws_cnc_ws_event_handler
                                     └── tickRxFlushAndPing()                                 ├── xQueueSend(WsChunk)
                                     └── handle()                                             └── feedIncomingByte()
                                           └── esp3dCommands.process(msg)                         (webui_v3 binary only)

Core 1 (LVGL)
──────────────────────────
tft_ui_task
 └── ESP3DValues::handle()
      └── UI callbacks on server_status change
```

**Thread-safety mechanisms:**

| Resource | Protection |
|---|---|
| `_rx_queue` (RX deque) | `pthread_mutex_t _rx_mutex` (via `ESP3DClient::setRxMutex()`) |
| `_tx_queue` (TX deque) | `pthread_mutex_t _tx_mutex` (via `ESP3DClient::setTxMutex()`) |
| `_chunk_queue` | FreeRTOS queue — ISR-safe by design |
| `_buffer` / `_buffer_pos` | Single logical writer (RX task + event callback for binary) — no additional mutex |
| `_ws_client` pointer | Null-checked before every use; written only under `_started` guard |
| `_state` enum | Written from WS event callback (IDF task); read from RX task — single-word load, no torn reads on Xtensa |

> **LVGL constraint:** `esp3dCommands.process()` runs on the RX task, not on the LVGL task. Commands that update the UI must use `esp3dXValues.set_value()`. The observable system dispatches the result to the LVGL task via `ESP3DValues::handle()`. Direct `lv_obj_*` calls from the RX task are forbidden. See [screens_architecture.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md).

---

## Error Handling

| Condition | Response |
|---|---|
| Feature disabled (`esp3d_socket_client_on` OFF) | `begin()` → `true` (deliberate no-op); `server_status = "?"` |
| No host or port configured | `begin()` → `true` (no-op); `server_status = "?"` |
| `_requires_explicit_connect` set | `begin()` → `true` (waits for `connect()`); `server_status = "?"` |
| Settings read error | `begin()` → `false`; error logged with `esp3d_log_e` |
| `xQueueCreate()` fails | `begin()` → `false`; no resource leak |
| `malloc(_buffer)` fails | Queue freed; `begin()` → `false` |
| `esp_websocket_client_init()` returns null | Resources freed; `begin()` → `false` |
| `esp_websocket_client_start()` returns error | Client destroyed, resources freed; `begin()` → `false` |
| Task creation fails | Client stopped + destroyed, resources freed; `begin()` → `false` |
| `addRxData()` queue full | Oldest msg evicted; retry once; if still full, incoming msg dropped (`esp3d_log_e`) |
| `sendWsText()` while not connected | Returns `false`; `handle()` deletes the TX message |
| Chunk queue full in event callback | Current WS frame truncated; `esp3d_log_e` emitted; partial data discarded |
| No CNC data for 30 s | `esp_websocket_client_stop()`; state → disconnected; `server_status = "?"` |
| RX task alive after 2 s in `end()` | `vTaskDelete(_xHandle)`; `esp3d_log_e` emitted — last resort only |
