---
archetype : "section"
title : "Authentication"
description : "What is authentication in ESP3D-TFT?"
menuPre : "<i class='fas fa-lock'></i> "
weight : 2
---

## Definition
The authentication is an additional security layer to protect the ESP3D-TFT web interface and ESP3D-TFT commands from unauthorized access. It is based on a username and a password. The authentication is optional and can be enabled/disabled in the ESP3D-TFT configuration. There are 3 login levels for authentication:
- guest, which is does not need any authentication
- user, which has limited access to ESP3D-TFT features
- admin, which has full access to ESP3D-TFT features

Currently the login cannot be customized and so is limited to `user` and `admin` levels. The `guest` level is always available and cannot be disabled.

## Configuration

In configuration.h just uncomment the following line to enable the authentication:
```c++
#define AUTHENTICATION_FEATURE
```
Default password authentication for `admin` is `admin` and for 'user' is `user`. You can change them using WebInterface or [ESP550] and [ESP555] commands.

## Usage

### Web Interface

When user authentication is enabled, the web interface will ask for a username and a password. If the authentication is successful, the user will be redirected to the web interface. If the authentication fails, the user will be redirected to the login page.

The web interface allows also inline authentication. This means that you can pass the username and password in the URL. This is useful if you want to use some command line to access the web interface like curl or wget. The URL format is the following:

```html
http://user:password@<ip_address>
```

On the web interface an authenticated session will stay open until the browser is closed. So if you close the browser and reopen it, you will be asked for authentication again. This session can also have a timeout. The default timeout is 3 minutes of inactivity. This timeout can be changed in the ESP3D-TFT configuration web interface or using `[ESP510]` command.

### ESPXXX Command

When user authentication is enabled, the ESPXXX commands will ask for a password. If the authentication is successful, the command will be executed. If the authentication fails, the command will be rejected.

The session for ESPXXX commands is a sticky session. This means that once authenticated, the session will stay authenticated until the ESP3D-TFT is restarted or session is closed (e.g: Telnet / WebSocket).
## Limitations

The current authentication miss a lot of features, like:
- user management
- https support
- password encryption
- password recovery   
- password expiration in time
- password lockout if too many failed attempts

So you must not consider authentication as fullproof for security. It is just an additional layer of security.

Because ESPXXX commands only rely on password, do not use same password for user and admin users. If you do so, you will not be able to use ESPXXX commands with user level, everything will be considered as admin when authenticated.

The password are never been displayed in clear text, but they are stored in the ESP3D-TFT configuration in clear text. So if you want to change the password, you must use the WebInterface or ESPXXX commands.
In web interface the passwords are replaced by `*******` so any modification must be complete not partial.

All passwords and sensitive informations are sent using plain text. So if you want to use ESP3D-TFT in a public network or outside of your local network (which is not recommended), you must use a VPN.

## Scope

Here the scope of right for each authentication level:

