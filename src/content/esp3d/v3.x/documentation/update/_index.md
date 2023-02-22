+++
description = "Update feature description"
archetype = "home"
title = "Update support"
menuPre = "<i class='fas fa-download'></i> "
weight = 6
+++

You can update ESP3D using the maintenance page, the web ui and the SD Card and OTA process.

### Maintenance page
You can update/manage flash file system content and update firmware.

This page is automaticaly available if no index.html / index.html.gz is present on flash filesystem.
Another way to access it, is to add the parameter `?forcefallback=yes` to your IP address in browser.  
![image](embedded.png?width=400px)

### Web UI

You need to have webupdate feature enabled.

You can update/manage flash file system content and update firmware.  
![image](webui-update.png?width=400px)

### SD Card  
You need to have sd card enabled and sd update feature enabled in `configuration.h`.

#### Settings
You can update all esp3d settings when board is starting using an ini file named `esp3dcnf.ini` at root of SD card.

```ini
{{% include file="/esp3d/v3.x/documentation/update/esp3dcnf.ini" %}}
```

Once update is done all passwords set in file will be replaced by `********`.

{{% attachments sort="asc" /%}}

#### Firmware
You can update esp3d firmware when board is starting using a binary image file of firmware `esp3dfw.bin` at root of SD card.
If update is sucessful the file will be renamed to `esp3dfw.ok`, if `esp3dfw.ok` already exists, it will be first renamed using some index.
If update fail the file is renamed to `esp3dfw.bad` to avoid to try to update at each boot.

#### Flash filesystem
You can update esp3d flash filesystem when board is starting using a binary image file of filesystem  `esp3dfs.bin` at root of SD card.
If update is sucessful the file will be renamed to `esp3dfs.ok`, if `esp3dfs.ok` already exists, it will be first renamed using some index.
If update fail the file is renamed to `esp3dfs.bad` to avoid to try to update at each boot.

### OTA (Arduino IDE / PlatformIO)
This feature need to be enabled in `configuration.h`

#### [Arduino IDE esp8266](https://arduino-esp8266.readthedocs.io/en/latest/ota_updates/readme.html#arduino-ide) 
#### [Arduino IDE esp32](https://docs.arduino.cc/arduino-cloud/features/ota-getting-started)
#### [PlatformIO esp8266](https://docs.platformio.org/en/latest/platforms/espressif8266.html#over-the-air-ota-update)
#### [PlatformIO esp32](https://docs.platformio.org/en/latest/platforms/espressif32.html#over-the-air-ota-update)
