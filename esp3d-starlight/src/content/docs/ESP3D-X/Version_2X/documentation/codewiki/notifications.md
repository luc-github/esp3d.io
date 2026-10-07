---
title: "Notifications Module"
---

# Notifications Module

The notifications module provides a **pluggable, single-channel push-notification system** for the ESP3D-X pendant firmware. When a notable event occurs — device boot, a manual command, or a gcode stream error — the module dispatches a short title + message to one externally configured service: Pushover, Email (SMTP/TLS), Telegram, IFTTT, WhatsApp, or Home Assistant.

Only one provider is active at a time. The active provider is selected at boot from NVS settings, instantiated by the `ESP3DNotificationsService` singleton, and remains live until `end()` is called or settings are reconfigured via `[ESP610]`.

Feature guard: `ESP3D_NOTIFICATIONS_FEATURE`.

---

## Architecture Overview

```mermaid
graph TD
    SVC["ESP3DNotificationsService\n(singleton)\nesp3dNotificationsService"]
    IFACE["INotificationProvider\n(abstract interface)"]
    HTTP_BASE["HttpNotificationProvider\n(shared HTTP/HTTPS base)"]
    PUSHOVER["PushoverProvider\nHTTPS POST"]
    TELEGRAM["TelegramProvider\nHTTPS POST"]
    IFTTT["IFTTTProvider\nHTTPS POST"]
    WHATSAPP["WhatsAppProvider\nHTTPS GET via CallMeBot"]
    HA["HomeAssistantProvider\nHTTP POST (local LAN)"]
    EMAIL["EmailNotificationProvider\nSMTP via mbedTLS\n(no HTTP base)"]
    HTTP_CLIENT["esp_http_client\n(ESP-IDF)"]
    MBED["mbedTLS\n(ESP-IDF)"]
    SETTINGS["ESP3DSettings\n(NVS)"]

    SVC -->|"owns unique_ptr"| IFACE
    IFACE --> HTTP_BASE
    IFACE --> EMAIL
    HTTP_BASE --> PUSHOVER
    HTTP_BASE --> TELEGRAM
    HTTP_BASE --> IFTTT
    HTTP_BASE --> WHATSAPP
    HTTP_BASE --> HA
    HTTP_BASE -->|"sendHttpPost/Get"| HTTP_CLIENT
    EMAIL -->|"TLS handshake\nSMTP commands"| MBED
    SVC -->|"reads type + tokens"| SETTINGS
```

---

## Component Hierarchy

```mermaid
classDiagram
    class INotificationProvider {
        <<abstract interface>>
        +send(title, message) bool
        +typeName() const char*
        +getLastError() ESP3DNotificationError
    }

    class HttpNotificationProvider {
        #_lastError ESP3DNotificationError
        #sendHttpPost(url, data, host, ssl, ct, auth) bool
        #sendHttpGet(url, host, ssl, auth) bool
        #mapStatusCode(code) ESP3DNotificationError
        +getLastError() ESP3DNotificationError
    }

    class PushoverProvider {
        -_token1 string
        -_token2 string
        +send(title, message) bool
        +typeName() "pushover"
    }

    class TelegramProvider {
        -_token1 string
        -_token2 string
        +send(title, message) bool
        +typeName() "telegram"
        #mapStatusCode(code) ESP3DNotificationError
    }

    class IFTTTProvider {
        -_token1 string
        -_token2 string
        +send(title, message) bool
        +typeName() "IFTTT"
    }

    class WhatsAppProvider {
        -_token1 string
        -_token2 string
        +send(title, message) bool
        +typeName() "WhatsApp"
    }

    class HomeAssistantProvider {
        -_token1 string
        -_server string
        -_port string
        +send(title, message) bool
        +typeName() "HomeAssistant"
    }

    class EmailNotificationProvider {
        -_token1 string
        -_token2 string
        -_email string
        -_server string
        -_port string
        -_method string
        -_lastError ESP3DNotificationError
        +send(title, message) bool
        +typeName() "email"
        +getLastError() ESP3DNotificationError
        -performTlsHandshake(ssl) int
        -writeSslAndGetResponse(ssl, buf, len) int
        -writeTlsAndGetResponse(sock, buf, len) int
    }

    class ESP3DNotificationsService {
        -_started bool
        -_autonotification bool
        -_notificationType ESP3DNotificationType
        -_lastError ESP3DNotificationError
        -_provider unique_ptr~INotificationProvider~
        +begin(sendAutoNotificationMsg) bool
        +end()
        +sendMSG(title, message) bool
        +sendAutoNotification(msg) bool
        +getTypeString() const char*
        +getType() ESP3DNotificationType
        +started() bool
        +isAutonotification() bool
        +setAutonotification(value)
        +getLastError() ESP3DNotificationError
    }

    INotificationProvider <|-- HttpNotificationProvider
    INotificationProvider <|-- EmailNotificationProvider
    HttpNotificationProvider <|-- PushoverProvider
    HttpNotificationProvider <|-- TelegramProvider
    HttpNotificationProvider <|-- IFTTTProvider
    HttpNotificationProvider <|-- WhatsAppProvider
    HttpNotificationProvider <|-- HomeAssistantProvider
    ESP3DNotificationsService --> INotificationProvider : owns (unique_ptr)
```

