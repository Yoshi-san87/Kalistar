'use strict';
const assert=require('node:assert/strict');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const {createEngine}=require('./engine.js');

async function main(){
  const data=await buildCatalog();
  function fixture(options={}){
    const d=structuredClone(data),id=d.decks.player[0],c=d.cards.find(c=>c.id===id);
    Object.assign(c,{role:5,positions:[1,2,3,4,5],canHeal:true,canGuard:true,element:'ELECTRO',atk:[240,180,120,90,60,20],magic:[6],...options.card});
    const e=createEngine(d),s=e.newGame(d.decks.player,d.decks.enemy,{seed:'ECLAT',mode:'local',kalistel:options.enabled});
    e.autoDeploy(s,0);e.autoDeploy(s,1);e.start(s);
    const slot=s.players[0].board.findIndex(u=>u?.cardId===id);e.lock(s,slot,0);
    return {e,s,a:s.players[0].board[slot],b:s.players[1].board[0]};
  }
  {
    const {e,s,a}=fixture();a.mana=60;a.physical=60;e.rollAttack(s,6);
    assert.equal(s.phase,'kalistel');assert.equal(a.mana,60);assert.equal(s.duel.buff,0);
    assert.deepEqual(e.restoreGame(s),s);assert.equal(e.kalistelRemaining(s,0),2);
    assert.throws(()=>e.rollDefense(s,6));assert.throws(()=>e.rollAttack(s,6));
    const unchanged=JSON.stringify(s);assert.throws(()=>e.useKalistel(s,7));assert.equal(JSON.stringify(s),unchanged);
    e.useKalistel(s,1);e.assertState(s);
    assert.equal(s.duel.attackValue,20,'worse second result must be kept');
    assert.equal(a.mana,60,'discarded magic never consumes potion');assert.equal(a.physical,0);assert.equal(s.duel.buff,60);
    assert.equal(e.kalistelRemaining(s,0),1);assert.equal(e.kalistelRemaining(s,1),2);
    assert.deepEqual(s.duel.attackRolls,[6,1]);assert.throws(()=>e.useKalistel(s,6));assert.throws(()=>e.acceptAttack(s));
    assert.deepEqual(e.restoreGame(s),s);
  }
  {
    const {e,s,a}=fixture();a.mana=60;e.rollAttack(s,6);e.acceptAttack(s);e.assertState(s);
    assert.equal(e.kalistelRemaining(s,0),2);assert.equal(s.duel.buff,60);assert.equal(a.mana,0);
  }
  {
    const {e,s,a}=fixture();a.physical=60;a.mana=60;e.rollAttack(s,1);e.useKalistel(s,6);
    assert.equal(a.physical,60);assert.equal(a.mana,0);assert.equal(s.duel.magic,true);e.assertState(s);
  }
  for(const effect of ['guard','retry','mana','buff_atk','revive','death']){
    const {e,s,a}=fixture({card:{atk:[effect,180,120,90,60,20],magic:[]}});
    e.rollAttack(s,6);assert.equal(s.phase,'kalistel');
    e.useKalistel(s,1);assert.equal(s.phase,'defense');assert.equal(s.match.events.length,0);
    assert.ok(!['ward','luck','reraise','mana','physical'].some(k=>a[k]));e.assertState(s);
    const f=fixture({card:{atk:[effect,180,120,90,60,20],magic:[]}});
    f.a.physical=60;f.a.mana=60;
    f.e.rollAttack(f.s,1);f.e.useKalistel(f.s,6);f.e.assertState(f.s);
    assert.equal(f.a.physical,60);assert.equal(f.a.mana,60,'special reroll preserves both attack buffs');
    if(effect!=='death'){
      const suffix={guard:'Guard',retry:'Clover',mana:'Potion',buff_atk:'Physical',revive:'Reraise'}[effect];
      f.e['grant'+suffix](f.s,f.a.uid);f.e.assertState(f.s);
      assert.equal(f.s.match.events.length,1);assert.equal(f.s.match.events[0].attackRolls,2);
    }
  }
  {
    const {e,s}=fixture({enabled:false});e.rollAttack(s,1);assert.equal(s.phase,'defense');
    assert.equal(e.kalistelRemaining(s,0),0);assert.deepEqual(e.restoreGame(s),s);assert.throws(()=>e.useKalistel(s));
  }
  {
    const {e,s}=fixture();e.rollAttack(s,1);
    for(const mutate of [v=>v.kalistel.spent.push({round:1,side:0}),v=>v.kalistel.spent=[{round:0,side:0}],v=>v.duel.buff=60,v=>v.duel.attackValue=999,v=>v.duel.defenseRolls=[1],v=>delete v.kalistel]){
      const v=e.clone(s);mutate(v);assert.throws(()=>e.restoreGame(v));
    }
    const before=JSON.stringify(s);assert.equal(e.aiUseKalistel(s),true);assert.equal(JSON.stringify(s),before,'AI does not advance RNG');
  }
  // Real catalogue, deterministic full games, every intermediate state restored.
  const e=createEngine(data);let spent=0;
  for(let i=0;i<8;i++){
    let s=e.newGame(data.decks.player,data.decks.enemy,{seed:'KALISTEL-'+i});
    e.autoDeploy(s,0);e.autoDeploy(s,1);e.start(s);
    for(let n=0;n<3000&&s.phase!=='over';n++){
      if(s.phase==='choose')e.lock(s,...e.aiChoice(s));
      else if(s.phase==='attack')e.rollAttack(s);
      else if(s.phase==='kalistel'){if(e.aiUseKalistel(s)){e.useKalistel(s);spent++;}else e.acceptAttack(s);}
      else if(s.phase==='defense')e.rollDefense(s);
      else if(s.phase==='result')e.next(s);
      else if(s.phase==='replace')e.autoDeploy(s,s.replacing);
      else{const suffix={guard:'Guard',heart:'Reraise',potion:'Potion',physical:'Physical',clover:'Clover'}[s.phase];e['grant'+suffix](s,e['ai'+suffix+'Choice'](s));}
      s=e.restoreGame(s);
    }
    assert.equal(s.phase,'over');assert.ok(s.kalistel.spent.length<=4);
    for(const side of [0,1])assert.ok(e.kalistelRemaining(s,side)>=0);
    assert.equal(new Set(s.match.events.map(v=>v.round)).size,s.match.events.length);
    for(const use of s.kalistel.spent)assert.equal(s.match.events.find(v=>v.round===use.round).attackRolls,2);
  }
  assert.ok(spent>0);console.log('PASS: Kalistel decisions, worse results, effects, charges, legacy saves, invalid imports, AI and 8 full matches ('+spent+' shards).');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
