const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'site/data.js'),'utf8'),context);
const data=JSON.parse(JSON.stringify(context.window.KALISTAR_DATA));
const E=require(path.join(root,'site/engine.js')).createEngine(data);
const decks=[{id:'player',cards:data.decks.player},{id:'enemy',cards:data.decks.enemy},...data.decks.presets];
const totals=Object.fromEntries(decks.map(d=>[d.id,{played:0,won:0,lost:0,draw:0}]));
const games=[];
for(let i=0;i<decks.length;i++)for(let j=i+1;j<decks.length;j++)for(const arena of data.arenas)for(let seed=0;seed<4;seed++){
 const order=seed%2?[decks[j],decks[i]]:[decks[i],decks[j]];
 const s=E.newGame(order[0].cards,order[1].cards,{mode:'local',seed:`BALANCE-V3-${i}-${j}-${arena.id}-${seed}`,arenaId:arena.id});
 E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
 for(let n=0;n<8000&&s.phase!=='over';n++){
  if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
  else if(s.phase==='attack')E.rollAttack(s);
  else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='guard')E.grantGuard(s,E.aiGuardChoice(s));
  else if(s.phase==='clover')E.grantClover(s,E.aiCloverChoice(s));
  else if(s.phase==='potion')E.grantPotion(s,E.aiPotionChoice(s));
  else if(s.phase==='physical')E.grantPhysical(s,E.aiPhysicalChoice(s));
  else if(s.phase==='heart')E.grantReraise(s,E.aiReraiseChoice(s));
  else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
  else if(s.phase==='result')E.next(s);
  else throw new Error('Unexpected phase '+s.phase);
 }
 assert.equal(s.phase,'over');E.assertState(s);
 for(let side=0;side<2;side++){
  const record=totals[order[side].id];record.played++;
  if(s.winner===side)record.won++;else if(s.winner===1-side)record.lost++;else record.draw++;
 }
 games.push({decks:order.map(d=>d.id),arena:arena.id,winner:s.winner,turns:s.round});
}
const report={scope:'Deterministic AI vs AI smoke/balance sample, not a claim of human competitive balance.',games:games.length,totals,results:games};
fs.writeFileSync(path.join(root,'verification/balance-simulation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({games:games.length,totals},null,2));