---

## Provider Types

| Enum value | `ESP3DNotificationType` | Transport | token1 | token2 | token_setting (`TS`) |
|---|---|---|---|---|---|
| 0 | `none` | — | — | — | — |
| 1 | `pushover` | HTTPS POST `api.pushover.net` | user key | app token | *(unused)* |
| 2 | `email` | SMTP SSL (465) / STARTTLS (587) | SMTP username | SMTP password | `email#server:port[:method]` |
| ~~3~~ | ~~`line`~~ | *(removed — gap preserved)* | — | — | — |
| 4 | `telegram` | HTTPS POST `api.telegram.org` | bot token | chat id | *(unused)* |
| 5 | `ifttt` | HTTPS POST `maker.ifttt.com` | event name | webhook key | *(unused)* |
| 6 | `whatsapp` | HTTPS GET `api.callmebot.com` | phone number | API key | *(unused)* |
| 7 | `homeassistant` | HTTP POST (plain, local LAN) | HA long-lived token | *(unused)* | `server:port` |

> ⚠️ Enum value `3` was removed (LINE provider). The gap is intentional — persisted NVS values from older firmware may still contain `3`. Do not reuse this value.

---

## NVS Settings

| Setting index | Size | Content |
|---|---|---|
| `esp3d_notification_type` | byte | `ESP3DNotificationType` cast |
| `esp3d_notification_token_1` | 64 B (`SIZE_OF_SETTING_NOFIFICATION_T1`) | Primary credential (username, user key, bot token, phone …) |
| `esp3d_notification_token_2` | 64 B (`SIZE_OF_SETTING_NOFIFICATION_T2`) | Secondary credential (password, app token, chat id, API key …) |
| `esp3d_notification_token_setting` | 128 B (`SIZE_OF_SETTING_NOFIFICATION_TS`) | Provider-specific extra config (see table above) |
| `esp3d_auto_notification` | byte (bool) | Send "online" message automatically at network boot |

`T1` and `T2` are **protected keys** — they are scrambled in `.ok` config exports and never echoed back by `[ESP610]` GET queries.

### Token Setting Parsing

```mermaid
flowchart LR
    subgraph Email ["Email TS: email#server:port[:method]"]
        E1["email"] --> EH["#"] --> E2["server"] --> EC[":"] --> E3["port"] --> EC2["[:method]"]
    end
    subgraph HA ["HomeAssistant TS: server:port"]
        H1["server"] --> HC[":"] --> H2["port"]
    end
    subgraph Others ["All other providers"]
        O1["TS field ignored"]
    end
```

---

## Data Flow — sendMSG()

```mermaid
flowchart TD
    CALLER["Caller\n(ESP600 cmd / gcode host / auto-notification)"]
    EXPAND["esp3d_string::expandString()\nexpand %ESP_NAME% %ESP_IP% …"]
    EMPTY{"message\nempty?"}
    ERR_EMPTY["_lastError = empty_message\nreturn false"]
    WEBUI["esp3dWsWebUiService\n.pushNotification()\nguard: ESP3D_HTTP_FEATURE"]
    STATUSBAR["esp3dXValues\n.set_value(status_bar_label)\nguard: ESP3D_HAS_STATUS_BAR"]
    HASPROVIDER{"provider\nconfigured\n& started?"}
    PROVIDER["_provider->send(title, message)"]
    DONE_TRUE["return true"]
    DONE_RESULT["return send() result"]

    CALLER --> EXPAND
    EXPAND --> EMPTY
    EMPTY -->|yes| ERR_EMPTY
    EMPTY -->|no| WEBUI
    WEBUI --> STATUSBAR
    STATUSBAR --> HASPROVIDER
    HASPROVIDER -->|no| DONE_TRUE
    HASPROVIDER -->|yes| PROVIDER
    PROVIDER --> DONE_RESULT
```

