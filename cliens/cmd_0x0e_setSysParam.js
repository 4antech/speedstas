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
var OPU_SERVER_HOST='127.0.0.1';

var dgram = require('dgram');
var myclient = dgram.createSocket('udp4');

function hexdump(msg){  
  var tmpstr='.';
  for (var i=0;i<msg.length;i++) {
    if (msg[i]<16 ) tmpstr+='0'+(msg[i].toString(16)) + '.';
    else tmpstr+=(msg[i].toString(16)) + '.';
  }
  return tmpstr;
}

/////// events /////

myclient.on('message', function (message, remote) {
  ts = new Date();
  consolelog('< RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
  myclient.close();
});

/////////end events //////////

var ts = new Date();

AZ_SOFT_LIMIT_CW = 888;
AZ_SOFT_LIMIT_CCW = 27000;
EL_SOFT_LIMIT_UP = 45000;
EL_SOFT_LIMIT_DOWN = 35000 ; //47777
SHIFT_AZ=0;
SHIFT_EL=0;

var message = new Buffer.from('1234567890123456789012345678!!');
message[0]=0x7e;         // start byte
message[1]=77 & 0xff; // packet number
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
message[21]= (SHIFT_AZ & 0x0000ff00)>>8
message[22]= (SHIFT_AZ & 0x000000ff)

message[23]=0;           //shift AZ
message[24]=0;          //max
message[25]= (SHIFT_EL & 0x0000ff00)>>8
message[26]= (SHIFT_EL & 0x000000ff)

message[27]=0x7f;         // stop byte

// bind serever//////////////////////////////////////////////////////
  myclient.send(message, 0, message.length, OPU_SERVER_PORT, OPU_SERVER_HOST, function(err, bytes) {
    //after sending message:
    if (err) throw err;
    ts = new Date();
    consolelog('* Start command. SET SYSTEM PARAMS');
    consolelog('> SND UDP client message [' +hexdump(message)+ '] sent to ' + OPU_SERVER_HOST +':'+ OPU_SERVER_PORT);
    console.log('AZ_SOFT_LIMIT_CW:',AZ_SOFT_LIMIT_CW)
    console.log('AZ_SOFT_LIMIT_CCW:',AZ_SOFT_LIMIT_CCW)
    console.log('EL_SOFT_LIMIT_UP:',EL_SOFT_LIMIT_UP)
    console.log('EL_SOFT_LIMIT_DOWN:',EL_SOFT_LIMIT_DOWN)
    console.log('AZ_SHIT:',AZ_SHIFT)
    console.log('EL_SHIT:',AZ_SHIFT)
  });

///////////////////////////////

