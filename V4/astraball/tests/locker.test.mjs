import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRoster, POSITIONS } from '../src/roster.mjs';
import { ARENAS, getArena, normalizeAppearance } from '../src/appearance.mjs';
import { createProjection } from '../src/projection.mjs';
import { createMatch, restoreMatch, validateState, applyCommand, legalMoves, previewAction, getInitiative } from '../src/core/game.mjs';
import { chooseTurn } from '../src/core/ai.mjs';
import { ROLE_STATS } from '../data/teams.mjs';
import { ATHLETES, getAthlete, canPlayPosition, ratingBudget } from '../data/athletes.mjs';
import { COLLABORATION_MEASUREMENTS } from '../data/collaboration-measurements.mjs';
import { measurementsFor, renderMeasurements } from '../src/athlete-view.mjs';
const library=JSON.parse(fs.readFileSync(new URL('../data/sprite-library.json',import.meta.url)));
const roster=createRoster(library);
test('locker resolves all available sprites, retaining the ten original identities',()=>{
  assert.equal(roster.entries.length,library.entries.length);
  assert.equal(new Set(roster.entries.map(c=>c.characterId)).size,roster.entries.length);
  for(const id of ['momo','kaylis','taulio','cana','balmhyr','voloden','lok','darnako','iliane','valazar'])assert.equal(roster.get(id).id,id,'v1 save IDs preserved');
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
test('compatible swaps preserve five identities and the other team',()=>{
  const original=roster.defaults(),selected=roster.select(original,0,'meneur','cana');
  assert.equal(selected[0].meneur,'cana');assert.equal(selected[0].sentry,'momo');
  assert.equal(original[0].meneur,'momo');
  assert.equal(new Set(Object.values(selected[0])).size,5);
  assert.deepEqual(selected[1],original[1]);
});
test('all available athletes have personal stats in their authorized roles',()=>{
  for(const c of roster.entries)for(const p of POSITIONS){
    if(!canPlayPosition(c.athlete,p.id)){assert.equal(roster.canSelect(roster.defaults(),0,p.id,c.id),false);continue;}
    let draft=roster.defaults();
    for(const other of POSITIONS)if(other.id!==p.id&&roster.get(draft[0][other.id]).characterId===c.characterId){
      const replacement=roster.entries.find(e=>e.characterId!==c.characterId&&roster.canSelect(draft,0,other.id,e.id)&&!Object.values(draft[0]).includes(e.id));
      draft=roster.select(draft,0,other.id,replacement.id);
    }
    const selection=roster.select(draft,0,p.id,c.id);
    const state=createMatch({teams:roster.teams(selection)});
    const unit=state.units.find(u=>u.team===0&&u.role===p.id);
    assert.equal(unit.character,c.id);assert.equal(unit.name,c.name);
    assert.equal(roster.forUnit(unit),c);
    assert.deepEqual(unit.stats,c.athlete.stats);assert.equal(unit.athlete.id,c.characterId);validateState(state);
  }
});
test('custom team state survives save/reload, goals and complete AI matches',()=>{
  for(let n=0;n<20;n++){
    let rand=n+7;const selection=[0,1].map(()=>roster.shuffle(()=>((rand=(Math.imul(rand,1664525)+1013904223)>>>0)/4294967296)));
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
  assert.deepEqual(createMatch({teams:altered}).units[0].stats,getAthlete('momo').stats);
});
test('authored profiles are bounded, equal-budget and differentiated',()=>{
  assert.equal(ATHLETES.length,368);
  assert.equal(new Set(ATHLETES.map(a=>a.id)).size,368);
  for(const a of ATHLETES){
    assert.equal(ratingBudget(a.stats),38,a.id);assert.notEqual(a.primary,a.secondary);
    assert.ok(POSITIONS.some(p=>p.id===a.primary)&&POSITIONS.some(p=>p.id===a.secondary));
    assert.ok(Object.values(a.stats).every(n=>Number.isInteger(n)&&n>=1&&n<=9));
    assert.ok(a.stats.MOB>=2&&a.stats.MOB<=4);assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.stats));
  }
  for(const role of POSITIONS)assert.ok(new Set(ATHLETES.filter(a=>a.primary===role.id).map(a=>JSON.stringify(a.stats))).size>=3);
  assert.equal(getAthlete('momo').measurements.status,'estimated');
  assert.equal(getAthlete('ruby').measurements.heightKind,'length');
  assert.equal(getAthlete('cloud-ff7').measurements.heightCm,null);
});

test('random teams are compatible and unique; invalid position changes are rejected',()=>{
  for(let seed=1;seed<=300;seed++){
    let n=seed;const team=roster.shuffle(()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296));
    assert.equal(new Set(Object.values(team).map(id=>roster.get(id).characterId)).size,5);
    for(const p of POSITIONS)assert.ok(canPlayPosition(roster.get(team[p.id]).athlete,p.id));
    assert.deepEqual(roster.normalize([team,team]),[team,team]);
  }
  assert.throws(()=>roster.shuffle(()=>1));
  assert.equal(roster.canSelect(roster.defaults(),0,'sentry','kaylis'),false);
  assert.throws(()=>roster.select(roster.defaults(),0,'sentry','kaylis'),/swap/);
  const wrong=roster.teams(roster.defaults());wrong[0].players[0].athleteId='unknown';assert.throws(()=>createMatch({teams:wrong}));
  wrong[0].players[0].athleteId='balmhyr';assert.throws(()=>createMatch({teams:wrong}));
});

