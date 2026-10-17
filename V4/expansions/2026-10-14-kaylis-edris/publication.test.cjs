'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {plan,ROOT}=require('../../deploy/build.cjs');
const omitted=['factions/atlas_v2_subject.png','factions/atlas_v2_wand.png','effets/icones_atlas_v2_subject.png','effets/icones_atlas_v2_wand.png'];
test('Both cards are published and old catalogue entries are byte-independent and unchanged',async()=>{
 const {catalogue,files}=await plan();
 for(const c of require('./set.json').cards){
  const item=catalogue.cards.find(v=>v.id===c.id);assert(item);assert.equal(item.characterId,c.characterId);
  assert(files.some(f=>f.source==='V4/creations/'+c.id+'/card.png'));
 }
 const cat=require('../../revisions/2026-10-17-nestown-manteau-rempart/compatibility.cjs').previousCatalogue(require('../../donnees/catalogue.json'));
 for(const old of require('./before.json').catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});
test('Four unused authoring atlases stay in source control but are not deployed',async()=>{
 const {files}=await plan();
 for(const name of omitted){
  assert(fs.existsSync(path.join(ROOT,'V3/assets',name)),'Preserved original '+name);
  assert(!files.some(f=>f.target==='jeu/shared/'+name),'Unused atlas '+name);
 }
 for(const c of require('./set.json').cards){
  assert(files.some(f=>f.target==='jeu/shared/factions/'+encodeURIComponent(c.faction)+'.png'||f.target==='jeu/shared/factions/'+c.faction+'.png'));
 }
 const sourceFiles=fs.readdirSync(path.join(ROOT,'V4/site')).filter(f=>/\.(js|css|html)$/.test(f));
 for(const name of omitted)for(const f of sourceFiles)assert(!fs.readFileSync(path.join(ROOT,'V4/site',f),'utf8').includes(path.basename(name)),f);
});
