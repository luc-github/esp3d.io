---
title: "Authentication Module"
---

# Authentication Module

Reference documentation for `main/modules/authentication/`. Covers data
structures, the full `ESP3DAuthenticationService` API, session mechanics, NVS
settings, and integration points. For the service lifecycle, orchestration by
`ESP3DNetworkServices`, and per-service defensive purge, see
[authentication_lifecycle.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/authentication_lifecycle.md).

---

## Build-time feature flag

```cmake
# CMakeLists.txt
option(ESP3D_AUTHENTICATION_FEATURE ...)
```

| `ESP3D_AUTHENTICATION_FEATURE` | Effect |
|---|---|
| **ON** | Full session-based authentication is active. Passwords and timeout are loaded from NVS. All session management APIs compile in. |
| **OFF** | Every auth check unconditionally returns `ESP3DAuthenticationLevel::admin`. No sessions, no mutex, no NVS reads. Zero runtime overhead. |

The flag is checked by `#if ESP3D_AUTHENTICATION_FEATURE` throughout the module
and in every command handler (`esp0.cpp`, `esp550.cpp`, `esp555.cpp`,
`esp510.cpp`, …).

---

## Authentication levels

Defined in `main/modules/authentication/esp3d_authentication_types.h`:

```cpp
enum class ESP3DAuthenticationLevel : uint8_t {
  guest,            // unauthenticated / unknown
  user,             // logged in as the user account
  admin,            // logged in as the admin account
  not_authenticated,
};
```

The ordering `guest < user < admin` is used implicitly by command handlers —
a command requiring `admin` rejects any level below it.

When `ESP3D_AUTHENTICATION_FEATURE` is **OFF**, `getAuthenticatedLevel()`
always returns `admin` regardless of any password argument, so all commands
are accessible without credentials.

---

## Data structures

### `ESP3DAuthenticationRecord`

Defined in `main/modules/authentication/esp3d_authentication_records.h`.
Active only when `ESP3D_AUTHENTICATION_FEATURE` is ON.

```cpp
struct ESP3DAuthenticationRecord {
  ESP3DAuthenticationLevel level;   // granted level for this session
  int socket_id;                    // underlying socket fd (-1 = any)
  ESP3DClientType client_type;      // which service owns this session
  char session_id[25];              // 24-char hex string + NUL
  int64_t last_time;                // esp3d_hal::millis() at record creation
};
```

**`client_type`** discriminates sessions from different transports that share
the same list. Current values used:

| `ESP3DClientType` | Service that creates the record |
|---|---|
| `webui` | HTTP login handler (`esp3d_login.cpp`), cookie `ESP3D_SESSIONID` |
| `webui_websocket` | WebSocket `/ws` endpoint (`esp3dWsWebUiService`) |
| `websocket_server` | WebSocket `/wsdata` endpoint (`esp3dWsServerDataService`) |
| `socket_server` | Telnet / raw socket server (`esp3d_socket_server.cpp`) |

**`last_time`** is set to `esp3d_hal::millis()` at record creation. It is not
refreshed on activity — expiry is calculated from creation time, not last
access. A session therefore expires exactly `session_timeout` minutes after
login, regardless of ongoing use.

**Memory cost**: ~50 bytes per record (fixed-size struct, no heap allocation
per field). At `MAX_SESSION_RECORDS = 10` the session list consumes at most
~500 bytes of heap including `std::list` node overhead — acceptable even in
the worst-case Bluetooth configuration (~10 KB free heap).

---

## `ESP3DAuthenticationService`

Singleton declared `extern` in `esp3d_authentication.h`:

```cpp
extern ESP3DAuthenticationService esp3dAuthenthicationService;
```

The instance is defined in `esp3d_authentication.cpp`. Do not create
additional instances — the mutex, session list, and passwords are
instance-local.

### Lifecycle API

| Method | What it does |
|---|---|
| `begin()` | Reads `_admin_pwd`, `_user_pwd`, `_session_timeout` from NVS. Does **not** touch `_sessions`. |
| `handle()` | Calls `purgeExpiredSessions()`. Called every loop tick from `ESP3DNetworkServices::handle()`. |
| `end()` | Clears passwords and calls `clearAllSessions()`. |

Only `ESP3DNetworkServices` calls these — HTTP, WebSocket, and socket server
do not call them directly. See
[authentication_lifecycle.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/authentication_lifecycle.md) for the full
orchestration sequence.

