/*
const crc = require('crc');

  twobyte=crc.crc16ccitt(buf) //0..65535

  big=(twobyte>>8); //00..256
  little=(twobyte&0xff); //00..256

  console.log(twobyte.toString(16),big.toString(16),little.toString(16));
*/

const crc = require('crc');
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
var oldres = 0;
var res = 0;
function int2ip (ipInt) {return ( (ipInt>>>24) +'.' + (ipInt>>16 & 255) +'.' + (ipInt>>8 & 255) +'.' + (ipInt & 255) )}
if (!Date.now) {Date.now = function() {return new Date().getTime()}}

var started = 0;
var packetResponce = 0;
var counter = 0;
var addr = 0;
var tms = 0;
var port = 0;
var xbytes = (3+(tpl.length-2) * 4); 

for (i=2;i<tpl.length;i++) {
	if (tpl[i] == 12 || tpl[i] == 15) {xbytes-=2;}
	if (tpl[i] == 16 || tpl[i] == 17) {xbytes-=3;}
}       

var sxtm,osxtm;

function send() {

//console.log(">>>",sharedArray);

//	console.log(tpl.length,xbytes);
	packetResponse=new Buffer.from('0'.repeat(xbytes));
	packetResponse[0]=0x7e;
	packetResponse[1]=counter;
	cnt = 2;

	osxtm = sxtm;

	sxtm = Date.now();
	pxtm = sxtm.toString(16).substring(3);

	for (i=2;i<tpl.length;i++) {
	 pos = (tpl[i])*4;
	 
	if (tpl[i]==0) packetResponse[1]=1;
	

	if (tpl[i]==16) {
	 oldres = res;
	 xres = Atomics.load(view,64); // Байт состояния концевиков

//	 console.log("=====",view);
	 if (!xres) {
	 
	  	console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",xres,oldres);
	 	return;
	 
	 }
	 
	 if (xres && !tms) {tms = Date.now();}
	 packetResponse[cnt] = xres;
//		console.log(">>>",res.toString(2));
	 cnt++;

	} else if (tpl[i]==0 || tpl[i]==11 || tpl[i]==14) {
		var ttm  = Buffer.from(pxtm,'hex');	
		 packetResponse[cnt]	= ttm[0];
		 packetResponse[cnt+1]	= ttm[1];
		 packetResponse[cnt+2]	= ttm[2];
		 packetResponse[cnt+3]	= ttm[3];
		 cnt+=4;

  	} else if (tpl[i]==29) {
	    dat = new Date().getTime() & 0xFFFFFFFF;
		 packetResponse[cnt]	= (dat & 0xFF000000)>>24;
		 packetResponse[cnt+1]	= (dat & 0x00FF0000)>>16;
		 packetResponse[cnt+2]	= (dat & 0x0000FF00)>>8;
		 packetResponse[cnt+3]	=  dat & 0x000000FF;
		cnt+=4;
	} else if (tpl[i]==12 || tpl[i]==15) {
		 packetResponse[cnt] 	= Atomics.load(view,[pos+1]);
		 packetResponse[cnt+1]	= Atomics.load(view,[pos]);
		 cnt+=2;
	} else {
		 packetResponse[cnt]	= Atomics.load(view,[pos+3]);
		 packetResponse[cnt+1]	= Atomics.load(view,[pos+2]);
		 packetResponse[cnt+2]	= Atomics.load(view,[pos+1]);
		 packetResponse[cnt+3]	= Atomics.load(view,[pos]);
		 cnt+=4;
		if (tpl[i]==10) {

		}

	 }

	}
	packetResponse[cnt] = 0x7F;

// CRC
	res = crc.crc16ccitt(packetResponse);
        big = res >> 8; //00..256
	little = res & 0xff; //00..256
// CRC

	xx = new Buffer.from(Array(big,little));

	packetResponse1 = new Buffer.concat(Array(packetResponse,xx));	
//	      packetResponce[cnt++] = big;
//	      packetResponce[cnt++] = little;

	out = packetResponce;


  client.send(packetResponse1, 0, packetResponse1.length, port, 
  addr, function(err, bytes) {
    if (err) throw err;
    consolelog(index+' > snt UDP  message response to ' + 
      addr + ':' + 
      port +' [' + 
      hexdump(packetResponse1) + ']');
    consolelog('____________');
  });
	
	counter++; if(counter>255) counter=0;
}


xtimer = setInterval(()=>{ //	MAIN THROTTLE
	Atomics.wait(sharedArray,index,0);
	if (sharedArray[30+index]) {
		Atomics.store(sharedArray,(30+index),0);
		counter = 0;
		console.log("RESET COUNTER ",index);
	}
	if (sharedArray[index] && port!=sharedArray[index]) {
	addr = int2ip(Atomics.load(sharedArray,0));
	port = Atomics.load(sharedArray,index);
        Atomics.store(sharedArray,index,0);
	if (!port) return;
	}
	send();
	if (sharedArray[index]!=0) {Atomics.store(sharedArray,index,0)}
},0);


function hexdump(smsg) {return Array.prototype.map.call(new Uint8Array(smsg), x => ('00' + x.toString(16)).slice(-2)).join('.');}


function consolelog(smsg){
  if (debug) {
    var textlog=(new Date().getTime()+'. ' + smsg);
    console.log(textlog);
    if (debug>2) textlog=textlog+' <br>';
    if (debug>3) fs.appendFileSync("./send.log", textlog+'\n');
  }
}


