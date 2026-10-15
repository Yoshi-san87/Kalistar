'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {sharp}=require('../../atelier/lib.cjs');
async function main(){
 const number=Number(process.argv[2]),source=process.argv[3],plan=require('./prompts.json'),item=plan.items.find(i=>i.number===number);
 assert(item&&source);const full=path.resolve(source);assert(fs.existsSync(full));
 const bytes=fs.readFileSync(full),sha256=crypto.createHash('sha256').update(bytes).digest('hex'),meta=await sharp(bytes).metadata();
 assert(meta.width>=700&&meta.height>=900&&meta.height>meta.width);
 const destination=path.join(__dirname,item.file);
 if(fs.existsSync(destination))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex'),sha256,'Never overwrite an existing proposal');else fs.copyFileSync(full,destination);
 const file=path.join(__dirname,'provenance.json'),data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{tool:'built-in image_gen',items:[]};
 const prior=data.items.find(i=>i.number===number);if(prior)assert.equal(prior.sha256,sha256);else data.items.push({number,name:item.name,file:item.file,originalSource:source,sha256,width:meta.width,height:meta.height,status:'generated-awaiting-user-selection'});
 data.items.sort((a,b)=>a.number-b.number);fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({saved:item.file,generated:data.items.length,total:plan.count,width:meta.width,height:meta.height}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
