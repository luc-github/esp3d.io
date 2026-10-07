---
title: "Serial Client Module"
---

# Serial Client Module

## Introduction

The **Serial Client** module (`main/modules/serial/`) implements the UART-based hardware serial transport for CNC machine communication. It is the primary CNC link in the default pendant configuration (serial/USB CNC + WiFi remote), where the pendant communicates with the CNC controller (FluidNC, grbl, grblHAL) over a direct UART connection.

The module provides a full-duplex, line-oriented UART channel, a bidirectional message queue (using the shared `ESP3DClient` infrastructure), an automatic connection handshake, a periodic ping/inactivity-timeout mechanism, and run-time controls for baud-rate change and RX/TX pin swap.

> **Build-model note:** Only one CNC transport is active at a time. When `SOCKET_CLIENT_SERVICE` is OFF (the default), serial is the CNC link. See [`connection_management.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) for the full transport-selection model and the [feature resource matrix](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/features/feature_resource_matrix.md) for memory constraints.

---

## Architecture Overview

```mermaid
graph TB
    subgraph "Serial Client Module"
        CFG["esp3d_serial_config_t<br/><small>esp3d_serial_config.h</small>"]
        CLIENT["ESP3DSerialClient<br/><small>esp3d_serial_client.h/.cpp</small>"]
        RXTASK["esp3d_serial_rx_task<br/><small>FreeRTOS task</small>"]
    end

    subgraph "Core Platform"
        BASE["ESP3DClient (base)<br/><small>esp3d_client.h</small>"]
        CMD["ESP3DCommands<br/><small>esp3d_commands.h</small>"]
        SETTINGS["ESP3DSettings / NVS<br/><small>esp3d_settings.h</small>"]
        VALUES["ESP3DValues<br/><small>esp3d_values.h</small>"]
    end

    subgraph "CNC Integration"
        GCODEHANDLER["ESP3DGCodeHandlerService<br/><small>esp3d_gcode_handler_service.h</small>"]
        GCODEHOST["ESP3DGCodeHostService<br/><small>esp3d_gcode_host_service.h</small>"]
    end

    subgraph "ESP-IDF UART Driver"
        UART["uart_driver / GPIO"]
    end

    subgraph "UI / Display"
        UI["ESP3DValues:<br/>connection_status<br/>server_status"]
    end

    CFG --> CLIENT
    CLIENT --> BASE
    CLIENT --> RXTASK
    RXTASK --> CLIENT
    CLIENT --> CMD
    CLIENT --> SETTINGS
    CLIENT --> VALUES
    CLIENT --> GCODEHANDLER
    GCODEHANDLER --> GCODEHOST
    CLIENT --> UART
    UART --> CLIENT
    VALUES --> UI

    style CLIENT fill:#4a90d9,color:#fff
    style RXTASK fill:#5ba85b,color:#fff
    style CFG fill:#d97a4a,color:#fff
```

---

## File Reference

| File | Role |
|---|---|
| `main/modules/serial/esp3d_serial_config.h` | Configuration struct `esp3d_serial_config_t` |
| `main/modules/serial/esp3d_serial_client.h` | Class declaration `ESP3DSerialClient` |
| `main/modules/serial/esp3d_serial_client.cpp` | Implementation + FreeRTOS task |

---

## Core Components

### `esp3d_serial_config_t`

Defined in `esp3d_serial_config.h`. Groups all UART driver parameters into a single struct so the client can be (re-)configured without scattering constants through the code.

```c
typedef struct {
    uart_port_t   port;             // UART_NUM_0 / UART_NUM_1 / UART_NUM_2
    gpio_num_t    rx_pin;           // Physical RX GPIO
    gpio_num_t    tx_pin;           // Physical TX GPIO
    gpio_num_t    rts_pin;          // RTS GPIO (GPIO_NUM_NC if unused)
    gpio_num_t    cts_pin;          // CTS GPIO (GPIO_NUM_NC if unused)
    bool          swap_rx_tx;       // Runtime pin-swap flag
    uart_config_t uart_config;      // ESP-IDF standard UART config (baud, bits, parity…)
    size_t        rx_buffer_size;   // Driver RX ring-buffer (bytes)
    size_t        tx_buffer_size;   // Driver TX ring-buffer (bytes)
    uint16_t      rx_flush_timeout; // ms — flush partial line if no new byte arrives
    uint32_t      task_priority;    // FreeRTOS priority for the RX task
    uint32_t      task_stack_size;  // RX task stack in bytes
    BaseType_t    task_core;        // Core affinity (0 or 1)
} esp3d_serial_config_t;
```

The single global instance `esp3dSerialConfig` is populated at compile time from board-specific macros (`UART_PORT_IDX`, `UART_RX_PIN`, `UART_TX_PIN`, etc.) defined via `serial_def.h` → `board_config.h`. `loadSettings()` then overrides `baud_rate` and `swap_rx_tx` at runtime from NVS.

---

### `ESP3DSerialClient`

Declared in `esp3d_serial_client.h`, inherits from `ESP3DClient` (see [`esp3d_core.md`](esp3d_core.md)).

#### Class Diagram

```mermaid
classDiagram
    class ESP3DClient {
        +addRxData(msg)
        +addTxData(msg)
        +popRx() ESP3DMessage*
        +popTx() ESP3DMessage*
        +clearRxQueue()
        +clearTxQueue()
        +getRxMsgsCount() size_t
        +getTxMsgsCount() size_t
        +enqueueTxByPriority(msg) bool
        +setRxMaxSize(max)
        +setTxMaxSize(max)
        #purgeRxByOrigin()
        #purgeTxByOrigin()
    }

    class ESP3DSerialClient {
        +configure(config) bool
        +begin() bool
        +handle()
        +end()
        +process(msg)
        +flush()
        +readSerial()
        +pushMsgToRxQueue(msg, size) bool
        +isEndChar(ch) bool
        +started() bool
        +canSendData() bool
        +isActive() bool
        +reconnect()
        +disconnect()
        +change_baud_rate(baud) esp_err_t
        +swap_rx_tx(swap) esp_err_t
        +resetInitCommand()
        +isInitCommandSent() bool
        +markInitCommandSent()
        +resetTaskHandle()
        #loadSettings()
        -sendInitCommand()
        -sendPingCommand()
        -_configure_uart_pins()
        -_config esp3d_serial_config_t*
        -_xHandle TaskHandle_t
        -_started bool
        -_active bool
        -_data uint8_t*
        -_buffer uint8_t*
        -_bufferPos size_t
        -_init_command_sent bool
        -_ping_command_sent bool
        -_tx_mutex pthread_mutex_t
        -_rx_mutex pthread_mutex_t
    }

    ESP3DClient <|-- ESP3DSerialClient
```

#### Key Member Roles

| Member | Type | Purpose |
|---|---|---|
| `_started` | `bool` | UART driver installed and RX task running |
| `_active` | `bool` | Processing enabled. `false` after `disconnect()`, `true` after `reconnect()` |
| `_init_command_sent` | `bool` | Init handshake sent to CNC; reset on timeout/reconnect/disconnect |
| `_ping_command_sent` | `bool` | Ping dispatched (informational; guards ping tracking) |
| `_data` | `uint8_t*` | Raw read buffer — direct output of `uart_read_bytes()` |
| `_buffer` | `uint8_t*` | Line assembly buffer — accumulates bytes until `\n`/`\r` or buffer full |
| `_bufferPos` | `size_t` | Current write position in `_buffer` |
| `_config` | ptr | Pointer to active config struct (points to `esp3dSerialConfig`) |
| `_xHandle` | `TaskHandle_t` | Handle of `esp3d_serial_rx_task`; cleared by the task before self-delete |

---

## Lifecycle Management

```mermaid
sequenceDiagram
    participant System as ESP3DX::begin()
    participant Client as ESP3DSerialClient
    participant UART as ESP-IDF UART Driver
    participant Task as esp3d_serial_rx_task
    participant CNC as CNC Controller

    System->>Client: begin()
    Note over Client: Release BT memory if BT unused
    Client->>Client: loadSettings() → NVS baud/swap
    Client->>Client: malloc(_data, _buffer)
    Client->>Client: pthread_mutex_init(rx, tx)
    Client->>UART: uart_driver_install()
    Client->>UART: uart_param_config()
    Client->>Client: _configure_uart_pins()
    Client->>Client: _started=true, _active=true
    Client->>Task: esp3d_task_create_pinned()

    loop while started()
        Task->>Client: readSerial()
        alt isActive()
            Client->>UART: uart_read_bytes()
            UART-->>Client: raw bytes
            Client->>Client: assemble lines → pushMsgToRxQueue()
        else
            Client->>Client: wait(ESP3D_MINIMAL_WAIT)
        end
    end

    System->>Client: end()
    Client->>Client: _started=false
    Client->>Client: clearRxQueue(), clearTxQueue()
    Note over Client: Wait up to 500 ms for task to exit
    Client->>UART: uart_driver_delete()
    Client->>Client: free(_data, _buffer), destroy mutexes
```

### `begin()`

1. **BT memory release** — if neither `ESP3D_BT_SERIAL_FEATURE` nor `ESP3D_BT_BLE_FEATURE` is selected, releases BT controller memory (recovers ~70 KB DRAM).
2. **Queue sizing** — RX max 4 KB (2 KB for non-CNC outputs), TX max 4 KB (to buffer a full `[ESP0]` help output in one pass at 115 200 baud).
3. **`loadSettings()`** — reads `esp3d_baud_rate` and `esp3d_swap_rx_tx` from NVS; falls back to defaults on invalid values.
4. **Buffer allocation** — two `malloc()` blocks of `rx_buffer_size` bytes each; aborts on failure, logging free heap and largest free block.
5. **Mutex init** — separate `pthread_mutex_t` for RX queue and TX queue.
6. **UART driver install** — `uart_driver_install()` with doubled ring-buffer for headroom.
7. **Pin config** — `_configure_uart_pins()` handles optional swap.
8. **Task creation** — `esp3d_task_create_pinned()` on the configured core.
9. **Initial status** — sets `connection_status = "T"` (connecting) via `ESP3DValues` if serial is the output client.

### `end()`

Gracefully shuts down in reverse order: signals the task by clearing `_started`, waits up to 500 ms for the task to self-delete (the task calls `resetTaskHandle()` before `vTaskDelete(NULL)`), force-deletes if it stalls, destroys mutexes (nulling the base-class pointer to prevent stale-mutex UB on re-entry), uninstalls the UART driver, then frees buffers.

### `disconnect()` / `reconnect()`

| Action | `disconnect()` | `reconnect()` |
|---|---|---|
| `_active` | `false` | `true` |
| `_init_command_sent` | `true` (suppress re-init) | `false` (allow re-init) |
| UART RX ring-buffer | flushed | flushed |
| Client RX queue | cleared | cleared |
| Client TX queue | **cleared** | not cleared |
| `connection_status` | `"?"` | `"T"` (connecting) |
| Immediate ping | — | yes (via `sendPingCommand()`) |

`disconnect()` clears the TX queue to prevent stale stream/script traffic from timing out on an unattended target. `reconnect()` is called from the UI retry button — it flushes stale RX data then sends a ping immediately so the CNC responds without waiting up to 10 s for the periodic ping timer.

---

## Connection State Machine

```mermaid
stateDiagram-v2
    [*] --> Stopped

    Stopped --> Connecting : "begin()"
    note right of Connecting : connection_status = "T"

    Connecting --> Connected : "valid data received\nsendInitCommand() fires\nGCode handler confirms identity"
    note right of Connected : connection_status = "C"

    Connected --> Connecting : inactivity timeout 30 s\n_init_command_sent reset
    Connected --> Disconnected : "disconnect() called"
    note right of Disconnected : connection_status = "?"

    Connecting --> Disconnected : 30 s timeout with no init sent\nstuck on T forced to question mark

    Disconnected --> Connecting : "reconnect() called"
    note right of Connecting : connection_status = "T"\nimmediate ping sent

    Connected --> Stopped : "end()"
    Connecting --> Stopped : "end()"
    Disconnected --> Stopped : "end()"
```

**Status codes** used in `ESP3DValuesIndex::connection_status`:

| Code | Meaning |
|---|---|
| `"T"` | Connecting / trying |
| `"C"` | Connected and identified |
| `"?"` | Disconnected / unknown |
| `"U"` | Uninitialised (before `begin()`) |

---

## Data Flow

### RX Path (CNC → Pendant)

```mermaid
flowchart TD
    UART_HW["UART Hardware RX"] -->|ISR fills ring buffer| DRIVER["ESP-IDF UART Driver"]
    DRIVER -->|uart_read_bytes 10 ms timeout| RXTASK["esp3d_serial_rx_task"]
    RXTASK --> READSERIAL["readSerial()"]

    READSERIAL -->|byte loop| ASSEMBLE["Line assembly in _buffer\naccumulate until newline or buffer full"]
    ASSEMBLE -->|complete line| FILTER{"BT noise filter\nESP3D_DISPLAY_FEATURE only"}
    FILTER -->|starts with DISCONNECT| VALUPDATE["connection_status = question mark\nreset init flags"]
    FILTER -->|starts with SCANNING| DROP["Silently discarded"]
    FILTER -->|valid line| PUSH["pushMsgToRxQueue()"]
    PUSH -->|ESP3DMessage| RXQUEUE["RX Queue\nESP3DClient deque\nmax 4 KB"]
    RXQUEUE -->|handle on LVGL task| CMD["esp3dCommands.process(msg)"]
    CMD --> GCODEHANDLER["ESP3DGCodeHandlerService\nparse responses\nupdate display values"]
    CMD --> RENDER["ESP3DRenderingClient\nif target = all_clients"]
```

### TX Path (Pendant → CNC)

```mermaid
flowchart TD
    GCODEHOST["GCode Host / UI command"] -->|process msg| TXENQUEUE["enqueueTxByPriority\nhigh priority to front of queue"]
    TXENQUEUE --> TXQUEUE["TX Queue\nESP3DClient deque\nmax 4 KB"]
    TXQUEUE -->|handle on LVGL task| GATE{"canSendData\n_started AND _active"}
    GATE -->|false after disconnect| HOLD["TX held\nwait for reconnect"]
    GATE -->|true| WRITE["uart_write_bytes()"]
    WRITE --> UART_HW["UART Hardware TX"]
```

**Key design points:**
- The RX task calls `readSerial()` which blocks for up to 10 ms inside `uart_read_bytes()`. No extra `vTaskDelay` is added to minimise ACK latency during GCode streaming.
- The TX drain runs in `handle()` on the LVGL task (Core 1), gated by `canSendData()`. This prevents TX from draining while `_active == false`.
- The RX drain in `handle()` is intentionally **not** gated by `_active` so incoming firmware responses are still processed during a disconnect event.
- When the RX queue is full, `pushMsgToRxQueue()` evicts old messages by processing them immediately (`esp3dCommands.process()`) to make room, rather than silently dropping the incoming message.

---

## Ping & Inactivity Timeout

This mechanism is compiled only when `ESP3D_DISPLAY_FEATURE` is enabled and only runs when serial (or `uart_ext`) is the active output client.

```mermaid
sequenceDiagram
    participant Task as readSerial() loop
    participant GCode as esp3dGcodeHandler
    participant Values as ESP3DValues

    Note over Task: lastActivity initialised to millis() on first call
    Note over Task: lastPing initialised to millis() on first call

    loop every readSerial() invocation
        Task->>Task: age = now - lastActivity
        Task->>Task: pingAge = now - lastPing

        alt age > 10 000 ms AND pingAge > 10 000 ms
            Task->>GCode: sendPingCommand()
            Task->>Task: lastPing = now
        end

        alt age > 30 000 ms inactivity timeout
            alt _init_command_sent == true was connected
                Task->>Values: connection_status = '?'
                Task->>Values: server_status = '?'
                Task->>Task: _init_command_sent = false
            else init was never sent stuck on T
                Task->>Values: connection_status = '?'
            end
            Task->>Task: lastActivity = now rearm for next cycle
        end
    end

    Note over Task: Valid data received updates lastActivity
    Note over Task: BT DISCONNECT noise resets init flags and status
```

**Constants:**

| Constant | Value | Purpose |
|---|---|---|
| `ESP3D_PING_INTERVAL` | 10 000 ms | Period between automatic pings when idle |
| `ESP3D_INACTIVITY_TIMEOUT` | 30 000 ms | Declare disconnection after this many ms with no valid data |

BT module `SCANNING` lines do not update `lastActivity`, so the ping/timeout cycle operates correctly even when a Bluetooth bridge module is attached and producing periodic output.

---

## Initialization Handshake

```mermaid
sequenceDiagram
    participant Client as ESP3DSerialClient
    participant Handler as ESP3DGCodeHandlerService
    participant CNC as CNC Controller

    Note over Client: First valid data received from CNC

    Client->>Client: sendInitCommand()
    alt _init_command_sent == false
        Client->>Handler: getInitCommand()
        Handler-->>Client: e.g. dollar-I newline for FluidNC or empty for none target
        alt command is non-empty
            Client->>Client: build ESP3DMessage\norigin=serial type=unique
            Client->>Client: addTxData(msg)
            Client->>Client: _init_command_sent = true
            Client->>Handler: resetStartupCommandsSent()
            Client->>CNC: command via UART TX
            CNC-->>Client: identity response
            Note over Client: GCode handler parses response\nsets connection_status = 'C'
        else command is empty
            Client->>Client: _init_command_sent = true
            Note over Client: Handshake bypassed for TARGET_IS_NONE builds
        end
    else already sent
        Client->>Client: no-op
    end
```

---

## Runtime Configuration

### Baud Rate Change (`change_baud_rate`)

```mermaid
sequenceDiagram
    participant UI as Settings Screen
    participant Client as ESP3DSerialClient
    participant UART as UART Driver

    UI->>Client: change_baud_rate(new_baud)
    Client->>Client: reset _init_command_sent and _ping_command_sent
    Client->>Client: pthread_mutex_lock rx_mutex and tx_mutex
    Client->>Client: flush()
    Client->>UART: uart_set_baudrate(port, new_baud)
    Client->>Client: _config.uart_config.baud_rate = new_baud
    Client->>Client: pthread_mutex_unlock tx_mutex and rx_mutex
    Client->>UART: uart_get_baudrate() verify actual rate
```

Resetting `_init_command_sent` ensures the handshake is replayed at the new baud rate once the CNC responds.

### RX/TX Pin Swap (`swap_rx_tx`)

Some cable configurations have RX and TX physically crossed. `swap_rx_tx(bool)` re-routes the GPIO signal assignments via `esp_rom_gpio_connect_out/in_signal()` without reinstalling the UART driver. The setting is persisted to NVS by the Settings screen.

```mermaid
flowchart LR
    A["swap_rx_tx == false"] -->|normal| B["TX signal to tx_pin\nRX signal to rx_pin"]
    C["swap_rx_tx == true"] -->|swapped| D["TX signal to rx_pin\nRX signal to tx_pin"]
    B --> E["gpio_reset_pin both physical pins\nesp_rom_gpio_connect signals\ngpio_set_pull_mode PULLUP on logical RX\n_bufferPos reset to 0"]
    D --> E
```

`_configure_uart_pins()` is called by both `begin()` and `swap_rx_tx()` so pin setup is always consistent.

---

## Memory Layout

```mermaid
graph LR
    subgraph "Heap DRAM"
        D1["_data\nrx_buffer_size bytes\nraw uart_read_bytes output"]
        D2["_buffer\nrx_buffer_size bytes\nline assembly workspace"]
        MRX["_rx_mutex\npthread_mutex_t"]
        MTX["_tx_mutex\npthread_mutex_t"]
        RXQ["RX Queue deque\nmax 4 KB total payload"]
        TXQ["TX Queue deque\nmax 4 KB total payload"]
    end

    subgraph "UART Driver Buffers"
        URX["UART RX ring buffer\nrx_buffer_size x 2"]
        UTX["UART TX ring buffer\ntx_buffer_size"]
    end
```

**Allocation rules (per ESP32 memory constraints):**
- Both `_data` and `_buffer` are `malloc()`'d in `begin()`. If either fails, `begin()` logs total free heap and largest free block, then returns `false`.
- Buffers are `free()`'d in `end()` before the function returns.
- `rx_buffer_size` comes from `UART_RX_BUFFER_SIZE * 2` (board config); the UART driver ring-buffer is doubled again (`rx_buffer_size * 2`) for driver headroom.
- TX queue max is 4 KB so the full `[ESP0]` help output (~2700 bytes) fits in one pass. At 115 200 baud the UART drains ~115 bytes per 10 ms tick; a 1 KB limit causes livelock where each drain cycle frees less than the next entry adds.
- See [`esp32_memory_constraints.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) for heap, fragmentation, and WiFi-vs-BT RAM trade-offs that affect sizing decisions.

