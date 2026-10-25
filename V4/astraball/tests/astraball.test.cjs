const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
require('./deploy-cases.cjs');
test('Astraball rules and AI regression suite',async()=>{await import('./core.test.mjs');});
test('every visible tile maps back to its logical cell',async()=>{
  const {center,pick,polygon}=await import('../src/projection.mjs');
  for(let y=0;y<7;y++)for(let x=0;x<13;x++){
    const p=center(x,y);assert.deepEqual(pick(p.x,p.y),{x,y});
    for(const corner of polygon(x,y)){const inside={x:p.x*.2+corner.x*.8,y:p.y*.2+corner.y*.8};assert.deepEqual(pick(inside.x,inside.y),{x,y});}
  }
  assert.equal(pick(-1,-1),null);
});
test('runtime allowlist excludes authoring, tests and tooling',()=>{
  const files=require('../runtime-files.json');assert.equal(new Set(files).size,files.length);
  for(const file of files){assert.ok(!file.includes('..'));assert.ok(!/(?:^|\/)(?:tools|sources|tests|node_modules)\//.test(file));assert.ok(/\.(html|css|mjs|webp|png|txt)$/.test(file));}
  for(const file of files.filter(file=>!file.startsWith('assets/')))assert.ok(fs.existsSync(path.join(__dirname,'..',file)),file);
});
test('hosted game reuses login guard, namespaces its save and makes no rewards calls',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../src/app.mjs'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/auth-guard\.js/);assert.match(source,/KalistarAuthGuard\?\.ensure/);assert.match(source,/localProfile/);assert.match(source,/kalistar\.astraball\.match\.v1/);assert.ok(!source.includes('/api/journeys/'));
});

test('all ten characters have versioned sixteen-frame sprite atlases',async()=>{
  const {SPRITES,SPRITE_CELL,SPRITE_FOOT,spriteKey}=await import('../src/sprites.mjs');
  const {createMatch}=await import('../src/core/game.mjs');
  const files=require('../runtime-files.json'),report=require('../sources/sprites-v1/atlas-report.json');
  assert.equal(Object.keys(SPRITES).length,10);assert.equal(SPRITE_CELL,96);assert.equal(SPRITE_FOOT,90);
  for(const unit of createMatch().units){
    const config=SPRITES[spriteKey(unit)],proof=report.characters.find(c=>c.id===spriteKey(unit));
    assert.ok(files.includes(config.url));assert.equal(proof.file,config.url);assert.equal(proof.frames.length,16);
    for(const frame of proof.frames){assert.equal(frame.foot,90);assert.ok(frame.left>=3&&frame.top>=3);assert.ok(frame.left+frame.width<=93);assert.equal(frame.top+frame.height,90);}
    assert.match(proof.sha256,/^[a-f0-9]{64}$/);assert.ok(config.scale>=1&&config.scale<=1.6);
  }
  assert.ok(report.characters.reduce((sum,c)=>sum+c.bytes,0)<500000,'all ten atlases under 500KB');
  assert.throws(()=>spriteKey({id:'t0-unknown'}),/Missing/);
});

test('animation clips have real changing frames and bounded non-looping actions',async()=>{
  const {CLIPS,frameAt,facing}=await import('../src/sprites.mjs');
  for(const [name,clip] of Object.entries(CLIPS)){
    assert.ok(Object.isFrozen(clip)&&Object.isFrozen(clip.frames));
    for(const i of clip.frames)assert.ok(Number.isInteger(i)&&i>=0&&i<16);
    assert.equal(frameAt(name,-1),clip.frames[0]);assert.equal(frameAt(name,NaN),clip.frames[0]);
    if(!clip.loop)assert.equal(frameAt(name,100000),clip.frames.at(-1));
  }
  assert.deepEqual([0,85,170,255].map(t=>frameAt('run',t)),[4,5,6,7]);
  assert.deepEqual([0,126,251,376].map(t=>frameAt('throw',t)),[8,9,10,11]);
  assert.equal(frameAt('run',334),4);assert.throws(()=>frameAt('unknown'),/Unknown/);
  assert.equal(facing({x:4},{x:1}),-1);assert.equal(facing({x:1},{x:4}),1);assert.equal(facing({x:2},{x:2},-1),-1);
});
