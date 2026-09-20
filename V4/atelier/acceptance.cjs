const {spawnSync}=require('node:child_process');
const L=require('./lib.cjs');
const {assert,fs,path,DATA,read,write}=L;
(async()=>{
  const id=process.argv[2],dir=L.jobDir(id),request=read(path.join(dir,'request.json'));
  const status=read(path.join(dir,'status.json')),regression=read(path.join(DATA,'regression.json')),ref=L.baseline();
  assert.equal(status.state,'verified');assert.equal(request.kind,'draft');
  assert.equal(regression.passed,true);assert.equal(regression.referenceId,ref.id);assert.equal(regression.results.length,ref.cards.length);
  assert.deepEqual(regression.results.map(r=>r.key).sort(),ref.cards.map(c=>c.key).sort());
  assert.equal(regression.rendererHash,await L.rendererHash());
  for(const result of regression.results){assert.equal(result.passed,true);assert.equal(result.comparison.changed,0);assert.equal(result.roundtrip.changed,0);assert.equal(result.barcode.passed,true);}
  const item=request.items[0],folder=path.join(dir,item.key),proof=read(path.join(folder,'verification.json'));
  assert.equal(item.card.name,'MOMO ATELIER');assert.equal(item.card.title,'ESSAI ATELIER');assert.equal(item.card.job,'ARTISTE');
  assert.deepEqual(item.card.positions,[1,2,3,4,5]);assert.deepEqual(item.card.atk,[210,'mana','retry','buff_atk','mana',42]);
  assert.equal(item.card.defense[2],130);assert.ok(item.card.barriers.includes(4));assert.ok(L.ID.test(item.upload));
  assert.equal(proof.passed,true);assert.ok(proof.comparison.changed>0);assert.equal(proof.comparison.outside,0);assert.equal(proof.fixed.changed,0);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.barcode.passed,true);
  const runtime=read(path.join(DATA,'runtime.json')),exports={};
  for(const [name,mime] of [['card.png','image/png'],['card.psd','image/vnd.adobe.photoshop']]){
    const response=await fetch(runtime.url+'/exports/'+id+'/'+name);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),mime);
    const hash=L.crypto.createHash('sha256');let bytes=0;
    for await(const chunk of response.body){hash.update(chunk);bytes+=chunk.length;}
    const sha256=hash.digest('hex');assert.equal(sha256,await L.hash(path.join(folder,name)));exports[name]={bytes,sha256};
  }
  const unit=spawnSync(process.execPath,['--test','--test-reporter=tap','test.cjs'],{cwd:__dirname,windowsHide:true,encoding:'utf8'});
  fs.writeFileSync(path.join(DATA,'unit-tests.tap'),unit.stdout+unit.stderr);assert.equal(unit.status,0,unit.stdout+unit.stderr);
  const count=Number(unit.stdout.match(/# pass (\d+)/)[1]);
  const report={passed:true,checkedAt:new Date().toISOString(),referenceId:regression.referenceId,rendererHash:regression.rendererHash,
    references:ref.cards.length,differentReferencePixels:0,protectedFiles:await L.protectedCheck(ref),unitTests:count,
    browserWorkflow:{job:id,source:'UI upload, fields, save, compose',desktop:[1100,760],mobile:[390,844]},
    draft:{job:id,fixedFrameDifferentPixels:0,outsideEditableAreas:0,reopenedDifferentPixels:0,barcode:true},exports};
  write(path.join(DATA,'acceptance.json'),report);console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
