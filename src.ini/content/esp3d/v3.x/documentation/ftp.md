+++
description = "FTP usage and configuration"
archetype = "section"
title = "About FTP"
menuPre = "<i class='fas fa-file-upload'></i> "
weight = 7
+++

{{% notice style="info" title="Note"  %}}
FTP server accept only one connection at once, be sure you have limited the number of connections in your client settings 
{{% /notice %}}

The FTP server can serve flash only, sd only or both at once, but the sd support is limited direct sd and shared sd connections, serial connection is not supported (e.g. MKS protocol)