'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const backup=require('./backup.cjs'),{drill}=require('./backup-drill.cjs');
const root=path.resolve(__dirname,'../../..');
function protectedData(mode,file,input){
  const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'backup-protect.ps1'),'-Mode',mode,'-Path',file],{input,encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024});
  if(result.status!==0)throw Error('Windows backup protection failed');return result.stdout;
}
async function main(){
  const [mode,input,output]=process.argv.slice(2);
  if(mode==='seal'){
    const target=path.resolve(output||'');
    if(!output||target===root||target.startsWith(root+path.sep)||!target.endsWith('.dpapi'))throw Error('Choose a .dpapi file outside the checkout');
    const b=backup.bundle(backup.decodeCSV(fs.readFileSync(input,'utf8'))),proof=await drill(b);
    const bytes=zlib.gzipSync(Buffer.from(JSON.stringify(b)));
    fs.mkdirSync(path.dirname(target),{recursive:true});protectedData('Seal',target,bytes.toString('base64'));
    const reopened=zlib.gunzipSync(Buffer.from(protectedData('Open',target),'base64'));
    if(!reopened.equals(Buffer.from(JSON.stringify(b))))throw Error('Encrypted backup round-trip failed');
    const manifest={createdAt:b.snapshot.createdAt,project:backup.project||'fkskjhlaaagqlfcsojjp',schema:b.snapshot.tables.find(t=>t.name==='registry_version').rows[0].version,sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),bytes:fs.statSync(target).size,restore:proof,limitations:['Requires this Windows account/DPAPI keys.','Auth users/identities are preserved; sessions, provider settings, Storage and Cloudflare configuration are not.','Not an independent/off-site copy.']};
    fs.writeFileSync(target+'.manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({file:target,...manifest}));
  }else if(mode==='verify'){
    const b=JSON.parse(zlib.gunzipSync(Buffer.from(protectedData('Open',path.resolve(input)),'base64')));console.log(JSON.stringify(await drill(b)));
  }else throw Error('Usage: backup-local.cjs seal export.csv outside-checkout.dpapi | verify backup.dpapi');
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
