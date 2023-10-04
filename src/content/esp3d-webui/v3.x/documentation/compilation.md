+++
description = "Commands and syntax"
archetype = "section"
title = "Compilation"
menuPre = "<i class='fas fa-code'></i> "
weight = 2
+++
### Setup development tools

1 - Install current nodejs LTS (currently using v16.14.2)

```
node -v
v20.8.0

npm -v
10.2.0
```

2 - Download all necessary packages in ESP3D-WEBUI directory (repository root)

```
npm install
```

### Start dev server

in ESP3D-WEBUI directory (repository root)

```
npm run dev-<system>-<firmware>
```

-   where `<system>` is `cnc` (CNC system, laser, spindle..) , `printer` (3D printer), `sand` (Sand Table)
-   where `<firmware>` is :
    -   `grbl`, `grblhal` for `cnc`
    -   `marlin`, `marlin-embedded` (esp3dlib), `repetier`, `smoothieware` for `printer` 
    -   `grbl` for `sand`

will open http://localhost:8088 which display the webUI using a local test server

### Build index.html.gz to /dist folder

in ESP3D-WEBUI directory (repository root)

```
npm run buildall
```

Will generate production version for each target and firmware in dist directory

to build specific index.html.gz

```
npm run <system>-<firmware>
```

-   where `<system>` is `cnc` (CNC system, laser, spindle..) , `printer` (3D printer), `sand` (Sand Table)
-   where `<firmware>` is :
    -   `grbl`, `grblhal` for `cnc`
    -   `marlin`, `marlin-embedded` (esp3dlib), `repetier`, `smoothieware` for `printer` 
    -   `grbl` for `sand`
