'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model-02.cjs'),set=require('./set.json'),spec=set.cards[0],p=require('./cards/elyrane/profile.json');
const cat=require('../../donnees/catalogue.json'),{deck,formation,deploy}=require('./fixtures-02.cjs');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const published=cat.cards.filter(c=>c.kind==='created'&&c.id!==spec.id);
published.push({id:p.id,profile:p,pngUrl:'/media/created/'+p.id+'.png'});
const dataPromise=buildCatalog({published});
async function fixture(side=0){
 const data=await dataPromise,E=createEngine(data),s=E.newGame(deck,deck,{seed:'ELYRANE',mode:'local',deckCoverage:2});
 deploy(E,s,side,formation(data.cards,deck,spec.id,4));E.autoDeploy(s,1-side);E.start(s);
 return {data,E,s,u:s.players[side].board[4]};
}
const restored=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
test('Elyrane: unique Grivka Okami, Cryo support, bounded stats and established rules',async()=>{
 M.validateSet(set);M.validateProfile(p,spec);assert(p.canGuard&&p.canHeal);
 assert.equal(p.faction,'Grivka');assert.equal(p.race,'OKAMI');assert.equal(p.element,'CRYO');
 assert.deepEqual(p.atk.filter(v=>typeof v==='string'),['guard','revive']);
 const {E}=await fixture();assert.deepEqual(E.validatePlayableDeck(deck),[]);
 for(const [side,index,value]of [['atk',0,181],['defense',0,211]]){
  const invalid=structuredClone(set);invalid.cards[0][side][index]=value;
  assert.throws(()=>M.validateSet(invalid));
 }
});
test('All twelve printed faces resolve and restore; no UI-only values',async()=>{
 for(let die=1;die<=6;die++){
  const {E,s,u}=await fixture();E.lock(s,4,0);E.rollAttack(s,die);restored(E,s);E.acceptAttack(s);
  const v=p.atk[6-die];assert.equal(s.duel.attackValue,v);
  if(v==='guard'){assert.equal(s.phase,'guard');E.grantGuard(s,u.uid);assert.equal(u.ward,60);}
  else if(v==='revive'){assert.equal(s.phase,'heart');E.grantReraise(s,u.uid);assert.equal(u.reraise,1);}
  else {E.rollDefense(s,6);assert.equal(s.duel.formula.baseAttack,v);assert.equal(s.duel.magic,p.magic.includes(die));}
  assert.equal(s.phase,'result');E.assertState(s);restored(E,s);
  const o=await fixture(1);o.E.lock(o.s,0,4);o.E.rollAttack(o.s,6);o.E.acceptAttack(o.s);o.E.rollDefense(o.s,die);
  assert.equal(o.s.duel.formula.baseDefense,p.defense[6-die]);o.E.assertState(o.s);restored(o.E,o.s);
 }
});
test('Both Cryo barriers reduce actual magic by the native amount',async()=>{
 for(const die of p.barriers){
  const {data,E}=await fixture();
  // Build both legal formations from a fresh game, rather than injecting combat values.
  const fresh=E.newGame(deck,deck,{seed:'ELYRANE-BARRIER',mode:'local',deckCoverage:2});
  for(let side=0;side<2;side++)deploy(E,fresh,side,formation(data.cards,deck,spec.id,4));E.start(fresh);
  E.lock(fresh,4,4);E.rollAttack(fresh,5);E.acceptAttack(fresh);E.rollDefense(fresh,die);
  assert(fresh.duel.magic);assert.equal(fresh.duel.formula.barrier,-E.rules.barrier);
  assert.equal(fresh.duel.formula.baseAttack,132);assert.equal(fresh.duel.formula.baseDefense,p.defense[6-die]);
  E.assertState(fresh);restored(E,fresh);
 }
});
function step(E,s){
 if(s.phase==='initiative')E.rollInitiative(s);
 else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
 else if(s.phase==='attack')E.rollAttack(s);
 else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
 else if(s.phase==='defense')E.rollDefense(s);
 else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
 else if(s.phase==='result')E.next(s);
 else{
  const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
  assert(actions[s.phase],s.phase);const [grant,choice]=actions[s.phase];E[grant](s,E[choice](s));
 }
}
test('The protective heart prevents one real elimination, expires and can be granted again',async()=>{
 const {E,s,u}=await fixture();
 const grant=()=>{E.lock(s,4,0);E.rollAttack(s,1);E.acceptAttack(s);E.grantReraise(s,u.uid);};
 grant();assert.equal(u.reraise,1);restored(E,s);E.next(s);
 E.lock(s,0,4);E.rollAttack(s,6);E.acceptAttack(s);E.rollDefense(s,1);
 assert.equal(s.match.events.at(-1).reraise,true);assert.equal(s.match.events.at(-1).kill,false);
 assert.equal(s.players[0].board[4].uid,u.uid);assert.equal(u.reraise,0);restored(E,s);
 E.next(s);grant();assert.equal(u.reraise,1);E.assertState(s);
 assert.equal(E.matchStats(s).units.find(v=>v.uid===u.uid).hearts,2);
});
test('Garde supplies exactly +60 to one physical defense and is consumed',async()=>{
 const {E,s,u}=await fixture();
 E.lock(s,4,0);E.rollAttack(s,3);E.acceptAttack(s);E.grantGuard(s,u.uid);
 assert.equal(u.ward,60);restored(E,s);E.next(s);
 E.lock(s,0,4);E.rollAttack(s,6);E.acceptAttack(s);E.rollDefense(s,6);
 assert.equal(s.duel.magic,false);assert.equal(s.duel.formula.ward,60);
 assert.equal(u.ward,0);E.assertState(s);restored(E,s);
});
test('Twelve complete ABBA matches against legacy decks and repeated restoration',async()=>{
 const data=await dataPromise,E=createEngine(data);let seen=false;
 for(let i=0;i<12;i++){
  const legacy=i%2?data.decks.player:data.decks.enemy;
  let s=E.newGame(i%2?legacy:deck,i%2?deck:legacy,{seed:'ELYRANE-FULL-'+i,turnOrder:'ABBA',deckCoverage:2});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  for(let n=0;n<5000&&s.phase!=='over';n++){
   seen ||= s.players.some(p=>p.board.some(u=>u?.cardId===spec.id));
   step(E,s);E.assertState(s);if(n%17===0){restored(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}
  }
  assert.equal(s.phase,'over');assert(E.matchStats(s).complete);
 }
 assert(seen);
});
test('Approved illustration, native frame, editable text, PSD reopen and barcode proofs',()=>{
 const root=path.resolve(__dirname,'../../..');
 const digest=f=>{const bytes=fs.readFileSync(f),m=bytes.length<1024&&/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(bytes.toString());return m?m[1]:crypto.createHash('sha256').update(bytes).digest('hex');};
 const v=require('./cards/elyrane/verification.json');
 assert(v.passed&&v.barcode.passed);assert.equal(v.components.fixedDifferences,0);assert.equal(v.roundtrip.changed,0);
 assert.equal(digest(path.join(root,p.artworkSource)),digest(path.join(__dirname,'cards/elyrane/illustration.png')));
 for(const f of ['card.png','card.psd'])assert.equal(digest(path.join(__dirname,'cards/elyrane',f)),v.hashes[f]);
 const before=require('./before.json');for(const old of before.catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});
