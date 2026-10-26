import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { ATHLETES, ATHLETE_VERSION, canPlayPosition } from '../data/athletes.mjs';
import { TEAMS, ROLES } from '../data/teams.mjs';
import { createMatch, validateState, applyCommand, restoreMatch } from '../src/core/game.mjs';
import { chooseTurn } from '../src/core/ai.mjs';
import { createRoster } from '../src/roster.mjs';
import { SENTRY_SKILLS } from '../src/core/skills.mjs';

const sources={};
for(const file of ['data/athlete-definitions.mjs','data/athlete-choices.mjs','data/athletes.mjs','data/teams.mjs','data/sprite-library.json','src/roster.mjs','src/core/game.mjs','src/core/skills.mjs','src/core/geometry.mjs','src/core/ai.mjs']){
  sources[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
}
assert.equal(ATHLETE_VERSION,2,'single-position athlete contract');
const profiles=new Map(ATHLETES.map(a=>[a.id,a]));
assert.ok(ATHLETES.length>0,'nonempty athlete catalogue');
assert.equal(profiles.size,ATHLETES.length,'unique athlete identities');
for(const a of ATHLETES){
  assert.equal(a.version,ATHLETE_VERSION,a.id+' version');
  assert.ok(ROLES.includes(a.position),a.id+' position');
  assert.ok(!('primary' in a)&&!('secondary' in a),a.id+' has only one position');
  for(const role of ROLES)assert.equal(canPlayPosition(a,role),a.position===role,a.id+' / '+role);
}
// New defaults require characters outside the ten historical sprite fallbacks.
const library=JSON.parse(await readFile(new URL('../data/sprite-library.json',import.meta.url),'utf8'));
const roster=createRoster(library),defaultPlayers=roster.teams(roster.defaults()).map(t=>Object.fromEntries(t.players.map(p=>{
  const a=profiles.get(p.athleteId);assert.ok(canPlayPosition(a,p.role),'compatible default: '+p.athleteId+' / '+p.role);
  return [p.role,a];
})));
const started=performance.now(),results=[],seen=new Set(),seenSides=new Set(),stats={commands:0,decisions:0,decisionMs:0,goals:0,skills:Object.fromEntries(SENTRY_SKILLS.map(s=>[s.id,0])),effectReloads:0};
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function team(random,forced){
  const chosen={},used=new Set();
  if(forced){chosen[forced.position]=forced;used.add(forced.id);}
  for(const position of ROLES.filter(r=>r!==forced?.position)){
    const pool=ATHLETES.filter(a=>canPlayPosition(a,position)&&!used.has(a.id));
    assert.ok(pool.length,'available athlete for '+position);
    const a=pool[Math.floor(random()*pool.length)];chosen[position]=a;used.add(a.id);
  }
  return chosen;
}
function teams(lineups){return lineups.map((lineup,i)=>({...TEAMS[i],players:ROLES.map(role=>{
  const a=lineup[role];return {id:'t'+i+'-'+a.id,name:a.id,role,athleteId:a.id};
})}));}
function run(lineups,seed,group){
  const state=createMatch({seed,teams:teams(lineups)}),trace=createHash('sha256');let turns=0;
  for(const u of state.units){
    const a=profiles.get(u.athlete.id);assert.ok(a,'known athlete: '+u.athlete.id);
    assert.equal(u.role,a.position,'single authorized position');
    assert.deepEqual(u.athlete,{id:a.id,version:ATHLETE_VERSION,position:a.position},'v2 athlete snapshot');
    assert.deepEqual(u.stats,a.stats,'catalogue stats');
    seen.add(a.id+':'+u.role);seenSides.add(a.id+':'+u.role+':'+u.team);
  }
  while(state.status==='playing'){
    assert.ok(++turns<450,'bounded match');
    const before=JSON.stringify(state),start=performance.now(),commands=chooseTurn(state);
    stats.decisionMs+=performance.now()-start;stats.decisions++;
    assert.equal(JSON.stringify(state),before,'pure AI');
    for(const command of commands){
      const result=applyCommand(state,command);assert.equal(result.ok,true,JSON.stringify(command));validateState(state);stats.commands++;
      stats.goals+=result.events.filter(e=>e.type==='goal').length;trace.update(JSON.stringify(result));
      for(const event of result.events.filter(e=>e.type==='skill')){
        stats.skills[event.skill]++;
        assert.deepEqual(restoreMatch(JSON.parse(JSON.stringify(state))),state,'effect snapshot round trip');stats.effectReloads++;
      }
    }
  }
  assert.deepEqual(restoreMatch(JSON.parse(JSON.stringify(state))),state);
  const r={seed,group,winner:state.winner,score:state.score,rounds:state.round,trace:trace.digest('hex')};results.push(r);return r;
}
let seed=45000;
for(const a of ATHLETES){
  const random=rng(seed),left=team(random,a),right=team(random);
  run([left,right],seed,'all-profiles');run([right,left],seed,'all-profiles');seed++;
}
assert.equal(seen.size,ATHLETES.length,'every character in its single authorized position');
assert.equal(seenSides.size,ATHLETES.length*2,'every character in both camps');
for(const a of ATHLETES)for(const side of [0,1])assert.ok(seenSides.has(a.id+':'+a.position+':'+side),a.id+' in camp '+side);
for(let i=0;i<100;i++){
  run(defaultPlayers,65000+i,'default-home');run([...defaultPlayers].reverse(),65000+i,'default-away');
}
for(let i=0;i<50;i++){
  const random=rng(73000+i),left=team(random),right=team(random),first=run([left,right],73000+i,'random');
  const second=run([left,right],73000+i,'replay');assert.equal(first.trace,second.trace);
}
const grouped=Object.fromEntries([...new Set(results.map(r=>r.group))].map(group=>{
  const rows=results.filter(r=>r.group===group);return [group,{games:rows.length,wins:[0,1].map(t=>rows.filter(r=>r.winner===t).length),draws:rows.filter(r=>r.winner===null).length,meanRounds:rows.reduce((n,r)=>n+r.rounds,0)/rows.length}];
}));
const report={sources,athleteVersion:ATHLETE_VERSION,profiles:ATHLETES.length,positionPairs:seen.size,positionSidePairs:seenSides.size,games:results.length,grouped,...stats,meanDecisionMs:stats.decisionMs/stats.decisions,elapsedMs:performance.now()-started,
  limitations:'AI smoke/paired-side diagnostics, not a proof of competitive balance. Two forced games per athlete do not support individual win-rate rankings. Includes provisional profiles without sprites in synthetic teams. No human-play validation.',results};
const out=new URL('../../../work/astraball/profiles/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('simulation.json',out),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined},null,2));
