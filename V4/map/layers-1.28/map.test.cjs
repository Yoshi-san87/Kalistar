const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('Cryptown is moved into the abyss without changing terrain or other cities',()=>{
 const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'provenance.json')));
 for(const item of proof.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',item.file))).digest('hex'),item.sha256,item.file);
 const report=JSON.parse(fs.readFileSync(path.join(__dirname,'verification.json')));
 assert.equal(report.changedOutsideCity,0);assert(report.terrainUnchanged&&report.previousLayersUnchanged&&report.psdRoundTrip&&report.independentIconShadowAndEditableName&&report.cryptownMovedNotDuplicated);
});
test('runtime atlas matches the PSD composite and new city icons are transparent',async()=>{
 const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
 const atlas=path.resolve(__dirname,'../../site/assets/ui/kalistar-atlas-1.28.webp');
 assert.deepEqual(await sharp(atlas).ensureAlpha().raw().toBuffer(),await sharp(path.join(__dirname,'kalistar-map-1.28-preview.png')).ensureAlpha().raw().toBuffer());
 const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'published-media.json')));
 for(const asset of proof.assets)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../..',asset.file))).digest('hex'),asset.sha256);
 for(const name of ['vulkar','cryptown']){const icon=await sharp(path.resolve(__dirname,'../../site/assets/map',name+'-v1.webp')).metadata();assert.equal(icon.width,128);assert.equal(icon.height,128);assert(icon.hasAlpha);}
});