|Feature | not authenticated | guest  | user | admin |
|-|:-------------------:|:--------:|:------:|:-------:|
| Web Interface | No | No | Yes | Yes |
| Telnet | No | No | Yes | Yes |
| WebSocket | No | No | Yes | Yes |
| WebDav | No | No | Yes | Yes |
| Bluetooth | No | No | No | No |
| Upload | No | No | Yes | Yes |
| Update | No | No | No | Yes |
| [[ESP0]](../commands/#commands) | Yes | Yes | Yes | Yes |
| [[ESP100]](../commands/esp100/) | No | No | Get | Get/Set |
| [[ESP101]](../commands/esp101/) | No | No | No | Set |
| [[ESP102]](../commands/esp102/) | No | No | Get | Get/Set |
| [[ESP103]](../commands/esp103/) | No | No | Get | Get/Set |
| [[ESP104]](../commands/esp104/) | No | No | Get | Get/Set |
| [[ESP105]](../commands/esp105/) | No | No | Get | Get/Set |
| [[ESP106]](../commands/esp106/) | No | No | No | Set |
| [[ESP107]](../commands/esp107/) | No | No | Get | Get/Set |
| [[ESP108]](../commands/esp108/) | No | No | Get | Get/Set |
| [[ESP110]](../commands/esp110/) | No | No | Get | Get/Set |
| [[ESP111]](../commands/esp111/) | No | No | Get | Get |
| [[ESP112]](../commands/esp112/) | No | No | Get | Get/Set |
| [[ESP114]](../commands/esp114/) | No | No | Get | Get/Set |
| [[ESP115]](../commands/esp1115/) | No | No | Get | Get/Set |
| [[ESP120]](../commands/esp120/) | No | No | Get | Get/Set |
| [[ESP121]](../commands/esp121/) | No | No | Get | Get/Set |
| [[ESP130]](../commands/esp130/) | No | No | Get | Get/Set |
| [[ESP131]](../commands/esp131/) | No | No | Get | Get/Set |
| [[ESP140]](../commands/esp140/) | No | No | Get | Get/Set |
| [[ESP160]](../commands/esp150/) | No | No | Get | Get/Set |
| [[ESP170]](../commands/esp170/) | No | No | Get/Set | Get/Set |
| [[ESP171]](../commands/esp171/) | No | No | Get | Get|
| [[ESP200]](../commands/esp200/) | No | No | Get/Set | Get/Set |
| [[ESP202]](../commands/esp202/) | No | No | Get | Get/Set |
| [[ESP214]](../commands/esp214/) | No | No | Set | Set |
| [[ESP216]](../commands/esp216/) | No | No | Get | Get |
| [[ESP400]](../commands/esp400/) | No | No | Get | Get |
| [[ESP401]](../commands/esp401/) | No | No | No | Set |
| [[ESP402]](../commands/esp402/) | No | No | Get | Get/Set |
| [[ESP410]](../commands/esp410/) | No | No | Get | Get |
| [[ESP420]](../commands/esp420/) | No | No | Get | Get |
| [[ESP444]](../commands/esp444/) | No | No |  Set(only RESTART) | Set |
| [[ESP450]](../commands/esp450/) | No | No | Get | Get |
| [[ESP460]](../commands/esp460/) | No | No | Get | Get/Set |
| [[ESP500]](../commands/esp500/) | Get/Set | Get/Set | Get/Set | Get/Set |
| [[ESP510]](../commands/esp510/) | No | No | Get | Get/Set |
| [[ESP550]](../commands/esp550/) | No | No | No | Get/Set |
| [[ESP555]](../commands/esp555/) | No | No | Get/Set | Get/Set |
| [[ESP600]](../commands/esp600/) | No | No | Set | Set |
| [[ESP610]](../commands/esp610/) | No | No | Get | Get/Set |
| [[ESP700]](../commands/esp700/) | No | No | Set | Set |
| [[ESP701]](../commands/esp701/) | No | No | Get/Set | Get/Set |
| [[ESP702]](../commands/esp701/) | No | No | Get | Get/Set |
| [[ESP710]](../commands/esp710/) | No | No | No | Set |
| [[ESP720]](../commands/esp720/) | No | No | Get | Get |
| [[ESP730]](../commands/esp730/) | No | No | Get/Set | Get/Set |
| [[ESP740]](../commands/esp740/) | No | No | Get | Get |
| [[ESP750]](../commands/esp750/) | No | No | Get/Set | Get/Set |
| [[ESP780]](../commands/esp780/) | No | No | Get | Get |
| [[ESP790]](../commands/esp790/) | No | No | Get/Set | Get/Set |
| [[ESP800]](../commands/esp800/) | No | No | Get/Set | Get/Set |
| [[ESP900]](../commands/esp900/) | No | No | Get/Set | Get/Set |
| [[ESP901]](../commands/esp901/) | No | No | Get | Get/Set |
| [[ESP902]](../commands/esp902/) | No | No | Get | Get/Set |
| [[ESP950]](../commands/esp950/) | No | No | 
 | Get/Set |

## API Description

### Global
Each authenticated session have unique session id, that will be stored on ESP3D-TFT with additionnal informations:
- session id (25 characters)
- session level (Guest / Admin / User)
- client_id (serial / http / telnet / WebSocket)
- session last activity (timestamp)
- client IP (http)
- Client socket ID (telnet / WebSocket)

### Http
When authentication is enabled, the http server will check if the session is authenticated. If not, it will ask for authentication. If the session is authenticated, it will check if the session is still valid. If not, it will ask for authentication again. If the session is still valid, it will process the request.
the Session ID is stored in the cookie `ESP3D_SESSIONID`.
