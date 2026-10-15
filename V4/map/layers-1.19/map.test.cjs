const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('versioned maps and all authoring proofs remain exact',()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(root,'versions.json'),'utf8'));
  for(const version of registry.versions)assert.equal(hash(path.join(root,version.file)),version.sha256,version.file);
  for(const version of ['1.15','1.16','1.17','1.18','1.19']){
    const proof=JSON.parse(fs.readFileSync(path.join(root,'layers-'+version,'provenance.json'),'utf8'));
    for(const file of proof.files)assert.equal(hash(path.join(root,file.file)),file.sha256,file.file);
  }
});
test('Velane has independent alpha and the runtime atlas preserves exact composite pixels',async()=>{
  const icon=await sharp(path.join(__dirname,'velane-icon.png')).ensureAlpha().raw().toBuffer();
  assert(icon.some((v,i)=>i%4===3&&v===0));assert(icon.some((v,i)=>i%4===3&&v===255));
  const original=await sharp(path.join(__dirname,'kalistar-map-1.19-preview.png')).ensureAlpha().raw().toBuffer();
  const published=await sharp(path.resolve(__dirname,'../../site/assets/ui/kalistar-atlas-1.19.webp')).ensureAlpha().raw().toBuffer();
  assert.deepEqual(published,original);
  const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'verification.json'),'utf8'));
  assert.equal(proof.changedOutsideTerrain,0);assert.equal(proof.changedOutsideAuthorized,0);assert(proof.previousLayersUnchanged);assert(proof.psdRoundTrip);
});
