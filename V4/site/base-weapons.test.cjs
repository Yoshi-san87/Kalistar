'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const W=require('./base-weapons.js'),matrix=require('../../V3/donnees/armes.json');
test('all 20 actual base families keep their existing matrix IDs',()=>{
  assert.deepEqual(W.families,Object.keys(matrix));
  for(const [i,family]of W.families.entries()){
    const code=String(i).padStart(2,'0');assert.equal(W.code(family),code);assert.equal(W.asset(code),'assets/base-weapons/'+code+'.svg');
  }
  for(const invalid of [null,'','99','../00','0','Katana'])assert.equal(W.asset(invalid),null);
  assert.equal(W.code('unknown'),null);
});
test('native anchor and all calibrated white contours respect the original circle',()=>{
  assert.deepEqual(W.native,{left:89,top:1116,width:96,height:95,cx:137,cy:1163.5});
  const proof=require('../revisions/2026-10-04-white-weapons/geometry.json');
  assert.equal(proof.icons.length,20);
  for(const item of proof.icons){
    const source=fs.readFileSync(path.join(__dirname,'assets/base-weapons',item.code+'.svg'));
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'),item.sha256);
    assert(item.fullRadius<=44);assert(item.opticalError<.8);
    assert.match(source.toString(),/viewBox="0 0 96 95"/);
    assert.doesNotMatch(source.toString(),/<(?:image|script|foreignObject)/);
  }
});
test('site-only rendering leaves native sources and equipment rules independent',()=>{
  const media=fs.readFileSync(path.join(__dirname,'card-media.js'),'utf8');
  assert.match(media,/request.kind!=='art'/);
  assert.match(media,/cache.delete\(source\)/);
  const code=fs.readFileSync(path.join(__dirname,'base-weapons.js'),'utf8');
  assert.doesNotMatch(code,/KalistarEngine|KalistarEquipment|indexedDB|localStorage/);
  assert.match(code,/canvas.toDataURL\('image\/webp',.95\)/);
});
