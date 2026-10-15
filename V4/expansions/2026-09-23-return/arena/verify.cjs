'use strict';
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict'), crypto=require('node:crypto');
const {sharp}=require('../../../atelier/lib.cjs');
const {collaborationArenas}=require('../../../atelier/game-catalog.cjs');
const root=path.resolve(__dirname,'../../../..');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const spec=read(path.join(__dirname,'spec.json')), manifest=read(path.join(__dirname,'manifest.json'));
  const prov=read(path.join(__dirname,'provenance.json'));
  assert.equal(manifest.officialCollaboration,false); assert.deepEqual(manifest.arenas,[spec]);
  assert.equal(spec.entry.id,'replicant-village'); assert.equal(spec.entry.collaboration,'replicant');
  assert.equal(spec.source,'V4/expansions/2026-09-23-return/arena/replicant-village.png');
  assert.equal(spec.entry.image,'/jeu/assets/arenes/replicant-village.png');
  assert.equal(spec.entry.element,'AERO'); assert.equal(spec.entry.elementBonus,15);
  assert.equal(spec.entry.homeAttack,10); assert.equal(spec.entry.homeDefense,10);
  const ids=['nier-replicant','kaine-replicant','devola-nier','popola-nier'];
  assert.deepEqual(spec.entry.homeCharacters,ids);
  const elements=read(path.join(root,'V3/donnees/elements.json'));
  const accepted=collaborationArenas([spec.entry],new Set(ids),elements,[]);
  assert.equal(accepted.length,1); assert.deepEqual(accepted[0].homeCharacters,ids);
  assert.deepEqual(collaborationArenas([spec.entry],new Set(['devola-nier','popola-nier']),elements,[]),[]);
  assert.deepEqual(collaborationArenas([spec.entry],new Set(['nier-replicant']),elements,[])[0].homeCharacters,['nier-replicant']);
  assert.throws(()=>collaborationArenas([{...spec.entry,elementBonus:16}],new Set(ids),elements,[]));
  assert.throws(()=>collaborationArenas([spec.entry],new Set(ids),elements,[{id:spec.entry.id}]));
  const bytes=fs.readFileSync(path.join(root,spec.source));
  assert.equal(hash(bytes),hash(fs.readFileSync(prov.generatedOriginal)),'Source copy changed');
  const meta=await sharp(bytes).metadata(), stats=await sharp(bytes).stats();
  assert.equal(meta.format,'png'); assert.ok(meta.width>=1024&&meta.height>=576&&meta.width>meta.height);
  assert.ok(Math.abs(meta.width/meta.height-16/9)<.02); assert.ok(bytes.length<=32*1024**2);
  const pixels=await sharp(bytes).ensureAlpha().raw().toBuffer();
  let notOpaque=0; for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)notOpaque++;
  assert.equal(notOpaque,0); assert.ok(stats.channels.slice(0,3).every(c=>c.stdev>20));
  const refs=[];
  for(const source of prov.sources)if(source.file){
    const b=fs.readFileSync(path.join(root,source.file));
    const m=await sharp(b).metadata(); await sharp(b).stats();
    refs.push({file:source.file,sha256:hash(b),width:m.width,height:m.height});
  }
  const report={passed:true,published:false,sha256:hash(bytes),width:meta.width,height:meta.height,bytes:bytes.length,
    fullPixelCount:meta.width*meta.height,notOpaquePixels:notOpaque,rgbStandardDeviations:stats.channels.slice(0,3).map(c=>c.stdev),
    byteIdenticalToGeneratedOriginal:true,registryValidationPassed:true,collaborationGatingPassed:true,
    unavailableHomeFilteringPassed:true,overpoweredBonusRejected:true,duplicateArenaRejected:true,
    sources:refs,entry:spec.entry};
  fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
