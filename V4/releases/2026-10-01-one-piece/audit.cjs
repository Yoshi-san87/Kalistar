'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs');
const {fs,path,assert,read,write,hash,ROOT}=L;
const targetIds=['49600118'],home=__dirname;
const file=name=>path.join(home,name),setPath=path.join(ROOT,'V4/expansions/2026-10-01-one-piece/set.json');
function inventory(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?inventory(path.join(dir,e.name)):[path.join(dir,e.name)]);}
async function freeze(){
 assert(!fs.existsSync(file('baseline.json')),'Do not replace baseline');await L.protectedCheck();
 const files={};for(const f of inventory(path.join(ROOT,'V4/creations')))files[path.relative(ROOT,f).replaceAll('\\','/')]=await hash(f);
 write(file('baseline.json'),{catalogue:read(D.CATALOGUE),files,arenas:read(path.join(ROOT,'V4/donnees/arenes-collaborations.json')),targetIds});
 return {frozen:Object.keys(files).length,cards:read(D.CATALOGUE).cards.length};
}
async function verify(){
 const before=read(file('baseline.json')),catalogue=read(D.CATALOGUE),set=read(setPath);
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
 assert.deepEqual(read(path.join(ROOT,'V4/donnees/arenes-collaborations.json')),before.arenas);
 for(const entry of before.catalogue.cards){
  const current=catalogue.cards.find(c=>c.id===entry.id);assert(current,entry.id);
  if(!targetIds.includes(entry.id))assert.deepEqual(current,entry,'Unrelated card changed '+entry.id);
  else {const expected=structuredClone(entry.profile);expected.race='SKULLZ';assert.deepEqual(current.profile,expected);}
 }
 for(const [f,h] of Object.entries(before.files))if(!targetIds.includes(f.split('/')[2]))assert.equal(await hash(path.join(ROOT,f)),h,f);
 const added=catalogue.cards.filter(c=>!before.catalogue.cards.some(p=>p.id===c.id));
 assert.deepEqual(added.map(c=>c.id).sort(),set.cards.map(c=>c.id).sort());assert.equal(added.length,11);
 for(const c of [...added,...catalogue.cards.filter(c=>targetIds.includes(c.id))]){
  const dir=path.join(ROOT,'V4/creations',c.id),v=read(path.join(dir,'verification.json')),meta=read(path.join(dir,'creation.json'));
  assert(v.passed,'Native check '+c.id);assert.equal(v.roundtrip.changed,0);assert.equal(v.components.fixedDifferences,0);assert(v.barcode.passed);
  for(const [name,h] of Object.entries(meta.hashes))assert.equal(await hash(path.join(dir,name)),h,c.id+' '+name);
 }
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
 assert.equal(data.cards.length,before.catalogue.cards.length+11);assert.equal(data.arenas.length,28);
 const family=data.cards.filter(c=>set.cards.filter(s=>s.key.startsWith('chopper')).some(s=>s.id===c.id));assert.equal(family.length,2);assert.equal(new Set(family.map(c=>c.characterId)).size,1);
 const summary={passed:true,cards:data.cards.length,arenas:28,added:11,revised:1,protectedReferencesUnchanged:true,unrelatedCardsUnchanged:true,skullFaceOnlyRaceAndArtChanged:true};
 write(file('verification.json'),summary);return summary;
}
if(require.main===module)({freeze,verify}[process.argv[2]])().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={targetIds,freeze,verify};
