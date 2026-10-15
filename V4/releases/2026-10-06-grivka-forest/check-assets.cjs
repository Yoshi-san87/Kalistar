'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),dir=path.join(root,'V4/propositions/2026-10-06-grivka-okami');
const results=[];
for(const manifest of ['provenance.json','provenance-02.json']){
 const data=JSON.parse(fs.readFileSync(path.join(dir,manifest),'utf8'));
 for(const item of data.items){
  const bytes=fs.readFileSync(path.join(dir,item.file)),sha=crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha,item.sha256,item.file);
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  results.push({file:item.file,sha256:sha,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});
 }
}
console.log(JSON.stringify({passed:true,originalsPreserved:true,results},null,2));
