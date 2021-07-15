#!/usr/bin/env node
/*

вращение 0x1
	     лево - 0 
	    право - 1
    
    	 0X7


концевик калибровочный право : GPIO 2 : енкодер 1 значение 4984  39800  int ---
концевик калибровочный лево  : GPIO 6 : енкодер 1 значение 7963  63476  int ---


*/

var maxsp=0;
const version= 0x00FF0101; // 4 bytes;
const debug=1;
const SERVERPORT = 9090;
const pi=Math.PI;
const pi2=Math.PI*2;
const pina2=Math.PI/2;
const r2g=180/Math.PI;
const SERVERHOST='0.0.0.0';

const Gpio = require('pigpio').Gpio;



const dgram = require('dgram');
const server = dgram.createSocket('udp4');
//if (setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &(int){1}, sizeof(int)) < 0)
//    error("setsockopt(SO_REUSEADDR) failed");
const fs = require("fs");
const {Worker, workerData} = require('worker_threads')
//const con = [azleft,azright]



const len = 30;
const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * len);
const sharedArray = new Int32Array(sharedBuffer);
for (i=0;i<30;i++) Atomics.store(sharedArray, i, 0);
Atomics.store(sharedArray,24,version); // SET VERSION
function ip2int(ip) {return ip.split('.').reduce(function(ipInt, octet) { return (ipInt<<8) + parseInt(octet, 10)}, 0) >>> 0;}
function hexdump(msg) {return Array.prototype.map.call(new Uint8Array(msg), x => ('00' + x.toString(16)).slice(-2)).join('.');}
function consolelog(msg){
  if (debug) {
    ts = new Date();
    var textlog=(ts.getTime()+'. ' + msg);
    console.log(textlog);
    if (debug>2) textlog=textlog+' <br>';
    if (debug>1) fs.appendFileSync("./server.log", textlog+'\n');
  }
}
var workers = new Array();
var xstatus = new Array();
var xxport   = new Array();

// RESET ESP from START
function reset() {
var { exec } = require('child_process');
exec('/usr/bin/gpio write 25 0',(err, stdout, stderr) => {
setTimeout(()=>{
    exec('/usr/bin/gpio write 25 1',(err, stdout, stderr) => {consolelog("* ESP reset ok");setTimeout(()=>{initSerial()},700);})},100);
});
}

reset();

var enc=[1,2];
var xtm = 0;

//var xgist = 3030;
var xgist = 0;

/////////////////
///////////////////////my variables
var indtcnt = 0;
var flag2stop = 0 ;
var statemove_el = 0;
var statemove_az = 0;
//variable - flag-status brake-stat 0-off 1-brake-on
var statebrake_el = 0; //not used in pion
var statebrake_az = 0; 

//TODO: set to REAL DATA for device
var  AZ_SOFTLIMIT_CW   = 20; // 180
var  AZ_SOFTLIMIT_CCW  = 20; // 0
var  EL_SOFTLIMIT_UP   = 30; // 88
var  EL_SOFTLIMIT_DOWN = 40; // 5
var  AZ_OFFSET = 0;   //  <---+______ TODO: initfunction. 
var  EL_OFFSET = 0;   //  <---+
//END TODO---------------------------
///////////////////////////////////////////////////////
//SerialPort extention

var savedTime = [0,0,0];
var savedPos  = [0,0,0];

/*
const SerialPort = require('serialport')
const parsers = SerialPort.parsers
const parser = new parsers.Readline();
const port = new SerialPort('/dev/serial0', {baudRate: 921600});
*/
var sstarted = 0;

function savepoints() {
var out = {'cw':sharedArray[18],'ccw':sharedArray[19],
	   'up':sharedArray[20],'dwn':sharedArray[21],
	   'of':sharedArray[22],'off':sharedArray[23],
}
  fs.writeFile('settings.json', JSON.stringify(out), { flag: "w" }, (err) => {
    if (err) throw err;
  });

}


