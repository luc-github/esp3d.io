---
title: "ui_core — UI Framework Core"
---

# ui_core — UI Framework Core

## Introduction

`ui_core` is the foundational layer of the ESP3D TFT display system. It provides centralized management for every piece of UI-level state: LVGL task lifecycle, screen and component registries, theme system (color tokens + LVGL styles), display orientation, language selection, UI lock, and flash-partition resource loading.

All screens, reusable components, and CNC-firmware UI modules in `ui_components`, `common_screens`, and `cnc_shared` build on top of `ui_core`. It runs exclusively on **Core 1** — the single thread that owns LVGL — and is the only valid source of `lv_style_t` objects used in the rest of the UI.

**Source files:**

| File | Role |
|------|------|
| `main/display/esp3d_x_ui.h/.cpp` | LVGL FreeRTOS task runner (`ESP3DXUi`) |
| `main/display/esp3d_ui.h/.cpp` | Centralized state manager + style registry (`UIManager`) |
| `main/display/esp3d_resources.cpp` | Partition mmap, image/font/blob loader |
| `main/display/esp3d_snapshot.h` | Screen-capture state (`snapshot_state_t`) |
| `main/display/esp3d_translations_id_map.h` | Numeric file-ID ↔ `ESP3DLabel` enum lookup |

---

## Architecture Overview

```mermaid
graph TD
    subgraph ui_core ["ui_core  (main/display/)"]
        XSYS["ESP3DXUi\nesp3d_x_ui.h/cpp\nLVGL task runner"]
        UM["UIManager  ui_manager\nesp3d_ui.h/cpp\nState + style registry"]
        RES["Resource System\nesp3d_resources.cpp\nPartition mmap + font loader"]
        SNAP["snapshot_state_t\nesp3d_snapshot.h"]
        TID["Translation ID Map\nesp3d_translations_id_map.h"]
    end

    subgraph Platform ["Core Platform"]
        NVS["ESP3DSettings (NVS)"]
        VALS["ESP3DValues"]
        LOG["esp3d_log"]
    end

    subgraph Hardware ["BSP / Hardware Drivers"]
        BSP["board_init.c\nlvgl_flush_cb / tick"]
        RENDER["RenderingClient"]
        PART["ui_resources partition\n(flash subtype 0x42)"]
    end

    subgraph Consumers
        COMP["ui_components"]
        SCREENS["common_screens"]
        CNC["cnc_shared / firmware modules"]
    end

    XSYS -->|"pinned Core 1\ncreate_application()"| BSP
    XSYS -->|manages lifecycle| RENDER
    XSYS -->|drives each tick| UM
    UM -->|read/write| NVS
    UM -->|orientation notify| VALS
    UM -->|restart on lang change| TID
    UM -->|apply* style API| COMP
    UM -->|registerScreen/Component| SCREENS
    UM -->|getTokens / getStyles| CNC
    RES -->|spi_flash_mmap| PART
    UM -->|esp3d_resources_init| RES
```

See [Core_Platform_&_Infrastructure.md](Core_Platform_and_Infrastructure.md) for `ESP3DSettings`, `ESP3DValues`, and `esp3d_log` details. See [Hardware_Peripheral_Drivers.md](Hardware_Peripheral_Drivers.md) for BSP and `RenderingClient` details.

---

## Component Detail

### 1. `ESP3DXUi` — LVGL Task Runner

**Files:** `esp3d_x_ui.h`, `esp3d_x_ui.cpp`  
**Global instance:** `esp3dXui`

`ESP3DXUi` owns the FreeRTOS task (`tft_ui_task`) that drives LVGL on **Core 1**. Nothing in the UI runs outside this task context.

#### Lifecycle

```mermaid
sequenceDiagram
    participant Boot as main.cpp (app_main)
    participant XUi  as ESP3DXUi
    participant Task as tft_ui_task (Core 1)
    participant LVGL as LVGL

    Boot->>XUi: esp3dXui.begin()
    XUi->>XUi: renderingClient.begin()
    XUi->>XUi: xSemaphoreCreateBinary() × 2
    XUi->>Task: esp3d_task_create_pinned(Core 1)
    Task->>LVGL: _lock_acquire → create_application() → _lock_release
    loop Every LVGL tick (min_delay..100 ms)
        Task->>LVGL: _lock_acquire
        Task->>LVGL: esp3dXValues.handle()
        Task->>LVGL: time_till_next = lv_timer_handler()
        Task->>LVGL: _lock_release
    end
    Task-->>XUi: notifyFirstFrameRendered()
    Boot->>XUi: waitFirstFrameRendered(timeout_ms)
```

