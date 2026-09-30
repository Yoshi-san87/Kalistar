'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../../atelier/lib.cjs'),A=require('./assets.cjs');
test('nine banner hashes, packed geometry and reference alpha',async()=>{await A.verify();});
test('site assets equal full banners and full alpha matches approved outline',async()=>{
  const alpha=p=>L.sharp(p).ensureAlpha().extractChannel(3).raw().toBuffer();
  const expected=await alpha(L.path.join(L.ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png'));
  for(let i=1;i<=9;i++){
    const flag=L.path.join(__dirname,'flag-RE'+i+'.png');
    assert.deepEqual(await alpha(flag),expected);
    assert(L.fs.readFileSync(flag).equals(L.fs.readFileSync(L.path.join(L.ROOT,'V4/site/assets/factions/RE'+i+'.png'))));
  }
});
test('banner replacement touches only faction layer and rejects unsupported factions',()=>{
  const other={left:0,top:0,width:10,height:10,input:'preserve'};
  for(let i=1;i<=9;i++){
    const layers=[{...A.FLAG,input:'old'},other];
    assert.equal(A.banner(layers,{faction:'RE'+i}),layers);
    assert.equal(layers[1],other);
    assert(layers[0].input.endsWith('flag-RE'+i+'-packed.png'));
  }
  assert.throws(()=>A.banner([],{faction:'RE1'}));
  assert.throws(()=>A.banner([{...A.FLAG}],{faction:'RE10'}));
});
