---
archetype : "section"
title : " Pushover Notification"
weight : 1
---
[Pushover](https://pushover.net/) is paid service

Considering you have pushover account (even just trial) and you already installed pushover client on you phone/PC:  

1 - Go to <https://pushover.net/> and connect with email and password  
![image](/img/notifications/pushover/logon.png)

2 - Once connected you will be able to get the token 1, the user token  
![image](/img/notifications/pushover/token1.png)

3 - You also need to generate an application token, which is the token 2  
![image](/img/notifications/pushover/token2.png)

4 - The token 2 generation:
![image](/img/notifications/pushover/token2b.png)

5 - Save the generate token 1 and token 2 in ESP3D, and set PUSHOVER as notification supplier  
`[ESP610]type=PUSHOVER T1=xxxxxxxxxxxxxxxxxx T2=yyyyyyyyyyyyyyyyy`  

6 - type `[ESP610]` to verify (T1 and T2 won't be displayed)  

7 - Try to send message:  
`[ESP600]Hi there, test from ESP3D`
