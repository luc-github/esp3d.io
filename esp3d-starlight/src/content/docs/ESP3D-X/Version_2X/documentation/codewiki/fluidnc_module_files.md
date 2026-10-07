---
title: "FluidNC Module — Files Screen (`fluidnc_module_files`)"
---

# FluidNC Module — Files Screen (`fluidnc_module_files`)

## Introduction

The **Files Screen** is the SD-card file browser for the FluidNC CNC firmware target. It allows the operator to navigate the SD card directory tree, launch GCode jobs, tag files as quick-access macros, rename files, and delete files — all without leaving the pendant UI. The screen is built on top of the shared [`ListMenuScreen`](UI_Framework_and_Screens.md) infrastructure and drives FluidNC through the [`GCode Host Service`](CNC_Firmware_Integration.md) via native FluidNC `$SD/…` commands.

**Source file:** `main/display/cnc/fluidnc/screens/files_screen.cpp`  
**Namespace:** `filesScreen`

---

## Architecture Overview

```mermaid
graph TD
    subgraph UI_Layer["UI Layer (LVGL / Core 1)"]
        FS["filesScreen\n(files_screen.cpp)"]
        LMS["ListMenuScreen\n(base class)"]
        LMC["ListMenuComponent\n(scrollable list)"]
        VBC["VirtualButtonsComponent\n(Set / Refresh / Back)"]
        MBX["messageBoxScreen\n(confirm / info dialogs)"]
        INP["inputScreen\n(rename text input)"]
    end

    subgraph CNC_Layer["CNC Integration Layer"]
        GCH["ESP3DGCodeHandlerService\n(esp3dGcodeHandler)"]
        VAL["ESP3DValues\n(observable value bus)"]
        SS["statusScreen\n(post-job-launch target)"]
    end

    subgraph MacroLayer["Macro System"]
        MM["macroManager\n(macro_manager.cpp)"]
        GFS["GlobalFileSystem\n(macro INI file on flash)"]
    end

    subgraph FluidNC["FluidNC Firmware (CNC controller)"]
        SD["SD Card"]
        FNCMD["$SD/List\n$SD/Run\n$SD/Delete\n$SD/Rename"]
    end

    FS -->|"inherits / owns"| LMS
    LMS --> LMC
    LMS --> VBC
    FS -->|"modal dialogs"| MBX
    FS -->|"rename input"| INP
    FS -->|"sendGcode()"| GCH
    GCH -->|"serial / BT / socket"| FNCMD
    FNCMD --> SD
    VAL -->|"firmware_file_entry callback"| FS
    VAL -->|"firmware_status callback"| FS
    FS -->|"setInitialState() + redirect"| SS
    FS -->|"toggleMacro() / isMacro()"| MM
    MM -->|"read/write INI"| GFS
```

---

## Module Structure

Every board-level BSP and factory application is documented in [Board Support Packages](Board_Support_Packages.md). The files screen lives exclusively in the FluidNC UI target, as a sibling to the analogous screens in the grbl and grblHAL modules.

```
main/display/cnc/fluidnc/
├── components/
│   └── connection_status.h       ← ConnectionStatusComponent (shared widget)
└── screens/
    ├── files_screen.cpp          ← THIS MODULE
    ├── change_tool_screen.cpp    ← see fluidnc_module_change_tool.md
    └── probe_screen.cpp          ← see fluidnc_module_probe.md
```

---

## Core Data Structures

### `FileEntry`

Represents a single item in the SD card listing. Three constructors cover the different item categories:

```cpp
struct FileEntry {
    std::string name;   // Display name (filename or directory name)
    std::string size;   // Raw size string in bytes (empty for non-files)
    enum class Type : uint8_t {
        File,    // Regular GCode / text file
        Dir,     // Subdirectory
        Parent,  // ".." navigation entry
        Info,    // Placeholder message (e.g. "Loading…")
        Error    // Error message row (non-selectable)
    } type;
};
```

`Info` and `Error` rows are tagged as **non-selectable** via `ui_manager.tagListNodeNonSelectable()` so that encoder and touch navigation skip them automatically.

---

### `FileListState` — Asynchronous Listing State Machine

