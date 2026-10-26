import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRoster, POSITIONS } from '../src/roster.mjs';
import { ARENAS, getArena, normalizeAppearance } from '../src/appearance.mjs';
import { createProjection } from '../src/projection.mjs';
import { createMatch, restoreMatch, validateState, applyCommand, legalMoves, previewAction, getInitiative } from '../src/core/game.mjs';
import { chooseTurn } from '../src/core/ai.mjs';
import { TEAMS, ROLE_STATS } from '../data/teams.mjs';
import { ATHLETES, ATHLETE_VERSION, getAthlete, canPlayPosition, ratingBudget } from '../data/athletes.mjs';
import { COLLABORATION_MEASUREMENTS } from '../data/collaboration-measurements.mjs';
import { ADAPTED_HEIGHTS } from '../data/athlete-measurements.mjs';
import { measurementsFor, renderMeasurements } from '../src/athlete-view.mjs';
const library=JSON.parse(fs.readFileSync(new URL('../data/sprite-library.json',import.meta.url)));
const roster=createRoster(library);
const byCharacter=id=>{
  const character=roster.entries.find(c=>c.characterId===id);
  assert.ok(character,'playable character '+id);return character;
};
test('locker resolves all available sprites, retaining the ten original identities',()=>{
  assert.equal(roster.entries.length,269);
  assert.equal(roster.entries.length,library.entries.length);
  assert.equal(new Set(roster.entries.map(c=>c.characterId)).size,roster.entries.length);
  for(const id of ['momo','kaylis','taulio','cana','balmhyr','voloden','lok','darnako','iliane','valazar'])assert.equal(roster.get(id).id,id,'v1 save IDs preserved');
  assert.equal(new Set(roster.entries.map(c=>c.id)).size,roster.entries.length);
  for(const c of roster.entries){assert.ok(Object.isFrozen(c));assert.ok(c.url.startsWith('assets/sprites-'));assert.ok(c.scale>0);}
  assert.equal(roster.get('__proto__'),null);
  const original=createMatch();
  for(const unit of original.units)assert.equal(roster.forUnit(unit).name,unit.name);
  const offline=createRoster(null);
  assert.equal(offline.entries.length,10);
  for(const unit of original.units)assert.equal(offline.forUnit(unit).name,unit.name);
  assert.equal(offline.forUnit({...original.units[0],character:'unavailable-atlas'}).id,original.units[0].id.slice(3));
  assert.throws(()=>offline.defaults(),'historical appearances alone cannot supply the new teams');
  assert.throws(()=>createRoster({...library,entries:library.entries.filter(c=>getAthlete(c.characterId).position!=='scoreur')}).defaults(),'a catalogue without a scoreur cannot supply a complete team');
  assert.deepEqual(roster.fromUnits(original.units),roster.normalize(TEAMS.map(t=>Object.fromEntries(t.players.map(p=>[p.role,p.id.slice(3)])))));
});

test('new default teams follow the confirmed single positions',()=>{
  const identities=roster.defaults().map(team=>Object.fromEntries(POSITIONS.map(p=>[p.id,roster.get(team[p.id]).characterId])));
  assert.deepEqual(identities,[
    {meneur:'momo',scoreur:'lanio',middle:'bex-kalistar',sentry:'kaylis',pilier:'taulio'},
    {meneur:'ombrine-kalistar',scoreur:'nereth-kalistar',middle:'varkhen-kalistar',sentry:'voloden',pilier:'lok'},
  ]);
  const state=createMatch({teams:roster.teams(roster.defaults())});
  assert.deepEqual(roster.fromUnits(state.units),roster.defaults());
  for(const unit of state.units)assert.equal(unit.athlete.position,unit.role);
});

test('invalid, missing or duplicate slots retain valid preferences without mutation',()=>{
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
  const partial=[{meneur:byCharacter('nell-kalistar').id,scoreur:'momo',middle:byCharacter('riko-kalistar').id,sentry:'cana',pilier:'unknown'},before[1]];
  const snapshot=structuredClone(partial),expected=structuredClone(before);
  Object.assign(expected[0],{meneur:partial[0].meneur,middle:partial[0].middle,sentry:'cana'});
  assert.deepEqual(roster.normalize(partial),expected);
  assert.deepEqual(partial,snapshot,'normalization never rewrites stored preferences');
});