**Task configuration constants:**

| Constant | Purpose |
|----------|---------|
| `LVGL_TASK_CORE` | Pinned CPU core (always Core 1) |
| `LVGL_TASK_PRIORITY` | FreeRTOS priority |
| `LVGL_TASK_STACK_SIZE` | Stack size in bytes |
| `LVGL_TICK_PERIOD_MS` | Minimum delay between timer handler calls |

#### Boot Synchronization Semaphores

| Method | Signaled when | Used by |
|--------|---------------|---------|
| `waitFirstFrameRendered(ms)` | After the first `lv_timer_handler()` pass following `create_application()` | Boot sequence — safe to perform post-splash actions once the display is live |
| `waitUpdateCompletionRendered(ms)` | After `updateScreen::isCompletionHandled()` returns true | Boot sequence — waits for the update result screen to be visible before rebooting |

> ⚠️ **LVGL lock rule:** Every `lv_obj_*` / `lv_style_*` call must occur inside `_lock_acquire(lvgl_lock)` / `_lock_release(lvgl_lock)`, or from within an LVGL event/timer callback (which already executes inside the task). Violating this causes race conditions on the single-threaded LVGL renderer.

---

### 2. `UIManager` — Centralized State Manager

**Files:** `esp3d_ui.h`, `esp3d_ui.cpp`  
**Global instance:** `ui_manager`

`UIManager` is the singleton that all screens and components interact with for UI state. It owns the theme configuration (tokens + styles), the active screen/component registries, and all persistent UI settings.

```mermaid
classDiagram
    class UIManager {
        -user_lock_: bool
        -system_lock_: bool
        -hide_lock_: bool
        -current_orientation_: Orientation
        -current_theme_: Theme
        -current_language_: string
        -theme_: ThemeConfig
        -active_screens_: unordered_map
        -active_components_: unordered_map
        -screens_mutex_: mutex
        -components_mutex_: mutex
        +initialize() bool
        +cleanup()
        +getLockState() bool
        +userSetLockState(bool, save) bool
        +systemSetLockState(bool) bool
        +setHideLock(bool, save) bool
        +setOrientation(Orientation, save) bool
        +rotateCW() bool
        +rotateCCW() bool
        +setTheme(Theme, save) bool
        +nextTheme() bool
        +previousTheme() bool
        +setLanguage(string, save) bool
        +registerScreen(type, obj) bool
        +unregisterScreen(type) bool
        +getScreen(type) lv_obj_t
        +getActiveScreen() ESP3DScreenType
        +registerComponent(screen, component, ptr) bool
        +unregisterComponent(screen, component) bool
        +getComponent(screen, component) void
        +initializeStyles() bool
        +resetStyles()
        +applyButtonDefaultStyle(obj, radius)
        +applyListNodeStyle(obj, selected)
    }
    class ThemeConfig {
        +tokens: ThemeTokens
        +styles: ThemeStyles
    }
    class ThemeTokens {
        +bg_main: uint32_t
        +bg_panel: uint32_t
        +bg_overlay: uint32_t
        +bg_disabled: uint32_t
        +text_primary: uint32_t
        +text_secondary: uint32_t
        +text_disabled: uint32_t
        +icon_idle: uint32_t
        +border_idle: uint32_t
        +border_focus: uint32_t
        +accent_select: uint32_t
        +accent_active: uint32_t
        +accent_alert: uint32_t
        +accent_action: uint32_t
        +glow_select: uint32_t
        +glow_active: uint32_t
        +glow_alert: uint32_t
        +glow_action: uint32_t
        +text_on_select: uint32_t
        +text_on_active: uint32_t
        +text_on_alert: uint32_t
        +text_on_action: uint32_t
        +indicator_success: uint32_t
        +indicator_info: uint32_t
        +indicator_error: uint32_t
        +indicator_warning: uint32_t
    }
    class ThemeStyles {
        +screen_background: lv_style_t
        +screen_container: lv_style_t
        +button_default: lv_style_t
        +button_selected: lv_style_t
        +button_disabled: lv_style_t
        +label_small: lv_style_t
        +label_medium: lv_style_t
        +label_big: lv_style_t
        +container_transparent: lv_style_t
        +container_framed: lv_style_t
        +list_node: lv_style_t
        +list_node_selected: lv_style_t
        +circular_menu_styles: lv_style_t
        +panel_item_styles: lv_style_t
        +axis_button_styles: lv_style_t
        +progress_bar_styles: lv_style_t
        +textarea_input: lv_style_t
        +initialized: bool
    }
    UIManager --> ThemeConfig
    ThemeConfig --> ThemeTokens
    ThemeConfig --> ThemeStyles
```