> **Key invariant:** The local UI echo (WebUI push + status bar) always fires regardless of provider state or send result. Even `type=none` will echo locally.

---

## Service Lifecycle — begin()

```mermaid
flowchart TD
    START["begin(sendAutoNotificationMsg)"]
    RESET["end()\nreset _provider\n_started = false"]
    READ_TYPE["Read esp3d_notification_type\nfrom NVS"]
    IS_NONE{"type == none?"}
    STARTED_TRUE["_started = true\nreturn true"]
    READ_TOKENS["Read T1, T2, TS\nfrom NVS (fixed-size buffers)"]
    SELECT{"Switch on\nprovider type"}
    PARSE_EMAIL["parseEmailSettings(TS)\nemail#server:port[:method]"]
    PARSE_HA["parseServerPort(TS)\nserver:port"]
    MAKE_EMAIL["make_unique EmailNotificationProvider\n(T1, T2, email, server, port, method)"]
    MAKE_PUSHOVER["make_unique PushoverProvider(T1, T2)"]
    MAKE_TELEGRAM["make_unique TelegramProvider(T1, T2)"]
    MAKE_IFTTT["make_unique IFTTTProvider(T1, T2)"]
    MAKE_WHATSAPP["make_unique WhatsAppProvider(T1, T2)"]
    MAKE_HA["make_unique HomeAssistantProvider\n(T1, server, port)"]
    PARSE_FAIL["end()\nreturn false"]
    READ_AUTO["Read esp3d_auto_notification\n_autonotification = value"]
    SET_STARTED["_started = true"]
    SEND_AUTO{"sendAutoNotificationMsg\n&& _autonotification?"}
    AUTO_MSG["sendAutoNotification\n(ESP3D_NOTIFICATION_ONLINE)"]
    RETURN_TRUE["return true"]

    START --> RESET --> READ_TYPE --> IS_NONE
    IS_NONE -->|yes| STARTED_TRUE
    IS_NONE -->|no| READ_TOKENS --> SELECT
    SELECT -->|pushover| MAKE_PUSHOVER
    SELECT -->|telegram| MAKE_TELEGRAM
    SELECT -->|ifttt| MAKE_IFTTT
    SELECT -->|whatsapp| MAKE_WHATSAPP
    SELECT -->|email| PARSE_EMAIL
    SELECT -->|homeassistant| PARSE_HA
    SELECT -->|other| PARSE_FAIL
    PARSE_EMAIL -->|ok| MAKE_EMAIL
    PARSE_EMAIL -->|fail| PARSE_FAIL
    PARSE_HA -->|ok| MAKE_HA
    PARSE_HA -->|fail| PARSE_FAIL
    MAKE_EMAIL & MAKE_PUSHOVER & MAKE_TELEGRAM & MAKE_IFTTT & MAKE_WHATSAPP & MAKE_HA --> READ_AUTO
    READ_AUTO --> SET_STARTED --> SEND_AUTO
    SEND_AUTO -->|yes| AUTO_MSG --> RETURN_TRUE
    SEND_AUTO -->|no| RETURN_TRUE
```

---

## Email SMTP Sequence (mbedTLS)

Unlike HTTP-based providers, `EmailNotificationProvider` implements a full SMTP conversation over mbedTLS directly, bypassing `esp_http_client`.