test('legacy preferences preserve valid slots before relocating displaced athletes',()=>{
  const legacy=[
    {meneur:'momo',scoreur:'kaylis',middle:'taulio',sentry:'cana',pilier:'balmhyr'},
    {meneur:'voloden',scoreur:'lok',middle:'valazar',sentry:'iliane',pilier:'darnako'},
  ];
  const snapshot=structuredClone(legacy),expected=roster.defaults();
  Object.assign(expected[0],{sentry:'cana',pilier:'balmhyr'});
  Object.assign(expected[1],{sentry:'iliane',pilier:'darnako'});
  assert.deepEqual(roster.normalize(legacy),expected,'displaced Kaylis, Taulio, Voloden and Lok cannot evict valid occupants');
  assert.deepEqual(legacy,snapshot);
  const displaced=[{meneur:'cana',middle:'taulio'},expected[1]],before=structuredClone(displaced);
  const relocated=roster.defaults();relocated[0].sentry='cana';relocated[1]=expected[1];
  assert.deepEqual(roster.normalize(displaced),relocated,'vacant positions accept displaced athletes before defaults');
  assert.deepEqual(displaced,before);
  assert.deepEqual(roster.normalize(roster.normalize(legacy)),expected,'migration is idempotent');
});

test('same-position replacements preserve the other slots; secondary-position swaps are rejected',()=>{
  const original=roster.defaults(),before=structuredClone(original),nell=byCharacter('nell-kalistar');
  const selected=roster.select(original,0,'meneur',nell.id);
  assert.deepEqual(selected,[{...original[0],meneur:nell.id},original[1]]);
  assert.deepEqual(original,before);
  assert.equal(new Set(Object.values(selected[0])).size,5);
  assert.deepEqual(roster.select(selected,0,'sentry','cana'),[{...selected[0],sentry:'cana'},original[1]]);
  for(const [role,id] of [['meneur','cana'],['sentry','momo'],['scoreur','kaylis'],['middle','taulio']]){
    assert.equal(roster.canSelect(original,0,role,id),false);
    assert.throws(()=>roster.select(original,0,role,id));
    assert.deepEqual(original,before,'rejected choices leave the draft untouched');
  }
});
test('all 269 available athletes have personal stats in exactly their authorized position',()=>{
  const tested=new Set();
  for(const c of roster.entries)for(const p of POSITIONS){
    assert.equal(canPlayPosition(c.athlete,p.id),c.athlete.position===p.id);
    if(c.athlete.position!==p.id){
      assert.equal(roster.canSelect(roster.defaults(),0,p.id,c.id),false);
      assert.throws(()=>roster.select(roster.defaults(),0,p.id,c.id));
      const wrong=roster.teams(roster.defaults());
      wrong[0].players.find(player=>player.role===p.id).athleteId=c.characterId;
      assert.throws(()=>createMatch({teams:wrong}),c.id+' cannot start at '+p.id);continue;
    }
    const selection=roster.select(roster.defaults(),0,p.id,c.id);
    const state=createMatch({teams:roster.teams(selection)});
    const unit=state.units.find(u=>u.team===0&&u.role===p.id);
    assert.equal(unit.character,c.id);assert.equal(unit.name,c.name);
    assert.equal(roster.forUnit(unit),c);
    assert.deepEqual(unit.stats,c.athlete.stats);
    assert.deepEqual(unit.athlete,{id:c.characterId,version:2,position:p.id});validateState(state);
    assert.deepEqual(restoreMatch(JSON.parse(JSON.stringify(state))),state);
    tested.add(c.characterId);
  }
  assert.equal(tested.size,269);
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
  assert.equal(ATHLETE_VERSION,2);
  assert.equal(ATHLETES.length,368);
  assert.equal(new Set(ATHLETES.map(a=>a.id)).size,368);
  for(const a of ATHLETES){
    assert.equal(ratingBudget(a.stats),38,a.id);assert.equal(a.version,2);
    assert.ok(POSITIONS.some(p=>p.id===a.position));
    assert.equal(Object.hasOwn(a,'primary'),false);assert.equal(Object.hasOwn(a,'secondary'),false);
    for(const p of POSITIONS)assert.equal(canPlayPosition(a,p.id),a.position===p.id,a.id+' / '+p.id);
    assert.ok(Object.values(a.stats).every(n=>Number.isInteger(n)&&n>=1&&n<=9));
    assert.ok(a.stats.MOB>=2&&a.stats.MOB<=4);assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.stats));
  }
  for(const role of POSITIONS)assert.ok(new Set(ATHLETES.filter(a=>a.position===role.id).map(a=>JSON.stringify(a.stats))).size>=3);
  assert.equal(ATHLETES.filter(a=>!roster.entries.some(c=>c.characterId===a.id)).length,99);
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
  assert.equal(roster.canSelect(roster.defaults(),0,'sentry','momo'),false);
  assert.throws(()=>roster.select(roster.defaults(),0,'sentry','momo'));
  const wrong=roster.teams(roster.defaults());wrong[0].players[0].athleteId='unknown';assert.throws(()=>createMatch({teams:wrong}));
  wrong[0].players[0].athleteId='balmhyr';assert.throws(()=>createMatch({teams:wrong}));
});

