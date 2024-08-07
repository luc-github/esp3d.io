---
archetype : "section"
title : "Installation"
menuPre : "<i class='fas fa-hammer'></i> "
weight : 2
---
### Download the project

#### Using git
* Clone repository   
`git clone https://github.com/luc-github/ESP3D-TFT.git ESP3D-TFT`
* Go to the project   
`cd ESP3D-TFT`
* Update the project submodules   
`git submodule update --init --recursive`

!!! info "Note"
    If you have limited network access and have issue to connect to GitHub, it is recommended to use [dev sidecar](https://github.com/docmirror/dev-sidecar) software.


#### Using release package

*Not ready yet, please be patient*

### Setup your development environment

<center>
<a href="https://code.visualstudio.com/download"><img src="/img/visual_studio_code.png" width="100px">Visual Studio Code</a>    
</center>


Download and install [VSCode](https://code.visualstudio.com/download)

### Install the espressif vscode extension

The [espressif extension](https://github.com/espressif/vscode-esp-idf-extension) can be installed using the extension manager.    

<center>
<a href="https://github.com/espressif/vscode-esp-idf-extension"><img src="/img/espressif.png" width="100px">Espressif Extension</a>    
</center>

Please follow the [official tutorial](https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/tutorial/install.md)

You can also install ESP-IDF offline .Especially suitable for people with slow download speeds.
- Download [installer](https://dl.espressif.cn/dl/esp-idf/).
- Installing the installer.
### Install the CMake extension and CMake Tools extension  in vscode

Cmake can automatically download the components required for ESP3D, such as camera and USB host.

### Configure the extension
- Select : View->Command palette 
- Type : configure esp

!!! info "Note"
    Currently ESP3D-TFT use the released version **5.1.2**  of the IDF, using another release version of the IDF is not supported.

If you install ESP-IDF offline, you need to select "UseExitSetup"

![image](UseExistSetup.png?width=400px)

Then select the ESP IDF installation path

### Open ESP3D-TFT project
- Go to file and select open folder where project is located

### Configure the CMakeLists.txt
Select the [target](/esp3d-tft/v1.x/hardware) according the hardware
```cmake
{% include "./cmakelists.txt" %}
```

### Clean / Compile / Flash
- Select : View->Command palette 
    - Type : ESP-IDF: (Clean / Build / Flash..)    

or

- Just use the bottom menu for all commands

![image](vscodeInterface.png?width=400px)

!!! info "Note"
    Sometime the build button failed and you must delete the build directory manualy

### Connect the TFT

!!! info "Note"
    If you use serial connection, to ensure the esp board and the connected board can communicate, be sure both boards use the same baud rate.