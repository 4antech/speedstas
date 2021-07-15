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
var ts = new Date();

var dgram = require('dgram');
var incmd = 5; // 0..11
var target = 1000;
var speed  = 50; 
var cmd =incmd.toString(16); // 00..0a

var message = new Buffer.from('1234567890')
message[0]=0x7e;
message[1]=2;
message[2]=10;

message[3]=(target & 0xff000000)>>24;;
message[4]=(target & 0x00ff0000)>>16;
message[5]=(target & 0x0000ff00)>>8;
message[6]=target  & 0x000000ff;

message[7]=(speed  & 0xff00)>>8;
message[8]=speed   & 0x00ff;
message[9]=0x7f;




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

