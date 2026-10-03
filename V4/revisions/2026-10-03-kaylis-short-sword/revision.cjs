'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const {circularDiff}=require('../2026-09-27-weapon-optics/proof.cjs');
const {transactionIO}=require('../2026-09-23-nier-art-refinement/transaction.cjs');
const {fs,path,ROOT,DATA,read,write,hash,sharp,assert,crypto}=L;
const revision='2026-10-03-kaylis-short-sword',file=n=>path.join(__dirname,n),rel=f=>path.relative(ROOT,f).replaceAll('\\','/');
const targets=['card.psd','card.png','profile.json','verification.json','creation.json'].map(n=>'V4/creations/49055457/'+n).concat('V4/donnees/catalogue.json');
async function guard(b){for(const [target,sha] of Object.entries(b.observed))assert.equal(await hash(path.join(ROOT,target)),sha,'Concurrent edit: '+target);for(const [target,sha]of Object.entries(b.backups))assert.equal(await hash(file('originals/'+target)),sha);}
async function prepare(){
  if(fs.existsSync(file('before.json')))return guard(read(file('before.json')));
  await L.protectedCheck();await R.verifyAssets();
  const refs=L.baseline(),manifest=read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')),p=read(path.join(ROOT,targets[2]));
  assert.equal(p.id,'49055457');assert.equal(p.weapon,'Katana');
  assert(targets.every(t=>!Object.hasOwn(refs.protectedFiles,t)),'This route cannot modify protected sources');
  const b={revision,referenceId:refs.id,bank:'V4/atelier/designer-assets/'+manifest.weapons['Epée courte'].file,observed:{},backups:{}};
  for(const t of [...targets,...Object.keys(refs.protectedFiles)])b.observed[t]=await hash(path.join(ROOT,t));
  for(const t of targets){const out=file('originals/'+t);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(ROOT,t),out,fs.constants.COPYFILE_EXCL);b.backups[t]=await hash(out);}
  fs.mkdirSync(file('staged'),{recursive:true});write(file('before.json'),b);
}
async function native(){
  const b=read(file('before.json'));await guard(b);
  const lock=path.join(DATA,'render.lock'),id=crypto.randomUUID();let fd;
  try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({id,pid:process.pid,revision}));
    console.log(await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1'),'-Script',file('native.jsx')],file('native.log')));
  }finally{if(fd!==undefined){fs.closeSync(fd);if(read(lock).id===id)fs.unlinkSync(lock);}}
}
async function verify(){
  const b=read(file('before.json'));await guard(b);
  const comparison=await circularDiff(path.join(ROOT,targets[1]),file('staged/card.png'));
  assert.equal(comparison.outside,0);assert(comparison.changed>0);
  const roundtrip=await L.diff(file('staged/card.png'),file('staged/reopened.png'));assert.equal(roundtrip.changed,0);
  const native=read(file('staged/native.json'));
  // A single embedded weapon layer changes its name; all editable text stays unchanged.
  function texts(state){return state.filter(x=>x.text!==undefined).map(({id,...text})=>text);}
  assert.deepEqual(texts(native.reopened),texts(native.before));
  assert(native.reopened.some(x=>x.name==='ARME - Epée courte'&&x.kind==='LayerKind.SMARTOBJECT'));
  const barcode=JSON.parse(await R.command(L.PYTHON,[path.join(ROOT,'V4/atelier/barcode.py'),file('staged/card.png'),'49055457']));assert(barcode.passed);
  const proof={revision,passed:true,comparison,roundtrip,barcode,pngHash:await hash(file('staged/card.png')),psdHash:await hash(file('staged/card.psd')),nativeHash:await hash(file('staged/native.json')),checkedAt:new Date().toISOString()};
  await sharp(file('staged/card.png')).extract({left:74,top:1100,width:128,height:128}).resize(384,384).png().toFile(file('staged/medallion.png'));
  write(file('verified.json'),proof);console.log(proof);
}
async function publish(){
  const b=read(file('before.json')),proof=read(file('verified.json'));await guard(b);await L.protectedCheck();assert(proof.passed);
  const changes=[],hashes={};
  async function stage(target,value,json=false){const out=file('publication/'+target);fs.mkdirSync(path.dirname(out),{recursive:true});if(json)write(out,value);else fs.copyFileSync(value,out);hashes[target]=await hash(out);changes.push({target:path.join(ROOT,target),backup:file('originals/'+target),stage:out,beforeHash:b.observed[target],afterHash:hashes[target]});}
  for(const [ext,key]of [['png','pngHash'],['psd','psdHash']]){assert.equal(await hash(file('staged/card.'+ext)),proof[key]);await stage('V4/creations/49055457/card.'+ext,file('staged/card.'+ext));}
  const p=read(file('originals/'+targets[2]));p.weapon='Epée courte';p.weapon_index=16;await stage(targets[2],p,true);
  const nr={id:revision,proof:rel(file('verified.json')),scope:'weapon-family-and-native-glyph-only'};
  const verification={passed:true,modelId:p.id,referenceId:b.referenceId,profileHash:hashes[targets[2]],hashes:{'card.png':proof.pngHash,'card.psd':proof.psdHash},components:{fixedDifferences:0,changed:proof.comparison.changed},roundtrip:proof.roundtrip,barcode:proof.barcode,nativeRevision:nr,checkedAt:proof.checkedAt,previousVerification:rel(file('originals/'+targets[3]))};
  await stage(targets[3],verification,true);
  const creation=read(file('originals/'+targets[4]));for(const name of ['card.png','card.psd','profile.json','verification.json'])creation.hashes[name]=hashes['V4/creations/49055457/'+name];creation.nativeRevision=nr;await stage(targets[4],creation,true);
  const catalogue=read(file('originals/'+targets[5])),card=catalogue.cards.find(c=>c.id===p.id);card.profile=p;card.nativeRevision=nr;await stage(targets[5],catalogue,true);
  const lock=path.join(DATA,'render.lock'),id=crypto.randomUUID();let fd;
  try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({id,pid:process.pid,revision}));
    await transactionIO(L,file('transaction.json')).commit({revision,changes},{before:()=>guard(b),after:async()=>{for(const c of changes)assert.equal(await hash(c.target),c.afterHash);await L.protectedCheck();await R.verifyAssets();}});
  }finally{if(fd!==undefined){fs.closeSync(fd);if(read(lock).id===id)fs.unlinkSync(lock);}}
  write(file('published.json'),{revision,localOnly:true,changes:changes.map(c=>({file:rel(c.target),beforeHash:c.beforeHash,afterHash:c.afterHash}))});
}
({prepare,native,verify,publish}[process.argv[2]]||(()=>{throw Error('Explicit action required');}))().catch(e=>{console.error(e);process.exitCode=1;});