### Password verification

```cpp
ESP3DAuthenticationLevel getAuthenticatedLevel(const char *pwd = nullptr);
bool isAdmin(const char *pwd);
bool isUser(const char *pwd);
```

`getAuthenticatedLevel()` checks admin first, then user, and returns `guest`
if neither matches. Both `isAdmin()` and `isUser()` return `false` on a
`nullptr` argument. With the feature OFF they always return `true` / `admin`.

Passwords are compared with `std::string::operator==` — exact, case-sensitive,
binary match against the NVS-stored value.

### Session ID generation

```cpp
const char *create_session_id(struct sockaddr_storage source_addr,
                               int socketId);
```

Generates a 24-character uppercase hex string (12 bytes of entropy):

- 8 bytes from two `esp_random()` calls (ESP32 hardware RNG, TRNG-backed).
- 4 bytes from `esp3d_hal::millis()` (timestamp component).

```
sessionID = sprintf("%02X%02X%02X%02X" "%02X%02X%02X%02X" "%02X%02X%02X%02X",
            rnd1[0..3], rnd2[0..3], millis[0..3])
```

The result is written into a `static char[25]` buffer — **not thread-safe and
not re-entrant**. Callers must copy the returned pointer before any other call.
The `source_addr` and `socketId` parameters are accepted for API compatibility
but are not used in the ID computation. Returns `"NONE"` if `sprintf` fails
(effectively impossible given the fixed format).

### Session management API

All methods are no-ops or return safe defaults when
`ESP3D_AUTHENTICATION_FEATURE` is OFF.

#### Create

```cpp
bool createRecord(const char *sessionId, int socketId,
                  ESP3DAuthenticationLevel level,
                  ESP3DClientType client_type);
```

Returns `false` if `sessionId` is null, empty, or longer than 24 chars.
Acquires `_sessions_mutex`, then:

1. Calls `purgeExpiredSessions_nolock()` to shrink the list before insertion.
2. If `_sessions.size() >= MAX_SESSION_RECORDS` (10), evicts the record with
   the smallest `last_time` across all client types.
3. Pushes the new record to the back of `_sessions`.

#### Read

```cpp
ESP3DAuthenticationRecord *getRecord(const char *sessionId);
ESP3DAuthenticationRecord *getRecord(int socketId,
                                     ESP3DClientType client_type);
```

Both return a raw pointer into the list, or `NULL` on miss. The pointer is
valid only while no concurrent `clearSession()` or `clearAllSessions()` runs.
Use it immediately within the same request handler scope.
`getRecord(-1, client_type)` matches any socket when `socketId == -1`.

#### Update

```cpp
bool updateRecord(int socketId, ESP3DClientType client_type,
                  ESP3DAuthenticationLevel newlevel);
```

Updates the `level` field of the first matching record. Returns `false` if no
match is found.

#### Clear — single session

```cpp
bool clearSession(const char *sessionId);
bool clearSession(int socketId, ESP3DClientType client_type);
```

`clearSession(sessionId)` requires exactly a 24-character string; returns
`false` otherwise. `clearSession(socketId, client_type)` removes **all**
records matching the pair and returns `true` if at least one was removed.

#### Clear — bulk

```cpp
void clearSessions(ESP3DClientType client_type);
void clearAllSessions();
```

`clearSessions(type)` is called by each service from its own `end()` to purge
its bucket. `clearAllSessions()` is called by `ESP3DNetworkServices::end()`.

#### Count

```cpp
uint8_t activeSessionsCount(ESP3DClientType type);
```

Returns the number of records for the given client type. Does not distinguish
expired-but-not-yet-purged records from active ones.

### Session expiry and eviction

Two independent policies bound the session list:

| Policy | Trigger | Rule |
|---|---|---|
| **Time-based expiry** | Periodic via `handle()` → `purgeExpiredSessions()` | Remove every record where `millis() − last_time ≥ getSessionTimeout()`. Disabled when `_session_timeout == 0`. |
| **Capacity eviction** | On `createRecord()` when `size >= 10` | Evict the record with the smallest `last_time` regardless of client type. |

The timeout getter converts stored minutes to milliseconds:

```cpp
uint64_t getSessionTimeout() { return 60 * 1000 * _session_timeout; }
```

