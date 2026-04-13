---
archetype : "section"
title : " Line Notification"
weight : 2
---
[Line](https://line.me) is free service

Considering you have line account and you already installed line on you phone/PC:

1 - Go to https://notify-bot.line.me/my/ and connect with email and password
![image](/img/notifications/line/logon.png)

2 - Once connected you will be able to generate token   
![image](/img/notifications/line/generate.png)

3 - Type token name on top, select recipient(s) and press Generate token   
![image](/img/notifications/line/generate2.png)

4 - Once token is created you need to copy it   
![image](/img/notifications/line/token1.png)

5 - You can create as many tokens you want, and delete the ones you do not need   
![image](/img/notifications/line/tokenmanagement.png)

6 - Save the generate token in ESP3D, and set LINE as notification supplier    
`[ESP610]type=LINE T1=xxxxxxxxxxxxxxxxxx`  

7 - type `[ESP610]` to verify (T1 won't be displayed)   

8 - Try to send message:   
`[ESP600]Hi\ there,\ test\ from\ ESP3D`
