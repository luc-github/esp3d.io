---
title: "Factory Update Actions Dispatch"
---

# Factory Update Actions Dispatch

## Introduction

The `factory_update_actions_dispatch` module is the **central action router** inside
the factory recovery application. It sits at the junction between the menu/input
system and the concrete update operations, translating a user's menu selection into
a concrete action — either switching the active OTA boot partition or delegating
to the SD-card flash pipeline.

It owns three focused responsibilities:

| Responsibility | Functions |
|---|---|
| Low-level OTA partition switch | `boot_partition()` |
| UI-aware boot action with user feedback | `action_boot_partition()` |
| Menu-action dispatch switch | `execute_selected_action()` |

The module is present identically across every board variant:
`esp32_2432s028r`, `esp32_3248s035c/r`, `esp32s3_4827s043c`,
`esp32s3_8048_touch_lcd_7`, `esp32s3_8048s043c/050c/070c`,
`esp32s3_bzm_tft35_gt911`, `esp32s3_hmi43v3`, `esp32s3_zx3d50ce02s_usrc_4832`,
and `pibot_pendant_v1_0`.

---

## Architecture Overview

### Position in the Factory Application

```mermaid
graph TD
    subgraph Factory_Application["Factory Application"]
        entry["factory_app_entry<br/>(app_main)"]
        menu["factory_menu_system<br/>(draw_menu, menu_move, menu_select)"]
        input["factory_input_dispatch<br/>(dispatch_button, touch_hint_hit_test)"]

        subgraph update_actions["factory_update_actions"]
            otadata["factory_update_actions_otadata<br/>(restore_otadata_from_backup)"]
            sd_flash["factory_update_actions_sd_flash<br/>(action_sd_update, action_sd_update_res,<br/>probe_sd_files)"]
            dispatch["factory_update_actions_dispatch<br/>(boot_partition, action_boot_partition,<br/>execute_selected_action)"]
        end

        visual["factory_visual_feedback<br/>(draw_progress, draw_result,<br/>draw_flashing_screen)"]
        hw["factory_hardware_drivers<br/>(buttons, encoder, touch, LCD, SD)"]
    end

    entry --> otadata
    entry --> menu
    menu --> input
    input -->|"BTN_3 / touch OK"| dispatch
    dispatch -->|"BOOT_APP0 / APP1"| dispatch
    dispatch -->|"SD_UPDATE_APP0/APP1/RES"| sd_flash
    dispatch --> visual

    style dispatch fill:#1a3a5c,color:#7ec8e3
    style update_actions fill:#0d2135,color:#aaa
```

### Relationship to Sibling Modules

```mermaid
graph LR
    input["factory_input_dispatch<br/>dispatch_button()"]
    dispatch["factory_update_actions_dispatch<br/><b>execute_selected_action()</b><br/><b>action_boot_partition()</b><br/><b>boot_partition()</b>"]
    otadata["factory_update_actions_otadata<br/>restore_otadata_from_backup()"]
    sd_flash["factory_update_actions_sd_flash<br/>action_sd_update()<br/>action_sd_update_res()<br/>probe_sd_files()"]
    visual["factory_visual_feedback<br/>show_status()<br/>draw_menu()<br/>draw_result()"]
    esp_idf["ESP-IDF OTA API<br/>esp_ota_set_boot_partition()<br/>esp_restart()"]

    input -->|"BTN_3"| dispatch
    otadata -.->|"runs before dispatch<br/>(at startup)"| dispatch
    dispatch -->|"SD actions"| sd_flash
    dispatch -->|"status messages"| visual
    dispatch --> esp_idf

    style dispatch fill:#1a3a5c,color:#7ec8e3
```

---

## Components

### `boot_partition(label)` — Low-Level OTA Partition Switch

**Signature:** `static void boot_partition(const char *label)`

The primitive that sets the next boot target and immediately reboots. It is a
**one-way door**: on success it calls `esp_restart()` and never returns. On
failure (partition not found, OTA API error) it logs the error and returns to
the caller so the UI can display a failure message.

