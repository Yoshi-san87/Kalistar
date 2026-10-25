import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRoster, POSITIONS } from '../src/roster.mjs';
import { ARENAS, getArena, normalizeAppearance } from '../src/appearance.mjs';
import { createProjection } from '../src/projection.mjs';
import { createMatch, restoreMatch, validateState, applyCommand } from '../src/core/game.mjs';
import { chooseTurn } from '../src/core/ai.mjs';
import { ROLE_STATS } from '../data/teams.mjs';
const library=JSON.parse(fs.readFileSync(new URL('../data/sprite-library.json',import.meta.url)));
const roster=createRoster(library);
test('locker resolves all available sprites, retaining the ten original identities',()=>{
  assert.equal(roster.entries.length,10+library.entries.length);
  assert.equal(new Set(roster.entries.map(c=>c.id)).size,roster.entries.length);
  for(const c of roster.entries){assert.ok(Object.isFrozen(c));assert.ok(c.url.startsWith('assets/sprites-'));assert.ok(c.scale>0);}
  assert.equal(roster.get('__proto__'),null);
  const original=createMatch();
  for(const unit of original.units)assert.equal(roster.forUnit(unit).name,unit.name);
  const offline=createRoster(null);
  assert.equal(offline.forUnit({...original.units[0],character:'unavailable-atlas'}).id,original.units[0].id.slice(3));
  assert.deepEqual(roster.fromUnits(original.units),roster.defaults());
});
test('invalid, missing or duplicate lineups fall back per team without mutating preferences',()=>{
  for(const input of [null,{},[],['bad'],[{meneur:'__proto__'}]]){
    assert.deepEqual(roster.normalize(input),roster.defaults());
  }
  const selected=roster.defaults(),before=structuredClone(selected);
  selected[0].scoreur='momo';
  assert.deepEqual(roster.normalize(selected),before);
  assert.equal(selected[0].scoreur,'momo');
  assert.throws(()=>roster.select(before,2,'meneur','momo'));
  assert.throws(()=>roster.select(before,0,'wrong','momo'));
  assert.throws(()=>roster.select(before,0,'meneur','unknown'));
});
test('selecting an already assigned character swaps slots, never duplicates a teammate',()=>{
  const original=roster.defaults(),selected=roster.select(original,0,'meneur','kaylis');
  assert.equal(selected[0].meneur,'kaylis');assert.equal(selected[0].scoreur,'momo');
  assert.equal(original[0].meneur,'momo');
  assert.equal(new Set(Object.values(selected[0])).size,5);
  assert.deepEqual(selected[1],original[1]);
});
test('all available appearances can occupy every role with exactly the original role stats',()=>{
  for(const c of roster.entries)for(const p of POSITIONS){
    const selection=roster.select(roster.defaults(),0,p.id,c.id);
    const state=createMatch({teams:roster.teams(selection)});
    const unit=state.units.find(u=>u.team===0&&u.role===p.id);
    assert.equal(unit.character,c.id);assert.equal(unit.name,c.name);
    assert.equal(roster.forUnit(unit),c);
    assert.deepEqual(unit.stats,ROLE_STATS[p.id]);validateState(state);
  }
});
test('custom team state survives save/reload, goals and complete AI matches',()=>{
  for(let n=0;n<20;n++){
    const selection=[0,1].map(team=>Object.fromEntries(POSITIONS.map((p,i)=>[p.id,roster.entries[(n+team*7+i)%roster.entries.length].id])));
    const state=createMatch({seed:n+6000,maxRounds:3,teams:roster.teams(selection)});
    assert.deepEqual(roster.fromUnits(state.units),selection);
    const identities=state.units.map(u=>[u.id,u.name,u.character,u.role]);
    let steps=0;
    while(state.status==='playing'){
      const plan=chooseTurn(state);assert.ok(plan&&++steps<800);
      for(const command of plan){
        const result=applyCommand(state,command);assert.equal(result.ok,true,JSON.stringify(command));validateState(state);
      }
      assert.deepEqual(restoreMatch(JSON.parse(JSON.stringify(state))),state);
    }
    assert.deepEqual(state.units.map(u=>[u.id,u.name,u.character,u.role]),identities);
  }
});
test('malformed team input cannot override stats or omit a required position',()=>{
  assert.throws(()=>createMatch({teams:[]}));
  const teams=roster.teams(roster.defaults());teams[0].players.pop();assert.throws(()=>createMatch({teams}));
  const altered=roster.teams(roster.defaults());altered[0].players[0].stats={TIR:99};
  assert.deepEqual(createMatch({teams:altered}).units[0].stats,ROLE_STATS.meneur);
});
test('Rhinoz is cosmetic, white-lined and both arena projections keep exact picking',()=>{
  assert.equal(getArena('rhinoz').lines,0xffffff);
  assert.equal(getArena('invalid').id,'resonances');
  assert.equal(normalizeAppearance({arena:'rhinoz'}).arena,'rhinoz');
  const allowed=JSON.parse(fs.readFileSync(new URL('../runtime-files.json',import.meta.url)));
  for(const arena of ARENAS){
    assert.ok(Object.isFrozen(arena));assert.ok(!('stats' in arena));
    for(const view of ['horizontal','isometric']){
      assert.ok(allowed.includes(arena[view]));
      for(const h of [0,60,100]){
        const projection=createProjection(view,h,arena.ground);
        for(let y=0;y<7;y++)for(let x=0;x<13;x++){
          const point=projection.center(x,y);assert.deepEqual(projection.pick(point.x,point.y),{x,y});
        }
      }
    }
  }
  const media=JSON.parse(fs.readFileSync(new URL('../sources/rhinoz-v1/media-report.json',import.meta.url)));
  assert.equal(media.files.length,2);assert.ok(media.files.every(file=>file.bytes<650000));
});
