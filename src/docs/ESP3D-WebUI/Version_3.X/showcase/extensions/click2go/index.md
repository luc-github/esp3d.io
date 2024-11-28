---
archetype : "section"
title : "Click to go"
description : " A simple extension that allows you to move your printer nozzle or your cnc tool to a specific position when you click on a web page"
menuPre : "<i class='far fa-eye'></i> "
weight : 1
---

This ESP3D-WebUI extension allows you to visualize and interact with a represention of the workspace of your machine. It offers the following features:  

* Display the workspace with X and Y axes, along with customizable graduations.
* Support for mouse and touch interactions, providing intuitive control.
* Real-time display of the machine coordinates of the cursor or touch point.
* Customizable UI styles using CSS variables.
* Customisable travel command to send to the machine.
* Customizable precision of the coordinates.

#### Where to find the extension?

The extension is available on the [ESP3D github](https://github.com/luc-github/ESP3D-WEBUI/tree/3.0/extensions/click2go).

The ready to use package is available in dist directory [here](https://github.com/luc-github/ESP3D-WEBUI/raw/refs/heads/3.0/extensions/click2go/dist/click2go.html.gz)

#### How to install the extension?

Just follow instructions of standard extension installation from [here](../../../documentation/extensions/#install-an-extension-in-web-ui)

!!! info "Note"
    The ready to use package is compressed with gzip, do not uncompress it, upload it as it is to the ESP3D-WebUI and set the file name to `click2go.html` when you set it, do not add `.gz` extension to the name.

#### Configuration

Go to settings
![image](settings.png?width=400px)

Set the following parameters:

* define the size of the workspace
* define the precision of the coordinates
* define the steps you want to display on the workspace
* define the speed of the travel command
* define the travel command to send to the machine

!!! info "Note"
    By default the travel command use absolute coordinates G1, on CNC machines you may want to change to jog command `$J=G1 X{X} Y{Y} F{f}`


#### How to use the extension?

Main UI:   

The red coordinates are the cursor position

![image](mainui.png?width=400px)

Click on the workspace to move the machine to the clicked position, that is all !   

The blue coordinates are latest clicked position.

![image](click.png?width=400px)