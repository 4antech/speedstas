

var ttm = (((new Date().getTime())).toString(16));// & 0XFFFFFFFF;
ttm = ttm.substring(ttm.length-8);
console.log(">>>",ttm,ttm.length,ttm[0],ttm.buffer);