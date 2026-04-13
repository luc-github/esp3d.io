## Sumup of ESP3D partitions (Arduino)

| Flash Size | App Partition Size | SPIFFS Size | Coredump Size |
|------------|---------------------|-------------|----------------|
| 4 MB       | 1.89 MB (0x1D0000)  | 250 KB (0x3E800) | 64 KB (0x10000) |
| 8 MB       | 2.5 MB (0x280000)   | 2.88 MB (0x2E0000) | 64 KB (0x10000) |
| 16 MB      | 2.5 MB (0x280000)   | 10.88 MB (0xAE0000) | 64 KB (0x10000) |
| 32 MB      | 2.5 MB (0x280000)   | 26.88 MB (0x1AE0000) | 64 KB (0x10000) |

## Structure

| Name |   Type | SubType | Offset|  Size | Flags |
|-|-|-|-|-|-|
|nvs |      data | nvs |     0x9000 |  0x5000 |
|otadata |  data | ota |     0xe000 |  0x2000 |
|app0 |     app |  ota_0 |   0x10000 | TBD |
|app1 |     app |  ota_1 |   TBD |TBD |
|spiffs |   data | spiffs |  TBD |TBD |
|coredump | data | coredump |TBD |0x10000 |
