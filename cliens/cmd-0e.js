var ver='200906-01'
var debug=1;
function consolelog(msg){
  if (debug) {
    ts = new Date();
    var textlog=(ts.getTime()+'. ' + msg);
    console.log(textlog);
    if (debug>2) textlog=textlog+' <br>';
    if (debug>1) fs.appendFileSync("./server.log", textlog+'\n');
  }
}

var OPU_SERVER_PORT = 9090; // PORT -- 4 connect 2 OPU-SERVER
//var OPU_SERVER_HOST='192.162.132.124';//  PORT -- 4 connect 2 OPU-SERVER
//var OPU_SERVER_HOST='185.255.135.85';
var OPU_SERVER_HOST='127.0.0.1';
//var OPU_SERVER_HOST='127.0.0.1';//  PORT -- 4 connect 2 OPU-SERVER
//var OPU_SERVER_HOST='178.158.224.123'; //  PORT -- 4 connect 2 OPU-SERVER


var MY_SERVER_PORT  = 7778; // my PORT -- 4 connect from OPU-CLIENT 2 MYSERVER 
var MY_SERVER_HOST='0.0.0.0'; // 0 - all interfaces

var dgram = require('dgram');
var myclient = dgram.createSocket('udp4');
var myserver = dgram.createSocket('udp4');


function hexdump(msg){  
  var tmpstr='.';
  for (var i=0;i<msg.length;i++) {
    if (msg[i]<16 ) tmpstr+='0'+(msg[i].toString(16)) + '.';
    else tmpstr+=(msg[i].toString(16)) + '.';
  }
  return tmpstr;
}

/////// events /////
myserver.on('error', function (err){
  consolelog('! server error: '+err.stack);
  server.close(function(){consolelog('!!!!!!!!!!!server down!!!!!!!!!!!!');});
});

myserver.on('listening', function () {
  var address = myserver.address();
  consolelog('* Start UDP Server listening on ' + 
  address.address + ":" + 
  address.port);
});

myserver.on('message', function (message, remote){
  var address = myserver.address();
  if (max) tmp++; else tmp0++;
  if (tmp<=max) {
    consolelog("tmp="+tmp0+" "+ hexdump(message));
  } 
  if (tmp>max) myserver.close(()=>{consolelog(tmp+" datagrams recived on port:"+address.port);});
});


myclient.on('message', function (message, remote) {
  ts = new Date();
  consolelog('< RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
  myclient.close();
});

/////////end events //////////
/*
    arg[1]= (message[3]<<24) + (message[4]<<16) + (message[5]<<8) + message[6];
    arg[2]= (message[7]<<24) + (message[8]<<16) + (message[9]<<8) + message[10];
    arg[3]= (message[11]<<24) +(message[12]<<16) + (message[13]<<8) + message[14]; //
    arg[4]= (message[15]<<24) +(message[16]<<16) + (message[17]<<8) + message[18]; //
    arg[5]= (message[19]<<24) + (message[20]<<16) + (message[21]<<8)+ message[22]; //
    arg[6]= (message[23]<<24) + (message[24]<<16) + (message[25]<<8)+ message[26]; //
*/
var ts = new Date();


var packn = 1;
var cmd = 0; // 0..11
var max = 100000000;
var pattern = 1;



AZ_SOFT_LIMIT_CW = 888;
AZ_SOFT_LIMIT_CCW = 27000;
EL_SOFT_LIMIT_UP = 45000;
EL_SOFT_LIMIT_DOWN = 35000 ; //47777


var message = new Buffer.from('1234567890123456789012345678');
message[0]=0x7e;         // start byte
message[1]=packn & 0xff; // packet number
message[2]=0x0e;            // cmd

message[3]=0 //b1;//AZ_SOFT_LIMIT_CW & 0x000000FF;           //AZ_CCW
message[4]=0 //b2; (AZ_SOFT_LIMIT_CW & 0x0000FF00)>>8;           //max
message[5]=(AZ_SOFT_LIMIT_CW & 0x0000FF00)>>8;
message[6]=AZ_SOFT_LIMIT_CW & 0x000000FF;

message[7]=0;//AZ_SOFT_LIMIT_CW & 0x000000FF;         //AZ_CW
message[8]=0;//(AZ_SOFT_LIMIT_CCW & 0x0000FF00)>>8;            //max
message[9]=(AZ_SOFT_LIMIT_CCW & 0x0000FF00)>>8;
message[10]=AZ_SOFT_LIMIT_CW & 0x000000FF; 

message[11]=0;           //EL_dwn
message[12]=0;          //max
message[13]=(EL_SOFT_LIMIT_DOWN & 0x0000FF00)>>8;
message[14]= EL_SOFT_LIMIT_DOWN & 0x000000FF; 

message[15]=0;           //EL_up
message[16]=0;          //max
message[17]=(EL_SOFT_LIMIT_UP & 0x0000FF00)>>8;           //EL_up
message[18]=EL_SOFT_LIMIT_UP & 0x000000FF;          //max


message[19]=0;           //shift AZ
message[20]=0;          //max
message[21]= (1000 & 0x0000ff00)>>8
message[22]= (1000 & 0x000000ff)

message[23]=0;           //shift AZ
message[24]=0;          //max
message[25]= (159 & 0x0000ff00)>>8
message[26]= (159 & 0x000000ff)

message[27]=0x7f;         // stop byte

// bind serever//////////////////////////////////////////////////////
myserver.bind(MY_SERVER_PORT, MY_SERVER_HOST, function(){
  //after binding:
  var address = myserver.address();    
  consolelog('# Server binded @'+address.address+':'+address.port);
  //sending message:
  myclient.send(message, 0, message.length, OPU_SERVER_PORT, OPU_SERVER_HOST, function(err, bytes) {
    //after sending message:
    if (err) throw err;
    ts = new Date();
    consolelog('* Start command. Open new infostreeam ');
    consolelog('> SND UDP client message [' +hexdump(message)+ '] sent to ' + OPU_SERVER_HOST +':'+ OPU_SERVER_PORT);
  });
  //
});
/*  */
///////////////////////////////

