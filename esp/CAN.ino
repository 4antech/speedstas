std::vector<String> ssplit(char * str, const char * sep) {
  std::vector<String>vc;
  char *token = strtok(str, sep);
  while (token != NULL) {
    vc.push_back(token);
    token = strtok(NULL, sep);
  };
  return vc;
  std::vector<String>(vc).swap(vc);
}

String recv,pid,opid,enc1,enc2,mot1,mot2;
bool xflag = false;
long int xxtm;
byte bb1[3],bb2[3],xbb1[3],xbb2[3];

 void roll(int dev,uint16_t xspeed) { // id , speed 1-255 
  
              CAN_frame_t xtx_frame;
              xtx_frame.FIR.B.FF = CAN_frame_std;
              xtx_frame.MsgID = 512+dev;
              xtx_frame.FIR.B.DLC = 8;
              xtx_frame.data.u8[0]=0x09;   //Управляющее слово
              xtx_frame.data.u8[1]=0x00;   // 
              xtx_frame.data.u8[2]=0x00;   // скорость
              xtx_frame.data.u8[3]=xspeed;
              xtx_frame.data.u8[4]=0x00;
              xtx_frame.data.u8[5]=0x00;
              xtx_frame.data.u8[6]=0x00;
              xtx_frame.data.u8[7]=0x00;
              ESP32Can.CANWriteFrame(&xtx_frame);
              vTaskDelay(6);

          if (xdebug==1) S2.printf("MOVE| %02x : %02x %02x %02x %02x %02x %02x %02x %02x\n",xtx_frame.MsgID,xtx_frame.data.u8[0],xtx_frame.data.u8[1],xtx_frame.data.u8[2],xtx_frame.data.u8[3],xtx_frame.data.u8[4],xtx_frame.data.u8[5],xtx_frame.data.u8[6],xtx_frame.data.u8[7]);

              magicflag = 0;
              Serial.println("---");
//          if (xdebug==1) S2.printf(">>>>>>>>>>>>>>> DOSPEED addr %d, speed %d\n",dev,xspeed);

//checkCommand("can 202@09000000");
}

void xsends(int xid, String msg) {
CAN_frame_t tx_frame;
tx_frame.FIR.B.FF = CAN_frame_std;
tx_frame.MsgID = xid;
tx_frame.FIR.B.DLC = 8;
int xpos=0;
for (int i=0;i<16;i++) {if (i>msg.length()) tx_frame.data.u8[xpos]=0x00; else tx_frame.data.u8[xpos]=StrToHex(&msg.substring(i,i+2)[0]);i++;xpos++;}
//CAN.endPacket();
ESP32Can.CANWriteFrame(&tx_frame);
vTaskDelay(10);
if (xdebug==1) S2.printf("3| CMD = ! %s\n",msg);
}


