const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const {fs,path,ROOT,DATA,read,write,hash,assert,sharp}=L;
const work=__dirname;
(async()=>{
  const plan=read(path.join(work,'plan.json')),pub=read(path.join(work,'published.json')),old=read(path.join(work,'references-before.json'));
  const refs=L.baseline(),gate=read(path.join(DATA,'regression.json')),audit=read(path.join(work,'verification.json'));
  assert.equal(refs.id,pub.referenceId);assert.equal(gate.referenceId,refs.id);assert.equal(gate.rendererHash,await L.rendererHash());
  assert.equal(gate.passed,true);assert.equal(gate.results.length,refs.cards.length);
  for(const r of gate.results){assert.equal(r.passed,true);assert.equal(r.comparison.changed,0);assert.equal(r.roundtrip.changed,0);assert.equal(r.barcode.passed,true);}
  for(const [f,h] of Object.entries(old.protectedFiles))assert.equal(await hash(path.join(ROOT,pub.backups[f]||f)),h,'Original not preserved: '+f);
  const protectedFiles=await L.protectedCheck(),components=await R.verifyAssets();
  const cloud=plan.items.find(i=>i.key==='cloud-trial');
  if(cloud){
    const entry=audit.results.find(r=>r.key===cloud.key),dir=path.dirname(path.join(ROOT,cloud.png));
    const barcode=JSON.parse(await R.command(L.PYTHON,[path.join(ROOT,'V4/atelier/barcode.py'),path.join(ROOT,cloud.png),'47208326']));assert.equal(barcode.passed,true);
    write(path.join(dir,'weapon-rim-verification.json'),{passed:true,revision:plan.revision,referenceId:refs.id,...entry,barcode,published:false,previousVerification:'verification.json',checkedAt:new Date().toISOString()});
    const small=path.join(dir,'small-preview.png'),saved=path.join(work,'originals',path.relative(ROOT,small));fs.mkdirSync(path.dirname(saved),{recursive:true});
    if(!fs.existsSync(saved))fs.copyFileSync(small,saved);
    await sharp(path.join(ROOT,cloud.png)).extract({left:50,top:50,width:797,height:1388}).resize({width:320}).toFile(small);
  }
  const taulio=plan.items.find(i=>i.key==='taulio'),crop={left:80,top:1100,width:128,height:128};
  const left=await sharp(path.join(ROOT,pub.backups[taulio.png])).extract(crop).resize(384,384).png().toBuffer();
  const right=await sharp(path.join(ROOT,taulio.png)).extract(crop).resize(384,384).png().toBuffer();
  await sharp({create:{width:776,height:384,channels:4,background:'#142029'}}).composite([{input:left,left:0,top:0},{input:right,left:392,top:0}]).png().toFile(path.join(work,'before-after.png'));
  let removedBytes=0;
  for(const i of plan.items){
    const staged=L.inside(path.join(work,'staged'),i.key+'/card.psd');
    if(fs.existsSync(staged)){assert.equal(await hash(staged),await hash(path.join(ROOT,i.psd)));removedBytes+=fs.statSync(staged).size;fs.unlinkSync(staged);}
  }
  const runtime=read(path.join(DATA,'runtime.json')),status=await (await fetch(runtime.url+'/api/status')).json();
  assert.equal(status.integrity.state,'intact');assert.equal(status.gate.passed,true);
  for(const key of ['momo','taulio','ruby']){
    const response=await fetch(runtime.url+'/media/reference/'+key+'.png');assert.equal(response.status,200);
    assert.equal(L.crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),refs.protectedFiles[refs.cards.find(c=>c.key===key).png]);
  }
  const report={passed:true,referenceId:refs.id,checkedAt:new Date().toISOString(),cards:refs.cards.length,masters:2,privateTrials:cloud?1:0,outsidePixels:0,nativeRegression:{passed:gate.passed,count:gate.results.length,checkedAt:gate.checkedAt},protectedFiles,componentHashes:Object.keys(components.hashes).length,originalsPreserved:true,temporaryPsdBytesRemoved:removedBytes,url:runtime.url+'/jeu/'};
  write(path.join(work,'complete.json'),report);console.log(report);
})().catch(e=>{console.error(e);process.exitCode=1;});
