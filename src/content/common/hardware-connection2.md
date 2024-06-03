Connection between ESP and printer board needs 4 wires:

- ESP Tx needs to connect to Rx on MCU of printer board.
- ESP Rx needs to connect to Tx on MCU of printer board.  
- You also need to power supply ESP board with with GND and 3V3 or 5V.

### Connecting ESP board to target board
Be aware that ESP MCU is 3.3V on GPIO pin and some target board can be 3.3V and others 5V, so you may not be able to directly connect ESP  board to target board.    

__Disclaimer__ : this wiki is for reference - you are responsible of your board supporting or not 5V, we are not responsible for any damage of wrong wiring.

ESP32 and ESP8266 MCU are only supporting 3.3V. Power supply them with 5V will likelly fry them immediatelly. As MCU is supplied at 3.3V, Tx and Rx signals will be at 3.3V even when board is supplied with 5V. Wether Rx pin is supporting 5V is controversial so we will keep on the safe side and only take datahseet as reference. It's not recommended to have any signal (including Rx) be higher than power supply (3.3V here).

There are several points to take care. One should check that

1. MCU1 Tx voltage is lower than MCU2 supply voltage
2. Voh_min of Tx is higher than Vih_min of Rx (to check both ways)
3. Vol_max of Tx is lower than Vil_max of Rx (to check both ways)

1 is mandatory and [resistor voltage divider bridge](https://en.wikipedia.org/wiki/Voltage_divider) or level shiffter is recommended  
2 & 3 are not destructive there is just a slight risk signals are not read correctly. But it will work in most case as the limit values given by datasheets are rarelly met in mild conditions (using near 25°C and low current flowing from Tx to Rx)

For the divider bridge a value of R1=1k and R2=2.2k will be fine.
You could also use 10k and 22k or anything near a factor 2.

![step1](/images/dividerbridge.png?width=300px)


### Connection diagrams examples for some ESP boards

  - [ESP boards](#esp-boards)
  - [ESP-01](#esp-01)
  - [ESP-01 serial wifi module](#esp-01-serial-wifi-module)
  - [ESP-12E/F](#esp-12ef)
  - [ESP 12F serial wifi module](#esp-12f-serial-wifi-module)
  - [ESP32-Cam](#esp32-cam)
  - [NodeMCU V2/V3](#nodemcu-v2v3)
  - [Sonoff](#sonoff)
  - [Wemos D1 mini](#wemos-d1-mini)




## ESP boards

### ESP-01

- Use GPIO2 to ground to reset all settings in hard way - 2-6 sec after boot / not before!! Set GPIO2 to ground before boot change boot mode and go to special boot that do not reach FW. Currently boot take 10 sec - giving 8 seconds to connect GPIO2 to GND and do an hard recovery for settings   
- Use GPIO0 to ground to be in update mode 

![step1](/images/hw/wires.png?width=300px)

---

### ESP-01 serial wifi module

![step1](/images/hw/ff587ce89a.jpg?width=300px)

more info about the Breakout PCB: [keyestudio](https://www.keyestudio.com/keyestudio-esp-01s-wifi-to-serial-shield-module-for-arduino-esp8266-wifi-p0499-p0499.html)

---

### ESP-12E/F

ESP need 3.3v, it is not 5v tolerant, if printer board use more than 3.3V like 5V on ramps.  

![step1](/images/hw/wiresesp12e.png?width=300px)

you can also use Logic LevelConverter Bi-Directional

![step2](/images/hw/logic.png?width=300px)

In order to flash some ESP12E/F boards via their UART interface, the following pins need to be connected:

- VCC to GPIO2
- GND to GPIO0

This has been tested with ESP-12-E boards labeled "ESP8266 For ESP3D FYSETC.COM"

---

### ESP 12F serial wifi module

 ESP-12F based serial wifi module (eg [from aliexpress](https://www.aliexpress.com/item/ESP8266-ESP-12F-Serial-WIFI-Wireless-Transceiver-Module-For-Arduino-ESP-12F-Adapter-Expansion-Board-For/32804504326.html) ) contains built in 2-way levelshifter/bi-directional logic level converter. So it can be powered via 5V uart from the target' motherboard.

- We need to manualy ground the ```IO0``` while powering up to start in flash mode while powering up (there is no switch for that, neither for reset)
![step1](/images/esp/esp12.png?width=300px)
- Use FTDI adapter as usb2serial
- Need to see in console/serial monitor boot mode is (**1**,7).
  - baudrate: 74880
  - ```rst cause:2, boot mode:(3,7)```
- Then flash like other esp based board for esp3d

---

### ESP32-Cam

![step1](/images/esp/espcam32.png?width=300px)

Note: 5V is power supply input and 3V3 is output from regulator. UART Tx and RX signals will be 3.3V

---

### NodeMCU V2/V3

![step1](/images/nodemcu/nodemcu.png?width=300px)

---

### Sonoff

![step1](/images/sonoff/sonoff.png?width=300px)

Relay is connected by GPIO12, it can be handled using ESP201 command:

    *Get/Set pin value
    [ESP201]P<pin> V<value> [PULLUP=YES RAW=YES]
    if no V<value> get P<pin> value
    if V<value> 0/1 set INPUT_PULLUP value, but for GPIO16 INPUT_PULLDOWN_16
    GPIO1 and GPIO3 cannot be used as they are used for serial
    if PULLUP=YES set input pull up, if not set input
    if RAW=YES do not set pinmode just read value

So `[ESP201]P12 V0` should be off and `[ESP201]P12 V1` should be on

---

### Wemos D1 mini

Connection with logic level conveter: 

![step1](/images/d1_mini/wemos-d1-mini_logic-level-converter.jpg?width=300px)

example:  
![step1](/images/d1_mini/wemos-d1-mini_logic-level-converter-2.jpg?width=300px)

printed cases:
* <https://www.thingiverse.com/thing:4128593>
* <https://www.thingiverse.com/thing:2671591>
