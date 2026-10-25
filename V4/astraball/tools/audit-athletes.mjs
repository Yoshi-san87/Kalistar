import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { ATHLETES, canPlayPosition } from '../data/athletes.mjs';
import { TEAMS, ROLES } from '../data/teams.mjs';
import { createMatch, validateState, applyCommand, restoreMatch } from '../src/core/game.mjs';
import { chooseTurn } from '../src/core/ai.mjs';
import { createRoster } from '../src/roster.mjs';

const sources={};
for(const file of ['data/athlete-definitions.mjs','data/athletes.mjs','data/teams.mjs','src/roster.mjs','src/core/game.mjs','src/core/geometry.mjs','src/core/ai.mjs']){
  sources[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
}
const started=performance.now(),results=[],seen=new Set(),stats={commands:0,decisions:0,decisionMs:0,goals:0};
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function team(random,forced,role){
  const chosen={},used=new Set();
  if(forced){chosen[role]=forced;used.add(forced.id);}
  for(const position of ROLES.filter(r=>r!==role||!forced)){
    const pool=ATHLETES.filter(a=>canPlayPosition(a,position)&&!used.has(a.id));
    const a=pool[Math.floor(random()*pool.length)];chosen[position]=a;used.add(a.id);
  }
  return chosen;
}
function teams(lineups){return lineups.map((lineup,i)=>({...TEAMS[i],players:ROLES.map(role=>{
  const a=lineup[role];return {id:'t'+i+'-'+a.id,name:a.id,role,athleteId:a.id};
})}));}
function run(lineups,seed,group){
  const state=createMatch({seed,teams:teams(lineups)}),trace=createHash('sha256');let turns=0;
  for(const u of state.units)seen.add(u.athlete.id+':'+u.role);
  while(state.status==='playing'){
    assert.ok(++turns<450,'bounded match');
    const before=JSON.stringify(state),start=performance.now(),commands=chooseTurn(state);
    stats.decisionMs+=performance.now()-start;stats.decisions++;
    assert.equal(JSON.stringify(state),before,'pure AI');
    for(const command of commands){
      const result=applyCommand(state,command);assert.equal(result.ok,true,JSON.stringify(command));validateState(state);stats.commands++;
      stats.goals+=result.events.filter(e=>e.type==='goal').length;trace.update(JSON.stringify(result));
    }
  }
  assert.deepEqual(restoreMatch(JSON.parse(JSON.stringify(state))),state);
  const r={seed,group,winner:state.winner,score:state.score,rounds:state.round,trace:trace.digest('hex')};results.push(r);return r;
}
let seed=45000;
for(const a of ATHLETES)for(const role of [a.primary,a.secondary]){
  const random=rng(seed),left=team(random,a,role),right=team(random);
  run([left,right],seed,'all-profiles');run([right,left],seed,'all-profiles');seed++;
}
const roster=createRoster(null),defaultPlayers=roster.teams(roster.defaults()).map(t=>Object.fromEntries(t.players.map(p=>[p.role,ATHLETES.find(a=>a.id===p.athleteId)])));
for(let i=0;i<100;i++){
  run(defaultPlayers,65000+i,'default-home');run([...defaultPlayers].reverse(),65000+i,'default-away');
}
for(let i=0;i<50;i++){
  const random=rng(73000+i),left=team(random),right=team(random),first=run([left,right],73000+i,'random');
  const second=run([left,right],73000+i,'replay');assert.equal(first.trace,second.trace);
}
assert.equal(seen.size,ATHLETES.length*2,'every character in both authorized positions');
const grouped=Object.fromEntries([...new Set(results.map(r=>r.group))].map(group=>{
  const rows=results.filter(r=>r.group===group);return [group,{games:rows.length,wins:[0,1].map(t=>rows.filter(r=>r.winner===t).length),draws:rows.filter(r=>r.winner===null).length,meanRounds:rows.reduce((n,r)=>n+r.rounds,0)/rows.length}];
}));
const report={sources,profiles:ATHLETES.length,positionPairs:seen.size,games:results.length,grouped,...stats,meanDecisionMs:stats.decisionMs/stats.decisions,elapsedMs:performance.now()-started,
  limitations:'AI smoke/paired-side diagnostics, not a proof of competitive balance. Four games per athlete do not support individual win-rate rankings. No human-play validation.',results};
const out=new URL('../../../work/astraball/profiles/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('simulation.json',out),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined},null,2));
