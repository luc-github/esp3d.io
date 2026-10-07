# Lua Interpreter Architecture

> Last updated: 2026-05-28  
> Feature flag: `LUA_INTERPRETER_SERVICE` / `ESP3D_LUA_INTERPRETER_FEATURE`

---

## Overview

The Lua interpreter embeds a Lua 5.4 scripting engine into the pendant firmware. Scripts run asynchronously in a dedicated FreeRTOS task and communicate with the ESP3D-X message bus through two FreeRTOS queues.

The feature is split into two layers:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **EspLuaEngine** (IDF component) | `components/EspLuaEngine/` | Lua 5.4.7 VM, pause/resume/stop, function/constant registration |
| **ESP3DLuaInterpreter** (module) | `main/modules/lua_interpreter/` | Script lifecycle, GPIO IDF, filesystem, message bus integration |

---

## Relevant files

```
components/EspLuaEngine/
├── CMakeLists.txt
├── include/EspLuaEngine.h
├── src/EspLuaEngine.cpp
└── src/lua-5.4.7/src/      ← Lua C sources (26 .c files)

main/modules/lua_interpreter/
├── esp3d_lua_interpreter.h
└── esp3d_lua_interpreter.cpp

main/core/commands/
├── esp300.cpp              ← [ESP300] execute script
└── esp301.cpp              ← [ESP301] status / control

customizations/lua/
└── customizations.h        ← ESP3D_LUA_AUTOSTART_SCRIPT

docs/user documentation/
└── lua_scripting.md        ← end-user guide
```

---

## Component architecture

```
┌──────────────────────────────────────────────────────┐
│              EspLuaEngine (IDF component)            │
│                                                      │
│  luaL_newstate() → loads base/table/string/math/utf8 │
│  registerFunction()  registerConstant()              │
│  executeScript()  pause/resume/stopExecution()       │
│  hook every 1000 instructions → check pause/stop     │
└──────────────────────────────────────────────────────┘
                         ▲
                         │ owned by
┌──────────────────────────────────────────────────────┐
│          ESP3DLuaInterpreter (module wrapper)        │
│                                                      │
│  begin() / end() / handle()                         │
│  executeScriptAsync() / abortScript()               │
│  pauseScript() / resumeScript()                     │
│  dispatch()  ← incoming CNC messages                │
└──────────────────────────────────────────────────────┘
```

The module wrapper owns the `EspLuaEngine*` pointer (allocated at `begin()`, freed at `end()`). This defers heap allocation until the feature is actually started, rather than at static init time.

---

## FreeRTOS task design

```
Core 0 — stream task (ESP3DXStream::handle())
    │
    ├── serialClient.handle()
    ├── usbSerialClient.handle()
    ├── ...
    └── esp3d_lua_interpreter.handle()   ← flushes output queue (non-blocking)

Core 0 — Lua script task (LuaScript)
    │
    └── _scriptTask()
            ├── _loadScript()            ← reads file via globalFs
            └── _engine->executeScript() ← blocking Lua execution
                    └── hook (every 1000 instructions)
                            └── checks pause/stop atomics
```

The script task runs on **Core 0** to keep LVGL (Core 1) undisturbed. Only one script can run at a time — `executeScriptAsync()` rejects a second call while one is active.

---

## Message flow

### Lua → CNC (output)

```
Lua script calls print("G0 X10\n")
    │
    ▼
l_print()                     runs in script task (Core 0)
    │   creates ESP3DMessage via ESP3DClient::newMsg()
    │   origin = lua_script, target = getOutputClient()
    ▼
_outQueue  (QueueHandle_t, max 10 ESP3DMessage*)
    │
    ▼
handle()                      called from stream task every ~10 ms
    │   xQueueReceive(..., 0) — non-blocking
    ▼
esp3dCommands.process(msg)    routes to serial / socket / BT
```

### CNC → Lua (input)

```
CNC sends response ("ok\n")
    │
    ▼
esp3d_commands.cpp process() — case all_clients:
    │   checks: origin == _output_client && lua script running
    ▼
esp3d_lua_interpreter.dispatch(msg)
    │   copies data into Esp3dLuaInMsg struct (max 128 B)
    ▼
_inQueue  (QueueHandle_t, max 10 Esp3dLuaInMsg by value)
    │
    ▼
Lua script calls available() → uxQueueMessagesWaiting(_inQueue)
Lua script calls readData()  → xQueueReceive → push string to Lua
```

### Key design choices

| Choice | Reason |
|--------|--------|
| Output queue holds `ESP3DMessage*` | Messages are consumed by `esp3dCommands.process()` which owns them |
| Input queue holds `Esp3dLuaInMsg` by value (128 B struct) | Avoids heap allocation for incoming data; no fragmentation |
| `handle()` dequeues at most one message per call | Keeps stream task latency bounded |
| `dispatch()` does not consume the source message | Source message continues its normal routing |

---

## Script lifecycle

