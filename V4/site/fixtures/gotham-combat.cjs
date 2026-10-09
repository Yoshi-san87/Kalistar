'use strict';
const assert=require('node:assert/strict'),Q=require('../equipment.js'),{createEngine}=require('../engine.js');
const ids=Array.from({length:10},(_,i)=>String(49901501+i));
function setup(data,w,side=0){
  const E=createEngine(data),c=data.cards.find(c=>Q.compatible(w,c));assert(c,w.id);
  assert.deepEqual(E.validatePlayableDeck(ids),[]);
  const loadouts=[Q.emptyLoadout(),Q.emptyLoadout()];loadouts[side][w.slot][c.characterId]=w.id;
  const s=E.newGame(ids,ids,{mode:'local',seed:'GOTHAM-QA-'+w.id+'-'+side,kalistel:false,equipment:loadouts});
  E.autoDeploy(s,0);E.autoDeploy(s,1);
  const place=(character,team,avoid=[])=>{
    const p=s.players[team],u=p.board.filter(Boolean).concat(p.reserve).find(u=>E.card(u).characterId===character);assert(u,character);
    if(p.board.includes(u))return u;
    const position=E.card(u).positions.map(n=>n-1).find(n=>!avoid.includes(p.board[n]?.uid));assert.notEqual(position,undefined);
    E.recall(s,team,position);E.deploy(s,team,u.uid,position);return u;
  };
  const u=place(c.characterId,side),enemy=place('sphinx-batman',1-side);
  const ally=place('mr-freeze-batman',side,[u.uid]);
  E.start(s);
  return {E,s,c,u,enemy,ally,side};
}
function lock(f,a,b){f.s.turn=Number(a.uid[0]);f.E.lock(f.s,f.s.players[f.s.turn].board.indexOf(a),f.s.players[1-f.s.turn].board.indexOf(b));}
function check(f){f.E.assertState(f.s);assert.deepEqual(f.E.restoreGame(JSON.parse(JSON.stringify(f.s))),f.s);}
function next(f){while(f.E.equipmentChoice(f.s))f.E.grantEquipment(f.s,f.E.aiEquipmentChoice(f.s));f.E.next(f.s);while(f.s.phase==='replace')f.E.autoDeploy(f.s,f.s.replacing);}
function activeFixture(data,w,side=0){
  const f=setup(data,w,side),{E,s,u,enemy,ally}=f,inactive=E.clone(s);let recipient=u,active;
  if(w.slot==='weapon'){
    lock(f,u,enemy);E.rollAttack(s,6);active=E.clone(s);E.rollDefense(s,6);
    assert.equal(s.duel.formula.equipmentWeapon,w.effect.value);
  }else if(w.slot==='shield'){
    lock(f,enemy,u);E.rollAttack(s,1);E.rollDefense(s,6);active=E.clone(s);
    assert.equal(s.duel.formula.equipmentProtection,w.effect.value);assert(s.players[side].board.includes(u));
  }else{
    if(w.effect.event==='SUPPORT'){
      const key=w.effect.when.supports[0],face={physical:'buff_atk',mana:'mana',reraise:'revive',ward:'guard'}[key];
      const die=6-E.card(u).atk.indexOf(face);assert(die>=1&&die<=6,w.id+' native support');
      lock(f,u,enemy);E.rollAttack(s,die);
      E[{physical:'grantPhysical',mana:'grantPotion',reraise:'grantReraise',ward:'grantGuard'}[key]](s,ally.uid);recipient=ally;
      active=E.clone(s);next(f);
    }else if(w.effect.event==='ALLY_FALL'){
      // A real native numeric attack eliminates a low-DEF ally; no stats or charges are fabricated.
      const p=s.players[side],victim=p.board.find(v=>v&&v!==u&&v!==ally),attacker=s.players[1-side].board.find(v=>typeof E.card(v).atk[0]==='number');
      lock(f,attacker,victim);E.rollAttack(s,6);E.rollDefense(s,1);assert(p.dead.includes(victim));
      active=E.clone(s);next(f);
    }else assert.equal(w.effect.event,'DEFENSE');
    lock(f,enemy,recipient);E.rollAttack(s,1);
    if(!active)active=E.clone(s);E.rollDefense(s,6);
    assert.equal(s.duel.formula.equipmentDefense,w.effect.value,w.id);
    const grant=s.equipment.defensive.grants.find(g=>g.sourceUid===u.uid);assert.equal(grant.status,'spent');
  }
  check(f);E.assertState(active);assert.deepEqual(E.restoreGame(active),active);
  const activeUnit=active.players[side].board.find(v=>v?.uid===u.uid);
  assert(E.equipmentViews(active,activeUnit).some(v=>v.weapon?.id===w.id&&v.active),w.id+' visible active state');
  const resolved=E.clone(s);assert(s.log.some(l=>l.text.includes(w.name)),w.id+' journal');
  if(w.slot==='relic'){
    next(f);lock(f,enemy,recipient);E.rollAttack(s,1);E.rollDefense(s,6);check(f);
    assert.equal(s.duel.formula.equipmentDefense,0,w.id+' no second charge');
  }
  return {id:w.id,slot:w.slot,side,uid:u.uid,inactive,state:active,resolved,expired:E.clone(s),recipient:recipient.uid};
}
module.exports={ids,setup,lock,check,activeFixture};