test('legacy matches and athlete snapshots are not recomputed on reload',()=>{
  const legacy=createMatch();
  assert.deepEqual(legacy.units.map(({id,name,role})=>({id,name,role})),TEAMS.flatMap(team=>team.players));
  for(const unit of legacy.units){assert.deepEqual(unit.stats,ROLE_STATS[unit.role]);assert.equal(Object.hasOwn(unit,'athlete'),false);}
  assert.deepEqual(restoreMatch(structuredClone(legacy)),legacy);
  const swapped=structuredClone(TEAMS);
  swapped[0].players.find(p=>p.id==='t0-momo').role='sentry';
  swapped[0].players.find(p=>p.id==='t0-cana').role='meneur';
  const saved=createMatch({teams:swapped}),sentry=saved.units.find(u=>u.id==='t0-momo');
  sentry.athlete={id:'momo',version:1,primary:'meneur',secondary:'sentry'};
  sentry.stats={VIT:8,MOB:3,FOR:3,PAS:9,TIR:6,DEF:6};
  const meneur=saved.units.find(u=>u.id==='t0-cana');
  meneur.athlete={id:'cana',version:1,primary:'sentry',secondary:'meneur'};
  meneur.stats={VIT:9,MOB:4,FOR:3,PAS:8,TIR:5,DEF:5};
  saved.activeId=getInitiative(saved).find(u=>!u.acted).id;validateState(saved);
  assert.deepEqual(restoreMatch(structuredClone(saved)),saved,'saved secondary positions remain valid with their original ratings');
  const state=createMatch({teams:roster.teams(roster.defaults())});
  state.units[0].stats.PAS=7;state.units[0].athlete.version=99;
  assert.deepEqual(restoreMatch(structuredClone(state)),state);
});

