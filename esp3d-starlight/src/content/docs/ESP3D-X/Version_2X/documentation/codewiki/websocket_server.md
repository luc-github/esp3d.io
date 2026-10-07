---
title: "WebSocket Server Module"
---

# WebSocket Server Module

The `websocket_server` module provides the ESP3D-X pendant with two independent WebSocket endpoints hosted on the same HTTP port. It is a **server-side** transport — distinct from the outbound [websocket_client.md](websocket_client.md) used for CNC connectivity. Together the two endpoints allow a remote browser-based WebUI and external tooling (PC utilities, file managers) to communicate with the pendant simultaneously over WiFi.

> **Build guard:** the two services are independently controlled by compile-time flags.
> - `ESP3D_WEBUI_SERVER_FEATURE` → enables `ESP3DWebUiService` (`/ws`)
> - `ESP3D_WS_SERVER_SERVICE_FEATURE` → enables `ESP3DWsDataService` (`/wsdata`)
>
> Both require WiFi and the HTTP server (`ESP3DHttpService`) to be running. See [Network\_&\_Web\_Services.md](Network_and_Web_Services.md) for feature compatibility constraints.

---

## Architecture Overview

```
ESP3DHttpService (esp_httpd)
  │
  ├── /ws    URI handler ──► ESP3DWebUiService   (subprotocol: webui-v3)
  │                                 │
  │                          inherits from
  │                                 │
  └── /wsdata URI handler ──► ESP3DWsDataService  (subprotocol: esp3d-v1)
                                    │
                             inherits from
                                    │
                            ESP3DWsService  (base class)
                                    │
                          ┌─────────┴──────────┐
                          │                    │
                   esp3dCommands        ESP3DAuthenticationService
                  (message routing)       (session management)
```

### Endpoint Summary

| Endpoint | Class | Subprotocol | Frame modes | File transfer |
|----------|-------|-------------|-------------|---------------|
| `/ws` | `ESP3DWebUiService` | `webui-v3` | TEXT (commands, notifications) · BINARY (raw CNC stream) | No |
| `/wsdata` | `ESP3DWsDataService` | `esp3d-v1` | TEXT (ESP commands, G-code) · BINARY (V1 upload/download) | **Yes** |

---

## Class Hierarchy

### `ESP3DWsService` — Base

```
class ESP3DWsService
  Public:
    begin(config)          → bool           // allocate client pool, record server handle
    handle()                                // periodic zombie purge
    end()                                   // disconnect all clients, free memory
    http_handler(req)      → esp_err_t      // single URI handler entry point
    process(msg)                            // outbound: broadcast or unicast message
    onOpen(req)            → esp_err_t      // virtual — called on WS upgrade
    onMessage(req)         → esp_err_t      // virtual — called on DATA frame
    onClose(fd)            → esp_err_t      // virtual — called on disconnect
    pushMsgToRxQueue(...)  → bool           // inbound: authenticate + dispatch to command pipeline
    pushMsgTxt(fd, msg)    → esp_err_t      // unicast text frame
    pushMsgBin(fd, msg)    → esp_err_t      // unicast binary frame
    BroadcastTxt(msg)      → esp_err_t      // text to all connected clients
    BroadcastBin(msg)      → esp_err_t      // binary to all connected clients
    clientsConnected()     → uint
    purgeZombieClients()                    // drop stale lwIP fds
  Protected:
    processTextFrame(fd, buf, len)          // buffer accumulation + line-flush to rx queue
```

### `ESP3DWebUiService` — `/ws` endpoint

```
class ESP3DWebUiService : public ESP3DWsService
  process(msg)              // override: broadcast/unicast to WebUI clients
  pushNotification(msg)     // wrap as NOTIFICATION:<msg> TEXT frame, broadcast
  onOpen(req)               // override: register client, send currentID/activeID frames
  onMessage(req)            // override: accept TEXT commands + forward raw binary stream
```

Global instance: `esp3dWsWebUiService`

### `ESP3DWsDataService` — `/wsdata` endpoint

```
class ESP3DWsDataService : public ESP3DWsService
  onOpen(req)               // override: register client, send welcome TEXT frame
  onMessage(req)            // override: route TEXT → base processTextFrame,
                            //           BINARY → V1 opcode dispatch
  onClose(fd)               // override: abortTransfer() then base onClose
  Private:
    _transfer               // ESP3DWsTransferInfo — single in-progress transfer slot
    handleStatusRequest()
    handleUploadStart()
    handleUploadPacket()
    handleUploadEnd()
    handleDownloadStart()
    handleDownloadPacketAck()
    handleDownloadEndAck()
    handleNak()
    handleCommand()
    sendFrame()
    sendDownloadPacket()
    abortTransfer()
```

