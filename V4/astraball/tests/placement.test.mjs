import assert from 'node:assert/strict';
import test from 'node:test';
import { createMatch, restoreMatch, validateState, activeUnit, controllingTeam, getUnit, getInitiative,
  legalPlacements, legalMoves, canPosition, previewAction, applyCommand } from '../src/core/game.mjs';
import { inOwnHalf, inDefense } from '../src/core/geometry.mjs';
import { chooseTurn } from '../src/core/ai.mjs';

const unit = (state, team, role) => state.units.find(u => u.team === team && u.role === role);
function apply(state, cmd) {
  const result = applyCommand(state, cmd);
  assert.equal(result.ok, true, JSON.stringify(cmd) + ': ' + result.error);
  validateState(state);
  return result;
}
function reject(state, cmd, reason) {
  const before = structuredClone(state), result = applyCommand(state, cmd);
  assert.equal(result.ok, false);
  if(reason) assert.equal(result.error, reason);
  assert.deepEqual(state, before);
}
function ready(state) {
  while(state.phase === 'placement') apply(state, { type:'ready', team:controllingTeam(state) });
  return state;
}
function moveFixture(state, who, x, y) {
  Object.assign(who, { x,y });
  if(state.ball.holderId === who.id) Object.assign(state.ball, { x,y });
}
function activate(state, who) {
  for(const u of state.units) u.acted=false;
  for(const entry of getInitiative(state)) {
    if(entry.id===who.id) break;
    getUnit(state,entry.id).acted=true;
  }
  state.activeId=who.id;state.moved=false;
}

test('opening blocks play until both sides validate, with no spent activation or entropy', () => {
  const state=createMatch({seed:38,mode:'hotseat'}), rng=state.rng, active=state.activeId;
  assert.equal(state.phase,'placement');assert.equal(activeUnit(state),null);
  assert.deepEqual(legalMoves(state),[]);assert.equal(controllingTeam(state),0);
  assert.equal(getInitiative(state).filter(u=>u.active).length,0);
  for(const type of ['wait','move','pass','charge','shoot']) reject(state,{type},'placement-required');
  reject(state,{type:'ready',team:1},'placement-team');
  apply(state,{type:'ready',team:0});
  assert.equal(controllingTeam(state),1);assert.equal(activeUnit(state),null);
  reject(state,{type:'ready',team:0},'placement-team');
  apply(state,{type:'ready',team:1});
  assert.equal(state.phase,'play');assert.equal(state.placement,null);
  assert.equal(activeUnit(state).id,active);assert.equal(state.rng,rng);
  assert.ok(state.units.every(u=>!u.acted));assert.equal(state.round,1);
  reject(state,{type:'ready',team:0});
});

test('every placement obeys ownership, own half, occupancy and the one-support capacity', () => {
  for(const team of [0,1]) {
    const state=createMatch();if(team===1)apply(state,{type:'ready',team:0});
    for(const u of state.units.filter(u=>u.team===team)) {
      const before=structuredClone(state), cells=legalPlacements(state,u.id);
      assert.deepEqual(state,before);assert.ok(cells.length>0);
      for(const cell of cells) {
        assert.ok(inOwnHalf(team,cell.x,cell.y));assert.notEqual(cell.x,6);
        assert.ok(!state.units.some(other=>other.x===cell.x&&other.y===cell.y));
        apply(structuredClone(state),{type:'place',unitId:u.id,...cell});
      }
      for(const x of [0,6,12,team===0?7:5])reject(state,{type:'place',unitId:u.id,x,y:4},'own-half-required');
      reject(state,{type:'place',unitId:u.id,x:u.x,y:u.y},'occupied');
    }
    const enemy=unit(state,1-team,'meneur');
    assert.deepEqual(legalPlacements(state,enemy.id),[]);
    reject(state,{type:'place',unitId:enemy.id,x:team===0?5:7,y:4},'placement-team');
    const support=unit(state,team,'meneur'), wing=unit(state,team,'scoreur');
    reject(state,{type:'place',unitId:wing.id,x:team===0?2:10,y:4},'defense-capacity');
    apply(state,{type:'place',unitId:support.id,x:team===0?5:7,y:3});
    const holder=getUnit(state,state.ball.holderId);
    assert.deepEqual({x:state.ball.x,y:state.ball.y},{x:holder.x,y:holder.y});
    apply(state,{type:'place',unitId:wing.id,x:team===0?2:10,y:4});
    assert.equal(state.units.filter(u=>u.team===team&&u.role!=='pilier'&&inDefense(team,u.x,u.y)).length,1);
    reject(state,{type:'place',unitId:support.id,x:team===0?3:9,y:3},'defense-capacity');
  }
});

