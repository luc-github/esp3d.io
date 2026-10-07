---
title: "ESP3D Commands Module"
---

# ESP3D Commands Module

## Introduction

The `esp3d_commands` module is the central command dispatch engine of the ESP3D firmware. It implements the `ESP3DCommands` class, which detects, parses, authenticates, routes, and responds to all `[ESPxxx]` control commands received from any transport channel.

Every communication path — Serial UART, Bluetooth SPP/BLE, USB Serial, TCP Socket, WebSocket — funnels incoming text through this module. When an `[ESPxxx]` command token is detected inside a message, the module takes ownership: it extracts parameters, enforces the caller's authentication level, executes the corresponding handler method, then dispatches the response back to the originating client in either plain text or JSON format.

The module is also responsible for forwarding non-command messages to the CNC firmware via the active transport and for managing multi-part response streaming (head / core / tail message types).

---

## Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │     Communication Transports     │
                    │  Serial │ BT │ USB │ Socket │ WS │
                    └──────────────┬──────────────────┘
                                   │ ESP3DMessage
                                   ▼
                    ┌──────────────────────────────────┐
                    │         ESP3DCommands            │
                    │  process() → is_esp_command()    │
                    │  → execute_internal_command()    │
                    └───┬──────────────────────────────┘
                        │
            ┌───────────┼──────────────────────────────┐
            ▼           ▼                              ▼
  ESP3DAuthentication  ESP3DSettings            ESP3DValues
  (auth gate)          (NVS read/write)         (runtime events)
            │
            ▼
    ┌──────────────────────────────────────────────────┐
    │               Command Handlers                   │
    │  System │ Network │ Files │ Display │ Auth │ …   │
    └──────────────────────────────────────────────────┘
            │
            ▼  dispatch() / dispatchAnswer()
                    ┌───────────────────┐
                    │  Target Transport │
                    └───────────────────┘
```

---

## Module Location

| Item | Path |
|---|---|
| Class declaration | `main/core/includes/esp3d_commands.h` |
| Command implementations | `main/core/commands/esp*.cpp` |
| Module tree group | `Core_Platform_&_Infrastructure` → `esp3d_commands` |

---

## Key Data Types

### `ESP3DMessage`

The universal message container that flows through every transport and through this module.

```cpp
struct ESP3DMessage {
    uint8_t              *data;                    // Raw payload bytes
    size_t                size;                    // Payload size
    ESP3DClientType       origin;                  // Sending client type
    ESP3DClientType       target;                  // Receiving client type
    ESP3DAuthenticationLevel authentication_level; // guest / user / admin
    ESP3DRequest          request_id;              // Response routing key
    ESP3DMessageType      type;                    // head | core | tail
    ESP3DMessagePriority  priority;                // normal (back) | high (front)
};
```

`ESP3DMessageType` drives multi-part streaming: a single logical response is split into a `head` (opening segment), zero or more `core` segments (body entries), and a `tail` (closing segment with summary). This avoids large heap allocations for directory listings or settings dumps.

### `ESP3DCommands` (public API summary)

```cpp
class ESP3DCommands {
public:
    // Command detection and dispatch
    bool is_esp_command(uint8_t *sbuf, size_t len);
    void process(ESP3DMessage *msg);
    void execute_internal_command(int cmd, int cmd_params_pos, ESP3DMessage *msg);

    // Structured response helpers
    bool dispatchAnswer(ESP3DMessage *msg, uint cmdid, bool json,
                        bool hasError, const char *answerMsg);
    bool dispatchIdValue(bool json, const char *Id, const char *value,
                         ESP3DClientType target, ESP3DRequest requestId,
                         bool isFirst = false);
    bool dispatchKeyValue(bool json, const char *key, const char *value,
                          ESP3DClientType target, ESP3DRequest requestId,
                          bool nested = false, bool isFirst = false);
    bool dispatchSetting(bool json, const char *filter,
                         ESP3DSettingIndex index, const char *help,
                         const char **optionValues, const char **optionLabels,
                         uint32_t maxsize, uint32_t minsize, uint32_t minsize2,
                         uint8_t precision, const char *unit, bool needRestart,
                         ESP3DClientType target, ESP3DRequest requestId,
                         bool isFirst = false);
    bool dispatchAuthenticationError(ESP3DMessage *msg, uint cmdid, bool json);