function loadconf() {
var addr = require("./default.json");
}

function loadpoints() {
var points = require("./settings.json");
	Atomics.store(sharedArray,18,points.cw);
	Atomics.store(sharedArray,19,points.ccw);
	Atomics.store(sharedArray,20,points.up);
	Atomics.store(sharedArray,21,points.dwn);
	Atomics.store(sharedArray,22,points.of);
	Atomics.store(sharedArray,23,points.off);
	  AZ_SOFTLIMIT_CW   = points.cw; 
	  AZ_SOFTLIMIT_CCW  = points.ccw;
	  EL_SOFTLIMIT_UP   = points.up; 
	  EL_SOFTLIMIT_DOWN = points.dwn; 
	  AZ_OFFSET = points.of;  
	  EL_OFFSET = points.off;
}

loadpoints();


var smove;
var xxpos;
var xxlast;

function initSerial() {


if (sstarted) return; else sstarted = 1;
const SerialPort = require('serialport')
//const Ready = require('@serialport/parser-ready')
const parsers = SerialPort.parsers
//const parser = new parsers.Readline();
//const port = new SerialPort('/dev/serial0', {baudRate: 921600});
const port = new SerialPort('/dev/serial0', {
   baudRate: 3000000,
   dataBits: 8,
   parity: 'none',
   stopBits: 1,
   flowControl: false
});

//const parser = port.pipe(new Ready({ delimiter: 'rst' }))
//parser.on('ready', () => console.log('the ready byte sequence has been received'))

//workers[0] = new Worker('./tserial.js', { workerData: {i:0, data:sharedBuffer}});
const parser = new parsers.Readline({delimiter: '\n'});

port.pipe(parser);
port.on('open', () => {

//	port.write("1|11|15|1|7|z\n"); // 1 - INIT 2,3 encoders,4,5 motors,6 - debug
	consolelog('* SerialPort ok');
	setTimeout(()=>{
	port.write("1|11|15|1|7|3|z\n")},100);
//	port.write("1|11|15|2\n")},100);
    });

var last = [0,enc[1],enc[2]];
var xxlast = Array();
var xlast = Array();
var xspeed = [0,0,0];
var vect = [1,1,1];
var ovect = [0,0,0];




//Aзимут - // 16566 - 63229  
//Угол   - // 32306 - 48133

const conf = {
	"azimuth" : {"k1":16566,"k2":63229,"pinLeft":27,pinRight:25},
	    "ele" : {"k1":32306,"k2":48133,"pinLeft":0,pinRight:0}
}


const azleft = new Gpio(conf.azimuth.pinLeft, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
const azright = new Gpio(conf.azimuth.pinRight, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});



function xxstop(can,lr) {
switch (lr) {		
		case "k1" :
		delta = Math.abs(enc[can]-conf.azimoth.k2);
		break;
		case "k2" :
		delta = Math.abs(enc[can]-conf.azimoth.k1);
		break;
}

if (delta>50) {
	consolelog("ALERT!!!! "+lr+" STOP! "+can+" DEV");
	port.write("2|"+can+"|0|z\n");
}

//console.log("stop :",lr);
}

azleft.on('alert', (level, tick) => {if (!level) xxstop(1,'k1');});
azright.on('alert', (level, tick) => {if (!level) xxstop(1,'k2');});

grad = 0;
xl = Array();


en = 0;
//var xxshift = 1000;

odata = "";
parser.on('data', data=>{
//console.log(data);
//port.on('data', data=>{
n = data.split('|');
//console.log(">>>",n[0]);
if (n.pop()!="z") return ;

if (n[0] == "1") {
	consolelog("* CAN BUS ok, ",n[1],n[2]);
	server.bind(SERVERPORT, SERVERHOST, function(){});
}

if (n[0] == "2") {

pr = new Promise(function(resolv,reject){

	if (n[1]=="11") en = 1; else en = 2;
	
	last[en] = enc[en];
	
	enc[en] = (parseInt(n[2],16)|0);
	if (en==1) enc[en] = enc[en]+AZ_OFFSET; else enc[en] = enc[en]+EL_OFFSET;
	if (enc[en]>65535) enc[en]-=65535;

//	if ((Date.now()-xlast[en]<100) && Math.abs(last[en]-enc[en])>120) {
//	    console.log(data,odata);
//	    console.log("FUCK!!!!!",xlast[en],Date.now(),enc[en],last[en]);
//	    reject(1);
//	    return;
//	}

//xgist = 380;

//	xxvector = last[en]>enc[en];


	    ovect[en] = vect[en];
	    if (enc[en]>last[en]) vect[en]=1; else vect[en]=0;

//	vect[en] = (enc[en]>last[en]);

//console.log(en,enc[en],last[en],vect[en],ovect[en]);
	if (last[en]==enc[en] || (Math.abs(last[en]-enc[en])==1) && vect[en]!=ovect[en]) { 
	    enc[en]=last[en];
//	console.log(">>catchit",enc[1],last[en],last[en]-enc[1],ovect[en],vect[en]);
	return 0;  								// Антидребезг ;)
	
	} 

//	ovect[en] = vect[en];
//	vect[en] = !vect[en];
if (en==1) {
	if (((enc[1]<AZ_SOFTLIMIT_CW) && xxlast[1]==0) || ((enc[1]>AZ_SOFTLIMIT_CCW) && xxlast[1]==1)) {
	    port.write("2|1|0|z\n");
	    console.log("HERE",Math.abs(last[en]-enc[en]),enc[1],"---");
	}
} else {
//console.log(enc[2],EL_SOFTLIMIT_UP,EL_SOFTLIMIT_DOWN,xxlast[7]);
	if (((enc[2]>EL_SOFTLIMIT_DOWN) && xxlast[7]==1) || ((enc[2]<EL_SOFTLIMIT_UP) && xxlast[7]==0)) {
	    port.write("2|7|0|z\n");
	    console.log("HERE",Math.abs(last[en]-enc[en]),enc[2],"---");
	}
}

	if (!xtm) {setTimeout(()=>consolelog("* ENC["+en+"] : "+enc[en]),200);}
	xtm = new Date().getTime() & 0xFFFFFFFF;
//	enc[1] = (parseInt(n[2],16)|0)<<4;

/*
	if (savedTime[en]) {
		xshift = Math.abs(savedPos[en] - enc[en]);
		xtimes = xtm - savedTime[en];
		speed = Math.trunc((xshift/xtimes)*1000);
	    if (en==1) {
	    Atomics.store(sharedArray,12,speed);
	    } else {
	    Atomics.store(sharedArray,15,speed);
	    }	
	}

*/
	
	if (en==1) {
	Atomics.store(sharedArray,11,xtm);
	Atomics.store(sharedArray,10,(parseInt(n[2],16)|0));//	2 ENCODER  <<4 было
	} else {
	Atomics.store(sharedArray,14,xtm);
	Atomics.store(sharedArray,13,(parseInt(n[2],16)|0));
}

odata = data;

     resolv(1);reject(0);
});

/*

Значения концевиков енкодеров.

Aзимут - // 16566 - 63229  
Угол   - // 32306 - 48133


*/

pr.then(()=>{
	
	xl[en] = xlast[en];
	xlast[en] = Date.now();
	savedTime[en] = xtm[en];
	savedPos[en]  = enc[en];
	lgrad = grad;
	grad = (enc[en]*360/65535);
	test = (grad-lgrad)/((xlast[en]-xl[en]))*1000;

        if (xlast[en]-xl[en]) curspeed=(lgrad-grad)/(xlast[en]-xl[en])*1000; else curspeed=0;
        if (maxsp < curspeed) maxsp=curspeed;
	consolelog(">>"+en+" "+enc[en]+" grad:"+Math.round(enc[en]*36000/65535)/100+" speed:"+curspeed+" : "+(Date.now()-xl[en])+" : "+xspeed[en]);
//        consolelog("* Curent speed: "+curspeed+" max:"+maxsp)
	checkStop();


	for (i=1;i<10;i++) {
	if (xstatus[i]!=0) {
		Atomics.notify(sharedArray,i);
		if (xstatus[i]>0) xstatus[i]--;
	}}
});

}});

/*
var movv = 1000;
xt = setInterval(() => {
//console.log("2|15|"+movv.toString(16)+"|z\n")
parser.write("2|15|"+movv.toString(16)+"|z\n");
movv = movv+330;
},1000);
*/
  

var azimuth = {
	enc	: 0,
	ts  	: 0,
	vect	: 0,
	pinm	: 1,
	pine	: 1		


}

const readline = require('readline');
const rl = readline.createInterface({input: process.stdin, output: process.stdout });
rl.on('line', (line) => {

arr = line.split(" ");
if (line.substring(0,1)=="!") port.write(line); else {
//if (arr[0]==-1) console.log(readenc(15)); else {
//console.log(arr[0]+','+arr[1]+','+arr[2]);
//if (arr[1]*1==1) {port.write("3|1|1|z\n")} else {port.write("3|0|0|z\n")}}

xxlast[arr[0]] = arr[1];
xspeed[arr[0]] = arr[2];

if (arr[0]>0) {
consolelog("MOVE>> "+arr[0]+"|"+arr[1]+"|"+arr[2]);
port.write("2|"+arr[0]+"|"+arr[1]+"|"+arr[2]+"|z\n");
}
}
});

var ostop = 0;
var stop = -1;
var cw = 0;
var xen = 0;

smove = function(can,pos,speed) {
//gist = Math.abs(enc[1]-pos);
if (can==1) xen = 1; else xen = 2;
xxpos = enc[xen]+pos;
stop = xxpos;
if (enc[xen]>xxpos) cw = 0; else cw = 1;
xxlast[can]=cw;
//if (gist>xgist) {if (cw)  stop = pos+xgist; else stop=pos-xgist;}
console.log(">>>>>>>>>>>>>>>>>>>>>",pos,speed,cw,Math.trunc(speed/10));
xmove(can,cw,Math.trunc(speed/10));
//console.log(1,cw,Math.trunc(speed/10));
}


function checkStop() {
if (stop>=0) {
if (!cw && enc[xen]<stop || cw && enc[xen]>stop) {
console.log("stop");
ostop = stop
stop = -1;
port.write("2|"+xen+"|0|z\n");}
consolelog("stop "+stop+" : "+enc[1]);
}
}



function xmove(can_address,ccw,speed) {
//console.log(can_address,ccw,speed,port);
  port.write("2|"+can_address+"|"+ccw+"|"+speed+"|z\n");
}

}



