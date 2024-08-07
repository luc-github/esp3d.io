---
description : "Steps and supported languages"
archetype : "section"
title : "Translations"
menuPre : "<i class='fas fa-language'></i> "
weight : 1
---

The WebUI unfortunatly does not support UTF8, so for special character specific to the language like : &iexcl; &iacute; &aacute; &oacute;    
please refere to : [specialcharacters.php](https://www.degraeve.com/reference/specialcharacters.php) and [wiki](https://pl.wikipedia.org/wiki/Kodowanie_polskich_znak%C3%B3w)    

## Language currently supported 
### English (en) : 100% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/en.js)    
### French (fr) : 72% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/fr.js)    
### German (de): 72% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/de.js)    
### Hungarian: (hu) 99% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/hu.js)  
### Italian : (it) 72% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/it.js)    
### Spanish : (es) 72% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/es.js)    
### Polish : (pl) 87% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/pl.js)  
### Russian: (ru) 87% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/ru.js)   
### Ukrainian: (uk) 87% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/uk.js)   
### Portuguese-Br: (ptbr) 97% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/ptbr.js)   
### Chinese (simplified) (zh_CN): 99% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/zh_CN.js)   
### Chinese (traditional) (zh_TW): 99% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/zh_TW.js) 
### Japanese (ja): 99% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/ja.js) 
### Turkish: (tr) 97% [Here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/tr.js)  
 
### How to translate
 * Translate the right side only if necessary
 * Check language.tpl if any update
 * Submit Issue or PR with modified file

Note: English is the reference but it can be adjusted if necessary, just add the corresponding reference to the english file.

### To add a new language :
The template file is [here](https://raw.githubusercontent.com/luc-github/ESP3D-WEBUI/2.1/www/js/language/lang.tpl)  
* Change `lang` to the proper local descriptor   
* Translate the right side only   
* Submit Issue with modified file (do not do PR as another [file](https://github.com/luc-github/ESP3D-WEBUI/blob/2.1/www/js/translate.js#L3) need to be updated)    


