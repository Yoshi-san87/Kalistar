'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs');
const M=require('./model.cjs'),B=require('./build.cjs'),set=require('./set.json');
test('native profile preserves the original identity and exact weapon index',async()=>{
  const c=set.cards[0],p=M.profile(c,D);M.validateProfile(p,c);
  assert.equal(p.characterId,L.baseline().cards.find(c=>c.card.id==='40000042').card.characterId);
  assert.equal(p.crop.zoom,1);assert.equal((await B.game()).proof.duplicateCharacterRejected,true);
});
test('30px unzoomed translation creates no uncovered edge in the approved frame',async()=>{
  const f=L.read(L.path.join(L.ROOT,'V4/atelier/designer-assets/manifest.json')).frame.electro;
  const {data,info}=await L.sharp(L.path.join(L.ROOT,'V4/atelier/designer-assets',f.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let y=156;y<1077;y++)for(const [left,right]of [[80,110],[817,847]])for(let x=left;x<right;x++)
    assert.equal(data[((y-f.top)*info.width+x-f.left)*4+3],255);
});
test('selected final image and prompt hashes match parent provenance',async()=>{
  const selected=require('./approved-art.json');assert.equal(selected.revision,4);assert.equal(selected.userApprovalClaimed,false);
  assert.equal(selected.path,M.artPath(set.cards[0]));assert.equal(await L.hash(L.path.join(L.ROOT,selected.path)),selected.sha256);
  assert.equal(await L.hash(L.path.join(__dirname,selected.promptFile)),selected.promptSha256);
});
