'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const before=require('./before.json'),catalogue=require('../../donnees/catalogue.json'),p=require('../../creations/49901503/profile.json'),proof=require('./work/verification.json');
const {previousEntry}=require('./compatibility.cjs'),{buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js'),Q=require('../../site/equipment.js');
const data=buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
const entry=catalogue.cards.find(c=>c.id==='49901503'),name="L'HOMME MYST\u00c8RE";
test('Only the displayed name changes, keeping model, identity and every gameplay field',()=>{
 assert.equal(p.name,name);assert.deepEqual({...p,name:before.entry.profile.name},before.entry.profile);
 assert.equal(entry.name,name);assert.deepEqual(entry.profile,p);assert.deepEqual(previousEntry(entry),before.entry);
 assert.equal(catalogue.cards.filter(c=>c.profile?.characterId==='sphinx-batman').length,1);
 const prior=require('./catalogue-before-publication.json');
 for(const c of prior.cards)if(c.id!==p.id)assert.deepEqual(c,catalogue.cards.find(n=>n.id===c.id));
 for(const mutate of [e=>e.profile.atk[0]++,e=>e.profile.characterId='new-identity',e=>e.name='WRONG',e=>e.nativeRevision.previous=null]){
  const bad=structuredClone(entry);mutate(bad);assert.throws(()=>previousEntry(bad));
 }
});
test('Editable native title, exact rest of card, original art, barcode and PSD roundtrip',()=>{
 assert(proof.passed&&proof.nameOnly&&proof.barcode.passed);assert.equal(proof.scope.outside,0);assert(proof.scope.changed>0);
 assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.fixedDifferences,0);
 const digest=n=>crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../creations/49901503',n))).digest('hex');
 assert.equal(digest('card.png'),proof.hashes['card.png']);
 assert.equal(digest('illustration.png'),before.observed['V4/creations/49901503/illustration.png']);
 const n=require('./work/render/native.json'),l=n.layers.find(l=>l.name==='NOM');
 assert.equal(l.kind,'LayerKind.TEXT');assert.equal(l.text,name);assert(l.ink[2]-l.ink[0]<=470);
 const old=require('./originals/render/native.json');
 for(const layer of old.layers)if(layer.name!=='NOM')assert.deepEqual(n.layers.find(l=>l.name===layer.name),layer);
});
test('Existing equipment still targets the stable character, lore uses the requested name',async()=>{
 const d=await data,c=d.cards.find(c=>c.id===p.id),w=Q.catalogue.weapons.find(w=>w.restrictions?.characterIds?.includes(c.characterId));
 assert.equal(c.name,name);assert(w);assert(Q.compatible(w,c));
 assert(w.lore.includes("L'Homme Myst\u00e8re"));assert(!w.lore.includes('Le Sphinx'));
 assert(!Q.compatible(w,{...c,characterId:'unknown'}));
});
test('Existing decks and saved matches restore identically across the rename',async()=>{
 const current=await data,old=structuredClone(current),ids=require('../../expansions/2026-10-09-crossover-crystals/model.cjs').decks[0];
 old.cards.find(c=>c.id===p.id).name=before.entry.name;
 const prior=createEngine(old),now=createEngine(current);assert.deepEqual(now.validatePlayableDeck(ids),[]);
 const s=prior.newGame(ids,ids,{seed:'homme-mystere-rename',mode:'local',kalistel:false,deckCoverage:2});
 prior.autoDeploy(s,0);prior.autoDeploy(s,1);prior.start(s);prior.lock(s,0,0);prior.rollAttack(s,6);
 const raw=JSON.stringify(s);assert.deepEqual(now.restoreGame(JSON.parse(raw)),s);assert.equal(JSON.stringify(s),raw);
 assert.equal(now.byId[p.id].characterId,prior.byId[p.id].characterId);
});
