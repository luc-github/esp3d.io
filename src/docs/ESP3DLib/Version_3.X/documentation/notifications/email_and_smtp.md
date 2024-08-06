---
archetype : "section"
title : " Email Notification"
weight : 3
---
Email Notification is using SMTP and HTTPS, so you need to collect the following information fof your email supplier

* smtp server address and https port
* smtp username/ID
* smtp password

ESP3D use the parameters as follow:  

* **token 1** = ID to login to your email supplier  
* **token 2** = Password to login to your email supplier  
* **token settings** = `the_recipient email#smtp_server:port` where **#** and **:** are fields separators.  

For example: `luc@gmail.com#smtp.gmail.com:465`

1 -Save the token 1, token 2 and token settings in ESP3D, and set EMAIL as notification supplier  
`[ESP610]type=EMAIL T1=luc@gmail.com T2=mypassword TS=luc@gmail.com#smtp.gmail.com:465`  

2 - Type `[ESP610]` to verify (T1 and T2 won't be displayed)  

3 - Try to send message:  
`[ESP600]Hi there, test from ESP3D`  

4 - **Important** : if you are using Gmail there is an additional step, as by default https access is disabled.  
go to : https://myaccount.google.com/lesssecureapps and allow less secure applications to connect
![gmail enabling http access](/img/notifications/email/google.png) 
