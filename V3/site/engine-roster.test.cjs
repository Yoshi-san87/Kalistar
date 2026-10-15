'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createEngine}=require('./engine.js');
const bundled=process.argv.includes('--bundle');
let data;
if(bundled){
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'data.js'),'utf8'),context,{timeout:5000});
  data=JSON.parse(JSON.stringify(context.window.KALISTAR_DATA));
}else{
  const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'../donnees',name+'.json'),'utf8'));
  data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),arenas:read('arenes'),decks:read('decks_demo')};
}
const E=createEngine(data),decks=[data.decks.player,data.decks.enemy,...data.decks.presets.map(p=>p.cards)];
assert.equal(data.cards.length,41);assert.equal(data.arenas.length,16);
for(const deck of decks)assert.deepEqual(E.validateDeck(deck),[]);
const grants={guard:'grantGuard',heart:'grantReraise',clover:'grantClover',potion:'grantPotion',physical:'grantPhysical'};
const choices={guard:'aiGuardChoice',heart:'aiReraiseChoice',clover:'aiCloverChoice',potion:'aiPotionChoice',physical:'aiPhysicalChoice'};
let faces=0,campaigns=0;

for(const c of data.cards)for(let die=1;die<=6;die++){
  const deck=decks.find(ids=>ids.includes(c.id));assert(deck,'No preset exercises '+c.id);
  const s=E.newGame(deck,data.decks.enemy,{seed:'FACE-'+c.id+'-'+die});
  E.autoDeploy(s,0);E.autoDeploy(s,1);
  let slot=s.players[0].board.findIndex(u=>u.cardId===c.id);
  if(slot<0){
    slot=c.positions[0]-1;const u=s.players[0].reserve.find(u=>u.cardId===c.id);
    E.recall(s,0,slot);E.deploy(s,0,u.uid,slot);
  }
  E.start(s);E.lock(s,slot,0);E.rollAttack(s,die);E.assertState(s);
  const saved=E.restoreGame(s);
  for(const state of [s,saved]){
    if(grants[state.phase])E[grants[state.phase]](state,E[choices[state.phase]](state));
    else if(state.phase==='defense'){
      const defender=E.card(state.players[1].board[0]);
      E.rollDefense(state,6-defender.defense.findIndex(Number.isFinite));
    }
    E.assertState(state);assert.equal(state.phase,'result');
  }
  assert.deepEqual(saved,s);faces++;
}

for(const arena of data.arenas)for(let i=0;i<decks.length;i++){
  let s=E.newGame(decks[i],decks[(i+1)%decks.length],{arenaId:arena.id,seed:'ROSTER-'+arena.id+'-'+i});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);let steps=0;
  while(s.phase!=='over'&&steps++<10000){
    if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
    else if(s.phase==='attack')E.rollAttack(s);
    else if(s.phase==='defense')E.rollDefense(s);
    else if(grants[s.phase])E[grants[s.phase]](s,E[choices[s.phase]](s));
    else if(s.phase==='result')E.next(s);
    else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
    else assert.fail('Unexpected phase '+s.phase);
    s=E.restoreGame(JSON.parse(JSON.stringify(s)));
  }
  assert.equal(s.phase,'over');assert(s.round<=201);
  const stats=E.matchStats(s);assert.equal(stats.exchanges,s.log.filter(l=>l.type==='result').length);
  for(const side of [0,1])assert.equal(stats.teams[side].kills,s.players[1-side].dead.length);
  assert.deepEqual(E.matchStats(E.restoreGame(s)),stats);campaigns++;
}
console.log(`${bundled?'data.js bundle':'JSON roster'}: 41 cards, 16 arenas, ${faces} attack faces and ${campaigns} complete campaigns passed.`);
