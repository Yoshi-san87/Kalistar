'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const cwd=path.resolve(__dirname,'..');
const env={...process.env,KALISTAR_NODE_MODULES:path.join(__dirname,'no-native-dependencies')};
function succeeds(args){
  const result=spawnSync(process.execPath,args,{cwd,env,encoding:'utf8'});
  assert.equal(result.status,0,result.error?.message||result.stderr||result.stdout);
}
test('catalogue and calibrated worker handoffs work without native dependencies',()=>{
  succeeds(['--test','tests/sprite-v2-catalog.test.cjs']);
});
test('palette contracts and lossless glyphs require no native image library',()=>{
  succeeds(['-e',`
    const assert=require('node:assert/strict');
    const Module=require('node:module'),load=Module._load;
    Module._load=function(id,...args){
      assert.ok(!/(^|[\\\\/])sharp($|[\\\\/])/.test(id),'Unexpected native dependency: '+id);
      return load.call(this,id,...args);
    };
    const {compactPalette}=require('./tools/sprite-v2-bake.cjs');
    const {quantizeGlyphs}=require('./tools/sprite-v2-palette.cjs');
    (async()=>{
      const options={compactPalette};
      const glyphs=Array.from({length:64},(_,i)=>({pixels:Buffer.from([i,80,120,255]),width:1,height:1}));
      const result=await quantizeGlyphs(glyphs,options);
      assert.deepEqual(result.glyphs,glyphs);
      assert.equal(result.palette.colors,64);
      assert.equal(result.palette.quantizationApplied,false);
      assert.equal(result.palette.quantizedOpaqueColors,null);
      assert.notEqual(result.glyphs[0].pixels,glyphs[0].pixels);
      await assert.rejects(quantizeGlyphs(glyphs.slice(1),options),/64 dense/);
      await assert.rejects(quantizeGlyphs(glyphs,{}),/missing or unknown/);
      const invalid=structuredClone(glyphs);invalid[0].pixels=Buffer.from([1,2,3,128]);
      await assert.rejects(quantizeGlyphs(invalid,options),/binary alpha/);
      const rgba=Buffer.from([10,10,10,255,11,10,10,255,40,80,120,0]);
      const compacted=compactPalette(rgba,1);
      assert.equal(compacted.colors,1);assert.equal(compacted.merges.length,1);
      assert.deepEqual([...compacted.pixels].filter((_,i)=>i%4===3),[255,255,0]);
    })().catch(error=>{console.error(error);process.exitCode=1;});
  `]);
});
