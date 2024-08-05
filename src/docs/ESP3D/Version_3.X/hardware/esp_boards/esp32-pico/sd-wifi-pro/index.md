---
archetype : "section"
title : "FYSETC SD-WIFI-PRO"
description :  "FYSETC SD-WIFI-PRO"
weight : 17
---

[github](https://github.com/FYSETC/SD-WIFI-PRO)


## Specs
* ESP32-PICO with 4MB flash memory, ceramic antenna, SD Card with no serial header, the sharing of SD card between ESP and printer/CNC is done by a multiplexer which make sharing reliable without risk of conflict, only one device can access to SD at once. 


![image](front.png?width=400px)
![image](pinout.png?width=400px)

!!! warning "Note"
    Because there is no serial connection to printer, the features are limited to SD card access features


!!! info "Note"
    My boards have only 4MB flash and no PSRAM unlike described in github and FYSETC website, so the following pio settings are limited to 4MB flash size and no PSRAM, if you have an 8MB board and 2MB PSRAM you may need to adjust the parameters .


### configuration.h
```js          
{% include "./configuration.h"  %}
```

### platformio.ini
```ini
{% include "./platformio.ini"  %}
```

{{% resources color="blue" icon="fas fa-paperclip" sort="asc" pattern=".*\.(ini|h)" /%}}