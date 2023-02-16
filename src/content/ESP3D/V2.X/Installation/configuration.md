
## ESP3D configuration   

Open esp3d/config.h and set features you want.

```cpp
//Customize ESP3D ////////////////////////////////////////////////////////////////////////
#define ESP8266_MODEL_NAME "ESP8266"
#define ESP8266_MODEL_URL "http://espressif.com/en/products/esp8266/"
#define ESP32_MODEL_NAME "ESP32"
#define ESP32_MODEL_URL "https://www.espressif.com/en/products/hardware/esp-wroom-32/overview"
#define ESP_MODEL_NUMBER "ESP3D 2.1"
#define ESP_MANUFACTURER_NAME "Espressif Systems"
#define ESP_MANUFACTURER_URL "http://espressif.com"
//default name if no mac address is valid
#define ESP_DEFAULT_NAME "MYESP"
//if commented name will follow mac address 3 last digits
//like ESP_XXXXXX (eg:ESP_028E41) to avoid overlap if several ESP3D
#define ESP_HOST_NAME ESP_DEFAULT_NAME

//To allow webupdate using small updater
//#define USE_AS_UPDATER_ONLY

//FEATURES - comment to disable //////////////////////////////////////////////////////////

//WEB_UPDATE_FEATURE: allow to flash fw using web UI
#define WEB_UPDATE_FEATURE

#ifndef USE_AS_UPDATER_ONLY
//Do we use async webserver or not (currntly deprecated do not enable it yet)
//#define ASYNCWEBSERVER

//SERIAL_COMMAND_FEATURE: allow to send command by serial
#define SERIAL_COMMAND_FEATURE

//TCP_IP_DATA_FEATURE: allow to connect serial from TCP/IP
#define TCP_IP_DATA_FEATURE

//NOTIFICATION_FEATURE : allow to push notifications
#define NOTIFICATION_FEATURE

//MKS TFT WIFI support see Wiki for wiring
//#define MKS_TFT_FEATURE

//MDNS_FEATURE: this feature allow  type the name defined
//in web browser by default: http:\\esp8266.local and connect
#define MDNS_FEATURE

//SSDD_FEATURE: this feature is a discovery protocol, supported on Windows out of the box
#define SSDP_FEATURE

//NETBIOS_FEATURE: this feature is a discovery protocol, supported on Windows out of the box
//#define NETBIOS_FEATURE

//CAPTIVE_PORTAL_FEATURE: In SoftAP redirect all unknow call to main page
#define CAPTIVE_PORTAL_FEATURE

//RECOVERY_FEATURE: allow to use GPIO2 pin as hardware reset for EEPROM, add 8s to boot time to let user to jump GPIO2 to GND
//#define RECOVERY_FEATURE

//DIRECT_PIN_FEATURE: allow to access pin using ESP201 command
#define DIRECT_PIN_FEATURE

//ESP_OLED_FEATURE: allow oled screen output
//#define ESP_OLED_FEATURE

//DHT_FEATURE: send update of temperature / humidity based on DHT 11/22
//#define DHT_FEATURE

//AUTHENTICATION_FEATURE: protect pages by login password
//#define AUTHENTICATION_FEATURE

//WS_DATA_FEATURE: allow to connect serial from Websocket
#define WS_DATA_FEATURE

//TIMESTAMP_FEATURE: Time stamp feature on direct SD  files
//#define TIMESTAMP_FEATURE
#endif //USE_AS_UPDATER_ONLY
//Extra features /////////////////////////////////////////////////////////////////////////

//Workaround for Marlin 2.X coldstart
//#define DISABLE_CONNECTING_MSG

//Serial rx buffer size is 256 but can be extended
#define SERIAL_RX_BUFFER_SIZE 512

//Serial Parameters
#define ESP_SERIAL_PARAM SERIAL_8N1

//which serial ESP use to communicate to printer (ESP32 has 3 serials available, ESP8266 only one)
//Uncomment one only
#define USE_SERIAL_0
//For ESP32 Only
//#define USE_SERIAL_1
//#define USE_SERIAL_2

//Pins Definition ////////////////////////////////////////////////////////////////////////
//-1 means use default pins of your board what ever the serial you choose
#define ESP_RX_PIN -1
#define ESP_TX_PIN -1

#ifdef RECOVERY_FEATURE
//pin used to reset setting
#define RESET_CONFIG_PIN 2
#endif

#ifdef DHT_FEATURE
#define ESP_DHT_PIN 2
#endif

//Pins where the screen is connected
#ifdef ESP_OLED_FEATURE
#define OLED_DISPLAY_SSD1306  // OLED Display Type: SSD1306(OLED_DISPLAY_SSD1306) / SH1106(OLED_DISPLAY_SH1106), comment this line out to disable oled
#define OLED_PIN_SDA  4  //5 //SDA;  // i2c SDA Pin
#define OLED_PIN_SCL  15  //4 //SCL;  // i2c SCL Pin
#define OLED_ADDR   0x3c
#define HELTEC_EMBEDDED_PIN 16 //0 to disable
#define OLED_FLIP_VERTICALY 1 //0 to disable
#endif
```