test('legacy matches and athlete snapshots are not recomputed on reload',()=>{
  const legacy=createMatch();assert.deepEqual(legacy.units[0].stats,ROLE_STATS.meneur);
  assert.deepEqual(restoreMatch(structuredClone(legacy)),legacy);
  const state=createMatch({teams:roster.teams(roster.defaults())});
  state.units[0].stats.PAS=7;state.units[0].athlete.version=99;
  assert.deepEqual(restoreMatch(structuredClone(state)),state);
});

test('personal ratings actually change movement, initiative, range and impact probabilities',()=>{
  function isolated(id,role){
    const teams=roster.teams(roster.defaults());
    for(const t of teams)for(const p of t.players)delete p.athleteId;
    const player=teams[0].players.find(p=>p.role===role);player.athleteId=id;
    const state=createMatch({teams});
    while(state.phase==='placement')applyCommand(state,{type:'ready',team:state.placement.team});
    state.units.forEach(u=>u.acted=u.id!==player.id);state.activeId=player.id;
    return {state,unit:state.units.find(u=>u.id===player.id)};
  }
  const momo=isolated('momo','meneur'),cana=isolated('cana','meneur');
  assert.equal(Math.max(...legalMoves(momo.state).map(m=>m.path.length)),3);
  assert.equal(Math.max(...legalMoves(cana.state).map(m=>m.path.length)),4);
  assert.equal(getInitiative(cana.state).find(u=>u.id===cana.unit.id).speed,9);
  assert.equal(getInitiative(momo.state).find(u=>u.id===momo.unit.id).speed,8);
  const targetId=momo.state.units.find(u=>u.team===0&&u.role==='scoreur').id;
  assert.equal(previewAction(momo.state,{type:'pass',targetId}).range,7);
  assert.equal(previewAction(cana.state,{type:'pass',targetId}).range,7);
  const light=isolated('valazar','middle'),heavy=isolated('taulio','middle');
  for(const setup of [light,heavy]){
    Object.assign(setup.unit,{x:5,y:3});const opponent=setup.state.units.find(u=>u.team===1&&u.role==='meneur');Object.assign(opponent,{x:6,y:3});
    setup.chance=previewAction(setup.state,{type:'charge',targetId:opponent.id}).chance;validateState(setup.state);
  }
  assert.ok(heavy.chance>light.chance);
  for(const setup of [light,heavy])setup.state.ball={holderId:setup.unit.id,x:setup.unit.x,y:setup.unit.y};
  const recipient=light.state.units.find(u=>u.team===0&&u.role==='scoreur').id;
  assert.equal(previewAction(light.state,{type:'pass',targetId:recipient}).range,7);
  assert.equal(previewAction(heavy.state,{type:'pass',targetId:recipient}).range,6);
  const incoming=[];
  for(const setup of [light,heavy]){
    const attacker=setup.state.units.find(u=>u.team===1&&u.role==='meneur');
    setup.state.units.forEach(u=>u.acted=u.id!==attacker.id);setup.state.activeId=attacker.id;
    incoming.push(previewAction(setup.state,{type:'charge',targetId:setup.unit.id}).chance);
    validateState(setup.state);
  }
  assert.ok(incoming[0]>incoming[1],'personal DEF changes resistance');
  const shots=[];
  for(const id of ['cana','kaylis']){
    const setup=isolated(id,'sentry');Object.assign(setup.unit,{x:8,y:4});
    setup.state.ball={holderId:setup.unit.id,x:8,y:4};validateState(setup.state);
    const shot=previewAction(setup.state,{type:'shoot',x:12,y:4});
    assert.equal(shot.legal,true);assert.equal(shot.blockerId,null);shots.push(shot);
  }
  assert.ok(shots[1].range>shots[0].range&&shots[1].chance>shots[0].chance,'personal TIR changes range and accuracy');
});

