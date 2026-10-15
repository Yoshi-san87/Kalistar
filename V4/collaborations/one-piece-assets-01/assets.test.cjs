'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../../atelier/designer-core.cjs');
const A=require('./assets.cjs');

test('banner API preserves other layers and rejects missing, duplicate or wrong faction layers',()=>{
  const frame={name:'frame',left:0,top:0,width:897,height:1497,input:'unchanged'};
  const flag={...A.FLAG,name:'old',input:'old.png'};
  const layers=[frame,flag],result=A.banner(layers,{faction:'ONEPIECE'});
  assert.equal(result,layers); assert.equal(result[0],frame);
  assert.equal(result[1].name,'FACTION - ONEPIECE');
  assert.equal(path.basename(result[1].input),'flag-ONEPIECE-packed.png');
  for(const key of Object.keys(A.FLAG))assert.equal(result[1][key],A.FLAG[key]);
  assert.throws(()=>A.banner([frame],{faction:'ONEPIECE'}),/one packed faction layer/);
  assert.throws(()=>A.banner([flag,flag],{faction:'ONEPIECE'}),/one packed faction layer/);
  assert.throws(()=>A.banner([flag],{faction:'RE1'}),/Unknown One Piece faction/);
  assert.equal(new Set(A.inputs()).size,A.inputs().length);
  for(const input of A.inputs()){assert(path.isAbsolute(input));assert(fs.existsSync(input));}
});

test('ONEPIECE alpha geometry and SHARKAN all-alpha optical fit verify without lock rewrites',async()=>{
  const report=await A.verify();
  assert.equal(report.protectedLocksUnchanged,true);
  assert(report.metrics.fullAlphaRadius<=39);
  assert(report.metrics.opticalError<=.75);
});

test('designer accepts only additive SHARKAN and reuses existing race components',()=>{
  const races=D.raceComponents(),options=D.options();
  assert.equal(races.SHARKAN.file,'extensions/race-SHARKAN.png');
  assert.deepEqual(Object.fromEntries(Object.keys(A.GEOMETRY).map(key=>[key,races.SHARKAN[key]])),A.GEOMETRY);
  assert.equal(options.races.filter(entry=>entry.value==='SHARKAN').length,1);
  for(const race of ['SKULLZ','CERELF','CYBORG','HUMAIN'])assert(options.races.some(entry=>entry.value===race));
  assert.equal(D.validate({...D.defaults(),race:'SHARKAN'}).race,'SHARKAN');
  assert.throws(()=>D.validate({...D.defaults(),race:'UNKNOWN_SHARK'}),/Composant non calibre/);
});
