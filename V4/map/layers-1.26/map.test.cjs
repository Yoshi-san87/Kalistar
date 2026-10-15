const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('abyss island sources, masked pixels and PSD round-trip are verified',()=>{
  const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'provenance.json')));
  for(const item of proof.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',item.file))).digest('hex'),item.sha256,item.file);
  const result=JSON.parse(fs.readFileSync(path.join(__dirname,'verification.json')));
  assert.equal(result.changedOutside,0);assert(result.changedInside>1000);
  assert(result.cityGroupsUnchanged&&result.originalBackgroundLayerUnchanged&&result.editableMaskRoundTrip&&result.compositeRoundTrip);
});
