+++
archetype = "section"
title = " Telegram Notification"
weight = 5
+++
[Telegram](https://telegram.org/) is free service

Considering you have Telegram account and you already installed Telegram on you phone/PC:   

You need a bot token and a channel id:  
1 - Create a bot with [BotFather](https://core.telegram.org/bots#3-how-do-i-create-a-bot)

* Open telegram application and open chat with Botfather.  
* Type or select `/newbot`  
  ![image]/images/notifications/telegram/newbot.jpg)
* Type the name of the bot (2) and its username (3)  
  ![image](/images/notifications/telegram/newbot2.jpg)
* Doing this you will get your bot token (4) that you need for `T1=<bot token>`

2 - Create a public channel

* In telegram select new channel  
![image](/images/notifications/telegram/newchannel.jpg)  
* Type channel name (1) and description (2)  
![image](/images/notifications/telegram/newchannel2.jpg)  
* Now you have your chat name which is your chatid without the `@`

3 - Assign your bot as administrator of your channel so it can use it

* Press your channel title, the top banner will expand  
![image](/images/notifications/telegram/channel.jpg)  
* Push Administrators  
![image](/images/notifications/telegram/adminchannel1.jpg)  
* Look for your bot in search and add it  
![image](/images/notifications/telegram/adminchannel2.jpg)

4 - Save the generate token and chatID in ESP3D, and set Telegram as notification supplier  
`[ESP610]type=TELEGRAM T1=<bot token> T2=<@channel name>`

5 - Type `[ESP610]` to verify (T1/T2 won't be displayed)  

6 - Try to send message:  
`[ESP600]Hi there, test from ESP3D`