test('full defense area blocks second teammate endpoints and every path step, not attackers', () => {
  for(const team of [0,1]) {
    const state=ready(createMatch()), actor=unit(state,team,'sentry');activate(state,actor);
    for(const m of legalMoves(state))assert.ok(m.path.every(p=>!inDefense(team,p.x,p.y)));
    reject(state,{type:'move',x:team===0?3:9,y:2},'unreachable');
    const support=unit(state,team,'meneur');
    moveFixture(state,support,team===0?5:7,3);
    assert.ok(legalMoves(state).some(p=>inDefense(team,p.x,p.y)));
    assert.ok(canPosition(state,unit(state,1-team,'scoreur'),team===0?2:10,4));
    activate(state,unit(state,team,'pilier'));
    assert.ok(legalMoves(state).every(m=>m.path.every(p=>inDefense(team,p.x,p.y))));
  }
});

test('charge cannot force a second defender inside; successful impact still slows and preserves possession', () => {
  for(const defendingTeam of [0,1]) {
    const state=ready(createMatch({seed:7})), target=unit(state,defendingTeam,'scoreur'), actor=unit(state,1-defendingTeam,'middle');
    moveFixture(state,target,defendingTeam===0?4:8,4);
    moveFixture(state,actor,defendingTeam===0?5:7,4);
    activate(state,actor);state.ball={holderId:target.id,x:target.x,y:target.y};
    const cmd={type:'charge',targetId:target.id}, preview=previewAction(state,cmd);
    assert.equal(preview.legal,true);assert.equal(preview.pushLegal,false);
    const result=apply(state,cmd), event=result.events.find(e=>e.type==='charge');
    assert.equal(event.success,true);assert.equal(event.pushed,false);
    assert.equal(state.ball.holderId,target.id);
    assert.equal(target.penalty+target.nextPenalty,3);
  }
});

test('goal opens placement for the conceding side; readiness preserves remaining initiative', () => {
  const state=ready(createMatch({seed:7})), scorer=unit(state,0,'scoreur');
  moveFixture(state,scorer,10,2);activate(state,scorer);state.ball={holderId:scorer.id,x:10,y:2};
  unit(state,1,'middle').nextPenalty=3;
  const result=apply(state,{type:'shoot',x:12,y:2});
  assert.ok(result.events.some(e=>e.type==='goal'));
  assert.equal(state.phase,'placement');assert.equal(controllingTeam(state),1);
  assert.equal(state.placement.kickoffTeam,1);assert.equal(state.ball.holderId,'t1-voloden');
  assert.ok(state.units.every(u=>inOwnHalf(u.team,u.x,u.y)));
  const before=structuredClone(state);
  ready(state);
  for(const key of ['round','score','rng','units','activeId','ball'])assert.deepEqual(state[key],before[key]);
  assert.ok(getUnit(state,scorer.id).acted);
});

test('winning goal and final-round ending never open another placement', () => {
  for(const ending of ['points','round']) {
    const state=ready(createMatch({seed:7,maxRounds:1})), scorer=unit(state,0,'scoreur');
    moveFixture(state,scorer,10,2);
    if(ending==='points')state.score[0]=4;else scorer.penalty=scorer.stats.VIT;
    activate(state,scorer);state.ball={holderId:scorer.id,x:10,y:2};
    const result=apply(state,{type:'shoot',x:12,y:2});
    assert.equal(state.status,'finished');assert.equal(state.placement,null);
    assert.ok(!result.events.some(e=>e.type==='placement'));
  }
});