#### 2.1 Initialization Sequence

```mermaid
flowchart TD
    A([initialize]) --> B[esp3d_system_message_hook_log_errors]
    B --> C[esp3d_resources_init]
    C --> D[loadThemeNames from partition blobs]
    D --> E{esp3dXValues\ninitialized?}
    E -- No --> F[esp3dXValues.initialize]
    E -- Yes --> G
    F --> G{Translation service\nstarted?}
    G -- No --> H[esp3dTranslationService.begin]
    G -- Yes --> I
    H --> I[loadStateFromSettings]
    I --> J["Read hide_lock → user_lock\nRead orientation\nRead theme → applyTheme\nRead language"]
    J --> K[Sync orientation to ESP3DValues]
    K --> L[initializeStyles]
    L --> M([is_initialized_ = true])
```

#### 2.2 Lock State (Dual-Source)

The UI is considered **locked** when either `user_lock_` or `system_lock_` is true. Each source is independent:

| Source | Setter | Persisted | Subject to `hide_lock_` |
|--------|--------|-----------|------------------------|
| `user_lock_` | `userSetLockState()` | Yes (NVS) | Yes — forced to false when `hide_lock_` is set |
| `system_lock_` | `systemSetLockState()` | No (runtime only) | No |
| `hide_lock_` | `setHideLock()` | Yes (NVS) | — forces `user_lock_ = false` when activated |

> **`ESP3D_NO_CONNECTION_LOCK_FEATURE` builds:** `systemSetLockState()` is a no-op. The system lock never engages — useful for UI testing while the CNC is disconnected.

#### 2.3 Screen & Component Registry

Only **one** screen may be active at a time. All component types are **globally unique** (one instance per type across all screens).

```mermaid
flowchart LR
    S1[Screen creates lv_obj_t] -->|registerScreen| MAP_S[("active_screens_\nESP3DScreenType → lv_obj_t*")]
    C1[Component creates struct] -->|registerComponent| MAP_C[("active_components_\nscreenType_componentType → void*")]
    MAP_S -->|getActiveScreen| S2["Returns ESP3DScreenType::none\nif empty"]
    MAP_C -->|getComponent| C2[Returns typed pointer to caller]
    MAP_S -->|unregisterScreen on destroy| S3[Entry erased]
    MAP_C -->|unregisterComponent on destroy| C3[Entry erased]
```

Both maps use `std::mutex` (separate `screens_mutex_` and `components_mutex_`) for thread-safe access from any task. Component keys are the string `"screenType_componentType"`.

#### 2.4 Orientation

```
Deg0 (0°) → rotateCW → Deg90 (90°) → rotateCW → Deg180 (180°) → rotateCW → Deg270 (270°) → rotateCW → Deg0
```

Angles are persisted to NVS and synchronized to `ESP3DValues` (index `orientation`) so screens can react to rotation events via the observable system. See [values.md](values.md) for how `ESP3DValues` notifies observers.

#### 2.5 Language

`setLanguage(code)` stores the locale string in NVS and calls `esp3dTranslationService.end()` followed by `esp3dTranslationService.begin()` to reload the `.lng` binary pack. See [translations.md](translations.md) for the full translation pipeline and binary format.

---

### 3. Theme System

#### 3.1 ThemeTokens — Semantic Color Vocabulary

26 RGBA tokens stored in DRAM (104 bytes total, format `0xRRGGBBAA`). The low byte is the LVGL opacity:

| Group | Tokens | Typical use |
|-------|--------|-------------|
| **Backgrounds** | `bg_main`, `bg_panel`, `bg_overlay`, `bg_disabled` | Screen fills, panels, semi-transparent overlays, disabled controls |
| **Text** | `text_primary`, `text_secondary`, `text_disabled` | Values, labels, hints on dark backgrounds |
| **Icons** | `icon_idle` | Circular/virtual menu icon recolor in resting state |
| **Borders** | `border_idle`, `border_focus` | Idle borders; encoder/touch focus ring |
| **Accent fills** | `accent_select`, `accent_active`, `accent_alert`, `accent_action` | Selected, running, error, back/undo states |
| **Glows** | `glow_select`, `glow_active`, `glow_alert`, `glow_action` | LVGL `outline` simulating neon halos (darker shade of matching accent) |
| **Text on accent** | `text_on_select`, `text_on_active`, `text_on_alert`, `text_on_action` | Text/icons drawn on each accent background |
| **State indicators** | `indicator_success`, `indicator_info`, `indicator_error`, `indicator_warning` | Connection dots, status labels on dark background |

