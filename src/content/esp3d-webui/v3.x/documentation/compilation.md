+++
description = "Compilation Guide"
archetype = "section"
title = "Compilation Guide"
menuPre = "<i class='fas fa-code'></i> "
weight = 2
+++

## Compilation Steps

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


## Code Formating

### How to do code formating?

#### .js/.css/.scss/.json files of embedded directory
The code must be formatted using the [prettier](https://prettier.io/) tool. The configuration style is `.prettierrc` present in the root directory. The configuration file is as follows:
```json
{
  "printWidth": 80,
  "tabWidth": 4,
  "useTabs": false,
  "semi": false,
  "singleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "requirePragma": false,
  "insertPragma": false,
  "proseWrap": "preserve",
  "overrides": [
    {
      "files": "*.js",
      "options": {
        "parser": "babel"
      }
    },
    {"files": "*.css",
      "options": {
        "parser": "css"
      }
    },
    {"files": "*.scss",
      "options": {
        "parser": "scss"
      }
    },
    {"files": "*.json",
    "options": {
      "printWidth": 120,
    }
    }
  ]
}
```


The tool can be added as extension in vscode, and installed using :
```bash
npx install -G prettier
```
Prettier will format one active file at once per request or during saving process according your vscode settings.

A python script is also available in the repository, in directory tools: `format_sources.py`, this script can be used to format all files of the directories `config` and `src`, and all subdirectories at once.


### When to do code formating?

Before any pull request or before submit any code, the code must be formatted. The CI will check the code formatting, and will eventually fail if the code is not formatted correctly.