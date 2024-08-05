---
description : "Syntax and parameters"
archetype : "section"
title : "ESP3D commands"
weight : 1
menuPre : "<i class='fas fa-terminal'></i> "
---

## Conventions
1 - Add space to separate parameters  
2 - If parameter has space add `\` in front of space to not be seen as separator   
3 - `json`, `json=YES`, `json=TRUE`, `json=1` are paremeters to switch output to json  

By default output is plain text, to get json formated output add json or json=yes after main parameters.

The json format is: 
```json 
{
    cmd:"<command id>", //the id of requested command
    status:"<ok/error>" //give if it is success or an failure
    data:"<response>" // response corresponding to answer in json format too
}
```

## Commands
* Show commands help   
    `[ESP]<command id> json=<no>`

children sort="weight" description : "true" depth="1"
