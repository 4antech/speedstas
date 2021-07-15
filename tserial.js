const threads = require('worker_threads')
const dgram = require('dgram');
const fs = require('fs');
const client = dgram.createSocket('udp4');
var debug = 1;
var xtimer = 0;
const index = threads.workerData.i;
const tpl	= threads.workerData.tpl;
const sharedBuffer = threads.workerData.data;
let sharedArray = new Int32Array(sharedBuffer);
let view = new Uint8Array(sharedBuffer);

var xstatus = Array([0,0,0,0,0,0,0,0,0,0,0,0]);
threads.parentPort.on('message', (event) => {xstatus[event.id] = event.status;});

const SerialPort = require('serialport')
const parsers = SerialPort.parsers
const parser = new parsers.Readline({delimiter: '\n'});
const port = new SerialPort('/dev/serial0', {baudRate: 3000000});
port.pipe(parser);
port.on('open', () => {
	port.write("1|11|15|z\n");
	consolelog('* SerialPort ok');
    });

parser.on('data', data=>{
n = data.split('|');
//console.log(data);
if (n[0]==1) {
	consolelog("* CAN BUS ok, ",n[1],n[2]);
	server.bind(SERVERPORT, SERVERHOST, function(){});
}

if (n[0]==2) {

pr = new Promise(function(resolv,reject){

	if (!xtm) {setTimeout(()=>consolelog("* ENC[1] : "+enc),200);}
	xtm = new Date().getTime() & 0xFFFFFFFF;
	enc = (parseInt(n[2],16)|0)<<4;

	if (savedTime) {
		xshift = Math.abs(savedPos - enc);
		xtimes = xtm - savedTime;
		speed = Math.trunc((xshift/xtimes)*1000);

	Atomics.store(sharedArray,12,speed);
	Atomics.store(sharedArray,15,speed);

	}	

//console.log(">>",n[2]);

//	1 ENCODER

	Atomics.store(sharedArray,11,new Date().getTime() & 0xFFFFFFFF);
	Atomics.store(sharedArray,10,(parseInt(n[2],16)|0)<<4);

//	2 ENCODER

	Atomics.store(sharedArray,14,new Date().getTime() & 0xFFFFFFFF);
	Atomics.store(sharedArray,13,(parseInt(n[2],16)|0)<<4);


//);

     resolv(1);reject(0);
});

pr.then(()=>{

	savedTime = xtm;
	savedPos  = enc;

	for (i=1;i<10;i++) {
	if (xstatus[i]!=0) {
//console.log(">>>>>>",i,xstatus[i]);
Atomics.notify(sharedArray,i);
//console.log("")
if (xstatus[i]>0) xstatus[i]--;
}}
});

}

});

/*
var movv = 1000;
xt = setInterval(() => {
//console.log("2|15|"+movv.toString(16)+"|z\n")
parser.write("2|15|"+movv.toString(16)+"|z\n");
movv = movv+330;
},1000);
*/

// get from STAS.  
    //test on softlimit TODO
//    return this._angl;
  
//Atomics.store(sharedArray,6,xtm);
//Atomics.store(sharedArray,5,enc);
//console.log("----------------------",n[2]);


// Сохраняем позицию енкодера
//port.write(data);
//console.log(n[2]);

//////////////////////////// CAN 
//function readenc(can_address) return enc[can_address];

function xmove(can_address,speed) {
  port.write("2|"+can_address+"|"+speed+"|z\n");
}


/*
xt = setInterval(() => {

pr = new Promise(function(resolv,reject){

	if (!xtm) {setTimeout(()=>consolelog("* ENC[1] : "+enc),200);}
	xtm = new Date().getTime() & 0xFFFFFFFF;
	enc = (parseInt(n[2],16)|0)<<4;
	Atomics.store(sharedArray,11,new Date().getTime() & 0xFFFFFFFF);
	Atomics.store(sharedArray,10,(parseInt(n[2],16)|0)<<4);
     resolv(1);reject(0);
});
pr.then(()=>{
	for (i=1;i<10;i++) {
	if (xstatus[i]!=0) {
Atomics.notify(sharedArray,i);
if (xstatus>0) xstatus[i]--;}}
})},1000);
*/










