'use strict';
const assert=require('node:assert/strict'),Q=require('../equipment.js');
const {setup,lock,check,next,activeFixture}=require('./castlevania-kalistar-combat.cjs');
function duel(f,a,b,atk=1,def=6){
  lock(f,a,b);f.E.rollAttack(f.s,atk);f.E.rollDefense(f.s,def);check(f);
  assert.equal(f.s.phase,'result');
}
function record(f){return f.s.equipment.rituals?.records?.[f.u.uid];}
function fixture(data,w,side=0){
  if(w.slot!=='relic')return activeFixture(data,w,side);
  const mask=w.id==='grivka-silent-breath';
  const f=setup(data,w,side,mask?'49902201':'49902405'),{E,s,u,enemy,killer}=f;
  const inactive=E.clone(s);
  // Equal numbers / a physical attack cannot prepare these two relics.
  duel(f,enemy,u);assert.equal(record(f),undefined);next(f);
  if(mask){
    // Reach real numerical inferiority by eliminating and replacing allies,
    // never by manufacturing a roster or an ultimate ledger.
    for(let guard=0;s.players[side].board.filter(Boolean).length===5;guard++){
      assert(guard<10,'native casualties must reach numerical inferiority');
      const victim=s.players[side].board.find(v=>v&&v!==u&&E.card(v).defense.some(n=>typeof n==='number'&&n<50));assert(victim);
      const faces=E.card(victim).defense,score=Math.min(...faces.filter(n=>typeof n==='number'));
      duel(f,killer,victim,6,6-faces.indexOf(score));
      assert(s.players[side].dead.includes(victim),'native definitive elimination');next(f);
    }
    duel(f,enemy,u);
  }else{
    duel(f,killer,u,3);assert.equal(s.duel.magic,true);
  }
  assert.equal(record(f).status,'ready');check(f);
  const awakened=E.clone(s);next(f);
  const state=E.clone(s);
  if(mask)duel(f,enemy,u,1,5);
  else{
    // A physical attack does not spend a charge reserved for magic.
    duel(f,u,enemy,1);assert.equal(s.duel.magic,false);
    assert.equal(s.duel.formula.ultimateAttack||0,0);assert.equal(record(f).status,'ready');next(f);
    duel(f,u,enemy,3);assert.equal(s.duel.magic,true);
  }
  assert.equal(s.duel.formula[mask?'ultimateDefense':'ultimateAttack'],40);
  assert.equal(record(f).status,'spent');assert(s.log.some(row=>row.text.includes(w.name)));
  const resolved=E.clone(s);next(f);
  const expired=E.clone(s);
  if(mask)duel(f,enemy,u,1,5);else duel(f,u,enemy,3);
  assert.equal(s.duel.formula[mask?'ultimateDefense':'ultimateAttack']||0,0,'one use only');
  assert.equal(record(f).status,'spent');check(f);
  return {id:w.id,slot:w.slot,side,uid:u.uid,inactive,state,awakened,resolved,expired,recipient:u.uid};
}
module.exports={fixture,duel,record};