The SD listing is driven by FluidNC's `$SD/List` command, whose output arrives line-by-line through the value-bus callback `onFileEntryUpdate`. A state machine tracks progress:

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Collecting : "start_sd_listing() at root (/)"
    Idle --> Searching  : "start_sd_listing() in subdirectory"

    Searching --> Collecting : Target DIR line matched at correct depth
    Searching --> Error     : [MSG:ERR: Failed to mount device] received
    Searching --> Timeout   : Watchdog fires after 10 s of no data

    Collecting --> Done    : End marker [/sd/…] received
    Collecting --> Done    : Entry at shallower depth detected (implicit end)
    Collecting --> Done    : Low-memory guard triggered (≥30 KB threshold)
    Collecting --> Error   : [MSG:ERR: Failed to mount device] received
    Collecting --> Timeout : Watchdog fires after 10 s of no data

    Done    --> Idle : "Next call to start_sd_listing()"
    Error   --> Idle : "Next call to start_sd_listing()"
    Timeout --> Idle : "Next call to start_sd_listing()"
```

| State | Meaning |
|---|---|
| `Idle` | No listing in progress |
| `Searching` | Scanning output to find the target subdirectory header |
| `Collecting` | Accumulating child entries at `target_depth` |
| `Done` | Collection complete; list handed to LVGL |
| `Error` | SD mount failure or firmware error |
| `Timeout` | Watchdog expired — no new entries for 10 s |

---

### `FileActionMode` — Multi-Mode File Interaction

A four-position virtual switch (hardware rotary switch or touch-emulated footer toggle) selects the action triggered when the operator clicks a file:

```mermaid
flowchart LR
    S0["0 · Process\nLV_SYMBOL_DRIVE"]
    S1["1 · Macro\nESP3D_SYMBOL_ROBOT"]
    S2["2 · Rename\nLV_SYMBOL_EDIT"]
    S3["3 · Delete\nLV_SYMBOL_TRASH"]

    S0 -->|"switch +"| S1 -->|"switch +"| S2 -->|"switch +"| S3
    S3 -->|"switch -"| S2 -->|"switch -"| S1 -->|"switch -"| S0
```

| Mode | Symbol | File | Directory | Parent |
|---|---|---|---|---|
| `Process_file` | `LV_SYMBOL_DRIVE` | Confirm → `$SD/Run=<path>` | Navigate into | Navigate up |
| `Set_as_macro` | `ESP3D_SYMBOL_ROBOT` | Show info + macro toggle | Error beep | Error beep |
| `Rename_file` | `LV_SYMBOL_EDIT` | Open `inputScreen` text input | Error beep | Error beep |
| `Delete_file` | `LV_SYMBOL_TRASH` | Confirm → `$SD/Delete=<path>` | Error beep | Error beep |

> **Note:** When macros are disabled in settings (`esp3d_macros_enabled = 0`), mode 1 degrades to a plain file-information dialog without the toggle action.

---

## Data Flow

### SD Card Listing Sequence

```mermaid
sequenceDiagram
    participant UI as filesScreen (LVGL / Core 1)
    participant GCH as GCodeHandlerService
    participant FNC as FluidNC firmware
    participant VAL as ESP3DValues bus

    UI->>UI: create() called
    UI->>VAL: subscribe(firmware_file_entry, onFileEntryUpdate)
    UI->>VAL: subscribe(firmware_status, on_firmware_status_update)
    UI->>UI: start_sd_listing()
    UI->>UI: create_loading_spinner()
    UI->>UI: start_watchdog_timer() [1 s tick]
    UI->>GCH: sendGcode('$SD/List')
    GCH->>FNC: $SD/List (via transport)

    loop For each output line
        FNC-->>VAL: publish(firmware_file_entry, line)
        VAL-->>UI: onFileEntryUpdate(line)
        UI->>UI: process_listing_line(line)
        alt DIR or FILE at target depth
            UI->>UI: file_entries_.emplace_back(...)
        else End marker / shallow-depth return
            UI->>UI: list_state = Done
            UI->>UI: destroy_loading_spinner()
            UI->>UI: display_file_list()
        else Error marker
            UI->>UI: list_state = Error
            UI->>UI: display_message(error, Error)
        end
    end

    alt Watchdog fires (10 s stall)
        UI->>UI: list_state = Timeout
        UI->>UI: display_message(sd_card_error, Error)
    end
