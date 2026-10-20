'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs');
const {fs,path,read,write,hash,assert,ROOT}=L;
async function render(){return B.locked(async()=>{
 const file=n=>path.join(__dirname,n),before=read(file('before.json')),qa=path.join(ROOT,'work/qa/tomb-raider-banner');
 await L.protectedCheck();await R.verifyAssets();
 for(const group of [before.inputs,before.backups,before.observed])for(const [f,h]of Object.entries(group))assert.equal(await hash(path.join(ROOT,f)),h,f);
 assert(!fs.existsSync(file('verified.json')),'Do not replace verified natives');
 fs.mkdirSync(qa,{recursive:true});
 const inputs={};for(const n of ['render-native.cjs','replace-native.jsx'])inputs[n]=await hash(file(n));
 const manifest=file('render-inputs.json');if(fs.existsSync(manifest))assert.deepEqual(read(manifest),inputs);else write(manifest,inputs);
 for(const c of before.cards)for(const n of ['card.psd','card.png','render/native.json','render/without-text.png','render/reopened.png']){
  const source=file('cards/'+c.key+'/'+n),backup=path.join(qa,'initial-placement',c.key,n);
  if(fs.existsSync(source)){fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(source,backup,fs.constants.COPYFILE_EXCL);}
 }
 return R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(ROOT,'V4/revisions/2026-09-18-branches/bridge.ps1'),'-Script',file('replace-native.jsx')],path.join(qa,'photoshop.log'));
});}
if(require.main===module)render().then(console.log).catch(e=>{console.error(e);process.exitCode=1});
module.exports={render};
