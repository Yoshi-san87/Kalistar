'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs');
const {fs,path,assert,read,write,hash,ROOT}=L;
async function guard(){const b=read(path.join(__dirname,'before.json'));await L.protectedCheck();await R.verifyAssets();for(const k of ['inputs','backups','observed'])for(const [f,h]of Object.entries(b[k]))assert.equal(await hash(path.join(ROOT,f)),h);return b;}
B.locked(async()=>{
 const b=await guard();for(const c of b.cards)assert(!fs.existsSync(path.join(__dirname,'cards',c.key,'card.psd')));
 const hashes={};for(const n of ['replace-local.jsx','render-local.ps1','render-local.cjs'])hashes[n]=await hash(path.join(__dirname,n));
 write(path.join(__dirname,'render-driver.json'),{reason:'Avoid Photoshop global batch function collision; original frozen driver retained',hashes});
 const log=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(__dirname,'render-local.ps1')],path.join(__dirname,'photoshop-local.log'));
 await guard();console.log(log);
}).catch(e=>{console.error(e);process.exitCode=1;});
