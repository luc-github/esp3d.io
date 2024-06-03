+++
archetype = "section"
title = "SSDP protocol"
weight = 1
+++
* Windows :    
       Supported out of the box, just go to Network page
       ![image](/tools/discovery/ssdp-win.png)
* OSX :   
    TBD
* Linux :    
    On Debian-style distros, install `gupnp-tools` and run `gssdp-discover -i <devicename> --timeout=3`
* Android :    
    [SSDP/UPnP Scanner](https://play.google.com/store/apps/details?id=com.vgc.ssdpscan)
    ![image](/tools/discovery/ssdp-android.jpg)
