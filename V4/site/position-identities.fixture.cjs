'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

module.exports=function positionsFixture(t){
  const previous=globalThis.KalistarPositions,context={};
  context.window=context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'positions.js'),'utf8'),context);
  globalThis.KalistarPositions=context.KalistarPositions;
  t.after(()=>{globalThis.KalistarPositions=previous;});
  return context.KalistarPositions;
};
