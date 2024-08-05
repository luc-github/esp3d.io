---
archetype : "section"
title : "Notifications"
description : "Setup and configuration"
weight : 2
menuPre : "<i class='fas fa-envelope'></i> "
---

You can use only one type of notification from the following ones: 

### [Pushover](https://pushover.net/)   
A pay service

Please follow this [link](pushover/) for more information on how to setup a pushover notification service

### [Line](https://line.m)   
A free service

Please follow this [link](line/) for more information on how to setup a line notification service

### Email using SMTP and HTTPS

Please follow this [link](email_and_smtp.md) for more information on how to setup a email notification service

### [IFTTT webhook](https://ifttt.com)   
A free service up to 5 applets

Please follow this [link](ifttt.md) for more information on how to setup a pushover iftt service   

### [Telegram](https://telegram.org/)    
A free service

Please follow this [link](telegram/) for more information on how to setup a telegram notification service


The notification will also be sent to the WebUi 

### How to send message ?  
Just add following command in your slicer's end script, or manualy on your GCODE file:   
`[ESP600]msg pwd=<admin password>`

### How to ask printer to send command from file played from SD ?
* on Repetier   
`M118 [ESP600]msg`

* on Marlin   
`M118 P0 [ESP600]msg`

* on Smoothieware   
`echo [ESP600]msg`


