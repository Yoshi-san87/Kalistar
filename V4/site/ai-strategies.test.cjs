'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const AI=require('./ai-strategies.js'),{createEngine}=require('./engine.js');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const F=require('./fixtures/ultimate-expansion.cjs');
const fixtures=require('./fixtures/ai-native.json');
const data=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
async function native(index=0,id='soren'){
  const E=createEngine(await data),f=fixtures[index],T=require('./team-composition.js').create(E);
  const before=JSON.stringify(f),teams=f.teams.map(team=>T.normalize(team));
  assert.equal(JSON.stringify(f),before,'historical preset fixture stays unchanged');
  const s=E.newGame(...teams,{seed:f.seed,arenaId:f.arenaId,turnOrder:'ABBA',aiProfiles:[id,id]});
  while(s.phase==='initiative')E.rollInitiative(s);return {E,s};
}
test('five distinct frozen policies; valid snapshots and legacy games keep their policy',async()=>{
  assert.equal(AI.profiles.length,5);assert.equal(new Set(AI.profiles.map(p=>p.name)).size,5);
  const {E,s}=await native();assert.deepEqual(E.restoreGame(s).ai,s.ai);
  for(const bad of [null,{version:2,profiles:['soren',null]},{version:1,profiles:['unknown',null]},{version:1,profiles:[null,null]},{version:1,profiles:['soren']}])assert.throws(()=>E.restoreGame({...s,ai:bad}),/IA/);
  const old=E.clone(s);delete old.ai;assert.equal(E.restoreGame(old).ai,undefined);assert.equal(AI.name(old),'Le Veilleur');
  assert.equal(AI.name({...s,mode:'local'}),'Joueur 2');
});
test('decisions use public faces, not future RNG or hidden reserve identities, and never mutate state',async()=>{
  const {E,s}=await native(1,'lyra'),before=JSON.stringify(s),expected=E.aiChoice(s);
  assert.equal(JSON.stringify(s),before);
  const other=E.clone(s);other.rng=987654321;other.seed='unknown';
  other.players[1-other.turn].reserve.forEach(u=>{u.cardId='hidden';});
  assert.deepEqual(E.aiChoice(other),expected);assert.equal(JSON.stringify(s),before);
});
test('styles make different useful choices on the same native boards',async()=>{
  let different=0;const seen=new Map(AI.profiles.map(p=>[p.id,[]]));
  for(let i=0;i<20;i++){
    const {E,s}=await native(i),choices=[];
    for(const p of AI.profiles){s.ai.profiles[s.turn]=p.id;const pair=E.aiChoice(s);assert(s.players[s.turn].board[pair[0]]&&s.players[1-s.turn].board[pair[1]]);choices.push(pair.join(','));seen.get(p.id).push(pair.join(','));}
    if(new Set(choices).size>1)different++;
  }
  assert(different>=2,'several real boards must lead to stylistic differences');
  assert.equal(new Set([...seen.values()].map(v=>v.join(';'))).size,5,'policies must not be cosmetic aliases');
});
test('cooperative browser planning agrees with synchronous planning and can be cancelled',async()=>{
  const {E,s}=await native();let ticks=0;
  const timer=setInterval(()=>ticks++,0);
  try{assert.deepEqual(await E.aiChoiceAsync(s),E.aiChoice(s));assert(ticks>=10);}
  finally{clearInterval(timer);}
  let checks=0;assert.equal(await E.aiChoiceAsync(s,{cancelled:()=>++checks>2}),null);
});
test('all profiles prefer a guaranteed elimination to a futile numeric attack',async()=>{
  const f=await F.fixture('current-compass',{mutate:(data,cards)=>{
    data.cards.forEach(c=>{c.atk=[0,0,0,0,0,0];c.defense=[100,100,100,100,100,100];});
    cards[1].atk=[200,200,200,200,200,200];
  }});
  for(const p of AI.profiles){f.s.ai={version:1,profiles:[p.id,p.id]};assert.equal(f.E.aiChoice(f.s)[0],1);}
});
test('support goes to a usable unbuffed ally and progresses distinct-recipient ultimates',async()=>{
  const f=await F.fixture('ff9-garnet-pendant',{supports:['mana'],mutate:(data,cards)=>{cards[2].magic=[1,2,3,4,5,6];cards[3].magic=[1,2,3,4,5,6];}});
  f.s.ai={version:1,profiles:['lyra','lyra']};
  F.lock(f,f.u,f.enemy);F.attack(f,1);
  const first=f.E.aiPotionChoice(f.s);assert.notEqual(first,f.u);F.step(f,'grantPotion',first);F.next(f);
  F.lock(f,f.u,f.enemy);F.attack(f,1);
  const second=f.E.aiPotionChoice(f.s);assert.notEqual(first,second);assert.notEqual(second,f.u);F.step(f,'grantPotion',second);
  assert(f.E.equipmentChoice(f.s));F.settleChoices(f);assert.equal(F.grants(f).length,2);
});
test('a defender chooses their relic independently of whose turn it is',async()=>{
  const f=await F.fixture('gotham-riddle-box',{side:1,supports:['luck'],mutate:(_d,c)=>{c[4].atk=[1,'retry',1,'retry',1,'retry'];}});
  f.s.ai={version:1,profiles:[null,'nox']};F.support(f,f.u,f.ally,'luck');F.next(f);F.lock(f,f.enemy,f.u);
  assert.equal(f.s.turn,0);assert.equal(f.E.aiEquipmentChoice(f.s),'even');F.choose(f,'even');
  F.attack(f,6);F.step(f,'rollDefense',6);F.reload(f);
});
test('real mitigation, ready ripostes and clover rerolls enter evaluation without spending charges',async()=>{
  for(const id of ['current-compass','lunar-tear','gotham-harvey-coin','jill-lockpicks']){
    const f=await F.fixture(id);f.s.ai={version:1,profiles:['soren','soren']};F.outnumber(f);
    const before=JSON.stringify(f.s),rank=AI.create(f.E).rank(f.s);
    assert(rank.every(r=>Number.isFinite(r.score)&&r.kills>=0&&r.kills<=1.000001));assert.equal(JSON.stringify(f.s),before);F.reload(f);
  }
});
test('Kalistel preserves a winning die and may reject a losing die without peeking',async()=>{
  const f=await F.fixture('current-compass',{kalistel:true,mutate:(data,c)=>{
    data.cards.forEach(c=>{c.atk=[200,200,200,200,200,0];c.defense=[100,100,100,100,100,100];});
  }});f.s.ai={version:1,profiles:['soren','soren']};F.lock(f,f.u,f.enemy);F.step(f,'rollAttack',6);
  assert.equal(f.E.aiUseKalistel(f.s),false);
  const low=f.E.clone(f.s);low.duel.attackDie=1;low.duel.attackValue=0;low.duel.attackRolls=[1];
  const before=JSON.stringify(low);assert.equal(f.E.aiUseKalistel(low),true);assert.equal(JSON.stringify(low),before);
});
