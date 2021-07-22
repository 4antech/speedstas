#!/usr/bin/env node
/*

вращение 0x1
	     лево - 0 
	    право - 1
    
    	 0X7
	    верх - 1
	    низ  - 0

концевик калибровочный право : GPIO 2 : енкодер 1 значение 4984  39800  int ---
концевик калибровочный лево  : GPIO 6 : енкодер 1 значение 7963  63476  int ---


*/

var crc = require("crc");
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
const fs = require("fs");
const {Worker, workerData} = require('worker_threads')

const len = 50;
const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * len);
const sharedArray = new Int32Array(sharedBuffer);
for (i=0;i<len;i++) Atomics.store(sharedArray, i, 0);
Atomics.store(sharedArray,24,version); // SET VERSION

function updateBit(number, bitPosition, bitValue) {
  const bitValueNormalized = bitValue ? 1 : 0;
  const clearMask = ~(1 << bitPosition);
  return (number & clearMask) | (bitValueNormalized << bitPosition);
}

/*
setTimeout(()=>{

setbit(0,1);
setbit(2,1);

xstatus[7] = -1;
Atomics.notify(sharedArray,7);
},4000);
*/

var mybyte = 0x00;

function setbit(n,v) {
abits = Atomics.load(sharedArray,16);
Atomics.store(sharedArray,16,updateBit(abits,n,v));
//console.log(">>>>>>!!!",n,v,sharedArray[16].toString(2));
}

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

// RESET ESP at START
function reset() {
var { exec } = require('child_process');
exec('/usr/bin/gpio write 25 0',(err, stdout, stderr) => {setTimeout(()=>{exec('/usr/bin/gpio write 25 1',(err, stdout, stderr) => {consolelog("* ESP reset ok");setTimeout(()=>{initSerial()},700);})},100);});}

reset();


const conf = {
//		Apparat 7400 - 55620
//			34977 - 45402
	     "az" : {"k1":8400, "k2":54620, "pinLeft": 27, "pinRight": 25, "enc": 1},
	     "el" : {"k1":36000, "k2":44500, "pinLeft":  24, "pinRight": 23, "enc": 2}
}


var state = {
	 enc : {1:0,2:0},
	move : {1:-1,2:-1},
	xstop: {1:0,2:0},
	speed: {1:0,2:0},
	last : {1:0,2:0},
	  tm : {1:0,2:0},
	 ltm : {1:0,2:0},	
}

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

const parser = new parsers.Readline({delimiter: '\n'});

port.pipe(parser);
port.on('open', () => {
	consolelog('* SerialPort ok');
	setTimeout(()=>{port.write("1|11|15|1|7|5|z\n")},50);
    });


var vect = [1,1,1];
var ovect = [0,0,0];
var xspeed = [0,0,0];