Global instance: `esp3dWsServerDataService`

---

## Core Data Structures

### `ESP3DWebSocketConfig`

Passed to `ESP3DWsService::begin()` to initialise a service instance.

```c
struct ESP3DWebSocketConfig {
    httpd_handle_t server_handle;  // shared esp_httpd handle from ESP3DHttpService
    uint           max_clients;    // pool size; each slot allocates a per-client receive buffer
    esp3dSocketType type;          // websocket_server_webui  or  websocket_server_data
};
```

### `ESP3DWebSocketInfos`

One slot per connected client, allocated as a flat array at `begin()` time.

```c
struct ESP3DWebSocketInfos {
    int                     socket_id;    // lwIP fd; -1 = slot free
    struct sockaddr_storage source_addr;  // IPv4-in-IPv6 address filled on connect
    char                   *buffer;       // per-client receive accumulation buffer
    uint                    buf_position; // current write position in buffer
    // Only present when ESP3D_AUTHENTICATION_FEATURE is enabled:
    char session_id[25];                  // auth session token, zeroed until authenticated
};
```

> **Memory:** each slot performs two heap allocations at `begin()` — the array element and the receive buffer. These happen at startup before the heap fragments. The ESP32 in Bluetooth mode can have as little as 10 KB free; prefer small `max_clients` values. See the project's `docs/guides/esp32_memory_constraints.md` guide.

### `ESP3DWsTransferInfo`

Owned by `ESP3DWsDataService`. Tracks the single active file transfer.

```c
struct ESP3DWsTransferInfo {
    ESP3DWsTransferState state;   // idle | uploading | downloading
    int      client_fd;           // fd of the transferring client (-1 = none)
    FILE    *file;                // open file handle
    uint32_t total_size;          // declared by client (upload) or from stat (download)
    uint32_t processed_bytes;     // bytes written (upload) or sent (download)
    uint32_t last_packet_id;      // last successfully handled packet id
    char full_path[512];          // ESP3D_WS_TRANSFER_PATH_MAX — path + '/' + filename
};
```

---

## Component Details

### Base Service — `ESP3DWsService`

**Files:** `main/modules/websocket_server/esp3d_ws_service.h/.cpp`

The base class provides all infrastructure shared by both endpoints.

#### Lifecycle

`begin()` validates the config, allocates `_max_clients` slots and their receive buffers, and marks the service started. `end()` triggers close on every connected client, clears authentication sessions for this instance's client type, and frees all allocations. `end()` is idempotent — it is safe to call on a stopped service.

#### Client pool

A flat array of `ESP3DWebSocketInfos` with socket ids initialised to `-1` (free). `addClient()` claims the first free slot and records the peer IP address via `getpeername()`. `onClose()` resets the slot back to free. When `getFreeClientIndex()` finds no free slot, the new connection is rejected immediately via `httpd_sess_trigger_close()`.

#### Zombie purge

`purgeZombieClients()` calls `httpd_ws_get_fd_info()` for every occupied slot. Any fd no longer marked `HTTPD_WS_CLIENT_WEBSOCKET` is removed via `onClose()`. Called from `handle()` periodically and opportunistically before every unicast or broadcast send, preventing stale fds from accumulating in the pool.

#### HTTP handler

`http_handler()` is the single URI callback registered with `esp_httpd`. Dispatch logic:

- `HTTP_GET` with a valid `Upgrade: websocket` header → `onOpen()`
- `HTTP_GET` without that header → `400 Bad Request` (rejects plain HTTP access to the WS URI)
- Any other method (the IDF DATA event for established connections) → `onMessage()`

#### Frame receive

`onMessage()` probes the pending frame type by calling `httpd_ws_recv_frame()` with length 0, retrying in order: TEXT, BINARY, PING, PONG, CLOSE. On IDF 5.4, `ESP_ERR_INVALID_STATE` is returned when the probed type does not match — the loop tries each type until one succeeds. An empty `content_len` is rejected with `ESP_FAIL` to avoid the tight callback loop seen on IDF 5.4. Frames larger than `ESP3D_WS_RECV_FRAME_BUF_SIZE` fall back to a heap allocation with an OOM log if the allocation fails.

#### Text frame accumulation