```

---

### File Operation Flow (Process mode)

```mermaid
sequenceDiagram
    participant Op as Operator
    participant UI as filesScreen
    participant MBX as messageBoxScreen
    participant GCH as GCodeHandlerService
    participant SS as statusScreen

    Op->>UI: Click file (mode = Process_file)
    UI->>UI: handleFileUse(entry)
    UI->>UI: pending_job_filename = entry.name
    UI->>MBX: show_confirmation('Launch <file>?')
    MBX-->>Op: Display dialog

    alt Confirmed
        Op->>MBX: Press OK
        MBX->>UI: onConfirmJobLaunch()
        UI->>GCH: sendGcode('$SD/Run=<path>/<file>')
        UI->>SS: setInitialState(JobStatus, Control)
        UI->>UI: setRedirectTarget(ESP3DScreenType::status)
        UI-->>SS: Redirect (via create() deferred timer)
    else Cancelled
        Op->>MBX: Press Cancel
        MBX->>UI: onCancelAction()
        UI->>UI: pending_job_filename.clear()
        UI-->>UI: Return to file list (no re-scan)
    end
```

---

### Rename Flow

```mermaid
sequenceDiagram
    participant Op as Operator
    participant UI as filesScreen
    participant INP as inputScreen
    participant GCH as GCodeHandlerService

    Op->>UI: Click file (mode = Rename_file)
    UI->>UI: handleFileRename(entry)
    UI->>INP: show_text_input(title, current_name, onFileRenamed)
    INP-->>Op: Show keyboard with pre-filled name

    Op->>INP: Edit name and confirm
    INP->>UI: onFileRenamed(new_name)
    UI->>GCH: sendGcode('$SD/Rename=<old_path>><new_path>')
    UI->>UI: Update file_entries_ in-place (re-sort + restore selection)
    UI->>UI: display_file_list()
```

---

## Key Subsystems

### Watchdog Timer

Protects against FluidNC not responding (SD removed, firmware hang):

| Parameter | Value |
|---|---|
| Interval | 1 000 ms |
| Stall threshold | 10 consecutive silent ticks → `Timeout` |
| On timeout | Spinner destroyed, error message displayed, buttons re-shown |

The stall counter resets whenever `total_entries_processed` increases, so any data flow — even slow — keeps the watchdog alive.

---

### Loading Spinner

A temporary `lv_spinner` widget with a status label (`"Processing: N"`) is overlaid on the list container while the listing is in progress. It is created by `create_loading_spinner()` and destroyed by `destroy_loading_spinner()` as part of the Done / Error / Timeout transitions. Both widgets use theme tokens (`ESP3D_SPINNER_*`, `ESP3D_ACCENT_ACTIVE_COLOR`) for visual consistency. See [UI Style Guide](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/ui_style_guide.md).

---

### Extension Filter

Only files whose extension (case-insensitive) appears in the `extensions` semicolon-delimited string are added to `file_entries_`. The value is read from NVS setting `esp3d_files_extensions` at screen creation time (default: `"gcode;gco;nc;tap;txt"`). Setting it to `"*"` disables filtering entirely.

```
extensions = "gcode;gco;nc;tap;txt"
           → ;gcode;gco;nc;tap;txt;   (wrapped with semicolons)
           → matches ";gco;" → accept "part.gco"
           → no match for ";stl;" → reject "model.stl"
```

---

### Macro Integration

The macro system is managed by [`macroManager`](cnc_shared.md) (shared across CNC firmware targets). The files screen integrates with it as follows:

```mermaid
flowchart TD
    FC["files_screen.cpp"]
    MM["macroManager\n(macro_manager.cpp / .h)"]
    GFS["GlobalFileSystem\n/macros.ini on flash"]

    FC -->|"isMacro(full_path)"| MM
    FC -->|"toggleMacro(full_path)"| MM
    FC -->|"isDirty()"| MM
    FC -->|"saveToFile() on mode-change or Back"| MM
    MM -->|"loadFromFile() on first use"| GFS
    MM -->|"saveToFile() writes INI"| GFS