const azleft = new Gpio(conf.az.pinLeft, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
const azright = new Gpio(conf.az.pinRight, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
const elleft = new Gpio(conf.el.pinLeft, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
const elright = new Gpio(conf.el.pinRight, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});

azleft.glitchFilter(10000);
azright.glitchFilter(10000);
elleft.glitchFilter(10000);
elright.glitchFilter(10000);

function xxstop(can,lr) {
/*
switch (lr) {		
		case "k1" :
		delta = Math.abs(enc[can]-conf.az.k2);
		break;
		case "k2" :
		delta = Math.abs(enc[can]-conf.az.k1);
		break;
}
*/
	port.write("2|"+can+"|0|z\n");

	consolelog("КОНЦЕВИК "+lr+" STOP! "+can+" DEV");

//console.log("stop :",lr);
}

azleft.on('alert', (level, tick) => {if (level) {setbit(2,1);xxstop(1,'k1');}});
azright.on('alert', (level, tick) => {if (level) {setbit(3,1);xxstop(1,'k2');}});
elleft.on('alert', (level, tick) => {if (level) {setbit(6,1);xxstop(7,'k1');}});
elright.on('alert', (level, tick) => {if (level) {setbit(7,1);xxstop(7,'k2');}});

grad = 0;
en = 0;

encs = Array();
lencs = Array();
tms = Array();
ltms = Array();

odata = "";

parser.on('data', data=>{

//console.log(data);

n = data.split('|');

if (n.pop() != "z") return;

if (n[0] == "1") {
	consolelog("* CAN BUS ok, ",n[1],n[2]);
	server.bind(SERVERPORT, SERVERHOST, function(){});
}

if (n[0] == "2") {  // Данные с энкодера
//console.log(data);
	if (n[1]=="11") en = 1; else en = 2;

	lencs[en] = encs[en];
	encs[en] = (parseInt(n[2],16)|0);
	if (en==1) encs[en] = encs[en]+AZ_OFFSET; else encs[en] = encs[en]+EL_OFFSET;

//	state.last[en] = state.enc[en]; 
//	state.enc[en] = (encs[en]);
//	if (en==1) state.enc[en] = state.enc[en]+AZ_OFFSET; else state.enc[en] = state.enc[en]+EL_OFFSET;

	ltms[en] = tms[en];	
	tms[en] = new Date().getTime() & 0xFFFFFFFF;

	if (((tms[en]-ltms[en])<40) && Math.abs(encs[en]-lencs[en])>300) {
	    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>FUCK!!!!! "+en+" : "+encs[en].toString(16));
	    return;
	}


pr = new Promise(function(resolv,reject){

	if (n[1]=="11") en = 1; else en = 2;

	state.last[en] = state.enc[en]; 
	state.enc[en] = (encs[en]);



	if (en==1) state.enc[en] = state.enc[en]+AZ_OFFSET; else state.enc[en] = state.enc[en]+EL_OFFSET;
	if (state.enc[en]>65535) state.enc[en]-=65535;


	ovect[en] = vect[en]; if (state.enc[en]>state.last[en]) vect[en]=1; else vect[en]=0;
	if (state.last[en]==state.enc[en] || (Math.abs(state.last[en]-state.enc[en])==1) && vect[en]!=ovect[en]) { 
//	    state.enc[en]=state.last[en];
	return 0;  								// Антидребезг ;)
	} 

	checkStop(en);

	if (((Date.now()-state.ltm[en])<30) && Math.abs(state.last[en]-state.enc[en])>20) {
	    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>FUCK!!!!!",state.ltm[en],Date.now(),state.enc[en],state.last[en]);
	    return;
	}


switch(en) {

 case 1:
	if (state.enc[1]<conf.az.k1 && state.move[1]==0 || state.enc[1]>conf.az.k2 && state.move[1]==1) {
	consolelog("АЗИМУТ КОНЦЕВИК ВАХ!"+state.enc[1]+" : "+conf.az.k2);
         port.write("2|1|0|z\n");
	}

	if (((state.enc[1]<AZ_SOFTLIMIT_CW) && state.move[1]==0) || ((state.enc[1]>AZ_SOFTLIMIT_CCW) && state.move[1]==1)) {
	    port.write("2|1|0|z\n");
	    consolelog("SoftLimit AZ ! "+state.move[1]+" : "+state.enc[1]+"---");
	    if (state.move[1] == 1) setbit(1,1); else setbit(0,1); 
	} else {	
//	  if (state.move[1]!=-1) {
	        setbit(1,0);setbit(0,0); 
		setbit(2,0);setbit(3,0);
//		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! sett");
//	  }
	}

	Atomics.store(sharedArray,11,xtm);
	Atomics.store(sharedArray,10,(state.enc[en]));//	2 ENCODER  <<4 было


 break;
 case 2 :
	if (state.enc[2]<conf.el.k1 && state.move[2]==0 || state.enc[2]>conf.el.k2 && state.move[1]==1) {
//	if (state.enc[2]<conf.el.k1 || state.enc[2]>conf.el.k2) {
	consolelog("Угол КОНЦЕВИК ВАХ!"+state.enc[2]+" : "+conf.el.k2);
         port.write("2|7|0|z\n");
	}

	if (((state.enc[2]<EL_SOFTLIMIT_UP) && state.move[2]==0) || ((state.enc[2]>EL_SOFTLIMIT_DOWN) && state.move[2]==1)) {
	    port.write("2|7|0|z\n");
	    consolelog("SoftLimit EL ! "+state.move[2]+" : "+state.enc[2]+"---"+EL_SOFTLIMIT_DOWN+":"+EL_SOFTLIMIT_UP);
	    if (state.move[2]) setbit(5,1); else setbit(4,1); 
	} else {
	    	setbit(5,0);setbit(4,0); 
		setbit(6,0);setbit(7,0);
	  
	}

	Atomics.store(sharedArray,14,xtm);
	Atomics.store(sharedArray,13,(state.enc[en]));

 break;
}

//	if (!xtm) {setTimeout(()=>consolelog("* ENC["+en+"] : "+enc[en]),200);}
odata = data;
resolv(en);reject(0);
});

/*

Значения концевиков енкодеров.

Aзимут - // 16566 - 63229  
Угол   - // 32306 - 48133


*/

const kf = 360*60/65536;
var xshift = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
pr.then((en)=>{
	
	state.ltm[en] = state.tm[en];
	state.tm[en] = new Date().getTime() & 0xFFFFFFFF;

//  speed

//	xshift = Math.abs(state.last[en] - state.enc[en]);
	xshift[en] = (state.last[en] - state.enc[en]);
	xtimes = state.tm[en] - state.ltm[en];
	speed = Math.trunc((xshift[en]/xtimes)*1000);

// --- /speed

//    checkStop(en);


	if (en==1) {
	    Atomics.store(sharedArray,12,speed);
	} else {
	    Atomics.store(sharedArray,15,speed);
	}	



	lgrad = grad;
	grad = (state.enc[en]*360/65535);
	test = (grad-lgrad)/((state.ltm-state.tm[en]))*1000;
        if (state.ltm[en]-state.tm[en]) curspeed=(lgrad-grad)/(state.ltm[en]-state.tm[en])*1000; else curspeed=0;

        if (maxsp < curspeed) maxsp=curspeed;

	consolelog(">>"+en+":"+(state.enc[en])+" : "+state.last[en]+": \t"+Math.round(state.enc[en]*36000/65535)/100+"\t :"+curspeed.toString().substring(0,8)+" : "+vect[en]+" - "+ovect[en]+"---"+sharedArray[16].toString(2));

	
	for (i=1;i<10;i++) {
	if (xstatus[i]!=0) {
	
	
		switch(i) {
		case 1: 
		case 3:
				if (xshift[1]) Atomics.notify(sharedArray,i);  
		break;
		case 2: 
		case 4:
				if (xshift[2]) Atomics.notify(sharedArray,i); 
		 
		break;		
		case 7:
				bits = Atomics.load(sharedArray,16);
				if (bits!=0) Atomics.notify(sharedArray,i);
	//			console.log("======",sharedArray);
		
		break;
		default:
				Atomics.notify(sharedArray,i);
				if (xstatus[i]>0) xstatus[i]--;
		break;
		}
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
  


const readline = require('readline');
const rl = readline.createInterface({input: process.stdin, output: process.stdout });
rl.on('line', (line) => {

arr = line.split(" ");
if (arr[2]>300) arr[2]=300;
if (line.substring(0,1)=="!") {
arr[0]=arr[0].substring(1);
smove(arr[0],arr[1],arr[2],false);
//port.write(line);
} else {
//if (arr[0]==-1) console.log(readenc(15)); else {
//console.log(arr[0]+','+arr[1]+','+arr[2]);
//if (arr[1]*1==1) {port.write("3|1|1|z\n")} else {port.write("3|0|0|z\n")}}
if (arr[0]==7) xxx = 2; else xxx = 1;
state.move[xxx] = arr[1];
xspeed[arr[0]] = arr[2];

if (arr[0]>0) {
consolelog("MOVE>> "+arr[0]+"|"+arr[1]+"|"+arr[2]);
port.write("2|"+arr[0]+"|"+arr[1]+"|"+arr[2]+"|z\n");
}
}
});

var ostop = Array();
var stop  = Array();
var cw = 0;
var xen = 0;

smove = function(can,pos,speed,abs=false) { // speed + -

pos = parseInt(pos); speed = parseInt(speed); can = parseInt(can);

state.speed[xen] = Math.abs(speed);

if (can==1) xen = 1; else xen = 2;

if (pos == -2) {
if (speed>0) state.move[xen] = 1; else state.move[xen] = 0;
console.log("move",can,state.move[xen],Math.abs(Math.trunc(speed/10)));
xmove(can,state.move[xen],Math.abs(Math.trunc(speed/10)));
return;
}

if (speed==0) {
  port.write("2|"+can+"|0|0|z\n");
  return;
}

//pos = Math.abs(pos);
//25 60
//if (state.move[xen]) stop[xen] = state.enc[xen]+pos-20; else stop[xen] = state.enc[xen]-pos+36;
//koff = state.speed/10*20;

if (abs) stop[xen] = pos; else stop[xen] = state.enc[xen]+pos

koff = Math.abs(Math.trunc(speed/100))|1;
stepleft = 16;
stepright = 36;

if (xen==1) {
if (state.enc[xen]>stop[xen]) {
		state.move[xen] = 0; 
		if (abs) state.xstop[xen] = pos+koff*60; else	state.xstop[xen] = state.enc[xen]+pos+koff*16+stepright;
					
//				xxpos = pos-koeff*100;


			} else { 
//		stop[xen] = state.enc[xen]+pos;
		state.move[xen] = 1;
		if (abs) state.xstop[xen] = pos-koff*60; else	state.xstop[xen] = state.enc[xen]+pos-koff*36-stepleft;
//				xxpos = pos+koeff*100;
}
} else  {

//console.log(state.enc[xen],stop[xen]);
if (state.enc[xen]>stop[xen]) {
		state.move[xen] = 0; 
		if (abs) state.xstop[xen] = pos+koff*60; else	state.xstop[xen] = state.enc[xen]+pos+koff*16+stepright;
					
//				xxpos = pos-koeff*100;
			} else { 
//		stop[xen] = state.enc[xen]+pos;
		state.move[xen] = 1;
		if (abs) state.xstop[xen] = pos-koff*60; else	state.xstop[xen] = state.enc[xen]+pos-koff*36-stepleft;
//				xxpos = pos+koeff*100;
}
}


//if (abs) stop[xen]=pos; else stop[xen] = state.enc[xen]+pos;


xmove(can,state.move[xen],Math.abs(Math.trunc(speed/10)));

//console.log(can,xen,state.move[xen],Math.abs(Math.trunc(speed/10)));
//console.log(stop[xen],can,state.move[xen],Math.abs(Math.trunc(speed/10)));

//console.log(">>>>>>>>>>>>>>>>>>>>>",state.enc[xen],stop[xen],state.move[xen],cw,Math.trunc(speed/10));
}

function xmove(can_address,ccw,speed) {
//console.log(can_address,ccw,speed);
port.write("2|"+can_address+"|"+ccw+"|"+speed+"|z\n");
}


function checkStop(v) {

if (stop[v]>=0) {
if (v!=1) mot = 7; else mot = 1;

if (state.move[v]==1 && state.enc[v]>state.xstop[v] || state.move[v] == 0 && state.enc[v]<state.xstop[v]) {
console.log("STOPPED!!!");
port.write("2|"+mot+"|4|z\n");
}

if (state.move[v]==1 && state.enc[v]>stop[v] || state.move[v] == 0 && state.enc[v]<stop[v]) {
console.log("stop");
ostop[v] = stop[v];
stop[v] = -1;
port.write("2|"+mot+"|0|z\n");
state.move[v] = -1;
state.speed[v] = 0;
}
consolelog("stop "+stop[v]+" : "+state.enc[v]+" : "+vect[v]+" : "+ovect[v]);

}
}

}



///////////////////////////////////////////////
var dgsize=[11,7,12,14,12,14,8,7,12,14,12,14,8,7,30];
var arg = Array();
////////////////////////////////////////////////

function validation(message,xport){
if (message[0]!=126 || message[message.length-3]!=127 ) return 2

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

    if (cmd==4) {
    xxstop = state.enc[1]+arg[1];
    if (xxstop<AZ_SOFTLIMIT_CW || xxstop>AZ_SOFTLIMIT_CCW) {console.log("! error out of range : ",xxstop); return 1;}
    } else {
    xxstop = state.enc[2]+arg[1];
    if (xxstop>EL_SOFTLIMIT_DOWN || xxstop<EL_SOFTLIMIT_UP) {console.log("! error out of range : ",xxstop); return 1;}
    }

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
    if (arg[1]>>15) arg[1]=-(0x10000-arg[1]);
    consolelog("<<cmd:"+cmd+" N="+npack+" speed="+ arg[1]);
    if (arg[1]<-1048576 || arg[1]>1048576 ) {consolelog("! error args");return 1;}
//    port.write("2|1|0|z\n");
//    console.log("Stopped az");
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
      EL_SOFTLIMIT_UP   = arg[3];
      EL_SOFTLIMIT_DOWN = arg[4];
      AZ_OFFSET = arg[5];   
      EL_OFFSET = arg[6];  

      consolelog("* set variable:")
//      consolelog("= set AZ softlimit cw="+ (arg[1]*360)/65536);
//      consolelog("= set AZ softlimit ccw="+ (arg[2]*360)/65536);
      consolelog("= set AZ softlimit cw="+ (arg[1]));
      consolelog("= set AZ softlimit ccw="+ (arg[2]));
      consolelog("= set EL softlimit up="+ arg[3]);
      consolelog("= set EL softlimit el_down="+ arg[4]);
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
12  - Азимут Скорость	2
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
29 - Текущее время	4



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

	1: [9099, 0, 10, 11],
	2: [9091, 0, 13, 14],
	3: [9093, 0, 12, 11],
	4: [9094, 0, 15, 14],
	5: [9092, 0, 10, 11, 13, 14],
	6: [9093, 0, 24, 0],
	7: [9094, 0, 16, 29],
	8: [9096, 0, 17, 29],
	9: [9097, 0, 18, 19, 20, 21, 22, 23,29],
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
  var packetResponse1=new Buffer.from('whois');
  packetResponse1[0]=0x7e;
  packetResponse1[1]=message[1];
  packetResponse1[2]=message[2];
  packetResponse1[3]=validstatus;
  packetResponse1[4]=0x7f;

  res = crc.crc16ccitt(packetResponse1);
  big = res >> 8; //00..256
  little = res & 0xff; //00..256
  var xx = new Buffer.from(Array(big,little));
  packetResponse= new Buffer.concat(Array(packetResponse1,xx));

/* 
  packetResponse[0] = packetResponse1[0]
  packetResponse[1] = packetResponse1[1]
  packetResponse[2] = packetResponse1[2]
  packetResponse[3] = packetResponse1[3]
  packetResponse[4] = packetResponse1[4]
  packetResponse[5] = big;
  packetResponse[6] = little;
*/

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
			Atomics.store(sharedArray,30+xtempl,1); // PORT
		
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
			Atomics.store(sharedArray,30+xtempl,0); // PORT

		break;
		case 2 :
	
//			Atomics.store(sharedArray,25,arg[1]);
//			Atomics.store(sharedArray,27,arg[2]);
			console.log(">>>",arg);
			smove(1,arg[1],arg[2],true);
		break;
		case 3 :
	
//			Atomics.store(sharedArray,25,arg[1]);
//			Atomics.store(sharedArray,27,arg[2]);
			console.log(">>>",arg);
//			smove(1,arg[1],arg[2],true);
		break;

		case 4 :
	
//			Atomics.store(sharedArray,25,arg[1]);
//			Atomics.store(sharedArray,27,arg[2]);
//			console.log(">>>",arg);
			smove(1,arg[1],arg[2],false);
		break;
		case 5 :
			console.log(">>>",arg);
		break;
		case 6 :

		smove(1,-2,arg[1],false);

		break;
		case 8 :
//			Atomics.store(sharedArray,25,arg[1]);
//			Atomics.store(sharedArray,27,arg[2]);
			console.log(">>>",arg);
			smove(7,arg[1],arg[2],true);
		break;
		case 9 : 
		
		
		break;
		case 10 :
	
//			Atomics.store(sharedArray,25,arg[1]);
//			Atomics.store(sharedArray,27,arg[2]);
//			console.log(">>>",arg);
			smove(7,arg[1],arg[2],false);
		break;
		case 12 :

		smove(7,-2,arg[1],false);

		break;

	
	}
  };
  consolelog(msglog +' from ' + remote.address + ':' + remote.port);
  /////
  server.send(packetResponse, 0, packetResponse.length, remote.port, 
  remote.address, function(err, bytes) {
    if (err) throw err;
    if (debug) consolelog('> MAIN snt UDP server message response to ' + 
      remote.address + ':' + 
      remote.port +' [' + 
      hexdump(packetResponse) + ']');
//    consolelog('____________');
  });
  ////////////  
});//on.message

server.bind(SERVERPORT, SERVERHOST, function(){});



