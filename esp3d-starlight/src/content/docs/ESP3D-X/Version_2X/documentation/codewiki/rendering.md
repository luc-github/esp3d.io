---
title: "Rendering Module — Developer Documentation"
---

# Rendering Module — Developer Documentation

> **Scope:** `main/modules/rendering/` — internal message-bus sink that dispatches commands to the CNC GCode handler
> **Last updated:** 2026-09-03

---

## Overview

The rendering module is an internal **transport client** that bridges the firmware message bus to the active CNC GCode handler. It follows the same `ESP3DClient` contract as every wire transport (serial, BT, socket, WebSocket), but instead of forwarding data to an external device it delivers commands locally to `esp3dGcodeHandler`.

It is the final delivery point for commands that must be executed on the pendant itself — display refreshes triggered by GCode responses, status polling results, and similar locally-dispatched operations.

---

## Architecture Position

```
ESP3DCommands / other clients
         │
         │  renderingClient.process(ESP3DMessage*)
         ▼
 ESP3DRenderingClient  ←── RX queue  (pthread_mutex protected)
         │
         │  FreeRTOS task  esp3d_rendering_rx_task  (10 ms poll)
         ▼
    esp3dGcodeHandler.processCommand(char*)
         │
         ▼
 Active CNC target  (FluidNC / grbl / grblHAL)
```

The rendering client sits in the **Communication Transports** layer alongside the other `ESP3DClient` implementations. Unlike those, it has no physical or network endpoint — it is a pure in-process sink.

---

## File Layout

```
main/modules/rendering/
├── esp3d_rendering_client.h    — class declaration, global extern
└── esp3d_rendering_client.cpp  — implementation, FreeRTOS task entry
```

---

## Core Components

### Class `ESP3DRenderingClient`

**File:** `main/modules/rendering/esp3d_rendering_client.h`

Inherits from `ESP3DClient` (see [esp3d_core.md](esp3d_core.md), `main/core/includes/esp3d_client.h`), which provides the RX/TX message queue primitives and mutex registration.

```cpp
class ESP3DRenderingClient : public ESP3DClient {
 public:
  bool    begin();
  void    handle();
  void    end();
  void    process(ESP3DMessage* msg);
  void    flush();       // deprecated — no-op
  bool    started();
 private:
  TaskHandle_t      _xHandle;
  bool              _started;
  SemaphoreHandle_t _xGuiSemaphore;
  pthread_mutex_t   _rx_mutex;
};

extern ESP3DRenderingClient renderingClient;
```

A single global instance `renderingClient` is defined in the `.cpp` file. The rest of the firmware routes commands to it by calling `renderingClient.process(msg)`.

---

### Task `esp3d_rendering_rx_task`

**File:** `main/modules/rendering/esp3d_rendering_client.cpp`

The FreeRTOS task entry point created by `begin()`. Runs forever at a fixed 10 ms interval, calling `renderingClient.handle()` each tick.

```c
static void esp3d_rendering_rx_task(void *pvParameter) {
    while (1) {
        esp3d_hal::wait(10);
        renderingClient.handle();
    }
    vTaskDelete(NULL);  // never reached
}
```

Task parameters are sourced from `tasks_def.h`:

| Constant | Role |
|---|---|
| `ESP3D_RENDERING_RX_TASK_SIZE` | Stack size (bytes) |
| `ESP3D_RENDERING_TASK_PRIORITY` | FreeRTOS priority |
| `ESP3D_RENDERING_TASK_CORE` | CPU core affinity (0 or 1) |

> **LVGL constraint:** LVGL runs exclusively on Core 1. Confirm `ESP3D_RENDERING_TASK_CORE` does not pin this task to Core 1 unless explicitly coordinated with the LVGL task scheduler. See [screen_base_infrastructure.md](screen_base_infrastructure.md).

---

## Lifecycle

### `begin()`

1. Calls `end()` — guarantees a clean slate even on re-entry.
2. Calls `setRxMaxSize(4096)` — caps each RX message at 4 096 bytes.
3. Initialises `_rx_mutex` (POSIX `pthread_mutex_t`) and registers it with the base class via `setRxMutex()`.
4. Creates `_xGuiSemaphore` (FreeRTOS mutex semaphore) — serialises command dispatch in `handle()`.
5. Sets `_started = true`.
6. Spawns `esp3d_rendering_rx_task` via `esp3d_task_create_pinned()`.
7. Calls `flush()` (no-op).

Returns `true` on success. Returns `false` and sets `_started = false` if the mutex or task creation fails.

### `end()`

1. If started: calls `flush()` (no-op), clears `_started`, drains the RX queue with `clearRxQueue()`, waits 1 000 ms for in-flight operations to complete, then destroys `_rx_mutex`.
2. Deletes the FreeRTOS task handle via `vTaskDelete()` if set.

### `flush()`

Deprecated. Currently a no-op. Retained to satisfy the `ESP3DClient` interface contract used by other transports.

---

## Message Flow

### `process(ESP3DMessage* msg)` — inbound delivery

Called by `ESP3DCommands` or any other client to deliver a command to the rendering client.

