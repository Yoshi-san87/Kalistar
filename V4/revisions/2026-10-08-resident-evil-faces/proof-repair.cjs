'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs'),S=require('./rules.cjs'),V=require('./revise.cjs');
const {fs,path,read,write,hash,sharp,assert,ROOT}=L;
const file=n=>path.join(__dirname,n),work=(id,n)=>file('work/'+id+'/'+n),old=(id,n)=>file('originals/'+id+'/'+n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
async function capture(){
 await V.guard();assert(!fs.existsSync(file('proof-repair-inputs.json')));
 const inputs={};
 for(const f of ['proof-repair.jsx','proof-repair.cjs','before.json'])inputs[rel(file(f))]=await hash(file(f));
 for(const c of read(file('plan.json')).cards)for(const n of ['card.psd','card.png','audit.json','render/native.json','render/reopened.png'])inputs[rel(work(c.id,n))]=await hash(work(c.id,n));
 write(file('proof-repair-inputs.json'),{reason:'First isolation PNGs still displayed smart-object faces; capture fresh flattened inspection copies without altering native outputs. Circular masks did not cover the square extremities of the approved LUXO halo: use the exact alpha of changed components plus native numeric circles.',inputs});
 return B.locked(()=>R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(ROOT,'V4/revisions/2026-09-18-branches/bridge.ps1'),'-Script',file('proof-repair.jsx')],file('proof-repair.log')));
}
async function scope(id,c){
 const p=read(work(id,'profile.json')),before=read(old(id,'profile.json')),mask=new Uint8Array(897*1497);
 const oldDir=c.catalogueEntry.nativeRevision?path.dirname(path.join(ROOT,c.catalogueEntry.nativeRevision.proof)):path.join(ROOT,c.catalogueEntry.publicationSource,'cards',read(old(id,'creation.json')).key);
 for(const side of ['atk','defense'])for(let i=0;i<6;i++){
  const die=6-i,field=side==='atk'?'magic':'barriers';
  if(before[side][i]===p[side][i]&&before[field].includes(die)===p[field].includes(die))continue;
  const x=side==='atk'?(i?157.5:142):(i?736.5:756),y=[147,372.5,476.5,577.5,677.5,774.5][i],radius=i?44:64;
  for(let yy=Math.floor(y-radius);yy<y+radius;yy++)for(let xx=Math.floor(x-radius);xx<x+radius;xx++)if((xx+.5-x)**2+(yy+.5-y)**2<=radius**2)mask[yy*897+xx]=1;
  const prefix=(side==='atk'?'ATK':'DEF')+' D'+die+' - ';
  for(const dir of [oldDir,work(id,'')])for(const layer of read(path.join(dir,'render/composition.json')).layers.filter(l=>l.name.startsWith(prefix))){
   const pixels=await sharp(path.join(dir,'render',layer.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   for(let yy=0;yy<pixels.info.height;yy++)for(let xx=0;xx<pixels.info.width;xx++)if(pixels.data[(yy*pixels.info.width+xx)*4+3])mask[(yy+layer.top)*897+xx+layer.left]=1;
  }
 }
 const a=await sharp(old(id,'card.png')).ensureAlpha().raw().toBuffer(),b=await sharp(work(id,'card.png')).ensureAlpha().raw().toBuffer();
 let changed=0,outside=0;
 for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3]){changed++;if(!mask[i/4])outside++;}
 return {changed,outside,method:'Exact original/revised component alpha plus 44/64 px numeric circles for changed combat faces only'};
}
async function verify(){
 await V.guard();const manifest=read(file('proof-repair-inputs.json'));
 for(const [f,h]of Object.entries(manifest.inputs))assert.equal(await hash(path.join(ROOT,f)),h);
 const checks=[];
 for(const c of read(file('before.json')).cards){
  const id=c.id,p=read(work(id,'profile.json')),audit=read(work(id,'audit.json')),native=read(work(id,'render/native.json')),previous=read(old(id,'render/native.json'));
  assert.equal(native.photoshop,'26.11.8');
  for(const state of [audit.before,audit.after,audit.reopened])assert.deepEqual(S.unchangedState(state),S.unchangedState(previous.layers));
  assert.equal((await L.diff(work(id,'before-card.png'),old(id,'card.png'))).changed,0);
  for(const prefix of ['original','revised']){const proof=read(work(id,'proof-'+prefix+'-hidden.json'));assert(proof.hidden.length>=12);assert(proof.state.filter(l=>S.statName(l.name)).every(l=>!l.visible));}
  assert.equal((await L.diff(work(id,'proof-original-no-faces.png'),work(id,'proof-revised-no-faces.png'))).changed,0,'Unchanged isolated native structure: '+id);
  const pixels=await scope(id,c);assert.equal(pixels.outside,0);assert(pixels.changed>0);
  const v={...await B.verifyNative(work(id,''),p),revision:S.REV,scope:pixels,preservedArtworkAndIdentity:true,originalHash:await hash(old(id,'card.psd')),inputManifestHash:await hash(file('before.json')),proofRepairManifestHash:await hash(file('proof-repair-inputs.json'))};
  write(work(id,'verification.json'),v);await sharp(work(id,'card.png')).resize({width:300}).png().toFile(work(id,'small.png'));
  const evidence={};for(const n of ['profile.json','card.png','card.psd','verification.json','audit.json','render/native.json','render/reopened.png','render/without-text.png','proof-original-no-faces.png','proof-revised-no-faces.png','proof-original-hidden.json','proof-revised-hidden.json'])evidence[rel(work(id,n))]=await hash(work(id,n));
  write(work(id,'verified.json'),{id,evidence});
  checks.push({id,scope:pixels,fixed:v.components.fixedDifferences,reopened:v.roundtrip.changed,barcode:v.barcode.passed});
 }
 await V.guard();write(file('native-checks.json'),checks);return checks;
}
module.exports={capture,verify};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1});
