var relearn_search_index = [
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "API",
    "uri": "/esp3d-tft/v1.x/documentation/api/index.html"
  },
  {
    "content": "Web Handlers / (GET) root is the default handler where all files will be served, if no file is defined, it looks for index.html or index.html.gz (compressed) if you call specific file, it will look for the filename and filename.gz (compressed) if no file is defined and there is not index.html(.gz) it will display embedded page another way to show the embedded page is /?forcefallback=yes\n/files (GET/POST) this handler handle all commands for FS, including upload on FS.\npossible options/arguments are:\nquiet=yes can be used when you don’t want list files but just upload them path=... define the path to the file action=... define the action to execute which can be:\n- delete\ndelete the file defined by filename=... it will also use path=... to do full path\n- deletedir\ndelete the directory defined by filename=... it will also use path=... to do full path - createdir create the directory defined by filename=... it will also use path=... to do full path \u003cfilename\u003eS=... give the size of uploaded file with name, need to be set before file is set in upload, POST only the output is a json file:\n``` { \"files\":[ //the files list { \"name\":\"index.html.gz\", //the name of the file \"size\":\"83.46 KB\", //the formated size of the file \"time\":\"2022-09-04 11:56:05\" //the time when the file was modified last time, this one is optional and depend on (FILESYSTEM_TIMESTAMP_FEATURE) }, { \"name\":\"subdir\", //the name of the file / directory \"size\":\"-1\", //the size is -1 because it is a directory \"time\":\"\" //no time for directories optional as depend on (FILESYSTEM_TIMESTAMP_FEATURE) } ], \"path\":\"/\", //current path \"occupation\":\"52\", //% of occupation \"status\":\"subdir created\", //status \"total\":\"192.00 KB\", //Formated total space of Filesystem \"used\":\"100.00 KB\" //Formated used space of Filesystem } ``` /upload_serial (POST) this handler is for uploading files to printer SD using M28/M29 protocol\n/command (GET) this handler is for all commands the parameter is cmd=... if it is an [ESPXXX] command the answer is the [ESPXXX] response if it is not an [ESPXXX] command the answer is ESP3D says: command forwarded and can be ignored\n/login (GET/POST) this handler is for authentication function if enabled possible options/arguments are:\n- DISCONNECT=YES it will clear current session, remove authentication cookie, set status to disconnected and response code to 401 - SUBMIT=YES to login it will need also PASSWORD=... and USER=..., the answer will be 200 if success and 401 if failed if user is already authenticated it can use NEWPASSWORD=... instead of PASSWORD=... to change his password, if successful answer will be returned with code 200, otherwise code will be 500 if change failed or if password format is invalid\n/config (GET) this handler is a shortcut to [ESP420] command in text mode, to get output in json add json=yes\n/updatefw (POST) this handler is for FW upload and update\n/description.xml (GET) this handler is for SSDP if enabled to present device informations\n\u003croot xmlns=\"urn:schemas-upnp-org:device-1-0\"\u003e \u003cspecVersion\u003e \u003cmajor\u003e1\u003c/major\u003e \u003cminor\u003e0\u003c/minor\u003e \u003c/specVersion\u003e \u003cURLBase\u003ehttp://192.168.2.178:80/\u003c/URLBase\u003e \u003cdevice\u003e \u003cdeviceType\u003eurn:schemas-upnp-org:device:upnp:rootdevice:1\u003c/deviceType\u003e \u003cfriendlyName\u003eesp3d\u003c/friendlyName\u003e \u003cpresentationURL\u003e/\u003c/presentationURL\u003e \u003cserialNumber\u003e52332\u003c/serialNumber\u003e \u003cmodelName\u003eESP Board\u003c/modelName\u003e \u003cmodelDescription/\u003e \u003cmodelNumber\u003eESP3D 3.0\u003c/modelNumber\u003e \u003cmodelURL\u003ehttps://www.espressif.com/en/products/devkits\u003c/modelURL\u003e \u003cmanufacturer\u003eEspressif Systems\u003c/manufacturer\u003e \u003cmanufacturerURL\u003ehttps://www.espressif.com\u003c/manufacturerURL\u003e \u003cUDN\u003euuid:38323636-4558-4dda-9188-cda0e600cc6c\u003c/UDN\u003e \u003cserviceList/\u003e \u003ciconList/\u003e \u003c/device\u003e \u003c/root\u003e Captive portal bypass handlers to avoid a redirect to index.html and so a refresh of the page, some classic handler have been added so they all go to / handler actually\n/generate_204 /gconnectivitycheck.gstatic.com /fwlink/ ",
    "description": "",
    "tags": null,
    "title": "API",
    "uri": "/esp3d/v2.x/documentation/api/index.html"
  },
  {
    "content": "What is ESP3D ? ESP3D is a a firmware for ESP8266 and ESP32 boards from espressif, This firmware allows not only to have a cheap bridge between Wifi and serial, but also to have a web UI to configure wifi, to monitor 3D printer/CNC and even control it, and to make things easy, UI is fully customizable without reflashing FW.\nFirmware support different target firmwares according version.\nWarning This is for esp8266, esp8285, esp32 boards as daughters boards connected to your main board only. For esp32 board as main board for your 3D Printer please use ESP3DLib\nThere is one production version and one development version, others versions are no more maintained.\n",
    "description": "",
    "tags": null,
    "title": "ESP3D",
    "uri": "/esp3d/index.html"
  },
  {
    "content": "What is ESP3DLib ? ",
    "description": "",
    "tags": null,
    "title": "ESP3DLib",
    "uri": "/esp3dlib/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Features",
    "uri": "/esp3d-tft/v1.x/features/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Features",
    "uri": "/esp3d-webui/v2.x/features/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Features",
    "uri": "/esp3d-webui/v3.x/features/index.html"
  },
  {
    "content": " Support for ESP8266, ESP8285 and standard ESP32 board with at least 1Mb of flash Serial/Wifi bridge using configurable port 8888 Reset settings using GPIO2 pin Complete configuration by web browser (Station or Access point) or by Serial/telnet commands Authentication (optional) for better security Update firmware by web browser for 4MB boards Captive portal in Access point mode which redirect all unknow call to main page mDNS, this feature is a discovery protocol, it need bonjour installed on computer, supported outof the box by OSX, on Windows and Linux need to be installed SSDP, this feature is a discovery protocol, supported on Windows out of the box Fail safe mode (Access point)is enabled if cannot connect to defined station at boot. Embedded FS uploader and updater Basic OLED screen support Notifications using Line / Pushover / Email DHT sensor support Direct pins control using ESP commands ",
    "description": "",
    "tags": null,
    "title": "Features",
    "uri": "/esp3d/v2.x/features/index.html"
  },
  {
    "content": " Embedded maintenance page (terminal / local FS update / ESP3D Firmware update) WebUI support ESP8285 / ESP8266 / ESP32 / ESP32-S2 / ESP32-S3 / ESP32-C3 support Wifi / ethernet support Raw TCP / serial bridge support (light telnet) Boot delay configuration Websocket / serial bridge support Serial / Serial bridge support Bluetooth Serial bridge support (when BT supported) MKS Serial protocol support Serial commands configurations Authentication support (admin / user) FTP support (limited to 1 connection at once) WebDav support Local FS support: Little FS (recommended) Fat (ESP32 only) SPIFFS (deprecated) SD support File format Native SPI Native SDIO (ESP32 only) SDFat 1.x SDFat 2.x Connection Direct connection e.g.: ESP32cam Sharing connection using hardware switch e.g.: Panucatt Wifi Backpack / Azteeg X5 WiFi MKS fast upload by serial NOT SUPPORTED ANYMORE M28/M29 File transfer protocol Serial file transfer using custom protocol (planned) USB support planned Global FS under FTP / Webdav : SD + Local FS in same directory Buzzer support Recovery pin support Pins control by commands ESP32 Camera support (only with PSRAM) Basic oled screen support I2C SSD1306 128x64 I2C SSDSH1106 132x64 Basic tft screen support SPI ST7789 135x240 SPI ST7789 240x240 Time synchronization support (manual / internet server) Lua interpreter support (Work in progress) Notifications support WebUI TFT/OLED Email Line Telegram PushOver IFTTT Sensors support DHT 11/22 Analog BMX280 Auto script support at start Basic Host GCODE stream for macros hosted on local FS (Work in Progress to improve it) Update ESP3D configuration using ini file on SD ESP3D update using binary file on SD OTA support Update by WebUI ",
    "description": "",
    "tags": null,
    "title": "Features",
    "uri": "/esp3d/v3.x/features/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Features",
    "uri": "/esp3dlib/v1.x/features/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Features",
    "uri": "/esp3dlib/v3.x/features/index.html"
  },
  {
    "content": "What is version 1.X ? ",
    "description": "",
    "tags": null,
    "title": "Version 1.X",
    "uri": "/esp3d-tft/v1.x/index.html"
  },
  {
    "content": "What is version 1.X ? ",
    "description": "",
    "tags": null,
    "title": "Version 1.X",
    "uri": "/esp3dlib/v1.x/index.html"
  },
  {
    "content": " This version is the production version, features are frozen, only bugfixes are accepted.\nFirmware should work with the following firmwares:\nRepetier 1.0 Marlin 1.X/2.X Smoothieware 1.x grbl 1.x The communication between ESP board and target board is done by serial.\nThe firmware must be used with ESP3D-WEBUI 2.X\n",
    "description": "",
    "tags": null,
    "title": "Version 2.1.X",
    "uri": "/esp3d/v2.x/index.html"
  },
  {
    "content": "What is version 2.X ? ",
    "description": "",
    "tags": null,
    "title": "Version 2.X",
    "uri": "/esp3d-webui/v2.x/index.html"
  },
  {
    "content": "arduino ide: https://www.arduino.cc/en/software\nESP8266: https://github.com/esp8266/arduino#contents\nESP32: https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html\nESP3D configuration\nDescribe configuration settings…\nCompile and Flash\n",
    "description": "",
    "tags": null,
    "title": "Arduino IDE",
    "uri": "/esp3d/v2.x/installation/arduino/index.html"
  },
  {
    "content": " Warning Some commands may not have been implemented yet.\nConventions 1 - Commands are case sensitives 2 - Add space to separate parameters\n3 - If parameter has space, add \\ in front of space to not be seen as separator\n4 - json, json=YES, json=TRUE and json=1 are paremeters to switch output to json. By default output is plain text, to get json formated output add json or json=yes after main parameters\nThe json format is\n{ cmd:\"\u003ccommand id\u003e\", //the id of requested command status:\"\u003cok/error\u003e\" //give if it is success or an failure data:\"\u003cresponse\u003e\" // response corresponding to answer in json format too } Commands Show commands help\n[ESP]\u003ccommand id\u003e json=\u003cno\u003e\nSet/Get STA SSID\n[ESP100]\u003cSSID\u003e json=\u003cno\u003e pwd=\u003cadmin password for set/get \u0026 user password to get\u003e\nSet STA Password\n[ESP101]\u003cPassword\u003e \u003cNOPASSWORD\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nSet/Get STA IP mode (DHCP/STATIC)\n[ESP102]\u003cmode\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nSet/Get STA IP/Mask/GW/DNS\n[ESP103]IP=\u003cIP\u003e MSK=\u003cIP\u003e GW=\u003cIP\u003e DNS=\u003cIP\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nSet/Get sta fallback mode which can be WIFI-AP, BT, OFF\n[ESP104]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nSet/Get AP SSID\n[ESP105]\u003cSSID\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nChange AP Password\n[ESP106]\u003cPassword\u003e \u003cNOPASSWORD\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nSet/Get AP IP\n[ESP107]\u003cIP\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nSet/Get AP channel\n[ESP108]\u003cchannel\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nSet/Get radio state which can be STA, AP, BT, CONFIG, OFF\n[ESP110]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet current IP or IP/MSK/GW/DNS\n[ESP111]\u003cALL\u003e json=\u003cno\u003e\nGet/Set hostname\n[ESP112]\u003cHostname\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet /Set Boot radio state which can be ON, OFF\n[ESP114]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cuser/admin password\u003e\nGet/Set immediate network(WiFi/BT/Ethernet) state which can be ON, OFF\n[ESP115]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set HTTP state which can be ON, OFF\n[ESP120]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set HTTP port\n[ESP121]\u003cport\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set Telnet state which can be ON, OFF, CLOSE\n[ESP130]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set Telnet port [ESP131]\u003cport\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nSync / Set / Get current time\n[ESP140]\u003cSYNC\u003e \u003csrv1=XXXXX\u003e \u003csrv2=XXXXX\u003e \u003csrv3=XXXXX\u003e \u003czone=xxx\u003e \u003cdst=YES/NO\u003e \u003ctime=YYYY-MM-DDTHH:mm:ss\u003e \u003cNOW\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set display/set boot delay in ms / Verbose boot // Not used in ESP3D-TFT [ESP150]\u003cdelay=time in milliseconds\u003e\u003cverbose=ON/OFF\u003epwd=\u003cadmin password\u003e\nGet/Set WebSocket state which can be ON, OFF\n[ESP160]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set WebSocket port // Not used in ESP3D-TFT [ESP161]\u003cport\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set Camera command value / list all values in JSON/plain // Not used in ESP3D-TFT label can be: light/framesize/quality/contrast/brightness/saturation/gainceiling/colorbar/awb/agc/aec/hmirror/vflip/awb_gain/agc_gain/aec_value/aec2/cw/bpc/wpc/raw_gma/lenc/special_effect/wb_mode/ae_level\n[ESP170]\u003clabel=value\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nSave frame to target path and filename (default target = today date, default name=timestamp.jpg) // Not used in ESP3D-TFT [ESP171] \u003cpath=target path\u003e \u003cfilename=target filename\u003e\nGet/Set Ftp state which can be ON, OFF, CLOSE\n[ESP180]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set Ftp ports [ESP181]ctrl=\u003cport\u003e active=\u003cport\u003e passive=\u003cport\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set WebDav state which can be ON, OFF, CLOSE\n[ESP190]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set WebDav port [ESP191]\u003cport\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set SD Card Status\n[ESP200]\u003cRELEASE\u003e \u003cREFRESH\u003e json=\u003cno\u003e pwd=\u003cuser/admin password\u003e\nRELEASE will force the release of SD from ESP3D if SD is shared\nREFRESH will refresh the SD info is available`\nGet/Set pin value\n[ESP201]P=\u003cpin\u003e V=\u003cvalue\u003e [PULLUP=YES RAW=YES ANALOG=NO ANALOG_RANGE=255]pwd=\u003cadmin password\u003e\nif no V= get P= value if V= 0/1 set INPUT_PULLUP value, but for GPIO16(ESP8266) INPUT_PULLDOWN_16 if PULLUP=YES set input pull up (for GPIO16(ESP8266) INPUT_PULLDOWN_16), if not set input if RAW=YES do not set pinmode just read value Note: Flash pins according chip cannot be used\nGet/Set SD card speed divider factor 1 2 4 6 8 16 32\n[ESP202]\u003cdiv factor\u003e json=\u003cno\u003e pwd=\u003cuser/admin password\u003e\nGet Sensor Value / type/Set Sensor type // Not used in ESP3D-TFT [ESP210]\u003ctype=NONE/xxx\u003e \u003cinterval=XXX in millisec\u003e json=\u003cno\u003e pwd=\u003cuser/admin password\u003e\nOutput to esp screen status\n[ESP214]\u003cText\u003e json=\u003cno\u003e pwd=\u003cuser/admin password\u003e\nTouch Calibration [ESP215]\u003cCALIBRATE\u003e json=\u003cno\u003e pwd=\u003cuser password\u003e\nGet ESP pins definition // Not used in ESP3D-TFT [ESP220]json=\u003cno\u003e pwd=\u003cuser password\u003e\nPlay sound\n[ESP250]F=\u003cfrequency\u003e D=\u003cduration\u003e json=\u003cno\u003e pwd=\u003cuser password\u003e\nNote: No parameter just play beep\nDelay command\n[ESP290]\u003cdelay in ms\u003e json=\u003cno\u003epwd=\u003cuser password\u003e\nGet full EEPROM settings content\n[ESP400]json=\u003cno\u003e pwd=\u003cadmin password\u003e\nNote: do not give any passwords\nSet EEPROM setting\nposition in EEPROM, type: B(byte), I(integer/long), S(string), A(IP address / mask) [ESP401]P=\u003cposition\u003e T=\u003ctype\u003e V=\u003cvalue\u003e json=\u003cno\u003e pwd=\u003cuser/admin password\u003e\nGet/Set Check update at boot state which can be ON, OFF\n[ESP402]\u003cstate\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet available AP list (limited to 15)\noutput is JSON or plain text according parameter\n[ESP410]json=\u003cno\u003e \u003cpwd=admin/user\u003e\nGet current settings of ESP3D\nOutput is JSON or plain text according parameter\n[ESP420]json=\u003cno\u003e \u003cpwd=admin/user\u003e\nSet ESP State\ncmd can be RESTART to restart board or RESET to reset all setting to defaults values [ESP444]\u003ccmd\u003e json=\u003cno\u003e \u003cpwd=admin\u003e\nGet available ESP3D list\noutput is JSON or plain text according parameter\n[ESP450]json=\u003cno\u003e \u003cpwd=admin/user\u003e\nGet/Set connection status\n[ESP500] json=\u003cno\u003e pwd=\u003cadmin password\u003e\nGet/Set session timeout\n[ESP500]\u003ctimeout\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nChange admin password [ESP550]\u003cpassword\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nChange user password\n[ESP555]\u003cpassword\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nSend Notification\n[ESP600]msg json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nSet/Get Notification settings\n[ESP610]type=\u003cNONE/PUSHOVER/EMAIL/LINE/IFTTT\u003e T1=\u003ctoken1\u003e T2=\u003ctoken2\u003e TS=\u003cSettings\u003e json=\u003cno\u003e [pwd=\u003cadmin password\u003e] Get will give type and settings only, not the protected T1/T2\nSend Notification using URL\n[ESP620]URL=\u003cencoded url\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nRead / Stream / Process FS file\n[ESP700]\u003cfilename\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nQuery and Control ESP700 stream\n[ESP701]action=\u003cPAUSE/RESUME/ABORT\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nFormat ESP Filesystem\n[ESP710]FORMATFS json=\u003cno\u003e pwd=\u003cadmin password\u003e\nFormat SD Filesystem // Not used in ESP3D-TFT\n[ESP715]FORMATSD json=\u003cno\u003e pwd=\u003cadmin password\u003e\nList ESP Filesystem\n[ESP720]\u003cRoot\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nAction on ESP Filesystem Action can be rmdir to remove empty directory / remove to delete file / mkdir to create directory / exists to check if file or directory exists / create create an empty file\n[ESP730]\u003cAction\u003e=\u003cpath\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nList SD Filesystem [ESP740]\u003cRoot\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nAction on SD Filesystem\nAction can be rmdir to remove empty directory / remove to delete file / mkdir to create directory / exists to check if file or directory exists / create create an empty file [ESP750]\u003cAction\u003e=\u003cpath\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nList Global Filesystem\n[ESP780]\u003cRoot\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nAction on Global Filesystem\nAction can be rmdir to remove empty directory / remove to delete file / mkdir to create directory / exists to check if file or directory exists / create create an empty file\n[ESP790]\u003cAction\u003e=\u003cpath\u003e json=\u003cno\u003e pwd=\u003cadmin password\u003e\nFW Informations\n[ESP800]json=\u003cno\u003e pwd=\u003cadmin password\u003e \u003ctime=YYYY-MM-DDTHH:mm:ss\u003e \u003cversion=3.0.0-a11\u003e \u003csetup=0/1\u003e\nGet state / Set Enable / Disable Serial Communication\n[ESP900]\u003cENABLE/DISABLE\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nGet / Set Serial Baud Rate [ESP901]\u003cBAUD RATE\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nGet / Set USB-Serial Baud Rate [ESP902]\u003cBAUD RATE\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nGet state / Set Enable / Disable buzzer\n[ESP910]\u003cENABLE/DISABLE\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nGet state / Set state of output message clients // Not used in ESP3D-TFT [ESP920]\u003cSERIAL / SCREEN / REMOTE_SCREEN/ WEBSOCKET / TELNET /BT / ALL\u003e=\u003cON/OFF\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nGet state / Set Enable / Disable Serial Bridge Communication // Not used in ESP3D-TFT [ESP930]\u003cENABLE/DISABLE\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nGet / Set Serial Bridge Baud Rate // Not used in ESP3D-TFT [ESP931]\u003cBAUD RATE\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nGet / Set Serial Output // Only used in ESP3D-TFT with board having the feature [ESP950]\u003cSERIAL/USB\u003e json=\u003cno\u003e pwd=\u003cadmin/user password\u003e\nSet quiet boot if strapping pin is High\n[ESP999]QUIETBOOT pwd=\u003cadmin/user password\u003e\n",
    "description": "",
    "tags": null,
    "title": "ESP3D commands",
    "uri": "/esp3d-tft/v1.x/documentation/api/_commands/index.html"
  },
  {
    "content": "Format Please note all commands are in format [ESPxx]. These first brackets [] are not optional.\nMost of the time givin no argument will return current configuration If authentication is on, somme commands will need admin password. They are recognised by the optional argument [pwd=\u003cadmin password\u003e] in command line.\nCommands Get/change STA SSID [ESP100] [\u003cSSID\u003e] [pwd=\u003cadmin password\u003e]\nChange STA Password [ESP101] \u003cPassword\u003e [pwd=\u003cadmin password\u003e]\nGet/change Hostname [ESP102] [\u003chostname\u003e] [pwd=\u003cadmin password\u003e]\nGet/change Wifi mode (STA/AP) [ESP103] [STA | AP] [pwd=\u003cadmin password\u003e]\nGet/change STA IP mode (DHCP/STATIC) [ESP104] [DHCP | STATIC] [pwd=\u003cadmin password\u003e]\nGet/change AP SSID [ESP105] [\u003cSSID\u003e] [pwd=\u003cadmin password\u003e]\nChange AP Password [ESP106] \u003cPassword\u003e [pwd=\u003cadmin password\u003e]\nGet/change AP IP mode (DHCP/STATIC) [ESP107] [DHCP | STATIC] [pwd=\u003cadmin password\u003e]\nGet/change wifi state (on/off) [ESP110] [ON | OFF | RESTART] [pwd=\u003cadmin password\u003e]\nGet current IP [ESP111]\nGet/Change hostname [ESP112] [\u003chostname\u003e]\nGet/Set pin value [ESP201] P\u003cpin\u003e [V\u003cvalue\u003e PULLUP=YES RAW=YES ANALOG=NO ANALOG_RANGE=255 CLEARCHANNELS=NO pwd=\u003cadmin password\u003e]\nif no V get P value\nif V 0/1 set INPUT_PULLUP value, but for GPIO16 INPUT_PULLDOWN_16 GPIO1 and GPIO3 cannot be used as they are used for serial\nif PULLUP=YES set input pull up, if not set input\nif RAW=YES do not set pinmode just read value\nOutput to oled column C and line L [ESP210] C=\u003ccol\u003e L=\u003cline\u003e T=\u003cText\u003e\nOutput to oled line 1 [ESP211] \u003cText\u003e\nOutput to oled line 2 [ESP212] \u003cText\u003e\nOutput to oled line 3 [ESP213] \u003cText\u003e\nOutput to oled line 4 [ESP214] \u003cText\u003e\nDelay [ESP290] \u003cdelayMs\u003e [pwd=\u003cadmin password\u003e]\nGet EEPROM mapping version [ESP300]\nGet full EEPROM settings content but do not give any passwords can filter if only need wifi or printer [ESP400] \u003cnetwork/printer\u003e\nSet EEPROM setting [ESP401] P=\u003cposition\u003e T={B | I | S | A} V=\u003cvalue\u003e [pwd=\u003cuser/admin password\u003e]\nT type: B(byte), I(integer/long), S(string), A(IP address / mask)\nP position: address in EEPROM\nEP_WIFI_MODE 0 //1 byte = flag EP_STA_SSID 1 //33 bytes 32+1 = string ; warning does not support multibyte char like chinese EP_STA_PASSWORD 34 //65 bytes 64 +1 = string ;warning does not support multibyte char like chinese EP_STA_IP_MODE 99 //1 byte = flag EP_STA_IP_VALUE 100 //4 bytes xxx.xxx.xxx.xxx EP_STA_MASK_VALUE 104 //4 bytes xxx.xxx.xxx.xxx EP_STA_GATEWAY_VALUE 108 //4 bytes xxx.xxx.xxx.xxx EP_BAUD_RATE 112 //4 bytes = int EP_STA_PHY_MODE 116 //1 byte = flag EP_SLEEP_MODE 117 //1 byte = flag EP_CHANNEL 118 //1 byte = flag EP_AUTH_TYPE 119 //1 byte = flag EP_SSID_VISIBLE 120 //1 byte = flag EP_WEB_PORT 121 //4 bytes = int EP_DATA_PORT 125 //4 bytes = int EP_OUTPUT_FLAG 129 //1 bytes = flag EP_HOSTNAME 130 //33 bytes 32+1 = string ; warning does not support multibyte char like chinese EP_DHT_INTERVAL 164 //4 bytes = int EP_FREE_INT2 168 //4 bytes = int EP_FREE_INT3 172 //4 bytes = int EP_ADMIN_PWD 176 //21 bytes 20+1 = string ; warning does not support multibyte char like chinese EP_USER_PWD 197 //21 bytes 20+1 = string ; warning does not support multibyte char like chinese EP_AP_SSID 218 //33 bytes 32+1 = string ; warning does not support multibyte char like chinese EP_AP_PASSWORD 251 //65 bytes 64 +1 = string ;warning does not support multibyte char like chinese EP_AP_IP_VALUE 316 //4 bytes xxx.xxx.xxx.xxx EP_AP_MASK_VALUE 320 //4 bytes xxx.xxx.xxx.xxx EP_AP_GATEWAY_VALUE 324 //4 bytes xxx.xxx.xxx.xxx EP_AP_IP_MODE 329 //1 byte = flag EP_AP_PHY_MODE 330 //1 byte = flag EP_FREE_STRING1 331 //129 bytes 128+1 = string ; warning does not support multibyte char like chinese EP_DHT_TYPE 460 //1 bytes = flag EP_TARGET_FW 461 //1 bytes = flag Get available AP list (limited to 30) [ESP410] [plain]\nOutput is JSON or plain text according parameter\nGet current settings of ESP3D [ESP420] [plain]\nOutput is JSON or plain text according parameter\nGet/Set ESP mode [ESP444] [RESET | SAFEMODE | CONFIG | RESTART] [pwd=\u003cadmin password\u003e]\nif authentication is on, need admin password for RESET, RESTART and SAFEMODE\nSend GCode with check sum caching right line numbering [ESP500] \u003cgcode\u003e\nSend line checksum [ESP501] \u003cline\u003e\nChange / Reset user password [ESP555] [\u003cpassword\u003e] [pwd=\u003cadmin password\u003e]\nIf no password set it use default one\nSend notification [ESP600] \u003cmessage\u003e [pwd=\u003cadmin password\u003e]\nSet/Get notification settings [ESP610] type={NONE | PUSHOVER | EMAIL | LINE} T1=\u003ctoken1\u003e T2=\u003ctoken2\u003e TS=\u003cSettings\u003e [pwd=\u003cadmin password\u003e] Get will give type and settings only not the protected T1/T2\nRead SPIFFS file and send each line to serial [ESP700] \u003cfilename\u003e\nFormat SPIFFS [ESP710] FORMAT [pwd=\u003cadmin password\u003e]\nGet SPIFFS total size and used size [ESP720]\nGet fw version and basic information [ESP800]\nGet fw target [ESP801]\nGet state / Set Enable / Disable Serial Communication [ESP900] \u003c{ENABLE | DISABLE}\u003e\n",
    "description": "",
    "tags": null,
    "title": "ESP3D commands",
    "uri": "/esp3d/v2.x/documentation/commands/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Installation",
    "uri": "/esp3d-tft/v1.x/installation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Installation",
    "uri": "/esp3d-webui/v2.x/installation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Installation",
    "uri": "/esp3d-webui/v3.x/installation/index.html"
  },
  {
    "content": "Setup your development environment Arduino IDE or PlatformIO The platformIO environment is the easiest to setup, because you do not need to setup the esp core neither the libraries by yourself.\nConnect your board Connection between ESP and printer board needs 4 wires:\nESP Tx needs to connect to Rx on MCU of printer board. ESP Rx needs to connect to Tx on MCU of printer board. You also need to power supply ESP board with with GND and 3V3 or 5V. Connecting ESP board to target board Be aware that ESP MCU is 3.3V on GPIO pin and some target board can be 3.3V and others 5V, so you may not be able to directly connect ESP board to target board.\nDisclaimer : this wiki is for reference - you are responsible of your board supporting or not 5V, we are not responsible for any damage of wrong wiring.\nESP32 and ESP8266 MCU are only supporting 3.3V. Power supply them with 5V will likelly fry them immediatelly. As MCU is supplied at 3.3V, Tx and Rx signals will be at 3.3V even when board is supplied with 5V. Wether Rx pin is supporting 5V is controversial so we will keep on the safe side and only take datahseet as reference. It’s not recommended to have any signal (including Rx) be higher than power supply (3.3V here).\nThere are several points to take care. One should check that\nMCU1 Tx voltage is lower than MCU2 supply voltage Voh_min of Tx is higher than Vih_min of Rx (to check both ways) Vol_max of Tx is lower than Vil_max of Rx (to check both ways) 1 is mandatory and resistor voltage divider bridge or level shiffter is recommended\n2 \u0026 3 are not destructive there is just a slight risk signals are not read correctly. But it will work in most case as the limit values given by datasheets are rarelly met in mild conditions (using near 25°C and low current flowing from Tx to Rx)\nFor the divider bridge a value of R1=1k and R2=2.2k will be fine. You could also use 10k and 22k or anything near a factor 2.\nConnection diagrams for some printers and ESP boards Printer motherboards Anet A8 boards Anycubic i3 mega - Trigorilla 8bit board AZSMZ LCD board AZSMZ-mini board Azteeg X5 mini board BIQU KFB2.0 board Creality CR10 Ender 3 board Creality Ender 4 board Davinci 1.0/2.0 board Davinci 1.0A board MKS boards MKS Smoothieware board RADDS board RAMPS 1.4/Re-ARM board Smoothieboard board SKR Mini E3 board Weedo Tina2 board For printer boards not listed here ESP boards ESP-01 ESP-01 serial wifi module ESP-12E/F ESP 12F serial wifi module ESP32-Cam NodeMCU V2/V3 Sonoff Wemos D1 mini Printer motherboards Anet A8 boards Anet boards up to v1.5 Step 1 You will also have to unsolder the resistors R52 and R53 – they are zero ohm resistors, and serve no other purpose than connecting the atmega chip directly to the onboard USB to UART converter (the CH340 chip). Do it VERY careful – you don’t want to damage your board. If you don’t feel confident – don’t do it.\nStep 2 Now prepare the printer’s motherboard. It requires a simple modification, that does not interfere with it’s operation afterwards – just solder 3 pin x 2 row male header on J8, and add 2 jumpers (or jumper wires) as shown on the picture:\nStep 3 Connect the ESP to J3 repsecting pinout\nESP J3 Tx Rx Rx Tx GND GND VCC 3.3V CH_PD 3.3V For more Info check lokster | space\nFor connecting version 1.7 Anet boards Unlike older boards this board does not require you to remove any resistors.\nYou will have to solder two wires from number 9 and number 10 its recommender to connect these to pin 1 and 2 of J3 connector.\nAnycubic i3 mega - Trigorilla 8bit board To connect the ESP12e to the UART0. (Credits:197-murdock).\n(Green = RX, Blue = TX)\n5V (buck to 3.3v if directly connect to ESP - most development ESP boards already have this voltage limited built-in - but check!) and GND can be taken from the AUX3 exposed connector.\nUART0 is normally used by USB port so don’t use both together - so this hack piggybacks on that same port at UART level.\nAZSMZ LCD board AZSMZ-mini board If you don’t have the soldering skills to grab the connectors from the unpopulated ethernet connection, you can also get 3.3v and GND from the ISP header (bottom left on the diagram above).\nAzteeg X5 mini board BIQU KFB2.0 board all in one Ramps1.4/Mega2560 R3 controller based\nCreality CR10 Ender 3 board For the Sanguino based CR-10 and Ender printers you will need to solder to any of the via circled (can also be done in the backside of board), or to the legs of the Arduino or ftdi. Connect TX from the board to RX of Wemos D1 mini and RX from board to TX of Wemos D1 mini. 5v and GND are located in the six pin header next to the LCD connector.\nSince soldering might be difficult because the solder points are so close to each other, another option is to scrape off the insulation from the traces on the backside and solder there. Be extra careful not to scrape the surrounding ground plane. You need suitable fine scraping tools for this. The picture below shows an Ender-2 PCB.\nCreality Ender 4 board You will need to solder to small circle, or to the legs of the ATmega2560 (RXD0 pin 2, TXD0 pin 3)\nDavinci 1.0/2.0 board Davinci 1.0A board Alternate Module placement for increased WiFi range (outside metal chassis, antenna has vertical polarization)\nMKS boards To connect the ESP3D to the MKS GEN v1.2 (but the v1.3 and above 1.4 is the most used today).\nAn ESP12E with the standard schematics, the two resistor connected to the RX pin are substituted by a 1N4148 diode, like in the Adafruit Huzzah board.\nESP12E is connected to the AUX1\nESP12E RX is connected to the pin NEAR GND of the upper row (Marked TXD on pinout.)\nESP12E TX is connected to the adiacent pin at the end of the upper row (Marked RXD on pinout.)\nMKS Smoothieware board RADDS board RAMPS 1.4/Re-ARM board Ramps 1.4 can be used on Arduino Mega (repetier/marlin) and Re-ARM for ramps boards (smoothieware/marlin)\nAlternative pins if use Re-ARM (J4/UART port)\nSmoothieboard board SKR Mini E3 board This board is from Bigtreetech and went through various hardware revisions; all of them still feature a TFT pin header which is where you can tap the TX and RX needed. The wiring below is made with a 1.2 board, but the same applies for the other revisions as well; if you need the exact schematic for your mainboard version, you can check Bigtreetech’s github repository.\nYou literally cannot miss it because the TFT connector is labeled on the board; you can use dupont connectors for the wiring job, no soldering skills needed as long as your ESP comes with pre soldered headers. Just a heads up: the TFT connector provides 5V DC, so be sure to provide them on the correct ESP pin and, most importantly, if your ESP can work with 5 volts as input. You should also pay attention on the board orientation in the schematic, although I oriented it the same way as the actual picture on the left so it’s easier for you.\nWeedo Tina2 board This printer is also brand labelled as Monoprice MP cadet 3D printer\nIn marlin this connection is serial port 3.\nNote the Mega2560 is 5V powered and ESP is 3V3 powered.\nFor printer boards not listed here Vast majority of printers have an USB port that is converted to UART before going to MCU. Many printers also have additional (unused) UART port you can use. When possible, always use the additional port for connecting ESP to printer board. When no additional UART port is available you might use the Tx and Rx lines between USB/UART converter and MCU but it’s recommended to cut (in a reversible way) the line to USB/UART converter to avoid conflicts.\nIf the board is ATmega based the simplest way to find a usable UART port for the ESP is to open ATmega datasheet.\nESP boards ESP-01 Use GPIO2 to ground to reset all settings in hard way - 2-6 sec after boot / not before!! Set GPIO2 to ground before boot change boot mode and go to special boot that do not reach FW. Currently boot take 10 sec - giving 8 seconds to connect GPIO2 to GND and do an hard recovery for settings Use GPIO0 to ground to be in update mode ESP-01 serial wifi module more info about the Breakout PCB: keyestudio\nESP-12E/F ESP need 3.3v, it is not 5v tolerant, if printer board use more than 3.3V like 5V on ramps.\nyou can also use Logic LevelConverter Bi-Directional\nIn order to flash some ESP12E/F boards via their UART interface, the following pins need to be connected:\nVCC to GPIO2 GND to GPIO0 This has been tested with ESP-12-E boards labeled “ESP8266 For ESP3D FYSETC.COM”\nESP 12F serial wifi module ESP-12F based serial wifi module (eg from aliexpress ) contains built in 2-way levelshifter/bi-directional logic level converter. So it can be powered via 5V uart from the target’ motherboard.\nWe need to manualy ground the IO0 while powering up to start in flash mode while powering up (there is no switch for that, neither for reset) Use FTDI adapter as usb2serial Need to see in console/serial monitor boot mode is (1,7). baudrate: 74880 rst cause:2, boot mode:(3,7) Then flash like other esp based board for esp3d ESP32-Cam Note: 5V is power supply input and 3V3 is output from regulator. UART Tx and RX signals will be 3.3V\nNodeMCU V2/V3 Sonoff Relay is connected by GPIO12, it can be handled using ESP201 command:\n*Get/Set pin value\r[ESP201]P\u003cpin\u003e V\u003cvalue\u003e [PULLUP=YES RAW=YES]\rif no V\u003cvalue\u003e get P\u003cpin\u003e value\rif V\u003cvalue\u003e 0/1 set INPUT_PULLUP value, but for GPIO16 INPUT_PULLDOWN_16\rGPIO1 and GPIO3 cannot be used as they are used for serial\rif PULLUP=YES set input pull up, if not set input\rif RAW=YES do not set pinmode just read value\rSo [ESP201]P12 V0 should be off and [ESP201]P12 V1 should be on\nWemos D1 mini Connection with logic level conveter:\nexample:\nprinted cases:\nhttps://www.thingiverse.com/thing:4128593 https://www.thingiverse.com/thing:2671591 ",
    "description": "",
    "tags": null,
    "title": "Installation",
    "uri": "/esp3d/v2.x/installation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Installation",
    "uri": "/esp3d/v3.x/installation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Installation",
    "uri": "/esp3dlib/v1.x/installation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Installation",
    "uri": "/esp3dlib/v3.x/installation/index.html"
  },
  {
    "content": "What is version 3.X ? ",
    "description": "",
    "tags": null,
    "title": "Version 3.X",
    "uri": "/esp3d-webui/v3.x/index.html"
  },
  {
    "content": "What is version 3.X ? ",
    "description": "",
    "tags": null,
    "title": "Version 3.X",
    "uri": "/esp3d/v3.x/index.html"
  },
  {
    "content": "What is version 3.X ? ",
    "description": "",
    "tags": null,
    "title": "Version 3.X",
    "uri": "/esp3dlib/v3.x/index.html"
  },
  {
    "content": "git: https://git-scm.com/downloads\nVSCODE: https://code.visualstudio.com/download\nPlatformIO: https://platformio.org/install/ide?install=vscode\nESP3D configuration\nDescribe configuration settings…\nCompile and Flash\n",
    "description": "",
    "tags": null,
    "title": "VSCode \u0026 Platformio",
    "uri": "/esp3d/v2.x/installation/vscode-platformio/index.html"
  },
  {
    "content": "{\"cmd\":\"400\",\"status\":\"ok\",\"data\":[ {\"F\":\"network/network\",\"P\":\"130\",\"T\":\"S\",\"V\":\"esp3d\",\"H\":\"hostname\",\"S\":\"32\",\"M\":\"1\"}, {\"F\":\"network/network\",\"P\":\"0\",\"T\":\"B\",\"V\":\"1\",\"H\":\"radio mode\",\"O\":[{\"none\":\"0\"}, {\"sta\":\"1\"}, {\"ap\":\"2\"}]}, {\"F\":\"network/sta\",\"P\":\"1\",\"T\":\"S\",\"V\":\"WIFI_OFFICE_B2G\",\"S\":\"32\",\"H\":\"SSID\",\"M\":\"1\"}, {\"F\":\"network/sta\",\"P\":\"34\",\"T\":\"S\",\"N\":\"1\",\"V\":\"********\",\"S\":\"64\",\"H\":\"pwd\",\"M\":\"8\"}, {\"F\":\"network/sta\",\"P\":\"99\",\"T\":\"B\",\"V\":\"1\",\"H\":\"ip mode\",\"O\":[{\"dhcp\":\"1\"}, {\"static\":\"0\"}]}, {\"F\":\"network/sta\",\"P\":\"100\",\"T\":\"A\",\"V\":\"192.168.0.1\",\"H\":\"ip\"}, {\"F\":\"network/sta\",\"P\":\"108\",\"T\":\"A\",\"V\":\"192.168.0.1\",\"H\":\"gw\"}, {\"F\":\"network/sta\",\"P\":\"104\",\"T\":\"A\",\"V\":\"255.255.255.0\",\"H\":\"msk\"}, {\"F\":\"network/ap\",\"P\":\"218\",\"T\":\"S\",\"V\":\"ESP3D\",\"S\":\"32\",\"H\":\"SSID\",\"M\":\"1\"}, {\"F\":\"network/ap\",\"P\":\"251\",\"T\":\"S\",\"N\":\"1\",\"V\":\"********\",\"S\":\"64\",\"H\":\"pwd\",\"M\":\"8\"}, {\"F\":\"network/ap\",\"P\":\"316\",\"T\":\"A\",\"V\":\"192.168.0.1\",\"H\":\"ip\"}, {\"F\":\"network/ap\",\"P\":\"118\",\"T\":\"B\",\"V\":\"11\",\"H\":\"channel\",\"O\":[{\"1\":\"1\"}, {\"2\":\"2\"}, {\"3\":\"3\"}, {\"4\":\"4\"}, {\"5\":\"5\"}, {\"6\":\"6\"}, {\"7\":\"7\"}, {\"8\":\"8\"}, {\"9\":\"9\"}, {\"10\":\"10\"}, {\"11\":\"11\"}, {\"12\":\"12\"}, {\"13\":\"13\"}, {\"14\":\"14\"}]}, {\"F\":\"service/http\",\"P\":\"328\",\"T\":\"B\",\"V\":\"1\",\"H\":\"enable\",\"O\":[{\"no\":\"0\"}, {\"yes\":\"1\"}]}, {\"F\":\"service/http\",\"P\":\"121\",\"T\":\"I\",\"V\":\"80\",\"H\":\"port\",\"S\":\"65001\",\"M\":\"1\"}, {\"F\":\"service/telnetp\",\"P\":\"329\",\"T\":\"B\",\"V\":\"1\",\"H\":\"enable\",\"O\":[{\"no\":\"0\"}, {\"yes\":\"1\"}]}, {\"F\":\"service/telnetp\",\"P\":\"125\",\"T\":\"I\",\"V\":\"23\",\"H\":\"port\",\"S\":\"65001\",\"M\":\"1\"}, {\"F\":\"service/ftp\",\"P\":\"1021\",\"T\":\"B\",\"V\":\"1\",\"H\":\"enable\",\"O\":[{\"no\":\"0\"}, {\"yes\":\"1\"}]}, {\"F\":\"service/ftp\",\"P\":\"1009\",\"T\":\"I\",\"V\":\"21\",\"H\":\"control port\",\"S\":\"65001\",\"M\":\"1\"}, {\"F\":\"service/ftp\",\"P\":\"1013\",\"T\":\"I\",\"V\":\"20\",\"H\":\"active port\",\"S\":\"65001\",\"M\":\"1\"}, {\"F\":\"service/ftp\",\"P\":\"1017\",\"T\":\"I\",\"V\":\"55600\",\"H\":\"passive port\",\"S\":\"65001\",\"M\":\"1\"}, {\"F\":\"service/notification\",\"P\":\"1004\",\"T\":\"B\",\"V\":\"1\",\"H\":\"auto notif\",\"O\":[{\"no\":\"0\"}, {\"yes\":\"1\"}]}, {\"F\":\"service/notification\",\"P\":\"116\",\"T\":\"B\",\"V\":\"0\",\"H\":\"notification\",\"O\":[{\"none\":\"0\"}, {\"pushover\":\"1\"}, {\"email\":\"2\"}, {\"line\":\"3\"}]}, {\"F\":\"service/notification\",\"P\":\"332\",\"T\":\"S\",\"V\":\"********\",\"S\":\"63\",\"H\":\"t1\",\"M\":\"0\"}, {\"F\":\"service/notification\",\"P\":\"396\",\"T\":\"S\",\"V\":\"********\",\"S\":\"63\",\"H\":\"t2\",\"M\":\"0\"}, {\"F\":\"service/notification\",\"P\":\"855\",\"T\":\"S\",\"V\":\" \",\"S\":\"127\",\"H\":\"ts\",\"M\":\"0\"}, {\"F\":\"system/system\",\"P\":\"461\",\"T\":\"B\",\"V\":\"40\",\"H\":\"targetfw\",\"O\":[{\"repetier\":\"50\"}, {\"marlin\":\"20\"}, {\"smoothieware\":\"40\"}, {\"grbl\":\"10\"}, {\"unknown\":\"0\"}]}, {\"F\":\"system/system\",\"P\":\"112\",\"T\":\"I\",\"V\":\"115200\",\"H\":\"baud\",\"O\":[{\"9600\":\"9600\"}, {\"19200\":\"19200\"}, {\"38400\":\"38400\"}, {\"57600\":\"57600\"}, {\"74880\":\"74880\"}, {\"115200\":\"115200\"}, {\"230400\":\"230400\"}, {\"250000\":\"250000\"}, {\"500000\":\"500000\"}, {\"921600\":\"921600\"}]}, {\"F\":\"system/system\",\"P\":\"320\",\"T\":\"I\",\"V\":\"10000\",\"H\":\"bootdelay\",\"S\":\"40000\",\"M\":\"0\"}, ]} 1 - key : Settings\n2 - value: array of data formated like this\n{\"F\":\"network/network\",\"P\":\"130\",\"T\":\"S\",\"V\":\"esp3d\",\"H\":\"hostname\",\"S\":\"32\",\"M\":\"1\"} or\n{\"F\":\"service/notification\",\"P\":\"1004\",\"T\":\"B\",\"V\":\"1\",\"H\":\"auto notif\",\"O\":[{\"no\":\"0\"},{\"yes\":\"1\"}]} F: is filter formated as section/sub-section, if section is same as sub-section, it means no sub-section P: is id (also position reference so it is unique) T: is type of data which can be: S: for string I: for integer B: for Byte A: for IP address / Mask F: for float (only grblHAL) M: for bits mask (only grblHAL) X: for exclusive bitsfield (only grblHAL) V: is current value, if type is string and value is ********, (8 stars) then it is a password E: is integer for exactess / precision of float/double value (only grblHAL) U: is text unit of value (only grblHAL) H: is text label of value S: is max size if type is string, and max possible value if value is number (byte, integer) M: is min size if type is string, and min possible value if value is number (byte, integer) MS: is additionnal min size if type is string (e.g for password can be 0 or 8, so need additional min size), M should be the more minimal value so MS value must be between M and S O: is an array of {label:value} used for possible values in selection or bits labels list R: need restart to be applied Note: if Type M and X use O entry to define the label / position, if O is [] then axis label are used according need X, Y, Z, A, B, C\nNote2 : the 2.1 Flag type is no more used, several entries are used instead grouped by sub-section\nIf no json the list is limited to a list of \u003chelp\u003e: \u003cvalue\u003e\n",
    "description": "",
    "tags": null,
    "title": "[ESP400] format",
    "uri": "/esp3d-tft/v1.x/documentation/api/esp3d-esp400-format/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Documentation",
    "uri": "/esp3d-tft/v1.x/documentation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Documentation",
    "uri": "/esp3d-webui/v2.x/documentation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Documentation",
    "uri": "/esp3d-webui/v3.x/documentation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Documentation",
    "uri": "/esp3d/v2.x/documentation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Documentation",
    "uri": "/esp3d/v3.x/documentation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Documentation",
    "uri": "/esp3dlib/v1.x/documentation/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Documentation",
    "uri": "/esp3dlib/v3.x/documentation/index.html"
  },
  {
    "content": "What is ESP3D-TFT ? ",
    "description": "",
    "tags": null,
    "title": "ESP3D-TFT",
    "uri": "/esp3d-tft/index.html"
  },
  {
    "content": "Connection between ESP and printer board needs 4 wires:\nESP Tx needs to connect to Rx on MCU of printer board. ESP Rx needs to connect to Tx on MCU of printer board. You also need to power supply ESP board with with GND and 3V3 or 5V. Connecting ESP board to target board Be aware that ESP MCU is 3.3V on GPIO pin and some target board can be 3.3V and others 5V, so you may not be able to directly connect ESP board to target board.\nDisclaimer : this wiki is for reference - you are responsible of your board supporting or not 5V, we are not responsible for any damage of wrong wiring.\nESP32 and ESP8266 MCU are only supporting 3.3V. Power supply them with 5V will likelly fry them immediatelly. As MCU is supplied at 3.3V, Tx and Rx signals will be at 3.3V even when board is supplied with 5V. Wether Rx pin is supporting 5V is controversial so we will keep on the safe side and only take datahseet as reference. It’s not recommended to have any signal (including Rx) be higher than power supply (3.3V here).\nThere are several points to take care. One should check that\nMCU1 Tx voltage is lower than MCU2 supply voltage Voh_min of Tx is higher than Vih_min of Rx (to check both ways) Vol_max of Tx is lower than Vil_max of Rx (to check both ways) 1 is mandatory and resistor voltage divider bridge or level shiffter is recommended\n2 \u0026 3 are not destructive there is just a slight risk signals are not read correctly. But it will work in most case as the limit values given by datasheets are rarelly met in mild conditions (using near 25°C and low current flowing from Tx to Rx)\nFor the divider bridge a value of R1=1k and R2=2.2k will be fine. You could also use 10k and 22k or anything near a factor 2.\nConnection diagrams for some printers and ESP boards Printer motherboards Anet A8 boards Anycubic i3 mega - Trigorilla 8bit board AZSMZ LCD board AZSMZ-mini board Azteeg X5 mini board BIQU KFB2.0 board Creality CR10 Ender 3 board Creality Ender 4 board Davinci 1.0/2.0 board Davinci 1.0A board MKS boards MKS Smoothieware board RADDS board RAMPS 1.4/Re-ARM board Smoothieboard board SKR Mini E3 board Weedo Tina2 board For printer boards not listed here ESP boards ESP-01 ESP-01 serial wifi module ESP-12E/F ESP 12F serial wifi module ESP32-Cam NodeMCU V2/V3 Sonoff Wemos D1 mini Printer motherboards Anet A8 boards Anet boards up to v1.5 Step 1 You will also have to unsolder the resistors R52 and R53 – they are zero ohm resistors, and serve no other purpose than connecting the atmega chip directly to the onboard USB to UART converter (the CH340 chip). Do it VERY careful – you don’t want to damage your board. If you don’t feel confident – don’t do it.\nStep 2 Now prepare the printer’s motherboard. It requires a simple modification, that does not interfere with it’s operation afterwards – just solder 3 pin x 2 row male header on J8, and add 2 jumpers (or jumper wires) as shown on the picture:\nStep 3 Connect the ESP to J3 repsecting pinout\nESP J3 Tx Rx Rx Tx GND GND VCC 3.3V CH_PD 3.3V For more Info check lokster | space\nFor connecting version 1.7 Anet boards Unlike older boards this board does not require you to remove any resistors.\nYou will have to solder two wires from number 9 and number 10 its recommender to connect these to pin 1 and 2 of J3 connector.\nAnycubic i3 mega - Trigorilla 8bit board To connect the ESP12e to the UART0. (Credits:197-murdock).\n(Green = RX, Blue = TX)\n5V (buck to 3.3v if directly connect to ESP - most development ESP boards already have this voltage limited built-in - but check!) and GND can be taken from the AUX3 exposed connector.\nUART0 is normally used by USB port so don’t use both together - so this hack piggybacks on that same port at UART level.\nAZSMZ LCD board AZSMZ-mini board If you don’t have the soldering skills to grab the connectors from the unpopulated ethernet connection, you can also get 3.3v and GND from the ISP header (bottom left on the diagram above).\nAzteeg X5 mini board BIQU KFB2.0 board all in one Ramps1.4/Mega2560 R3 controller based\nCreality CR10 Ender 3 board For the Sanguino based CR-10 and Ender printers you will need to solder to any of the via circled (can also be done in the backside of board), or to the legs of the Arduino or ftdi. Connect TX from the board to RX of Wemos D1 mini and RX from board to TX of Wemos D1 mini. 5v and GND are located in the six pin header next to the LCD connector.\nSince soldering might be difficult because the solder points are so close to each other, another option is to scrape off the insulation from the traces on the backside and solder there. Be extra careful not to scrape the surrounding ground plane. You need suitable fine scraping tools for this. The picture below shows an Ender-2 PCB.\nCreality Ender 4 board You will need to solder to small circle, or to the legs of the ATmega2560 (RXD0 pin 2, TXD0 pin 3)\nDavinci 1.0/2.0 board Davinci 1.0A board Alternate Module placement for increased WiFi range (outside metal chassis, antenna has vertical polarization)\nMKS boards To connect the ESP3D to the MKS GEN v1.2 (but the v1.3 and above 1.4 is the most used today).\nAn ESP12E with the standard schematics, the two resistor connected to the RX pin are substituted by a 1N4148 diode, like in the Adafruit Huzzah board.\nESP12E is connected to the AUX1\nESP12E RX is connected to the pin NEAR GND of the upper row (Marked TXD on pinout.)\nESP12E TX is connected to the adiacent pin at the end of the upper row (Marked RXD on pinout.)\nMKS Smoothieware board RADDS board RAMPS 1.4/Re-ARM board Ramps 1.4 can be used on Arduino Mega (repetier/marlin) and Re-ARM for ramps boards (smoothieware/marlin)\nAlternative pins if use Re-ARM (J4/UART port)\nSmoothieboard board SKR Mini E3 board This board is from Bigtreetech and went through various hardware revisions; all of them still feature a TFT pin header which is where you can tap the TX and RX needed. The wiring below is made with a 1.2 board, but the same applies for the other revisions as well; if you need the exact schematic for your mainboard version, you can check Bigtreetech’s github repository.\nYou literally cannot miss it because the TFT connector is labeled on the board; you can use dupont connectors for the wiring job, no soldering skills needed as long as your ESP comes with pre soldered headers. Just a heads up: the TFT connector provides 5V DC, so be sure to provide them on the correct ESP pin and, most importantly, if your ESP can work with 5 volts as input. You should also pay attention on the board orientation in the schematic, although I oriented it the same way as the actual picture on the left so it’s easier for you.\nWeedo Tina2 board This printer is also brand labelled as Monoprice MP cadet 3D printer\nIn marlin this connection is serial port 3.\nNote the Mega2560 is 5V powered and ESP is 3V3 powered.\nFor printer boards not listed here Vast majority of printers have an USB port that is converted to UART before going to MCU. Many printers also have additional (unused) UART port you can use. When possible, always use the additional port for connecting ESP to printer board. When no additional UART port is available you might use the Tx and Rx lines between USB/UART converter and MCU but it’s recommended to cut (in a reversible way) the line to USB/UART converter to avoid conflicts.\nIf the board is ATmega based the simplest way to find a usable UART port for the ESP is to open ATmega datasheet.\nESP boards ESP-01 Use GPIO2 to ground to reset all settings in hard way - 2-6 sec after boot / not before!! Set GPIO2 to ground before boot change boot mode and go to special boot that do not reach FW. Currently boot take 10 sec - giving 8 seconds to connect GPIO2 to GND and do an hard recovery for settings Use GPIO0 to ground to be in update mode ESP-01 serial wifi module more info about the Breakout PCB: keyestudio\nESP-12E/F ESP need 3.3v, it is not 5v tolerant, if printer board use more than 3.3V like 5V on ramps.\nyou can also use Logic LevelConverter Bi-Directional\nIn order to flash some ESP12E/F boards via their UART interface, the following pins need to be connected:\nVCC to GPIO2 GND to GPIO0 This has been tested with ESP-12-E boards labeled “ESP8266 For ESP3D FYSETC.COM”\nESP 12F serial wifi module ESP-12F based serial wifi module (eg from aliexpress ) contains built in 2-way levelshifter/bi-directional logic level converter. So it can be powered via 5V uart from the target’ motherboard.\nWe need to manualy ground the IO0 while powering up to start in flash mode while powering up (there is no switch for that, neither for reset) Use FTDI adapter as usb2serial Need to see in console/serial monitor boot mode is (1,7). baudrate: 74880 rst cause:2, boot mode:(3,7) Then flash like other esp based board for esp3d ESP32-Cam Note: 5V is power supply input and 3V3 is output from regulator. UART Tx and RX signals will be 3.3V\nNodeMCU V2/V3 Sonoff Relay is connected by GPIO12, it can be handled using ESP201 command:\n*Get/Set pin value\r[ESP201]P\u003cpin\u003e V\u003cvalue\u003e [PULLUP=YES RAW=YES]\rif no V\u003cvalue\u003e get P\u003cpin\u003e value\rif V\u003cvalue\u003e 0/1 set INPUT_PULLUP value, but for GPIO16 INPUT_PULLDOWN_16\rGPIO1 and GPIO3 cannot be used as they are used for serial\rif PULLUP=YES set input pull up, if not set input\rif RAW=YES do not set pinmode just read value\rSo [ESP201]P12 V0 should be off and [ESP201]P12 V1 should be on\nWemos D1 mini Connection with logic level conveter:\nexample:\nprinted cases:\nhttps://www.thingiverse.com/thing:4128593 https://www.thingiverse.com/thing:2671591 ",
    "description": "",
    "tags": null,
    "title": "Hardware connection",
    "uri": "/esp3d/v2.x/installation/wiring/index.html"
  },
  {
    "content": "What is ESP3D-WEBUI ? ",
    "description": "",
    "tags": null,
    "title": "ESP3D-WEBUI",
    "uri": "/esp3d-webui/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Showcase",
    "uri": "/esp3d-tft/v1.x/showcase/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Showcase",
    "uri": "/esp3d-webui/v2.x/showcase/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Showcase",
    "uri": "/esp3d-webui/v3.x/showcase/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Showcase",
    "uri": "/esp3d/v2.x/showcase/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Showcase",
    "uri": "/esp3d/v3.x/showcase/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Showcase",
    "uri": "/esp3dlib/v1.x/showcase/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Showcase",
    "uri": "/esp3dlib/v3.x/showcase/index.html"
  },
  {
    "content": "Big thanks to :\n@disneysw for bringing this module idea @lkarlslund for suggestion about independent reset using GPIO2 Roy Cortes from Panucatt Devices for supporting and pushing me implementing great features all contributors, feedbacks owners and donations. ",
    "description": "",
    "tags": null,
    "title": "Credits",
    "uri": "/esp3d/v2.x/credits/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Credits",
    "uri": "/esp3d/v3.x/credits/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Categories",
    "uri": "/categories/index.html"
  },
  {
    "content": "",
    "description": "",
    "tags": null,
    "title": "Tags",
    "uri": "/tags/index.html"
  }
]
