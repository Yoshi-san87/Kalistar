'use strict';
const test=require('node:test');
const L=require('../../atelier/lib.cjs');
const {path,assert,sharp}=L;
const C=require('../../site/collaborations.js');
test('Solaria uses the cleaned V4 image and the source V3 stays identical',async()=>{
  const audit=L.read(path.join(__dirname,'audit/solaria.json'));
  const original=audit.results.find(r=>r.name==='source');
  assert.equal(await L.hash(path.join(L.ROOT,original.file)),original.sourceHash);
  const file=path.join(L.ROOT,'V4/site/assets/factions/Solaria.png');
  assert.equal(await L.hash(file),original.output.sha256);
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let p=original.cutoff*info.width*4+3;p<data.length;p+=4)assert.equal(data[p],0);
  assert.equal(C.asset('factions','Solaria'),'assets/factions/Solaria.png');
  assert.equal(C.universe({faction:'Solaria'}),'kalistar');
});
test('static deployment keeps both legacy source and explicit V4 override',async()=>{
  const {files}=await require('../../deploy/build.cjs').plan();
  assert.equal(files.find(f=>f.target==='jeu/assets/factions/Solaria.png').source,'V4/site/assets/factions/Solaria.png');
  assert.equal(files.find(f=>f.target==='jeu/shared/factions/Solaria.png').source,'V3/assets/factions/Solaria.png');
});
