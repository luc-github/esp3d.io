---
archetype : "section"
title : " Telegram Notification"
weight : 5
---
[Telegram](https://telegram.org/) is free service

Considering you have Telegram account and you already installed Telegram on you phone/PC:   

You need a bot token and a chat/channel id:  
1 - Create a bot with [BotFather](https://core.telegram.org/bots#3-how-do-i-create-a-bot)

* Open telegram application and open chat with Botfather.  
* Type or select `/newbot`  
  ![image](/img/notifications/telegram/newbot.jpg)
* Type the name of the bot (2) and its username (3)  
  ![image](/img/notifications/telegram/newbot2.jpg)
* Doing this you will get your bot token (4) that you need for `T1=<bot token>`
* You can have notifications directly from your bot by finding the numeric chatid.
  In order to find it you need to say something to your bot:
  ![image](/img/notifications/telegram/talktobot.png)
  Copy this url into your browser and modify it with your bot's token ` https://api.telegram.org/bot<TOKEN>/getUpdates?offset=-1`
  You can quickly find your numeric chat id `T2=<numeric chat id>`
  ![image](/img/notifications/telegram/chatidjson.png)

2 - Alternatively you may create a public channel if you want to share your printer. If isn't the case proceed to step 4.
   
* In telegram select new channel  
![image](/img/notifications/telegram/newchannel.jpg)  
* Type channel name (1) and description (2)  
![image](/img/notifications/telegram/create_channel_1.png)  
* Make channel public and create your channelid/chatid
![image](/img/notifications/telegram/create_channel_2.png)  
* Now you have your chatid without the `@`

3 - Assign your bot as administrator of your channel so it can use it

* Press your channel title, the top banner will expand  
![image](/img/notifications/telegram/channel.jpg)  
* Selet manage channel
![image](/img/notifications/telegram/create_channel_3.png)  
* Push Administrators  
![image](/img/notifications/telegram/create_channel_4.png)   
* Look for your bot in search and add it  
![image](/img/notifications/telegram/adminchannel2.jpg)
* Validate bot can have access to channel
![image](/img/notifications/telegram/create_channel_5.png)  
* Validate bot can admin the channel
![image](/img/notifications/telegram/create_channel_6.png)  

4 - Save the generate token and chatID in ESP3D, and set Telegram as notification supplier  
`[ESP610]type=TELEGRAM T1=<bot token> T2=<numeric chat id>` 

`[ESP610]type=TELEGRAM T1=<bot token> T2=<@chatID>` (for channel)

5 - Type `[ESP610]` to verify (T1/T2 won't be displayed)  

6 - Try to send message:  
`[ESP600]Hi\ there,\ test\ from\ ESP3D`