void reciver(void * pvParameters) {
(void) pvParameters;

CAN_frame_t tx_frame;
int devid = 0;
uint16_t val[3];
byte b1[3];
byte b2[3];

tx_frame.FIR.B.FF = CAN_frame_std;
tx_frame.MsgID = 0x600;
tx_frame.FIR.B.DLC = 8;tx_frame.data.u8[0]=0x40;tx_frame.data.u8[1]=0x04;tx_frame.data.u8[2]=0x60;tx_frame.data.u8[3]=0x00;tx_frame.data.u8[4]=0x00;tx_frame.data.u8[5]=0x00;tx_frame.data.u8[6]=0x00;tx_frame.data.u8[7]=0x00;
bool swtch = 1;
time_t ttt,ttt1;
bool vect[20],ovect[20];

for (;;) {  

  CAN_frame_t rx_frame;
  if (swtch==1) swtch=0; else swtch=1;

  if (xQueueReceive(CAN_cfg.rx_queue, &rx_frame, 3 * portTICK_PERIOD_MS) == pdTRUE) {

int cmd   = rx_frame.MsgID>>8;
int devid = rx_frame.MsgID & 0xF;
int devpos = -1;

//Serial.println(String(rx_frame));

for(int i=0;i<2;i++) {if (enc[i].addr==devid) devpos = i;}

if (xdebug>3) S2.printf("4| --- %02x : %02x %02x %02x %02x %02x %02x %02x %02x\n",rx_frame.MsgID,rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);
//if (xdebug && rx_frame.data.u8[0]!=0x43) Serial.printf("4| --- %02x : %02x %02x %02x %02x %02x %02x %02x %02x\n",rx_frame.MsgID,rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);
//if (xdebug) Serial.printf("4| --- %02x : %02x %02x %02x %02x %02x %02x %02x %02x\n",rx_frame.MsgID,rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);

switch(cmd) {
      case 5:

      bb1[devpos]=b1[devpos];
      bb2[devpos]=b2[devpos];
      b1[devpos] = rx_frame.data.u8[5];
      b2[devpos] = rx_frame.data.u8[4];

      ovect[devpos] = vect[devpos];
      vect[devpos]  = (bb1[devpos]>b1[devpos]);

      val[devpos] = b1[devpos]*256+b2[devpos];
      if (!val[devpos]) continue;

    if (!(bb1[devpos]==b1[devpos] && bb2[devpos]==b2[devpos]) && enc[devpos].value != val[devpos]) {

      if (abs(b1[devpos]-bb1[devpos])==1 && vect[devpos]!=ovect[devpos]) continue; 

//      enc[devpos].value = (val[devpos]>>1)<<1;
      
      
      S2.printf("2|%d|%02x%|%d|z\n",enc[devpos].addr,val[devpos],devpos);
      vTaskDelay(4);
     }
      break;
      case 1:

if (xdebug==2) S2.printf("3| CMD - 1 %02x : %02x %02x %02x %02x %02x %02x %02x %02x\n",rx_frame.MsgID,rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);
else if (xdebug==3) Serial.printf("3| CMD");// - 1 %02x %02x %02x %02x %02x %02x %02x %02x\n",rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);

      break;
      case 2:

if (xdebug==2) S2.printf("3| CMD - 2 %02x : %02x %02x %02x %02x %02x %02x %02x %02x\n",rx_frame.MsgID,rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);
else if (xdebug==3) Serial.printf("3| CMD"); // - 2 %02x %02x %02x %02x %02x %02x %02x %02x\n",rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);
//     roll(2,1,50);

       break;
      default:

if (xdebug==2) S2.printf("3| CMD - ALL %02x : %02x %02x %02x %02x %02x %02x %02x %02x\n",rx_frame.MsgID,rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);
else if (xdebug==3) Serial.printf("3| CMD"); // - ALL %02x %02x %02x %02x %02x %02x %02x %02x\n",rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);


       break;
   }
   
//Serial.printf(">> %d - %d | %d%d%d%d%d%d%d%d\n",devid,cmd,rx_frame.data.u8[0],rx_frame.data.u8[1],rx_frame.data.u8[2],rx_frame.data.u8[3],rx_frame.data.u8[4],rx_frame.data.u8[5],rx_frame.data.u8[6],rx_frame.data.u8[7]);
   
 }

 xxrectime = millis();

if (magicflag == 0) {
 if (enc[devid].state) {
      tx_frame.MsgID = 1536+enc[devid].addr;
      ESP32Can.CANWriteFrame(&tx_frame);
      if (devid==0) devid=1; else devid=0;
// if (xdebug>2) Serial.println("SEND ENC"); 
//      Serial.println(String(1536+enc[devid].addr,HEX));
  vTaskDelay(6);
 }

 } else {if (magicflag<millis()) {magicflag = 0;Serial.println("DROP MAGIC FLAG "+String(magicflag)+"<<<");}

if (inited) {
//Serial.println("RECIVER "+String(inited));
inited = 0;
 
}

}
}
}

int convert(int ccw, int xspeed) {
 int res = round(127/100*xspeed);
 if (ccw == 1) res = 256-res;
 
return res;
  
}




