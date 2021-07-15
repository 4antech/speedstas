#!/usr/bin/env node
/*

вращение 0x1
	     лево - 0 
	    право - 1
    
    	 0X7


концевик калибровочный право : GPIO 2 : енкодер 1 значение 4984 int ---
концевик калибровочный лево  : GPIO 6 : енкодер 1 значение 7963 int ---


*/


const version= 0x00FF0101; // 4 bytes;
const debug=1;
const SERVERPORT = 9090;
const pi=Math.PI;
const pi2=Math.PI*2;
const pina2=Math.PI/2;
const r2g=180/Math.PI;
const SERVERHOST='0.0.0.0';



//var Gpio = require('onoff').Gpio;

//var pushButton = new Gpio(27, 'in', 'both');

/*
pushButton.watch(function (err, value) { //Watch for hardware interrupts on pushButton GPIO, specify callback function
  if (err) { //if an error
    console.error('There was an error', err); //output error message to console
  return;
  }
    console.log("GPIO2 :",value);
//  LED.writeSync(value); //turn LED on or off depending on the button state (0 or 1)
});
*/


const Gpio = require('pigpio').Gpio;




const azleft = new Gpio(25, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});
const azright = new Gpio(27, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true});

azleft.on('alert', (level, tick) => {


  if (level === 0) {
//    console.log("left <<<");
  } else {
    console.log("left >>>");
  }


});

azright.on('alert', (level, tick) => {
  if (level === 0) {
//    console.log("right <<<");
  } else {
    console.log("right >>>");
  }

});



