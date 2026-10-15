'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {plan,inside,ROOT}=require('./build.cjs');
const FILE=path.join(__dirname,'runtime-media.json');
function validateRegistry(data) {
  if(data?.schemaVersion!==1||!Array.isArray(data.files)||!data.files.length)throw Error('Invalid media registry');
  const seen=new Set();
  for(const file of data.files){
    if(typeof file.source!=='string'||!/^V[34]\//.test(file.source)||file.source.includes('\\')||seen.has(file.source)||!/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isSafeInteger(file.bytes)||file.bytes<=0)throw Error('Invalid or duplicate media record');
    inside(ROOT,file.source);seen.add(file.source);
  }
  return data;
}
async function refresh({initialize=false,add=[]}={}) {
  if(initialize&&fs.existsSync(FILE))throw Error('Media registry already exists');
  const previous=fs.existsSync(FILE)?validateRegistry(JSON.parse(fs.readFileSync(FILE,'utf8'))):null;
  if(!previous&&!initialize)throw Error('Use --initialize once, before removing media from Git');
  const selected=new Set(previous?.files.map(f=>f.source)||[]);
  if(initialize)for(const file of execFileSync('git',['ls-files','-z'],{cwd:ROOT,maxBuffer:32*1024**2}).toString().split('\0'))selected.add(file);
  for(const file of add){inside(ROOT,file);selected.add(file);}
  const proposed=await plan({mediaPolicy:false});
  const candidates=proposed.files.filter(file=>(file.card||file.source.includes('/assets/'))&&(file.card||selected.has(file.source)));
  for(const file of add)if(!candidates.some(f=>f.source===file))throw Error('Not a public asset: '+file);
  const files=[];
  for(const file of candidates){
    const bytes=fs.readFileSync(inside(ROOT,file.source));
    if(bytes.subarray(0,80).toString().startsWith('version https://git-lfs.github.com/'))throw Error('Download original before registration: '+file.source);
    const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
    if(file.expectedHash&&file.expectedHash!==sha256)throw Error('Approved media changed: '+file.source);
    files.push({source:file.source,bytes:bytes.length,sha256});
  }
  const data=validateRegistry({schemaVersion:1,description:'Public media live on the production PC and Cloudflare. Git stores verified paths and SHA-256, not image binaries.',files:files.sort((a,b)=>a.source.localeCompare(b.source))});
  fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),addedExplicitly:add}));
  return data;
}
module.exports={validateRegistry,refresh};
if(require.main===module){
  const args=process.argv.slice(2),initialize=args[0]==='--initialize';
  if(initialize)args.shift();
  if(args[0]==='--add')args.shift();else if(args.length)throw Error('Usage: runtime-media.cjs [--initialize] [--add path ...]');
  refresh({initialize,add:args}).catch(e=>{console.error(e.message);process.exitCode=1;});
}
