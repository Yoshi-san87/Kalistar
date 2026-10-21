'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const plan=require('./plan.json'),before=require('./before.json'),catalogue=require('../../donnees/catalogue.json');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const {formation,deckFor}=require('../../expansions/2026-10-15-collab-scenes-45/fixtures.cjs');
const {previousEntry,previousCatalogue}=require('./compatibility.cjs');
const dataPromise=buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
const support={guard:['grantGuard','aiGuardChoice','ward',60],retry:['grantClover','aiCloverChoice','luck',1],buff_atk:['grantPhysical','aiPhysicalChoice','physical',60]};
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
async function fixture(spec,side=0,override){
 const data=structuredClone(await dataPromise);if(override)override(data);
 const E=createEngine(data),p=E.byId[spec.id],ids=deckFor(p);
 const s=E.newGame(ids,ids,{seed:'CRYSTAL-'+spec.key,mode:'local',kalistel:false,deckCoverage:2});
 const slots=formation(data.cards,ids,p.id,p.role-1);
 for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===slots[slot]).uid,slot);
 E.autoDeploy(s,1-side);E.start(s);return {data,E,s,p,slot:p.role-1,u:s.players[side].board[p.role-1]};
}
test('Exactly eleven scoped affinities; Koby and every other entry are unchanged',async()=>{
 const data=await dataPromise,C=require('../../site/collaborations.js');
 assert.equal(plan.cards.length,11);assert.equal(new Set(plan.cards.map(c=>c.id)).size,11);
 assert.deepEqual(data.cards.filter(c=>C.of(c)&&c.element==='NONE').map(c=>c.id),[plan.exception.id]);
 assert.equal(data.cards.length,462);
 for(const prior of before.entries){
  const actual=catalogue.cards.find(c=>c.id===prior.id);assert.deepEqual(previousEntry(actual),prior);
  assert.deepEqual(actual.profile.magic,[]);assert.deepEqual(actual.profile.barriers,[]);
  for(const mutate of [e=>e.profile.atk[0]++,e=>e.profile.sentry=!e.profile.sentry,e=>e.profile.element='RAINBOW',e=>e.profile.characterId='wrong',e=>e.nativeRevision.changedFields.push('atk')]){
   const bad=structuredClone(actual);mutate(bad);assert.throws(()=>previousEntry(bad));
  }
 }
 assert.deepEqual(catalogue.cards.filter(c=>!plan.cards.some(s=>s.id===c.id)),before.otherEntries);
 assert.equal(previousEntry(catalogue.cards.find(c=>c.id===plan.exception.id)).profile.element,'NONE');
});
test('Every affinity follows the existing cycle, neutral matchup and arena bonus',async()=>{
 const data=await dataPromise,E=createEngine(data);
 for(const spec of plan.cards){
  const p=E.byId[spec.id],element=data.elements[p.element];
  for(const [other,expected]of [[element.strong_against,30],[element.weak_against,-30],[p.element,0],['NONE',20],['RAINBOW',-40]]){
   assert.equal(E.elementModifier(p,{...p,element:other}),expected,spec.key+' versus '+other);
  }
  const arena=data.arenas.find(a=>a.element===p.element);assert(arena);
  const ids=deckFor(p),s=E.newGame(ids,ids,{seed:'ARENA-'+spec.key,arenaId:arena.id,deckCoverage:2});
  const u=s.players[0].reserve.find(u=>u.cardId===p.id);
  assert.equal(E.arenaBonuses(s,u).element,arena.elementBonus);
 }
});
test('66 ATK faces keep their numbers, death or support; actual elemental score is journaled',async()=>{
 for(const spec of plan.cards)for(let die=1;die<=6;die++){
  const {E,s,p,slot,u,data}=await fixture(spec);E.lock(s,slot,0);E.rollAttack(s,die);restore(E,s);
  assert.equal(s.duel.attackValue,p.atk[6-die]);assert.equal(s.duel.magic,false);
  const value=p.atk[6-die];
  if(typeof value==='number'){
   const defender=E.card(s.players[1].board[0]);E.rollDefense(s,6);
   const f=s.duel.formula;assert.equal(f.baseAttack,value);assert.equal(f.element,E.elementModifier(p,defender));assert.equal(f.barrier,0);
   assert.equal(f.attack,Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier+f.arenaAttack+(f.captainAttack||0)+(f.equipmentAttack||0)));
   assert.equal(s.match.events.at(-1).attack,f.attack);
  }else if(value==='death'){E.rollDefense(s,6);assert.equal(s.match.events.at(-1).kill,true);}
  else{const [grant,,field,amount]=support[value];E[grant](s,u.uid);assert.equal(u[field],amount);}
  assert.equal(s.phase,'result');E.assertState(s);restore(E,s);
 }
});
test('66 DEF faces preserve numeric defense, dodge and absence of barriers',async()=>{
 for(const spec of plan.cards)for(let die=1;die<=6;die++){
  const {E,s,p,slot}=await fixture(spec,1);E.lock(s,0,slot);E.rollAttack(s,6);E.rollDefense(s,die);
  const value=p.defense[6-die];assert.equal(s.duel.defenseValue,value);
  if(value==='dodge')assert.equal(s.match.events.at(-1).dodge,true);
  else{assert.equal(s.duel.formula.baseDefense,value);assert.equal(s.duel.formula.barrier,0);}
  E.assertState(s);restore(E,s);
 }
});
test('Eleven complete ABBA matches with restoration',async()=>{
 const data=await dataPromise,E=createEngine(data);
 for(const spec of plan.cards){
  const p=E.byId[spec.id],ids=deckFor(p),slots=formation(data.cards,ids,p.id,p.role-1);
  let s=E.newGame(ids,ids,{seed:'CRYSTAL-FULL-'+spec.key,turnOrder:'ABBA',deckCoverage:2});
  for(let side=0;side<2;side++)for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===slots[slot]).uid,slot);
  E.start(s);
  for(let n=0;n<5000&&s.phase!=='over';n++){
   if(s.phase==='initiative')E.rollInitiative(s);
   else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
   else if(s.phase==='attack')E.rollAttack(s);
   else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
   else if(s.phase==='defense')E.rollDefense(s);
   else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
   else if(s.phase==='result')E.next(s);
   else{
    const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
    const [grant,choose]=actions[s.phase];E[grant](s,E[choose](s));
   }
   E.assertState(s);if(n%13===0){restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}
  }
  assert.equal(s.phase,'over');assert(E.matchStats(s).complete);restore(E,s);
 }
});
test('Historical no-crystal catalogue and match snapshots retain NONE on restore',async()=>{
 const historical=await buildCatalog({published:previousCatalogue(catalogue).cards.filter(c=>c.kind==='created')}),E=createEngine(historical);
 for(const spec of plan.cards){
  assert.equal(E.byId[spec.id].element,'NONE');const ids=deckFor(E.byId[spec.id]);
  const s=E.newGame(ids,ids,{seed:'OLD-'+spec.key,mode:'local',kalistel:false,deckCoverage:2});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  E.lock(s,0,0);E.rollAttack(s,6);const snapshot=JSON.stringify({data:historical,state:s});
  const loaded=JSON.parse(snapshot),restoredEngine=createEngine(loaded.data);restore(restoredEngine,loaded.state);
  assert.equal(restoredEngine.byId[spec.id].element,'NONE');assert.equal(JSON.stringify(loaded),snapshot);
 }
});
