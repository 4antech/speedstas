var ver='210716-01'
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

var dgram = require('dgram');
var target = 37000; // 0..32767
var speed  = 50;   //0..1000

var message = new Buffer.from('1234567890!!')

message[0]=0x7e;
message[1]=77;
message[2]=0x08;  //<-!!cmd0x08

message[3]=(target & 0xff000000)>>24;;
message[4]=(target & 0x00ff0000)>>16;
message[5]=(target & 0x0000ff00)>>8;
message[6]=target  & 0x000000ff;
 
message[7]=(speed  & 0xff00)>>8;
message[8]=speed   & 0x00ff;
message[9]=0x7f;


  myclient.send(message, 0, message.length, OPU_SERVER_PORT, OPU_SERVER_HOST, (err, bytes) => {
    //after sending message:
    if (err) throw err;
    consolelog('* Start command. 0x08 EL_moveToPointWithSpeed');
    console.log('target coord:',target,'speed:',speed)
    consolelog('> SND UDP client message [' +hexdump(message)+ '] sent to ' + OPU_SERVER_HOST +':'+ OPU_SERVER_PORT);
  });

