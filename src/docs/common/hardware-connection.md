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

![step1](/img/dividerbridge.png?width=300px)


### Connection diagrams for some printers and ESP boards

  - [Printer motherboards](#printer-motherboards)
  - [Anet A8 boards](#anet-a8-boards)
  - [Anycubic i3 mega - Trigorilla 8bit board](#anycubic-i3-mega---trigorilla-8bit-board)
  - [AZSMZ LCD board](#azsmz-lcd-board)
  - [AZSMZ-mini board](#azsmz-mini-board)
  - [Azteeg X5 mini board](#azteeg-x5-mini-board)
  - [BIQU KFB2.0 board](#biqu-kfb2.0-board)
  - [Creality CR10 Ender 3 board](#creality-cr10-Ender-3-board)
  - [Creality Ender 4 board](#creality-ender-4-board)
  - [Davinci 1.0/2.0 board](##davinci-1020-board)
  - [Davinci 1.0A board](#davinci-1.0A-board)
  - [MKS boards](#mks-boards)
  - [MKS Smoothieware board](#mks-smoothieware-board)
  - [RADDS board](#radds-board)
  - [RAMPS 1.4/Re-ARM board](#ramps-14re-arm-board)
  - [Smoothieboard board](#smoothieboard-board)
  - [SKR Mini E3 board](#skr-mini-E3-board)
  - [Weedo Tina2 board](#weedo-tina2-board)
  - [For printer boards not listed here](#for-printer-boards-not-listed-here)
  - [ESP boards](#esp-boards)
  - [ESP-01](#esp-01)
  - [ESP-01 serial wifi module](#esp-01-serial-wifi-module)
  - [ESP-12E/F](#esp-12ef)
  - [ESP 12F serial wifi module](#esp-12f-serial-wifi-module)
  - [ESP32-Cam](#esp32-cam)
  - [NodeMCU V2/V3](#nodemcu-v2v3)
  - [Sonoff](#sonoff)
  - [Wemos D1 mini](#wemos-d1-mini)


### Printer motherboards


#### Anet boards up to v1.5

* Step 1

You will also have to unsolder the resistors R52 and R53 – they are zero ohm resistors, and serve no other purpose than connecting the atmega chip directly to the onboard USB to UART converter (the CH340 chip). Do it VERY careful – you don’t want to damage your board. If you don’t feel confident – don’t do it.

![step1](/img/anet/image08-300x300.jpg)

* Step 2

Now prepare the printer’s motherboard. It requires a simple modification, that does not interfere with it’s operation afterwards – just solder 3 pin x 2 row male header on J8, and add 2 jumpers (or jumper wires) as shown on the picture:

![step1](/img/anet/image05-300x300.jpg)

* Step 3

Connect the ESP to J3 repsecting pinout

![step3](/img/anet/image00-232x300.jpg?width=300px)


|ESP|J3|
|:---:|:---:|
|Tx|Rx|
|Rx|Tx|
|GND|GND|
|VCC|3.3V|
|CH_PD|3.3V|

For more Info check [lokster | space](http://lokspace.eu/anet-a8-wifi-mod/)

#### For connecting version 1.7 Anet boards

Unlike older boards this board does not require you to remove any resistors.  
You will have to solder two wires from number 9 and number 10 its recommender to connect these to pin 1 and 2 of J3 connector.  

![step1](/img/anet/board.jpg)

---

#### Anycubic i3 mega - Trigorilla 8bit board

To connect the ESP12e to the UART0. (Credits:[197-murdock](https://www.lesimprimantes3d.fr/forum/profile/197-murdock/)).  
(Green = RX, Blue = TX)  
5V (buck to 3.3v if directly connect to ESP - most development ESP boards already have this voltage limited built-in - but check!) and GND can be taken from the AUX3 exposed connector.  
UART0 is normally used by USB port so don't use both together - so this hack piggybacks on that same port at UART level.  

![step1](/img/trigorilla/board.jpg?width=300px)

![step2](/img/trigorilla/nodemcu.jpg?width=300px)

---

#### AZSMZ LCD board

![step1](/img/azsmz-mini/azsmz-12864-lcd.jpg)

---

#### AZSMZ-mini board

![step1](/img/azsmz-mini/azsmz-mini.jpg)

If you don't have the soldering skills to grab the connectors from the unpopulated ethernet connection, you can also get 3.3v and GND from the ISP header (bottom left on the diagram above).

---

#### Azteeg X5 mini board

![step1](/img/azteegX5-mini/azteeg.png?width=300px)

---

### BIQU KFB2.0 board

all in one Ramps1.4/Mega2560 R3 controller based

![step1](/img/biqu-kfb2.0/board.jpg)

---

### Creality CR10 Ender 3 board

For the Sanguino based CR-10 and Ender printers you will need to solder to any of the via circled (can also be done in the backside of board), or to the legs of the Arduino or ftdi. Connect TX from the board to RX of Wemos D1 mini and RX from board to TX of Wemos D1 mini. 5v and GND are located in the six pin header next to the LCD connector.
  
![step1](/img/cr10/board.jpg?width=300px)

Since soldering might be difficult because the solder points are so close to each other, another option is to scrape off the insulation from the traces on the backside and solder there. Be extra careful not to scrape the surrounding ground plane. You need suitable fine scraping tools for this. The picture below shows an Ender-2 PCB.

![step2](/img/cr10/traces.jpg?width=300px)

---

### Creality Ender 4 board

You will need to solder to small circle, or to the legs of the ATmega2560 (RXD0 pin 2, TXD0 pin 3)

![step1](/img/ender4/board.jpg?width=300px)

---

### Davinci 1.0/2.0 board

![step1](/img/davinci/davinci.png)

![step2](/img/davinci/board.jpg?width=300px)

![step3](/img/davinci/boardconnected.jpg?width=300px)

![step4](/img/davinci/backside.jpg?width=300px)

![step5](/img/davinci/screen.jpg?width=300px)

---

### Davinci 1.0A board

![step1](/img/davinci/davincia-1.jpg?width=300px)

![step2](/img/davinci/davincia-4.jpg?width=300px)

![step3](/img/davinci/davincia-2.jpg?width=300px)

Alternate Module placement for increased WiFi range (outside metal chassis, antenna has vertical polarization)

![step4](/img/davinci/davincia-3.jpg?width=300px)

---

### MKS boards

To connect the ESP3D to the MKS GEN v1.2 (but the v1.3 and above 1.4 is the most used today).

An ESP12E with the standard schematics, the two resistor connected to the RX pin are substituted by a 1N4148 diode, like in the Adafruit Huzzah board.  

![step1](/img/mks-1.2/wires.png?width=300px)

ESP12E is connected to the AUX1

ESP12E RX is connected to the pin NEAR GND of the upper row (Marked TXD on pinout.)  
ESP12E TX is connected to the adiacent pin at the end of the upper row (Marked RXD on pinout.)

![step2](/img/mks-1.2/board.png?width=300px)

---

### MKS Smoothieware board

![step1](/img/mks-smoothieware/mks-smoothie.png?width=300px)

---

### RADDS board

![step1](/img/radds/radds.png?width=300px)

![step2](/img/radds/screen.jpg?width=300px)

---

### RAMPS 1.4/Re-ARM board

Ramps 1.4 can be used on Arduino Mega (repetier/marlin) and Re-ARM for ramps boards (smoothieware/marlin)  

![step1](/img/ramps1.4/ramps.png?width=300px)

Alternative pins if use Re-ARM (J4/UART port)

![step2](/img/ramps1.4/screenshot-20190803-022151.png?width=300px)

---

### Smoothieboard board

![step1](/img/smoothieware/smoothieboard-wiring.png?width=300px)

---

### SKR Mini E3 board

This board is from Bigtreetech and went through various hardware revisions; all of them still feature a TFT pin header which is where you can tap the TX and RX needed. The wiring below is made with a 1.2 board, but the same applies for the other revisions as well; if you need the exact schematic for your mainboard version, you can check [Bigtreetech's github repository](https://github.com/bigtreetech/BIGTREETECH-SKR-mini-E3/tree/master/hardware).

![step1](/img/skr-mini-e3/mini_12_board.jpg?width=300px)

![step2](/img/skr-mini-e3/skr_mini_12_schematic.png?width=300px)

You literally cannot miss it because the TFT connector is labeled on the board; you can use dupont connectors for the wiring job, no soldering skills needed as long as your ESP comes with pre soldered headers. 
Just a heads up: the TFT connector provides 5V DC, so be sure to provide them on the correct ESP pin and, most importantly, if your ESP can work with 5 volts as input. You should also pay attention on the board orientation in the schematic, although I oriented it the same way as the actual picture on the left so it's easier for you. 

---

### Weedo Tina2 board

This printer is also brand labelled as **Monoprice MP cadet 3D printer**

![step1](/img/tina2/weedo_tina2.jpg?width=300px)

In marlin this connection is **serial port 3**.

Note the Mega2560 is 5V powered and ESP is 3V3 powered.  

---

### For printer boards not listed here

Vast majority of printers have an USB port that is converted to UART before going to MCU. Many printers also have additional (unused) UART port you can use. When possible, always use the additional port for connecting ESP to printer board. When no additional UART port is available you might use the Tx and Rx lines between USB/UART converter and MCU but it's recommended to cut (in a reversible way) the line to USB/UART converter to avoid conflicts.

If the board is ATmega based the simplest way to find a usable UART port for the ESP is to open ATmega datasheet.

## ESP boards

### ESP-01

- Use GPIO2 to ground to reset all settings in hard way - 2-6 sec after boot / not before!! Set GPIO2 to ground before boot change boot mode and go to special boot that do not reach FW. Currently boot take 10 sec - giving 8 seconds to connect GPIO2 to GND and do an hard recovery for settings   
- Use GPIO0 to ground to be in update mode 

![step1](/img/hw/wires.png?width=300px)

---

### ESP-01 serial wifi module

![step1](/img/hw/ff587ce89a.jpg?width=300px)

more info about the Breakout PCB: [keyestudio](https://www.keyestudio.com/keyestudio-esp-01s-wifi-to-serial-shield-module-for-arduino-esp8266-wifi-p0499-p0499.html)

---

### ESP-12E/F

ESP need 3.3v, it is not 5v tolerant, if printer board use more than 3.3V like 5V on ramps.  

![step1](/img/hw/wiresesp12e.png?width=300px)

you can also use Logic LevelConverter Bi-Directional

![step2](/img/hw/logic.png?width=300px)

In order to flash some ESP12E/F boards via their UART interface, the following pins need to be connected:

- VCC to GPIO2
- GND to GPIO0

This has been tested with ESP-12-E boards labeled "ESP8266 For ESP3D FYSETC.COM"

---

### ESP 12F serial wifi module

 ESP-12F based serial wifi module (eg [from aliexpress](https://www.aliexpress.com/item/ESP8266-ESP-12F-Serial-WIFI-Wireless-Transceiver-Module-For-Arduino-ESP-12F-Adapter-Expansion-Board-For/32804504326.html) ) contains built in 2-way levelshifter/bi-directional logic level converter. So it can be powered via 5V uart from the target' motherboard.

- We need to manualy ground the ```IO0``` while powering up to start in flash mode while powering up (there is no switch for that, neither for reset)
![step1](/img/esp/esp12.png?width=300px)
- Use FTDI adapter as usb2serial
- Need to see in console/serial monitor boot mode is (**1**,7).
  - baudrate: 74880
  - ```rst cause:2, boot mode:(3,7)```
- Then flash like other esp based board for esp3d

---

### ESP32-Cam

![step1](/img/esp/espcam32.png?width=300px)

Note: 5V is power supply input and 3V3 is output from regulator. UART Tx and RX signals will be 3.3V

---

### NodeMCU V2/V3

![step1](/img/nodemcu/nodemcu.png?width=300px)

---

### Sonoff

![step1](/img/sonoff/sonoff.png?width=300px)

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

![step1](/img/d1_mini/wemos-d1-mini_logic-level-converter.jpg?width=300px)

example:  
![step1](/img/d1_mini/wemos-d1-mini_logic-level-converter-2.jpg?width=300px)

printed cases:
* <https://www.thingiverse.com/thing:4128593>
* <https://www.thingiverse.com/thing:2671591>
