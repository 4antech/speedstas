crc = require("crc");


//var xxx = new Buffer.from(Array(0x7e,01,00,06,00,0x23,0x83,06,0x7f));
var xxx = new Buffer.from(Array(0x7e,01,00,06,01,0x23,0x83,06,0x7f));


//7e.01.00.06.01.23.83.06.7f
xx = crc.crc16kermit(xxx);

console.log(xx.toString(16));