test('measurements are separate from ratings, missing data remains null and every number is attributed',()=>{
  const originals=JSON.parse(fs.readFileSync(new URL('../research/kalistar-measurements.json',import.meta.url))).references;
  assert.equal(originals.length,130);assert.equal(Object.keys(COLLABORATION_MEASUREMENTS).length,238);
  for(const ref of originals){
    assert.match(ref.referenceSha256,/^[a-f0-9]{64}$/);assert.ok(ref.reference.startsWith('V'));
    const a=getAthlete(ref.characterId);assert.equal(a.measurements.status,'estimated');
    assert.ok(a.measurements.heightCm>0&&a.measurements.weightKg>0);
    assert.match(renderMeasurements(a),/Estimations visuelles/);
  }
  for(const [id,m] of Object.entries(COLLABORATION_MEASUREMENTS)){
    assert.ok(getAthlete(id));assert.ok(['sourced','unknown'].includes(m.status));
    assert.ok(m.continuity&&m.note);
    for(const key of ['heightCm','weightKg']){
      assert.ok(m[key]===null||Number.isFinite(m[key])&&m[key]>0,id+' '+key);
      if(m[key]!==null)assert.ok(m.sources.some(s=>s.fields.includes(key)),id+' '+key+' source');
    }
    if(m.status==='unknown'){assert.equal(m.heightCm,null);assert.equal(m.weightKg,null);assert.deepEqual(m.sources,[]);}
    else assert.ok(m.heightCm!==null||m.weightKg!==null);
    for(const s of m.sources){assert.ok(['official','secondary'].includes(s.type));assert.match(s.url,/^https:\/\//);assert.ok(s.title);}
    assert.deepEqual(measurementsFor(getAthlete(id)),m);
  }
  const unknown=Object.keys(COLLABORATION_MEASUREMENTS).find(id=>COLLABORATION_MEASUREMENTS[id].status==='unknown');
  assert.match(renderMeasurements(getAthlete(unknown)),/Non renseign/);
  assert.match(renderMeasurements(getAthlete('ruby')),/Longueur/);
});

test('pixel venues default to Kalistopolis HD-2D while explicit classics retain isometric preferences',()=>{
  assert.equal(ARENAS.length,21);
  const pixels=ARENAS.filter(arena=>arena.pixel),classics=ARENAS.filter(arena=>!arena.pixel);
  assert.equal(pixels.length,19);
  assert.deepEqual(classics.map(arena=>arena.id),['resonances','rhinoz']);
  for(const id of [undefined,null,'','invalid','__proto__'])assert.equal(getArena(id).id,'kalistopolis-official');
  assert.deepEqual(normalizeAppearance(),{arena:'kalistopolis-official',view:'horizontal',height:60,ball:'founders'});
  assert.deepEqual(normalizeAppearance({arena:'invalid',view:'isometric'}),{arena:'kalistopolis-official',view:'horizontal',height:60,ball:'founders'});
  for(const arena of pixels){
    assert.deepEqual(arena.views,['horizontal'],arena.id+' only supports its authored HD-2D view');
    for(const view of ['horizontal','isometric','invalid']){
      const input={arena:arena.id,view,height:35,ball:'orbital'};
      assert.deepEqual(normalizeAppearance(input),{...input,view:'horizontal'});
      assert.equal(input.view,view,'normalizing preferences does not mutate the draft');
    }
  }
  for(const arena of classics)for(const view of ['horizontal','isometric']){
    const input={arena:arena.id,view,height:35,ball:'orbital'};
    assert.deepEqual(normalizeAppearance(input),input,arena.id+' preserves '+view);
  }
});

test('Rhinoz stays white-lined and every supported arena projection keeps exact picking',()=>{
  assert.equal(getArena('rhinoz').lines,0xffffff);
  assert.equal(getArena('invalid').id,'kalistopolis-official');
  assert.equal(normalizeAppearance({arena:'rhinoz'}).arena,'rhinoz');
  const allowed=JSON.parse(fs.readFileSync(new URL('../runtime-files.json',import.meta.url)));
  for(const arena of ARENAS){
    assert.ok(Object.isFrozen(arena));assert.ok(!('stats' in arena));
    for(const view of arena.views||['horizontal','isometric']){
      assert.ok(allowed.includes(arena[view]));
      for(const h of [0,60,100]){
        const projection=createProjection(view,h,arena.ground,arena);
        if(arena.pixel){
          assert.equal(projection.verticalScale,1,arena.id+' framing never stretches the playing surface');
          assert.equal(projection.groundY(projection.top),projection.top);
          assert.equal(projection.groundY(projection.bottom),projection.bottom);
        }
        for(let y=0;y<7;y++)for(let x=0;x<13;x++){
          const point=projection.center(x,y);assert.deepEqual(projection.pick(point.x,point.y),{x,y});
        }
      }
    }
  }
  const media=JSON.parse(fs.readFileSync(new URL('../sources/rhinoz-v1/media-report.json',import.meta.url)));
  assert.equal(media.files.length,2);assert.ok(media.files.every(file=>file.bytes<650000));
});
