---
description : "Commands and syntax"
archetype : "section"
title : "Compilation"
menuPre : "<i class='fas fa-code'></i> "
weight : 3
---

To be able to generate file from sources you need to install nodejs, gulp and some addons.    
1 - Install current [nodejs LTS](https://nodejs.org/en/download/)   (v10.15.3)    
2 - Install gulp-cli globaly `npm install --global gulp-cli`   
3 - Install gulp globaly `npm install --global gulp@4.0.0`   
4 - Install all addons `npm install`  

You should have something like this : 
```
E:\github\ESP3D-WEBUI>node -v
v10.14.0

E:\github\ESP3D-WEBUI>gulp -v
[22:17:03] CLI version 2.0.1
[22:17:03] Local version 4.0.0

E:\github\ESP3D-WEBUI>npm -v
6.4.1
```
5 - Do the code modification you want, then launch `gulp package`.   
```
E:\github\ESP3D-WEBUI>gulp package
[15:17:13] Using gulpfile E:\github\ESP3D-WEBUI\gulpfile.js
[15:17:13] Starting 'package'...
[15:17:13] Starting 'clean'...
[15:17:13] Finished 'clean' after 5.6 ms
[15:17:13] Starting 'lint'...
[15:17:13] Finished 'lint' after 144 ms
[15:17:13] Starting 'Copy'...
[15:17:13] Finished 'Copy' after 21 ms
[15:17:13] Starting 'concatApp'...
[15:17:14] Finished 'concatApp' after 53 ms
[15:17:14] Starting 'includehtml'...
[15:17:14] Finished 'includehtml' after 7.91 ms
[15:17:14] Starting 'includehtml'...
[15:17:14] Finished 'includehtml' after 6.18 ms
[15:17:14] Starting 'replaceSVG'...
[15:17:14] Finished 'replaceSVG' after 5.36 ms
[15:17:14] Starting 'minifyApp'...
\style.css: 125691
\style.css: 102958
[15:17:16] Finished 'minifyApp' after 2.2 s
[15:17:16] Starting 'smoosh'...
[15:17:16] Finished 'smoosh' after 117 ms
[15:17:16] Starting 'compress'...
[15:17:16] Finished 'compress' after 26 ms
[15:17:16] Starting 'clean2'...
[15:17:16] Finished 'clean2' after 3.83 ms
[15:17:16] Finished 'package' after 2.61 s
``` 
If no issue, a file called index.html.gz will be generated at the root of repository, so you just need to upload it like described in [installation page](/esp3d-webui/v2.x/installation)     

By default is build a multilanguage file, if file is too big for your flash size you can build with only english and one additional language:

* `gulp package --lang en` will only build english  
* `gulp package --lang fr` will only build french + english  
* `gulp package --lang es` will only build spanish + english  
* `gulp package --lang it` will only build italian + english  
* `gulp package --lang de` will only build german + english   
* etc...