```c
static void boot_partition(const char *label)
{
    const esp_partition_t *part = esp_partition_find_first(
        ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_ANY, label);

    if (!part) {
        ESP_LOGE(TAG, "Partition '%s' not found", label);
        return;
    }

    esp_err_t err = esp_ota_set_boot_partition(part);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set boot partition: %s", esp_err_to_name(err));
        return;
    }

    FACTORY_LOGD(TAG, "Boot partition set to '%s', rebooting...", label);
    esp_restart();
}
```

**Precondition:** The otadata sector must have been restored by
`restore_otadata_from_backup()` (see [factory_update_actions_otadata.md](factory_update_actions_otadata.md))
before this function is called. Without a valid otadata, `esp_ota_set_boot_partition()`
may silently mark the wrong slot or corrupt the boot chain.

**Partition labels used:**

| Label | Slot | Availability |
|---|---|---|
| `"app0"` | Primary OTA slot | Always present |
| `"app1"` | Secondary OTA slot | 8 MB boards only |

---

### `action_boot_partition(label)` — UI-Aware Boot Wrapper

**Signature:** `static void action_boot_partition(const char *label)`

Wraps `boot_partition()` with user-visible feedback: displays a cyan status
message, waits 500 ms so the user can read it, then delegates to
`boot_partition()`. If the call returns (failure path), the menu is redrawn
and a red error message is shown.

```
show_status("Booting <label>...", CYAN)
       │
  vTaskDelay(500 ms)
       │
  boot_partition(label)
       │
  success ──→ [esp_restart — never returns]
  failure ──→ draw_menu() → show_status("<label> not found!", RED)
```

This is the only boot action exposed to `execute_selected_action()`; the bare
`boot_partition()` primitive is never called directly from the dispatch layer.

---

### `execute_selected_action()` — Central Dispatch Switch

**Signature:** `static void execute_selected_action(void)`

Reads `menu_items[menu_selected].action` (a `menu_action_t` enum value built
at startup by `app_main`) and routes to the correct handler.

```c
static void execute_selected_action(void)
{
    switch (menu_items[menu_selected].action) {
        case MENU_ACTION_BOOT_APP0:      action_boot_partition("app0"); break;
        case MENU_ACTION_BOOT_APP1:      action_boot_partition("app1"); break;
        case MENU_ACTION_SD_UPDATE_APP0: action_sd_update("app0");      break;
        case MENU_ACTION_SD_UPDATE_APP1: action_sd_update("app1");      break;
        case MENU_ACTION_SD_UPDATE_RES:  action_sd_update_res();        break;
    }
}
```

`action_sd_update()` and `action_sd_update_res()` are defined in
[factory_update_actions_sd_flash.md](factory_update_actions_sd_flash.md).

#### `menu_action_t` Enum

Defined identically in every board's `main.c`:

| Value | Meaning | Handled by |
|---|---|---|
| `MENU_ACTION_BOOT_APP0` | Reboot into `app0` | `action_boot_partition("app0")` |
| `MENU_ACTION_BOOT_APP1` | Reboot into `app1` | `action_boot_partition("app1")` |
| `MENU_ACTION_SD_UPDATE_APP0` | Flash `esp3dfw.bin` → `app0` | `action_sd_update("app0")` |
| `MENU_ACTION_SD_UPDATE_APP1` | Flash `esp3dfw.bin` → `app1` | `action_sd_update("app1")` |
| `MENU_ACTION_SD_UPDATE_RES` | Flash `ui_resources.bin` → `ui_resources` partition | `action_sd_update_res()` |

Items for `app1` and the corresponding SD update are only added to `menu_items[]`
when an `app1` partition is detected at startup via `esp_partition_find_first()`.
On 4 MB boards the switch never reaches those two cases.

---

## Data Flow

### Boot Action Flow

