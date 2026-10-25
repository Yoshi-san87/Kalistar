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
  for(const file of files){assert.ok(!file.includes('..'));assert.ok(!/(?:^|\/)(?:tools|sources|tests|node_modules)\//.test(file));assert.ok(/\.(html|css|mjs|webp|txt)$/.test(file));}
  for(const file of files.filter(file=>!file.startsWith('assets/')))assert.ok(fs.existsSync(path.join(__dirname,'..',file)),file);
});
test('hosted game reuses login guard, namespaces its save and makes no rewards calls',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../src/app.mjs'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/auth-guard\.js/);assert.match(source,/KalistarAuthGuard\?\.ensure/);assert.match(source,/localProfile/);assert.match(source,/kalistar\.astraball\.match\.v1/);assert.ok(!source.includes('/api/journeys/'));
});