void commrpi (void *pvParameters) {

(void) pvParameters;;
   std::vector<String>vc;

                int addr = 0;
                int ccw  = 0;
                uint16_t xspeed = 0;

                int xdata = 0;
                
time_t lastr = 0; 
bool ffl1 = true;
bool ffl2 = true;

for (;;) {


if (!ffl1 && lastr && (millis()-lastr)>500) {
//  Serial.println("+++++++++++"+String(millis()-lastr)+"--"+String(lastr));
  ffl1 = true;
  S2.print("---\n");
  vTaskDelay(20);
  continue;
}

/*
if (lastr && !ffl2 && (millis()-lastr)>400) {
  Serial.println("-----------"+String(millis()-lastr)); 
  ffl2 = true;

}
*/

  while (S2.available()) {
    sss = S2.readStringUntil('\n');

    if (!(sss.indexOf("|")>0)) {sss = "";continue;}
    String xxsss = sss;
    Serial.println("-------- "+sss+"|"+sizeof(xxsss)+"|"+xxsss.indexOf("|")+"||");
    lastr = millis();
//     Serial.println(String(millis())+" - "+String(lastr));
    
    if (sss.substring(0,3)=="---") {
      ffl1 = false;
      continue;
    }
  
//     Serial.println(sss);

//  Serial.println("READ");
//  Serial.println(sss);
if (sss.substring(0,6)=="!reset") {
//  Serial.println(sss);
  ESP.restart();
}
 
if (sss.substring(0,1)=="!") {
      checkCommand("can "+sss.substring(1)); 
if (xdebug==1) S2.println("USER CMD");
      continue;
      }

//    Serial.print(">>>>>>");Serial.println(sss);
//    if (sss.substring(sss.length()-1,1)!="z") {
//    } // проверка целостности
 vc = ssplit(&sss[0],"|");
 
 if (sizeof(vc)<4) continue;

  int xparam = vc[0].toInt();
  
//  if (xdebug==3) 
  


      switch(xparam) {

            case 0: 
            Serial.println("case magic 0");
            vTaskDelay(10);
            roll(1,0);
            roll(7,0);
//            vTaskDelay(16);
            magicflag = millis()+20;
            
            break;
            case 9: 

            S2.print("1|1|z\n");
//            Serial.println("OKOKOKOKOKOKOKOKOKOKOKO");
            vTaskDelay(50);


/*
              if (vc[1].toInt() == 0) {ESP.restart();ESP.restart();}
              else if (vc[1].toInt() == 1) {
            S2.end();
            S2.begin(SERIALSPEED, SERIAL_8N1, 17, 16);
              }
            vTaskDelay(20);
*/

            break;
            
            case 1:  // Установка адреса
//            Serial.println("ok");
//                xsends(0,"0");
              vTaskDelay(40);        

            ffl1 = false;
            ffl2 = false;

              enc[0].addr = vc[1].toInt();
              enc[1].addr = vc[2].toInt();
              mot[0].addr = vc[3].toInt();
              mot[1].addr = vc[4].toInt();
              xdebug = vc[5].toInt();
              enc[0].state = true;
              enc[1].state = true;
            if (xdebug>0) Serial.println("ok "+sss);

                CAN_frame_t tx_frame;tx_frame.FIR.B.FF = CAN_frame_std;
              tx_frame.MsgID = 1536+enc[0].addr;tx_frame.FIR.B.DLC = 8;tx_frame.data.u8[0]=0x22;tx_frame.data.u8[1]=0x01;tx_frame.data.u8[2]=0x60;tx_frame.data.u8[3]=0x00;tx_frame.data.u8[4]=0x00;tx_frame.data.u8[5]=0xff;tx_frame.data.u8[6]=0x00;tx_frame.data.u8[7]=0x00;
              ESP32Can.CANWriteFrame(&tx_frame);vTaskDelay(2);
                tx_frame.data.u8[1]=0x02;
              ESP32Can.CANWriteFrame(&tx_frame);

                tx_frame.MsgID = 1536+enc[1].addr;tx_frame.data.u8[1]=0x01;vTaskDelay(2);
              ESP32Can.CANWriteFrame(&tx_frame);
                tx_frame.data.u8[1]=0x02;vTaskDelay(2);
              ESP32Can.CANWriteFrame(&tx_frame);
              vTaskDelay(50);        

              
              magicflag = 0;
                 
            break;

            case 2: // Управление мотором
//            Serial.println("MOTOR");

              magicflag = millis()+120;  // DISABLE CAN WRITE FRAME 



                addr = vc[1].toInt();
                ccw = vc[2].toInt();
                xspeed = vc[3].toInt();
                     case 3: 
                          // TEST functions 
//checkCommand(
          xdata = convert(ccw,xspeed);
            Serial.println("--- "+addr+' '+xdata);
            roll(addr,xdata);
            vTaskDelay(12);
            magicflag = 0; // RESUME READ ENCODERS
                          
            break;
//            checkCommand("can");
            int stats = vc[1].toInt();
            Serial.printf("Stats!!! %d - %d",vc[0],stats);
//            magicflag = stats;
             break;
        
}
    
//    tosend(sss,"sms");
 }

//vTaskDelay(20);
}
}