`processTextFrame()` copies bytes into the per-client buffer one at a time. On `\n`, `\r`, or when the buffer is full, it flushes the accumulated content to `pushMsgToRxQueue()` and resets the position. This allows commands to span multiple WebSocket frames as long as each line is terminated.

#### Send helpers

`pushMsgTxt()` and `pushMsgBin()` use `httpd_ws_send_frame_async()`. A failed send logs a warning but does **not** close the socket — transient send failures under concurrent HTTP upload load must not tear down the WebUI connection.

#### Broadcast

`BroadcastTxt()` / `BroadcastBin()` iterate all occupied slots and call the matching unicast sender. An `ignore` fd parameter (default `-1`) excludes one connection, typically used to prevent echoing a message back to its sender.

---

#### `pushMsgToRxQueue()` — Inbound message routing

This is the boundary between the WebSocket transport and the firmware command pipeline.

```
Incoming TEXT line (flushed from processTextFrame)
  │
  ▼
[ESP3D_AUTHENTICATION_FEATURE enabled]
  session_id empty?
    yes → extract pwd= param → getAuthenticatedLevel()
            guest → send ERROR_MSG text frame, return false
            ok    → create session id + createRecord()
    no  → look up session record → authentication_level
[no auth feature] → authentication_level = admin
  │
  ▼
ESP3DClient::newMsg()
  Set:  origin         = authClientType()
                          webui_websocket  (for /ws)
                          websocket_server (for /wsdata)
        target         = stream
        type           = unique
        request_id.id  = socket fd
  │
  is_esp_command(msg)?
    yes → target = command
  │
  ▼
esp3dCommands.process(msg)
```

Responses return asynchronously through `process()`, which calls `pushMsgTxt()` or `BroadcastTxt()` depending on whether `msg->request_id.id` is a specific fd or 0 (broadcast).

---

### WebUI Service — `ESP3DWebUiService`

**File:** `main/modules/websocket_server/esp3d_webui_service.h`
**Guard:** `ESP3D_WEBUI_SERVER_FEATURE`

Extends the base class for the browser-facing endpoint.

| Method | Purpose |
|--------|---------|
| `onOpen()` | Registers the client; sends `currentID` and `activeID` synchronisation frames to all connected WebUI tabs so browsers can coordinate which tab holds the active session. |
| `onMessage()` | Accepts TEXT commands from the browser (delegated to `processTextFrame()`); forwards inbound BINARY frames as raw CNC stream bytes without any modification. |
| `process(msg)` | Receives responses from the firmware pipeline; broadcasts when `msg->request_id.id == 0`, unicasts to the specific fd otherwise. |
| `pushNotification(msg)` | Wraps `msg` as a `NOTIFICATION:<msg>` TEXT frame and broadcasts to all WebUI clients. Called by the `[ESP600]` command handler. |

For the full `/ws` text-frame vocabulary (`currentID`, `activeID`, `PING`/`PONG`, `NOTIFICATION`, `ERROR`, `SENSOR`) see `docs/architecture/websockets_protocol.md` §1.

---

### Data Service — `ESP3DWsDataService`

**File:** `main/modules/websocket_server/esp3d_ws_data_service.h`
**Guard:** `ESP3D_WS_SERVER_SERVICE_FEATURE`

Extends the base class to add the **ESP3D Binary Protocol V1** for file upload and download. TEXT frames on this socket continue to carry ESP commands and G-code via the inherited `processTextFrame()` path — both frame types are multiplexed on the same connection.

#### Key constants

| Constant | Value | Description |
|----------|-------|-------------|
| `ESP3D_WS_TRANSFER_PACKET_SIZE` | 1024 | Maximum data payload bytes per binary frame |
| `ESP3D_WS_TRANSFER_PATH_MAX` | 512 | Maximum file path length in transfer frames |
| `WS_BINARY_PROTOCOL_V1` | 1 | Protocol revision byte returned in RS idle response |
| `ESP3D_WS_DATA_URL` | `"/wsdata"` | Registered URI |
| `ESP3D_WS_DATA_SUBPROTOCOL` | `"esp3d-v1"` | WebSocket subprotocol negotiated on this endpoint |

#### Binary frame header

All V1 binary frames share a fixed 4-byte header:

```
Offset  Size  Content
  0      2    Opcode — 2 ASCII bytes (e.g. 'S','R')
  2      2    Payload length — little-endian uint16
  4      N    Payload (N bytes, value from the length field)
```

#### Binary protocol opcodes