---

## Build-Time Feature Flags

| Flag | Effect on this module |
|---|---|
| `ESP3D_DISPLAY_FEATURE` | Enables BT-noise filtering, ping/timeout loop, and `connection_status` / `server_status` updates via `ESP3DValues` |
| `ESP3D_BT_SERIAL_FEATURE` / `ESP3D_BT_BLE_FEATURE` | When both absent, `begin()` calls `esp_bt_controller_mem_release(ESP_BT_MODE_BTDM)` to recover BT RAM |
| `ESP3D_UART_EXT_FEATURE` | RX message `origin` / `target` set to `uart_ext` when that client is the active output client |
| `ESP3D_DISABLE_SERIAL_AUTHENTICATION_FEATURE` | Forces `authentication_level = admin` on all incoming RX messages |
| `TARGET_IS_NONE` | Skips `swap_rx_tx` NVS read; `getInitCommand()` returns `""` (handshake bypassed) |
| `CONFIG_UART_ISR_IN_IRAM` | Sets `ESP_INTR_FLAG_IRAM` for the UART driver ISR to avoid cache-miss stalls during flash operations |

---

## Integration with Other Modules

```mermaid
graph TD
    SC["ESP3DSerialClient"] -->|"process(msg)"| CMD["esp3dCommands\nRX dispatch"]
    SC -->|uart_write_bytes| CNC["CNC Controller\nFluidNC / grbl / grblHAL"]
    CNC -->|UART RX| SC

    SC -->|set_value| VAL["ESP3DValues\nconnection_status\nserver_status"]
    VAL --> UI["UIManager / Screen callbacks\nconnection status display"]

    SC -->|getInitCommand\nresetStartupCommandsSent\nsendPingCommand| GCODEHANDLER["ESP3DGCodeHandlerService"]
    GCODEHANDLER -->|parsed responses| GCODEHOST["ESP3DGCodeHostService\nstreaming / flow control"]

    SETTINGS["ESP3DSettings NVS"] -->|baud_rate\nswap_rx_tx| SC

    CMD -->|dispatch| RENDER["ESP3DRenderingClient"]
    CMD -->|dispatch| GCODEHANDLER

    style SC fill:#4a90d9,color:#fff
```

