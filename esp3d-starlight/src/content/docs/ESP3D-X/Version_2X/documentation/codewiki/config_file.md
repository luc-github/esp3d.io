---
title: "Config File Module"
---

# Config File Module

## Overview

The **Config File** module (`ESP3DConfigFile`) is a lightweight INI-style parser for reading and optionally revoking configuration files stored on any filesystem exposed by [`ESP3DGlobalFileSystem`](filesystem.md). It runs entirely on fixed-size stack buffers, making it safe under the memory constraints of this ESP32-based pendant firmware.

The module serves two distinct use cases:

| Use case | Constructor | `processFile()` call |
|---|---|---|
| **Full scan with callback** | Provide a `processingFunction_t` | `processFile()` — visits every `(section, key, value)` triple |
| **Single key lookup** | No callback (`fn = nullptr`) | `processFile(section, key, buf, size)` — stops at first match |

After processing, `revokeFile()` can atomically replace the original file with a sanitized copy that masks designated protected keys, then deletes the original. This prevents credentials from re-applying on subsequent boots.

---

## Files

| File | Role |
|---|---|
| `main/modules/config_file/esp3d_config_file.h` | Class declaration, `processingFunction_t` typedef |
| `main/modules/config_file/esp3d_config_file.cpp` | Implementation |

---

## Dependencies

| Dependency | Purpose |
|---|---|
| [`ESP3DGlobalFileSystem`](filesystem.md) (`globalFs`) | File open / close / read / write / rename / remove / exists |
| `esp3d_log` | Error-level logging on parse and I/O failures |

---

## INI Format

```ini
; This is a comment
# This is also a comment

[section_name]
KEY=value
Another Key = spaced value
```

**Rules enforced by the parser:**

