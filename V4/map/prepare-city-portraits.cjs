'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(runtime,'_city_portraits.cjs'))('sharp');
const root=path.resolve(__dirname,'../..'),proposals=path.join(root,'V4/propositions/2026-10-20-city-portraits');
const workspace=path.resolve(root,'../..'),backupRoot=path.join(workspace,'maintenance/private-backups');
const backup=path.join(backupRoot,'2026-10-20-city-portraits');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function info(file){
 const bytes=await fs.readFile(file),m=await sharp(bytes).metadata();
 return {file:path.relative(root,file).split(path.sep).join('/'),bytes:bytes.length,sha256:sha(bytes),width:m.width,height:m.height};
}
async function save(file,bytes){
 try{assert.equal(sha(await fs.readFile(file)),sha(bytes),'Refusing to replace '+file);}
 catch(error){if(error.code!=='ENOENT')throw error;await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes,{flag:'wx'});}
}
async function saveMetadata(file,bytes){
 try{assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),JSON.parse(bytes.toString('utf8')),'Backup metadata changed: '+file);}
 catch(error){if(error.code!=='ENOENT')throw error;await save(file,bytes);}
}
async function main(){
 assert(backup.startsWith(backupRoot+path.sep)&&!backup.startsWith(root+path.sep),'Backup must stay outside the active checkout');
 const selection=JSON.parse(await fs.readFile(path.join(proposals,'selection.json'),'utf8'));
 assert.equal(selection.cities.length,8);assert(selection.authorApproval);
 const report={schema:1,date:'2026-10-20',authorApproval:selection.authorApproval,generator:'Built-in image_gen; deterministic WebP export only',cities:[]};
 for(const city of selection.cities){
  assert.equal(city.status,'approved-by-author');
  assert(/^[a-z]+$/.test(city.id)&&/^\d{2}$/.test(city.revision));
  const source=path.join(proposals,city.file),bytes=await fs.readFile(source);
  const proofName=city.revision==='01'?'provenance.json':'provenance-'+city.revision+'.json';
  const proof=JSON.parse(await fs.readFile(path.join(proposals,proofName),'utf8'));
  assert.equal(sha(bytes),proof.cities.find(c=>c.id===city.id).original.sha256,'Approved source changed: '+city.id);
  await save(path.join(backup,city.file),bytes);
  const stem=city.id+'-'+city.revision;
  const full=path.join(root,'V4/site/assets/map/portraits',stem+'.webp');
  const small=path.join(root,'V4/site/assets/map/portraits',stem+'-small.webp');
  const fullBytes=await sharp(bytes).webp({quality:88,effort:6}).toBuffer();
  const smallBytes=await sharp(bytes).resize({width:768,withoutEnlargement:true}).webp({quality:84,effort:6}).toBuffer();
  await save(full,fullBytes);await save(small,smallBytes);
  await save(path.join(backup,'runtime',path.basename(full)),fullBytes);
  await save(path.join(backup,'runtime',path.basename(small)),smallBytes);
  for(const file of [proofName,city.revision==='01'?'prompts.json':'prompts-'+city.revision+'.json'])await saveMetadata(path.join(backup,file),await fs.readFile(path.join(proposals,file)));
  report.cities.push({id:city.id,revision:city.revision,source:await info(source),preview:await info(small),full:await info(full)});
 }
 await save(path.join(backup,'approved-selection.json'),Buffer.from(JSON.stringify(selection,null,2)+'\n'));
 const text=Buffer.from(JSON.stringify(report,null,2)+'\n');
 await fs.writeFile(path.join(root,'V4/map/city-portraits.json'),text);
 await save(path.join(backup,'city-portraits.json'),text);
 console.log(JSON.stringify({cities:report.cities.length,backup,previewBytes:report.cities.reduce((n,c)=>n+c.preview.bytes,0),fullBytes:report.cities.reduce((n,c)=>n+c.full.bytes,0),assets:report.cities.flatMap(c=>[c.preview.file,c.full.file])},null,2));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
