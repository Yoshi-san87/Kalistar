import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SPRITE_SIZE_LIMITS as limits, spriteSizing, displayHeight, calibrationFromFrames } from '../src/sprite-sizing.mjs';
import { createRoster } from '../src/roster.mjs';
import { createSpriteLibrary } from '../src/sprite-library.mjs';
import { getAthlete } from '../data/athletes.mjs';
import { createMatch, restoreMatch } from '../src/core/game.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../data/sprite-library.json',import.meta.url)));
const roster=createRoster(data),get=id=>roster.entries.find(c=>c.characterId===id);

test('painted idle bounds, not empty atlas margins, normalize every template',()=>{
  for(const entry of data.entries){
    const pack=entry.file.split('/')[1];
    const report=pack==='sprites-v3'
      ? JSON.parse(fs.readFileSync(new URL('../sources/'+pack+'/'+entry.spriteKey+'.atlas.json',import.meta.url)))
      : JSON.parse(fs.readFileSync(new URL('../sources/'+pack+'/atlas-report.json',import.meta.url))).characters.find(c=>c.id===entry.spriteKey);
    assert.deepEqual(entry.calibration,calibrationFromFrames(report.frames),entry.characterId);
    assert.ok(Object.isFrozen(createSpriteLibrary(data).get(entry.id).calibration));
  }
  assert.throws(()=>calibrationFromFrames([]));
  const malformed=structuredClone(data);malformed.entries[0].calibration.top=-1;
  assert.throws(()=>createSpriteLibrary(malformed));
  const nonfinite=structuredClone(data);nonfinite.entries[0].calibration.standingHeight=Infinity;
  assert.throws(()=>createSpriteLibrary(nonfinite));
});

test('Barret is taller than Luffy despite a smaller source drawing',()=>{
  const barret=get('barret-ff7'),luffy=get('monkey-d-luffy-op');
  assert.ok(barret.calibration.standingHeight<luffy.calibration.standingHeight);
  const a=spriteSizing(barret),b=spriteSizing(luffy);
  assert.equal(a.height.measuredCm,197);assert.equal(b.height.measuredCm,174);
  assert.ok(a.standingHeight>b.standingHeight*1.08);
  assert.ok(a.restWidth>b.restWidth,'his build remains broad, not stretched vertically');
});

test('all available sprites fit the same bounded presentation envelope',()=>{
  for(const c of roster.entries){
    const before=JSON.stringify(c),s=spriteSizing(c);
    assert.ok(s.calibrated,c.id);
    assert.ok(s.scale>0&&Number.isFinite(s.scale));
    assert.ok(s.height.cm>=limits.minCm&&s.height.cm<=limits.maxCm);
    assert.ok(s.standingHeight>=limits.minPixels-1e-8,c.id+' remains legible');
    assert.ok(s.standingHeight<=limits.maxPixels+1e-8);
    assert.ok(s.restWidth<=limits.restWidth+1e-8);
    assert.ok(s.actionWidth<=limits.actionWidth+1e-8);
    assert.ok(s.maxHeight<=limits.actionHeight+1e-8);
    assert.ok(s.ballY<0&&s.ballY>-s.standingHeight,'ball below head');
    assert.ok(s.hitLeft<0&&s.hitRight>0,'clickable on both sides');
    assert.equal(JSON.stringify(c),before);
  }
});

test('min/max and unknown/length values never invent a physical measurement',()=>{
  const height=h=>displayHeight('test',{measurements:{heightCm:h,heightKind:'height'}});
  assert.equal(height(20).cm,100);assert.equal(height(950).cm,300);
  for(const value of [null,undefined,NaN,Infinity,-1,0,'197']){
    assert.equal(height(value).cm,180);assert.equal(height(value).measuredCm,null);
  }
  const ruby=displayHeight('ruby',getAthlete('ruby'));
  assert.equal(ruby.source,'neutral-presentation');assert.equal(ruby.measuredCm,null);
  const simone=displayHeight('simone-nier',getAthlete('simone-nier'));
  assert.equal(simone.cm,300);assert.equal(simone.measuredCm,null);
  assert.equal(simone.source,'adaptation');
  assert.equal(spriteSizing(get('momo')).standingHeight,70);
  const neutral={...get('kaylis'),characterId:'test'};
  let previous=0;
  for(let h=20;h<=1000;h+=10){
    const s=spriteSizing({...neutral,athlete:{measurements:{heightCm:h}}});
    assert.ok(s.standingHeight>=previous);previous=s.standingHeight;
  }
});

test('Lanio is taller than Gen and newly assigned heights feed the same sprite calibration',()=>{
  const lanio=spriteSizing(get('lanio')),gen=spriteSizing(get('gen'));
  assert.equal(lanio.height.cm,182);assert.equal(gen.height.cm,159);
  assert.ok(lanio.standingHeight>gen.standingHeight);
  const vivi=spriteSizing(get('vivi-ff9'));
  assert.equal(vivi.height.cm,120);assert.equal(vivi.height.source,'adaptation');
  assert.equal(vivi.height.measuredCm,null,'an adaptation is not a documented measurement');
});

test('Malaba uses the requested 205 cm without changing his mass or sports profile',()=>{
  const malaba=getAthlete('malaba');
  assert.equal(malaba.measurements.heightCm,205);
  assert.equal(malaba.measurements.weightKg,112);
  assert.equal(spriteSizing(get('malaba')).height.cm,205);
});
test('old catalogue and old matches remain readable; no gameplay migration',()=>{
  const old=structuredClone(data);
  for(const c of old.entries)delete c.calibration;
  const legacy=createRoster(old);
  for(const c of legacy.entries){const s=spriteSizing(c);assert.equal(s.calibrated,false);assert.equal(s.scale,c.scale);}
  const match=createMatch({teams:roster.teams(roster.defaults())}),saved=JSON.stringify(match);
  for(const unit of match.units)spriteSizing(roster.forUnit(unit));
  assert.equal(JSON.stringify(match),saved);
  assert.deepEqual(restoreMatch(JSON.parse(saved)),match);
  for(const unit of match.units)assert.deepEqual(unit.stats,getAthlete(unit.athlete.id).stats);
});