```

- **Display**: Files tagged as macros show `ESP3D_SYMBOL_ROBOT` instead of `LV_SYMBOL_FILE` in the list.
- **Persistence**: The macro list is lazily saved — `saveToFile()` is called only when leaving macro mode (switch changes away from mode 1) or pressing Back with unsaved changes (`isDirty() == true`).

The Macro INI file format written by `macroManager::saveToFile()`:
```ini
[macro_0]
path=/jobs/start.gcode
desc=

[macro_1]
path=/jobs/finish.gcode
desc=
```

---

### Redirect Target Mechanism

After a successful job launch, the screen cannot destroy itself from within an LVGL callback. Instead it stores the target screen type and defers the transition:

```cpp
void setRedirectTarget(ESP3DScreenType target);  // called from onConfirmJobLaunch()
```

When `create()` is called next (by the screen rotation machinery), it detects a non-`none` redirect target, fires a one-shot LVGL timer with zero delay that calls `createScreen(deferred_target)`, and returns immediately — preventing the files screen from being re-created on top of the target.

---

### State Preservation Across Modal Dialogs

`prepareForDestruction()` intentionally **does not** clear `file_entries_`. The list persists in memory so that returning from a confirmation dialog (Confirm / Cancel) calls `display_file_list()` and rebuilds the view instantly without an SD re-scan. The list is discarded only when:

1. `start_sd_listing()` begins a new scan (Refresh button or directory navigation).
2. An SD error is detected in `on_firmware_status_update()` or `process_listing_line()`.

---

## Memory Safety

The files screen runs on a heavily resource-constrained ESP32. Several guards are applied throughout:

| Guard | Location | Action on failure |
|---|---|---|
| 30 KB free-heap minimum (`MIN_FREE_HEAP_BYTES`) | `process_listing_line()` (Collecting state) | Stop collection, display partial list |
| `std::bad_alloc` catch blocks | All `emplace_back` / `insert` calls | Log error, stop collection or leave list unchanged |
| `std::nothrow` new | `ListMenuScreen` construction in `create()` | Return without creating screen, previous screen preserved |
| `file_entries_modification_in_progress` flag | Concurrent modification detection | Declared `volatile`, prevents interleaved async updates |

See [ESP32 Memory Constraints Guide](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) for the broader allocation policy.

---

## Screen Lifecycle

```mermaid
sequenceDiagram
    participant SYS as UIManager / createScreen()
    participant FS as filesScreen::create()
    participant LMS as ListMenuScreen (LVGL object)
    participant LVGL as LVGL runtime

    SYS->>FS: create()
    FS->>FS: ESP3D_TRANSITION_RESET (clear timers/flags)
    FS->>FS: Read esp3d_files_extensions from NVS
    FS->>FS: subscribe(firmware_file_entry)
    FS->>FS: subscribe(firmware_status)
    FS->>LMS: new ListMenuScreen(...)
    LMS-->>FS: instance
    FS->>LVGL: lv_obj_add_event_cb(LV_EVENT_DELETE, onScreenDestroy)
    FS->>LVGL: lv_obj_add_event_cb(LV_EVENT_SWITCH_PRESSED, switch_event_cb)
    FS->>FS: onScreenCreated() - decide scan vs. reuse
    FS->>FS: start_sd_listing() [deferred 500 ms]

    note over FS,LVGL: Screen is live

    SYS->>FS: Back button → ESP3D_TRANSITION_START
    FS->>FS: prepareForDestruction()
    FS->>FS: stop_watchdog_timer()
    FS->>FS: unsubscribe(firmware_file_entry)
    FS->>FS: unsubscribe(firmware_status)
    LVGL->>FS: LV_EVENT_DELETE → onScreenDestroy()
    FS->>FS: ui_manager.unregisterScreen(files)
    FS->>LMS: delete files_screen_obj_instance