**Token access helpers** (inline, zero overhead):

```cpp
lv_color_t color = esp3d_token_lv_color(tokens.accent_select); // RGBA → lv_color_t (RGB)
lv_opa_t   opa   = esp3d_token_opa(tokens.accent_select);       // RGBA → alpha byte
uint32_t   rgb   = esp3d_token_rgb(tokens.accent_select);       // RGBA → 0xRRGGBB
```

For the authoritative per-theme token values, token naming conventions, and design rationale see [`docs/ui_resources/theme_palette.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/theme_palette.md).

#### 3.2 Palette Storage and Fallback

```mermaid
flowchart LR
    subgraph Flash
        PART_BLOB["ui_resources partition\nblobs: theme 0..3\n104 bytes tokens + 24 byte name"]
        FALLBACK["esp3d_theme_palettes.h\n(compiled-in defaults)\n400 bytes .rodata"]
    end
    subgraph DRAM ["DRAM - 104 bytes"]
        TOK["ThemeTokens\ncurrent_theme_"]
    end
    PART_BLOB -- "esp3d_resources_get_blob(THEME_PALETTE_IDS[idx])" --> TOK
    FALLBACK -- "partition absent or no blob for this theme" --> TOK
```

`applyTheme()` attempts to load tokens from the partition blob first. If unavailable (old partition, absent partition, corrupted entry), it silently falls back to the compiled-in palette — the system remains fully functional. Contrast checks using BT.601 luminance are logged after loading to flag insufficient foreground/background separation.

#### 3.3 Theme Name

Each partition palette blob may append an optional 24-byte display name after the 104-byte color block. `loadThemeNames()` reads these once at `initialize()`. If absent, `getThemeName()` returns `"Theme 1"` … `"Theme 4"`.

#### 3.4 SD-Card Theme Update

```mermaid
sequenceDiagram
    participant UPD  as Update Service
    participant UI   as esp3d_theme_colors_update_from_sd()
    participant SD   as /esp3dtheme.ini
    participant PART as ui_resources partition

    UPD->>UI: call on ESP3DUpdateType::theme_colors
    UI->>PART: read current palette blobs → base values
    UI->>SD: parse [theme1]..[theme4] sections via ESP3DConfigFile
    note right of SD: 'keys: bg_main=0xRRGGBB, accent_select=...\nname=My Theme (optional)'
    loop each section seen
        UI->>PART: esp3d_resources_write_blob(THEME_PALETTE_IDS[i], tokens+name)
    end
    UI-->>UPD: return count written (0 = failure)
    UPD->>UPD: reboot (mmap view is stale after write)
```

INI values accept either `0xRRGGBB` (6 hex digits, alpha appended as `0xFF`) or `0xRRGGBBAA` (8 digits, explicit alpha). Partial sections and missing keys are legal — missing keys keep the current partition values. See [`docs/ui_resources/theme_palette.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/theme_palette.md) and the `esp3dtheme.ini.example` preset files for the full ini schema.

#### 3.5 ThemeStyles — LVGL Style Registry

`initializeStyles()` allocates ~40 `lv_style_t` structs in DRAM from the active `ThemeTokens`. All screens and components **must** use `UIManager`'s `apply*Style()` methods rather than `lv_style_init()` directly. This guarantees a single `setTheme()` call atomically refreshes all styles:

```mermaid
flowchart TD
    SET[setTheme] --> SAVE[persist theme index to NVS]
    SAVE --> APPLY[applyTheme]
    APPLY --> LOAD[Load ThemeTokens from partition blob or fallback]
    LOAD --> RST{styles.initialized?}
    RST -- Yes --> RESET["resetStyles - lv_style_reset() all ~40 styles"]
    RST -- No --> INIT
    RESET --> INIT["initializeStyles - lv_style_init() all from new tokens"]
    INIT --> INV[lv_obj_invalidate active_screen]
```

**Style categories and their `apply*` API:**

