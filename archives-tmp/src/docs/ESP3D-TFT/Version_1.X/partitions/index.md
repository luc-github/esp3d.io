## Sumup of ESP3D-TFT partitions (ESP-IDF)

| Flash Size | App Partition Size | SPIFFS Size |
|------------|---------------------|-------------|
| 4 MB       | 1.94 MB (0x1E0000)  | 250 KB (0x3E800) |
| 8 MB       | 2.5 MB (0x280000)   | 2.94 MB (0x2F0000) |
| 16 MB      | 2.5 MB (0x280000)   | 10.94 MB (0xAF0000) |
| 32 MB      | 2.5 MB (0x280000)   | 26.94 MB (0x1AF0000) |


## Structure

| Name |   Type | SubType | Offset|  Size | Flags |
|-|-|-|-|-|-|
|nvs |      data | nvs |     0x9000 |  0x5000 |
|otadata |  data | ota |     0xe000 |  0x2000 |
|app0 |     app |  ota_0 |   0x10000 | TBD |
|app1 |     app |  ota_1 |   TBD |TBD |
|spiffs |   data | spiffs |  TBD |TBD |

!!! Note
    No coredump on partition because feature is disabled
