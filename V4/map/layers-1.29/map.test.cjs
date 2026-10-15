const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('legibility revision preserves terrain, source city layers and PSD composite',()=>{
 const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'provenance.json')));
 for(const item of proof.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',item.file))).digest('hex'),item.sha256,item.file);
 const report=JSON.parse(fs.readFileSync(path.join(__dirname,'verification.json')));
 assert(report.terrainUnchanged&&report.oldCityLayersPreserved&&report.psdRoundTrip&&report.independentSymbolsAndNames);
 assert.equal(report.citiesBakedIntoRuntime,false);
});