    // Low-level dispatch overloads
    bool dispatch(ESP3DMessage *msg);
    bool dispatch(ESP3DMessage *msg, const char *sbuf);
    bool dispatch(ESP3DMessage *msg, uint8_t *sbuf, size_t len);
    bool dispatch(const char *sbuf, ESP3DClientType target,
                  ESP3DRequest requestId,
                  ESP3DMessageType type = ESP3DMessageType::head,
                  ESP3DClientType origin = ESP3DClientType::command,
                  ESP3DAuthenticationLevel authentication_level =
                      ESP3DAuthenticationLevel::guest);

    // Parameter extraction
    const char *get_param(ESP3DMessage *msg, uint start,
                          const char *label, bool *found = nullptr);
    const char *get_clean_param(ESP3DMessage *msg, uint start);
    bool        hasTag(ESP3DMessage *msg, uint start, const char *label);
    bool        has_param(ESP3DMessage *msg, uint start);

    // Output client management
    ESP3DClientType getOutputClient(bool fromSettings = false);
    void            setOutputClient(ESP3DClientType output_client);
    bool            canSendData();
    void            flush();
};
```

---

## Command Processing Flow

```
Transport RX task
      │
      │  ESP3DMessage (raw bytes from wire)
      ▼
ESP3DCommands::process(msg)
      │
      ├── is_esp_command() ─── No ──► forward to CNC transport (GCode path)
      │
      └── Yes: extract cmd number + params_pos
                │
                ▼
      execute_internal_command(cmd, params_pos, msg)
                │
                ├── [ESP3D_AUTHENTICATION_FEATURE]
                │   check msg->authentication_level
                │   insufficient? ──► dispatchAuthenticationError()
                │
                └── route to ESPxxx(cmd_params_pos, msg)
                            │
                            ├── get_param() / hasTag() / get_clean_param()
                            ├── business logic (FS, settings, network…)
                            │
                            ├── dispatch(msg, head_payload)       [type=head]
                            ├── dispatch(newMsg, entry_payload)   [type=core] ×N
                            └── dispatch(newMsg, tail_payload)    [type=tail]
                                        │
                                        ▼
                               Target client TX queue