- Lines starting with `;` or `#` (after trimming) are silently skipped.
- A section header is a line whose first non-space character is `[` and whose last non-space character is `]`.
- A key/value pair requires `=` to appear somewhere between position 1 and `len-2` (i.e., both key and value must be non-empty — a bare `KEY=` is not accepted).
- Leading and trailing whitespace is stripped from sections, keys, and values.
- Lines exceeding `LINE_MAX_SIZE` (255) are hard-truncated; section/key/value fields are capped individually (see [Limits](#limits)).
- A key/value pair is only valid when at least one section header has been seen first; orphan `KEY=value` lines before the first `[section]` are ignored.

---

## API

### Type: `processingFunction_t`

```cpp
typedef std::function<bool(const char*, const char*, const char*)> processingFunction_t;
```

Callback signature: `(section, key, value) → bool`. Return `false` to signal a processing error; the parser records this but continues to the end of file. The final `processFile()` return value reflects any `false` return from the callback.

---

### Constructor

```cpp
ESP3DConfigFile(const char* path,
                processingFunction_t fn = nullptr,
                const char* scrambledpath = nullptr,
                const char** protectedkeys = nullptr);
```

| Parameter | Description |
|---|---|
| `path` | Filesystem path of the INI file to read. |
| `fn` | Callback invoked per key/value pair. Pass `nullptr` for single-key lookup mode. |
| `scrambledpath` | Destination path used by `revokeFile()`. Required only if revocation is needed. |
| `protectedkeys` | `nullptr`-terminated array of key names whose values are replaced by `********` in the revoked file. Ignored if `scrambledpath` is `nullptr`. |

---

### `processFile()`

```cpp
bool processFile(const char* section_request = nullptr,
                 const char* key_request    = nullptr,
                 char*       value_found    = nullptr,
                 size_t      max_size       = 0);
```

Opens the file, parses it line by line, and dispatches as follows:

- **Callback mode** (`_pfunction` set): invokes the callback for every valid `(section, key, value)` triple. Returns `false` if the file cannot be opened or if any callback invocation returned `false`.
- **Lookup mode** (no callback): scans until `section_request` and `key_request` both match, copies the value into `value_found` (NUL-terminated, capped at `max_size`), then stops early. Returns `false` only if the file cannot be opened.

In lookup mode, a "not found" result returns `true` with `value_found` unmodified — callers must initialise it with a default before calling.

---

### `revokeFile()`

```cpp
bool revokeFile();
```

Requires `scrambledpath` to have been provided at construction. Steps:

1. If `scrambledpath` already exists, rename it to `scrambledpath1`, `scrambledpath2`, … until a free name is found.
2. Open `scrambledpath` for writing and `path` for reading.
3. Copy each non-empty line. If the line's key matches any entry in `protectedkeys` (case-insensitive), write `KEY=********` instead of the original value.
4. Close both files, then **delete the original `path`**.

Returns `false` and leaves `path` intact if any step fails.

**Protected-key matching** is performed by `isScrambleKey()`: the candidate key string must match the beginning of the raw line (case-insensitive), followed by optional spaces and then `=`. This means `AP_Password = secret` is correctly matched by the protected-key entry `"AP_Password"`.

---

### Line-inspection helpers

These are `public` but intended as internal helpers used by `processFile()` and `revokeFile()`. They operate in-place on the supplied buffer.

| Method | Signature | Description |
|---|---|---|
| `trimSpaces` | `char* trimSpaces(char* line, uint8_t maxsize=0)` | Strips leading/trailing whitespace; if `maxsize > 0`, truncates to that length. Returns a pointer into `line` (not a copy). |
| `isComment` | `bool isComment(char* line)` | Returns `true` if the first character is `;` or `#`. |
| `isSection` | `bool isSection(char* line)` | Returns `true` if the line starts with `[` and ends with `]`. |
| `isValue` | `bool isValue(char* line)` | Returns `true` if `=` appears at a position other than first or last (length ≥ 3 required). |
| `getSectionName` | `char* getSectionName(char* line)` | Strips `[` and `]` from `line` in-place; returns trimmed interior pointer. |
| `getKeyName` | `char* getKeyName(char* line)` | Replaces the first `=` with `\0`; returns the trimmed key. Modifies `line`. |
| `getValue` | `char* getValue(char* line)` | Returns the trimmed substring after the `\0` inserted by `getKeyName()`. Must be called on the same buffer, after `getKeyName()`. |

> **Warning:** `getSectionName`, `getKeyName`, and `getValue` mutate their argument buffer. They must only be called on the working copy inside `processFile()` / `revokeFile()`.

---

## Limits

| Constant | Value | Applies to |
|---|---|---|
| `LINE_MAX_SIZE` | 255 | Raw line length (bytes, excluding `\0`) |
| `SECTION_MAX_SIZE` | 30 | Section name after trimming |
| `KEY_MAX_SIZE` | 30 | Key name after trimming |
| `VALUE_MAX_SIZE` | 128 | Value string after trimming |

All internal buffers are stack-allocated. No dynamic allocation occurs during parsing.

---

## Known Callers

### Update Service (`ESP3DUpdateService`)

```cpp
// main/modules/update/esp3d_update_service.cpp
ESP3DConfigFile updateConfiguration(
    ESP3D_SD_FS_HEADER ESP3D_CONFIG_FILE,          // e.g. /sd/esp3dcnf.ini
    ESP3DUpdateService::processingFileFunction,
    ESP3D_SD_FS_HEADER ESP3D_CONFIG_FILE_OK,       // e.g. /sd/esp3dcnf.ok
    ESP3DProtectedKeys);                            // nullptr-terminated

updateConfiguration.processFile();   // applies all settings to NVS
updateConfiguration.revokeFile();    // deletes .ini, writes .ok with secrets masked
```

`ESP3DProtectedKeys` is defined in `esp3d_update_service.cpp`:

```cpp
const char* ESP3DProtectedKeys[] = {
    "NOTIF_TOKEN1", "NOTIF_TOKEN2",
    "AP_Password",
    /* ... */
    nullptr
};
```

See [Update Service](update_service.md) for the full list and the settings it applies.

---

### Translation Service (`ESP3DTranslationService`)

```cpp
// main/modules/translations/esp3d_translation_service.cpp
ESP3DConfigFile pack(fullPath.c_str(), lngPackIniCallback);
pack.processFile();   // callback mode — no revocation
```

Language pack `.lng` files use the same INI format. See [Translations](translations.md).

---

### UI Theme Parser (`UIManager`)

```cpp
// main/display/esp3d_ui.cpp
ESP3DConfigFile themeFile(ESP3D_SD_FS_HEADER "/esp3dtheme.ini", s_parseThemeIniEntry);
themeFile.processFile();   // callback mode — no revocation
```

Theme customisation files loaded from SD at boot. See [UI Core](ui_core.md).

---

### Macro Manager

```cpp
// main/display/cnc/screens/macro_manager.cpp
ESP3DConfigFile configFile(MACRO_FILE_PATH, processMacroEntry);
configFile.processFile();   // callback mode — no revocation
```

Macro lists stored on the internal flash filesystem.

---

## Usage Patterns

### Full-scan with callback

```cpp
bool myCallback(const char* section, const char* key, const char* value) {
    // process each entry
    return true;  // return false to signal an error (parsing continues)
}

ESP3DConfigFile cfg("/sdcard/settings.ini", myCallback);
if (!cfg.processFile()) {
    // file open failure, or at least one callback returned false
}
```

### Single-key lookup

```cpp
char value[32] = "default";
ESP3DConfigFile cfg("/sdcard/settings.ini");  // no callback
cfg.processFile("network", "ssid", value, sizeof(value));
// value holds the matched string, or "default" if not found
```

### Process then revoke

```cpp
static const char* protected_keys[] = { "password", nullptr };

ESP3DConfigFile cfg(
    "/sdcard/esp3dcnf.ini",
    myCallback,
    "/sdcard/esp3dcnf.ok",
    protected_keys);

cfg.processFile();  // apply settings
cfg.revokeFile();   // delete .ini, write .ok with password=********
```

---

## Design Notes

- The class is `final` — not intended as a base class.
- The `extern "C"` block in the header allows the header to be included from C translation units even though `ESP3DConfigFile` is a C++ class.
- `getValue()` depends on the `\0` written into the buffer by `getKeyName()`. The two calls are always paired inside `processFile()` / `revokeFile()` on the same local `line[]` array. Calling `getValue()` on an unmodified buffer is undefined behaviour.
- The callback carries no user-data pointer. Callers that need state (e.g., the UI theme parser, the translation service) store it in a module-level pointer, set before `processFile()` and cleared after.