| Collaborator | Interaction |
|---|---|
| [`esp3d_core.md`](esp3d_core.md) — `ESP3DClient` | Base class — dual-deque message queues, message factory (`newMsg`, `setDataContent`, `deleteMsg`), mutex helpers, priority enqueue |
| [`esp3d_commands.md`](esp3d_commands.md) — `ESP3DCommands` | `process(msg)` called for each dequeued RX message; `getOutputClient()` checked to decide routing and noise filtering |
| [`gcode_host.md`](gcode_host.md) — `ESP3DGCodeHandlerService` | `getInitCommand()`, `sendPingCommand()`, `resetStartupCommandsSent()` — target-firmware-specific hooks |
| [`values.md`](values.md) — `ESP3DValues` | `set_value(connection_status / server_status)` for UI feedback; thread-safe `get_value()` overload used from the RX task |
| `ESP3DSettings` | `readUint32(esp3d_baud_rate)`, `readByte(esp3d_swap_rx_tx)` from NVS on `loadSettings()` |
| `ESP3DRenderingClient` | Receives CNC responses when serial is the output client (message target = `all_clients`) |
| [`bluetooth_serial`](bluetooth_serial.md) | Sibling transport module — same `ESP3DClient` base and connection-status model |
| [`socket_client.md`](socket_client.md) | Sibling transport module — same `ESP3DClient` base and connection-status model |
| [`usb_serial.md`](usb_serial.md) | Sibling transport module — same `ESP3DClient` base and connection-status model |
| [`gcode_host.md`](gcode_host.md) | Streaming flow-control details, in-flight cap mechanism, and startup command sequence |
| [`CNC_Firmware_Integration.md`](CNC_Firmware_Integration.md) | Overall CNC firmware integration overview |
| [`Communication_Transports.md`](Communication_Transports.md) | Parent module — all four transport modules in context |

---

## Global Instance

```cpp
// esp3d_serial_client.cpp — definition
ESP3DSerialClient serialClient;

// esp3d_serial_client.h — declaration for other translation units
extern ESP3DSerialClient serialClient;
```

`serialClient` is a file-scope singleton. Other modules (GCode host, commands dispatcher, UI settings screen) reference it via the `extern` declaration. The board configuration singleton `esp3dSerialConfig` is defined in the same `.cpp` file and handed to the client via `configure(&esp3dSerialConfig)` inside `loadSettings()`.
