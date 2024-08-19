---
description : "Hooks description"
archetype : "section"
title : "Hooks"
weight : 4
---

Some hooks are available, they are triggered on some events.

The hooks is a define which contain a set of commands that are executed when an event is triggered.

You can customize the hooks to fit your needs in configuration.h

## Hooks
|Name|Description|
|-|-|
|`ESP_GOT_IP_HOOK`|Triggered when ESP got an IP address| 
|`ESP_GOT_DATE_TIME_HOOK`|Triggered when ESP got a datetime|  


## Examples

* `#define ESP_GOT_IP_HOOK "[ESP212]IP:%ESP_IP%`
    It will display IP address to printer screen when ESP got an IP address

* `#define ESP_GOT_DATE_TIME_HOOK "[ESP212]Date:%ESP_DATETIME%"`
    It will display datetime to printer screen when ESP got a datetime