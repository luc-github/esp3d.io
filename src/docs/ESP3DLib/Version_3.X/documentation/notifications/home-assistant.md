---
archetype : "section"
title : " Home Assistant"
weight : 2
---
[Home Assistant](https://www.home-assistant.io/) is a home automation platform

Considering you have Home Assistant running in your local network:

1 - Go to [![Open your Home Assistant instance and show your Home Assistant user's profile.](https://my.home-assistant.io/badges/profile.svg)](https://my.home-assistant.io/redirect/profile/), and create a long-lived access token

2 - Save the generated token in ESP3D, and set HOMEASSISTANT as notification supplier    
`[ESP610]type=HOMEASSISTANT T1=xxxxxxxxxxxxx TS=homeassistant.local:8123`  

3 - type `[ESP610]` to verify (T1 won't be displayed)   

4 - Try to send message:   
  * `[ESP600]/api/services/light/toggle#{"entity_id":"light.wintergarten_spots"}`

5 - At the end of your gcode, you can add the following have your vacuum cleaner announce the print is done:
  * `M118 P3 [ESP600]/api/services/tts/cloud_say#{"entity_id":"media_player.vacuum_audio","message":"3d\ print\ ready"}`
  * Visit https://developers.home-assistant.io/docs/api/rest/ to find out how to post states and events too
