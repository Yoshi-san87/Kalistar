const test=require('node:test');
const vm=require('node:vm');
const L=require('./lib.cjs');
const {fs,path,assert}=L;
function isolatedStore(){
  const root=path.join(L.DATA,'publication-test-'+L.crypto.randomUUID());
  fs.mkdirSync(root,{recursive:true});const module={exports:{}};
  const localLib={...L,ROOT:root,DATA:path.join(root,'data')};
  const code=fs.readFileSync(path.join(__dirname,'designer-core.cjs'),'utf8');
  const run=vm.runInThisContext('(function(require,module,exports){'+code+'\n})');
  run(name=>name==='./lib.cjs'?localLib:require(name),module,module.exports);
  return {D:module.exports,root,cleanup(){
    const resolved=path.resolve(root),base=path.resolve(L.DATA)+path.sep;
    assert.ok(resolved.startsWith(base)&&path.basename(resolved).startsWith('publication-test-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }};
}
async function verifiedJob(D){
  const profile={...D.defaults(),name:'TEST PUBLICATION',title:'CONTROLE ISOLE',job:'ARTISTE'};
  const job=D.create({requestId:L.crypto.randomUUID(),profile}),dir=D.folder(job.id),request=L.read(path.join(dir,'request.json'));
  const hashes={};
  // Unit-test sentinels, not purported native Photoshop renderings.
  for(const f of ['card.png','card.psd']){fs.writeFileSync(path.join(dir,f),'test sentinel '+f);hashes[f]=await L.hash(path.join(dir,f));}
  L.write(path.join(dir,'verification.json'),{passed:true,modelId:request.card.id,requestHash:await L.hash(path.join(dir,'request.json')),hashes});
  D.setStatus(job.id,'verified');return {job,dir,request};
}
test('Publication is atomic, additive and idempotent in an isolated store',async()=>{
  const store=isolatedStore(),{D}=store;
  try{
    D.initialize();const before=D.catalogue().cards;const {job,request}=await verifiedJob(D);
    const result=await D.publish(job.id);assert.equal(D.status(job.id).state,'published');assert.equal(D.catalogue().cards.length,before.length+1);
    const dest=path.join(store.root,'V4/creations',request.card.id);assert.ok(fs.existsSync(path.join(dest,'card.psd')));assert.equal(L.read(path.join(dest,'profile.json')).name,'TEST PUBLICATION');
    assert.deepEqual(await D.publish(job.id),result);assert.equal(D.catalogue().cards.length,before.length+1);
    assert.deepEqual(D.catalogue().cards.filter(c=>c.kind==='approved'),before);
  }finally{store.cleanup();}
});
test('Tampered files or metadata never enter the site catalogue',async()=>{
  const store=isolatedStore(),{D}=store;
  try{
    D.initialize();const before=D.catalogue().cards;const a=await verifiedJob(D);fs.appendFileSync(path.join(a.dir,'card.png'),'tamper');
    await assert.rejects(()=>D.publish(a.job.id),/rendu a change/);assert.deepEqual(D.catalogue().cards,before);
    const b=await verifiedJob(D);const changed=L.read(path.join(b.dir,'request.json'));changed.card.name='CHANGED';L.write(path.join(b.dir,'request.json'),changed);
    await assert.rejects(()=>D.publish(b.job.id),/fiche a change/);assert.deepEqual(D.catalogue().cards,before);
  }finally{store.cleanup();}
});
test('Gameplay validation occurs before committing a rendered card',async()=>{
  const store=isolatedStore(),{D}=store;
  try{
    D.initialize();const before=D.catalogue().cards;const {job,dir}=await verifiedJob(D),request=L.read(path.join(dir,'request.json'));
    request.card.atk[0]='revive';request.card.canHeal=true;request.card.role=2;request.card.positions=[2];L.write(path.join(dir,'request.json'),request);
    const verification=L.read(path.join(dir,'verification.json'));verification.requestHash=await L.hash(path.join(dir,'request.json'));L.write(path.join(dir,'verification.json'),verification);
    await assert.rejects(()=>D.publish(job.id),/P5/);assert.deepEqual(D.catalogue().cards,before);assert.equal(fs.existsSync(path.join(store.root,'V4/creations',request.card.id)),false);
  }finally{store.cleanup();}
});