| Category | Key methods |
|----------|-------------|
| Screen | `applyScreenBackgroundStyle`, `applyScreenContainerStyle`, `applyRotaryContainerStyle`, `applyFramedContainerStyle` |
| Buttons | `applyButtonDefaultStyle(obj, radius)`, `applyButtonSelectedStyle(obj, state)`, `applyButtonDisabledStyle(obj)` |
| Labels | `applyLabelStyle(obj, LabelFontSize::small/medium/big)` |
| Containers | `applyTransparentContainerStyle`, `applyFramedContainerStyle` |
| Status indicators | `applyStatusIndicatorStyle`, `applyStatusClickableAreaStyle`, `applyStatusPressCircleStyle` |
| Circular menu | `applyCircularMenuContainerStyle`, `applyCircularMenuOuterCircleStyle`, `applyCircularMenuInnerCircleStyle`, `applyCircularMenuCenterRingStyle`, `applyCircularMenuCenterLabelStyle`, `applyCircularMenuOuterArcStyle`, `applyCircularMenuInnerArcStyle`, `applyCircularMenuClickZoneStyle`, `applyCircularMenuHandleStyle` |
| Panel items | `applyPanelItemStyle(obj, PanelItemStyleState::Default/Focused/Active)` |
| List menu | `applyListContainerStyle`, `applyListHeaderStyle`, `applyListNodeStyle(obj, selected)`, `tagListNodeStatusColor`, `tagListNodeNonSelectable` |
| Jog / Probe | `applyAxisButtonStyle(obj, active)`, `applyPinLabelStyle(obj, inverted)`, `applyProgressBarStyle`, `applyPotentiometerBarStyle` |
| Status screen | `applySpindleButtonStyle(obj, active)`, `applyPinIndicatorStyle(obj, active)`, `applyJobProgressBarStyle` |
| Probe screen | `applyParamButtonStyle(obj, focused)` |
| Generic / modal | `applyTitleSectionStyle`, `applyMessageListStyle`, `applyContentBoxStyle`, `applyTextareaInputStyle`, `applyTextareaCursorStyle`, `applySpinnerStyle`, `applyMessageBoxStyle` |

> **Style sharing rule:** Styles are shared objects — do **not** call `lv_obj_remove_style_all()` on a styled widget. Use `lv_obj_remove_style(obj, &style, part)` to remove a specific style while leaving others intact.

For the full per-screen style inventory, visual review checklist, and design decisions see [`docs/ui_resources/ui_style_guide.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/ui_style_guide.md).

#### 3.6 `applyListNodeStyle` — Special Propagation Logic

`applyListNodeStyle()` handles a LVGL inheritance edge case: class styles block token inheritance through child labels. The method directly sets `text_on_active` (selected node) or `text_primary` (unselected) on child label objects. Two LVGL user flags gate per-node behavior:

| Flag | Meaning |
|------|---------|
| `LV_OBJ_FLAG_USER_1` | Node uses status color (e.g. indicator) — skip text recolor |
| `LV_OBJ_FLAG_USER_2` | Node is non-selectable — skip selected styling |

#### 3.7 Sound State During Operations

When `ESP3D_BUZZER_FEATURE` is enabled, `saveSoundStateAndDisable()` / `restoreSoundState()` suppress buzzer activity during silent operations. A reference counter (`sound_state_locker_count`) allows nested calls:

```cpp
ESP3D_SAVE_SOUND_STATE_AND_DISABLE   // → saveSoundStateAndDisable()
// ... silent operation ...
ESP3D_RESTORE_SOUND_STATE            // → restoreSoundState()
```

---

### 4. Resource System — `esp3d_resources.cpp`

The resource system memory-maps the entire `ui_resources` flash partition and resolves images, fonts, and blobs into LVGL-ready descriptors at boot. See [`docs/ui_resources/development.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md) for the full binary format specification, partition table configuration, and build pipeline integration.

#### 4.1 Partition Binary Layout

```
Offset 0
┌───────────────────────────────────────────┐
│  PartitionHeader  (24 bytes)              │
│  magic="ESP3", variant_key[12],           │
│  num_images, num_fonts, data_section_off  │
├───────────────────────────────────────────┤
│  ImageDirEntry[num_images]  (20 B each)   │
│  id, cf, w, h, stride,                    │
│  data_offset, data_size                   │
├───────────────────────────────────────────┤
│  FontDirEntry[num_fonts]  (16 B each)     │
│  id, data_offset, data_size, slot_size    │
│  (theme palette blobs share this space)   │
├───────────────────────────────────────────┤  ← data_section_offset
│  DATA SECTION                             │
│  ├─ Image pixel data  (XIP read)         │
│  ├─ Font blobs (header+bitmaps, XIP)     │
│  └─ Theme palette blobs (104 B + name)   │
└───────────────────────────────────────────┘
```

`variant_key` (12 bytes, null-padded ASCII) must match the `RESOURCES_VARIANT` compile-time constant. A mismatch is logged and all resources remain at their compiled-in fallbacks — the system stays functional.

#### 4.2 Image Resolution

