'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('./model.cjs'),set=require('./set.json');
const {base}=require('../2026-10-15-collab-scenes-45/fixtures.cjs');
const {formation,deploy}=M;
const {deckFor}=M;
const {createEngine}=require('../../site/engine.js'),dataPromise=require('./build.cjs').game();
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
const grants={guard:['grantGuard','ward',60],retry:['grantClover','luck',1],buff_atk:['grantPhysical','physical',60],mana:['grantPotion','mana',60],revive:['grantReraise','reraise',1]};
test('Tomb Raider collection groups five editions but deck admits only one Lara',async()=>{
 const data=await dataPromise,E=createEngine(data),C=require('../../site/collaborations.js'),Binder=require('../../site/collection-binder.js');
 const versions=set.cards.map(c=>E.byId[c.id]);
 assert(versions.every(c=>C.matches(c,'tomb-raider')&&Binder.matchesScope(c,'tomb-raider')&&!Binder.matchesScope(c,'kalistar')));
 assert.equal(C.asset('factions','TOMBRAIDER'),'assets/factions/TOMBRAIDER.png');
 assert.deepEqual(Binder.groupCards(versions).map(g=>g.length),[5]);
 const model=require('../../site/deck-builder.js').createModel({data,engine:E,registry:{owned:()=>[{}],deckErrors:()=>[]},userId:'fixture'});
 for(const a of set.cards)for(const b of set.cards)if(a.id!==b.id){
  const slots=Array(10).fill(null);slots[0]=a.id;
  assert.equal(model.candidate(slots,1,b.id).allowed,false);
  assert.match(model.candidate(slots,1,b.id).reason,/Une seule carte par personnage/);
  assert.equal(model.candidate(slots,0,b.id).allowed,true);
  const invalid=deckFor(a);invalid[invalid.length-1]=b.id;
  assert(E.validatePlayableDeck(invalid).some(e=>/personnage/.test(e)));
 }
 const f=await fixture(set.cards[0]);
 assert.equal(E.synergy(f.s.players[0],f.u,'faction'),0,'No invented faction bonus for five editions of one person');
});
async function fixture(c,side=0){
 const data=await dataPromise,E=createEngine(data),slot=c.role-1,deck=deckFor(c);
 const s=E.newGame(side?base:deck,side?deck:base,{seed:'LARA-'+c.key,mode:'local',deckCoverage:2,kalistel:false});
 deploy(E,s,side,formation(data.cards,deck,c.id,slot));
 deploy(E,s,1-side,formation(data.cards,base,'49902612',0));E.start(s);
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
test('One identity, five versions, legal role bands, all Kalistels and collection scope',async()=>{
 M.validateSet(set);const data=await dataPromise;M.validateGame(data,set,createEngine);
 assert.equal(new Set(set.cards.map(c=>JSON.stringify(c.atk))).size,5);
 for(const c of set.cards){
  for(const side of ['atk','defense']){const bad=structuredClone(c);bad[side][0]=1000;assert.throws(()=>M.validateSet({...set,cards:set.cards.map(v=>v.id===c.id?bad:v)}));}
  for(const pos of c.positions)assert(formation(data.cards,deckFor(c),c.id,pos-1));
  const noCrystal=structuredClone(c);noCrystal.element='NONE';assert.throws(()=>M.validateSet({...set,cards:set.cards.map(v=>v.id===c.id?noCrystal:v)}));
 }
});
for(const c of set.cards)test(c.name+': twelve printed faces, support, log and restore',async()=>{
 for(let die=1;die<=6;die++){
  const {E,s,u,slot}=await fixture(c);E.lock(s,slot,0);E.rollAttack(s,die);restore(E,s);
  const v=c.atk[6-die];assert.equal(s.duel.attackValue,v);
  if(grants[v]){const [grant,key,value]=grants[v];E[grant](s,u.uid);assert.equal(u[key],value);assert(s.match.events.at(-1).support);}
  else{E.rollDefense(s,6);if(typeof v==='number'){assert.equal(s.duel.formula.baseAttack,v);assert.equal(s.duel.magic,c.magic.includes(die));}else assert(s.match.events.at(-1).kill);}
  assert(s.log.some(l=>l.text.includes(c.name)&&l.text.includes('D'+die)));
  assert.equal(s.phase,'result');E.assertState(s);restore(E,s);
  const d=await fixture(c,1);d.E.lock(d.s,0,d.slot);d.E.rollAttack(d.s,6);d.E.rollDefense(d.s,die);
  const def=c.defense[6-die];assert.equal(d.s.duel.defenseValue,def);restore(d.E,d.s);
  if(def==='retry'){
   assert.equal(d.s.phase,'defense');const numeric=6-c.defense.findIndex(v=>typeof v==='number');
   d.E.rollDefense(d.s,numeric);assert.equal(d.s.duel.defenseRolls.length,2);
  }else if(def==='dodge'){assert(d.s.match.events.at(-1).dodge);assert(!d.s.match.events.at(-1).kill);}
  else assert.equal(d.s.duel.formula.baseDefense,def);
  d.E.assertState(d.s);restore(d.E,d.s);
 }
});
test('Every printed barrier removes 30 only against a magical numerical attack',async()=>{
 const data=await dataPromise,E=createEngine(data);
 for(const c of set.cards)for(const die of c.barriers)for(const magical of [false,true]){
  const deck=deckFor(c),s=E.newGame(base,deck,{seed:'LARA-BARRIER',mode:'local',deckCoverage:2,kalistel:false});
  deploy(E,s,0,formation(data.cards,base,'49902613',3));deploy(E,s,1,formation(data.cards,deck,c.id,c.role-1));E.start(s);
  E.lock(s,3,c.role-1);E.rollAttack(s,magical?6:5);E.rollDefense(s,die);
  assert.equal(s.duel.formula.barrier,magical?-E.rules.barrier:0);E.assertState(s);restore(E,s);
 }
});
test('Five complete ABBA matches with every new version deployed and intermediate saves',async()=>{
 const data=await dataPromise,E=createEngine(data),seen=new Set();
 for(const [i,c]of set.cards.entries()){
  const deck=deckFor(c),side=i%2,opponent=i%3?data.decks.player:base;
  let s=E.newGame(side?opponent:deck,side?deck:opponent,{seed:'LARA-FULL-'+c.id,turnOrder:'ABBA',deckCoverage:2});
  deploy(E,s,side,formation(data.cards,deck,c.id,c.role-1));E.autoDeploy(s,1-side);E.start(s);
  for(let n=0;n<6000&&s.phase!=='over';n++){
   for(const p of s.players)for(const u of p.board.filter(Boolean))seen.add(u.cardId);
   step(E,s);E.assertState(s);if(n%23===0){restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}
  }
  assert.equal(s.phase,'over',c.key);assert(E.matchStats(s).complete);
 }
 for(const c of set.cards)assert(seen.has(c.id),c.key);
});
