const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('Vulkar remains independently layered over unchanged terrain',()=>{
 const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'provenance.json')));
 for(const item of proof.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',item.file))).digest('hex'),item.sha256,item.file);
 const report=JSON.parse(fs.readFileSync(path.join(__dirname,'verification.json')));
 assert.equal(report.changedOutsideCity,0);assert(report.terrainUnchanged&&report.previousLayersUnchanged&&report.psdRoundTrip&&report.independentIconShadowAndEditableName);
});