| Opcode | Direction | Meaning |
|--------|-----------|---------|
| `SR` | client → ESP | Status request |
| `RS` | ESP → client | Status response |
| `SU` | client → ESP | Start upload (path + filename + total size) |
| `US` | ESP → client | Upload start ACK |
| `UP` | client → ESP | Upload data packet (4-byte packet id + data) |
| `PU` | ESP → client | Upload packet ACK (status byte + 4-byte packet id) |
| `EU` | client → ESP | End of upload |
| `UE` | ESP → client | Upload end ACK |
| `SD` | client → ESP | Start download (path + filename) |
| `DS` | ESP → client | Download start ACK + file size |
| `DP` | ESP → client | Download data packet (4-byte packet id + data) |
| `PD` | client → ESP | Download packet ACK |
| `ED` | ESP → client | End of download |
| `DE` | client → ESP | Download end ACK |
| `NK` | either | NAK / retransmit request |
| `CM` | client → ESP | Command byte — `A` (0x41) = abort |

#### Status bytes used in payloads

| Byte | Hex | Used in | Meaning |
|------|-----|---------|---------|
| `O` | 0x4F | US, PU, UE, DS, RS | idle / ok |
| `E` | 0x45 | US, PU, UE, DS, RS | error |
| `B` | 0x42 | US, DS, RS | busy (another transfer in progress) |
| `A` | 0x41 | UE, RS | aborted |
| `U` | 0x55 | RS payload | upload in progress |
| `D` | 0x44 | RS payload | download in progress |

#### Transfer state machine

Only one transfer is active at a time. A second client attempting to start while one is in progress receives `B` (busy) in the ACK.

```
               ┌─────────────────────────────────────┐
               │              idle                   │
               │  SR → RS(O + version byte = 1)      │
               └──────┬───────────────┬──────────────┘
                      │               │
              SU received         SD received
              send US(O)          send DS(O) + file size
                      │               │
             ┌────────▼──┐    ┌───────▼────────┐
             │ uploading │    │  downloading   │
             │           │    │                │
             │ UP → PU   │    │  PD → send DP  │
             │  (O or E) │    │                │
             └─────┬─────┘    └──────┬─────────┘
                   │                 │
    EU / CM(A) / error / disconnect  │
    ────────────────────────────►    │
                                     │
             ED / CM(A) / error / disconnect
             ──────────────────────────────►
                                           idle
```

`abortTransfer()` closes the open file handle, resets `_transfer.state` to `idle`, and clears `_transfer.client_fd`. It is invoked from:
- `onClose()` — client disconnects while a transfer is in progress
- `handleCommand()` — client sends `CM A` (abort command)

For the complete frame-by-frame sequence, RS payload layouts, capability probe handshake, and testing instructions see `docs/architecture/websockets_protocol.md` §2.

---

## Connection Lifecycle

```
Client                        ESP3DHttpService / ESP3DWsService
  │                                       │
  │── HTTP GET /ws (Upgrade: websocket) ──►│
  │                                        │ http_handler() → onOpen()
  │                                        │   addClient(fd)
  │                                        │   getpeername() → record peer IP
  │◄── 101 Switching Protocols ────────────│
  │◄── TEXT: welcome frame ────────────────│  WebUiService: currentID + activeID
  │                                        │  DataService:  "Welcome to ESP3D-X V…"
  │                                        │
  │── TEXT: [ESP720]\n ────────────────────►│
  │                                        │ onMessage() → processTextFrame()
  │                                        │   buffer → flush on \n
  │                                        │   pushMsgToRxQueue()
  │                                        │     authenticate / look up session
  │                                        │     esp3dCommands.process(msg)
  │◄── TEXT: response ─────────────────────│ process(response_msg) → pushMsgTxt(fd)
  │                                        │
  │── BINARY: SR (DataService only) ───────►│
  │◄── BINARY: RS(O, version=1) ───────────│
  │                                        │
  │── WS CLOSE ────────────────────────────►│
  │                                        │ onClose(fd)
  │                                        │   abortTransfer() if uploading/downloading
  │                                        │   clearSession(session_id)  [if auth enabled]
  │                                        │   free slot (_clients[i].socket_id = -1)
```

---

## Authentication Integration

When `ESP3D_AUTHENTICATION_FEATURE` is enabled:

