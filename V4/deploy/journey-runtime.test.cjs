'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('server uses the same CommonJS combat entry without eval or a duplicate engine',()=>{
  const runtime=require('./journey-runtime.cjs');
  assert.equal(runtime.Combat,require('../site/journey-combat.js'));
  assert.equal(runtime.Composition,require('../site/team-composition.js'));
  assert.equal(runtime.hash,null,'An unfrozen server entry must fail closed');
  const worker=fs.readFileSync(path.join(__dirname,'journey-worker.mjs'),'utf8');
  assert(worker.includes("import Runtime from './journey-runtime.cjs'"));
  assert(!/\beval\s*\(|new Function\s*\(|KALISTAR_JOURNEY_RUNTIME_HASH|globalThis\.Kalistar/.test(worker));
});
test('Cloudflare plan includes the standard bundler entry and both server modules',async()=>{
  const previous=process.env.CF_PAGES;process.env.CF_PAGES='1';
  try{
    const plan=await require('./build.cjs').plan();
    for(const name of ['_worker.js','journey-worker.mjs','journey-runtime.cjs','jeu/journey-combat.js','jeu/engine.js','jeu/team-composition.js'])assert(plan.files.some(f=>f.target===name),name);
    const builder=fs.readFileSync(path.join(__dirname,'build.cjs'),'utf8');
    assert(builder.includes("Combat:require('./jeu/journey-combat.js')"));
    assert(builder.includes("require('./journey-hash.cjs').hash(ROOT)"));
    assert(!builder.includes('hash.update(JSON.stringify(catalogue))'));
  }finally{if(previous===undefined)delete process.env.CF_PAGES;else process.env.CF_PAGES=previous;}
});
