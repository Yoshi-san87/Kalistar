'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('./model.cjs'),set=require('./set.json');
const {base,deckFor,formation,deploy}=require('./fixtures.cjs');
const {createEngine}=require('../../site/engine.js'),dataPromise=require('./build.cjs').game();
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
const grants={guard:['grantGuard','ward',60],retry:['grantClover','luck',1],buff_atk:['grantPhysical','physical',60],mana:['grantPotion','mana',60],revive:['grantReraise','reraise',1]};
async function fixture(c,side=0){
 const data=await dataPromise,E=createEngine(data),slot=c.role-1,deck=deckFor(c);
 const s=E.newGame(side?base:deck,side?deck:base,{seed:'SCENES-'+c.key,mode:'local',deckCoverage:2,kalistel:false});
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
test('45 approved versions, five exclusions, legal role bands and stable identities',async()=>{
 M.validateSet(set);const data=await dataPromise;M.validateGame(data,set,createEngine);
 assert.equal(new Set(set.cards.map(c=>JSON.stringify(c.atk))).size,45);
 for(const c of set.cards){
  for(const side of ['atk','defense']){const bad=structuredClone(c);bad[side][0]=1000;assert.throws(()=>M.profile(bad));}
  for(const pos of c.positions)assert(formation(data.cards,deckFor(c),c.id,pos-1));
  const noCrystal=structuredClone(c);noCrystal.element='NONE';assert.throws(()=>M.profile(noCrystal));
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
  const deck=deckFor(c),s=E.newGame(base,deck,{seed:'SCENES-BARRIER',mode:'local',deckCoverage:2,kalistel:false});
  deploy(E,s,0,formation(data.cards,base,'49902613',3));deploy(E,s,1,formation(data.cards,deck,c.id,c.role-1));E.start(s);
  E.lock(s,3,c.role-1);E.rollAttack(s,magical?6:5);E.rollDefense(s,die);
  assert.equal(s.duel.formula.barrier,magical?-E.rules.barrier:0);E.assertState(s);restore(E,s);
 }
});
test('45 complete ABBA matches with every new version deployed and intermediate saves',async()=>{
 const data=await dataPromise,E=createEngine(data),seen=new Set();
 for(const [i,c]of set.cards.entries()){
  const deck=deckFor(c),side=i%2,opponent=i%3?data.decks.player:base;
  let s=E.newGame(side?opponent:deck,side?deck:opponent,{seed:'SCENES-FULL-'+c.id,turnOrder:'ABBA',deckCoverage:2});
  deploy(E,s,side,formation(data.cards,deck,c.id,c.role-1));E.autoDeploy(s,1-side);E.start(s);
  for(let n=0;n<6000&&s.phase!=='over';n++){
   for(const p of s.players)for(const u of p.board.filter(Boolean))seen.add(u.cardId);
   step(E,s);E.assertState(s);if(n%23===0){restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}
  }
  assert.equal(s.phase,'over',c.key);assert(E.matchStats(s).complete);
 }
 for(const c of set.cards)assert(seen.has(c.id),c.key);
});
test('Base and scene variants cannot duplicate a character; equipment keeps character restrictions',async()=>{
 const data=await dataPromise,E=createEngine(data),Eq=require('../../site/equipment.js');
 const weapons=require('../../site/weapons.js').weapons;
 let checked=0;
 for(const c of set.cards){
  const p=E.byId[c.id],old=E.byId[c.baseId],duplicate=deckFor(c),slot=duplicate.findIndex(id=>id!==c.id);
  duplicate[slot]=c.baseId;
  assert(E.validateDeck(duplicate).some(m=>m.includes('toutes versions confondues')),c.key);
  for(const w of weapons){
   const ids=w.restrictions?.characterIds;
   if(ids?.includes(c.characterId)&&Eq.compatible(w,old)){
    const compatible=(!w.restrictions.families||w.restrictions.families.includes(c.weapon))&&
     (!w.restrictions.jobs||w.restrictions.jobs.includes(c.job))&&
     (!w.restrictions.races||w.restrictions.races.includes(c.race))&&
     (!w.restrictions.factions||w.restrictions.factions.includes(c.faction));
    assert.equal(Eq.compatible(w,p),compatible,w.id+' '+c.key);checked++;
   }
  }
 }
 assert(checked>0,'Character-bound weapons tested');
 assert(!Eq.compatible(weapons.find(w=>w.id==='brotherhood'),E.byId['49902813']));
});
