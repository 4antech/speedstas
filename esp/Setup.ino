void setup() {

  Serial.begin(115200);
//  Serial.begin(9600);
  Serial.print("---");
//  S2.begin(921600, SERIAL_8N1, 17, 16);
  S2.begin(SERIALSPEED, SERIAL_8N1, 17, 16);
  Serial.println("Serial2 inited");
  delay(30);
 
//  String reset = ESP.getResetInfo();
//   enc[0].addr = 0x0B;
//   enc[1].addr = 0x0F;

  CAN_cfg.speed = CAN_SPEED_500KBPS;
  CAN_cfg.tx_pin_id = GPIO_NUM_4;
  CAN_cfg.rx_pin_id = GPIO_NUM_2;
  CAN_cfg.rx_queue = xQueueCreate(rx_queue_size, sizeof(CAN_frame_t));
  // Init CAN Module

//  CAN.onReceive(onReceive);
  ESP32Can.CANInit();
Serial.println("--- Can inited");
    vTaskDelay(20);
    xTaskCreatePinnedToCore(commrpi, "commrpi", 16096, NULL, 8, &tcomm, 1);
    xTaskCreatePinnedToCore(reciver, "reciver", 32192, NULL, 4, &trecv, 0);

/*

              enc[0].addr = 11;
              enc[1].addr = 15;
              mot[0].addr = 1;
              mot[1].addr = 7;
              xdebug = 1;
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
              vTaskDelay(6);        
              xsends(0,"0");
              vTaskDelay(20);        
              magicflag = 0;
*/
  

}
  