```

---

## Response Format

Every handler respects an optional `json` tag in the command parameters. Without it the output is human-readable text; with `json` it is structured JSON compatible with the WebUI.

**Plain text example (ESP720 directory listing):**
```
Directory on Flash : /
[config]
boot.txt            2024-01-15 10:23:01   512 B
Files: 1, Dirs: 1
Total: 1.00 MB, Used: 24.00 KB, Available: 1.00 MB
```

**JSON example (ESP720 directory listing):**
```json
{
  "cmd": "720",
  "status": "ok",
  "data": {
    "path": "/",
    "files": [
      {"name": "config", "size": "-1"},
      {"name": "boot.txt", "size": "512 B", "time": "2024-01-15 10:23:01"}
    ],
    "total": "1.00 MB",
    "used": "24.00 KB",
    "occupation": "2"
  }
}
```

---

## Authentication Model

All commands check `msg->authentication_level` before executing. The model has three levels:

| Level | Symbol | Access |
|---|---|---|
| No authentication | `guest` | Read-only public commands only |
| Normal user | `user` | Most read + limited write commands |
| Administrator | `admin` | All commands including settings write |

When access is denied, `dispatchAuthenticationError()` sends a structured error without revealing system state. The standard guard pattern used in every handler:

```cpp
#if ESP3D_AUTHENTICATION_FEATURE
if (msg->authentication_level == ESP3DAuthenticationLevel::guest) {
    dispatchAuthenticationError(msg, COMMAND_ID, json);
    return;
}
#endif
```

See [connection_management.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) for how authentication levels are assigned per transport.

---

## Command Reference

Commands are grouped by functional area. Each group is compiled in or out via CMake feature flags defined in `CMakeLists.txt` and converted to C preprocessor defines by `cmake/features.cmake`. Mutual exclusions are enforced in `cmake/sanity_check.cmake`.

### System Commands

| Command | Description | Min Auth |
|---|---|---|
| `[ESP0]` | Help — list available commands | guest |
| `[ESP400]` | Get / set all ESP3D settings | admin |
| `[ESP401]` | Set a single ESP3D setting by index | admin |
| `[ESP402]` | Enable auto-update from SD on boot `[SD_CARD]` | admin |
| `[ESP420]` | Get system status summary | user |
| `[ESP444]` | Restart firmware | admin |

### Network / WiFi `[ESP3D_WIFI_FEATURE]`

| Command | Description |
|---|---|
| `[ESP100]` | Get / set WiFi SSID `[WIFI+BT]` |
| `[ESP101]` | Get / set WiFi password `[WIFI+BT]` |
| `[ESP102]` | Get / set WiFi mode (STA / AP) |
| `[ESP103]` | Get / set STA static IP |
| `[ESP104]` | Get / set STA gateway |
| `[ESP105]` | Get / set STA subnet mask |
| `[ESP106]` | Get / set AP SSID |
| `[ESP107]` | Get / set AP password |
| `[ESP108]` | Get / set AP IP |
| `[ESP110]` | Get / set radio mode (WiFi / BT / off) |
| `[ESP111]` | Get current IP address |
| `[ESP112]` | Get / set hostname |
| `[ESP114]` | Get / set WiFi TX power |
| `[ESP115]` | Get / set WiFi sleep mode |
| `[ESP410]` | Scan available WiFi networks `[WIFI+BT]` |

### HTTP & Web Services `[ESP3D_HTTP_FEATURE]`

| Command | Description |
|---|---|
| `[ESP120]` | Get / set HTTP service state |
| `[ESP121]` | Get / set HTTP server port |
| `[ESP160]` | Get / set WebSocket server state `[WS_SERVER]` |
| `[ESP190]` | Get / set WebDAV service state `[WEBDAV]` |

### CNC Transport Connection

| Command | Guard | Description |
|---|---|---|
| `[ESP130]` | `SOCKET_SERVER` | Get / set socket server state |
| `[ESP131]` | `SOCKET_SERVER` | Get / set socket server port |
| `[ESP132]` | `SOCKET_CLIENT` or `WS_CLIENT` | Get / set remote server IP |
| `[ESP133]` | `SOCKET_CLIENT` or `WS_CLIENT` | Get / set remote server port |
| `[ESP134]` | `SOCKET_CLIENT` or `WS_CLIENT` | Get / set connection timeout |
| `[ESP135]` | `WS_CLIENT` | Get / set WebSocket path |

See [connection_management.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) for the transport lifecycle model.

### Timestamp `[ESP3D_TIMESTAMP_FEATURE]`

| Command | Description |
|---|---|
| `[ESP140]` | Get / set NTP server, sync time |

### Camera `[ESP3D_CAMERA_FEATURE]` (requires `ESP3D_HTTP_FEATURE`)

| Command | Description |
|---|---|
| `[ESP170]` | Get / set camera parameters |
| `[ESP171]` | Take a snapshot and save to filesystem |

#### ESP171 — Camera Snapshot

```
[ESP171] path=<target_path> filename=<target_filename> pwd=<password>
```

- Both parameters are optional. Defaults: path = today's date (`YYYY-MM-DD`), filename = Unix timestamp + `.jpg`.
- Dates are derived with `localtime_r()` — requires `ESP3D_TIMESTAMP_FEATURE` or a valid system clock.
- Fails with `"No camera initialized"` if `esp3d_camera.started()` returns false.
- Delegates the actual capture to `esp3d_camera.handle_snap()`.
- Minimum auth: `user`.

### SD Card `[ESP3D_SD_CARD_FEATURE]`

| Command | Description |
|---|---|
| `[ESP200]` | Get SD card status |
| `[ESP202]` | Get / set SD SPI frequency `[SD_SPI_INTERFACE]` |
| `[ESP740]` | List SD card directory |
| `[ESP750]` | Delete file / directory on SD |

### Sensor `[ESP3D_SENSOR_FEATURE]`

| Command | Description |
|---|---|
| `[ESP210]` | Read sensor value |

### Display / UI `[ESP3D_DISPLAY_FEATURE]`

| Command | Guard | Description |
|---|---|---|
| `[ESP214]` | `HAS_STATUS_BAR` | Set status bar message |
| `[ESP216]` | `SNAPSHOT` | Capture UI screenshot |
| `[ESP250]` | `BUZZER` | Play buzzer tone from command |
| `[ESP270]` | `BRIGHTNESS_CONTROL` | Get / set display brightness |
| `[ESP280]` | — | Get / set UI theme |
| `[ESP281]` | — | Get / set UI language |
| `[ESP290]` | — | Get display information |
| `[ESP460]` | — | Get / set UI language (settings path) |

### Authentication `[ESP3D_AUTHENTICATION_FEATURE]`

| Command | Description |
|---|---|
| `[ESP500]` | Get / set authentication mode |
| `[ESP510]` | Get / set user password |
| `[ESP550]` | Get / set admin password |
| `[ESP555]` | Login / refresh session token |

### Notifications `[ESP3D_NOTIFICATIONS_FEATURE]`

| Command | Description |
|---|---|
| `[ESP600]` | Send push notification |
| `[ESP610]` | Get / set notification service settings |

### File Operations — Internal Flash

| Command | Description |
|---|---|
| `[ESP700]` | Stream / print file from flash |
| `[ESP701]` | Create or append to flash file |
| `[ESP702]` | Delete flash file or directory |
| `[ESP710]` | Create flash directory |
| `[ESP720]` | **List flash filesystem directory** |
| `[ESP730]` | Move / rename flash file |

#### ESP720 — Flash Filesystem Listing

```
[ESP720] <path> json=<no> pwd=<password>
```

- Default path: `/` (root of the flash partition).
- Requires `flashFs.accessFS()` — blocks if another task holds the mutex.
- Two-pass `readdir` loop: directories emitted first, files second.
- Reports: file count, directory count, total / used / free space.
- Optional per-file timestamps when `ESP3D_TIMESTAMP_FEATURE` is enabled.
- Response is streamed as `head` → N × `core` → `tail` to avoid single large allocations.
- Space values formatted by `esp3d_string::formatBytes()`.

### File Operations — SD Card `[ESP3D_SD_CARD_FEATURE]`

| Command | Description |
|---|---|
| `[ESP740]` | **List SD card directory** |
| `[ESP750]` | Delete SD file or directory |

#### ESP740 — SD Filesystem Listing

```
[ESP740] <path> json=<no> pwd=<password>
```

- Same two-pass streaming pattern as ESP720, using `sd.accessFS()` / `sd.readdir()`.
- Space reported as `uint64_t` (SD cards can exceed 4 GB).
- Distinct error strings: `"SD busy"` when `sd.getState() == ESP3DSdState::busy`, `"No SD"` otherwise.

### File Operations — Global Virtual FS

| Command | Description |
|---|---|
| `[ESP780]` | **List global filesystem directory** |
| `[ESP790]` | Move / rename in global filesystem |

#### ESP780 — Global Filesystem Listing

```
[ESP780] <path> json=<no> pwd=<password>
```

- Operates on `ESP3DGlobalFileSystem` — the unified VFS that routes paths to Flash or SD depending on the mount prefix.
- Uses path-aware locking: `globalFs.accessFS(path)` / `globalFs.releaseFS(path)`.
- Same output format as ESP720/ESP740; space query passes the path for per-mount resolution.
- Error string on failure: `"Filesystem not available"`.

### Serial / UART Configuration

| Command | Guard | Description |
|---|---|---|
| `[ESP800]` | — | Get firmware capabilities info |
| `[ESP900]` | — | Get / set UART baud rate |
| `[ESP901]` | — | Get / set UART data format |
| `[ESP902]` | `USB_SERIAL` | Get / set USB Serial settings |
| `[ESP950]` | `USB_SERIAL` or `BT` or `WIFI` or `UART_EXT` | Get / set active output client |

### Buzzer `[ESP3D_BUZZER_FEATURE]`

| Command | Description |
|---|---|
| `[ESP910]` | Play buzzer sequence |

### mDNS `[ESP3D_MDNS_FEATURE]`

| Command | Guard | Description |
|---|---|---|
| `[ESP450]` | `MDNS` | List registered mDNS services |
| `[ESP455]` | `IP_CNC_CLIENT` + `MDNS` | Scan for CNC server via mDNS |

### Lua Interpreter `[ESP3D_LUA_INTERPRETER_FEATURE]`

| Command | Description |
|---|---|
| `[ESP300]` | Execute Lua script |
| `[ESP301]` | Get / set stored Lua script |

---

## Directory Listing — Streaming Data Flow

ESP720, ESP740, and ESP780 share an identical internal pattern. This is the canonical flow using ESP720 as the example:

```
ESP720 called
      │
      ▼
