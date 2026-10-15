'use strict';
const path=require('node:path'),{execFileSync}=require('node:child_process');
for(const suite of process.argv.length>2?process.argv.slice(2):['guide','library','navigation','composition','shell','detail','lineup','pages']){
  console.log('Browser suite: '+suite);
  console.log(execFileSync(process.execPath,[path.join(__dirname,'verify-browser.cjs'),suite],{encoding:'utf8',maxBuffer:16*1024*1024}));
}
