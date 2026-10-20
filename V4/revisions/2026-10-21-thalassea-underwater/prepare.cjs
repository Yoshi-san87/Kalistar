'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(runtime,'_thalassea_revision.cjs'))('sharp');
const root=path.resolve(__dirname,'../../..'),proposals=path.join(root,'V4/propositions/2026-10-20-city-portraits');
const backupRoot=path.resolve(root,'../../maintenance/private-backups'),backup=path.join(backupRoot,'2026-10-21-thalassea-underwater');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function save(file,bytes){
 try{assert.equal(sha(await fs.readFile(file)),sha(bytes),'Refusing overwrite '+file);}
 catch(error){if(error.code!=='ENOENT')throw error;await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes,{flag:'wx'});}
}
async function info(file){
 const bytes=await fs.readFile(file),m=await sharp(bytes).metadata();
 return {file:path.relative(root,file).split(path.sep).join('/'),bytes:bytes.length,sha256:sha(bytes),width:m.width,height:m.height};
}
async function main(){
 assert(backup.startsWith(backupRoot+path.sep)&&!backup.startsWith(root+path.sep));
 const previous=JSON.parse(await fs.readFile(path.join(__dirname,'previous-city-portraits.json'),'utf8'));
 const current=JSON.parse(await fs.readFile(path.join(root,'V4/map/city-portraits.json'),'utf8'));
 for(const city of previous.cities)if(city.id!=='thalassea')assert.deepEqual(current.cities.find(c=>c.id===city.id),city);
 assert(['04','13'].includes(current.cities.find(c=>c.id==='thalassea').revision));
 const old=previous.cities.find(c=>c.id==='thalassea');
 for(const city of previous.cities)for(const kind of ['source','preview','full']){
  const record=city[kind];assert.equal(sha(await fs.readFile(path.join(root,record.file))),record.sha256,record.file+' changed');
 }
 const prompt=JSON.parse(await fs.readFile(path.join(proposals,'prompts-13.json'),'utf8')),spec=prompt.cities[0];
 const bytes=await fs.readFile(spec.originalSource),original=path.join(proposals,spec.file);
 await save(original,bytes);
 const full=path.join(root,'V4/site/assets/map/portraits/thalassea-13.webp');
 const small=path.join(root,'V4/site/assets/map/portraits/thalassea-13-small.webp');
 const fullBytes=await sharp(bytes).webp({quality:88,effort:6}).toBuffer();
 const smallBytes=await sharp(bytes).resize({width:768,withoutEnlargement:true}).webp({quality:84,effort:6}).toBuffer();
 await save(full,fullBytes);await save(small,smallBytes);
 await save(path.join(backup,'thalassea-13.png'),bytes);
 await save(path.join(backup,'thalassea-04.png'),await fs.readFile(path.join(root,old.source.file)));
 await save(path.join(backup,'thalassea-13.webp'),fullBytes);
 await save(path.join(backup,'thalassea-13-small.webp'),smallBytes);
 await save(path.join(backup,'prompts-13.json'),await fs.readFile(path.join(proposals,'prompts-13.json')));
 await save(path.join(backup,'previous-city-portraits.json'),await fs.readFile(path.join(__dirname,'previous-city-portraits.json')));
 const entry={id:'thalassea',revision:'13',source:await info(original),preview:await info(small),full:await info(full)};
 await save(path.join(proposals,spec.preview),await sharp(bytes).resize({width:1280,withoutEnlargement:true}).webp({quality:88,effort:6}).toBuffer());
 const manifest={...previous,date:'2026-10-21',lastRevision:{date:'2026-10-21',city:'thalassea',from:'04',to:'13',request:spec.request},cities:previous.cities.map(c=>c.id==='thalassea'?entry:c)};
 await fs.writeFile(path.join(root,'V4/map/city-portraits.json'),JSON.stringify(manifest,null,2)+'\n');
 const asLegacy=record=>({path:record.file,bytes:record.bytes,sha256:record.sha256});
 const report={schema:1,date:'2026-10-21',revision:'13',generator:prompt.generator,request:spec.request,previousSourceUnchanged:true,sevenOtherCitiesUnchanged:true,terrainAndEmblemsUnchanged:true,retiredRuntimeFilesPreserved:[old.preview,old.full],cities:[{id:'thalassea',status:spec.status,width:entry.source.width,height:entry.source.height,original:asLegacy(entry.source),preview:asLegacy(await info(path.join(proposals,spec.preview))),runtime:[entry.preview,entry.full]}]};
 const reportBytes=Buffer.from(JSON.stringify(report,null,2)+'\n');
 await fs.writeFile(path.join(__dirname,'provenance.json'),reportBytes);
 await fs.writeFile(path.join(proposals,'provenance-13.json'),reportBytes);
 await save(path.join(backup,'provenance.json'),reportBytes);
 console.log(JSON.stringify({revision:'13',source:entry.source,preview:entry.preview,full:entry.full,backup,sevenOtherCitiesUnchanged:true}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