1. **Normal path:** `addRxData(msg)` enqueues the message. Done.
2. **Queue-full recovery:** if `addRxData` fails and `_started` is true and the queue is non-empty, the method dequeues and immediately dispatches old messages (`esp3dGcodeHandler.processCommand()` + `deleteMsg()`) until enough bytes are freed, then retries `addRxData`.
3. **Failure:** if recovery fails or the client is not started, the message is deleted with `deleteMsg()` and an error is logged via `esp3d_log_e`.

This recovery strategy prioritises delivering the new message over preserving back-pressure, which suits the pendant's real-time command model.

### `handle()` — dispatch (called from task, every 10 ms)

1. Returns immediately if `_started` is false or the RX queue is empty.
2. Takes `_xGuiSemaphore` (blocking, `portMAX_DELAY`).
3. Pops one message from the queue with `popRx()`.
4. Calls `esp3dGcodeHandler.processCommand((char*)msg->data)`.
5. Frees the message with `deleteMsg(msg)`.
6. Gives back `_xGuiSemaphore`.

**One message per tick** is deliberate. It bounds the per-tick CPU budget and prevents command processing from starving other tasks. Do not batch-process multiple messages per `handle()` call without re-evaluating the task priority budget.

---

## Thread Safety

Two separate locking primitives are used for different scopes:

| Primitive | Protects | Notes |
|---|---|---|
| `pthread_mutex_t _rx_mutex` | RX queue enqueue / dequeue | Registered with `ESP3DClient` base class via `setRxMutex()` |
| `SemaphoreHandle_t _xGuiSemaphore` | `esp3dGcodeHandler.processCommand()` call in `handle()` | Prevents re-entrant dispatch |

The semaphore is always taken *after* a message is popped from the (mutex-protected) queue, so the two primitives cannot deadlock — the RX mutex is released before the semaphore is acquired.

---

## Dependencies

| Dependency | Symbol | Defined in |
|---|---|---|
| `ESP3DClient` (base class) | `addRxData`, `popRx`, `getRxMsgsCount`, `setRxMaxSize`, `setRxMutex`, `clearRxQueue`, `deleteMsg` | [esp3d_core.md](esp3d_core.md) — `main/core/includes/esp3d_client.h` |
| `esp3dGcodeHandler` | `processCommand(char*)` | [cnc_fluidnc.md](cnc_fluidnc.md) / [cnc_grbl.md](cnc_grbl.md) / [cnc_grblhal.md](cnc_grblhal.md) — `main/target/cnc/*/esp3d_gcode_handler_service.h` |
| `esp3d_hal::wait()` | 10 ms task delay | [esp3d_core.md](esp3d_core.md) — `main/core/includes/esp3d_hal.h` |
| `esp3d_task_create_pinned` | Core-pinned task creation helper | `esp3d_task_create.h` |
| `ESP3DCommands` | Routes messages to this client | [esp3d_commands.md](esp3d_commands.md) — `main/core/includes/esp3d_commands.h` |
| `esp3d_log` / `esp3d_log_e` / `esp3d_log_w` | Structured logging macros | [esp3d_log.md](esp3d_log.md) — `components/esp3d_log/` |
| FreeRTOS | `TaskHandle_t`, `xSemaphoreCreateMutex`, `xSemaphoreTake`, `xSemaphoreGive`, `vTaskDelete` | ESP-IDF |
| `pthread_mutex_t` | POSIX mutex for RX queue | ESP-IDF POSIX layer |

---

## Relationship to Other Transports

All transports implement `ESP3DClient`. The rendering client is the only one with no external endpoint:

| Transport | External endpoint | Docs |
|---|---|---|
| `ESP3DSerialClient` | UART | [serial_client.md](serial_client.md) |
| `ESP3DBTSerialClient` | Bluetooth SPP | [bluetooth_serial.md](bluetooth_serial.md) |
| `ESP3DBTBleClient` | Bluetooth BLE GATT | [bluetooth_ble.md](bluetooth_ble.md) |
| `ESP3DUsbSerialClient` | USB OTG serial | [usb_serial.md](usb_serial.md) |
| `ESP3DSocketClient` | WiFi TCP | [socket_server.md](socket_server.md) |
| `ESP3DSocketServer` | WiFi TCP (server) | [socket_server.md](socket_server.md) |
| `ESP3DWebsocketClient` | WebSocket | [websocket_client.md](websocket_client.md) |
| **`ESP3DRenderingClient`** | **Local GCode handler (in-process)** | **this file** |

Build-time exclusion rules for which transports can coexist are enforced in `cmake/sanity_check.cmake` and documented in the main project `docs/features/feature_resource_matrix.md`.

---

## Constraints

- **No LVGL calls inside this module.** The rendering client routes to the GCode handler, not to the UI layer. Any resulting LVGL interaction must occur inside the GCode handler on the correct core.
- **No blocking operations in `handle()`** beyond the semaphore wait. Heavy processing belongs in the GCode handler task, not here.
- **Memory:** `ESP3DMessage` objects are heap-allocated. Keep payloads within the 4 096-byte RX limit. On constrained builds (Bluetooth mode, ~10 KB free heap) allocation pressure is highest. See the main project `docs/guides/esp32_memory_constraints.md`.
- **Single message per tick** is load-limiting by design. Do not change this without re-evaluating task timing across all active transports.
