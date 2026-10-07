---
title: "Time Service — ESP3D-X Reference"
---

# Time Service — ESP3D-X Reference

Guard: `ESP3D_TIMESTAMP_FEATURE`

The time service manages system clock synchronization. When enabled, it can sync via NTP (internet time) or accept a manually provided timestamp. It belongs to the **Network & Web Services** group and requires an active WiFi STA connection for NTP operation.

---

## Files

| File | Role |
|---|---|
| `main/modules/time/esp3d_time_service.h` | `TimeService` class declaration |
| `main/modules/time/esp3d_time_service.cpp` | Full implementation |

---

## Global instance

```cpp
extern TimeService esp3dTimeService;
```

A single singleton defined in the `.cpp` file. All callers use this instance directly.

---

## Class declaration

```cpp
class TimeService final {
 public:
  TimeService();
  ~TimeService();
  bool begin();
  void end();
  void handle();
  const char* getCurrentTime();
  const char* getTimeZone();
  bool updateTimeZone(bool fromsettings = false);
  bool setTime(const char* stime);
  bool setTimeZone(const char* stime);
  bool started();
  bool isInternetTime(bool readfromsettings = false);
 private:
  int _get_time_zone_offset_min();
  bool _started;
  uint64_t _dispatch_time;
  bool _is_internet_time;
  std::string _time_zone;
  std::string _server_url[CONFIG_LWIP_SNTP_MAX_SERVERS];
  uint8_t _server_count;
};
```

---

## Lifecycle

### `begin()` → `bool`

1. Calls `end()` unconditionally to reset any prior state.
2. Applies the current timezone via `updateTimeZone(true)` regardless of internet-time setting.
3. If `esp3d_use_internet_time` is **not** set, returns `true` immediately (manual mode — timezone applied, SNTP not started).
4. Checks the active network mode. NTP is only started in **WiFi STA mode** (`ESP3DNetworkMode::wifi_sta`). All other modes — off, AP, AP-config, AP-limited, BT-serial, BT-BLE — return `false`.
5. Loads NTP server URLs from NVS keys `esp3d_time_server1`, `esp3d_time_server2`, `esp3d_time_server3` (up to `CONFIG_LWIP_SNTP_MAX_SERVERS` servers; empty strings are skipped).
6. Configures `SNTP_OPMODE_POLL` and `SNTP_SYNC_MODE_IMMED`, registers each server, calls `esp_sntp_init()`.
7. Records the start tick in `_dispatch_time` to begin the timeout countdown.

### `handle()`

Called from the main application loop. Only active when `_started` is `true` and `_dispatch_time != 0` (waiting for NTP sync).

**Poll interval:** every `TIMEOUT_NTP_REFRESH` = **5 000 ms**.

On each poll:
- Calls `time(nullptr)` and checks whether the result is post-1970 (`> 0`).
- On valid time: formats the timestamp and pushes it to `ESP3DValuesIndex::status_bar_label` (when `ESP3D_HAS_STATUS_BAR` is defined), then sets `_dispatch_time = 0` to stop polling.
- On timeout (`elapsed > TIMEOUT_NTP_REQUEST` = **180 000 ms**): logs the failure, sets `_dispatch_time = 0`, and stops without further retry.

### `end()`

Stops SNTP (`esp_sntp_stop()`) if previously started, resets all private members to defaults, sets `_started = false`.

---

## Timing constants

| Constant | Value | Purpose |
|---|---|---|
| `TIMEOUT_NTP_REQUEST` | 180 000 ms (3 min) | Maximum wait for a successful NTP sync after `begin()` |
| `TIMEOUT_NTP_REFRESH` | 5 000 ms | Interval between `handle()` poll checks |

---

## NTP configuration

| NVS setting key | Meaning |
|---|---|
| `esp3d_use_internet_time` | `true` = NTP sync; `false` = manual-only |
| `esp3d_time_server1` | Primary NTP server URL |
| `esp3d_time_server2` | Secondary NTP server URL |
| `esp3d_time_server3` | Tertiary NTP server URL |

SNTP is configured with:
- `SNTP_OPMODE_POLL` — periodic polling
- `SNTP_SYNC_MODE_IMMED` — apply received time immediately (not gradual slew)

---

## Timezone handling

### Storage format (`esp3d_timezone` NVS key)