///////////////////////////////////////////////
var dgsize=[9,5,10,12,10,12,6,5,10,12,10,12,6,5,28];
var arg = Array();
////////////////////////////////////////////////

function validation(message,xport){
if (message[0]!=126 || message[message.length-1]!=127 ) return 2

  var npack=message[1];
  var cmd=message[2];

  if (cmd<0 || cmd>15) return 3; //unknown command
  if (dgsize[cmd]!=message.length) return 4; //command size.
////////////
//validation  args:
///////// command N1 (0x00)
  if (cmd==0) { // 0
    arg[1]=message[3];
    arg[2]=message[4];
    arg[3]=message[6] + (message[5]<<8);
    arg[4]=message[7]*1;

    if (arg[4]>10 || arg[4]<0) return 1;

    if (xxport[arg[4]]*1 == 0) {Atomics.store(sharedArray,arg[4],arg[3])} // SEND PORT DATA

    consolelog("<< cmd:"+cmd+" N="+npack+"; potok N"+ arg[1]+"; max pack="+ arg[2] +"; port:"+ arg[3] +"; pattern "+ arg[4]+";");
//    if (arg[2]==0 || arg[4]>10) {consolelog("! error args");return 1;}
  }
///////// command N3 (0x02) & command N9 (0x08)
  else if (cmd==2 || cmd==8) { 
    arg[1]= (message[3]<<24) + (message[4]<<16) + (message[5]<<8)+message[6];
    arg[2]= (message[7]<<8) + message[8];
    consolelog("<<cmd:"+cmd+" N="+npack+" coord="+ arg[1]+" speed="+ arg[2]);
    if (arg[1]<0 || arg[1]>1048576 || arg[2]<0 || arg[2]>1000) {consolelog("! error args "+arg[1]+" "+arg[2]);return 1;}
//TODO softlimit
//    else if (arg[1]< || arg[1]>1048576){return 5}
  }
///////// command N4 (0x03) & command N10 (0x09)
  else if (cmd==3 || cmd==9) { 
    arg[1]= (message[3]<<24) + (message[4]<<16) + (message[5]<<8)+message[6];
    arg[2]= (message[7]<<24) + (message[8]<<16) + (message[9]<<8)+message[10];
    consolelog("<<cmd:"+cmd+" N="+npack+" coord="+ arg[1]+"  time="+ arg[2]);
    if (arg[1]<0 || arg[1]>1048576 ) {consolelog("! error args");return 1;}
  }
///////// command N5 (0x04) & command N11 (0x0a)
  else if (cmd==4 || cmd==10) { 
    arg[1]= (message[3]<<24) + (message[4]<<16) + (message[5]<<8) + message[6];
    arg[2]= (message[7]<<8)+message[8];
    consolelog("<<cmd:"+cmd+" N="+npack+" angle="+ arg[1]+" speed="+ arg[2]);
    stop = enc[1]+arg[1];
    if (stop<AZ_SOFTLIMIT_CW || stop>AZ_SOFTLIMIT_CCW) {console.log("! error out of range "); return 1;}
    if (arg[1]<-65535 || arg[1]>65535 || arg[2]<0 || arg[2]>1000) {consolelog("! error args");return 1;}
  }
///////// command N6 (0x05) & command N12 (0x0b)
  else if (cmd==5 || cmd==11) { 
    arg[1]= (message[3]<<24) + (message[4]<<16) + (message[5]<<8) + message[6];
    arg[2]= (message[7]<<24) + (message[8]<<16) + (message[9]<<8) + message[10];
    consolelog("<<cmd:"+cmd+" N="+npack+" angel="+ arg[1]+"  time="+ arg[2]);
    if (arg[1]<-1048576 || arg[1]>1048576 ) {consolelog("! error args");return 1;}
  }
///////// command N7 (0x06) & command N13 (0x0c)
  else if (cmd==6 || cmd==12 ) { 
    arg[1]= (message[3]<<8)+message[4];
    consolelog("<<cmd:"+cmd+" N="+npack+" speed="+ arg[1]);
    if (arg[1]<-1048576 || arg[1]>1048576 ) {consolelog("! error args");return 1;}
  }
///////// command N15 (0x0e)
  else if (cmd==14) { 
  //parsing:
    arg[1]= (message[3]<<24) + (message[4]<<16) + (message[5]<<8) + message[6];
    arg[2]= (message[7]<<24) + (message[8]<<16) + (message[9]<<8) + message[10]; //
    arg[3]= (message[11]<<24) +(message[12]<<16) + (message[13]<<8) + message[14]; //
    arg[4]= (message[15]<<24) +(message[16]<<16) + (message[17]<<8) + message[18]; //
    arg[5]= (message[19]<<24) + (message[20]<<16) + (message[21]<<8)+ message[22]; //
    arg[6]= (message[23]<<24) + (message[24]<<16) + (message[25]<<8)+ message[26]; //
    consolelog("<< cmd:"+cmd+" N="+npack+" az_cw="+ arg[1]+"  az_ccw="+ arg[2]+" el_down="+ arg[3]+" el_up="+ arg[4] +" az_delta="+ arg[5]+" el_delta="+ arg[6]);
  //validation
    if (arg[1]<0 || arg[1]>1048576 || 
        arg[2]<0 || arg[2]>1048576 || 
        arg[3]<-524288 || arg[3]>524288 || 
        arg[4]<-524288 || arg[4]>524288 || 
        arg[5]<-1048567 || arg[5]>1048576 || 
        arg[6]<-1048567 || arg[6]>1048576 ) {consolelog("! error args");return 1;}
  //set variable if correct
    else {
	
	Atomics.store(sharedArray,18,arg[1]);
	Atomics.store(sharedArray,19,arg[2]);
	Atomics.store(sharedArray,20,arg[3]);
	Atomics.store(sharedArray,21,arg[4]);
	Atomics.store(sharedArray,22,arg[5]);
	Atomics.store(sharedArray,23,arg[6]);

      AZ_SOFTLIMIT_CW   = arg[1]; 
      AZ_SOFTLIMIT_CCW  = arg[2];
      EL_SOFTLIMIT_DOWN   = arg[3];
      EL_SOFTLIMIT_UP = arg[4];
      AZ_OFFSET = arg[5];   
      EL_OFFSET = arg[6];  

      consolelog("* set variable:")
//      consolelog("= set AZ softlimit cw="+ (arg[1]*360)/65536);
//      consolelog("= set AZ softlimit ccw="+ (arg[2]*360)/65536);
      consolelog("= set AZ softlimit cw="+ (arg[1]));
      consolelog("= set AZ softlimit ccw="+ (arg[2]));
      consolelog("= set EL softlimit down="+ arg[3]);
      consolelog("= set EL softlimit el_up="+ arg[4]);
      consolelog("= set AZ ofset="+ arg[5]);
      consolelog("= set EL ofset="+ arg[6]);
	savepoints();
    }
  } //end command 15 (0x0e)

  return 0;
} // end of verification function
// validation code:
// good data           0
// bad args            1
// non-formated        2
// unknown command     3
// bad packet size     4
// permition           5
///////////////////////////////////////////////////////////////////////
function getxy(){return Math.sqrt(ts.getTime);}; //TODO: <--- ztychka

