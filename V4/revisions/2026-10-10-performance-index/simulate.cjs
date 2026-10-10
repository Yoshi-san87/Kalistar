'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {createEngine}=require('../../site/engine.js'),Index=require('../../site/performance-index.js'),T=require('../../site/trophies.js');
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
const Sampling=require('../2026-10-09-equipment-slots/balance.cjs');
const root=path.resolve(__dirname,'../../..'),out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'qa');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const support={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
function play(E,A,B,{seed,arenaId,policy,checks=false}){
  let s=E.newGame(A,B,{seed,arenaId,mode:'local',turnOrder:'ABBA'}),steps=0;
  const r=Sampling.random(parseInt(hash(seed+'policy').slice(0,8),16));
  while(s.phase!=='over'&&steps++<5000){
    if(s.phase==='initiative')E.rollInitiative(s);
    else if(s.phase==='choose'){
      let pair=E.aiChoice(s);
      if(policy==='random'){
        const pairs=s.players[s.turn].board.flatMap((a,i)=>a?s.players[1-s.turn].board.flatMap((b,j)=>b?[[i,j]]:[]):[]);
        pair=pairs[Math.floor(r()*pairs.length)];
      }E.lock(s,...pair);
    }else if(s.phase==='attack')E.rollAttack(s);
    else if(s.phase==='kalistel')(policy==='random'?s.duel.attackDie<=2:E.aiUseKalistel(s))?E.useKalistel(s):E.acceptAttack(s);
    else if(s.phase==='defense')E.rollDefense(s);
    else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
    else if(s.phase==='result')E.equipmentChoice(s)?E.grantEquipment(s,E.aiEquipmentChoice(s)):E.next(s);
    else{
      const pair=support[s.phase];assert(pair,s.phase);
      const allies=s.players[s.turn].board.filter(Boolean),recipient=policy==='random'?allies[Math.floor(r()*allies.length)].uid:E[pair[1]](s);
      E[pair[0]](s,recipient);
    }
    if(checks){E.assertState(s);if(steps%47===0){const resumed=E.restoreGame(JSON.parse(JSON.stringify(s)));assert.deepEqual(resumed,s);s=resumed;}}
  }
  assert.equal(s.phase,'over');E.assertState(s);return s;
}
function combatSignature(s){
  return hash(JSON.stringify({players:s.players,events:s.match.events,duel:s.duel,lastDuel:s.lastDuel,winner:s.winner,rng:s.rng,turn:s.turn,round:s.round,kalistel:s.kalistel,equipment:s.equipment},(k,v)=>['traitSources','nativeSources','sources','wardConsumed'].includes(k)?undefined:v));
}
const mean=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:0;
function wilson(n,total){if(!total)return [0,0];const z=1.96,p=n/total,d=1+z*z/total,c=(p+z*z/(2*total))/d,m=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;return [c-m,c+m];}
async function main(){
  const pairs=Number(process.argv.find(a=>a.startsWith('--pairs='))?.split('=')[1]||500);assert(Number.isInteger(pairs)&&pairs>=10&&pairs<=5000);
  fs.mkdirSync(out,{recursive:true});const begun=Date.now();
  // Freeze the released catalogue while other native productions remain local.
  const published=JSON.parse(execFileSync('git',['show','c55b6139:V4/donnees/catalogue.json'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024})).cards.filter(c=>c.kind==='created');
  const data=await buildCatalog({published}),E=createEngine(data),random=Sampling.random(46130010),cardsUsed=new Set(),rows=[],roles={},totals={},example={};
  const baselineSource=execFileSync('git',['show','c55b6139:V4/site/engine.js'],{cwd:root,encoding:'utf8'}),baseline={module:{exports:{}},require:p=>require(path.join(root,'V4/site',p)),crypto};
  vm.runInNewContext(baselineSource,baseline);const previous=baseline.module.exports.createEngine(data);
  const families=[...new Set(data.cards.map(c=>c.faction))],presets=[{cards:data.decks.player},{cards:data.decks.enemy},...data.decks.presets];
  let comparisons=0,assists=0,nativeBuffUses=0,alliedBuffUses=0,kills=0,consumptions={luck:0,reraise:0},draws=0;
  for(let pair=0;pair<pairs;pair++){
    const theme=families[pair%families.length],family=pair%3;
    let idsA=family===0?presets[pair%presets.length].cards.slice():Sampling.legalDeck(E,random,family===1?data.cards.filter(c=>c.faction===theme):[]);
    let idsB=pair%5===0?idsA.slice():Sampling.legalDeck(E,random);
    for(const id of [...idsA,...idsB])cardsUsed.add(id);
    for(const policy of ['production','random'])for(const equipped of [false,true])for(const reverse of [false,true]){
      const a=Sampling.team(E,idsA,Sampling.outfit(E,idsA,equipped?'all':'none',Sampling.random(pair+13))),b=Sampling.team(E,idsB,Sampling.outfit(E,idsB,equipped?'all':'none',Sampling.random(pair+999)));
      const A=reverse?b:a,B=reverse?a:b,seed='INDEX-'+pair+'-'+policy+'-'+Number(equipped),arenaId=data.arenas[pair%data.arenas.length].id;
      const s=play(E,A,B,{seed,arenaId,policy,checks:pair<6}),stats=E.matchStats(s),units=stats.units.filter(u=>u.participated);
      if(pair<25){const old=play(previous,A,B,{seed,arenaId,policy});assert.equal(combatSignature(s),combatSignature(old),'Combat changed '+seed);comparisons++;}
      const oldUnits=units.map(u=>({...u,rating:Index.calculate(u,1)})),oldWinner=T.leaders({...stats,ratingVersion:1,units:oldUnits},'rating')[0],winner=T.leaders(stats,'rating')[0];
      const withoutWin=units.map(u=>({...u,victory:0,rating:Index.calculate({...u,victory:0})})),withoutWinner=T.leaders({...stats,units:withoutWin},'rating')[0];
      const gap=list=>{const sorted=list.map(u=>u.rating).sort((a,b)=>b-a);return (sorted[0]||0)-(sorted[1]||0);};
      const row={pair,policy,equipped,reverse,winner:s.winner,draw:s.winner==='draw',exchanges:stats.exchanges,oldMvp:oldWinner?.uid,newMvp:winner?.uid,oldRole:E.byId[oldWinner?.cardId]?.role,newRole:E.byId[winner?.cardId]?.role,oldGap:gap(oldUnits),newGap:gap(units),oldLosing:!!oldWinner&&stats.winner!==oldWinner.side,newLosing:!!winner&&stats.winner!==winner.side,winChanged:winner?.uid!==withoutWinner?.uid,assists:units.reduce((n,u)=>n+u.assists,0)};
      row.newMvpKills=winner?.kills||0;row.oldMvpKills=oldWinner?.kills||0;
      rows.push(row);draws+=Number(row.draw);assists+=row.assists;
      for(const event of s.match.events){nativeBuffUses+=Number(!!event.sources?.buff);alliedBuffUses+=Number(!!event.sources?.buff&&event.sources.buff.donor!==event.attacker);kills+=Number(event.kill);consumptions.luck+=Number(event.luck);consumptions.reraise+=Number(event.reraise);}
      for(const u of units){const role=E.byId[u.cardId].role,r=roles[role]??={participants:0,oldMvp:0,newMvp:0,oldIndex:0,newIndex:0,contributions:{}};r.participants++;r.oldMvp+=Number(oldWinner?.uid===u.uid);r.newMvp+=Number(winner?.uid===u.uid);r.oldIndex+=Index.calculate(u,1);r.newIndex+=u.rating;
        for(const [key,value] of Object.entries(u.ratingBreakdown)){totals[key]=(totals[key]||0)+value;r.contributions[key]=(r.contributions[key]||0)+value;}
      }
      if(!example.state&&row.assists>0){example.state=s;example.summary=stats;example.mvp=winner;}
    }
    if(pair%50===49)console.log((pair+1)+'/'+pairs+' pairs, '+rows.length+' matches');
  }
  const summary={method:{pairs,matches:rows.length,seed:46130010,policies:['production','random'],families:['presets','faction oriented','uniform catalogue'],orientations:2,equipment:['none','all compatible slots'],baseline:'c55b6139',baselineHash:hash(baselineSource),combatComparisons:comparisons,catalogueCards:data.cards.length,cardsUsed:cardsUsed.size,arenas:data.arenas.length,role:'native main role, not current board position',coefficients:Index.coefficients,limits:'Automated policies, not human ranked play. Paired orientations are dependent; Wilson intervals are descriptive match-level uncertainty, not independent-cluster causal confidence.'},seconds:(Date.now()-begun)/1000,draws,roles,contributions:totals,oldGap:mean(rows.map(r=>r.oldGap)),newGap:mean(rows.map(r=>r.newGap)),changedMvp:rows.filter(r=>r.oldMvp!==r.newMvp).length,oldLosingMvp:rows.filter(r=>!r.draw&&r.oldLosing).length,newLosingMvp:rows.filter(r=>!r.draw&&r.newLosing).length,winBonusChangedMvp:rows.filter(r=>r.winChanged).length,assists,nativeBuffUses,definitiveKills:kills,consumptions,assistsPerMatch:assists/rows.length,matchesWithAssist:rows.filter(r=>r.assists>0).length,byPolicy:{}};
  for(const policy of ['production','random']){const group=rows.filter(r=>r.policy===policy);summary.byPolicy[policy]={matches:group.length,oldRoles:Object.fromEntries([1,2,3,4,5].map(role=>[role,group.filter(r=>r.oldRole===role).length])),newRoles:Object.fromEntries([1,2,3,4,5].map(role=>[role,group.filter(r=>r.newRole===role).length])),oldGap:mean(group.map(r=>r.oldGap)),newGap:mean(group.map(r=>r.newGap)),assistsPerMatch:mean(group.map(r=>r.assists)),losingMvp:group.filter(r=>!r.draw&&r.newLosing).length,winBonusChanged:group.filter(r=>r.winChanged).length};}
  summary.alliedBuffUses=alliedBuffUses;summary.zeroKillMvp=rows.filter(r=>r.newMvpKills===0).length;summary.zeroKillSupportMvp=rows.filter(r=>r.newRole===5&&r.newMvpKills===0).length;
  summary.sourceHashes=Object.fromEntries(['engine.js','performance-index.js','trophies.js','equipment.js','weapons.js','turn-order.js'].map(name=>[name,hash(fs.readFileSync(path.join(root,'V4/site',name)))]));
  for(const r of Object.values(roles)){r.mvpRate=r.newMvp/rows.length;r.descriptive95=wilson(r.newMvp,rows.length);}
  fs.writeFileSync(path.join(out,'simulation.json'),JSON.stringify({summary,rows},null,2)+'\n');
  if(example.state)fs.writeFileSync(path.join(out,'example.json'),JSON.stringify(example,null,2)+'\n');
  console.log(JSON.stringify(summary,null,2));return summary;
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={play,combatSignature,main};
