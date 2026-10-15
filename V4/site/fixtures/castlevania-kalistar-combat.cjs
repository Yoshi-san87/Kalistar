'use strict';
const assert=require('node:assert/strict'),Q=require('../equipment.js'),{createEngine}=require('../engine.js');
const relicArchive=require('./relic-definitions-v4.6.42.json'),{freezeRelics}=require('./ff9-combat.cjs');
const all=p=>p.board.filter(Boolean).concat(p.reserve,p.dead);
function deck(E,required=[]){
  let seed=19733;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  for(let attempt=0;attempt<3000;attempt++){
    const chosen=[...new Set(required)].map(id=>E.byId[id]),used=new Set(chosen.map(c=>c.characterId));
    while(chosen.length<10){
      const c=E.data.cards[Math.floor(random()*E.data.cards.length)];
      if(used.has(c.characterId)||c.element==='RAINBOW'&&chosen.some(v=>v.element==='RAINBOW'))continue;
      chosen.push(c);used.add(c.characterId);
    }
    const ids=chosen.map(c=>c.id);if(!E.validatePlayableDeck(ids).length)return ids;
  }
  throw Error('No legal native test deck.');
}
function setup(data,w,side=0,cardId,{historicalRelics=false}={}){
  const E=createEngine(data),c=cardId?E.byId[cardId]:data.cards.find(c=>Q.compatible(w,c));assert(c);
  const ids=deck(E,[c.id,'49901503','49901505']),loadouts=[Q.emptyLoadout(),Q.emptyLoadout()];
  loadouts[side][w.slot][c.characterId]=w.id;
  const s=E.newGame(ids,ids,{mode:'local',seed:'CV-KAL-'+w.id+'-'+side,kalistel:false,equipment:loadouts});
  if(historicalRelics)freezeRelics(s);
  E.autoDeploy(s,0);E.autoDeploy(s,1);
  const place=(id,team,avoid=[])=>{
    const p=s.players[team],u=all(p).find(u=>u.cardId===id);assert(u,id);
    if(p.board.includes(u))return u;
    const position=E.card(u).positions.map(n=>n-1).find(n=>!avoid.includes(p.board[n]?.uid));assert.notEqual(position,undefined);
    E.recall(s,team,position);E.deploy(s,team,u.uid,position);return u;
  };
  const u=place(c.id,side),ally=place('49901505',side,[u.uid]);
  place('49901503',side,[u.uid,ally.uid]);
  const enemy=place('49901503',1-side),killer=place('49901505',1-side,[enemy.uid]);
  E.start(s);return {E,s,c,u,ally,enemy,killer,side,ids};
}
function lock(f,a,b){f.s.turn=Number(a.uid[0]);f.E.lock(f.s,f.s.players[f.s.turn].board.indexOf(a),f.s.players[1-f.s.turn].board.indexOf(b));}
function check(f){f.E.assertState(f.s);assert.deepEqual(f.E.restoreGame(JSON.parse(JSON.stringify(f.s))),f.s);}
function next(f){while(f.E.equipmentChoice(f.s))f.E.grantEquipment(f.s,f.E.aiEquipmentChoice(f.s));f.E.next(f.s);while(f.s.phase==='replace')f.E.autoDeploy(f.s,f.s.replacing);}
function activeFixture(data,w,side=0){
  // Historical native/visual regressions; current ultimates have dedicated expansion fixtures.
  if(w.slot==='relic'){w=relicArchive.weapons.find(item=>item.id===w.id);assert(w,'verified 4.6.42 relic');}
  const f=setup(data,w,side,undefined,{historicalRelics:true}),{E,s,u,enemy,ally,killer}=f,inactive=E.clone(s);let recipient=u,active;
  if(w.slot==='weapon'){
    lock(f,u,enemy);E.rollAttack(s,6);active=E.clone(s);E.rollDefense(s,6);
    assert.equal(s.duel.formula.equipmentWeapon,w.effect.value);
  }else if(w.slot==='shield'){
    lock(f,enemy,u);E.rollAttack(s,1);E.rollDefense(s,6);active=E.clone(s);
    assert.equal(s.duel.formula.equipmentProtection,w.effect.value);
  }else{
    if(w.effect.event==='SUPPORT'){
      const key=w.effect.when.supports[0],face={mana:'mana',reraise:'revive',ward:'guard'}[key],die=6-E.card(u).atk.indexOf(face);
      assert(die>=1&&die<=6,w.id+' reachable native support');lock(f,u,enemy);E.rollAttack(s,die);
      E[{mana:'grantPotion',reraise:'grantReraise',ward:'grantGuard'}[key]](s,ally.uid);recipient=ally;active=E.clone(s);next(f);
    }else if(['ALLY_FALL','ALLY_DEPLOY'].includes(w.effect.event)){
      const p=s.players[side],victim=p.board.find(v=>v&&v!==u&&v!==ally&&typeof E.card(v).defense[5]==='number'&&E.card(v).defense[5]<40);
      assert(victim,w.id+' native victim');const position=p.board.indexOf(victim);
      lock(f,killer,victim);E.rollAttack(s,6);E.rollDefense(s,1);assert(p.dead.includes(victim),w.id+' real elimination');
      if(w.effect.event==='ALLY_FALL'){active=E.clone(s);next(f);}
      else{
        E.next(s);assert.equal(s.phase,'replace');
        const replacement=p.reserve.find(v=>E.card(v).positions.includes(position+1)&&typeof E.card(v).defense[0]==='number');assert(replacement);
        E.deploy(s,side,replacement.uid,position);recipient=replacement;active=E.clone(s);
        while(s.phase==='replace')E.autoDeploy(s,s.replacing);
      }
    }else throw Error('Unexpected trigger '+w.effect.event);
    lock(f,enemy,recipient);E.rollAttack(s,1);E.rollDefense(s,6);
    assert.equal(s.duel.formula.equipmentDefense,w.effect.value,w.id);
    assert.equal(s.equipment.defensive.grants.find(g=>g.sourceUid===u.uid).status,'spent');
  }
  check(f);E.assertState(active);assert.deepEqual(E.restoreGame(active),active);
  assert(E.equipmentViews(active,all(active.players[side]).find(v=>v.uid===u.uid)).some(v=>v.weapon?.id===w.id&&v.active),w.id+' active overlay');
  const resolved=E.clone(s);assert(s.log.some(l=>l.text.includes(w.name)),w.id+' journal');
  if(w.slot==='relic'){next(f);lock(f,enemy,recipient);E.rollAttack(s,1);E.rollDefense(s,6);check(f);assert.equal(s.duel.formula.equipmentDefense,0,w.id+' single use');}
  return {id:w.id,slot:w.slot,side,uid:u.uid,inactive,state:active,resolved,expired:E.clone(s),recipient:recipient.uid};
}
module.exports={deck,setup,lock,check,next,activeFixture};