test('personal ratings actually change movement, initiative, range and impact probabilities',()=>{
  function isolated(id,role){
    assert.equal(getAthlete(id).position,role,'fixture uses the confirmed position');
    const selection=roster.select(roster.defaults(),0,role,byCharacter(id).id);
    const state=createMatch({teams:roster.teams(selection)});
    while(state.phase==='placement')assert.equal(applyCommand(state,{type:'ready',team:state.placement.team}).ok,true);
    const unit=state.units.find(u=>u.team===0&&u.role===role);
    state.units.forEach(u=>u.acted=u.id!==unit.id);state.activeId=unit.id;
    state.ball={holderId:unit.id,x:unit.x,y:unit.y};validateState(state);
    return {state,unit};
  }
  const momo=isolated('momo','meneur'),cana=isolated('cana','sentry');
  assert.equal(Math.max(...legalMoves(momo.state).map(m=>m.path.length)),3);
  assert.equal(Math.max(...legalMoves(cana.state).map(m=>m.path.length)),4);
  assert.equal(getInitiative(cana.state).find(u=>u.id===cana.unit.id).speed,9);
  assert.equal(getInitiative(momo.state).find(u=>u.id===momo.unit.id).speed,8);
  const targetId=momo.state.units.find(u=>u.team===0&&u.role==='scoreur').id;
  assert.equal(previewAction(momo.state,{type:'pass',targetId}).range,7);
  assert.equal(previewAction(cana.state,{type:'pass',targetId}).range,7);
  const light=isolated('riko-kalistar','middle'),heavy=isolated('jelly-joe','middle');
  for(const setup of [light,heavy]){
    Object.assign(setup.unit,{x:5,y:3});const opponent=setup.state.units.find(u=>u.team===1&&u.role==='meneur');Object.assign(opponent,{x:6,y:3});
    setup.state.ball={holderId:setup.unit.id,x:5,y:3};
    const charge=previewAction(setup.state,{type:'charge',targetId:opponent.id});
    assert.equal(charge.legal,true);setup.chance=charge.chance;validateState(setup.state);
  }
  assert.deepEqual([light.chance,heavy.chance],[45,75]);
  assert.ok(heavy.chance>light.chance);
  for(const setup of [light,heavy])setup.state.ball={holderId:setup.unit.id,x:setup.unit.x,y:setup.unit.y};
  const recipient=light.state.units.find(u=>u.team===0&&u.role==='scoreur').id;
  assert.equal(previewAction(light.state,{type:'pass',targetId:recipient}).range,7);
  assert.equal(previewAction(heavy.state,{type:'pass',targetId:recipient}).range,6);
  const incoming=[];
  for(const setup of [light,heavy]){
    const attacker=setup.state.units.find(u=>u.team===1&&u.role==='meneur');
    setup.state.units.forEach(u=>u.acted=u.id!==attacker.id);setup.state.activeId=attacker.id;
    const charge=previewAction(setup.state,{type:'charge',targetId:setup.unit.id});
    assert.equal(charge.legal,true);incoming.push(charge.chance);
    validateState(setup.state);
  }
  assert.ok(incoming[0]>incoming[1],'personal DEF changes resistance');
  assert.deepEqual(incoming,[50,45]);
  const shots=[];
  for(const id of ['cana','kaylis']){
    const setup=isolated(id,'sentry');Object.assign(setup.unit,{x:8,y:4});
    setup.state.ball={holderId:setup.unit.id,x:8,y:4};validateState(setup.state);
    const shot=previewAction(setup.state,{type:'shoot',x:12,y:4});
    assert.equal(shot.legal,true);assert.equal(shot.blockerId,null);shots.push(shot);
  }
  assert.ok(shots[1].range>shots[0].range,'personal TIR still changes range');
  assert.deepEqual(shots.map(shot=>shot.chance),[100,100],'a clear in-range shot is certain for either athlete');
});

test('documentary measurements stay intact; missing heights receive explicit Kalistar adaptations',()=>{
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
    const resolved=measurementsFor(getAthlete(id));
    if(m.heightCm!==null)assert.equal(resolved,m,'documented record is returned unchanged');
    else {
      assert.equal(resolved.heightCm,ADAPTED_HEIGHTS[id]);assert.equal(resolved.heightStatus,'adapted');
      assert.match(resolved.heightNote,/non canonique/);
      const {heightStatus,heightNote,...record}=resolved;
      assert.deepEqual({...record,heightCm:null},m,'documentary fields, sources and unknown mass are preserved');
      assert.match(renderMeasurements(getAthlete(id)),/Taille d.adaptation Kalistar/);
      assert.match(renderMeasurements(getAthlete(id)),/\u2248 /);
    }
  }
  const unknown=Object.keys(COLLABORATION_MEASUREMENTS).find(id=>COLLABORATION_MEASUREMENTS[id].status==='unknown');
  assert.match(renderMeasurements(getAthlete(unknown)),/Non renseign/);
  assert.match(renderMeasurements(getAthlete('ruby')),/Longueur/);
  assert.equal(Object.keys(ADAPTED_HEIGHTS).length,177);
  for(const a of ATHLETES)assert.ok(measurementsFor(a).heightCm>0,'height coverage: '+a.id);
  for(const [id,height] of Object.entries(ADAPTED_HEIGHTS)){
    assert.ok(getAthlete(id));assert.equal(COLLABORATION_MEASUREMENTS[id].heightCm,null,'never mask a documented height');
    assert.ok(Number.isInteger(height)&&height>0);
  }
  assert.equal(getAthlete('lanio').measurements.heightCm,182);
  assert.equal(getAthlete('gen').measurements.heightCm,159);
  assert.equal(getAthlete('lanio').measurements.weightKg,49);
  assert.equal(getAthlete('gen').measurements.weightKg,98);
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
