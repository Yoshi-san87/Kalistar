import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PIXEL_ARENAS} from '../data/venues.mjs';
import {ARENAS,normalizeAppearance} from '../src/appearance.mjs';
import {createProjection} from '../src/projection.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const allowed=read('../runtime-files.json'),proof=read('../sources/arenas-pixel-v1/provenance.json'),flags=read('../sources/arenas-pixel-v1/flags.json');

test('nine places have street and official venues plus the unique Astrium',()=>{
  assert.equal(PIXEL_ARENAS.length,19);assert.equal(ARENAS.length,21);
  assert.equal(new Set(ARENAS.map(a=>a.id)).size,21);
  const cities=new Set(PIXEL_ARENAS.map(a=>a.cityId));assert.equal(cities.size,9);
  for(const city of cities)for(const kind of ['street','official'])
    assert.equal(PIXEL_ARENAS.filter(a=>a.cityId===city&&a.kind===kind).length,1);
  assert.deepEqual(PIXEL_ARENAS.filter(a=>a.kind==='legendary').map(a=>a.id),['astrium']);
  for(const a of PIXEL_ARENAS){
    assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.ground)&&Object.isFrozen(a.views));
    assert.deepEqual(a.views,['horizontal']);assert.equal(a.pixel,true);
    assert.equal(normalizeAppearance({arena:a.id,view:'isometric'}).view,'horizontal');
    assert.ok(a.ground[0]>194&&a.ground[1]<970&&a.ground[1]-a.ground[0]>=200);
    assert.ok(a.inset>=a.nearInset&&a.nearInset>=100);
    if(a.kind!=='street'){assert.equal(a.whiteLines,true);assert.equal(a.lines,0xffffff);assert.equal(a.goalColor,0xffffff);assert.equal(a.goalMaterial,'white');}
    for(const key of ['stats','bonus','effects','rules','collision'])assert.equal(key in a,false);
  }
  for(const arena of ['resonances','rhinoz'])assert.equal(normalizeAppearance({arena,view:'isometric'}).view,'isometric');
});

test('every calibrated court preserves all 91 cells and its artwork proportions',()=>{
  for(const arena of PIXEL_ARENAS)for(const height of [0,60,100]){
    const p=createProjection('horizontal',height,arena.ground,arena);
    assert.equal(p.verticalScale,1);assert.equal(p.groundY(0),0);assert.equal(p.groundY(1024),1024);
    for(let y=0;y<7;y++)for(let x=0;x<13;x++){
      const c=p.center(x,y);assert.deepEqual(p.pick(c.x,c.y),{x,y},arena.id);
      for(const edge of p.polygon(x,y))assert.deepEqual(p.pick(c.x*.1+edge.x*.9,c.y*.1+edge.y*.9),{x,y});
    }
    assert.equal(p.project(0,0).y,p.project(13,0).y);
    assert.equal(p.project(0,7).y,p.project(13,7).y);
  }
});

test('19 backdrops have versioned exports, intact originals and external backups',()=>{
  assert.equal(proof.jobs.length,19);
  for(const arena of PIXEL_ARENAS){
    const item=proof.jobs.find(j=>j.id===arena.id);assert.ok(item);
    for(const key of ['full','preview']){
      const record=item[key];assert.match(record.sha256,/^[a-f0-9]{64}$/);
      assert.equal(record.file,'V4/astraball/'+(key==='full'?arena.horizontal:arena.preview));
      assert.ok(allowed.includes(record.file.slice('V4/astraball/'.length)));
      assert.equal(record.width/record.height,1.5);
    }
    assert.equal(item.full.width,1536);assert.equal(item.preview.width,384);
    assert.ok(item.full.bytes<1500000);assert.ok(item.preview.bytes<200000);
    assert.equal(item.original.sha256,item.source.sha256);assert.equal(item.backup.sha256,item.source.sha256);
  }
});

test('only exact canonical faction banners are attached to cities',()=>{
  assert.equal(flags.flags.length,7);
  for(const item of flags.flags){
    assert.ok(allowed.includes(item.url));assert.equal(item.output.sha256,item.lockedSha256);
    assert.equal(item.source.sha256,item.lockedSha256);assert.equal(item.backup.sha256,item.lockedSha256);
    for(const a of PIXEL_ARENAS.filter(a=>a.cityId===item.cityId))assert.equal(a.flag,item.url);
  }
  for(const a of PIXEL_ARENAS.filter(a=>['velane','kalistopolis'].includes(a.cityId)))assert.equal(a.flag,null);
});
