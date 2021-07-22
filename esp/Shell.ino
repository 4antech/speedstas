
void dotask(bool todo) {
String xt = tasks.back();tasks.pop_back();
//Serial.println("---");
if (xt.substring(0,1)=="!") {


  } else {//tosend(String(now())+": "+xt,"sms");
  }
}


String checkCommand(String msg) {

bool found = false;
if (msg.substring(0,6) == "serial") {
  msg = msg.substring(8);
S2.end();
delay(200);
S2.begin(msg.toInt());
found = true;
return "Serial start at "+msg;
}

if (msg.substring(0,1)=="!") {

//S2.write(msg.substring(1).c_str());
S2.println(&msg.substring(1)[0]);
//S2.print("\n");
return "sent";
}


if (msg.substring(0,3)=="set") {
CAN_frame_t tx_frame;
tx_frame.FIR.B.FF = CAN_frame_std;
tx_frame.MsgID = 0x60b;
tx_frame.FIR.B.DLC = 8;
tx_frame.data.u8[0]=0x22;
tx_frame.data.u8[1]=0x01;
tx_frame.data.u8[2]=0x60;
tx_frame.data.u8[3]=0x00;
tx_frame.data.u8[4]=0x00;
tx_frame.data.u8[5]=0xff;
tx_frame.data.u8[6]=0x00;
tx_frame.data.u8[7]=0x00;
ESP32Can.CANWriteFrame(&tx_frame);
delay(120);
tx_frame.data.u8[1]=0x02;
ESP32Can.CANWriteFrame(&tx_frame);
return "set ok";
}

if (msg.substring(0,3)=="can") {
int id = msg.indexOf("@");
CAN_frame_t tx_frame;
tx_frame.FIR.B.FF = CAN_frame_std;
tx_frame.MsgID = StrToHex(&msg.substring(4,id)[0]);
tx_frame.FIR.B.DLC = 8;
msg = msg.substring(id+1);int xpos=0;
for (int i=0;i<16;i++) {if (i>msg.length()) tx_frame.data.u8[xpos]=0x00; else tx_frame.data.u8[xpos]=StrToHex(&msg.substring(i,i+2)[0]);i++;xpos++;}
//CAN.endPacket();
ESP32Can.CANWriteFrame(&tx_frame);
if (xdebug==1) S2.printf("3| CMD = ! %s\n",msg);

opid="";
return "";
}

if (!found) return msg+": command not found.";
}
