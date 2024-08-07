---
description : "Syntax conventions in used languages"
archetype : "section"
title : "Syntax conventions"
weight : 4
---

!!! info "Note"
    This document is a receipe of conventions that may not be currently implemented yet, but will be from now, current code will be updated according to it before beta state.



Style should be also applied also

## Javascript

### Style
* Install prettier extension
 `Prettier - Code formatter from Prettier
* Define configuration file
 Select `.prettierrc` is present on root directory

### General
* Use DOM as much as possible, do not use `document.getElementById` 
* Avoid switch statement, use object with corresponding method instead
* Native HTML tags must be lowercased

### File name 
* Use one file or directory per main component
* Split compoment as much as possible in multiple components
* Use same file name as component name
* If file does not contain components first letter of file name should be lower case
* JSON file name / directory are lower case


### Variable
* The first character of name should be lowercase.
* Use upper case letter as word separator
* Any name should begin with an alphabet.
* Digits may be used in the name but only after the alphabet.
* No special symbols / keywords can be used in names


### Constant
* The first character of name should be lowercase.
* Use upper case letter as word separator
* Any name should begin with an alphabet.
* Digits may be used in the name but only after the alphabet.
* No special symbols / keywords can be used in names

### JSON object
* Start name by upper case first letter
* Use upper case first letter for words separation
* Do not use underscore / dash in name

### Component
* Do not use class / render but Fragments / Elements
* Start name by upper case first letter
* Use upper case first letter for words separation
* Do not use underscore / dash in name
* Only export what is needed

### Function/Procedure
* The first character of name should be lowercase if more than one letter, or should be upper case.
* Use upper case letter as word separator.
* Any name should begin with an alphabet.
* Digits may be used in the name but only after the alphabet.
* No special symbols / keywords can be used in names

Inspired from :   

* [Google JavaScript Style Guide+](https://google.github.io/styleguide/jsguide.html)
* [Naming Conventions in React JS - Upbeat Code](https://www.upbeatcode.com/react/react-naming-conventions/)
* [10-react-naming-conventions-best-practices](https://climbtheladder.com/10-react-naming-conventions-best-practices/)