/* My Code */

/*
SharedBuffer int32
0   - remote ip address
1-9 - atomics events notify
10  - Азимут		4
11  - Азимут Время	4
12  - Ащимут Скорость	2
13  - Угол		4
14  - Угол время	4
15 - Угол скорость	2
16 - концевики		1
17 - Авария		1
18 - Азимут 1 концевик  4
19 - Угол 1		4
20 - Азимут 2		4
21 - Угол 2 		4
22 - Азимут offset	4
23 - Угол offset	4
24 - Версия		4	
25 - AZIMUT STOP	4
26 - Угол STOP		4
27 - AZIMUT speed	2
28 - Угол speed		2



      AZ_SOFTLIMIT_CCW   18
      AZ_SOFTLIMIT_CW    19
      EL_SOFTLIMIT_DOWN  20
      EL_SOFTLIMIT_UP    21
      AZ_OFFSET		 22   
      EL_OFFSET		 23


SharedArray = [4,4,4,4,2,2,2]

Templates [port, trigger, data1, data2...]
*/

var templates = {

	1: [9097, 0, 10, 11],
	2: [9091, 0, 13, 14],
	3: [9093, 0, 12, 11],
	4: [9094, 0, 15, 14],
	5: [9092, 0, 10, 11, 13, 14],
	6: [9093, 0, 24, 0],
	7: [9094, 0, 16],
	8: [9096, 0, 17],
	9: [9097, 0, 18, 19, 20, 21, 22, 23],
       10: [9090, 0],

}