```mermaid
flowchart LR
    DIR["ImageDirEntry\nid, cf, w, h, stride\ndata_offset, data_size"]
    MAP["Static ID→lv_image_dsc_t* map\nbuilt from ESP3D_IMAGES_LIST macro"]
    DSC["lv_image_dsc_t\nheader.cf/w/h/stride\ndata → flash XIP pointer"]
    FALL["g_fallback_img_dsc\ncompiled-in L8 grayscale\n24×24 or 32×32"]
    DIR -->|id lookup| MAP
    MAP -->|match| DSC
    MAP -->|no match| FALL
```

All image descriptors default to `g_fallback_img_dsc` (a resolution-matched L8 grayscale placeholder selected by `RESOURCES_ICON_SIZE` at compile time). Images found in the partition directory overwrite the default descriptor in-place.

#### 4.3 Font Loading — XIP + Shadow Pattern

Font glyph bitmaps stay in flash (read via XIP cache — zero DRAM copy). Only the small pointer-resolution structures live in DRAM:

```mermaid
flowchart LR
    subgraph Flash["Flash (XIP)"]
        BLOB["Font blob\nFontBlobHeader (48 B)\nglyph_bitmap[]\nglyph_dsc[]"]
    end
    subgraph DRAM["DRAM (~150-250 bytes/font)"]
        SHADOW["Esp3dFontShadow\ncmaps[ESP3D_FONT_MAX_CMAPS]\nkern union (pairs or classes)\ndsc: lv_font_fmt_txt_dsc_t"]
    end
    BLOB -->|"load_font()\noffset fixup, no pixel memcpy"| SHADOW
    SHADOW -->|dsc pointer| LV["lv_font_t\nget_glyph_dsc → flash\nget_glyph_bitmap → flash"]
```

`ESP3D_FONT_MAX_CMAPS = 5` is tuned to the medium font's 5 cmap ranges. `load_font()` validates every table offset against `font_size` before constructing any pointer — a corrupt blob with a valid magic is rejected rather than producing an out-of-bounds flash read at render time.

Two `static_assert` guards validate layout assumptions:
- `LV_FONT_FMT_TXT_LARGE == 0` — required for cmap/kern binary layout
- `sizeof(lv_font_fmt_txt_glyph_dsc_t) == 8` — required for glyph descriptor array stride

#### 4.4 Blob Access (Theme Palettes)

Theme palette blobs are stored in `FontDirEntry` slots, sharing the same directory and ID namespace as fonts. `esp3d_resources_get_blob(id, &size)` returns a const pointer directly into the mmapped partition — valid as long as the partition is mapped and no `esp3d_resources_write_blob()` call has invalidated it.

#### 4.5 Fallback Strategy

| Resource | Fallback when partition is unavailable |
|----------|----------------------------------------|
| Image not in directory | `g_fallback_img_dsc` — build-resolution L8 grayscale placeholder |
| Font not in directory | `lv_font_montserrat_14` (built into LVGL) |
| Theme palette blob absent | `THEME_PALETTES[]` compiled-in FLASH defaults (400 bytes `.rodata`) |
| Partition absent or wrong variant | All images/fonts stay at fallback; system remains functional |

#### 4.6 SD Patch Mechanism

Individual resource overrides can be applied without a full firmware reflash via files placed in `/esp3dres/` on the SD card:

```mermaid
sequenceDiagram
    participant UPD  as Update Service
    participant PATCH as esp3d_resources_patch_sd()
    participant SD   as /esp3dres/
    participant PART as ui_resources partition

    UPD->>PATCH: call on ESP3DUpdateType::resource_patches
    PATCH->>SD: opendir /esp3dres
    loop each *.bin (image) or *.fnt (font)
        PATCH->>SD: fread PatchImageHeader / PatchFontHeader
        PATCH->>PART: re-read partition directory
        PATCH->>PART: validate id / dimensions / slot size
        PATCH->>PART: sector R-M-E-W via patch_write_to_partition()
        PATCH->>SD: rename to *.ok (success) or *.bad (failure)
    end
    PATCH-->>UPD: return count applied
```

- `*.bin` image patch: must match `cf`, `w`, `h`, `stride`, and `data_size` of the existing directory entry.
- `*.fnt` font patch: blob must fit within `slot_size` (padded slots allow smaller replacements). The `data_size` field in the directory is updated atomically via a separate sector write after the data is written.
- Power loss between the data write and the rename leaves the file un-renamed; the patch is safely re-applied on the next boot.

