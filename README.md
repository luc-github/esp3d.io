# esp3d.io
Project page for the web site on http://esp3d.io

It use [Hugo](https://gohugo.io/) to generate the static pages and use the [hugo relearn theme](https://mcshelby.github.io/hugo-theme-relearn/) as code base.

Discussion is available here: https://github.com/luc-github/esp3d.io/discussions or on discord: https://discord.gg/VNxDGBasYD

### Directory structure
```
src
   |_ archetypes  //Used for section definition
   |_ assets      //Not used
   |_ content     //Used for the site content
      |_ ESP3D //ESP3D Project
         |_V2.X //ESP3D Version 2.X
           |_ Installation
           | |_ arduino
           | |_ vscode-platformio
           | |_ configuration
           | |_ wiring
           |_ Features
           |_ Documentation
           |_ Showcase
           |_Credits
         |_V3.X
      |_ ESP3DLib
      |_ ESP3D-TFT
      |_ ESP3D-WEBUI
      |_ common //All files shared between projects pages
   |_ data        //Not used
   |_ layouts     //Used to custumize the layout: logo, menu, shortcodes
   |_ public      //Static content to published
   |_ resources   //Not used
   |_ static      //All images of the website
   |_ themes      //Relearn theme
```
### Shortcodes

