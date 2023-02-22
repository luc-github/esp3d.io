+++
description = "Camera configuration"
archetype = "home"
title = "Camera support"
menuPre = "<i class='fas fa-camera'></i> "
weight = 5
+++
{{% notice style="warning" title="Note"  %}}
Only camera with PSRAM are supported in ESP3D due to performances issue without PSRAM.
{{% /notice %}}

The camera does not actually stream a video stream but only frames. The purpose is to provide more time toesp  mcu to monitor and control the target system.
The maximum frame rate is 5 frames per second, which is more than enough to capture states for timelapse or for monitoring.

If you want a continuous stream use a separate camera dedicated to this function and add the stream to the web interface.