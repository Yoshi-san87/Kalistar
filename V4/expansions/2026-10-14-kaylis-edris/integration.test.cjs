'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),set=require('./set.json'),{decks}=require('./fixtures.cjs');
const {formation,deploy}=require('../2026-10-09-skaern-luxo/fixtures.cjs');
const {createEngine}=require('../../site/engine.js'),dataPromise=require('./build.cjs').game();
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
const grants={guard:['grantGuard','ward',60],retry:['grantClover','luck',1],buff_atk:['grantPhysical','physical',60],mana:['grantPotion','mana',60],revive:['grantReraise','reraise',1]};
async function fixture(c,side=0){
 const data=await dataPromise,E=createEngine(data),slot=c.role-1,deck=decks.find(d=>d.includes(c.id));
 const s=E.newGame(side?decks[0]:deck,side?deck:decks[0],{seed:'KAYLIS-EDRIS-'+c.key,mode:'local',deckCoverage:2,kalistel:false});
 deploy(E,s,side,formation(data.cards,deck,c.id,slot));
 deploy(E,s,1-side,formation(data.cards,decks[0],'49902612',0));E.start(s);
 return {data,E,s,slot,u:s.players[side].board[slot]};
}
function step(E,s){
 if(s.phase==='initiative')E.rollInitiative(s);
 else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
 else if(s.phase==='attack')E.rollAttack(s);
 else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
 else if(s.phase==='defense')E.rollDefense(s);
 else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
 else if(s.phase==='result')E.next(s);
 else {
  const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
  assert(actions[s.phase],s.phase);const [grant,choice]=actions[s.phase];E[grant](s,E[choice](s));
 }
}
test('Two identities, legal role bands, varied faces and all formations',async()=>{
 M.validateSet(set);const data=await dataPromise;M.validateGame(data,set,createEngine);
 assert.equal(new Set(set.cards.map(c=>JSON.stringify(c.atk))).size,2);
 assert.equal(set.cards.find(c=>c.key==='kaylis').characterId,'kaylis');
 assert.equal(set.cards.find(c=>c.key==='edris-7f').job,'ESPIONNE');
 for(const c of set.cards){
  for(const side of ['atk','defense']){const bad=structuredClone(c);bad[side][0]=1000;assert.throws(()=>M.profile(bad));}
  for(const pos of c.positions)assert(formation(data.cards,decks.find(d=>d.includes(c.id)),c.id,pos-1));
  if(c.element==='NONE'){const bad=structuredClone(c);bad.magic=[5];assert.throws(()=>M.profile(bad));}
 }
});
for(const c of set.cards)test(c.name+': all twelve printed faces, support, log and restore',async()=>{
 for(let die=1;die<=6;die++){
  const {E,s,u,slot}=await fixture(c);E.lock(s,slot,0);E.rollAttack(s,die);restore(E,s);
  const v=c.atk[6-die];assert.equal(s.duel.attackValue,v);
  if(grants[v]){const [grant,key,value]=grants[v];E[grant](s,u.uid);assert.equal(u[key],value);assert(s.match.events.at(-1).support);}
  else{E.rollDefense(s,6);if(typeof v==='number'){assert.equal(s.duel.formula.baseAttack,v);assert.equal(s.duel.magic,c.magic.includes(die));}else assert(s.match.events.at(-1).kill);}
  assert(s.log.some(l=>l.text.includes(c.name)&&l.text.includes('D'+die)));
  assert.equal(s.phase,'result');E.assertState(s);restore(E,s);
  const d=await fixture(c,1);d.E.lock(d.s,0,d.slot);d.E.rollAttack(d.s,6);d.E.rollDefense(d.s,die);
  const def=c.defense[6-die];assert.equal(d.s.duel.defenseValue,def);restore(d.E,d.s);
  if(def==='retry'){assert.equal(d.s.phase,'defense');d.E.rollDefense(d.s,6);assert.equal(d.s.duel.defenseRolls.length,2);}
  else if(def==='dodge'){assert(d.s.match.events.at(-1).dodge);assert(!d.s.match.events.at(-1).kill);}
  else assert.equal(d.s.duel.formula.baseDefense,def);
  d.E.assertState(d.s);restore(d.E,d.s);
 }
});
test('Every printed barrier removes 30 only against a magical numerical attack',async()=>{
 const data=await dataPromise,E=createEngine(data),caster={id:'49902613'};
 for(const c of set.cards)for(const die of c.barriers)for(const magical of [false,true]){
  const deck=decks.find(d=>d.includes(c.id)),s=E.newGame(decks[0],deck,{seed:'KAYLIS-EDRIS-BARRIER',mode:'local',deckCoverage:2,kalistel:false});
  deploy(E,s,0,formation(data.cards,decks[0],caster.id,3));deploy(E,s,1,formation(data.cards,deck,c.id,c.role-1));E.start(s);
  E.lock(s,3,c.role-1);E.rollAttack(s,magical?6:5);E.rollDefense(s,die);
  assert.equal(s.duel.formula.barrier,magical?-E.rules.barrier:0);E.assertState(s);restore(E,s);
 }
});
test('Forty complete matches against new and legacy decks, with saved intermediate phases',async()=>{
 const data=await dataPromise,E=createEngine(data),seen=new Set();
 for(let i=0;i<40;i++){
  const newDeck=decks[0],opponent=i%3?data.decks.player:decks[0];
  let s=E.newGame(i%2?opponent:newDeck,i%2?newDeck:opponent,{seed:'KAYLIS-EDRIS-FULL-'+i,turnOrder:'ABBA',deckCoverage:2});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  for(let n=0;n<6000&&s.phase!=='over';n++){
   for(const p of s.players)for(const u of p.board.filter(Boolean))seen.add(u.cardId);
   step(E,s);E.assertState(s);if(n%23===0){restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}
  }
  assert.equal(s.phase,'over');assert(E.matchStats(s).complete);
 }
 for(const c of set.cards)assert(seen.has(c.id),c.key);
});
test('Native proofs, exact approved illustrations, NONE components and preserved catalogue',()=>{
 const root=path.resolve(__dirname,'../../..'),cat=require('../../revisions/2026-10-17-nestown-manteau-rempart/compatibility.cjs').previousCatalogue(require('../../donnees/catalogue.json'));
 const digest=f=>{const b=fs.readFileSync(f),m=b.length<1024&&/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(b.toString());return m?m[1]:crypto.createHash('sha256').update(b).digest('hex');};
 for(const c of set.cards){
  const dir=path.join(__dirname,'cards',c.key),v=require(path.join(dir,'verification.json'));
  assert(v.passed&&v.barcode.passed);assert.equal(v.components.fixedDifferences,0);assert.equal(v.roundtrip.changed,0);
  assert.equal(digest(path.join(root,c.artworkSource)),digest(path.join(dir,'illustration.png')));
  for(const f of ['card.png','card.psd'])assert.equal(digest(path.join(dir,f)),v.hashes[f]);
  if(c.element==='NONE')assert(v.none.unlit);
 }
 for(const old of require('./before.json').catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});


test('Kaylis versions remain one character and the rapier restrictions apply per version',async()=>{
 const data=await dataPromise,E=createEngine(data),Eq=require('../../site/equipment.js');
 const kaylis=data.cards.find(c=>c.id==='49902701'),old=data.cards.find(c=>c.id==='49055457');
 assert.equal(kaylis.characterId,old.characterId);
 const duplicate=[...decks[0]];duplicate[3]=old.id;
 assert(E.validateDeck(duplicate).some(message=>message.includes('toutes versions confondues')));
 assert(E.validateDeck(duplicate).some(message=>message.includes('Rainbow')));
 const weapons=require('../../site/weapons.js').weapons;
 for(const id of ['white-oath-rapier','kaylis-eclipse-rapier']){
  const w=weapons.find(w=>w.id===id);assert(w,id);
  assert(Eq.compatible(w,kaylis));assert(Eq.compatible(w,old));
  assert(!Eq.compatible(w,data.cards.find(c=>c.id==='30000012')));
  assert(!Eq.compatible(w,data.cards.find(c=>c.id==='49902702')));
 }
});
