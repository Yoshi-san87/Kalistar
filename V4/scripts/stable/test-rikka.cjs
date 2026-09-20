const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../../..');
const card = JSON.parse(fs.readFileSync(path.join(root,'V4/template-stable/rikka/card.json'),'utf8'));
const {createEngine} = require(path.join(root,'V3/site/engine.js'));
const {numericData} = require(path.join(root,'V3/site/engine-fixtures.cjs'));
function fixture() {
  const data=numericData();
  // V3 intentionally rejects V4 IDs. Map only this in-memory test fixture.
  Object.assign(data.cards[1],structuredClone(card),{id:'30000002'});
  for (const c of data.cards) { c.element='ELECTRO'; c.weapon='Fouet'; c.faction=c.id; c.race=c.id; c.barriers=[]; }
  const e=createEngine(data),s=e.newGame(data.decks.player,data.decks.enemy,{seed:'RIKKA-V4'});
  e.autoDeploy(s,0);e.autoDeploy(s,1);e.start(s);
  const slot=s.players[0].board.findIndex(u=>u?.cardId==='30000002');
  assert.equal(slot,1);return {e,s,slot};
}
let checks=0;
for(let die=6;die>=1;die--){
  const {e,s,slot}=fixture();e.lock(s,slot,0);e.rollAttack(s,die);
  assert.equal(s.duel.attackValue,card.atk[6-die]);assert.equal(s.duel.magic,die===5);
  assert.equal(s.phase,'defense');e.rollDefense(s,6);e.assertState(s);checks++;
}
for(const magic of [false,true]){
  const {e,s,slot}=fixture();s.turn=1;
  e.card(s.players[1].board[0]).magic=magic?[6]:[];
  e.lock(s,0,slot);e.rollAttack(s,6);e.rollDefense(s,6);
  assert.equal(s.phase,'result');assert.equal(s.players[0].dead.length,0);
  assert.equal(s.duel.defenseValue,'dodge');e.assertState(s);checks++;
}
for(const nextDie of [6,5,2]){
  const {e,s,slot}=fixture();s.turn=1;e.lock(s,0,slot);e.rollAttack(s,6);e.rollDefense(s,1);
  assert.equal(s.phase,'defense');assert.equal(s.players[0].board[slot].luck,0);
  e.rollDefense(s,1);assert.equal(s.phase,'defense');e.rollDefense(s,nextDie);
  assert.equal(s.phase,'result');assert.deepEqual(s.duel.defenseRolls,[1,1,nextDie]);e.assertState(s);checks++;
}
console.log(`${checks} tests passed: six attacks, physical/magical dodge, defensive clover rerolls. No production data changed.`);
