+++
archetype = "section"
title = "About SD Transfer"
menuPre = "<i class='fas fa-sd-card'></i> "
weight = 4
+++

{{% notice style="red" title="Warning" icon="information" %}}
The SD transfer use the GCODE protocol based on M28/M29 commands, this protocol is often broken by external queries or even auto reporting.
Additionnaly the SD transfer is very slow: ~0.4KB/s, which make it almost unusable.

So this protocol is no more supported in ESP3D, and feature is provided `as it is`. 

The only existing reliable solution to be used in addition of ESP3D 2.1X, is to use a WiFi SD card like Toshiba FlashAir, which is no more produced.

[ESP3D 3.0](/esp3d/v3.x/) has some existing solution and some ongoing plan for better SD support depending on hardware used. 
{{% /notice %}}