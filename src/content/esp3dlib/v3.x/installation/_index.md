+++
archetype = "section"
title = "Installation"
menuPre = "<i class='fas fa-hammer'></i> "
weight = 2
+++

In Marlin configuration files :
### Configuration.h

Select an ESP32 based board.

Uncomment the second serial port to allow esp3d to get all printer feedback
```cpp
/**
 * Select a secondary serial port on the board to use for communication with the host.
 * :[-1, 0, 1, 2, 3, 4, 5, 6, 7]
 */
#define SERIAL_PORT_2 -1
```
### Configuration_adv.h

Enable ESP3DLib support using :
`#define ESP3D_WIFISUPPORT   // ESP3D Library WiFi management (https://github.com/luc-github/ESP3DLib)`

You can optionnaly define to which access point your board need to connect to:

  `#define WIFI_SSID "Wifi SSID"`   
  `#define WIFI_PWD  "Wifi Password"`   
if not defined or you left like this the board will act as an Access Point instead. and you can do further configuration using command line or web interface.


Please be sure these setting are enabled they are mandatory for ESP3DLib
```cpp
#define WEBSUPPORT          // Start a webserver (which may include auto-discovery)
#define WIFI_CUSTOM_COMMAND // Accept feature config commands (e.g., WiFi ESP3D) from the host|
#define CUSTOM_SD_ACCESS    // Enable another lib accessing the SD card without conflicts
```
Web Update is supported by ESP3DLib but you can also use:
```cpp
#define OTASUPPORT          // Support over-the-air firmware updates
```

To enable the authentication feature which is disabled by default:
```cpp
//AUTHENTICATION_FEATURE: protect pages by login password.
#define AUTHENTICATION_FEATURE
```
to disable any of these features which are enabled by default:

```cpp
//MDNS_FEATURE: this feature allow  type the name defined
//in web browser by default: http:\\marlinesp.local and connect
#define DISABLE_MDNS_FEATURE

//SSDD_FEATURE: this feature is a discovery protocol, supported on Windows out of the box
//Rely on Configuration_adv.h
#define DISABLE_SSDP_FEATURE

//CAPTIVE_PORTAL_FEATURE: In SoftAP redirect all unknow call to main page
#define DISABLE_CAPTIVE_PORTAL_FEATURE
```