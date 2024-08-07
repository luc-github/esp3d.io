---
description : "Compilation Guide"
archetype : "home"
title : "Compilation Guide"
menuPre : "<i class='fas fa-code'></i> "
weight : 5
---
## Code Formating

### How to do code formating?
#### .cpp/.h/.ino files of esp3d directory
The code must be formatted using the [clang-format](https://clang.llvm.org/docs/ClangFormat.html) tool. The configuration style is [Google](https://google.github.io/styleguide/cppguide.html), no other extra customization is necessary. The tool can be added as extension in vscode, and will format one active file at once per request or during saving process according your vscode settings. 

A python script is also available in the repository, in directory `tools`: `format_sources.py`, this script can be used to format all files of the directory `esp3d`, and all subdirectories at once.  

#### .js/.css files of embedded directory
The code must be formatted using the [prettier](https://prettier.io/) tool. The configuration style is `.prettierrc` present in the root of `embedded` directory. The configuration file is as follows:
```json
{
  "printWidth": 80,
  "tabWidth": 4,
  "useTabs": false,
  "semi": true,
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
    {"files": "*.scss",
      "options": {
        "parser": "css"
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

A python script is also available in the repository, in directory `embedded/tools`: `format_sources.py`, this script can be used to format all files of the directories `embedded/config` and `embedded/src`, and all subdirectories at once.


### When to do code formating?

Before any pull request or before submit any code, the code must be formatted. The CI will check the code formatting, and will eventually fail if the code is not formatted correctly.