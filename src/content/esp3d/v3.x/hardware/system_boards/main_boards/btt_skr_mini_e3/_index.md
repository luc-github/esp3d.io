+++
archetype = "section"
title = "Bigtreetech skr mini board"
descrption = "No socket available"
weight = 9
+++
This board is from Bigtreetech and went through various hardware revisions; all of them still feature a TFT pin header which is where you can tap the TX and RX needed. The wiring below is made with a 1.2 board, but the same applies for the other revisions as well; if you need the exact schematic for your mainboard version, you can check [Bigtreetech's github repository](https://github.com/bigtreetech/BIGTREETECH-SKR-mini-E3/tree/master/hardware).

![step1](mini_12_board.jpg?width=300px)

![step2](skr_mini_12_schematic.png?width=300px)

The TFT connector is labeled on the board; you can use dupont connectors for the wiring job, no soldering skills needed as long as your ESP comes with pre soldered headers. 
Note: the TFT connector provides 5V DC, so be sure to provide them on the correct ESP pin and, most importantly, if your ESP can work with 5 volts as input. You should also pay attention on the board orientation in the schematic, although I oriented it the same way as the actual picture on the left so it's easier for you. 