for (i=1;i<10;i++) {
workers[i] = new Worker('./tudp.js', { workerData: {i:i, tpl:templates[i], data:sharedBuffer}});
//setTimeout(()=>{console.log(i);workers[i].postMessage({idx:i, data:sharedArray})},100);
//workers[i].postMessage(1);
xstatus[i] = 0;
xxport[i]=0;
}

var counter = 1;
var xc = 0;

///////////////////////server function
server.on('error', function (err){
  consolelog('! server error: '+err.stack);
  server.close(function(){console.log('!!!!!!!!!!!server down!!!!!!!!!!!!');});
});

server.on('listening', function () {
  lastcmd=0;
  var address = server.address();
  consolelog('* Start UDP Server listening on ' + 
  address.address + ":" + 
  address.port)+ 
  " With full validation."; 
});

server.on('message', function (message, remote) {

  Atomics.store(sharedArray,0,ip2int(remote.address));


  var msglog='';
  consolelog('< rcv from ' + remote.address + ':' + remote.port + 
  ' - [' + hexdump(message) + ']');
  var command=message[2];
  var dtnum=message[1];
  if (command==0) var xtempl = message[7]; else if (command==1) xtempl = message[3];
  var validstatus=validation(message); 
 
//var ssst =  process.hrtime();
  var packetResponse=new Buffer.from('whois');
  packetResponse[0]=0x7e;
  packetResponse[1]=message[1];
  packetResponse[2]=message[2];
  packetResponse[3]=validstatus;
  packetResponse[4]=0x7f;
//console.log("+++____",process.hrtime(ssst));
  if      (validstatus==1) msglog=("! Error packet args ["+ hexdump(message) +"]");        //bad argument
  else if (validstatus==2) msglog=("! error packet format" );//bad in packet
  else if (validstatus==3) msglog=("! unknown command: [" + command.toString(16) + "] packet N=" +dtnum ); //bad incoming packet
  else if (validstatus==4) msglog=("! error packet size:" + message.length +" for this command:[" + command.toString(16) + "]" + " packet N=" +dtnum  );        //bad incoming packet
  else if (validstatus==0)  {
    msglog=('* CMD Ok [' + command + ']' + " packet N=" +dtnum  ); //pck&arg Ok!   
	switch (command) {
		case 0 : if (!xtempl) {console.log('Error opening'); break;}
			Atomics.store(sharedArray,xtempl,((message[5]*256) + message[6])); // PORT
			Atomics.notify(sharedArray,xtempl);
			xxport[xtempl] = remote.port;
			var stat = -1;
		    if (message[4]) stat = message[4]-1;
			xstatus[xtempl]=stat;
		    break;
		case 1 :
		     if (!xtempl) {consolelog('Error closing '); break;}
		    xstatus[xtempl]=0;
		     xxport[xtempl]=0;
		break;
		case 2 :
	
//			Atomics.store(sharedArray,25,arg[1]);
//			Atomics.store(sharedArray,27,arg[2]);
			console.log(">>>",arg);
//			smove(arg[1],arg[2]);
		break;
		case 4 :
	
//			Atomics.store(sharedArray,25,arg[1]);
//			Atomics.store(sharedArray,27,arg[2]);
//			console.log(">>>",arg);
			smove(1,arg[1],arg[2]);
		break;
		case 10 :
	
//			Atomics.store(sharedArray,25,arg[1]);
//			Atomics.store(sharedArray,27,arg[2]);
//			console.log(">>>",arg);
			smove(7,arg[1],arg[2]);
		break;

	
	}
  };
  consolelog(msglog +' from ' + remote.address + ':' + remote.port);
  /////
  server.send(packetResponse, 0, packetResponse.length, remote.port, 
  remote.address, function(err, bytes) {
    if (err) throw err;
    if (debug>3) consolelog('> MAIN snt UDP server message response to ' + 
      remote.address + ':' + 
      remote.port +' [' + 
      hexdump(packetResponse) + ']');
//    consolelog('____________');
  });
  ////////////  
});//on.message

server.bind(SERVERPORT, SERVERHOST, function(){});