```mermaid
sequenceDiagram
    participant Input as factory_input_dispatch<br/>(dispatch_button)
    participant Dispatch as factory_update_actions_dispatch<br/>(execute_selected_action)
    participant Action as action_boot_partition
    participant Prim as boot_partition
    participant OTA as ESP-IDF OTA API
    participant Visual as factory_visual_feedback<br/>(show_status / draw_menu)

    Input->>Dispatch: execute_selected_action()
    Dispatch->>Action: action_boot_partition('app0' | 'app1')
    Action->>Visual: show_status('Booting ...', CYAN)
    Action->>Action: vTaskDelay(500 ms)
    Action->>Prim: boot_partition('app0' | 'app1')
    Prim->>OTA: esp_partition_find_first()
    alt Partition found
        Prim->>OTA: esp_ota_set_boot_partition()
        Prim->>OTA: esp_restart()
        Note over Prim,OTA: System reboots - no return
    else Partition not found or OTA error
        Prim-->>Action: return (failure)
        Action->>Visual: draw_menu()
        Action->>Visual: show_status('... not found!', RED)
    end
```

### SD Update Action Flow

```mermaid
sequenceDiagram
    participant Input as factory_input_dispatch
    participant Dispatch as factory_update_actions_dispatch<br/>(execute_selected_action)
    participant SdFlash as factory_update_actions_sd_flash<br/>(action_sd_update / action_sd_update_res)

    Input->>Dispatch: execute_selected_action()
    Dispatch->>SdFlash: action_sd_update('app0' | 'app1')<br/>OR action_sd_update_res()
    Note over SdFlash: Full SD flash pipeline<br/>See factory_update_actions_sd_flash.md
```

---

## Process Flow — Full Recovery Menu Lifecycle

```mermaid
flowchart TD
    A([app_main starts]) --> B[restore_otadata_from_backup]
    B --> C[init hardware / LCD / touch]
    C --> D[detect partitions / build menu_items]
    D --> E[probe_sd_files]
    E --> F[draw_menu]
    F --> G{Event loop}

    G -->|encoder / button / touch event| H{dispatch_button}
    H -->|BTN_1 Up| I[menu_move -1]
    H -->|BTN_2 Down| J["menu_move +1"]
    H -->|BTN_3 OK| K["execute_selected_action()"]
    I --> G
    J --> G

    K --> L{menu_action_t}
    L -->|BOOT_APP0| M["action_boot_partition('app0')"]
    L -->|BOOT_APP1| N["action_boot_partition('app1')"]
    L -->|SD_UPDATE_APP0| O["action_sd_update('app0')"]
    L -->|SD_UPDATE_APP1| P["action_sd_update('app1')"]
    L -->|SD_UPDATE_RES| Q[action_sd_update_res]

    M -->|success| R([esp_restart])
    M -->|failure| G
    N -->|success| R
    N -->|failure| G
    O -->|success| R
    O -->|failure| G
    P -->|success| R
    P -->|failure| G
    Q -->|success| R
    Q -->|failure| G

    style K fill:#1a3a5c,color:#7ec8e3
    style M fill:#1a4a2a,color:#90ee90
    style N fill:#1a4a2a,color:#90ee90
    style O fill:#2a2a00,color:#ffd700
    style P fill:#2a2a00,color:#ffd700
    style Q fill:#2a0000,color:#ff8080
    style R fill:#4a0000,color:#ff6060
```

---

## Board Variants

The dispatch logic and the `menu_action_t` enum are **identical** on every
supported board. Differences are board-specific and localised elsewhere:

| Aspect | What differs | Owned by |
|---|---|---|
| LCD driver | `st7796_init()` / `st7262_init()` / `ili9341_init()` | [factory_hardware_drivers](factory_app.md) |
| Touch hit-test column math | Wide-canvas boards use icon-centre midpoints instead of screen-thirds | [factory_input_dispatch](factory_input_dispatch.md) |
| Recovery trigger | Bootloader hook (pibot) vs software `[ESP444]FACTORY` command (all others) | [custom_bootloader](factory_app.md) |
| `app1` availability | Menu items conditionally added at startup based on partition probe | `factory_app_entry` (`app_main`) |