```
+HH:MM   east of UTC   (e.g. "+05:30" for IST)
-HH:MM   west of UTC   (e.g. "-05:00" for EST)
```

### POSIX sign inversion

The POSIX `TZ` environment variable uses the **opposite sign** from the UTC-offset convention. `updateTimeZone()` inverts the sign before calling `setenv("TZ", ...)` / `tzset()`:

| NVS value | Resulting `TZ` string |
|---|---|
| `+05:30` | `GMT-5:30` |
| `-05:00` | `GMT+5:00` |
| `+00:00` | `GMT-0:00` |

### `updateTimeZone(bool fromsettings = false)` → `bool`

- `fromsettings = true`: reads `esp3d_timezone` from NVS first.
- `fromsettings = false` (default): uses the cached `_time_zone` member.
- Validates that the string matches `[+-]HH:MM` format.
- Calls `setenv("TZ", converted, 1)` then `tzset()`.
- Returns `false` if the format is invalid or `setenv` fails.

### `setTimeZone(const char* stime)` → `bool`

Stores the string into `_time_zone` and calls `updateTimeZone()`. Does **not** persist to NVS — the caller must save to settings if persistence is required.

### `getTimeZone()` → `const char*`

Returns `_time_zone.c_str()`. Valid until the next `setTimeZone()` or `end()` call.

### `_get_time_zone_offset_min()` → `int` (private)

Returns the timezone offset in **minutes**, with the sign negated for `+` zones (POSIX convention). Used by `setTime()` to compute the correct `timeval` when applying a manually provided timestamp.

---

## Manual time

### `setTime(const char* stime)` → `bool`

Parses an ISO-8601 timestamp string and sets the system clock via `settimeofday()`.

Accepted formats:
- `%Y-%m-%dT%H:%M:%S` (with seconds)
- `%Y-%m-%dT%H:%M` (without seconds)

Any timezone suffix in the string is ignored; the stored `_time_zone` offset is applied instead via `_get_time_zone_offset_min()`.

Returns `false` if parsing fails.

---

## Current time output

### `getCurrentTime()` → `const char*`

Returns the current local time formatted as:

```
%Y-%m-%d %H:%M:%S
```

Example: `"2026-09-01 14:32:07"`

> **Warning:** the return value points to an internal **static buffer**. It is overwritten on every call and is **not thread-safe** across concurrent callers.

---

## Status bar integration

When `ESP3D_HAS_STATUS_BAR` is defined, `handle()` pushes the formatted time string to the observable system after a successful NTP sync:

```cpp
esp3dValues.set(ESP3DValuesIndex::status_bar_label,
                getCurrentTime(),
                ESP3DValuesCbAction::Update);
```

This update fires once — immediately after the first valid time is received — not on every poll tick.

---

## Network mode constraints

NTP startup is gated on the network mode at the time `begin()` is called:

| Network mode | NTP started |
|---|---|
| `wifi_sta` | Yes |
| `wifi_ap` | No |
| `wifi_ap_config` | No |
| `wifi_ap_limited` | No |
| `off` | No |
| `bt_serial` | No |
| `bt_ble` | No |

In all non-STA modes `begin()` returns `false`. The timezone is still applied unconditionally.

---

## State query

| Method | Returns |
|---|---|
| `started()` | `true` if `begin()` succeeded and `end()` has not yet been called |
| `isInternetTime(bool readfromsettings = false)` | `true` if NTP mode is active; reads from NVS when `readfromsettings = true` |

---

## Settings keys summary

| Key | Read by |
|---|---|
| `esp3d_use_internet_time` | `begin()`, `isInternetTime()` |
| `esp3d_timezone` | `updateTimeZone()` |
| `esp3d_time_server1` | `begin()` |
| `esp3d_time_server2` | `begin()` |
| `esp3d_time_server3` | `begin()` |

All reads go through [ESP3DSettings](config_file.md) (NVS-backed).

---

## Related modules

| Module | Relationship |
|---|---|
| [Connection management](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) | Provides the active network mode queried in `begin()` to gate NTP startup |
| [ESP3DSettings](config_file.md) | NVS reads for all five settings keys |
| [ESP3DValues](values.md) | Receives `status_bar_label` push after successful NTP sync |
| [mDNS](mdns.md) | Advertises `time = "ntp"` / `"manual"` in the `_device-info._tcp` TXT record |