See [`docs/guides/ui_resources_guide.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/ui_resources_guide.md) for the end-to-end SD-card update workflow.

---

### 5. Snapshot System — `esp3d_snapshot.h`

When `ESP3D_SNAPSHOT_FEATURE` is enabled, `snapshot_state_t` tracks a live screen capture across multiple BSP flush callbacks:

| Field | Type | Purpose |
|-------|------|---------|
| `file` | `FILE*` | Open output file receiving raw pixel rows |
| `error` | `volatile bool` | Error flag set from the flush callback on write failure |
| `expected_pixels` | `uint32_t` | Total frame pixels for completion detection |
| `captured_pixels` | `volatile uint32_t` | Counter incremented per flush call |
| `mutex` | `SemaphoreHandle_t` | Serializes concurrent access to the state struct |
| `initialized` | `volatile bool` | Guards the flush hook against uninitialized state access |
| `ongoing` | `volatile bool` | Active-capture flag; guards the BSP flush hook path |

The global instance `g_snapshot` is declared in `esp3d_snapshot.h` and consumed by both the BSP flush callback and `esp3d_snapshot_deinit()` in `main/core/esp3d_lvgl.cpp`.

---

### 6. Translation ID Map — `esp3d_translations_id_map.h`

Provides bidirectional lookup between the numeric file IDs used in `.lng` binary packs and the strongly-typed `ESP3DLabel` enum used throughout the UI source.

```cpp
// Flash-stored lookup table (X-macro generated from .inc definition files)
static const ESP3DTranslationIdEntry ESP3DTranslationIdMap[];

// Bidirectional API (inline, linear scan):
ESP3DLabel label = getLabelFromFileId(file_id);            // .lng numeric ID → enum
uint16_t   id    = getFileIdFromLabel(ESP3DLabel::btn_ok); // enum → .lng numeric ID
```

The table is stored in `.rodata` (flash) to avoid DRAM pressure. An unknown file ID returns `ESP3DLabel::unknown_index`; an unknown label returns `UINT16_MAX`.

See [translations.md](translations.md) for the full `.lng` binary format and `ESP3DTranslationService` pipeline.

---

## Data Flow Diagrams

### Full Initialization Flow

```mermaid
flowchart TD
    MAIN["main.cpp\napp_main"]
    XUI["esp3dXui.begin()"]
    TASK["tft_ui_task\n(Core 1 pinned)"]
    CA["create_application()"]
    UM_INIT["ui_manager.initialize()"]
    RES_INIT["esp3d_resources_init()"]
    MMAP["spi_flash_mmap\nui_resources partition"]
    IMG["Resolve images\n→ lv_image_dsc_t[]"]
    FONT["Load fonts\n→ Esp3dFontShadow + lv_font_t"]
    BLOB["Retain font dir\nfor get_blob()"]
    THEME_N["loadThemeNames()"]
    VALS["esp3dXValues.initialize()"]
    TRANS["esp3dTranslationService.begin()"]
    SETT["loadStateFromSettings()\nNVS → orientation/theme/language/locks"]
    APPLY["applyTheme()\npartition blob or fallback → ThemeTokens"]
    STYLES["initializeStyles()\nThemeTokens → ~40 lv_style_t"]
    SPLASH["Splash screen\nlv_timer_handler() first frame"]
    SEM["notifyFirstFrameRendered()"]

    MAIN --> XUI --> TASK
    TASK --> CA --> UM_INIT
    UM_INIT --> RES_INIT --> MMAP --> IMG & FONT & BLOB
    UM_INIT --> THEME_N
    UM_INIT --> VALS
    UM_INIT --> TRANS
    UM_INIT --> SETT --> APPLY --> STYLES
    CA --> SPLASH --> SEM
```

### Theme Change Flow

```mermaid
sequenceDiagram
    participant SCR as Settings Screen
    participant UM  as UIManager
    participant NVS as NVS
    participant PART as ui_resources partition
    participant LV  as LVGL

    SCR->>UM: setTheme(Theme::Theme_2)
    UM->>NVS: writeByte(esp3d_theme_color, 2)
    UM->>UM: applyTheme()
    UM->>PART: esp3d_resources_get_blob(THEME_PALETTE_IDS(2))
    alt Blob present
        PART-->>UM: ThemeTokens (104 B) + optional name
    else Partition absent or no blob
        UM->>UM: use THEME_PALETTES[2] compiled-in fallback
    end
    UM->>UM: log contrast sanity checks (BT.601 luminance)
    UM->>UM: resetStyles() - lv_style_reset ~40 styles
    UM->>UM: initializeStyles() - lv_style_init from new tokens
    UM->>LV: lv_obj_invalidate(active_screen)
```

### Resource SD Patch Flow

```mermaid
flowchart LR
    SD["/esp3dres/icon_home.bin\nPatchImageHeader + pixels"] --> PATCH
    PATCH["esp3d_resources_patch_sd()"] --> VALID{"Validate\nid / dims / slot_size"}
    VALID -- OK --> RMEW["sector R-M-E-W\ninto partition"]
    RMEW --> REN_OK["rename → icon_home.ok"]
    VALID -- Fail --> REN_BAD["rename → icon_home.bad"]
```

---

## Integration with Other Modules

| Module | Relationship |
|--------|-------------|
| [Core_Platform_&_Infrastructure.md](Core_Platform_and_Infrastructure.md) | `UIManager` reads/writes NVS via `esp3dXsettings`; notifies `ESP3DValues` on orientation change; uses `esp3d_log` macros throughout |
| [Hardware_Peripheral_Drivers.md](Hardware_Peripheral_Drivers.md) | `ESP3DXUi` starts the `RenderingClient`; BSP `lvgl_flush_cb` / `increase_lvgl_tick` are provided by each board's `board_init.c` |
| [values.md](values.md) | `esp3dXValues.handle()` is called inside the LVGL tick loop to propagate observable value changes to UI widgets without polling |
| [translations.md](translations.md) | `UIManager::setLanguage()` restarts `ESP3DTranslationService`; `ESP3DTranslationIdMap` maps numeric IDs from `.lng` packs to `ESP3DLabel` enum values used in all UI source |

---

## Critical Constraints

| Rule | Rationale |
|------|-----------|
| All `lv_obj_*` / `lv_style_*` calls must be inside `_lock_acquire` / `_lock_release` or within LVGL event/timer callbacks | LVGL is strictly single-threaded on Core 1 |
| Never destroy LVGL objects inside an event callback | Use `lv_timer_create()` cleanup timers — see [`docs/architecture/screen_transitions_flow.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md) |
| `initializeStyles()` / `resetStyles()` only from the LVGL task or before it starts | `lv_style_*` APIs are not thread-safe |
| Never call `lv_obj_remove_style_all()` on widgets styled via `apply*Style()` | Styles are shared objects; removing all strips them from the shared pool, affecting all other widgets using the same style |
| `esp3d_resources_init()` is idempotent — safe to call multiple times | Guarded by `g_img_base != nullptr` check |
| After `esp3d_resources_write_blob()`, the mmap view is stale | The update service must reboot immediately after a successful write |
| All `calloc`/`malloc` in the resource and theme update paths must be checked | System operates on constrained heap (as low as 10 KB free in BT mode); any allocation failure must be logged with total free and largest block |
| `LV_FONT_FMT_TXT_LARGE == 0` must hold | Required for the font blob binary layout assumed by `load_font()`; validated at build time via `static_assert` |

