---
archetype : "section"
title : "GCode Viewer for 3D Printer files"
description : " A simple extension that allows to display the G-code file in a web page"
menuPre : "<i class='far fa-eye'></i> "
weight : 2
---
This ESP3D-WebUI extension  is a WebGL-based G-code viewer designed to provide an interactive and high-performance visualization of G-code files directly in the web browser.   
It offers the following features:  

* Real-time 3D rendering of 3D printing toolpaths.   
* Efficient loading and processing of large G-code files.  
* Intuitive user interface with visualization controls.  
* Dynamic filtering of print layers.  
* Customizable viewing options (auto-rotation, axis inversion, etc.).  
* Performance optimizations for smooth experience even with complex models.  

#### Where to find the extension?

The extension is available on the [ESP3D github](https://github.com/luc-github/ESP3D-WEBUI/tree/3.0/extensions/gcodeViewer).

The ready to use package is available in dist directory [here](https://github.com/luc-github/ESP3D-WEBUI/raw/refs/heads/3.0/extensions/gcodeViewer/dist/gcodeViewer.html.gz)

#### How to install the extension?

Just follow instructions of standard extension installation from [here](../../../documentation/extensions/#install-an-extension-in-web-ui)

!!! info "Note"
    The ready to use package is compressed with gzip, do not uncompress it, upload it as it is to the ESP3D-WebUI and set the file name to `gcodeViewer.html` when you set it, do not add `.gz` extension to the name.

#### Configuration

Go to settings using the menu:
![image](menu.png?width=400px)

![image](settings.png?width=400px)

You define the following preferences:
* Show/Hide the travel paths
* Invert X/Y axis 
* Invert front/back view
* Enable/Disable the control of the view
* Enable/Disable the smart camera's zoom
* Invert the mouse's wheel direction

#### How to use the extension?

Main UI:   
![image](mainui.png?width=400px)

You need to load the gcode file using the menu

![image](view.gif?width=400px)

You can move the camera position using the mouse or touch screen, you can switch between the different views using the view bar on the bottom.
You can also define the starting layer and the ending layer using the layer bar on the bottom.


!!! info "Note"
    This extension is for 3D printers only, it will not work with CNC machines, an updated version is planned for the future.