'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),{fs,path,ROOT,read,write,hash,assert,sharp}=L;
const home=__dirname,exp=path.join(ROOT,'V4/expansions/2026-10-01-one-piece-witcher'),selection=read(path.join(exp,'publication-selection.json')),set=read(path.join(exp,'set.json'));
const ids=['49800101',...set.cards.filter(c=>selection.ready.includes(c.key)).map(c=>c.id)];
async function main(){
 const protectedFiles=await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
 const frozen=read(path.join(exp,'existing-created.snapshot.json')),cat=D.catalogue(),changed=new Set(['profile.json','card.png','card.psd','verification.json'].map(n=>'V4/creations/49800101/'+n));
 for(const [f,h]of Object.entries(frozen.files))if(!changed.has(f))assert.equal(await hash(path.join(ROOT,f)),h,f);
 for(const c of frozen.entries)if(c.id!=='49800101')assert.deepEqual(cat.cards.find(x=>x.id===c.id),c,'Existing catalogue entry changed');
 const old=read(path.join(ROOT,'V4/revisions/2026-10-01-luffy-light/originals/profile.json')),p=read(path.join(ROOT,'V4/creations/49800101/profile.json'));
 const allowed=new Set(['element','defense','magic','barriers','sentry','color','hue']);
 for(const k of Object.keys(old))if(!allowed.has(k))assert.deepEqual(p[k],old[k],'Luffy.'+k);
 assert.deepEqual(p.atk,old.atk);assert.deepEqual(p.defense.slice(0,5),old.defense.slice(0,5));assert.equal(p.defense[5],'retry');assert.equal(p.element,'LUXO');assert.deepEqual(p.magic,[4]);
 const report={passed:false,protectedFiles,existingCreatedPreserved:136,cards:[],pending:selection.pending,arenas:28};
 const oldDependencies=read(path.join(exp,'attempts/04-portable-projection/dependencies.json')),test='V4/expansions/2026-10-01-one-piece-witcher/model.test.cjs';
 for(const c of set.cards.filter(c=>selection.ready.includes(c.key))){
  const created=path.join(ROOT,'V4/creations',c.id),source=path.join(exp,'cards',c.key),profile=read(path.join(created,'profile.json')),proof=read(path.join(created,'verification.json')),creation=read(path.join(created,'creation.json'));
  require('../../expansions/2026-10-01-one-piece-witcher/model.cjs').validateProfile(profile,c);
  for(const n of ['profile.json','illustration.png','card.png','card.psd'])assert.equal(await hash(path.join(created,n)),await hash(path.join(source,n)));
  for(const [n,h]of Object.entries(creation.hashes))assert.equal(await hash(path.join(created,n)),h,c.key+' published '+n);
  assert(proof.passed&&proof.components.fixedDifferences===0&&proof.roundtrip.changed===0&&proof.barcode.passed);
  const n=read(path.join(source,'render/native.json'));require('../../collaborations/nier-pilot-01/typography.cjs').verify(n);
  assert(n.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
  const historical=read(path.join(source,'preparation.json'));historical.inputs[test]=oldDependencies[test];
  const bytes=Buffer.from(JSON.stringify(historical,null,2));assert.equal(L.crypto.createHash('sha256').update(bytes).digest('hex'),proof.preparationHash,'Exact published preparation must be recoverable');
  const archive=path.join(exp,'attempts/04-portable-projection/cards',c.key);fs.mkdirSync(archive,{recursive:true});
  const dest=path.join(archive,'preparation.json');if(fs.existsSync(dest))assert(fs.readFileSync(dest).equals(bytes));else fs.writeFileSync(dest,bytes,{flag:'wx'});
  const q=path.join(home,'art-prompts',c.key+'.json'),art=read(q);assert.equal(art.selected.sha256,await hash(path.join(ROOT,art.output)));
  art.review='Codex visual review: canonical clothing, coherent anatomy/weapon, natural painted face, restrained narrative scene; checked full card and small proof. Not human approval.';write(q,art);
  if(c.element==='NONE')assert(proof.none.unlit);
  report.cards.push({id:c.id,key:c.key,barcode:true,reopenedIdentical:true,editableText:true,profileHash:proof.profileHash,pngHash:proof.hashes['card.png']});
 }
 const lv=read(path.join(ROOT,'V4/creations/49800101/verification.json'));assert(lv.revision.outside===0&&lv.revision.allRemainingNativeTextUnchanged);report.cards.unshift({id:'49800101',key:'luffy-light',...lv.revision,barcode:lv.barcode.passed,pngHash:lv.hashes['card.png']});
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:cat.cards.filter(c=>c.kind==='created')});assert.equal(data.cards.length,189);assert.equal(data.arenas.length,28);
 for(const c of set.cards.filter(c=>selection.pending.includes(c.key)))assert(!data.cards.some(p=>p.id===c.id));
 assert(require('../../site/engine.js').createEngine(data).validateDeck(['49800103','49800301']).some(e=>e.includes('personnage')));
 report.totalCards=189;report.passed=true;write(path.join(home,'audit.json'),report);return {passed:true,totalCards:189,checked:15,protectedFiles,pending:selection.pending};
}
async function contact(){
 const width=260,height=434,gap=12,columns=5,rows=3,tiles=[];
 for(const [i,id]of ids.entries()){const input=await sharp(path.join(ROOT,'V4/creations',id,'card.png')).resize(width,height,{fit:'fill'}).png().toBuffer();tiles.push({input,left:gap+(i%columns)*(width+gap),top:gap+Math.floor(i/columns)*(height+gap)});}
 await sharp({create:{width:columns*(width+gap)+gap,height:rows*(height+gap)+gap,channels:4,background:'#181818'}}).composite(tiles).png().toFile(path.join(home,'contact.png'));return {cards:ids.length};
}
module.exports={main,contact,ids};if(require.main===module)(process.argv[2]==='contact'?contact():main()).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