```

### Timer Pair Pattern

Like all CNC screens, the files screen uses the standard two-timer pattern to avoid modifying LVGL objects from within an event callback:

| Timer | Purpose |
|---|---|
| `cleanup_timer` | Calls `prepareForDestruction()` then schedules `transition_timer` |
| `transition_timer` | Calls `createScreen(next_screen_target)` after `ESP3D_TRANSITION_SCREEN_DELAY_MS` |

For the full pattern specification see [Screen Transitions Flow](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md).

---

## Virtual Buttons

| Index | Icon | Press | Release (short) | Release (long) |
|---|---|---|---|---|
| 0 | `ok_b` | — | Confirm selection (same as item click) | — |
| 1 | `refresh_b` | Selection beep | Clear list + `start_sd_listing()` | — |
| 2 | `back_b` | Back beep | Save macros if dirty → transition to `main` screen | — |

All three buttons are **hidden** during an active SD listing and **shown** again once the listing completes (Done, Error, or Timeout).

---

## FluidNC Command Reference

| Operation | Command sent | Response parsed |
|---|---|---|
| List SD card | `$SD/List` | `[DIR:name]`, `[FILE:name\|SIZE:n]`, `[/sd/…]`, `[MSG:ERR:…]` |
| Launch job | `$SD/Run=<full_path>` | Firmware status updates via `firmware_status` value |
| Delete file | `$SD/Delete=<full_path>` | Implicitly confirmed by absence of error |
| Rename file | `$SD/Rename=<old_path>><new_path>` | Implicitly confirmed by absence of error |

### Listing Output Format and Depth Parsing

FluidNC's `$SD/List` output uses the number of spaces after `:` to encode hierarchy depth. The parsing rules are:

- **DIR entries**: depth = number of spaces after `:`
- **FILE entries**: depth = (number of spaces after `:`) − 1

```
[DIR:subdir]                      ← depth 0  (no leading space)
[DIR: child]                      ← depth 1  (one leading space)
[FILE:  file.gco|SIZE:1024]       ← depth 1  (two leading spaces → depth 2-1=1)
[/sd/sd]                          ← end marker
```

The parser sets `target_depth` to the depth of the target directory's children. When a line arrives at a depth shallower than `target_depth`, collection is considered complete.

---

## Component Interactions Summary

```mermaid
graph LR
    subgraph files_screen_internals["files_screen.cpp internals"]
        FE["FileEntry\n(struct)"]
        FLS["FileListState\n(state machine)"]
        FAM["FileActionMode\n(switch position)"]
        WD["Watchdog\n(lv_timer 1 s)"]
        SPIN["Loading Spinner\n(lv_spinner + label)"]
        EXT["Extension Filter\n(semicolon list)"]
        REDIR["Redirect Target\n(deferred navigation)"]
    end

    subgraph External_Modules["External Modules"]
        LMS2["ListMenuScreen"]
        MBX2["messageBoxScreen"]
        INP2["inputScreen"]
        MM2["macroManager"]
        GCH2["GCodeHandlerService"]
        VAL2["ESP3DValues bus"]
        SS2["statusScreen"]
    end

    FLS -->|"show/hide"| SPIN
    FLS -->|"start/stop"| WD
    FLS -->|"on Done → updateItemList()"| LMS2
    FAM -->|"Process → confirm"| MBX2
    FAM -->|"Rename → text input"| INP2
    FAM -->|"Macro → toggle"| MM2
    FAM -->|"Delete → confirm"| MBX2
    VAL2 -->|"onFileEntryUpdate"| FLS
    VAL2 -->|"on_firmware_status_update"| FLS
    GCH2 -->|"job launched"| REDIR
    REDIR -->|"create() redirect"| SS2
    EXT -->|"filters entries into"| FE
    FE -->|"displayed in"| LMS2
```

---

## Related Documentation

| Topic | Documentation |
|---|---|
| UI base infrastructure & screen lifecycle | [UI_Framework_Screens.md](UI_Framework_and_Screens.md) |
| macroManager (shared CNC screens) | [cnc_shared.md](cnc_shared.md) |
| Change Tool screen (FluidNC) | [fluidnc_module_change_tool.md](fluidnc_module_change_tool.md) |
| Probe screen (FluidNC) | [fluidnc_module_probe.md](fluidnc_module_probe.md) |
| Connection status component | [fluidnc_module_connection_status.md](fluidnc_module_connection_status.md) |
| GCode Host & streaming architecture | [CNC_Firmware_Integration.md](CNC_Firmware_Integration.md) |
| Screen transition timer pattern | [screen_transitions_flow.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md) |
| Theme tokens & LVGL style guide | [ui_style_guide.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/ui_style_guide.md) |
| ESP32 memory constraints | [esp32_memory_constraints.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) |


## Documents de conception (depot)

- [files_screen](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ux_flows/fluidnc/files_screen.md)
