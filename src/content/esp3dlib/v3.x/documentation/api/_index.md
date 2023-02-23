+++
description = "API description"
archetype = "section"
title = "API"
weight = 100
menuPre = "<i class='fas fa-cogs'></i> "
+++

* [Web Handlers](webhandlers)
* [Web Sockets](websockets)
* Entry points in Marlin
```
#include "esp3dlib.h"
//Serial2
Serial2Socket class
```
```
//init
 esp3dlib.init();
```
```
 //idle task
 esp3dlib.idletask();
```
```
//Custom command
esp3dlib.parse(command_ptr);
```