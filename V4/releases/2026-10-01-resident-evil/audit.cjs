'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs');
const {fs,path,assert,read,write,hash,ROOT}=L;
const targetIds=['49600114','49600102','49592640','49600105','49600115','49600103','49600107'];
const file=name=>path.join(__dirname,name);
function inventory(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?inventory(path.join(dir,e.name)):[path.join(dir,e.name)]);}
async function freeze(){
 assert(!fs.existsSync(file('baseline.json')),'Do not replace baseline');
 await L.protectedCheck();
 const catalogue=read(D.CATALOGUE),files={};
 for(const f of inventory(path.join(ROOT,'V4/creations')))files[path.relative(ROOT,f).replaceAll('\\','/')]=await hash(f);
 write(file('baseline.json'),{catalogue,files,arenas:read(path.join(ROOT,'V4/donnees/arenes-collaborations.json')),targetIds});
 return {created:catalogue.cards.length,files:Object.keys(files).length};
}
async function verify(){
 const before=read(file('baseline.json')),catalogue=read(D.CATALOGUE);
 await L.protectedCheck();
 assert.deepEqual(read(path.join(ROOT,'V4/donnees/arenes-collaborations.json')),before.arenas);
 for(const entry of before.catalogue.cards){
  const current=catalogue.cards.find(c=>c.id===entry.id);assert(current,'Old card missing '+entry.id);
  if(!targetIds.includes(entry.id))assert.deepEqual(current,entry,'Unrelated registry change '+entry.id);
  else assert.deepEqual(current.profile,entry.profile,'Gameplay changed '+entry.id);
 }
 for(const [f,h] of Object.entries(before.files)){
  const id=f.split('/')[2];
  if(!targetIds.includes(id)||f.endsWith('/profile.json'))assert.equal(await hash(path.join(ROOT,f)),h,f);
 }
 const added=catalogue.cards.filter(c=>!before.catalogue.cards.some(p=>p.id===c.id));assert.equal(added.length,25);
 for(const c of [...added,...catalogue.cards.filter(c=>targetIds.includes(c.id))]){
  const dir=path.join(ROOT,'V4/creations',c.id),v=read(path.join(dir,'verification.json')),meta=read(path.join(dir,'creation.json'));
  assert(v.passed,'Native verification '+c.id);assert.equal(v.roundtrip.changed,0);assert.equal(v.components.fixedDifferences,0);assert(v.barcode.passed);
  for(const [name,h] of Object.entries(meta.hashes))assert.equal(await hash(path.join(dir,name)),h,c.id+' '+name);
 }
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
 assert.equal(data.cards.length,163);assert.equal(data.arenas.length,28);
 const summary={passed:true,cards:data.cards.length,arenas:data.arenas.length,added:added.length,revised:targetIds.length,protectedReferencesUnchanged:true,unrelatedCardsUnchanged:true,revisedGameplayUnchanged:true};
 write(file('verification.json'),summary);return summary;
}
if(require.main===module)({freeze,verify}[process.argv[2]])().then(v=>console.log(JSON.stringify(v,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={targetIds,freeze,verify};
