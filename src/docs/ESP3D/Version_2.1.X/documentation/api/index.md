---
description : "API description"
archetype : "section"
title : "API"
weight : 4
menuPre : "<i class='fas fa-cogs'></i> "
---

## Web Handlers 

### / (GET)
root is the default handler where all files will be served, if no file is defined, it looks for index.html or index.html.gz (compressed)
if you call specific file, it will look for the filename and filename.gz (compressed)
if no file is defined and there is not index.html(.gz) it will display embedded page
another way to show the embedded page is /?forcefallback=yes


### /files (GET/POST)
this handler handle all commands for FS, including upload on FS.   
    possible options/arguments are:   
- `quiet=yes` can be used when you don't want list files but just upload them    
- `path=...` define the path to the file    
- `action=...` define the action to execute which can be:  
        - `delete`   
            delete the file defined by `filename=...` it will also use `path=...` to do full path  
        - `deletedir`  
            delete the directory defined by `filename=...` it will also use `path=...` to do full path    
        - `createdir`
             create the directory defined by `filename=...` it will also use `path=...` to do full path  
- `<filename>S=...` give the size of uploaded file with <filename> name, need to be set before file is set in upload, POST only   

the output is a json file:  

    ```
    {   
        "files":[ //the files list  
            {  
                "name":"index.html.gz", //the name of the file
                "size":"83.46 KB", //the formated size of the file 
                "time":"2022-09-04 11:56:05" //the time when the file was modified last time, this one is optional and depend on (FILESYSTEM_TIMESTAMP_FEATURE)
            },
            {
                "name":"subdir", //the name of the file / directory
                "size":"-1", //the size is -1 because it is a directory
                "time":"" //no time for directories optional as depend on (FILESYSTEM_TIMESTAMP_FEATURE)
            }
        ],
        "path":"/", //current path
        "occupation":"52", //% of occupation
        "status":"subdir created", //status 
        "total":"192.00 KB", //Formated total space of Filesystem
        "used":"100.00 KB" //Formated used space of Filesystem
    }
    ```

### /upload_serial (POST)
this handler is for uploading files to printer SD using M28/M29 protocol

### /command (GET)
this handler is for all commands the parameter is `cmd=...`
if it is an `[ESPXXX]` command the answer is the `[ESPXXX]` response
if it is not an `[ESPXXX]` command the answer is `ESP3D says: command forwarded` and can be ignored

### /login (GET/POST)
this handler is for authentication function if enabled
    possible options/arguments are:  
        - `DISCONNECT=YES`
            it will clear current session, remove authentication cookie, set status to `disconnected` and response code to 401
        - `SUBMIT=YES`
            to login it will need also `PASSWORD=...` and `USER=...`, the answer will be 200 if success and 401 if failed
            if user is already authenticated it can use `NEWPASSWORD=...` instead of `PASSWORD=...` to change his password, if successful answer will be returned with code 200, otherwise code will be 500 if change failed or if password format is invalid

### /config (GET)
this handler is a shortcut to [ESP420] command in text mode, to get output in json add `json=yes`

### /updatefw (POST)
this handler is for FW upload and update

### /description.xml (GET)
this handler is for SSDP if enabled to present device informations  

```
<root xmlns="urn:schemas-upnp-org:device-1-0">
    <specVersion>
        <major>1</major>
        <minor>0</minor>
    </specVersion>
    <URLBase>http://192.168.2.178:80/</URLBase>
    <device>
        <deviceType>urn:schemas-upnp-org:device:upnp:rootdevice:1</deviceType>
        <friendlyName>esp3d</friendlyName>
        <presentationURL>/</presentationURL>
        <serialNumber>52332</serialNumber>
        <modelName>ESP Board</modelName>
        <modelDescription/>
        <modelNumber>ESP3D 3.0</modelNumber>
        <modelURL>https://www.espressif.com/en/products/devkits</modelURL>
        <manufacturer>Espressif Systems</manufacturer>
        <manufacturerURL>https://www.espressif.com</manufacturerURL>
        <UDN>uuid:38323636-4558-4dda-9188-cda0e600cc6c</UDN>
        <serviceList/>
        <iconList/>
    </device>
</root>
```
### Captive portal bypass handlers
to avoid a redirect to index.html and so a refresh of the page, some classic handler have been added so they all go to / handler actually
 - /generate_204
 - /gconnectivitycheck.gstatic.com
 - /fwlink/


## Web Socket 
**Only for WebUI not for bridge data**

use subprotocol `arduino` and web port +1 (e.g: 80+1=>81)

### <u>text mode</u>

Reserved
messages between webui / ESP
Format: `<label>:<message>`

-   from ESP to WebUI

    -   `CURRENT_ID:<id>`
        Sent when client is connecting, it is the last ID used and become the active ID

    -   `ACTIVE_ID:<id>`
        Broadcast current active ID, when new client is connecting, client without this is <id> should close, ESP WS Server close all open WS connections but this one also

    -   `ERROR:<code>:<message>`
        If an error raise when doing upload, it informs client it must stop uploading because sometimes the http answer is not possible,
        or cannot cancel the upload, this is a workaround as there is no API in current webserver to cancel active upload

    -   `DHT: <value>C`
        The DHT sensor connected to ESP like DHT22


### <u>binary mode</u>

Reserved

-   from ESP to WebUI
    serial stream data from ESP to WebUI

-   from WEBUI to ESP  
    [Not used]