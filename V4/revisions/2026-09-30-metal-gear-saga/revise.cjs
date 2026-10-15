'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),D=require('../../atelier/designer-core.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs'),T=require('../../collaborations/nier-pilot-01/typography.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,home=__dirname,REV='2026-09-30-metal-gear-saga',file=n=>path.join(home,n),rel=f=>path.relative(ROOT,f).replaceAll('\\','/'),cat=D.CATALOGUE;
const cards=[
 {key:'old-snake',id:'46676157',kind:'name',old:'2026-09-27-mgs-banner-refinement/work/solid-snake-mgs4',rect:[200,85,699,173],changed:['NOM']},
 {key:'ninja',id:'47702575',kind:'death',old:'2026-09-27-mgs-banner-refinement/work/ninja',rect:[110,530,203,624],changed:['ATK D3 - valeur','ATK D3 - effet death']},
 {key:'vamp2',id:'49173082',kind:'art',old:'2026-09-28-vamp-athletic/work/vamp',rect:[80,156,817,1077],changed:['ILLUSTRATION - cadrage'],art:'V4/Illustrations/Vamp_MGS2_Bassin_Peinture_20260930.png'}
];
const out=c=>file('work/'+c.key),creation=c=>path.join(ROOT,'V4/creations',c.id),old=c=>path.join(ROOT,'V4/revisions',c.old);
function files(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name)):[path.join(d,e.name)]);}
async function guard(){await L.protectedCheck();await R.verifyAssets();for(const [f,h] of Object.entries(read(file('before.json'))))assert.equal(await hash(path.join(ROOT,f)),h,f);}
async function prepare(){
 assert(!fs.existsSync(file('before.json')));await L.protectedCheck();await R.verifyAssets();
 const observed={};for(const f of [...files(path.join(ROOT,'V4/creations')),cat])observed[rel(f)]=await hash(f);
 write(file('before.json'),observed);fs.copyFileSync(cat,file('catalogue-before.json'));
 for(const c of cards){
  const src=creation(c),dest=out(c),render=path.join(dest,'render');fs.mkdirSync(render,{recursive:true});fs.cpSync(src,file('originals/'+c.key),{recursive:true});
  assert.equal(await hash(path.join(old(c),'card.png')),await hash(path.join(src,'card.png')),'Stale native evidence '+c.key);
  const p=read(path.join(src,'profile.json'));
  if(c.kind==='name')p.name='OLD SNAKE';
  if(c.kind==='death'){assert.equal(p.atk[3],128);assert(!p.magic.includes(3));p.atk[3]='death';}
  if(c.kind==='art')fs.copyFileSync(path.join(src,'profile.json'),path.join(dest,'profile.json'));else write(path.join(dest,'profile.json'),p);
  const plan=read(path.join(old(c),'render/composition.json'));
  for(const l of plan.layers)fs.copyFileSync(path.join(old(c),'render',l.file),path.join(render,l.file));
  if(c.kind==='death'){
   const donor=require('../../expansions/2026-09-27-metal-gear-mines/model.cjs').donor(p,D);
   const effect=(await R.components(donor,{id:p.id,positionsText:true})).find(l=>l.name==='ATK D3 - effet death');assert(effect);
   const name='component-death.png';await sharp(effect.input).png().toFile(path.join(render,name));plan.layers.push({file:name,name:effect.name,left:effect.left,top:effect.top,width:effect.width,height:effect.height});
  }
  if(c.kind==='art'){
   const art=plan.layers.find(l=>l.name==='ILLUSTRATION - cadrage');assert(art);
   await sharp(path.join(ROOT,c.art)).resize(737,921,{fit:'cover'}).png().toFile(path.join(render,art.file));
  }
  fs.copyFileSync(c.art?path.join(ROOT,c.art):path.join(src,'illustration.png'),path.join(dest,'illustration.png'));
  write(path.join(render,'composition.json'),plan);
  await sharp(await R.composite(plan.layers.map(l=>({...l,input:path.join(render,l.file)})))).png().toFile(path.join(render,'expected-components.png'));
 }
 write(file('render-request.json'),{revision:REV,cards:cards.map(c=>({...c,original:rel(file('originals/'+c.key+'/card.psd')),native:rel(path.join(old(c),'render/native.json'))}))});
 await guard();return {prepared:cards.map(c=>c.id)};
}
function profileCheck(c,p){
 const before=read(file('originals/'+c.key+'/profile.json')),expected=structuredClone(before);
 if(c.kind==='name')expected.name='OLD SNAKE';if(c.kind==='death')expected.atk[3]='death';
 assert.deepEqual(p,expected,'Only requested fields may change');
}
async function verify(){
 await guard();const checks=[];
 for(const c of cards){
  const dest=out(c),p=read(path.join(dest,'profile.json'));profileCheck(c,p);
  const v=await B.verifyNative(dest,p),n=read(path.join(dest,'render/native.json'));T.verify(n);
  const delta=await L.diff(path.join(creation(c),'card.png'),path.join(dest,'card.png'),[c.rect]);assert.equal(delta.outside,0,c.key);assert(delta.changed>0);
  const audit=read(path.join(dest,'audit.json'));
  const stable=layers=>layers.filter(l=>!c.changed.includes(l.name)).map(({id,...l})=>l);
  assert.deepEqual(stable(audit.after),stable(audit.before));
  assert.deepEqual(stable(audit.reopened),stable(audit.before));
  const styles=a=>a.filter(s=>!c.changed.includes(s.path));assert.deepEqual(styles(audit.textsAfter),styles(audit.textsBefore));assert.deepEqual(styles(audit.textsReopened),styles(audit.textsBefore));
  if(c.kind==='art'){assert.equal((await L.diff(path.join(dest,'before-without-art.png'),path.join(dest,'after-without-art.png'))).changed,0);assert(fs.readFileSync(file('originals/'+c.key+'/profile.json')).equals(fs.readFileSync(path.join(dest,'profile.json'))));}
  write(path.join(dest,'verification.json'),{...v,scope:delta,preservedNativeStyles:true});
  await sharp(path.join(dest,'card.png')).resize({width:300}).png().toFile(path.join(dest,'small.png'));checks.push({id:c.id,passed:v.passed,scope:delta});
 }
 await guard();write(file('verified.json'),{cards:checks});return checks;
}
async function publish(){
 await guard();const catalogue=read(cat),changes=[];
 for(const c of cards){
  const dest=out(c),v=read(path.join(dest,'verification.json')),entry=catalogue.cards.find(e=>e.id===c.id),p=read(path.join(dest,'profile.json'));
  assert(v.passed&&v.scope.outside===0&&v.preservedNativeStyles);profileCheck(c,p);assert.equal(v.profileHash,await hash(path.join(dest,'profile.json')));
  for(const n of ['card.png','card.psd'])assert.equal(v.hashes[n],await hash(path.join(dest,n)));
  entry.profile=p;entry.name=p.name;entry.nativeRevision={id:REV,key:c.key,proof:rel(path.join(dest,'verification.json')),...(c.art?{artworkSource:c.art}:{})};
 }
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
 assert.equal(data.cards.length,138);assert.equal(data.cards.find(c=>c.id===cards[0].id).characterId,'solid-snake-mgs');assert.equal(data.cards.find(c=>c.id===cards[1].id).atk[3],'death');
 await guard();
 for(const c of cards){
  const dest=out(c),target=creation(c),entry=catalogue.cards.find(e=>e.id===c.id),meta=read(path.join(target,'creation.json'));
  const names=['profile.json','card.png','card.psd','verification.json',...(c.art?['illustration.png']:[])];
  for(const n of names){meta.hashes[n]=await hash(path.join(dest,n));fs.copyFileSync(path.join(dest,n),path.join(target,n));changes.push(rel(path.join(target,n)));}
  meta.nativeRevision=entry.nativeRevision;write(path.join(target,'creation.json'),meta);changes.push(rel(path.join(target,'creation.json')));
 }
 write(cat,catalogue);changes.push(rel(cat));
 for(const [f,h] of Object.entries(read(file('before.json'))))if(!changes.includes(f))assert.equal(await hash(path.join(ROOT,f)),h,f);
 await L.protectedCheck();write(file('published.json'),{ids:cards.map(c=>c.id),changed:changes,unrelatedCreationsUnchanged:true});return {published:cards.map(c=>c.id)};
}
module.exports={cards,profileCheck,prepare,verify,publish};
if(require.main===module)({prepare,verify,publish}[process.argv[2]])().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
