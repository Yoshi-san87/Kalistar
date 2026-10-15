'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [id,source]=process.argv.slice(2),plan=require('./asset-prompts.json');assert(plan.items.some(i=>i.id===id));
const dir=path.join(__dirname,'components');fs.mkdirSync(dir,{recursive:true});
const target=path.join(dir,'source-'+id+'.png'),bytes=fs.readFileSync(source),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
if(fs.existsSync(target))assert(fs.readFileSync(target).equals(bytes));else fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
const file=path.join(__dirname,'asset-provenance.json'),data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{tool:'built-in image_gen',items:[]};
const prior=data.items.find(i=>i.id===id);if(prior)assert.equal(prior.sha256,sha256);else data.items.push({id,source,file:'components/source-'+id+'.png',sha256});
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({id,saved:target}));