```
[ESP300]/fs/script.lua
    │
    ▼
executeScriptAsync(path)
    ├── checks: engine initialized, no script already running
    ├── clears _lastError
    └── xTaskCreatePinnedToCore(_scriptTask, ..., Core 0)
                │
                ▼
        _scriptTask()
            ├── _loadScript()
            │       ├── globalFs.accessFS(path)
            │       ├── globalFs.stat() → check size ≤ 2048 B
            │       ├── globalFs.open() / fread() → _scriptBuffer
            │       └── globalFs.close() + releaseFS()
            │
            ├── _engine->executeScript(_scriptBuffer)
            │       └── Lua VM runs until end / error / stopExecution()
            │
            └── _deleteTask()
                    ├── clears _scriptBuffer
                    ├── resets engine if there was an error
                    └── sets _task = nullptr
                    → vTaskDelete(nullptr)
```

---

## Lua API exposed to scripts

### Functions

| Name | Signature | Implemented via |
|------|-----------|-----------------|
| `print` | `print(...)` | `l_print()` → `_outQueue` → `esp3dCommands` |
| `available` | `available() → int` | `l_available()` → `uxQueueMessagesWaiting(_inQueue)` |
| `readData` | `readData() → string\|nil` | `l_readData()` → `xQueueReceive(_inQueue)` |
| `delay` | `delay(ms)` | `l_delay()` → `vTaskDelay` in slices, checks pause/stop |
| `yield` | `yield()` | `l_yield()` → `taskYIELD()` |
| `millis` | `millis() → int` | `l_millis()` → `esp_timer_get_time() / 1000` |
| `pinMode` | `pinMode(pin, mode)` | `l_pinMode()` → `gpio_config()` |
| `digitalWrite` | `digitalWrite(pin, val)` | `l_digitalWrite()` → `gpio_set_level()` |
| `digitalRead` | `digitalRead(pin) → int` | `l_digitalRead()` → `gpio_get_level()` |

### Constants

| Constant | Value |
|----------|-------|
| `HIGH` | 1 |
| `LOW` | 0 |
| `INPUT` | 0 (GPIO_MODE_INPUT, floating) |
| `OUTPUT` | 1 (GPIO_MODE_OUTPUT) |
| `INPUT_PULLUP` | 2 (GPIO_MODE_INPUT + pullup) |
| `INPUT_PULLDOWN` | 3 (GPIO_MODE_INPUT + pulldown) |

### Standard Lua libraries loaded

`base`, `table`, `string`, `math`, `utf8`.  
`io`, `os`, `package`, `debug`, `coroutine` — intentionally excluded.

---

## Commands

| Command | Description |
|---------|-------------|
| `[ESP300]<path>` | Execute script at path (admin level) |
| `[ESP301]` | Query status (`idle` / `running` / `paused` / `error`) |
| `[ESP301]action=PAUSE` | Pause at next hook point |
| `[ESP301]action=RESUME` | Resume |
| `[ESP301]action=ABORT` | Stop immediately |
| `[ESP420]` | Shows `lua: idle` or `lua: running (/fs/...)` |

---

## Autostart

Define in `customizations/lua/customizations.h`:

```c
#define ESP3D_LUA_AUTOSTART_SCRIPT "/fs/init.lua"
```

Called from `begin()` after engine initialization. The script runs asynchronously — it does **not** block the startup sequence.

---

## Resource budget

| Resource | Amount | Notes |
|----------|--------|-------|
| Lua VM heap (initial) | ~20–30 KB | `luaL_newstate()` + 5 std libraries |
| Script buffer (BSS) | 2 049 B | Fixed member of `ESP3DLuaInterpreter` |
| Script task stack | 8 192 B | FreeRTOS task, Core 0 |
| Output queue | 10 × sizeof(ptr) | `ESP3DMessage*` pointers |
| Input queue | 10 × 132 B = 1 320 B | `Esp3dLuaInMsg` by value |
| FreeRTOS mutex | ~80 B | Protects `_lastError` |
| **Total overhead** | **~32 KB heap + 12 KB BSS/stack** | WiFi mode has ~75 KB free |

BT mode (~10 KB free): use with caution. No CMake enforcement — developer responsibility.

---

## Constraints

| Constraint | Value |
|-----------|-------|
| Concurrent scripts | 1 |
| Max script file size | 2 048 B |
| Max incoming message size | 128 B (truncated silently) |
| Input queue depth | 10 messages |
| Output queue depth | 10 messages |
| Hook interval | every 1 000 Lua instructions |
| `analogWrite` | not implemented (LEDC conflict with buzzer) |
| `analogRead` | not implemented (ADC oneshot API requires pre-init) |

---

## Build integration

```
CMakeLists.txt:         OPTION(LUA_INTERPRETER_SERVICE ...)
cmake/features.cmake:   -DESP3D_LUA_INTERPRETER_FEATURE=1
                        EXCLUDE_COMPONENTS EspLuaEngine when OFF
main/CMakeLists.txt:    SRC_DIRS modules/lua_interpreter
                        REQUIRES EspLuaEngine
esp3d_tft.cpp:          esp3d_lua_interpreter.begin()
esp3d_tft_stream.cpp:   esp3d_lua_interpreter.handle()
esp3d_commands.cpp:     esp3d_lua_interpreter.dispatch()  (CNC→Lua)
                        case 300/301 in execute_internal_command()
```
