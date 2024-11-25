---
archetype : "section"
title : " What's App Notification"
weight : 6
---
[What's App](https://www.whatsapp.com/) is free service

Considering you have line account and you already installed line on you phone/PC:
To use automatic notifications you need to use a bot called [callmebot](https://www.callmebot.com/blog/free-api-whatsapp-messages/), no worry no registration needed, just get some API Key.


1 - Add the phone number `+34 644 95 42 75` into your Phone Contacts. (Name it it as you wish, I personally named it callmebot)

2 - Using your What's App, send this message `I allow callmebot to send me messages` to the new Contact created. 

3 - Wait until you receive the message `API Activated for your phone number. Your APIKEY is 123123` from the bot.

!!! info "Note" 
    If you don't receive the ApiKey in 2 minutes, please try again after 24hs.  

4 - Once API key is created you need to copy it   


5 - Save the your phone number including country code as token 1 and the generated api key as token 2 in ESP3D, and set WhatsAPP as notification supplier    
`[ESP610]type=WhatsApp T1=336XXXXXXXXX T2=XXXXXXXX`

!!! info "Note" 
    Do not put the internationnal prefix on the phone number, just prefix with your country code.  

6 - type `[ESP610]` to verify (T1/T2 won't be displayed)   

7 - Try to send message:   
`[ESP600]Hi there, test from ESP3D`

