+++
description = "Description and sample code"
archetype = "section"
title = "Extensions API"
weight = 8
+++
## Table of content
- [Basic code](#basic-code)
- [Send message](#send-message)
- [Send GCODE command or ESP command](#send-gcode-command-or-esp-command)
- [Send web query](#send-web-query)
- [Send web upload](#send-web-upload)
- [Send webdownload request](#send-webdownload-request)
- [Send sound notification](#send-sound-notification)
- [Send toast notification](#send-toast-notification)
- [Send translation request](#send-translation-request)
- [Send capabilities request](#send-capabilities-request)
- [Save extension settings to preferences.json](#save-extension-settings-to-preferencesjson)
- [Send icon request](#send-icon-request)
- [Dispatch message to other extensions](#dispatch-message-to-other-extensions)
- [Send Modal dialog display request](#send-modal-dialog-display-request)
- [Sample codes](#sample-codes)


## Basic code

```
<script type="text/javascript">

//Send message to web ui
function sendMessage(msg){
    window.parent.postMessage(msg, '*');
}

//Process Message coming from webUI
function processMessage(eventMsg){
    //now process eventMsg.data
}

//Setup message listener from webUI
window.onload = (event) => {
  window.addEventListener("message", processMessage, false);
};

</script>

<div class="container">
Display your HTML here
</div>

```

As you can see code is minimal - it will fit a Frame, webui css / theme will be added by webUI after loaded, so you do not need to add any, you can use any of existing class available in webUI.

Communication between frame and main window is done by messages using objects (string / array based), do not use any object that could ne be cloned or loading will fail.

---

### Send message
message structure used by `window.parent.postMessage(msg, '*');` has a defined format, some parameters are madatories, some are optionals and some depend on message type:   
`{type:'<message type>', target:'webui', id:'[origin]', noDispatch:[true], XXX:YYY}`   
`<message type>` is mandatory, it define the purpose of the message  
`target:'webui'` is mandatory, it help to screen the message    
`id:'[origin]'` is optionnal, it define which id must read the response if any, if present it can be used by extension to filter message, no id means the message is for everyone   
`noDispatch:[true]` is optionnal, if true it will prevent to send answer if any, if not or set to false, it will send answer message if any   
`XXX:YYY` are optionals/mandatories according message type   

---

### Send GCODE command or ESP command
Example: `{type:'cmd', target:'webui',id:'terminal', content:'[ESP111]'}`   
**type** is `cmd` (mandatory)  
**target** is `webui` (mandatory)  
**id** is `terminal` (optional)  
**content** is the command that need to be sent, in our case `[ESP111]` (mandatory)

Note: there is no `noDispatch:true` so answer, if any from ESP firmware, will be sent   
Note 2: there is no way to prevent the answer to be spread if it come from external board from serial, even if `id` and `noDispatch` are set

* Answer format: check the `eventMsg.data`    

  - if success
    ```
    {
        "type": "cmd",
        "content": {
            "status": "success"
            "response": "192.168.1.111",
            "initiator": {  
                            "content":"[ESP111]",
                            "id":"terminal",
                            "target":"webui", 
                            "type":"cmd", 
                        }
        },
        "id": "terminal"
    }  
    ```
    **type** is `cmd`   
    **id** is the id set in command message to help to screen    
    **content** has the response's **status** which is `success`, the response it self **response**, in our case `192.168.1.111`  and also the  **initiator** is the initial command for reference   
  - if error  
  
    ```
    { 
        "type": "cmd", 
        "content": { 
            "status": "error", 
            "error":"Cannot connect", 
            "initiator": {  
                            "content":"[ESP111]",
                            "id":"terminal",
                            "target":"webui", 
                            "type":"cmd", 
                        }
        }, 
        "id":"terminal"
    }
    ```

    **type** is `error` for any error command   
    **id** is the id set in command message to help to screen    
    **content** has the response's **status** which is `error`, and the error it self **error**, in our case `Cannot connect` and also the  **initiator** is the initial command for reference

---

### Send web query
Example: `{type:'query', target:'webui', id:'filemanager', url:'files', args:{action:'list', path:'/'}}`
**type** is `query` (mandatory)  
**target** is `webui` (mandatory)  
**id** is `terminal` (optional)  
**url** is the base url in our case `files` for `/files` (mandatory)   
**args** is the set of arguments url in our case `{action:'list', path:'/'}` for `/files?action=list&path=/` (optional for query)   

Note:  `noDispatch:true` and `id:'term'` are applicable in this case if needed   


* Answer format: check the `eventMsg.data`   
  - if success   
  
    ```
    {
        "type": "query",
        "response": {
            "status": "success",
            "response": "{\"files\":[{\"name\":\"config.yaml\",\"size\":\"1.55 KB\"}],\"path\":\"/\",\"occupation\":\"35\",\"status\":\"ok\",\"total\":\"1.31 MB\",\"used\":\"470.08 KB\"}",
            "initiator": {
                            "type": "query", 
                            "target": "webui", 
                            "id": "filemanager", 
                            "url": "files", 
                            "args": {
                                        "action": "list", 
                                        "path": "/"
                                    }
                        }
        },
        "id": "filemanager"
    }
    ```
    
    **type** is `query` 
    **id** is the id set in output message to help to screen    
    **content** has the response's **status** which is `success`, the response it self **response**, in our case a JSON,  and also the  **initiator** is the initial command for reference   
    
  - if error   
  
    ```
    {
        "type": "query",
        "response": {
            "status": "error",
            "error": "Cannot connect",
            "initiator": {
                            "type": "query", 
                            "target": "webui", 
                            "id": "filemanager", 
                            "url": "files", 
                            "args": {
                                        "action": "list", 
                                        "path": "/"
                                    }
                        }
        },
        "id": "filemanager"
    }
    ```
        
    **type** is `query` 
    **id** is the id set in output message to help to screen    
    **content** has the response's **status** which is `error`, and the error it self **error**, in our case `Cannot connect` and also the  **initiator** is the initial command for reference

---

### Send web upload
Example: `{type:'upload', target:'webui', id:'filemanager', url:'files', content:[...],size:500, path:"/", filename:'file.txt'}`
**type** is `upload` (mandatory)  
**target** is `webui` (mandatory)  
**id** is `filemanager` (optional)  
**url** is the base url in our case `files` for `/files` (mandatory for upload)   
**content** is the file in an array object (mandatory) 
**size** is the file size (mandatory)   
**path** is the file target path (not including name) (mandatory) 
**size** is the filename (not including path) (mandatory) 
**args** is an object with optional arguments like for query, they are no used in post but in url itself

Note:  `noDispatch:true` and `id:'filemanager'` are applicable in this case if needed   


* Answer format: check the `eventMsg.data`   
    for upload the initiator does not contain the file content
  - if success   
  
    ```
    {
        "type": "upload",
        "response": {
            "status": "success",
            "response": "{\"files\":[{\"name\":\"config.yaml\",\"size\":\"1.55 KB\"},{\"name\":\"file.txt\",\"size\":\"500B\"}],\"path\":\"/\",\"occupation\":\"35\",\"status\":\"ok\",\"total\":\"1.31 MB\",\"used\":\"470.08 KB\"}",
            "initiator": {
                            "type":"upload", 
                            "target":"webui", 
                            "id":"filemanager", 
                            "url":"files",
                            "size":500, 
                            "path":"/", 
                            "filename":"file.txt"
                        }
        },
        "id": "filemanager"
    }
    ```
    
    **type** is `upload` 
    **id** is the id set in output message to help to screen    
    **content** has the response's **status** which is `success`, the response it self **response**, in our case a JSON,  and also the  **initiator** is the initial command for reference but without the file content 
    
  - progression message  
  
    ```
    {
        "type": "upload",
        "response": {
            "status": "progress",
            "progress": "100",
            "initiator": {
                            "type":"upload", 
                            "target":"webui", 
                            "id":"filemanager", 
                            "url":"files",
                            "size":500, 
                            "path":"/", 
                            "filename":"file.txt"
                        }
        },
        "id": "filemanager"
    }
    ```
    
    **type** is `upload` 
    **id** is the id set in output message to help to screen    
    **content** has the response's **status** which is `progress`, and the progression it self **progress**, in our case `100` = 100% and also the  **initiator** is the initial command for reference but without the file content


  - if error   
  
    ```
    {
        "type": "upload",
        "response": {
            "status": "error",
            "error": "Cannot connect",
            "initiator": {
                            "type":"upload", 
                            "target":"webui", 
                            "id":"filemanager", 
                            "url":"files",
                            "size":500, 
                            "path":"/", 
                            "filename":"file.txt"
                        }
        },
        "id": "filemanager"
    }
    ```
    
    **type** is `upload` 
    **id** is the id set in output message to help to screen    
    **content** has the response's **status** which is `error`, and the error it self **error**, in our case `Cannot connect` and also the  **initiator** is the initial command for reference but without the file content

---
### Send webdownload request
Example: `{type:'download', target:'webui', id:'filemanager', url:'preferences.json'}`
**type** is `download` (mandatory)  
**target** is `webui` (mandatory)  
**id** is `filemanager` (optional)  
**url** is the url of the file in our case `preferences.json` for `/preferences.json` (mandatory)   
**args** is an object with optional arguments like for query

Note:  `id:'filemanager'` is applicable in this case if needed, but not  `noDispatch:true` as the purpose is to get response


* Answer format: check the `eventMsg.data`   
  - if success   
  
    ```
    {
        "type": "download",
        "response": {
            "status": "success",
            "response": [...],
            "initiator": {
                            "type":"download", 
                            "target":"webui", 
                            "id":"filemanager", 
                            "url":"preferences.json",
                        }
        },
        "id": "filemanager"
    }
    ```
    
    **type** is `upload` 
    **id** is the id set in output message to help to screen    
    **content** has the response's **status** which is `success`, the response it self **response**, in our case a blob  which is the file that need to be read properly, and also the  **initiator** is the initial command for reference 
    
  - progression message  
  
    ```
    {
        "type": "upload",
        "response": {
            "status": "progress",
            "progress": "100",
            "initiator": {
                            "type":"upload", 
                            "target":"webui", 
                            "id":"filemanager", 
                            "url":"preferences.json",
                        }
        },
        "id": "filemanager"
    }
    ```
    
    **type** is `download` 
    **id** is the id set in output message to help to screen    
    **content** has the response's **status** which is `progress`, and the progression it self **progress**, in our case `100` = 100% and also the  **initiator** is the initial command for reference


  - if error   
  
    ```
    {
        "type": "download",
        "response": {
            "status": "error",
            "error": "404",
            "initiator": {
                            "type":"upload", 
                            "target":"webui", 
                            "id":"filemanager", 
                            "url":"preferences.json",
                        }
        },
        "id": "filemanager"
    }
    ```
    
    **type** is `download` 
    **id** is the id set in output message to help to screen    
    **content** has the response's **status** which is `error`, and the error it self **error**, in our case `404` (file not found) and also the  **initiator** is the initial command for reference

---
### Send sound notification
There is no answer for this message, so `id` is not necessary  

  - Generate a beep notification   
    Example: `{type:'sound', target:'webui', content:'beep'}`   
    **type** is `` (mandatory)  
    **target** is `webui` (mandatory)  
    **sound** is the sound type, in our case `beep` (mandatory)   

  - Generate a beep error notification   
    Example: `{type:'sound', target:'webui', content:'error'}`   
    **type** is `` (mandatory)  
    **target** is `webui` (mandatory)  
    **sound** is the sound type, in our case `error` (mandatory)  

  - Generate a beep sequence notification   
    Example: `{type:'sound', target:'webui', content:'beep', seq:[{ f: 1046, d: 200 },{ f: 1318, d: 100 }]}`   
    **type** is `` (mandatory)  
    **target** is `webui` (mandatory)  
    **sound** is the sound type, in our case `seq` (mandatory)  
    **seq** is an array of sequence of beep, in our case `[{ f: 1046, d: 200 },{ f: 1318, d: 100 }]` (mandatory),  `f` is frequency and `d` is duration of the beep

---
### Send toast notification
There is no answer for this message, so `id` is not necessary  

  - Generate a success toast notification   
    Example: `{type:'toast', target:'webui', content:{text:'This is a success', type:'success'}}`   
    **type** is `` (mandatory)  
    **target** is `webui` (mandatory)  
    **content** has the toast **type**, in our case `success`, and the **text** to display, in ou case `This is a success` (mandatory)   

- Generate an error toast notification   
    Example: `{type:'toast', target:'webui', content:{text:'This is an error', type:'error'}}`   
    **type** is `` (mandatory)  
    **target** is `webui` (mandatory)  
    **content** has the toast **type**, in our case `error`, and the **text** to display, in ou case `This is an error` (mandatory)   
  
- Generate a normal toast notification   
    Example: `{type:'toast', target:'webui', content:{text:'This is a toast', type:'default'}}`   
    **type** is `` (mandatory)  
    **target** is `webui` (mandatory)  
    **content** has the toast **type**, in our case `default`, and the **text** to display, in ou case `This is a toast` (mandatory)   

---
### Send translation request
- simple translation
    Example: `{type:'translate', target:'webui', id:'transpanel', content:'S153'}`   
    **type** is `translate` (mandatory)  
    **target** is `webui` (mandatory)  
    **id** is `transpanel` (optional)  
    **content** is the text that need to be translated, in our case `S153` (mandatory)

    * Answer format: check the `eventMsg.data`   

        ```
        {
            "type": "translate",
            "content": {
                "response": "Your session will end soon, do you want to stay connected ?",
                "initiator": {
                                "type":"translate", 
                                "target":"webui", 
                                "id":"transpanel", 
                                "content":"S153"
                            }
            },
            "id": "transpanel"
        }  
        ```
        **type** is `translate`   
        **id** is the id set in command message to help to screen    
        **content** has the response it self **response**, in our case `Your session will end soon, do you want to stay connected ?` and also the  **initiator** is the initial command for reference   

 - full dump of translations  
    Example: `{type:'translate', target:'webui', id:'transpanel', all:'true'}`   
    **type** is `translate` (mandatory)  
    **target** is `webui` (mandatory)  
    **id** is `transpanel` (optional)  
    **all** to take all translations (mandatory)

    * Answer format: check the `eventMsg.data`   

        ```
        {
            "type": "translate",
            "content": {
                "response": "Your session will end soon, do you want to stay connected ?",
                "initiator": {
                                "type":"translate", 
                                "target":"webui", 
                                "id":"transpanel", 
                                "content":[....]
                            }
            },
            "id": "transpanel"
        }  
        ```
        **type** is `translate`   
        **id** is the id set in command message to help to screen    
        **content** has the response it self **response**, in our case an array of all translations and also the  **initiator** is the initial command for reference   

---
### Send capabilities request

This allow to collect all capabilities for specific topic:   
* if id is `connection` you will get the json of [ESP800] response jsonified
* if id is `features` you will get the [ESP400] response jsonified
* if id is `interface` you will get the settings from preferences.json jsonified
* if id is `settings` you will get specific settings from target fw in json format
* if id is `extensions` you will get the extensions from preferences.json jsonified

Be noted this API only collect existing data, so for `features`,`interface`, `extensions`and `settings` you may get empty response if corresponding query has not be done.

About settings the format may differ from one firmware to another, so you need to check the response to know how to use it, response is always a variable named machineSettings and important content may usualy located in `machineSettings.cache` 

Example: `{type:'capabilities', target:'webui', id:'connection'}`   
**type** is `capabilities` (mandatory)  
**target** is `webui` (mandatory)  
**id** is `connection` (mandatory)  

* Answer format: check the `eventMsg.data`   

    ```
    {
        "type": "capabilities",
        "content": {
            "response": "{
				"FWVersion": "3.0.0.a111",
				"FWTarget": "marlin",
				"FWTargetID": "40",
				"Setup": "Enabled",
				"Screen": "HMI V3",
				"Streaming": "Enabled",
				"SDConnection": "direct",
				"SerialProtocol": "Raw",
				"Authentication": "Disabled",
				"WebCommunication": "Asynchronous",
				"WebSocketIP": "localhost",
				"WebSocketPort": "81",
				"Hostname": "esp3d",
				"WiFiMode": "STA",
				"WebUpdate": "Enabled",
				"FlashFileSystem": "LittleFS",
				"HostPath": "/",
				"Time": "none",
				"HostTarget": "files",
				"HostUploadPath": "/",
				"HostDownloadPath": "/",
				"wsID": "0"
			}",
            "initiator": {
                            "type":"capabilities", 
                            "target":"webui", 
                            "id":"connection"
                        }
        },
        "id": "connection"
    }  
    ```
    **type** is `capabilities`   
    **id** is the id of requested capability  
    **content** has the response it self **response**, in our case a JSON and also the  **initiator** is the initial command for reference 

---
### Save extension settings to preferences.json

This allow to save extension settings to preferences.json, it is a way to store settings for extension that need to be saved for next session:   


Example: `{type:'extensionsData', target:'webui', id:'myextension', content:'{"setting1":"value1","setting2":"value2"}'}`   

**type** is `extensionsData` (mandatory)  
**target** is `webui` (mandatory)  
**id** is `myextension` (mandatory)  
**content** is the settings to save, in stringified JSON format, in our case `{"setting1":"value1","setting2":"value2"}` (mandatory)

* Answer format: check the `eventMsg.data`   

    ```
    {
        "type": "extensionsData",
        "content": {
            "response": "{
				"status": "success"
			}",
            "initiator": {
                            "type":"extensionsData", 
                            "target":"webui", 
                            "id":"myextension",
                            "content":"{"setting1":"value1","setting2":"value2"}"
                        }
        },
        "id": "myextension"
    }  
    ```
    **type** is `extensionsData`   
    **id** is the id of extension that saved settings
    **content** has the response which is the status and also the  **initiator** is the initial command for reference 

---
### Send icon request

The WebUI already a set of icons, so no need to bother with new icons, you can request a specific one if needed

Be noted some icons may be specific to a system, so it may not be available in all systems

Main icons are :
```
None: null,
Activity: <Activity />,
AlertCircle: <AlertCircle />,
Anchor: <Anchor />,
Aperture: <Aperture />,
Award: <Award />,
BarChart: <BarChart />,
BellOff: <BellOff />,
Bell: <Bell />,
Bluetooth: <Bluetooth />,
Bookmark: <Bookmark />,
Box: <Box />,
Camera: <Camera />,
Cast: <Cast />,
ChevronDown: <ChevronDown />,
ChevronLeft: <ChevronLeft />,
ChevronRight: <ChevronRight />,
ChevronUp: <ChevronUp />,
ChevronsDown: <ChevronsDown />,
ChevronsLeft: <ChevronsLeft />,
ChevronsRight: <ChevronsRight />,
ChevronsUp: <ChevronsUp />,
Clipboard: <Clipboard />,
Clock: <Clock />,
Cpu: <Cpu />,
Crosshair: <Crosshair />,
Database: <Database />,
Delete: <Delete />,
Download: <Download />,
Droplet: <Droplet />,
Edit: <Edit />,
EyeOff: <EyeOff />,
Eye: <Eye />,
File: <File />,
Filter: <Filter />,
Flag: <Flag />,
Frown: <Frown />,
GitCommit: <GitCommit />,
Globe: <Globe />,
Grid: <Grid />,
HardDrive: <HardDrive />,
Hash: <Hash />,
Heart: <Heart />,
HelpCircle: <HelpCircle />,
Home: <Home />,
Image: <Image />,
Info: <Info />,
Layers: <Layers />,
LifeBuoy: <LifeBuoy />,
List: <List />,
Loader: <Loader />,
Lock: <Lock />,
LogIn: <LogIn />,
LogOut: <LogOut />,
Mail: <Mail />,
MapPin: <MapPin />,
Meh: <Meh />,
Menu: <Menu />,
MessageSquare: <MessageSquare />,
MinusCircle: <MinusCircle />,
Monitor: <Monitor />,
Moon: <Moon />,
MoreHorizontal: <MoreHorizontal />,
MoreVertical: <MoreVertical />,
Move: <Move />,
PauseCircle: <PauseCircle />,
Percent: <Percent />,
PlayCircle: <PlayCircle />,
PlusCircle: <PlusCircle />,
Power: <Power />,
Printer: <Printer />,
Radio: <Radio />,
RefreshCw: <RefreshCw />,
Repeat: <Repeat />,
RotateCcw: <RotateCcw />,
Save: <Save />,
Scissors: <Scissors />,
Send: <Send />,
Server: <Server />,
Settings: <Settings />,
Share: <Share />,
Slash: <Slash />,
Sliders: <Sliders />,
Smile: <Smile />,
Star: <Star />,
StopCircle: <StopCircle />,
Sun: <Sun />,
Sunrise: <Sunrise />,
Sunset: <Sunset />,
Tag: <Tag />,
Target: <Target />,
Terminal: <Terminal />,
Thermometer: <Thermometer />,
Tool: <Tool />,
Trash2: <Trash2 />,
Underline: <Underline />,
Upload: <Upload />,
VideoOff: <VideoOff />,
Video: <Video />,
VolumeX: <VolumeX />,
Volume: <Volume />,
WifiOff: <WifiOff />,
Wifi: <Wifi />,
Wind: <Wind />,
XCircle: <XCircle />,
ZapOff: <ZapOff />,
Zap: <Zap />,
```

3D printers have in addition:

```
Fan, 
FeedRate, 
FlowRate, 
Extruder
```

cnc  has in addition :

```
Fan, 
FeedRate, 
FlowRate,
```

Example: `{type:'icon', target:'webui', id:'Activity'}`   
**type** is `icon` (mandatory)  
**target** is `webui` (mandatory)  
**id** is `Activity` (mandatory)  

* Answer format: check the `eventMsg.data`   

    ```
    {
    "type": "icon",
    "content": {
        "response": "%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2222%2012%2018%2012%2015%2021%209%203%206%2012%202%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E",
        "initiator": {
            "type": "icon",
            "target": "webui",
            "id": "Activity"
        }
    },
    "id": "Activity"
    }
    ```
    **type** is `icon`   
    **id** is the id of requested "Activity"  
    **content** has the response it self **response**, in our case uriencoded svg , also the **initiator** is the initial command for reference   

---
### Dispatch message to other extensions

Example: `{type:'dispatch', target:'webui', id:'senderpanel', content:'any message' , targetid:'receiverpanel'}`   
**type** is `dispatch` (mandatory)  
**target** is `webui` (mandatory)  
**id** is `senderpanel` (optional)  
**content** the message to dispatch using   

Note: there no answer as the purpose of this is to send answer

---
### Send Modal dialog display request

- Simple modal
    Example: `{type:'modal', target:'webui', id:'modalpanel', content:{title:'This is tile', id:'simple_modal', style:'default', bt1Txt:'S126', response1:'ok', text:'some text', overlay:true}}`   
    **type** is `modal` (mandatory)  
    **target** is `webui` (mandatory)  
    **id** is `modalpanel` (optional)  
    **content** is modal deescription:     
    - **title** of the modal (mandatory), `This is tile` is used as example but you better use predefined text that could be translated
    - **id** is modal id (mandatory), here `simple_modal`  
    - **style** is modal style (mandatory), for simple modal it is `default`,   
    - **bt1Txt** is the text to show on button 1 (optional), `S126` will be translated as `Ok`, if not defined button won't be displayed   
    - **response1** is the message sent if button 1 is clicked (optional), here `ok`, the click close the modal   
    - **bt2Txt** is the text to show on button 2 (optional), if not defined button won't be displayed   
    - **response2** is the message sent if button 2 is clicked (optional), the click close the modal  
    - **hideclose** if set and true it will hide the cross button to close the modal (optional)  
    - **overlay** if set and true it will automatically close modal if modal loose focus (optional)  
    - **text** display the text in modal, if it is predefined's one it will be translated (optional)

    Note: close button and overlay feature won't send any notification when modal is closed, be aware of it

    * Answer format: check the `eventMsg.data`   

        ```
        {
            "type": "modal",
            "content": {
                "response": "ok",
                "initiator": {
                                type:'modal', 
                                target:'webui', 
                                id:'modalpanel', 
                                content : { 
                                            "title":"This is tile", 
                                            "id":"simple_modal", 
                                            "style":"default", 
                                            "bt1Txt":"S126", 
                                            "response1":"ok", 
                                            "text":"some text", 
                                            "overlay":true
                                          }
                             }
            },
            "id": "modalpanel"
        }  
        ```
        **type** is `modal`   
        **id** is the id set in command message to help to screen    
        **content** has the response it self **response**, in our case `ok` because only one button, and also the  **initiator** is the initial command for reference   

- Confirmation modal
    Example: `{type:'modal', target:'webui', id:'modalpanel', content:{title:'S26', id:'confirm_modal',style:'question',bt1Txt:'S27', response1:'yes',bt2Txt:'S28', response2:'cancel', text:'S30',hideclose:true}}`   
    **type** is `modal` (mandatory)  
    **target** is `webui` (mandatory)  
    **id** is `modalpanel` (optional)  
    **content** is modal deescription:     
    - **title** of the modal (mandatory), `S26` will be translated as `Please Confirm`    
    - **id** is modal id (mandatory), here `confirmation_modal` 
    - **style** is modal style (mandatory), for confirmation modal it is `question`,   
    - **bt1Txt** is the text to show on button 1 (optional), here `S27` will be translated as `Yes`, if not defined button won't be displayed   
    - **response1** is the message sent if button 1 is clicked (optional), here `yes`, the click close the modal   
    - **bt2Txt** is the text to show on button 2 (optional), here `S28` will be translated as `Cancel`, if not defined button won't be displayed   
    - **response2** is the message sent if button 2 is clicked (optional), here `cancel`, the click close the modal  
    - **hideclose** if set and true it will hide the cross button to close the modal (optional)  
    - **overlay** if set and true it will automatically close modal if modal loose focus (optional)  
    - **text** display the text in moda  (optional), here `S30` will be translated as`Do you want to update?`

    Note: close button and overlay feature won't send any notification when modal is closed, be aware of it

    * Answer format: check the `eventMsg.data`   

        ```
        {
            "type": "modal",
            "content": {
                "response": "yes",
                "initiator": {
                                type:'modal', 
                                target:'webui', 
                                id:'modalpanel', 
                                content : { 
                                            "title":"S26", 
                                            "id":"confirmation_modal", 
                                            "style":"question", 
                                            "bt1Txt":"S27", 
                                            "response1":"yes",
                                            "bt2Txt":"S28", 
                                            "response2":"cancel", 
                                            "text":"S30", 
                                            "hideclose":true
                                          }
                             }
            },
            "id": "modalpanel"
        }  
        ```
        **type** is `modal`   
        **id** is the id set in command message to help to screen    
        **content** has the response it self **response**, in our case `yes` because user clicked on button 1, and also the  **initiator** is the initial command for reference   

- Input modal
    Example: `{type:'modal', target:'webui', id:'modalpanel', content:{title:'S90', id:'input_modal',style:'input',bt1Txt:'S106', response1:'create',bt2Txt:'S28', response2:'cancel', text:'S104',hideclose:true}}`   
    **type** is `modal` (mandatory)  
    **target** is `webui` (mandatory)  
    **id** is `modalpanel` (optional)  
    **content** is modal deescription:     
    - **title** of the modal (mandatory), `S90` will be translated as `Create Directory`    
    - **id** is modal id (mandatory), here `inputmodal` 
    - **style** is modal style (mandatory), for input modal it is `input`,   
    - **bt1Txt** is the text to show on button 1 (optional), here `S106` will be translated as `Create`, if not defined button won't be displayed   
    - **response1** is the message sent if button 1 is clicked (optional), here `create`, the click close the modal   
    - **bt2Txt** is the text to show on button 2 (optional), here `S28` will be translated as `Cancel`, if not defined button won't be displayed   
    - **response2** is the message sent if button 2 is clicked (optional), here `cancel`, the click close the modal  
    - **hideclose** if set and true it will hide the cross button to close the modal (optional)  
    - **overlay** if set and true it will automatically close modal if modal loose focus (optional)  
    - **text** display the text in moda  (optional), here `S104` will be translated as`Please type directory name`

    Note: close button and overlay feature won't send any notification when modal is closed, be aware of it

    * Answer format: check the `eventMsg.data`   

        ```
        {
            "type": "modal",
            "content": {
                "response": "create",
                "inputData": "mydir"
                "initiator": {
                                type:'modal', 
                                target:'webui', 
                                id:'modalpanel', 
                                content : { 
                                            "title":"S90", 
                                            "id":"input_modal", 
                                            "style":"input", 
                                            "bt1Txt":"S106", 
                                            "response1":"create",
                                            "bt2Txt":"S28", 
                                            "response2":"cancel", 
                                            "text":"S104", 
                                            "hideclose":true
                                          }
                             }
            },
            "id": "modalpanel"
        }  
        ```
        **type** is `modal`   
        **id** is the id set in command message to help to screen    
        **content** has the response it self **response**, in our case `create` because user clicked on button 1, and the text entered is in **inputData**, here `mydir`, and also the  **initiator** is the initial command for reference

        Note: **inputData** is present for both buttons clicked, so screening must be done according response


## Install an extension in Web UI

### Upload it to local filesystem or any path available to web server
![image](upload_extension.png)

### Add extra panel or page using this extension
![image](add_extension.png)

It will be displayed according your settings
![image](extra_extension_panel.png)

## Sample codes   
{{% resources color="blue" icon="fas fa-paperclip" sort="asc" pattern=".*\.(gz)"/%}}
