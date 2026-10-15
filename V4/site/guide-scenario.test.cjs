'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const Guide=require('./guide-scenario.js');
const pending=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
async function run(id,inspect=()=>{}){
  const data=await pending,before=JSON.stringify(data),Q=Guide.create(data),l=Q.lesson(id);
  Q.E.assertState(l.state);
  for(const op of l.ops){Q.perform(l.state,op);inspect(l.state,op,Q);assert.deepEqual(Q.E.restoreGame(l.state),l.state);}
  assert.equal(JSON.stringify(data),before,'tutorial must not alter native profiles');return {Q,l};
}
for(const c of Guide.chapters)test('scripted real-card lesson: '+c.id,async()=>{await run(c.id);});
test('complete compositions, real printed profiles and immutable snapshots',async()=>{
  const Q=Guide.create(await pending),a=Q.lesson('formation').state,b=Q.lesson('formation').state;
  for(const team of a.composition.teams)assert.deepEqual(Q.E.validateComposition(team),[]);
  assert.notEqual(a.matchId,b.matchId);a.players[0].board[0].luck=1;assert.equal(b.players[0].board[0].luck,0);
  assert.throws(()=>Q.lesson('unknown'));
});
test('initiative ties reroll both captains; actions follow ABBA',async()=>{
  const {Q,l}=await run('formation');assert.deepEqual(l.state.initiative.rolls,[[3,3],[5,2]]);
  assert.deepEqual(Q.E.turnPreview(l.state,8).map(t=>t.side),[0,1,1,0,0,1,1,0]);
});
test('each important demonstration actually produces its advertised effect',async()=>{
  let axe=false,shield=false;
  await run('equipment',(s,op)=>{if(op.method==='rollDefense'){axe ||= s.duel.formula.equipmentWeapon===30;shield ||= s.duel.formula.equipmentProtection===30;}});
  assert(axe&&shield);
  const block=await run('block');assert(block.l.state.duel.formula.attack<=block.l.state.duel.formula.defense);
  const kill=await run('kill');assert.equal(kill.l.state.players[1].dead.length,1);assert.equal(kill.l.state.players[1].board[1].cardId,'30000004');
  const kalistel=await run('kalistel');assert.deepEqual(kalistel.l.state.duel.attackRolls,[6,1]);assert.equal(kalistel.l.state.kalistel.spent.length,1);
  const magic=await run('magic');assert.equal(magic.l.state.duel.formula.barrier,-30);
  const guard=await run('guard');assert.equal(guard.l.state.duel.formula.ward,60);assert.equal(guard.l.state.players[0].board[1].ward,0);
  const clover=await run('clover');assert.deepEqual(clover.l.state.duel.defenseRolls,[1,6]);assert(clover.l.state.duel.luckUsed);assert.equal(clover.l.state.players[0].board[1].luck,0);
  for(const id of ['mana','physical']){const {l}=await run(id);assert.equal(l.state.duel.formula.buff,60);}
  const heart=await run('heart');assert(heart.l.state.duel.reraised);assert.equal(heart.l.state.players[0].dead.length,0);assert.equal(heart.l.state.match.events.at(-1).kill,false);
  const captain=await run('captain');assert.equal(captain.l.state.duel.formula.captainAttack,10);
  const arena=await run('arena');assert.equal(arena.l.state.duel.formula.arenaAttack,25);
});
test('ultimate teaching uses real gifts, explicit choice and targeted riposte',async()=>{
  const momo=await run('momo');assert.equal(momo.l.state.players[0].board.filter(Boolean).length,4);
  assert.equal(momo.l.state.players[0].board[2].luck,0);
  assert(momo.l.state.players[0].board.filter((u,i)=>u&&i!==2).every(u=>u.luck===1));
  assert.equal(momo.l.state.match.events.at(-1).relicGrants.length,3);
  const aeris=await run('materia');assert.equal(aeris.l.state.players[0].board[4],null);assert.equal(aeris.l.state.players[0].board[1].reraise,1);assert.equal(aeris.Q.E.equipmentChoice(aeris.l.state),null);
  const pod=await run('pod');assert.equal(pod.l.state.duel.formula.equipmentAttack,60);assert.equal(pod.l.state.match.events.at(-1).relicStrike.weaponId,'pod-042');
});
test('the final result is a real bounded engine ending, not a fabricated ceremony',async()=>{
  const {Q,l}=await run('finale');assert.equal(l.state.phase,'over');assert(l.state.round<=201);assert(Q.E.matchStats(l.state).units.some(u=>u.kills>0));
  assert.equal(l.state.match.events.length,l.state.round-1);
});