```mermaid
sequenceDiagram
    participant APP as EmailNotificationProvider
    participant MBEDTLS as mbedTLS (net + ssl)
    participant SMTP as SMTP Server

    APP->>MBEDTLS: mbedtls_net_connect(server, port)

    alt method == 'SSL' (implicit TLS, e.g. port 465)
        APP->>MBEDTLS: performTlsHandshake()
        MBEDTLS-->>SMTP: TLS ClientHello
        SMTP-->>MBEDTLS: TLS ServerHello + Certificate
        MBEDTLS-->>APP: handshake OK
        APP->>SMTP: EHLO [hostname]
        SMTP-->>APP: 250 capabilities
    else method == 'TLS' (STARTTLS, e.g. port 587)
        APP->>SMTP: EHLO [hostname]
        SMTP-->>APP: 250 capabilities
        APP->>SMTP: STARTTLS
        SMTP-->>APP: 220 Ready
        APP->>MBEDTLS: performTlsHandshake()
        MBEDTLS-->>SMTP: TLS ClientHello
        SMTP-->>MBEDTLS: TLS ServerHello + Certificate
        MBEDTLS-->>APP: handshake OK
        APP->>SMTP: EHLO [hostname]
        SMTP-->>APP: 250 capabilities
    end

    APP->>SMTP: AUTH LOGIN
    SMTP-->>APP: 334 (username prompt)
    APP->>SMTP: base64(username)
    SMTP-->>APP: 334 (password prompt)
    APP->>SMTP: base64(password)
    SMTP-->>APP: 235 Authentication successful

    APP->>SMTP: MAIL FROM:<email>
    SMTP-->>APP: 250 OK
    APP->>SMTP: RCPT TO:<email>
    SMTP-->>APP: 250 OK
    APP->>SMTP: DATA
    SMTP-->>APP: 354 Start input
    APP->>SMTP: Subject: [title]\r\n\r\n[message]\r\n.
    SMTP-->>APP: 250 OK
    APP->>SMTP: QUIT
    SMTP-->>APP: 221 Bye
```

> **Buffer constraints:** Fixed 512 B (`BUF_SIZE`) for all SMTP I/O, 128 B for base64 encoding. No VLAs. `calloc()` failures are checked and logged. Connection timeout: 5000 ms.

---

## HTTP Provider Sequence (shared base)

All providers except Email share this path through `HttpNotificationProvider`.

```mermaid
sequenceDiagram
    participant PROV as ConcreteProvider
    participant BASE as HttpNotificationProvider
    participant HTTPC as esp_http_client
    participant SRV as Remote Service

    PROV->>BASE: sendHttpPost(url, data, host, ssl, ct, auth)
    BASE->>HTTPC: esp_http_client_init(config)\ncrt_bundle_attach (when ssl=true)
    BASE->>HTTPC: set_header(Host, Content-Type, User-Agent …)
    BASE->>HTTPC: set_post_field(data)
    BASE->>HTTPC: esp_http_client_perform()
    HTTPC-->>SRV: HTTPS/HTTP POST
    SRV-->>HTTPC: HTTP response
    HTTPC-->>BASE: status code
    alt status == 200
        BASE-->>PROV: _lastError = no_error, return true
    else status != 200
        BASE->>PROV: mapStatusCode(code) → error enum
        BASE-->>PROV: _lastError set, return false
    end
    BASE->>HTTPC: esp_http_client_cleanup()
```

> `TelegramProvider` overrides `mapStatusCode()`: HTTP 401 → `invalid_token1`, 400 → `invalid_token2`, 404 → `invalid_url`. All other providers use the default mapping (non-200 → `invalid_data`).

---

## Integration Points

```mermaid
graph LR
    subgraph Network_Boot ["Network Boot\nesp3d_network_services.cpp:143"]
        NET["esp3dNetworkServices.begin()"]
    end
    subgraph Commands ["ESP-Commands"]
        ESP600["ESP600\nSend notification now\nauth: user"]
        ESP610["ESP610\nGet/Set notification config\nset auth: admin"]
        ESP420["ESP420\nFirmware info report"]
        ESP401["ESP401\nSettings write → restart svc"]
    end
    subgraph GcodeHost ["Gcode Host\nesp3d_gcode_host_service.cpp:2096"]
        GH["Stream error handler"]
    end
    SVC["esp3dNotificationsService"]
    subgraph SideChannels ["Side-channel outputs (always fire)"]
        WS["WebUI WebSocket\npushNotification()\nESP3D_HTTP_FEATURE"]
        SB["Status bar label\nstatus_bar_label\nESP3D_HAS_STATUS_BAR"]
    end
    PROV["Active INotificationProvider\n(if configured)"]

    NET -->|"begin(sendAutoMsg=true)"| SVC
    ESP600 -->|"sendMSG()"| SVC
    ESP610 -->|"begin() / end()"| SVC
    ESP420 -->|"getType() / started()"| SVC
    ESP401 -->|"begin()"| SVC
    GH -->|"sendMSG()"| SVC
    SVC --> WS
    SVC --> SB
    SVC -->|"if provider set"| PROV
```

---

## Error Model

```mermaid
graph TD
    E0["no_error - Operation succeeded"]
    E1["empty_message - sendMSG called with empty string"]
    E2["invalid_message - Provider-level message validation failed"]
    E3["invalid_data - HTTP non-200 (default mapping)"]
    E4["invalid_url - URL build failed or HTTP 404"]
    E5["invalid_token1 - HTTP 401 (Telegram) or bad primary credential"]
    E6["invalid_token2 - HTTP 400 (Telegram) or bad secondary credential"]
    E7["error - Network or TLS failure"]
```