A `_session_timeout` of `0` disables expiry entirely — `purgeExpiredSessions_nolock()`
returns early in this case.

### Thread safety

`_sessions_mutex` (a POSIX `pthread_mutex_t`) serializes every read and write
on `_sessions`.

- Acquire, operate, release — no external service is called while the mutex is
  held. `esp3d_log` calls inside the lock are acceptable.
- `purgeExpiredSessions_nolock()` is the non-locking variant, called only from
  within `createRecord()` which already holds the mutex.
- `getRecord()` returns a raw pointer after releasing the mutex. This is a
  known accepted TOCTOU residual: callers use the pointer immediately within
  the same request handler, where no concurrent clear is expected.

---

## NVS settings

Active only when `ESP3D_AUTHENTICATION_FEATURE` is ON.
Defined in `main/core/includes/esp3d_settings_defs.inc`:

| Setting index | Type | Default | Description |
|---|---|---|---|
| `esp3d_admin_password` | string | `"admin"` | Admin-level password |
| `esp3d_user_password` | string | `"user"` | User-level password |
| `esp3d_session_timeout` | uint8 | `0` | Session timeout in minutes; `0` = never expire |

**ESP commands that read/write these settings:**

| Command | Setting touched |
|---|---|
| `ESP550` | Admin password (read/write) |
| `ESP555` | User password (read/write) |
| `ESP510` | Session timeout (read/write) |
| `ESP400` / `ESP401` | Bulk settings dump / write (includes all three) |

`begin()` must be called after any password or timeout change to reload the
in-memory values from NVS. Today a full network restart
(`ESP3DNetworkServices::end()` + `begin()`) is the only code path that
triggers this.

---

## Integration points

### HTTP service (`ESP3DHttpService`)

- Creates sessions via `createRecord()` on successful login; session ID is
  sent as the `ESP3D_SESSIONID` cookie.
- Looks up sessions via `getRecord(sessionId)` on every authenticated request.
- Calls `clearSession(sessionId)` on explicit logout.
- Calls `clearSessions(ESP3DClientType::webui)` from its own `end()`.

HTTP sessions are cookie-based and outlive the underlying TCP socket, which is
why the bulk clear in `ESP3DHttpService::end()` is necessary in addition to
any per-socket teardown.

### WebSocket service (`ESP3DWsService`)

Two instances share `ESP3DWsService`, distinguished by `authClientType()`:
`webui_websocket` for `/ws`, `websocket_server` for `/wsdata`.
`pushMsgToRxQueue()` calls `createRecord()` and tags the resulting message's
`origin` with the same `ESP3DClientType`, ensuring command replies are routed
back to the correct endpoint rather than the wrong broadcast pool. Each
instance calls `clearSessions(authClientType())` from its own `end()`.

See [authentication_lifecycle.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/authentication_lifecycle.md) §"Client types
sharing the session list" and [websockets_protocol.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/websockets_protocol.md)
for the full routing story.

### Socket server / Telnet (`ESP3DSocketServer`)

- Creates sessions via `createRecord()` on connection (`ESP3DClientType::socket_server`).
- Looks up sessions via `getRecord(socketId, socket_server)`.
- Calls `clearSession(socketId, socket_server)` on disconnect.
- Calls `clearSessions(ESP3DClientType::socket_server)` from its own `end()`.

### Settings UI

`onNetworkAuthClick` in
`main/display/cnc/screens/settings_list_screen.cpp` launches the PIN input
screen for changing the admin password. After saving, the value is written to
NVS via `ESP550`; a full network restart applies it.

---

## Related documentation

- [authentication_lifecycle.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/authentication_lifecycle.md) — service
  orchestration, `begin()`/`end()` sequencing, per-service defensive purge,
  and the client-type routing fix.
- [websockets_protocol.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/websockets_protocol.md) — WebSocket endpoint
  routing and how `authClientType()` connects auth to message dispatch.
- [ws_client_and_auth_roadmap.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/roadmap/ws_client_and_auth_roadmap.md) — planned
  auth improvements for the WebSocket client path.
- [connection_management.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/connection_management.md) — broader network
  service lifecycle that drives `ESP3DNetworkServices::begin()`/`end()`.
- [esp32_memory_constraints.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/esp32_memory_constraints.md) — heap budget
  and fragmentation guidance relevant to session list sizing.
