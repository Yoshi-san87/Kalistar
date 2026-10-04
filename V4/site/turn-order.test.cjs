'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Order=require('./turn-order.js'),{createEngine}=require('./engine.js'),Team=require('./team-composition.js');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const catalogue=buildCatalog();
async function fixture({numeric=false,lethal=false,legacy=false}={}){
  const data=structuredClone(await catalogue);
  if(numeric)for(const c of data.cards){c.atk=Array(6).fill(lethal?500:100);c.defense=Array(6).fill(lethal?0:900);}
  const E=createEngine(data),T=Team.create(E),team=T.normalize({name:'ABBA QA',cards:data.decks.player});
  team.captain=team.formation[0];team.equipment={momo:'little-joys-flute',balmhyr:'fallen-king-axe'};
  const s=E.newGame(team,team,{seed:'CAPTAINS-QA',mode:'local',kalistel:false,...(legacy?{}:{turnOrder:'ABBA'})});
  return {data,E,team,s};
}
function step(E,s){
  if(s.phase==='initiative')E.rollInitiative(s);
  else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
  else if(s.phase==='attack')E.rollAttack(s);
  else if(s.phase==='kalistel')E.acceptAttack(s);
  else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='result')E.next(s);
  else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
  else{
    const kinds={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'},kind=kinds[s.phase];
    E['grant'+kind](s,E['ai'+kind+'Choice'](s));
  }
}
function block(E,s){E.lock(s,0,0);E.rollAttack(s,6);E.rollDefense(s,6);assert.equal(s.phase,'result');E.next(s);while(s.phase==='replace')E.autoDeploy(s,s.replacing);E.assertState(s);}
test('D6 captains are stat-independent, ties reroll, combat RNG and match metrics stay untouched',async()=>{
  const {E,s}=await fixture(),rng=s.rng,players=structuredClone(s.players);
  assert.equal(s.phase,'initiative');assert.equal(s.round,1);assert.deepEqual(E.turnPreview(s),[]);
  assert.throws(()=>E.lock(s,0,0));E.assertState(s);assert.deepEqual(E.restoreGame(s),s);
  const before=structuredClone(s);assert.throws(()=>E.rollInitiative(s,[6,7]));assert.deepEqual(s,before);
  assert.deepEqual(E.rollInitiative(s,[3,3]),{dice:[3,3],first:null,attempt:1});assert.equal(s.phase,'initiative');
  assert.deepEqual(E.restoreGame(s),s);assert.equal(E.rollInitiative(s,[1,6]).first,1);
  assert.equal(s.phase,'choose');assert.equal(s.turn,1);assert.equal(s.rng,rng);assert.deepEqual(s.players,players);
  assert.equal(s.match.events.length,0);assert.equal(E.matchStats(s).exchanges,0);assert.deepEqual(s.kalistel,undefined);
  assert.throws(()=>E.rollInitiative(s));assert.deepEqual(E.restoreGame(s),s);
  assert(s.log.some(l=>l.text.includes('ABBA')));assert.equal(s.initiative.rolls.length,2);
});
for(const first of [0,1])test('ABBA tracks every resolved action and reload, opener '+first,async()=>{
  const {E,s}=await fixture({numeric:true});E.rollInitiative(s,first?[1,6]:[6,1]);
  const expected=[0,1,1,0,0,1,1,0,0,1,1,0].map(side=>side^first);
  for(let i=0;i<expected.length;i++){
    assert.equal(s.turn,expected[i]);assert.equal(E.turnPreview(s)[0].side,expected[i]);
    assert.deepEqual(E.turnPreview(s).map(x=>x.side),Array.from({length:5},(_,offset)=>Order.sideAt(s.initiative,s.round+offset)));
    block(E,s);assert.deepEqual(E.restoreGame(s),s);
  }
  assert.deepEqual(s.match.events.map(e=>Number(e.attacker[0])),expected);
});
test('two consecutive actions can kill twice; replacements do not advance the timeline',async()=>{
  const {E,s}=await fixture({numeric:true,lethal:true});E.rollInitiative(s,[6,1]);block(E,s);
  assert.equal(s.turn,1);assert.equal(s.round,2);
  E.lock(s,0,0);E.rollAttack(s,6);E.rollDefense(s,1);assert.equal(s.phase,'result');
  const source=s.duel.attacker;E.next(s);assert.equal(s.turn,1);assert.equal(s.round,3);assert.equal(s.phase,'replace');
  assert.equal(E.turnPreview(s)[0].resolved,false);
  E.autoDeploy(s,s.replacing);assert.equal(s.round,3);assert.equal(s.turn,1);
  E.lock(s,0,0);assert.equal(s.duel.attacker,source);E.rollAttack(s,6);E.rollDefense(s,1);
  assert.equal(s.players[0].dead.length,2);E.assertState(s);assert.deepEqual(E.restoreGame(s),s);
});
test('support can lead directly into an allied magic attack in the same double window',async()=>{
  const {E,s}=await fixture();E.rollInitiative(s,[6,1]);
  while(s.round===1)step(E,s);
  while(s.phase==='replace')step(E,s);
  const board=s.players[1].board;
  const source=board.findIndex(u=>E.card(u).atk.includes('mana'));
  const recipient=board.findIndex((u,i)=>i!==source&&E.card(u).magic.some(d=>typeof E.card(u).atk[6-d]==='number'));
  assert(source>=0&&recipient>=0);
  E.lock(s,source,0);E.rollAttack(s,6-E.card(board[source]).atk.indexOf('mana'));
  E.grantPotion(s,board[recipient].uid);assert.equal(board[recipient].mana,60);
  E.next(s);assert.equal(s.turn,1);assert.equal(s.round,3);
  E.lock(s,recipient,0);const die=E.card(board[recipient]).magic.find(d=>typeof E.card(board[recipient]).atk[6-d]==='number');
  E.rollAttack(s,die);assert.equal(s.duel.buff,60);assert.equal(board[recipient].mana,0);E.assertState(s);
});
test('unmarked historical games keep strict alternation and original state identity',async()=>{
  const {E,s}=await fixture({numeric:true,legacy:true});assert.equal(s.initiative,undefined);
  assert.equal(s.phase,'choose');const original=structuredClone(s);assert.deepEqual(E.restoreGame(s),original);
  for(let i=0;i<12;i++){assert.equal(s.turn,i%2);block(E,s);}
  const setup=E.newGame(E.data.decks.player,E.data.decks.enemy,{seed:'OLD'});E.autoDeploy(setup,0);E.autoDeploy(setup,1);E.start(setup);
  assert.equal(setup.phase,'choose');assert.equal(setup.initiative,undefined);E.assertState(setup);
});
test('corrupt initiative, turn, history and premature combat fail closed',async()=>{
  const {E,s}=await fixture();const corrupt=fn=>{const bad=structuredClone(s);fn(bad);assert.throws(()=>E.restoreGame(bad));};
  corrupt(x=>delete x.initiative);corrupt(x=>x.phase='choose');corrupt(x=>x.initiative.first=0);
  corrupt(x=>x.initiative.rolls=[[6,6],[0,1]]);corrupt(x=>x.initiative.rng=0);corrupt(x=>x.initiative.order='ABAB');
  E.rollInitiative(s,[6,1]);corrupt(x=>x.turn=1);corrupt(x=>x.initiative.first=1);
  corrupt(x=>x.initiative.rolls=[[6,1],[6,1]]);corrupt(x=>x.initiative.rolls=[]);
  assert.throws(()=>E.newGame(E.data.decks.player,E.data.decks.enemy,{turnOrder:'BOGUS'}));
});
test('seeded initiative has reproducible results and balanced faces and openers',()=>{
  const faces=[Array(6).fill(0),Array(6).fill(0)];let first=0;
  for(let i=0;i<20000;i++){
    const a=Order.create('RANDOM-CAPTAIN-'+i),b=Order.create('RANDOM-CAPTAIN-'+i);
    while(a.first===null){const r=Order.roll(a);assert.deepEqual(r,Order.roll(b));r.dice.forEach((die,side)=>faces[side][die-1]++);}
    first+=a.first===0;assert.deepEqual(a,b);
  }
  assert(Math.abs(first/20000-.5)<.025);
  for(const side of faces){const n=side.reduce((a,b)=>a+b,0);assert(side.every(k=>Math.abs(k/n-1/6)<.015));}
});
test('UI presets nominate their P1 captain explicitly without changing legacy migration or default equipment',async()=>{
  const {E,data}=await fixture(),T=Team.create(E,()=>({momo:'little-joys-flute'}));
  for(const value of [{name:'Adversaire',cards:data.decks.enemy},...(data.decks.presets||[])]){
    const before=structuredClone(value),team=T.fromPreset(value);
    assert.equal(team.captain,team.formation[0]);assert.deepEqual(team.equipment,{});
    assert.deepEqual(E.validateComposition(team),[]);assert.deepEqual(value,before);
    const s=E.newGame(team,team,{turnOrder:'ABBA'});E.assertState(s);
    assert.equal(E.captainUnit(s,1).cardId,team.captain);
    assert.equal(T.normalize(value).captain,null);
  }
});
test('250 complete ABBA matches validate every phase, equipment, archive and reload',async()=>{
  const {E,team}=await fixture();let enemyOpens=0;
  for(let i=0;i<250;i++){
    let s=E.newGame(team,team,{seed:'ABBA-FUZZ-'+i,mode:i%2?'ai':'local',turnOrder:'ABBA'});
    let steps=0;
    while(s.phase!=='over'&&steps<4000){
      step(E,s);E.assertState(s);steps++;
      if(steps%7===0)s=E.restoreGame(JSON.parse(JSON.stringify(s)));
    }
    assert.equal(s.phase,'over');assert(steps<4000);enemyOpens+=s.initiative.first===1;
    assert.deepEqual(E.restoreGame(s),s);assert.deepEqual(E.turnPreview(s),[]);
    const metrics=E.matchStats(s);assert.equal(metrics.exchanges,s.match.events.length);
    assert.equal(s.match.events.filter(e=>e.kill).length,s.players.reduce((n,p)=>n+p.dead.length,0));
  }
  assert(enemyOpens>80&&enemyOpens<170);
});
