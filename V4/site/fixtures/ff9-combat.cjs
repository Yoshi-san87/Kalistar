'use strict';
const assert=require('node:assert/strict'),Q=require('../equipment.js'),{createEngine}=require('../engine.js');
function advance(E,s){
  if(E.equipmentChoice(s))return E.grantEquipment(s,E.aiEquipmentChoice(s));
  if(s.phase==='choose')return E.lock(s,...E.aiChoice(s));
  if(s.phase==='attack')return E.rollAttack(s);
  if(s.phase==='kalistel')return E.acceptAttack(s);
  if(s.phase==='defense')return E.rollDefense(s);
  if(s.phase==='replace')return E.autoDeploy(s,s.replacing);
  if(s.phase==='result')return E.next(s);
  const [grant,choose]={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']}[s.phase];
  return E[grant](s,E[choose](s));
}
// Native faces and actual engine actions; only team-state conditions are staged.
function activeFixture(data,w,side=0){
  const E=createEngine(data),c=data.cards.find(c=>Q.compatible(w,c)),base=data.decks.player;
  const decks=base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).filter(ids=>!E.validatePlayableDeck(ids).length),deck=w.effect.event==='DEPLOY'?decks.at(-1):decks[0];assert(deck,w.id);
  for(let seed=0;seed<80;seed++){
    const loadout={[c.characterId]:w.id},s=E.newGame(deck,deck,{mode:'local',seed:'FF9-VISUAL-QA-'+seed,kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
    const uid=s.players[side].reserve.find(u=>u.cardId===c.id).uid;
    E.autoDeploy(s,0);E.autoDeploy(s,1);
    if(w.effect.event!=='DEPLOY'&&!s.players[side].board.some(u=>u?.uid===uid)){E.recall(s,side,c.positions[0]-1);E.deploy(s,side,uid,c.positions[0]-1);}E.start(s);
    const inactive=E.clone(s);
    const p=s.players[side],when=w.effect.when||{},keep=w.effect.trigger==='LAST_STANDING'?1:when.activeAtMost||4;let count=1;
    if(w.effect.trigger==='LAST_STANDING'||when.activeAtMost||when.outnumbered)p.board=p.board.map(u=>{if(!u||u.uid===uid||count++<keep)return u;p.reserve.push(u);return null;});
    if(when.reserveAtMost===0){for(const u of p.reserve)u.entered=true;p.dead.push(...p.reserve);p.reserve=[];}
    for(let n=0;s.phase!=='over'&&n<2000;n++){
      const u=s.players[side].board.find(u=>u?.uid===uid);
      if(u&&E.equipmentView(s,u).active&&s.duel&&['attack','defense','result'].includes(s.phase)){
        E.assertState(s);assert.deepEqual(E.restoreGame(s),s);return {id:w.id,side,uid,seed,round:s.round,state:s,inactive};
      }
      if(s.phase==='choose'){
        const attackers=s.players[s.turn].board.filter(Boolean),targets=s.players[1-s.turn].board.filter(Boolean),own=s.players[side].board.find(u=>u?.uid===uid);
        const defend=['DEFENSE','BLOCK'].includes(w.effect.event),a=s.turn===side&&own?own:attackers[(seed+n)%attackers.length];
        const alternatives=targets.filter(u=>u.uid!==uid),b=s.turn!==side&&own&&defend?own:alternatives[(seed+n)%alternatives.length]||targets[0];
        E.lock(s,s.players[s.turn].board.indexOf(a),s.players[1-s.turn].board.indexOf(b));
      }else advance(E,s);
    }
  }
  throw Error('No active natural fixture for '+w.id);
}
module.exports={activeFixture,advance};
