'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs');
const {fs,path,assert,hash,write}=L,home=__dirname;
async function main(){return B.locked(async()=>{
  await require('./build.cjs').stable();
  const backup=path.join(home,'repairs/straight-apostrophes');assert(!fs.existsSync(backup));
  const prior={reason:'Photoshop Smart Quotes changed two native name strings; frozen inputs remain untouched.',files:{}};
  for(const key of ['epouvantail','ras-al-ghul'])for(const name of ['card.psd','card.png','render/native.json','render/reopened.png','render/without-text.png']){
    const source=path.join(home,'cards',key,name),dest=path.join(backup,key,name);
    fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);
    prior.files[key+'/'+name]=await hash(source);
  }
  write(path.join(backup,'before.json'),prior);
  const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(home,'repair-quotes.ps1')],path.join(home,'repair-quotes.log'));
  await require('./build.cjs').stable();return result;
});}
main().then(console.log).catch(e=>{console.error(e);process.exitCode=1;});
