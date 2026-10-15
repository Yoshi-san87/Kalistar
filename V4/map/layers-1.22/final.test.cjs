const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('selected complete map and independent cities retain their recorded proofs',()=>{
 const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'final-provenance.json')));
 for(const item of proof.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',item.file))).digest('hex'),item.sha256,item.file);
 const report=JSON.parse(fs.readFileSync(path.join(__dirname,'final-verification.json')));
 assert(report.cityLayersUnchanged&&report.psdRoundTrip);
 assert.equal(report.pixelIdentityOutsideZone,false);
});