test('placement save round-trip resumes selected side and validated formation without mutation', () => {
  const state=createMatch();apply(state,{type:'place',unitId:'t0-momo',x:5,y:3});apply(state,{type:'ready',team:0});
  const resumed=restoreMatch(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(resumed,state);assert.notEqual(resumed,state);assert.equal(controllingTeam(resumed),1);
  reject(resumed,{type:'place',unitId:'t0-momo',x:5,y:4});
  const before=structuredClone(resumed), plan=chooseTurn(resumed);
  assert.deepEqual(resumed,before);assert.deepEqual(plan,[{type:'ready',team:1}]);apply(resumed,plan[0]);
});

test('v1 unfinished saves migrate once without losing score, RNG, history, turns or penalties', () => {
  const old=ready(createMatch({seed:3}));old.schema=1;delete old.phase;delete old.placement;
  old.log=[];old.score=[2,1];apply(old,{type:'wait'});unit(old,1,'middle').nextPenalty=3;
  old.moved=true;
  moveFixture(old,unit(old,0,'sentry'),2,2);
  const original=structuredClone(old), migrated=restoreMatch(old);
  assert.deepEqual(old,original);assert.equal(migrated.schema,2);assert.equal(migrated.placement.reason,'rules-update');
  for(const key of ['score','rng','round','activeId'])assert.deepEqual(migrated[key],old[key]);
  for(const u of migrated.units)for(const key of ['acted','penalty','nextPenalty'])assert.equal(u[key],getUnit(old,u.id)[key]);
  assert.deepEqual(migrated.log.slice(0,old.log.length),old.log);
  assert.deepEqual(restoreMatch(migrated),migrated);
  ready(migrated);assert.ok(getUnit(migrated,'t0-cana').acted);assert.equal(migrated.moved,true);
  assert.deepEqual(legalMoves(migrated),[],'a migration must not restore an already spent move');
});

test('completed v1 match remains an unchanged historical result', () => {
  const old=ready(createMatch({maxRounds:1}));
  while(old.status==='playing')apply(old,{type:'wait'});
  old.schema=1;delete old.phase;delete old.placement;
  moveFixture(old,unit(old,0,'sentry'),2,2);
  const original=structuredClone(old);
  assert.deepEqual(restoreMatch(old),original);assert.deepEqual(old,original);
});

for(const [name,forge] of Object.entries({
  phase:s=>s.phase='unknown', capacity:s=>Object.assign(unit(s,0,'sentry'),{x:2,y:2}),
  half:s=>Object.assign(unit(s,0,'scoreur'),{x:7,y:1}),
  center:s=>Object.assign(unit(s,0,'scoreur'),{x:6,y:1}),
  order:s=>s.placement.team=1, ready:s=>s.placement.ready=[true,false],
  moved:s=>s.moved=true, holder:s=>s.placement.kickoffTeam=1,
}))test('placement validation rejects forged '+name,()=>{const s=createMatch();forge(s);assert.throws(()=>validateState(s));});

test('100 randomized legal formations survive full AI matches and every post-goal setup', () => {
  let rng=217;
  const pick=list=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return list[rng%list.length];};
  for(let seed=1001;seed<=1100;seed++) {
    const state=createMatch({seed,maxRounds:6});let commands=0;
    while(state.status==='playing') {
      assert.ok(commands++<500,'match remains bounded');
      if(state.phase==='placement') {
        const team=controllingTeam(state);
        for(const u of state.units.filter(u=>u.team===team)){
          const choices=legalPlacements(state,u.id);
          if(choices.length)apply(state,{type:'place',unitId:u.id,...pick(choices)});
        }
      }
      const before=structuredClone(state),plan=chooseTurn(state);
      assert.deepEqual(state,before);
      for(const cmd of plan)apply(state,cmd);
    }
  }
});
