+++
title = "Notifications"
weight = 2
menuPre = "<i class='fas fa-envelope'></i> "
+++

You can use only one type of notification: 

* [Pushover](https://pushover.net/), which is a pay service

Please follow this [link](/common/pushover.md) for more information on how to setup a pushover notification service

* [Line](https://line.m), which is a free service

Please follow this [link](/common/line.md) for more information on how to setup a line notification service

* Email using SMTP and HTTPS

Please follow this [link](/common/email_and_smtp.md) for more information on how to setup a email notification service

* [IFTTT webhook](https://ifttt.com), which is a free service up to 5 applets

Please follow this [link](/common/ifttt.md) for more information on how to setup a pushover iftt service


### How to setup the parameters:

* Set/Get Notification settings   
`[ESP610]type=<NONE/PUSHOVER/EMAIL/LINE> T1=<token1> T2=<token2> TS=<Settings> pwd=<admin password>`
Note:
- Get will give type and settings only, not the protected T1/T2
- Depending of notification supplier the parameters changes

### How to send message :  
Just add following command in your slicer's end script, or manualy on your GCODE file:   
`[ESP600]msg pwd=<admin password>`

### How to ask printer to send command from file played from SD:
* on Repetier   
`M118 [ESP600]msg`

* on Marlin   
`M118 P0 [ESP600]msg`

* on Smoothieware   
`echo [ESP600]msg`