`ESP3DNotificationsService::getLastError()` delegates to `_provider->getLastError()` when a provider is active; it falls back to its own `_lastError` (e.g. `empty_message`) when no provider exists. `[ESP600]` reports the numeric error value on send failure.

---

## Customization

Auto-notification message templates are defined per-board in `customizations/notifications/customizations.h` (overridable per board under `boards/<board>/customizations/notifications/`):

```c
// Default (customizations/notifications/customizations.h)
#define ESP3D_NOTIFICATION_TITLE  "Hi from ESP3D"
#define ESP3D_NOTIFICATION_ONLINE "Hi, %ESP_NAME% is now online at %ESP_IP%"

// PiBot board override (boards/pibot_pendant_v1_0/customizations/notifications/)
#define ESP3D_NOTIFICATION_TITLE  "PiBot CNC Pendant"
#define ESP3D_NOTIFICATION_ONLINE "Hi, %ESP_NAME% is now online at %ESP_IP%"
```

The `%ESP_NAME%` and `%ESP_IP%` placeholders (and any others supported by `esp3d_string::expandString()`) are expanded in both title and message before every send.

---

## Commands Reference

| Command | Direction | Auth level | Description |
|---|---|---|---|
| `[ESP600]<message>` | Write | user | Send a notification immediately using the active provider |
| `[ESP610]` | Read | — | Return current `type`, `AUTO`, `TS` (never returns T1/T2) |
| `[ESP610] type=… T1=… T2=… TS=… AUTO=…` | Write | admin | Update notification settings and restart the service live (no reboot) |
| `[ESP420]` | Read | — | Firmware info report — includes active notification type string |

---

## Key Files

| File | Role |
|---|---|
| `main/modules/notifications/esp3d_notifications_service.h/.cpp` | Singleton orchestrator — settings parsing, provider lifecycle, `sendMSG()` |
| `main/modules/notifications/esp3d_notification_provider.h` | `INotificationProvider` abstract interface + `ESP3DNotificationError` enum |
| `main/modules/notifications/esp3d_http_notification_provider.h/.cpp` | Shared HTTP/HTTPS POST+GET base (`esp_http_client`) for all HTTP providers |
| `main/modules/notifications/esp3d_email_notification.h/.cpp` | Email: raw mbedTLS SMTP client (SSL implicit + STARTTLS) |
| `main/modules/notifications/esp3d_pushover_notification.h/.cpp` | Pushover HTTPS POST |
| `main/modules/notifications/esp3d_telegram_notification.h/.cpp` | Telegram HTTPS POST + custom `mapStatusCode()` |
| `main/modules/notifications/esp3d_ifttt_notification.h/.cpp` | IFTTT webhooks HTTPS POST |
| `main/modules/notifications/esp3d_whatsapp_notification.h/.cpp` | WhatsApp via CallMeBot HTTPS GET |
| `main/modules/notifications/esp3d_homeassistant_notification.h/.cpp` | Home Assistant local HTTP POST |
| `main/core/commands/esp600.cpp` | `[ESP600]` — send notification now |
| `main/core/commands/esp610.cpp` | `[ESP610]` — get/set config, restart service without reboot |
| `main/modules/network/esp3d_network_services.cpp:143` | Auto-notification trigger on network ready |
| `main/modules/gcode_host/esp3d_gcode_host_service.cpp:2096` | Auto-notification trigger on stream error |
| `customizations/notifications/customizations.h` | Title + online message templates |

---

## Related Documentation

- [authentication.md](authentication.md) — authentication levels required by ESP600 (user) and ESP610 SET (admin)
- [network.md](network.md) — network lifecycle that triggers the "online" auto-notification via `esp3dNetworkServices.begin()`
- [gcode_host.md](gcode_host.md) — gcode streaming layer that triggers error notifications
- [mdns.md](mdns.md) — `notification` TXT record advertising the active provider type on `_device-info._tcp`
- [websocket_server.md](websocket_server.md) — WebUI WebSocket service that receives the side-channel `pushNotification()` call
- [values.md](values.md) — `ESP3DValues` observable that receives the `status_bar_label` update on every `sendMSG()`


## Documents de conception (depot)

- [notifications_system.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/architecture/notifications_system.md)
