'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs');
const {fs,path,assert,read,write,hash,ROOT}=L;
const home=__dirname,file=n=>path.join(home,n),creation=id=>path.join(ROOT,'V4/creations',id);
const KAINE='45951088',RIKKA='49800201';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
async function freeze(){
 assert(!fs.existsSync(file('baseline.json')),'Preserve the initial baseline');await L.protectedCheck();
 const entries={};for(const f of files(path.join(ROOT,'V4/creations')))entries[path.relative(ROOT,f).replaceAll('\\','/')]=await hash(f);
 write(file('baseline.json'),{catalogue:read(D.CATALOGUE),files:entries,arenas:read(path.join(ROOT,'V4/donnees/arenes-collaborations.json'))});
 return {cards:read(D.CATALOGUE).cards.length,files:Object.keys(entries).length};
}
function statPlans(){return read(path.join(ROOT,'V4/revisions/2026-10-01-stat-personality/plan.json')).cards;}
async function verify(){
 const baseline=read(file('baseline.json')),now=read(D.CATALOGUE),plans=statPlans(),ids=plans.map(c=>c.id),changed=new Set([...ids,KAINE]);
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
 assert.deepEqual(read(path.join(ROOT,'V4/donnees/arenes-collaborations.json')),baseline.arenas);
 for(const old of baseline.catalogue.cards){
  const current=now.cards.find(c=>c.id===old.id);assert(current,old.id);
  if(!changed.has(old.id))assert.deepEqual(current,old,'Unrelated entry '+old.id);
  else{
   assert.deepEqual({...current,profile:undefined,nativeRevision:undefined},{...old,profile:undefined,nativeRevision:undefined});
   if(ids.includes(old.id)){
    const delta=plans.find(c=>c.id===old.id);assert.deepEqual(current.profile,{...old.profile,atk:delta.after.atk,defense:delta.after.defense});
    assert.deepEqual(delta.before,{atk:old.profile.atk,defense:old.profile.defense});
   }else{
    const strip=p=>({...p,crop:undefined,revisionNote:undefined});assert.deepEqual(strip(current.profile),strip(old.profile));
   }
  }
 }
 for(const [f,h] of Object.entries(baseline.files))if(!changed.has(f.split('/')[2]))assert.equal(await hash(path.join(ROOT,f)),h,f);
 const added=now.cards.filter(c=>!baseline.catalogue.cards.some(p=>p.id===c.id));assert.deepEqual(added.map(c=>c.id),[RIKKA]);
 for(const id of [...changed,RIKKA]){
  const dir=creation(id),p=read(path.join(dir,'profile.json')),v=read(path.join(dir,'verification.json')),meta=read(path.join(dir,'creation.json'));
  assert.deepEqual(now.cards.find(c=>c.id===id).profile,p);assert(v.passed,id);assert.equal(v.roundtrip.changed,0,id);assert(v.barcode.passed,id);
  if(id===KAINE){assert.equal(v.unchangedOutsideArt.outside,0);assert.equal(v.withoutArt.changed,0);assert(v.profileBytesUnchanged&&v.fullEmbeddedArtworkBytesUnchanged);}
  else assert.equal(v.components.fixedDifferences,0,id);
  if(ids.includes(id)){assert(v.numericOnly&&v.preservedNativeStyles,id);assert.equal(v.scope.outside,0,id);}
  for(const [name,h] of Object.entries(meta.hashes))assert.equal(await hash(path.join(dir,name)),h,id+' '+name);
 }
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:now.cards.filter(c=>c.kind==='created')});
 assert.equal(data.cards.length,baseline.catalogue.cards.length+1);assert.equal(data.arenas.length,28);
 assert.equal(data.cards.find(c=>c.id===RIKKA).characterId,data.cards.find(c=>c.id==='40000042').characterId);
 const result={passed:true,cards:data.cards.length,arenas:data.arenas.length,numericRevisions:ids.length,kaineFraming:true,newRikka:true,protectedReferencesUnchanged:true,unrelatedCardsUnchanged:true};
 write(file('verification.json'),result);return result;
}
if(require.main===module)({freeze,verify}[process.argv[2]])().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={freeze,verify,statPlans,KAINE,RIKKA};
