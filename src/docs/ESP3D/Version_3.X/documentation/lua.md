---
description : "Lua interpreter"
archetype : "section"
title : "About Lua interpreter"
menuPre : "<i class='fas fa-file-upload'></i> "
weight : 7
---

## About Lua interpreter

The ESP3D has a Lua interpreter that can be used to execute Lua scripts. 

Lua is a lightweight, high-level, multi-paradigm programming language designed for embedded use. please refer to [Lua](https://www.lua.org/) for more information.

In addition to the standard Lua interpreter commands, the ESP3D has a few additional functions that can be used to interact with the ESP3D.

## ESP3D functions

|Name|Description|
|-|-|
|`pinMode(pin, mode)`|Set the mode of a pin|
|`digitalWrite(pin, value)`|Set the value of a pin|
|`digitalRead(pin)`|Read the value of a pin|
|`analogRead(pin)`|Read the value of an analog pin|
|`analogWrite(pin, value)`|Set the value of an analog pin|
|`print(text)`|Print text on output of ESP3D, do not forget to add `\n` at the end of the text|
|`millis()`|Return the number of milliseconds since the ESP3D started|
|`delay(ms)`|Delay for a number of milliseconds|
|`yield()`|Yield the execution of the script to the ESP3D|
|`available()`|Return the number of commands available on a input of ESP3D|
|`readData()`|Read a command from a input of ESP3D|

!!! warning "Note" 
    Lua interpreter is not available in the ESP8266/ESP8285 firmwares

!!! Note
    Because the script is executed is indepedant task of the ESP3D, do not forget to use the `delay(ms)` or `yield()` functions to avoid to trigger the watchdog of the ESP32 during a long script / long loop.