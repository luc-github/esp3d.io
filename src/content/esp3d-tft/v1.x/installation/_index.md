+++
archetype = "section"
title = "Installation"
menuPre = "<i class='fas fa-hammer'></i> "
weight = 2
+++
### Download the project

#### Using git
* Clone repository   
`git clone https://github.com/luc-github/ESP3D-TFT.git ESP3D-TFT`
* Go to the project   
`cd ESP3D-TFT`
* Update the project submodules   
`git submodule update --init`

#### Using release package

*Not ready yet, please be patient*

### Setup your development environment

{{% imglink url="https://code.visualstudio.com/download" width="100px" img="/images/visual_studio_code.png" %}}VS Code{{% /imglink %}}

Download and install [VSCode](https://code.visualstudio.com/download)

### Install the espressif vscode extension

The [espressif extension](https://github.com/espressif/vscode-esp-idf-extension) can be installed using the extension manager.    

{{% imglink url="https://github.com/espressif/vscode-esp-idf-extension" width="100px" img="/images/espressif.png" %}}Espressif Extension{{% /imglink %}}

Please follow the [official tutorial](https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/tutorial/install.md)

### Configure the extension
- Select : View->Command palette 
- Type : configure esp

Currently ESP3D-TFT use the version 5.1 (git version) of the IDF 

### Open ESP3D-TFT project
- Go to file and select open folder where project is located

### Configure the CMakeLists.txt
Select the [target](/esp3d-tft/v1.x/hardware) according the hardware
```cmake
{{% include file="/esp3d-tft/v1.x/installation/cmakelists.txt" %}}
```

### Clean / Compile / Flash
- Select : View->Command palette 
    - Type : ESP-IDF: (Clean / Build / Flash..)    

or

- Just use the bottom menu for all commands

