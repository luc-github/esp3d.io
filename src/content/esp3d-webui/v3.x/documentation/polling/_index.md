+++
description = "List of polling commands"
archetype = "home"
title = "Polling commands"
menuPre = "<i class='fas fa-question'></i> "
weight = 5
+++

WebUI support autoreporting but in case there is a need to get some information on demand, you can use polling commands. 

A polling command is a GCode command that will be sent to the printer and the response will be parsed and displayed in the WebUI each xxxxms.   

A refresh time of 3000ms is usally enough , shorter polling commands refreshtime may not be processed properly due to network latency.

Several polling commands for same refresh time can be added  at once separated added by `;` 

Note: A refresh time of 0 means polling will be done only once when webui start.

Here the list of polling commands available per firmware type:

## Marlin 

| Command | Description|
|:---|:---|
| M105 | Get temperatures |
| M114 | Get current positions |
| M27 | Get SD print status |
| M27 C | Get current file name |
| M220 | Get feedrate |
| M221 | Get flowrate |
| M106 | Get fan speed |
| M115 | Get printer capabilities |
| M31 | Get print time |
| [ESP701]json | Get current streaming status |



## Repetier

| Command | Description|
|:---|:---|
| M105 | Get temperatures |
| M114 | Get current positions |
| M27 | Get SD print status |
| M27 C | Get current file name |
| M220 | Get feedrate |
| M221 | Get flowrate |
| M106 | Get fan speed |
| M115 | Get printer capabilities |
| [ESP701]json | Get current streaming status |

## Smoothieware

| Command | Description|
|:---|:---|
| M105 | Get temperatures |
| M114 | Get current positions |
| M27 | Get SD print status |
| M220 | Get feedrate |
| M221 | Get flowrate |
| M115 | Get printer capabilities |
| [ESP701]json | Get current streaming status |

## Grbl

| Command | Description|
|:---|:---|
| ? | Get current status |
| $G | View GCode parser state |
| $# | View GCode Parameters |
| [ESP701]json | Get current streaming status |


## grblHAL

| Command | Description|
|:---|:---|
| ? | Get current status |
| $G | View GCode parser state |
| $# | View GCode Parameters |


