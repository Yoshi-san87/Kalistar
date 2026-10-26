import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { ATHLETE_CHOICES, ATHLETE_CHOICE_SOURCE } from '../data/athlete-choices.mjs';
import { ATHLETES, ATHLETE_VERSION, getAthlete, canPlayPosition, athleteSnapshot, ratingBudget } from '../data/athletes.mjs';
import { createRoster, POSITIONS } from '../src/roster.mjs';
import { createMatch, restoreMatch, validateState, applyCommand } from '../src/core/game.mjs';
import { chooseTurn } from '../src/core/ai.mjs';
import { TEAMS } from '../data/teams.mjs';
import { renderAthlete } from '../src/athlete-view.mjs';
const library=JSON.parse(fs.readFileSync(new URL('../data/sprite-library.json',import.meta.url)));
const roster=createRoster(library),keys=['VIT','MOB','FOR','PAS','TIR','DEF'];

test('all 269 positions and rating vectors match the author-confirmed export',()=>{
  const canonical=Object.entries(ATHLETE_CHOICES).map(([id,c])=>[id,c.position,...keys.map(k=>c.stats[k])])
    .sort((a,b)=>a[0].localeCompare(b[0],'en'));
  assert.equal(canonical.length,269);
  assert.equal(createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    'c85c85b04776773ed39f57ef2b758fca47cc449ef496e5d3d8356e69d151a112');
  assert.equal(ATHLETE_CHOICE_SOURCE.profiles,269);
  assert.equal(ATHLETE_VERSION,2);
  assert.match(ATHLETE_CHOICE_SOURCE.sha256,/^[a-f0-9]{64}$/);
  const counts=Object.fromEntries(POSITIONS.map(p=>[p.id,0]));
  for(const [id,choice] of Object.entries(ATHLETE_CHOICES)){
    const profile=getAthlete(id);assert.ok(profile,id);
    assert.deepEqual(profile.stats,choice.stats);assert.equal(profile.position,choice.position);
    assert.equal(ratingBudget(profile.stats),38,id);counts[profile.position]++;
    assert.deepEqual(POSITIONS.filter(p=>canPlayPosition(profile,p.id)).map(p=>p.id),[profile.position]);
    assert.deepEqual(athleteSnapshot(id,profile.position),{id,version:2,position:profile.position});
    assert.ok(!Object.hasOwn(profile,'primary')&&!Object.hasOwn(profile,'secondary'));
    assert.ok(Object.isFrozen(profile.stats)&&Object.isFrozen(choice));
  }
  assert.deepEqual(counts,{meneur:57,scoreur:53,middle:55,sentry:53,pilier:51});
  for(const c of roster.entries)assert.ok(ATHLETE_CHOICES[c.characterId],c.characterId);
});

test('unique position is shared by appearances and unapproved profiles stay outside the locker',()=>{
  const source=structuredClone(library),base=source.entries.find(c=>c.characterId==='rikka');
  source.entries.push({...base,id:'astraball.rikka.39999998.v1',modelId:'39999998'});
  const unknown=ATHLETES.find(a=>!ATHLETE_CHOICES[a.id]);
  source.entries.push({...base,id:'astraball.unreviewed.39999999.v1',characterId:unknown.id,modelId:'39999999'});
  const r=createRoster(source),appearances=r.entries.filter(c=>c.characterId==='rikka');
  assert.equal(appearances.length,2);assert.equal(appearances[0].athlete,appearances[1].athlete);
  assert.ok(!r.entries.some(c=>c.characterId===unknown.id));
  for(const c of appearances){
    const draft=r.select(r.defaults(),0,c.athlete.position,c.id);
    assert.equal(new Set(Object.values(draft[0]).map(id=>r.get(id).characterId)).size,5);
    assert.throws(()=>r.select(draft,0,'meneur',c.id));
  }
});

