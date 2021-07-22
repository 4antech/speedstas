/*
enum rst_reason {
 REASON_DEFAULT_RST = 0, // normal startup by power on 
 REASON_WDT_RST = 1, // hardware watch dog reset 
 REASON_EXCEPTION_RST = 2, // exception reset, GPIO status won't change 
 REASON_SOFT_WDT_RST   = 3, // software watch dog reset, GPIO status won't change 
 REASON_SOFT_RESTART = 4, // software restart ,system_restart , GPIO status won't change 
 REASON_DEEP_SLEEP_AWAKE = 5, // wake up from deep-sleep 
 REASON_EXT_SYS_RST      = 6 // external system reset 
};

String EspClass::getResetReason(void) {
    char buff[32];
    if (resetInfo.reason == REASON_DEFAULT_RST) { // normal startup by power on
      strcpy_P(buff, PSTR("Power on"));
    } else if (resetInfo.reason == REASON_WDT_RST) { // hardware watch dog reset
      strcpy_P(buff, PSTR("Hardware Watchdog"));
    } else if (resetInfo.reason == REASON_EXCEPTION_RST) { // exception reset, GPIO status won’t change
      strcpy_P(buff, PSTR("Exception"));
    } else if (resetInfo.reason == REASON_SOFT_WDT_RST) { // software watch dog reset, GPIO status won’t change
      strcpy_P(buff, PSTR("Software Watchdog"));
    } else if (resetInfo.reason == REASON_SOFT_RESTART) { // software restart ,system_restart , GPIO status won’t change
      strcpy_P(buff, PSTR("Software/System restart"));
    } else if (resetInfo.reason == REASON_DEEP_SLEEP_AWAKE) { // wake up from deep-sleep
      strcpy_P(buff, PSTR("Deep-Sleep Wake"));
    } else if (resetInfo.reason == REASON_EXT_SYS_RST) { // external system reset
      strcpy_P(buff, PSTR("External System"));
    } else {
      strcpy_P(buff, PSTR("Unknown"));
    }
    return String(buff);
}

String EspClass::getResetInfo(void) {
    if(resetInfo.reason != 0) {
        char buff[200];
        sprintf(&buff[0], "Fatal exception:%d flag:%d (%s) epc1:0x%08x epc2:0x%08x epc3:0x%08x excvaddr:0x%08x depc:0x%08x", resetInfo.exccause, resetInfo.reason, (resetInfo.reason == 0 ? "DEFAULT" : resetInfo.reason == 1 ? "WDT" : resetInfo.reason == 2 ? "EXCEPTION" : resetInfo.reason == 3 ? "SOFT_WDT" : resetInfo.reason == 4 ? "SOFT_RESTART" : resetInfo.reason == 5 ? "DEEP_SLEEP_AWAKE" : resetInfo.reason == 6 ? "EXT_SYS_RST" : "???"), resetInfo.epc1, resetInfo.epc2, resetInfo.epc3, resetInfo.excvaddr, resetInfo.depc);
        return String(buff);
    }
    return String("flag: 0");
}
*/
