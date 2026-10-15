const {execFileSync}=require('node:child_process');
const L=require('../../atelier/lib.cjs');
const {fs,path,ROOT,DATA,read,write,hash,assert}=L;
(async()=>{
  const work=__dirname,plan=read(path.join(work,'plan.json')),published=read(path.join(work,'published.json'));
  const audit=read(path.join(work,'verification.json')),ref=L.baseline(),gate=read(path.join(DATA,'regression.json'));
  assert.equal(ref.id,published.referenceId);assert.equal(gate.referenceId,ref.id);
  assert.equal(gate.rendererHash,await L.rendererHash());assert.equal(gate.passed,true);assert.equal(gate.results.length,26);
  for(const r of gate.results){assert.equal(r.passed,true);assert.equal(r.comparison.changed,0);assert.equal(r.roundtrip.changed,0);assert.equal(r.barcode.passed,true);}
  assert.equal(audit.passed,true);assert.equal(audit.results.length,22);
  const batches=[];
  for(const [batch,count] of [['elements-01',16],['elements-02',5]]){
    const result=read(path.join(ROOT,'V4/template-stable',batch,'verification.json'));
    assert.equal(result.complete,true);assert.equal(result.cards,count);
    for(const card of result.results){assert.equal(card.fixed.pixels,0);assert.equal(card.reopened.pixels,0);assert.equal(card.structuralRevision.id,plan.revision);assert.equal(card.structuralRevision.comparison.outside,0);}
    batches.push({batch,count,passed:true});
  }
  const master=read(path.join(work,'master-proof.json'));assert.equal(master.passed,true);
  const protectedFiles=await L.protectedCheck(ref),old=read(path.join(work,'references-before.json'));
  for(const [file,original] of Object.entries(old.protectedFiles)){
    const backup=published.backups[file];
    assert.equal(await hash(path.join(ROOT,backup||file)),original,'Original absent ou modifie : '+file);
  }
  const tests=execFileSync(process.execPath,['--test',path.join(ROOT,'V4/atelier/test.cjs')],{encoding:'utf8',windowsHide:true});
  fs.writeFileSync(path.join(work,'tests.log'),tests);
  const runtime=read(path.join(DATA,'runtime.json')),status=await (await fetch(runtime.url+'/api/status')).json();
  assert.equal(status.integrity.state,'intact');assert.equal(status.gate.passed,true);assert.equal(status.gate.count,26);
  for(const key of ['ruby','kaylis','malaba']){
    const response=await fetch(runtime.url+'/media/reference/'+key+'.png');assert.equal(response.status,200);
    const actual=L.crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
    assert.equal(actual,ref.protectedFiles[ref.cards.find(c=>c.key===key).png]);
  }
  let removedBytes=0;
  for(const item of plan.items){
    const file=L.inside(path.join(work,'staged'),item.key+'/card.psd');
    if(!fs.existsSync(file))continue;
    assert.equal(await hash(file),await hash(path.join(ROOT,item.psd)));
    removedBytes+=fs.statSync(file).size;fs.unlinkSync(file);
  }
  const trial=path.join(work,'ruby-trial.psd');
  if(fs.existsSync(trial)){removedBytes+=fs.statSync(trial).size;fs.unlinkSync(trial);}
  const report={passed:true,completedAt:new Date().toISOString(),revision:plan.revision,referenceId:ref.id,correctedCards:21,electroUnchanged:5,protectedFiles,generator:{passed:true,count:26,rendererHash:gate.rendererHash,checkedAt:gate.checkedAt},batches,masterProof:master,preservedOriginals:true,localService:runtime.url,temporaryPsdBytesRemoved:removedBytes};
  write(path.join(work,'complete.json'),report);console.log(report);
})().catch(e=>{console.error(e);process.exitCode=1;});