1. The **first TEXT frame** from a new client must contain `pwd=<password>` anywhere in the line.
2. `pushMsgToRxQueue()` extracts the credential, calls `esp3dAuthenthicationService.getAuthenticatedLevel()`, and on success calls `createRecord()` to persist the session.
3. The session id is stored in `ESP3DWebSocketInfos::session_id`. All subsequent frames from that fd skip credential extraction and look up the level directly from the record.
4. `onClose()` calls `clearSession(session_id)` immediately. `end()` calls `clearSessions(authClientType())` to purge residual records when the service stops, without touching the other service's sessions.
5. The two services register sessions under distinct `ESP3DClientType` values — `webui_websocket` for `/ws` and `websocket_server` for `/wsdata` — so their records are independent and never collide.

---

## Integration with HTTP Service

`ESP3DWsService` does **not** open its own TCP socket. It borrows the `httpd_handle_t` from `ESP3DHttpService` and registers URI handlers against it. `ESP3DHttpService::begin()` constructs the `ESP3DWebSocketConfig` structs and calls `begin()` on each WebSocket service after the HTTP server is up.

```
ESP3DHttpService::begin()
  │
  ├── httpd_register_uri_handler(/ws)     → esp3dWsWebUiService.http_handler
  └── httpd_register_uri_handler(/wsdata) → esp3dWsServerDataService.http_handler
```

Practical consequences:

- Both WebSocket endpoints share the same TCP port as HTTP (default 80).
- Stopping `ESP3DHttpService` implicitly terminates all WebSocket connections.
- WebSocket connections count against `esp_httpd`'s `max_open_sockets`, shared with HTTP clients.

---

## Build Configuration

| CMake option | C define | Effect |
|---|---|---|
| `WEBUI_SERVER` ON | `ESP3D_WEBUI_SERVER_FEATURE` | Compiles `ESP3DWebUiService`, registers `/ws` handler |
| `WS_SERVER_SERVICE` ON | `ESP3D_WS_SERVER_SERVICE_FEATURE` | Compiles `ESP3DWsDataService`, registers `/wsdata` handler |
| `SOCKET_CLIENT_SERVICE` ON | — | **Forbidden** with either WS server option — `cmake/sanity_check.cmake` will error |

> `sanity_check.cmake` rejects builds that combine `WS_SERVER_SERVICE` or `WEBUI_SERVER` with `SOCKET_CLIENT_SERVICE`. The two CNC-over-WiFi transport models (TCP socket client vs. WebSocket server) cannot safely share the lwIP stack on a no-PSRAM board.

---

## Key Constants

| Symbol | Default | Description |
|--------|---------|-------------|
| `ESP3D_WS_RX_BUFFER_SIZE` | sdkconfig | Per-client text accumulation buffer, allocated once per slot at `begin()` |
| `ESP3D_WS_RECV_FRAME_BUF_SIZE` | sdkconfig | Static receive frame buffer; frames larger than this fall back to heap allocation |
| `ESP3D_WS_TRANSFER_PACKET_SIZE` | 1024 | Binary upload/download payload bytes per packet |
| `ESP3D_WS_TRANSFER_PATH_MAX` | 512 | Maximum file path length in transfer frames |
| `ESP3D_WS_DATA_URL` | `"/wsdata"` | URI registered for the data endpoint |
| `ESP3D_WS_DATA_SUBPROTOCOL` | `"esp3d-v1"` | WebSocket subprotocol negotiated on `/wsdata` |

---

## Related Documentation

| Document | Relationship |
|----------|-------------|
| [websocket_client.md](websocket_client.md) | Outbound WebSocket client — connects pendant to a remote CNC WebSocket server; sibling transport module |
| [Network\_&\_Web\_Services.md](Network_and_Web_Services.md) | Parent module overview covering all network transports and feature flag compatibility |
| [network.md](network.md) | `ESP3DNetwork` orchestrator that starts the HTTP service and therefore these WS endpoints |
| [wifi.md](wifi.md) | WiFi client/AP — prerequisite for any WebSocket server operation |
| [socket_server.md](socket_server.md) | Raw TCP socket server — alternative to WebSocket for tool connectivity without HTTP overhead |
| [esp3d_core.md](esp3d_core.md) | `ESP3DClient` / `ESP3DMessage` types used throughout the inbound routing path |
| [esp3d_commands.md](esp3d_commands.md) | `esp3dCommands.process()` — the command dispatcher called from `pushMsgToRxQueue()` |
| `docs/architecture/websockets_protocol.md` | **Authoritative** frame-by-frame V1 binary protocol reference, `/ws` text vocabulary, capability probe sequence, and testing instructions — read before implementing a client |


## Documents de conception (depot)

- [websockets_protocol.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/websockets_protocol.md)
