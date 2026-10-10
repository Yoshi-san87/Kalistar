'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {createEngine}=require('../../site/engine.js'),Index=require('../../site/performance-index.js'),T=require('../../site/trophies.js');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),Sampling=require('../2026-10-09-equipment-slots/balance.cjs');
const {play,combatSignature}=require('../2026-10-10-performance-index/simulate.cjs');
const root=path.resolve(__dirname,'../../..'),out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'qa');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const mean=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:0;
const git=(ref,file)=>execFileSync('git',['show',ref+':'+file],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
async function main(){
  const option=(name,fallback)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.split('=')[1]||fallback;
  const pairs=Number(option('pairs',500)),baselineRef=option('baseline','fc368f2d');assert(Number.isInteger(pairs)&&pairs>=10&&pairs<=5000);
  fs.mkdirSync(out,{recursive:true});const begun=Date.now(),published=JSON.parse(git(baselineRef,'V4/donnees/catalogue.json')).cards.filter(c=>c.kind==='created');
  const data=await buildCatalog({published}),E=createEngine(data),random=Sampling.random(46160010),used=new Set(),rows=[],roles={},points={before:{},after:{}},power={rawAttack:0,rawDefense:0,valuedAttack:0,valuedDefense:0};
  const frozenIndex={module:{exports:{}}},indexSource=git(baselineRef,'V4/site/performance-index.js');vm.runInNewContext(indexSource,frozenIndex);assert.equal(frozenIndex.module.exports.version,2);
  const engineSource=git(baselineRef,'V4/site/engine.js'),baseline={module:{exports:{}},require:p=>p==='./performance-index.js'?frozenIndex.module.exports:require(path.join(root,'V4/site',p)),crypto};
  vm.runInNewContext(engineSource,baseline);const oldEngine=baseline.module.exports.createEngine(data);
  const families=[...new Set(data.cards.map(c=>c.faction))],presets=[{cards:data.decks.player},{cards:data.decks.enemy},...data.decks.presets];
  let comparisons=0,defensive=0,offensive=0,wardUses=0,alliedWardUses=0,example;
  for(let pair=0;pair<pairs;pair++){
    const family=pair%3,theme=families[pair%families.length];
    const idsA=family===0?presets[pair%presets.length].cards.slice():Sampling.legalDeck(E,random,family===1?data.cards.filter(c=>c.faction===theme):[]),idsB=pair%5===0?idsA.slice():Sampling.legalDeck(E,random);
    for(const id of [...idsA,...idsB])used.add(id);
    for(const policy of ['production','random'])for(const equipped of [false,true])for(const reverse of [false,true]){
      const a=Sampling.team(E,idsA,Sampling.outfit(E,idsA,equipped?'all':'none',Sampling.random(pair+13))),b=Sampling.team(E,idsB,Sampling.outfit(E,idsB,equipped?'all':'none',Sampling.random(pair+999)));
      const A=reverse?b:a,B=reverse?a:b,seed='USEFUL-'+pair+'-'+policy+'-'+Number(equipped),arenaId=data.arenas[pair%data.arenas.length].id;
      const state=play(E,A,B,{seed,arenaId,policy,checks:pair<6}),after=E.matchStats(state),v2=E.clone(state);v2.match.ratingVersion=2;
      const before=E.matchStats(v2);
      if(pair<25){
        const old=play(oldEngine,A,B,{seed,arenaId,policy});assert.equal(combatSignature(state),combatSignature(old),'Combat changed '+seed);
        const historical=structuredClone(oldEngine.matchStats(old));historical.matchId=before.matchId;
        assert.deepEqual(before,historical,'Index 2 regression '+seed);comparisons++;
      }
      const oldMvp=T.leaders(before,'rating')[0],newMvp=T.leaders(after,'rating')[0],units=after.units.filter(u=>u.participated);
      const gap=s=>{const values=s.units.filter(u=>u.participated).map(u=>u.rating).sort((a,b)=>b-a);return (values[0]||0)-(values[1]||0);};
      const row={pair,policy,equipped,reverse,winner:state.winner,exchanges:after.exchanges,beforeMvp:oldMvp?.uid,afterMvp:newMvp?.uid,beforeRole:E.byId[oldMvp?.cardId]?.role,afterRole:E.byId[newMvp?.cardId]?.role,beforeGap:gap(before),afterGap:gap(after),beforeLosing:state.winner!=='draw'&&oldMvp?.side!==state.winner,afterLosing:state.winner!=='draw'&&newMvp?.side!==state.winner,afterMvpKills:newMvp?.kills||0,defensiveAssists:units.reduce((n,u)=>n+u.defensiveAssists,0)};
      rows.push(row);defensive+=row.defensiveAssists;
      for(const u of units){
        const old=before.units.find(b=>b.uid===u.uid),role=E.byId[u.cardId].role,r=roles[role]??={participants:0,beforeMvp:0,afterMvp:0,beforeIndex:0,afterIndex:0};
        r.participants++;r.beforeMvp+=Number(oldMvp?.uid===u.uid);r.afterMvp+=Number(newMvp?.uid===u.uid);r.beforeIndex+=old.rating;r.afterIndex+=u.rating;
        offensive+=u.assists-u.defensiveAssists;
        for(const [label,result] of [['before',old],['after',u]])for(const [key,value] of Object.entries(result.ratingBreakdown))points[label][key]=(points[label][key]||0)+value;
        for(const key of Object.keys(power))power[key]+=u[{rawAttack:'attack',rawDefense:'defense',valuedAttack:'valuedAttack',valuedDefense:'valuedDefense'}[key]];
      }
      for(const event of state.match.events){wardUses+=Number(event.ward>0);alliedWardUses+=Number(event.ward>0&&!!event.sources?.ward&&event.sources.ward.donor!==event.target);}
      if(!example&&row.defensiveAssists>0){const donor=units.find(u=>u.defensiveAssists>0);example={state,summary:after,mvp:newMvp,donor,event:state.match.events.find(e=>Index.credits(e,state.match).some(c=>c.defensive&&c.uid===donor.uid))};}
    }
    if(pair%50===49)console.log((pair+1)+'/'+pairs+' pairs, '+rows.length+' matches');
  }
  const summary={method:{pairs,matches:rows.length,seed:46160010,baseline:baselineRef,baselineEngineHash:hash(engineSource),baselineIndexHash:hash(indexSource),indexBefore:2,indexAfter:3,combatAndSummaryComparisons:comparisons,catalogueCards:data.cards.length,cardsUsed:used.size,arenas:data.arenas.length,policies:['production','random'],equipment:['none','all compatible slots'],orientations:2,deckFamilies:['presets','faction oriented','uniform catalogue'],role:'native role, not deployed slot',coefficients:Index.coefficients,limits:'Automated policies, not human ranked play or measured fun. Paired orientations share seeds and are not independent matches. Role shares are descriptive, not an equal-MVP fairness target.'},seconds:(Date.now()-begun)/1000,roles,points,power,offensiveAssists:offensive,defensiveAssists:defensive,wardUses,alliedWardUses,matchesWithDefensiveAssist:rows.filter(r=>r.defensiveAssists>0).length,changedMvp:rows.filter(r=>r.beforeMvp!==r.afterMvp).length,beforeGap:mean(rows.map(r=>r.beforeGap)),afterGap:mean(rows.map(r=>r.afterGap)),beforeLosingMvp:rows.filter(r=>r.beforeLosing).length,afterLosingMvp:rows.filter(r=>r.afterLosing).length,zeroKillMvp:rows.filter(r=>r.afterMvpKills===0).length,zeroKillSupportMvp:rows.filter(r=>r.afterRole===5&&r.afterMvpKills===0).length,byPolicy:{}};
  for(const policy of ['production','random']){const group=rows.filter(r=>r.policy===policy);summary.byPolicy[policy]={matches:group.length,beforeRoles:Object.fromEntries([1,2,3,4,5].map(role=>[role,group.filter(r=>r.beforeRole===role).length])),afterRoles:Object.fromEntries([1,2,3,4,5].map(role=>[role,group.filter(r=>r.afterRole===role).length])),defensiveAssists:group.reduce((n,r)=>n+r.defensiveAssists,0),changedMvp:group.filter(r=>r.beforeMvp!==r.afterMvp).length};}
  summary.sourceHashes=Object.fromEntries(['engine.js','performance-index.js','trophies.js','equipment.js','weapons.js','turn-order.js'].map(name=>[name,hash(fs.readFileSync(path.join(root,'V4/site',name)))]));
  fs.writeFileSync(path.join(out,'simulation.json'),JSON.stringify({summary,rows},null,2)+'\n');assert(example,'Expected real causal defensive assists');
  fs.writeFileSync(path.join(out,'example.json'),JSON.stringify(example,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
