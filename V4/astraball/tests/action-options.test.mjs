import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,applyCommand,activeUnit,legalMoves,getUnit,validateState} from '../src/core/game.mjs';
import {actionPreview,actionTargets,goalIcon} from '../src/action-options.mjs';
const playing=()=>{const s=createMatch({mode:'hotseat'});while(s.phase==='placement')applyCommand(s,{type:'ready',team:s.placement.team});return s;};

test('movement preview uses the exact legal detour and leaves every byte of match state unchanged',()=>{
  const s=playing(),u=activeUnit(s);Object.assign(u,{x:7,y:3});Object.assign(getUnit(s,'t1-voloden'),{x:8,y:3});validateState(s);
  const before=JSON.stringify(s),moves=legalMoves(s),detour=actionPreview(s,{type:'move',x:9,y:3});
  assert.ok(detour.legal&&detour.distance>2,'the path goes around the occupied direct tile');
  assert.ok(moves.length);
  for(const move of moves){
    const command={type:'move',x:move.x,y:move.y},p=actionPreview(s,command);
    assert.equal(p.legal,true);assert.deepEqual(p.cells,[{x:u.x,y:u.y},...move.path]);
    assert.equal(p.distance,move.path.length);
    const copy=structuredClone(s),result=applyCommand(copy,command);
    assert.equal(result.ok,true);assert.deepEqual(result.events.find(e=>e.type==='move').path,p.cells.slice(1));
  }
  assert.equal(actionPreview(s,{type:'move',x:-1,y:3}).legal,false);
  const occupied=s.units.find(o=>o.id!==u.id);assert.equal(actionPreview(s,{type:'move',x:occupied.x,y:occupied.y}).legal,false);
  assert.equal(JSON.stringify(s),before);
  const move=moves[0];applyCommand(s,{type:'move',x:move.x,y:move.y});
  assert.equal(actionPreview(s,{type:'move',x:move.x+1,y:move.y}).legal,false);
});

test('charge and pass portraits contain only legal targets and never mutate the match',()=>{
  const s=playing();s.units.filter(u=>['sentry','meneur'].includes(u.role)).forEach(u=>u.acted=true);s.activeId='t0-kaylis';const u=getUnit(s,s.activeId);Object.assign(u,{x:7,y:3});
  Object.assign(getUnit(s,'t1-voloden'),{x:8,y:3});Object.assign(getUnit(s,'t1-lok'),{x:7,y:2});
  s.ball={holderId:u.id,x:u.x,y:u.y};validateState(s);const before=JSON.stringify(s);
  assert.deepEqual(actionTargets(s,'charge').map(o=>o.targetId),['t1-voloden','t1-lok']);
  assert.ok(actionTargets(s,'pass').every(o=>o.preview.legal&&getUnit(s,o.targetId).team===u.team));
  assert.equal(JSON.stringify(s),before);
});

test('goal glyphs identify left/center/right from each attacking side, retaining illegal targets as disabled choices',()=>{
  for(const team of [0,1]){
    const s=playing(),u=s.units.find(u=>u.team===team&&u.role==='scoreur');s.activeId=u.id;s.ball={holderId:u.id,x:u.x,y:u.y};
    const options=actionTargets(s,'shoot');assert.equal(options.length,3);
    assert.deepEqual(options.map(o=>o.side),['left','center','right']);
    assert.deepEqual(options.map(o=>o.command.y),team===0?[2,3,4]:[4,3,2]);
    assert.ok(options.every(o=>o.command.x===(team===0?12:0)));
    assert.equal(new Set(options.map(o=>goalIcon(o.side))).size,3);
    assert.ok(options.some(o=>!o.preview.legal));
  }
  assert.deepEqual(actionTargets(createMatch(),'charge'),[]);
});
