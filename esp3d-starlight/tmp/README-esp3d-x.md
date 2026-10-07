# Pibot-cnc-pendant-firmware
PiBot CNC Pendant Firmware is based on espressif IDF framework 5.4.1 and lvgl 9.2.2.

# Status : pre- alpha, work in progress
# License : GPL-3.0

Credits:
* The icons used in this project, with and without modifications, come from : https://fontawesome.com/ and  https://feathericons.com/
* The Main UI is inspiired by : https://dribbble.com/shots/5720659-Free-Surface-Studio-Pro-UI-Dial-Kit

## Third-party libraries and components
This project builds upon the following open-source projects:

| | Project | Author / Source | License |
|:---:|---|---|---|
| <img src="docs/images/logos/espressif.png" width="32" height="32" alt="Espressif"> | **Espressif components** — [ESP-IDF](https://github.com/espressif/esp-idf), [mDNS](https://github.com/espressif/esp-protocols/tree/master/components/mdns), [esp_websocket_client](https://github.com/espressif/esp-protocols/tree/master/components/esp_websocket_client), [esp32-camera](https://github.com/espressif/esp32-camera), [esp_jpeg](https://github.com/espressif/esp-iot-solution/tree/master/components/display/tools/esp_jpeg) | Espressif Systems | Apache-2.0 |
| <img src="docs/images/logos/lua.png" width="32" height="32" alt="Lua"> | [Lua 5.4](https://www.lua.org/) | PUC-Rio | MIT |
| <img src="docs/images/logos/lvgl.png" width="32" height="32" alt="LVGL"> | [LVGL](https://github.com/lvgl/lvgl) | LVGL Kft | MIT |
| <img src="docs/images/logos/littlefs.png" width="32" height="32" alt="littlefs"> | [LittleFS for ESP-IDF](https://github.com/joltwallet/esp_littlefs) | joltwallet / Brian Pugh | MIT |


# Features
- ESP32 based   
- TFT display
- Touch screen
- Rotary encoder
- 4 axis control:
    - Jogging
    - Rapid move
    - Incremental move
- 3 physical buttons
- Power on/off   
- Buzzer
- 10K potentiometer for analog input
- MicroSD card interface (for configuration only)
- Lua scripting engine
- Bluetooth (BLE, BTSerial) and Serial communication
- Supported firmwares:
    - grbl
    - grblHAL
    - fluidNC 

## Build system
This repository uses a central launcher `build_all.py` that discovers board-specific build scripts under `boards/<board>/build_scripts/`.

### Available commands
- `python build_all.py --list` : list all available build targets.
- `python build_all.py --validate` : validate that build scripts only use supported CMake options.

### Example usage
- `python build_all.py` : build every discovered variant.
- `python build_all.py 8mb_wifi_fluidnc` : build only the 8MB WiFi FluidNC variant.
- `python build_all.py --clean 4mb_bt_fluidnc` : clean and rebuild the 4MB BT FluidNC variant.
- `python build_all.py --clean-all` : clean all build directories before building every discovered variant.

### Script organization
- `boards/<board>/build_scripts/` contains the board-specific wrapper scripts.
- `validate_build_scripts.py` verifies build option consistency with CMake.

### New board / variant process
- See `docs/board_build_guidelines.md` for step-by-step instructions on adding a new board and creating build variants.

## CMake configuration
The configuration options are defined in `CMakeLists.txt`.
They are separated into two categories:
- `Features` : software and service options that can be enabled or disabled.
- `Capabilities` : hardware capabilities inherent to the board, declared in `boards/<board>/board_config.cmake`.

> Note: when adding a new CMake option, update the option list in `boards/<board>/build_scripts/variants.py` and run `python validate_build_scripts.py` to verify consistency.

### Capabilities (hardware)
| Option | Description |
|---|---|
| `TFT_UI_SERVICE` | enables the TFT display interface on boards that include it |
| `SD_CARD_SERVICE` | enables SD card support on boards that include it |
| `BUZZER_SERVICE` | enables the hardware buzzer |
| `TFT_TOUCH_SERVICE` | enables the touch panel on the TFT display |

### Features
| Option | Description |
|---|---|
| `ESP32_PIBOT_CNC_PENDANT_V1` | selects the PiBot CNC Pendant V1.0 hardware target |
| `MEMORY_4_MB` / `MEMORY_8_MB` | chooses the flash size variant |
| `TARGET_FW_MARLIN` | selects the Marlin firmware target |
| `TARGET_FW_REPETIER` | selects the Repetier firmware target |
| `TARGET_FW_SMOOTHIEWARE` | selects the Smoothieware firmware target |
| `TARGET_FW_GRBL` | selects the GRBL firmware target |
| `TARGET_FW_GRBLHAL` | selects the grblHAL firmware target |
| `TARGET_FW_FLUIDNC` | selects the FluidNC firmware target |
| `SERIAL_SERVICE` | enables serial transport |
| `USB_SERIAL_SERVICE` | enables USB serial transport |
| `WIFI_SERVICE` | enables WiFi network services |
| `BT_SERVICE` | enables Bluetooth services |
| `ESP3D_AUTHENTICATION` | enables client authentication |
| `DISABLE_SERIAL_AUTHENTICATION` | disables authentication for the serial port |
| `MDNS_SERVICE` | enables mDNS service |
| `SSDP_SERVICE` | enables SSDP discovery |
| `TIME_SERVICE` | enables time/NTP service |
| `WEB_SERVICES` | enables HTTP/WebSocket/WebDAV services |
| `SOCKET_SERVER_SERVICE` | enables incoming TCP socket server |
| `SOCKET_CLIENT_SERVICE` | enables outgoing TCP socket client |
| `NOTIFICATIONS_SERVICE` | enables the notification system |
| `WEBUI_SERVER` | enables the WebUI server |
| `WEBDAV_SERVICES` | enables WebDAV services |
| `WS_SERVER_SERVICE` | enables incoming WebSocket server |
| `WS_CLIENT_SERVICE` | enables outgoing WebSocket client |
| `USE_FAT_INSTEAD_OF_LITTLEFS` | uses FAT filesystem instead of LittleFS |
| `UPDATE_SERVICE` | enables OTA / SD card update support |

