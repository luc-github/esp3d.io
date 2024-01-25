# esp3d.io
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-4-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
Project page for the web site on http://esp3d.io

It use [Hugo](https://gohugo.io/) to generate the static pages and use the [hugo relearn theme](https://mcshelby.github.io/hugo-theme-relearn/) as code base.

>[!IMPORTANT]
>Please use version 110.0, lastest version (121.2) seems not compatible with current code, I did not checked what is latest working version for this site

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

please read the [documentation](https://mcshelby.github.io/hugo-theme-relearn/)

### Extra Shortcodes
* center
to center a text - do not put shortcodes inside

* imglink
to get clickable link image

* iobadge
to use shields.io badges and github badges

### Rules
* only use lowcase letters without space for files and directories names 

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://dev76.org"><img src="https://avatars.githubusercontent.com/u/222385?v=4?s=100" width="100px;" alt="Paulo Bruckmann"/><br /><sub><b>Paulo Bruckmann</b></sub></a><br /><a href="#ideas-peekpt" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/luc-github/esp3d.io/commits?author=peekpt" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jamespearson04"><img src="https://avatars.githubusercontent.com/u/26628667?v=4?s=100" width="100px;" alt="James Pearson"/><br /><sub><b>James Pearson</b></sub></a><br /><a href="https://github.com/luc-github/esp3d.io/commits?author=jamespearson04" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/serisman"><img src="https://avatars.githubusercontent.com/u/670207?v=4?s=100" width="100px;" alt="serisman"/><br /><sub><b>serisman</b></sub></a><br /><a href="https://github.com/luc-github/esp3d.io/commits?author=serisman" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dbuezas"><img src="https://avatars.githubusercontent.com/u/777196?v=4?s=100" width="100px;" alt="David Buezas"/><br /><sub><b>David Buezas</b></sub></a><br /><a href="https://github.com/luc-github/esp3d.io/commits?author=dbuezas" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
