/*
 * 
 *        2|3|1|30|z
 *    Крутить|id устройства|направление|мощность
 *    
 *    Моторы - 3,4,6(большой)
 *    Speedfly  - 1 горизонт 7 - вертикаль
 *    
 *    
 *    
 *    
 */

#define SERIALSPEED 3000000
//#define SERIALSPEED 921600

#include <Arduino.h>
#include <Esp.h>            
#include <string.h>
#include <stdio.h>
#include <sys/types.h>
#include <unistd.h>
#include <fcntl.h>
#include <cstdlib>
#include <cstring>
#include <string>               
#include <Streaming.h>  
#include <dummy.h> 
#include <pins_arduino.h>
#include <gBase64.h>          
#include <ESP32CAN.h>
#include <CAN_config.h>

int StrToHex(char str[]){return (int) strtol(str, 0, 16);}


//void commrpi(void *pvParameters);
//void reciver(void *pvParameters);

#define SDA1 21
#define SCL1 22

time_t xxrectime;

CAN_device_t CAN_cfg;                // CAN Config
const int rx_queue_size = 10;  
std::vector<String> tasks;
HardwareSerial S2(1);
TaskHandle_t trecv = NULL;
TaskHandle_t tcomm = NULL;
struct candev {
  bool state = false;
  int addr = 0;
  uint16_t value = 0;
};

candev enc[2];
candev mot[2];

String sss,sout,rString;
int sec,osec;
int xxx = 0;
int test = 10;
time_t magicflag = 0;
bool xdebug = 0;
bool inited = false;

void loop() {
if (magicflag && millis()>magicflag) magicflag=0;

if (xxrectime && millis()-xxrectime>300) {
    xxrectime = 0;
    vTaskDelete(trecv);
    vTaskDelete(tcomm);
    trecv = NULL;
    tcomm = NULL;
    vTaskDelay(20);
  Serial.println("RESTART CAN");  
    xTaskCreatePinnedToCore(reciver, "reciver", 32192, NULL, 4, &trecv, 0);
    xTaskCreatePinnedToCore(commrpi, "commrpi", 16096, NULL, 8, &tcomm, 1);
    vTaskDelay(60);
}
/*

//    xTaskCreatePinnedToCore(i2s_adc_task, "adc", 8192, NULL, 1, &adcHandler,1);
*/ 

}
