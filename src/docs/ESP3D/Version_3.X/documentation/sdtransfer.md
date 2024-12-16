---
description : "SD Card usage examples"
archetype : "section"
title : "About SD card"
menuPre : "<i class='fas fa-sd-card'></i> "
weight : 5
---

!!! info "Note"
    The SD transfer is current supported on these configurations:   

    * MK WiFi modules using MKS Serial Protocol (~110KB/s)
        - MKS Robin 
        - MKS TFT
    * Using some sharing solution like : 
        - [Panucatt WiFi Backpack](https://www.panucatt.com/ProductDetails.asp?ProductCode=WB8266)
        - [Panucatt Azteeg X5](http://www.panucatt.com/azteeg_X5_mini_reprap_3d_printer_controller_p/ax5mini.htm)
        - [ESP3D wireless module](https://oshwhub.com/liqijian101/esp3d_esp32__camer-v2)
    * Using a direct connection to SD but content is only accessible by ESP and not usable by connected system, like:
        -  on ESPCam32


!!! danger "Clarification"
    The M28/M29 protocol is no more supported on ESP3D V3.0, this protocol is slow like hell (0.4 KB/S = 40min for 1MB) so not really usable, often no well managed by FW and suject to error due to external queries.

    People usualy after tested once they never use it again and are disappointed and complaining about it.

    So instead of keeping it using flash space and development time, and having to support it, it has been removed from 3.0, no more M28/M29 support is planned neither add it back.