All boards apply the same `OTADATA_BACKUP_OFFSET = 0xB000` and
`BACKUP_MAGIC = 0xAA55AA55`. These values **must** match the main firmware's
`esp444.cpp` exactly.

---

## Dependencies

### Internal (same Factory Application)

| Module | Role |
|---|---|
| [factory_update_actions_otadata](factory_update_actions_otadata.md) | Restores otadata before any boot action runs |
| [factory_update_actions_sd_flash](factory_update_actions_sd_flash.md) | Implements `action_sd_update()` and `action_sd_update_res()` — the full SD flash pipeline |
| [factory_input_dispatch](factory_input_dispatch.md) | Calls `execute_selected_action()` when BTN_3 / touch-OK fires |
| [factory_menu_system](factory_menu_system.md) | Provides `menu_items[]`, `menu_selected`, `draw_menu()`, `show_status()`, `clear_status()` |
| [factory_visual_feedback](factory_visual_feedback.md) | `draw_flashing_screen()`, `draw_progress()`, `draw_result()` used by SD flash actions |

### External (ESP-IDF)

| API | Purpose |
|---|---|
| `esp_partition_find_first()` | Locate an OTA partition by label |
| `esp_ota_set_boot_partition()` | Write the next-boot target into otadata |
| `esp_restart()` | Trigger an immediate system reboot |
| `esp_ota_get_boot_partition()` | Query the currently active OTA slot (used by `get_active_ota_label()` for the menu header) |

---

## Key Design Decisions

**`boot_partition()` is a one-way door by design.**
On success it reboots immediately. The UI-aware wrapper `action_boot_partition()`
handles the failure path so that `boot_partition()` stays minimal and free of UI
concerns. Any caller that needs fallback behaviour must check whether `boot_partition()`
returned.

**`execute_selected_action()` owns no state.**
It only reads `menu_items[menu_selected].action` and dispatches. All SD-flash
state (file handles, OTA handles, byte counters, progress) lives inside
`factory_update_actions_sd_flash`. All menu cursor state lives inside
`factory_menu_system`. This keeps the dispatch layer thin and easy to verify.

**`app1` items are omitted at runtime, not at compile time.**
The `has_app1` flag is set by probing the partition table at startup. A single
firmware binary works correctly on both 4 MB (app0-only) and 8 MB (app0 + app1)
flash variants without needing separate builds or `#ifdef` guards in the dispatch
switch.

**Otadata must be restored before this module runs.**
`restore_otadata_from_backup()` is called as the very first statement in
`app_main`, before hardware init. If this step is skipped, `esp_ota_set_boot_partition()`
would write into a stale or erased otadata sector, leaving the device unable to
boot correctly after recovery completes.

**`CONFIG_SPI_FLASH_DANGEROUS_WRITE_ALLOWED=y` is required in the factory sdkconfig.**
The otadata backup at `0xB000` lies below the first partition. ESP-IDF aborts
flash writes to that range by default (`CONFIG_SPI_FLASH_DANGEROUS_WRITE_ABORTS`).
Dangerous writes are enabled intentionally — the factory application is a
privileged recovery tool with direct flash access, not a normal user-space app.

---

## Related Documentation

- [factory_update_actions.md](factory_update_actions.md) — parent module: all update action sub-modules together
- [factory_update_actions_otadata.md](factory_update_actions_otadata.md) — otadata backup/restore mechanism
- [factory_update_actions_sd_flash.md](factory_update_actions_sd_flash.md) — SD card OTA flash pipeline
- [factory_input_dispatch.md](factory_input_dispatch.md) — button/encoder/touch event routing that calls `execute_selected_action()`
- [factory_menu_system.md](factory_menu_system.md) — menu rendering, navigation, and the `menu_items[]` array
- [factory_visual_feedback.md](factory_visual_feedback.md) — progress bar, result display, and flashing-screen overlay
- [factory_app_entry.md](factory_app_entry.md) — `app_main`: hardware init, partition detection, and menu construction
