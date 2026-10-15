'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
const {createEngine}=require('../../site/engine.js');
const AI=require('../../site/ai-strategies.js');
const fixtures=require('../../site/fixtures/ai-native.json');
function play(data,job){
  const E=createEngine(data),f=fixtures[job.index],teams=job.side?f.teams.slice().reverse():f.teams;
  let s=E.newGame(...teams,{mode:'ai',seed:f.seed,arenaId:f.arenaId,turnOrder:'ABBA',aiProfiles:job.side?[null,job.profile]:[job.profile,null]});
  const times=[],pairs=[],actions={supports:0,choices:0,rerolls:0,checks:0};let steps=0;
  while(s.phase!=='over'){
    assert(++steps<5000);
    const ch=E.equipmentChoice(s);
    if(ch){const value=E.aiEquipmentChoice(s);assert(ch.options?ch.options.some(o=>o.value===value):ch.targets.includes(value));E.grantEquipment(s,value);actions.choices++;}
    else if(s.phase==='initiative')E.rollInitiative(s);
    else if(s.phase==='choose'){
      const before=JSON.stringify(s),start=performance.now(),pair=E.aiChoice(s);
      if(s.turn===job.side){times.push(performance.now()-start);pairs.push(pair);}
      assert.equal(JSON.stringify(s),before,'AI must not mutate live state');E.lock(s,...pair);
    }else if(s.phase==='attack')E.rollAttack(s);
    else if(s.phase==='kalistel'){if(E.aiUseKalistel(s)){E.useKalistel(s);actions.rerolls++;}else E.acceptAttack(s);}
    else if(s.phase==='defense')E.rollDefense(s);
    else if(s.phase==='result')E.next(s);
    else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
    else {
      const methods={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']}[s.phase];
      assert(methods,'Unhandled '+s.phase);E[methods[0]](s,E[methods[1]](s));actions.supports++;
    }
    E.assertState(s);actions.checks++;
    if(s.phase==='result')s=E.restoreGame(s);
  }
  return {...job,won:s.winner===job.side,winner:s.winner,rounds:s.match.events.length,actions,times,pairs,
    ultimates:(s.equipment?.rituals?.uses||[]).filter(u=>Number(u.sourceUid[0])===job.side).length,
    gifts:(s.match.ultimateGrants||[]).filter(u=>Number(u.sourceUid[0])===job.side).length};
}
async function main(){
  const data=await buildCatalog({published:require('../../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
  const count=Number(process.env.AI_BENCH_COUNT||20),jobs=AI.profiles.flatMap(p=>fixtures.slice(0,count).flatMap((_,index)=>[0,1].map(side=>({profile:p.id,index,side}))));
  const results=[],workers=Math.min(4,Number(process.env.AI_BENCH_WORKERS||4));
  await Promise.all(Array.from({length:workers},(_,i)=>new Promise((resolve,reject)=>{
    const w=new Worker(__filename,{workerData:{data,jobs:jobs.filter((_,j)=>j%workers===i)}});
    w.on('message',r=>{results.push(r);if(results.length%10===0)console.log(results.length+'/'+jobs.length+' matches');});
    w.on('error',reject);w.on('exit',code=>code?reject(Error('worker '+code)):resolve());
  })));
  results.sort((a,b)=>a.profile.localeCompare(b.profile)||a.index-b.index||a.side-b.side);
  const summary=AI.profiles.map(p=>{
    const rows=results.filter(r=>r.profile===p.id),times=rows.flatMap(r=>r.times).sort((a,b)=>a-b);
    return {id:p.id,games:rows.length,wins:rows.filter(r=>r.won).length,draws:rows.filter(r=>r.winner==='draw').length,
      averageRounds:rows.reduce((n,r)=>n+r.rounds,0)/rows.length,choices:times.length,p95ms:times[Math.floor(times.length*.95)],
      gifts:rows.reduce((n,r)=>n+r.gifts,0),ultimateBonuses:rows.reduce((n,r)=>n+r.ultimates,0)};
  });
  const out=process.env.AI_BENCH_OUTPUT||path.join(__dirname,'benchmark.json');
  fs.writeFileSync(out,JSON.stringify({generatedAt:new Date().toISOString(),catalogue:data.cards.length,summary,results},null,2)+'\n');
  console.log(JSON.stringify(summary,null,2));
}
if(!isMainThread){for(const job of workerData.jobs)parentPort.postMessage(play(workerData.data,job));}
else if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={play};