flashFs.accessFS() ─── fail ──► dispatchAnswer(error)
      │
      ▼
flashFs.opendir(path) ── fail ──► dispatchAnswer("Cannot open")
      │
      ▼
dispatch(msg, head)
    "Directory on Flash : /\n"  or  JSON header with path
      │
      ▼
flashFs.getSpaceInfo()
      │
      ▼
readdir pass 1 — directories only
  for each DT_DIR entry:
      dispatch(newMsg, core)
          "[dirname]\n"  or  JSON dir object  {"name":"…","size":"-1"}
      │
      ▼
flashFs.rewinddir()
      │
      ▼
readdir pass 2 — files only
  for each non-DT_DIR entry:
      flashFs.stat()   ← size + mtime
      dispatch(newMsg, core)
          "name  date  size\n"  or  JSON file object
      │
      ▼
dispatch(newMsg, tail)
    totals + space summary  or  JSON closing with total/used/occupation
      │
      ▼
flashFs.closedir()
flashFs.releaseFS()
```

---

## Transport-Keyed Command State

The module keeps `_lastESP3DCmdOrigin` (an `ESP3DClientType`) to track which transport sent the most recent `[ESPxxx]` command. This prevents a trailing newline arriving on one transport (e.g., Serial) from being swallowed because a different transport (e.g., BT) had just completed a command.

Each transport's RX handler runs in a single dedicated task, so origin-keyed state eliminates cross-transport interleave. The enum is byte-sized, so reads and writes do not tear without an explicit lock.

---

## Message Priority

Commands injected by the pendant UI (LVGL task) use `ESP3DMessagePriority::high` and are placed at the front of the TX queue via `addFrontTxData()`. Commands arriving from a remote terminal use normal priority and are appended to the back with `addTxData()`.

See [esp3d_message_priority_system.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/esp3d_message_priority_system.md) for the full priority model.

---

## Component Dependencies

| Dependency | Used For |
|---|---|
| `ESP3DClient` / `ESP3DMessage` (`esp3d_core.md`) | Base message queue management, `copyMsgInfos()`, `newMsg()` |
| `ESP3DAuthentication` | Level enforcement, session tokens |
| `ESP3DSettings` (`esp3d_core.md`) | NVS-backed settings read/write for ESP400/ESP401 and per-command settings |
| `ESP3DValues` (`values.md`) | Publishing runtime value updates observable by the UI |
| `ESP3DFlash` | Internal flash FS operations (ESP700–ESP730) |
| `ESP3DSD` | SD card FS operations (ESP740, ESP750) |
| `ESP3DGlobalFileSystem` | Unified VFS (ESP780, ESP790) |
| `esp3d_camera` | Camera snapshot (ESP171) |
| `ESP3DBuzzer` (`buzzer.md`) | Buzzer tones (ESP250, ESP910) |
| `UIManager` / LVGL | Status bar, theme, language (ESP214, ESP280, ESP281) |
| `ESP3DmDNS` | Service discovery (ESP450, ESP455) |
| `ESP3DNotificationsService` | Push notifications (ESP600, ESP610) |
| `TimeService` | NTP sync, timestamps (ESP140, file listings) |
| `EspLuaEngine` (`lua_engine.md`) | Lua script execution (ESP300, ESP301) |
| `esp3d_log` | `esp3d_log()` / `esp3d_log_e()` throughout all handlers |

---

## Feature Flag Reference

| C Preprocessor Define | Commands Enabled |
|---|---|
| `ESP3D_WIFI_FEATURE` | ESP100–108, ESP111, ESP114–115, ESP410 |
| `ESP3D_BT_SERIAL_FEATURE` or `ESP3D_BT_BLE_FEATURE` | ESP100, ESP101, ESP410, ESP950 |
| `ESP3D_HTTP_FEATURE` | ESP120, ESP121, ESP160, ESP170, ESP171, ESP190 |
| `ESP3D_SOCKET_SERVER_FEATURE` | ESP130, ESP131 |
| `ESP3D_SOCKET_CLIENT_FEATURE` or `ESP3D_WS_CLIENT_SERVICE_FEATURE` | ESP132–134 |
| `ESP3D_WS_CLIENT_SERVICE_FEATURE` | ESP135 |
| `ESP3D_TIMESTAMP_FEATURE` | ESP140; file timestamps in ESP720/ESP740/ESP780 |
| `ESP3D_CAMERA_FEATURE` | ESP170, ESP171 |
| `ESP3D_WEBDAV_SERVICES_FEATURE` | ESP190 |
| `ESP3D_SD_CARD_FEATURE` | ESP200, ESP202, ESP402, ESP740, ESP750 |
| `ESP3D_SENSOR_FEATURE` | ESP210 |
| `ESP3D_DISPLAY_FEATURE` | ESP214, ESP216, ESP250, ESP270, ESP280, ESP281, ESP290, ESP460 |
| `ESP3D_HAS_STATUS_BAR` | ESP214 |
| `ESP3D_SNAPSHOT_FEATURE` | ESP216 |
| `ESP3D_BUZZER_FEATURE` | ESP250, ESP910 |
| `ESP3D_BRIGHTNESS_CONTROL_FEATURE` | ESP270 |
| `ESP3D_AUTHENTICATION_FEATURE` | ESP500, ESP510, ESP550, ESP555; auth guard in all handlers |
| `ESP3D_NOTIFICATIONS_FEATURE` | ESP600, ESP610 |
| `ESP3D_USB_SERIAL_FEATURE` | ESP902, ESP950 |
| `ESP3D_MDNS_FEATURE` | ESP450 |
| `ESP3D_IP_CNC_CLIENT_FEATURE` + `ESP3D_MDNS_FEATURE` | ESP455 |
| `ESP3D_LUA_INTERPRETER_FEATURE` | ESP300, ESP301 |
| `ESP3D_FACTORY_FEATURE` | `rebootToFactory()` internal helper |
| `SD_INTERFACE_TYPE == 0` | ESP202 |
| `ESP3D_UART_EXT_FEATURE` | ESP950 |

Build constraint rules are enforced in `cmake/sanity_check.cmake` — for example, `SOCKET_CLIENT_SERVICE` and `WEBUI_SERVER` are mutually exclusive. See `docs/features/feature_resource_matrix.md` and `docs/features/features.md` for the full SKU × feature matrix.

---

## Related Documentation

| Document | Content |
|---|---|
| [esp3d_core.md](esp3d_core.md) | `ESP3DClient`, `ESP3DMessage`, `ESP3DSettings`, `ESP3DX` — the core platform types this module builds on |
| [connection_management.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) | Transport lifecycle, status codes, auth level assignment per transport |
| [esp3d_message_priority_system.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/esp3d_message_priority_system.md) | High-priority vs. normal command queuing details |
| [gcode_host_architecture.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/gcode_host_architecture.md) | How non-ESP messages (GCode) are forwarded by the command processor |
| [gcode_host_streaming_flow.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/gcode_host_streaming_flow.md) | State machine for GCode streaming that runs alongside command dispatch |
| [shared_sd_mechanism_V2.0.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/shared_sd_mechanism_V2.0.md) | SD access locking used by ESP740/ESP750 |
| [websockets_protocol.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/websockets_protocol.md) | WebSocket command framing and the JSON protocol this module emits |
| [authentication_lifecycle.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/authentication_lifecycle.md) | Full authentication service lifecycle |
