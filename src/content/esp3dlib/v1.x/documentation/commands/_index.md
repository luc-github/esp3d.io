+++
description = "Syntax and parameters"
archetype = "section"
title = "ESP3D commands"
weight = 1
menuPre = "<i class='fas fa-terminal'></i> "
+++

## Conventions
Add space to separate parameters

### Display command list   
[ESP]

### Set/Get STA SSID   
[ESP100]<SSID>

### Set STA Password   
[ESP101]<Password>

### Set/Get STA IP mode (DHCP/STATIC)   
[ESP102]<mode>

### Set/Get STA IP/Mask/GW   
[ESP103]IP=<IP> MSK=<IP> GW=<IP> 

### Set/Get AP SSID   
[ESP105]<SSID>

### Change AP Password   
[ESP106]<Password>

### Set/Get AP IP   
[ESP107]<IP>

### Set/Get AP channel    
[ESP108]<channel>

### Set/Get radio state which can be STA, AP, OFF  
[ESP110]<state>

### Get current IP  
[ESP111]

### Get/Set hostname  
[ESP112]<Hostname> 

### Get/Set HTTP state which can be ON, OFF  
[ESP120]<state>

### Get/Set HTTP port   
[ESP121]<port>

### Get SD Card Status   
[ESP200]

### Get full EEPROM settings content     
Note: it does not give any passwords   
[ESP400] 

### Set EEPROM setting   
Using position in EEPROM, type: B(byte), I(integer/long), S(string), A(IP address / mask)  

[ESP401]P=<position> T=<type> V=<value>
```cpp
Description:		Positions:
HOSTNAME_ENTRY 		"ESP_HOSTNAME"
STA_SSID_ENTRY 		"STA_SSID"
STA_PWD_ENTRY 		"STA_PWD"
STA_IP_ENTRY 		"STA_IP"
STA_GW_ENTRY 		"STA_GW"
STA_MK_ENTRY 		"STA_MK"
ESP_RADIO_MODE 		"WIFI_MODE"
AP_SSID_ENTRY 		"AP_SSID"
AP_PWD_ENTRY 		"AP_PWD"
AP_IP_ENTRY 		"AP_IP"
AP_CHANNEL_ENTRY 	"AP_CHANNEL"
HTTP_ENABLE_ENTRY 	"HTTP_ON"
HTTP_PORT_ENTRY 	"HTTP_PORT"
TELNET_ENABLE_ENTRY "TELNET_ON"
TELNET_PORT_ENTRY 	"TELNET_PORT"
STA_IP_MODE_ENTRY   "STA_IP_MODE"
```

### Get available AP list (limited to 30)   
Output is JSON or plain text according parameter   
[ESP410]<plain>

### Get current settings of ESP3D   
Output is plain text   
[ESP420]

### Set ESP State
cmd is RESTART / RESET   
[ESP444]<cmd>

### Change admin password
[ESP550]<password>   

### Change user password  
[ESP555]<password>   

### Format ESP Filesystem  
[ESP710]FORMAT   

### FW Informations  
[ESP800]<plain>   
