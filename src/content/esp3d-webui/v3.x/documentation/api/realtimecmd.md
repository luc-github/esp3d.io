+++
description = "Description and supported firmwares"
archetype = "section"
title = "Real time commands"
weight = 3
+++

Real time commands are not printable commands most of the time so it can be tricky to type them in terminal or to see them in terminal as echo. To workaround this you can use and see the `text equivalent` variables

## grbl

-   0x18 (ctrl-x) : Soft-Reset : #SOFTRESET#
-   0x84 : Safety Door #SAFETYDOOR#
-   0x85 : Jog Cancel #JOGCANCEL#

### Feed Overrides

-   0x90 : Set 100% of programmed rate. #FO100#
-   0x91 : Increase 10% #FO+10#
-   0x92 : Decrease 10% #FO-10#
-   0x93 : Increase 1% #FO+1#
-   0x94 : Decrease 1% #FO-1#

### Rapid Overrides

-   0x95 : Set to 100% full rapid rate. #RO100#
-   0x96 : Set to 50% of rapid rate. #RO50#
-   0x97 : Set to 25% of rapid rate. #RO25#

### Spindle Speed Overrides 10%->200%

-   0x99 : Set 100% of programmed spindle speed #SSO100#
-   0x9A : Increase 10% #SSO+10#
-   0x9B : Decrease 10% #SSO-10#
-   0x9C : Increase 1% #SSO+1#
-   0x9D : Decrease 1% #SSO-1#

### Toggle commands

-   0x9E : Toggle Spindle Stop #T-SPINDLESTOP#
-   0xA0 : Toggle Flood Coolant #T-FLOODCOOLANT#
-   0xA1 : Toggle Mist Coolant #T-MISTCOOLANT#


## grblHAL

-   0x18 (ctrl-x) : Soft-Reset : #SOFTRESET#
-   0x80 : Instead of ? for requesting a real-time report #STATUSREPORT#
-   0x81 : Instead of ~ for requesting cycle start #CYCLESTART#
-   0x82 : Instead of ! for requesting feed hold "#FEEDHOLD#
-   0x83 : Request parser state report #PARSERREPORT#
-   0x84 : Safety Door #SAFETYDOOR#
-   0x85 : Jog Cancel #JOGCANCEL#
-   0x87 : Request a complete real-time report #COMPLETEREPORT#
-   0x88 : Toggle the virtual optional stop switch #T-STOPSWITCH#

### Feed Overrides

-   0x90 : Set 100% of programmed rate. #FO100#
-   0x91 : Increase 10% #FO+10#
-   0x92 : Decrease 10% #FO-10#
-   0x93 : Increase 1% #FO+1#
-   0x94 : Decrease 1% #FO-1#

### Rapid Overrides

-   0x95 : Set to 100% full rapid rate. #RO100#
-   0x96 : Set to 50% of rapid rate. #RO50#
-   0x97 : Set to 25% of rapid rate. #RO25#

### Spindle Speed Overrides 10%->200%

-   0x99 : Set 100% of programmed spindle speed #SSO100#
-   0x9A : Increase 10% #SSO+10#
-   0x9B : Decrease 10% #SSO-10#
-   0x9C : Increase 1% #SSO+1#
-   0x9D : Decrease 1% #SSO-1#

### Toggles and extras

-   0x9E : Toggle Spindle Stop #T-SPINDLESTOP#
-   0xA0 : Toggle Flood Coolant #T-FLOODCOOLANT#
-   0xA1 : Toggle Mist Coolant #T-MISTCOOLANT#
-   0xA2 : Request a PID report #PIDREPORT#
-   0xA3 : Acknowledge a tool change request #TOOLCHANGE#
-   0xA4 : Toggle the virtual optional probe connected switch #T-PROBE#


