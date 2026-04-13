---
archetype : "section"
title : "SOnOff"
description : "SOnOff"
weight : 15
---

## Specs
* ESP8266 with 4MB flash memory, ceramic antenna

![image](Sonoff-1.png?width=400px)
![image](sonoff.jpeg?width=400px)
![image](Sonoff-2.png?width=400px)

![image](sonoff.png?width=400px)
Relay is connected by GPIO12, it can be handled using ESP201 command:

So `[ESP201]P=12 V=0` should be off and `[ESP201]P=12 V=1` should be on