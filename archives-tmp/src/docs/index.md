---
weight : 1
mermaidInitialize : "{ \"theme\": \"dark\" }"
mermaidZoom : true
description : "Web site of ESP3D ecosystem"
title : "ESP3D Ecosystem"
---
  
### What is ESP3D Ecosystem ?

ESP3D Ecosystem is a collection of projects based on espressif boards like esp8266 and esp32. The purpose is to provide WiFi feature to users of 3D printer, CNC, Sand Table and plotter.

Depending of the configuration and the hardware the solution will be different but the goal is to provide a set of feature equivalent accross devices.

Check on the menu the current projects, each one has a different implementation for same purpose. 

### What project to use ?

**Based on hardware**
```mermaid
graph LR
    A{<strong>Hardware?</strong>} -->|ESP8266| B[ESP3D]
    A -->|ESP32| C{<strong>Is main board ?</strong>} 
    C -->|No| D{<strong>Has Touchscreen ?</strong>} 
    C -->|Yes| E[ESP3DLib]
    D -->|Yes| F[ESP3D-TFT]
    D -->|No| G[ESP3D]
```
**Based on connection**
```mermaid
graph LR
    A{<strong>Connection?</strong>} -->|Serial| B{<strong>Has Touchscreen ?</strong>} 
    B -->|No|H[ESP3D]
    B -->|Yes|I[ESP3D-TFT]
    A -->|USB| C{<strong>Is ESP32-S3 ?</strong>} 
    C -->|No| D[Sorry no support for this] 
    C -->|Yes| E{<strong>Has Touchscreen ?</strong>}
    E -->|Yes| F[ESP3D-TFT]
    E -->|No| G[Coming soon in ESP3D]
```

**Based on feature**
```mermaid
graph LR
    A{<strong>Is main board ?</strong>} -->|Yes| B{<strong>Hardware ?</strong>} 
    B -->|ESP8266| C[Sorry no support for this]
    B -->|ESP32| D[ESP3DLib]
    A -->|No| E{<strong>Hardware ?</strong>} 
    E -->|ESP8266| F[ESP3D]
    E -->|ESP32| G{<strong>Has Touchscreen ?</strong>} 
    G -->|Yes| H[ESP3D-TFT]
    G -->|No| I[ESP3D]
```