test('next-match lineup repair retains compatible choices and never mutates saved units',()=>{
  const input=roster.defaults(),before=structuredClone(input);
  const cana=roster.entries.find(c=>c.characterId==='cana'),lanio=roster.entries.find(c=>c.characterId==='lanio');
  input[0].sentry=cana.id;input[0].scoreur='kaylis';input[0].middle='taulio';
  const normalized=roster.normalize(input);
  assert.equal(normalized[0].sentry,cana.id);
  assert.equal(normalized[0].meneur,before[0].meneur);
  assert.equal(normalized[0].pilier,before[0].pilier);
  assert.equal(normalized[0].scoreur,lanio.id);
  assert.deepEqual(normalized[1],before[1]);
  assert.equal(input[0].scoreur,'kaylis');
  assert.doesNotThrow(()=>createMatch({teams:roster.teams(normalized)}));
  assert.throws(()=>createRoster(null).defaults(),/Incomplete athlete catalogue/);
});

test('all new matches store a single-position snapshot and reject illegal positions',()=>{
  const state=createMatch({teams:roster.teams(roster.defaults())});
  for(const unit of state.units)assert.deepEqual(unit.athlete,{id:unit.athlete.id,version:2,position:unit.role});
  assert.deepEqual(restoreMatch(structuredClone(state)),state);
  const wrong=roster.teams(roster.defaults());wrong[0].players.find(p=>p.role==='scoreur').athleteId='kaylis';
  assert.throws(()=>createMatch({teams:wrong}),/cannot play/);
  const hybrid=structuredClone(state);hybrid.units[0].athlete.secondary='sentry';
  assert.throws(()=>validateState(hybrid),/athlete position/);
  const mismatch=structuredClone(state);mismatch.units[0].athlete.position='pilier';
  assert.throws(()=>validateState(mismatch),/athlete position/);
  const html=renderAthlete(roster.get('kaylis'));
  assert.match(html,/Poste unique/);assert.match(html,/Sentry/);
  assert.doesNotMatch(html,/Secondaire|Principal|undefined/);
});

test('version-one personal matches keep their old positions and stats across reload and play',()=>{
  const old=[
    ['momo','meneur','sentry',[8,3,3,9,6,6]],
    ['kaylis','scoreur','sentry',[9,3,3,5,9,6]],
    ['taulio','pilier','middle',[4,2,9,6,6,9]],
    ['cana','sentry','meneur',[9,4,3,8,5,5]],
    ['balmhyr','pilier','middle',[4,2,9,7,5,9]],
    ['voloden','meneur','middle',[6,3,3,9,6,8]],
    ['lok','scoreur','middle',[5,3,9,4,9,5]],
    ['valazar','meneur','middle',[6,3,4,9,6,7]],
    ['iliane','sentry','meneur',[9,4,3,8,4,6]],
    ['darnako','middle','pilier',[5,3,9,4,6,8]],
  ];
  const oldTeams=TEAMS.map((t,i)=>({...t,players:POSITIONS.map((p,j)=>{
    const id=old[i*5+j][0];return {id:'t'+i+'-'+id,name:id,role:p.id,character:id};
  })}));
  const state=createMatch({seed:408,mode:'hotseat',teams:oldTeams,maxRounds:2});
  for(let i=0;i<state.units.length;i++){
    const [id,primary,secondary,values]=old[i];
    state.units[i].athlete={id,version:1,primary,secondary};
    state.units[i].stats=Object.fromEntries(keys.map((k,j)=>[k,values[j]]));
  }
  validateState(state);
  const frozen=JSON.stringify(state),originalProfiles=state.units.map(u=>[u.role,u.stats,u.athlete]);
  assert.deepEqual(restoreMatch(JSON.parse(frozen)),state);
  roster.fromUnits(state.units);assert.equal(JSON.stringify(state),frozen);
  const resumed=restoreMatch(JSON.parse(frozen));let turns=0;
  while(resumed.status==='playing'){
    assert.ok(++turns<100);
    for(const command of chooseTurn(resumed))assert.equal(applyCommand(resumed,command).ok,true);
    validateState(resumed);
  }
  assert.deepEqual(resumed.units.map(u=>[u.role,u.stats,u.athlete]),originalProfiles);
  assert.equal(resumed.units.find(u=>u.athlete.id==='kaylis').role,'scoreur');
  assert.equal(resumed.units.find(u=>u.athlete.id==='lok').stats.TIR,9);
});
