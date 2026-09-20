'use strict';
const assert=require('node:assert/strict');
const {createEngine}=require('./engine.js');
const {numericData}=require('./engine-fixtures.cjs');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function fixture(){
  const data=numericData(),E=createEngine(data),s=E.newGame(data.decks.player,data.decks.enemy,{mode:'local',seed:'BUFFS'});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  const a=s.players[0].board[2],b=s.players[1].board[0];
  return {E,s,a,b,ac:E.card(a),bc:E.card(b)};
}
const all={ward:60,luck:1,reraise:1,mana:60,physical:60};
function attack(f){f.E.lock(f.s,2,0);f.E.rollAttack(f.s,6);}

test('All five categories serialize without normalization and reject duplicate charges',()=>{
  const f=fixture();Object.assign(f.b,all);
  assert.deepEqual(f.E.traits(f.b),['ward','luck','reraise','mana','physical']);
  assert.deepEqual(f.E.restoreGame(JSON.parse(JSON.stringify(f.s))),f.s);
  for(const key of Object.keys(all)){
    const invalid=structuredClone(f.s);invalid.players[1].board[0][key]*=2;
    assert.throws(()=>f.E.restoreGame(invalid));
  }
});
test('Ward resolves before clover, and sufficient shielded defense preserves both lives',()=>{
  const f=fixture();Object.assign(f.b,all);f.ac.atk[0]=160;attack(f);f.E.rollDefense(f.s,6);
  assert.equal(f.s.phase,'result');assert.equal(f.s.duel.formula.defense,160);
  assert.deepEqual(f.E.traits(f.b),['luck','reraise','mana','physical']);
  assert.equal(f.s.duel.luckUsed,undefined);assert.equal(f.s.duel.reraised,undefined);f.E.assertState(f.s);
});
test('Ward then clover then Reraise resolve once, including a save between defensive rolls',()=>{
  const f=fixture();Object.assign(f.b,all);f.ac.atk[0]=200;attack(f);f.E.rollDefense(f.s,6);
  assert.equal(f.s.phase,'defense');assert.equal(f.b.ward,0);assert.equal(f.b.luck,0);assert.equal(f.b.reraise,1);
  assert.equal(f.s.duel.failedDefense.defense,160);assert.equal(f.s.match.events.length,0);
  const saved=f.E.restoreGame(JSON.parse(JSON.stringify(f.s)));
  f.E.rollDefense(f.s,5);f.E.rollDefense(saved,5);assert.deepEqual(saved,f.s);
  assert.equal(f.b.reraise,0);assert.equal(f.s.players[1].board[0],f.b);assert.equal(f.s.players[1].dead.length,0);
  assert.deepEqual(f.E.traits(f.b),['mana','physical']);assert.equal(f.s.duel.formula.ward,60);
  const stats=f.E.matchStats(f.s),defender=stats.units.find(u=>u.uid===f.b.uid);
  assert.equal(stats.exchanges,1);assert.equal(defender.ward,60);assert.equal(defender.luckUsed,1);
  assert.equal(defender.reraises,1);assert.equal(defender.defense,160);assert.equal(defender.deaths,0);
});
test('Successful clover reroll preserves Reraise and offensive buffs',()=>{
  const f=fixture();Object.assign(f.b,all);f.ac.atk[0]=200;f.bc.defense[1]=180;attack(f);f.E.rollDefense(f.s,6);f.E.rollDefense(f.s,5);
  assert.equal(f.s.duel.formula.defense,240);assert.equal(f.b.reraise,1);assert.equal(f.b.mana,60);assert.equal(f.b.physical,60);
  assert.equal(f.s.duel.reraised,undefined);f.E.assertState(f.s);
});
test('Magic bypasses ward; clover and Reraise still resolve in order',()=>{
  const f=fixture();Object.assign(f.b,all);f.ac.atk[0]=200;f.ac.magic=[6];attack(f);f.E.rollDefense(f.s,6);f.E.rollDefense(f.s,5);
  assert.equal(f.b.ward,60);assert.equal(f.b.luck,0);assert.equal(f.b.reraise,0);assert.equal(f.s.duel.formula.ward,0);f.E.assertState(f.s);
});
test('Mort consumes only Reraise; dodge preserves every defensive category',()=>{
  for(const dodge of [false,true]){
    const f=fixture();Object.assign(f.b,all);f.ac.atk[0]='death';if(dodge)f.bc.defense[0]='dodge';
    attack(f);f.E.rollDefense(f.s,6);
    for(const [key,value]of Object.entries(all))assert.equal(f.b[key],key==='reraise'&&!dodge?0:value);
    assert.equal(f.s.players[1].dead.length,0);f.E.assertState(f.s);
  }
});
test('Physical support allows either side, self or ally, preserves all categories and counts its recipient',()=>{
  for(const side of [0,1])for(const self of [false,true]){
    const f=fixture(),caster=f.s.players[side].board[2],ally=self?caster:f.s.players[side].board[0];
    Object.assign(ally,all,{physical:0});f.E.card(caster).atk[0]='buff_atk';f.s.turn=side;
    f.E.lock(f.s,2,0);f.E.rollAttack(f.s,6);
    assert.equal(f.s.phase,'physical');assert.equal(ally.physical,0);assert.deepEqual(f.s.duel.defenseRolls,[]);
    const saved=f.E.restoreGame(f.s),rng=f.s.rng;
    f.E.grantPhysical(f.s,ally.uid);f.E.grantPhysical(saved,ally.uid);assert.deepEqual(saved,f.s);
    assert.equal(f.s.rng,rng);for(const [key,value]of Object.entries(all))assert.equal(ally[key],value);
    assert.equal(f.s.duel.physicalGranted,ally.uid);
    const stat=f.E.matchStats(f.s).units.find(u=>u.uid===caster.uid);
    assert.equal(stat.support,1);assert.equal(stat.physical,1);assert.equal(stat.alliedSupport,self?0:1);
    f.E.assertState(f.s);
  }
});
test('Invalid physical recipients, phases and malformed imports fail atomically',()=>{
  const f=fixture();f.ac.atk[0]='buff_atk';attack(f);
  for(const uid of [f.b.uid,f.s.players[0].reserve[0].uid,null,'0-99']){
    const before=structuredClone(f.s);assert.throws(()=>f.E.grantPhysical(f.s,uid));assert.deepEqual(f.s,before);
  }
  for(const mutate of [s=>s.duel.physicalGranted=f.a.uid,s=>s.duel.attackValue='mana',s=>s.duel.defenseRolls=[6],s=>s.duel.buff=60,s=>s.duel.attackRolls=[]]){
    const bad=structuredClone(f.s);mutate(bad);assert.throws(()=>f.E.restoreGame(bad));
  }
  f.E.grantPhysical(f.s,f.a.uid);const before=structuredClone(f.s);assert.throws(()=>f.E.grantPhysical(f.s,f.a.uid));assert.deepEqual(f.s,before);
});
test('Physical and magic tokens consume only the matching type while other categories survive',()=>{
  for(const magic of [false,true]){
    const f=fixture();Object.assign(f.a,all);f.ac.magic=magic?[6]:[];f.bc.defense[0]='dodge';attack(f);f.E.rollDefense(f.s,6);
    for(const [key,value]of Object.entries(all))assert.equal(f.a[key],key===(magic?'mana':'physical')?0:value);
    assert.equal(f.s.duel.buff,60);f.E.assertState(f.s);
  }
});
test('Physical support AI avoids duplicate power but ignores other active categories',()=>{
  const f=fixture(),p=f.s.players[0];p.board.forEach(u=>Object.assign(u,all));p.board[3].physical=0;
  const before=structuredClone(f.s);assert.equal(f.E.aiPhysicalChoice(f.s),p.board[3].uid);assert.deepEqual(f.s,before);
});
test('Historical resolved physical self buffs restore without a second grant',()=>{
  const f=fixture();f.ac.atk[0]='buff_atk';attack(f);f.E.grantPhysical(f.s,f.a.uid);
  delete f.s.duel.physicalGranted;delete f.s.lastDuel.physicalGranted;
  const restored=f.E.restoreGame(f.s);assert.deepEqual(restored,f.s);assert.equal(restored.players[0].board[2].physical,60);
});
console.log(count+' stacked-buff contract tests passed.');
