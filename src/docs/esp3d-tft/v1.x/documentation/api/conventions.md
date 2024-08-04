---
description : "Syntax conventions in used languages"
archetype : "section"
title : "Syntax conventions"
menuPre : "<i class='fas fa-spell-check'></i> "
weight : 4
---

{{% notice style="info"  %}}
This document is a receipe of conventions that may not be currently implemented yet, but will be from now, current code will be updated according to it before beta state.
{{% /notice %}}


Style should be also applied also


## C++

### Style
* Use Clang-format
    - Download the tool according your system    
    https://releases.llvm.org/
    - Install client extension     
    CLang-Format from Xaver Hellauer
    - Define the style    
    set `Google` as default style

### General
* Avoid abreviation as much as possible
* Avoid unnecessary long name
* ESP3D is always uppercase in code, esp3d is valid only for filename, any mixing case is proscribed (e.g.:`Esp3D`/`esp3D`/`Esp3d`)
* ESP command is always uppercase, so any reference to it (e.g.: `ESP100`) should be uppercase to avoid confusion, only filename can be lowercase, any  mixing case is proscribed 

### File name
* Use lower case for file names 
* Use underscores as words separators  
e.g: `esp3d_settings.cpp`

### Directory name
* Use lower case for directory names 
* Use underscores as words separators  
e.g: `esp3d_commansds`
* Target directories are the only names that use full uppercase unlike others directories  
e.g: `ESP32S3_ZX3D50CE02S_USRC_4832`

### Variable
* Any name should begin with an alphabet.
* The first character should be lowercase. 
* Use upper case letters as words separators
* Digits may be used in the name but only after the alphabet.
* No special symbols can be used in names.
* No keywords can be used as names.
* Pointer variables should be prepended with ‘p’ and place the asterisk ‘*’ close to the name instead of the pointer type.
* Static variables should be prepended with ‘s’.
* always initialize the variable   
e.g:   
`char adminPassword[20]{0};`  
`char *pAdminLogin = nullptr;`  

### Constant
* Any name should begin with an alphabet.
* The first character should be `k`. 
* Use upper case letters as words separators
* Digits may be used in the name but only after the alphabet.
* No special symbols can be used in names.
* No keywords can be used as names.   
e.g: `const int kTopLimit 100;`

### Define
Define use uppercase letters only and underscores as words separators, dash is not allowed.    
e.g: `#define LOWER_LIMIT 10;`

### Enum
* Enum should use `enum class` not plain `enum` neither `enum struct`
* If enum is used by several file, enum should be defined in separate file to avoid repeated definitions, and add `_type` suffix to file name 
* The first character in the enum name must be in upper case.
* Use upper case letters as word separators.
* No underscores (‘_’) are permitted in the enum name.
* Enum values are lower case and use underscores as words separators.
* No need to `typedef` enum
* Use type as much as possible to clarify any casting if necessary
* Define enum values as much as possible to ensure consistency when doing update
* Do not use `#ifdef` in enum unless all enum values are explicitly defined   

e.g: `esp3d_gcode_host_type.h`

- not explicitly defined   
```
enum class Esp3dGcodeHostWait : uint8_t {
    no_wait = 0,
    wait_ack,
    wait_busy,
    wait_processing,
    wait_heating
};
```   
Usage example: `Esp3dGcodeHostWait::no_wait`

- explicitly defined    
```
enum class Status: char
{
    high = 'h',
    low = 'l'
}; 
```   
Usage example: `Status::low`

### Struct/Union
* If struct/union is used by several file, struct should be defined in separate file to avoid repeated definitions, and add `_type` suffix to file name
* The first character in the struct name must be in upper case.
* Use upper case letters as word separators
* Struct values are lower case and use underscores as words separators if variables.
* No need to `typedef` for struct   
* As we use C++20, initialize struct explicitly

e.g: `setting_description_type.h`

```
struct  SettingDescription{
    uint16_t size = 0;
    const char* defaultVal = nullptr;
} ;
```   
usage example: `SettingDescription notificationSetting;`  

### Class
* The class name should be a noun.
* Use upper case letters as word separators, and lower case for the rest of the word in the class name.
* The first character in the class name must be in upper case.
* No underscores (‘_’) are permitted in the class name.
* The private and protected attribute name in class should be prepended with the character underscore (‘_’).
* Each method/ function name should begin with a verb.
* The first character of function/ method argument names should be lowercase.
* Use upper case letter as word separator
* Any name should begin with an alphabet.
* Digits may be used in the name but only after the alphabet.
* No special symbols can be used in names except for the underscore(‘_’).
* No keywords can be used as names.
* Pointer variables should be prepended with ‘p’ and place the asterisk ‘*’ close to the name instead of the pointer type.
* Static variables should be prepended with ‘s’.
* Getter should use same name as attribute name.
* Setter should use same name as attribute name with `set` prefix and upper case the first letter of name.    
 
e.g: 
```
class Esp3dAuthenticationService {
public:
    bool begin();
    bool isAdmin (const char *pwd);
    char * getPassword ();
private:
    std::string _adminPwd;
    char *_pName;
    static char _sLogin; 
}

```

### Function/Procedure
* Each Function/Procedure name should begin with a verb.
* The first character of argument names should be lowercase.
* Use upper case letter as word separator
* Any name should begin with an alphabet.
* Digits may be used in the name but only after the alphabet.
* No special symbols can be used in names except for the underscore(‘_’).
* No keywords can be used as names.

### Namespace 
* Namespace names are all lower-case, with words separated by underscores.   
* Do not use `using` but full namespace instead for clarity  
e.g: 
```
namespace esp3d_hal{
    int64_t millis();
}
```
usage example: `esp3d_hal::millis();` 

### typedef
* If variable 
    * Use lower case for names 
    * Use underscores as words separators
    * Add suffix `_t`
    e.g: `typedef int setting_index_t`
* If function
   * Follow function naming syntax
   * Add suffix `_t`
   e.g: `typedef std::function<bool(const char*, const char*,const char*)> processingFunction_t;`     

### 0 and nullptr/NULL
Use nullptr for pointers, and '\0' for chars (and not the 0 literal).

For pointers (address values), use nullptr, as this provides type-safety.

Use '\0' for the null character. Using the correct type makes the code more readable.

### sizeof
Prefer sizeof(varname) to sizeof(type). sizeof(varname) will update appropriately if someone changes the variable type either now or later. 

### `auto` type
Only use auto type if no need to to do type deduction, C++ code is usually clearer when types are explicit, especially when type deduction would depend on information from distant parts of the code. 

### Casting 
* Use C++-style casts   
e.g: `static_cast<float>(double_value)`
* Do not use C cast unless the cast is to void  
e.g: `(int)3.5;` 

### Initialization 
* Do not mix brace initialization and `=` for readibility

### Lambda Expressions
//TODO

Inspired from :
* [Naming Convention in C++](https://www.geeksforgeeks.org/naming-convention-in-c/)
* [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)