---

## Related Documentation

| Document | Content |
|----------|---------|
| [`docs/architecture/screens_architecture.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screens_architecture.md) | Screen base types, `GenericScreen` / `CircularMenuScreen` / `ListMenuScreen` inheritance and registration patterns |
| [`docs/architecture/screen_transitions_flow.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/screen_transitions_flow.md) | Timer-based safe screen transition patterns; cleanup timer idiom for safe object destruction |
| [`docs/ui_resources/development.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md) | `ui_resources` partition binary format (byte-map), `esp3d_resources.h` full API, `generate_resources.py`, SD-card update mechanisms |
| [`docs/ui_resources/theme_palette.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/theme_palette.md) | Authoritative 26-token reference; per-theme RGBA values; design conventions |
| [`docs/ui_resources/ui_style_guide.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/ui_style_guide.md) | `ThemeStyles` architecture; full `apply*` catalog; per-screen style inventory and visual review checklist |
| [`docs/guides/ui_resources_guide.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/ui_resources_guide.md) | How to add/modify icons and fonts; regenerate `ui_resources.bin`; SD-card update and no-PC workflow |
| [`docs/guides/esp3d_log_guide.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp3d_log_guide.md) | `esp3d_log` / `esp3d_log_d` macros and hook registration used by `esp3d_system_message_hook_log_errors()` |
| [`docs/guides/esp32_memory_constraints.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) | Heap fragmentation guidance; why `largest_free_block` matters more than total free heap |


## Documents de conception (depot)

- [Lvgl refresh optimization guide](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/Lvgl%20refresh%20optimization%20guide.md)
- [ui_resources_customization](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/user%20documentation/ui_resources_customization.md)
