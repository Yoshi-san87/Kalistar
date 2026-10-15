'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createPublisher,appendEntry}=require('./publish.cjs');
const F=require('./publish-fixture.cjs');
const exists=(f,p)=>fs.existsSync(f.file(p));
const bytes=(f,p)=>fs.readFileSync(f.file(p));
const noTargets=f=>{for(const p of Object.values(f.targets))assert.equal(exists(f,p),false);};

test('preflight is read-only, requires actual Replicant homes and binds both media hashes',async t=>{
  const f=F.fixture(t),before=bytes(f,f.registryPath),catalogue=bytes(f,f.catalogue);
  const r=await f.publisher.preflight();assert.equal(r.mode,'preflight');assert.equal(r.assets.length,2);
  assert.deepEqual(r.eligibleCards.map(c=>c.characterId),F.HOMES);assert.ok(r.eligibleCards.every(c=>c.faction==='Replicant'));
  assert.deepEqual(bytes(f,f.registryPath),before);assert.deepEqual(bytes(f,f.catalogue),catalogue);
  noTargets(f);assert.equal(exists(f,F.HOME+'/publication'),false);assert.equal(exists(f,f.lock),false);
});

test('publication is additive, preserves every prior registry byte, and is idempotent',async t=>{
  const f=F.fixture(t),catalogue=bytes(f,f.catalogue),r=await f.publisher.publish();
  assert.equal(r.mode,'published');assert.deepEqual(f.read(f.registryPath),[f.old,F.spec.entry]);
  const after=bytes(f,f.registryPath),i=r.insertion;
  assert.deepEqual(Buffer.concat([after.subarray(0,i.offset),after.subarray(i.offset+i.bytes)]),f.before);
  assert.deepEqual(bytes(f,f.catalogue),catalogue);
  for(const a of r.assets)assert.equal(F.sha(bytes(f,a.target)),a.sha256);
  assert.deepEqual(bytes(f,F.HOME+'/publication/'+r.transaction+'/arenes.before.json'),f.before);
  assert.equal(f.read(F.HOME+'/publication/'+r.transaction+'/published.json').mode,'published');
  const again=await f.publisher.publish();assert.equal(again.mode,'unchanged');assert.equal(fs.readdirSync(f.file(F.HOME+'/publication')).length,1);
  assert.deepEqual(bytes(f,f.registryPath),after);assert.equal(exists(f,f.lock),false);
});

test('array append handles empty/minified/CRLF/BOM registries without normalizing old bytes',()=>{
  for(const original of ['[]','[  ]\n','\uFEFF[\r\n]\r\n','[{"old":1}]','[\r\n {"old":1}\r\n]\r\n']){
    const b=Buffer.from(original),old=JSON.parse(original.replace(/^\uFEFF/,'')),r=appendEntry(b,old,{next:2});
    assert.deepEqual(JSON.parse(r.next.toString().replace(/^\uFEFF/,'')),[...old,{next:2}]);
    assert.deepEqual(Buffer.concat([r.next.subarray(0,r.insertion.offset),r.next.subarray(r.insertion.offset+r.insertion.bytes)]),b);
  }
});

test('existing correct media are reused, never rewritten, and missing media can be repaired',async t=>{
  const f=F.fixture(t);f.write(f.targets.arena,bytes(f,f.source));const before=fs.statSync(f.file(f.targets.arena));
  await f.publisher.publish();assert.equal(fs.statSync(f.file(f.targets.arena)).mtimeMs,before.mtimeMs);
  fs.unlinkSync(f.file(f.targets.faction));const registry=bytes(f,f.registryPath);
  const r=await f.publisher.publish();assert.equal(r.added,false);assert.equal(r.mode,'published');assert.deepEqual(bytes(f,f.registryPath),registry);
});

test('missing or Automata-only twins do not satisfy actual Replicant publication',async t=>{
  for(const mode of ['missing','wrong-faction','wrong-id']){
    const f=F.fixture(t),data=f.read(f.catalogue);
    if(mode==='missing')data.cards.pop();else if(mode==='wrong-faction')data.cards[3].profile.faction='NieR';else data.cards[3].profile.characterId='popola-other';
    f.put(f.catalogue,data);await assert.rejects(f.publisher.preflight(),/Personnage Replicant non publie/);noTargets(f);
  }
});

test('test-only and unpublished card sources are rejected',async t=>{
  for(const field of ['testOnly','profileTestOnly','published']){
    const f=F.fixture(t),data=f.read(f.catalogue);
    if(field==='testOnly')data.cards[0].testOnly=true;
    else if(field==='profileTestOnly')data.cards[0].profile.testOnly=true;
    else data.cards[0].profile.published=false;
    f.put(f.catalogue,data);await assert.rejects(f.publisher.preflight(),/Publication de test interdite/);
  }
});

test('missing or stale review for either image blocks preflight as well as publish',async t=>{
  for(const mode of ['false','arena','flag','packed','missing']){
    const f=F.fixture(t),p=F.HOME+'/art-review.json',review=f.read(p);
    if(mode==='false')review.reviewed=false;
    else if(mode==='arena')review.assets.village.sha256='wrong';
    else if(mode==='flag')delete review.assets['faction-Replicant'];
    else if(mode==='packed')review.assets['faction-Replicant'].packedSha256='wrong';
    if(mode==='missing')fs.unlinkSync(f.file(p));else f.put(p,review);
    await assert.rejects(f.publisher.preflight());await assert.rejects(f.publisher.publish());noTargets(f);assert.equal(exists(f,f.lock),false);
  }
});

test('source media and native faction proofs must match hashes and format',async t=>{
  for(const change of [
    f=>f.write(f.source,'changed'),f=>f.write(F.BANNER+'/flag-Replicant.png','changed'),
    f=>f.write(F.BANNER+'/flag-Replicant-packed.png','changed'),f=>f.write(F.BANNER+'/flag-source.png','changed'),
    f=>{const p=f.read(F.BANNER+'/verification.json');p.alphaMismatch=1;f.put(F.BANNER+'/verification.json',p);},
    f=>{const p=f.read(F.BANNER+'/faction.json');p.id='NieR';f.put(F.BANNER+'/faction.json',p);},
    f=>{f.options.decodeImage=async()=>({format:'png',width:500,height:900,hasAlpha:true});},
    f=>{f.options.decodeImage=async(b,k)=>({format:'png',width:k==='arena'?1672:109,height:k==='arena'?941:230,hasAlpha:false});},
    f=>{f.options.decodeImage=async()=>({format:'jpeg',width:1672,height:941});}
  ]){const f=F.fixture(t);change(f);await assert.rejects(f.optionsPublisher().preflight());noTargets(f);}
});

test('conflicting target media are never overwritten',async t=>{
  for(const key of ['arena','faction']){
    const f=F.fixture(t);f.write(f.targets[key],'unrelated existing asset');
    await assert.rejects(f.publisher.publish(),/Media existant different/);
    assert.equal(bytes(f,f.targets[key]).toString(),'unrelated existing asset');assert.deepEqual(bytes(f,f.registryPath),f.before);
  }
});

test('existing conflicting metadata is rejected without changing the original registry',async t=>{
  const f=F.fixture(t);f.put(f.registryPath,[f.old,{...F.spec.entry,subtitle:'Do not replace'}]);const old=bytes(f,f.registryPath);
  await assert.rejects(f.publisher.publish(),/Arene existante differente/);assert.deepEqual(bytes(f,f.registryPath),old);noTargets(f);
});

test('occupied render lock is respected and never removed',async t=>{
  const f=F.fixture(t);f.write(f.lock,'other Photoshop owner');
  await assert.rejects(f.publisher.preflight(),/occupe/);await assert.rejects(f.publisher.publish(),/EEXIST/);
  assert.equal(bytes(f,f.lock).toString(),'other Photoshop owner');noTargets(f);
});

test('a source or catalogue race during decoding fails before media installation',async t=>{
  const f=F.fixture(t),decode=f.options.decodeImage;let once=false;
  f.options.decodeImage=async(b,k)=>{if(!once){once=true;f.put(f.catalogue,{cards:[...f.cards,{kind:'created',id:'49999999',profile:{characterId:'extra',faction:'Chroma'}}]});}return decode(b,k);};
  await assert.rejects(f.optionsPublisher().publish(),/Source modifiee depuis le preflight/);noTargets(f);assert.deepEqual(bytes(f,f.registryPath),f.before);
});

test('copy-phase failure rolls back only files created by this transaction',async t=>{
  for(const preexisting of [false,true]){
    const f=F.fixture(t);if(preexisting)f.write(f.targets.arena,bytes(f,f.source));
    f.options.checkpoint=async stage=>{if(stage==='after-media:faction')throw Error('fixture failure');};
    await assert.rejects(f.optionsPublisher().publish(),/fixture failure/);
    assert.deepEqual(bytes(f,f.registryPath),f.before);assert.equal(exists(f,f.targets.arena),preexisting);assert.equal(exists(f,f.targets.faction),false);
    assert.equal(exists(f,f.lock),false);
  }
});

test('failure after atomic registry commit restores exact original bytes and owned media',async t=>{
  const f=F.fixture(t);f.options.checkpoint=async stage=>{if(stage==='after-commit')throw Error('post-commit failure');};
  await assert.rejects(f.optionsPublisher().publish(),/post-commit failure/);assert.deepEqual(bytes(f,f.registryPath),f.before);noTargets(f);
  const txn=fs.readdirSync(f.file(F.HOME+'/publication'))[0],failed=f.read(F.HOME+'/publication/'+txn+'/failed.json');
  assert.equal(failed.registryRestored,true);assert.deepEqual(failed.issues,[]);assert.equal(exists(f,f.lock),false);
});

test('foreign registry change after commit is preserved and media kept for its references',async t=>{
  const f=F.fixture(t);let external;
  f.options.checkpoint=async stage=>{if(stage==='after-commit'){f.put(f.registryPath,[...f.read(f.registryPath),{...f.old,id:'external-arena'}]);external=bytes(f,f.registryPath);throw Error('foreign edit');}};
  await assert.rejects(f.optionsPublisher().publish(),/Rollback incomplet/);assert.deepEqual(bytes(f,f.registryPath),external);
  assert.ok(exists(f,f.targets.arena)&&exists(f,f.targets.faction));assert.equal(exists(f,f.lock),false);
});

test('foreign media edits survive rollback while the other owned media is removed',async t=>{
  const f=F.fixture(t);f.options.checkpoint=async stage=>{if(stage==='after-commit'){f.write(f.targets.arena,'external pixels');throw Error('foreign media');}};
  await assert.rejects(f.optionsPublisher().publish(),/Rollback incomplet/);assert.equal(bytes(f,f.targets.arena).toString(),'external pixels');
  assert.equal(exists(f,f.targets.faction),false);assert.deepEqual(bytes(f,f.registryPath),f.before);
});

test('destination appeared between preflight and copy is preserved',async t=>{
  const f=F.fixture(t);f.options.checkpoint=async stage=>{if(stage==='before-media')f.write(f.targets.faction,'another writer');};
  await assert.rejects(f.optionsPublisher().publish(),/Destination apparue/);assert.equal(bytes(f,f.targets.faction).toString(),'another writer');
  assert.equal(exists(f,f.targets.arena),false);assert.deepEqual(bytes(f,f.registryPath),f.before);
});

test('unsafe source paths and junction destinations are rejected',async t=>{
  const f=F.fixture(t),spec=F.clone(F.spec);spec.source='../outside.png';f.put(F.HOME+'/spec.json',spec);f.put(F.HOME+'/manifest.json',{...F.manifest,arenas:[spec]});
  await assert.rejects(f.publisher.preflight());
  const j=F.fixture(t),outside=path.join(j.root,'outside');fs.mkdirSync(outside);fs.mkdirSync(j.file('V4/site/assets'),{recursive:true});
  fs.symlinkSync(outside,j.file('V4/site/assets/factions'),'junction');
  await assert.rejects(j.publisher.preflight(),/Lien symbolique/);assert.deepEqual(fs.readdirSync(outside),[]);
});

test('lost publication lock is not removed and prevents commit',async t=>{
  const f=F.fixture(t);f.options.checkpoint=async stage=>{if(stage==='after-media:arena')f.write(f.lock,'new lock owner');};
  await assert.rejects(f.optionsPublisher().publish(),/Verrou de publication perdu/);assert.equal(bytes(f,f.lock).toString(),'new lock owner');
  assert.deepEqual(bytes(f,f.registryPath),f.before);noTargets(f);
});

test('mutation during the final async catalogue verification is detected',async t=>{
  const f=F.fixture(t),builder=f.options.buildCatalog;let calls=0;
  f.options.buildCatalog=async args=>{
    const data=await builder(args);if(++calls===2)f.write(f.targets.faction,'external final edit');return data;
  };
  await assert.rejects(f.optionsPublisher().publish(),/Media modifie apres publication/);
  assert.deepEqual(bytes(f,f.registryPath),f.before);assert.equal(exists(f,f.targets.arena),false);
  assert.equal(bytes(f,f.targets.faction).toString(),'external final edit');
});

test('real generated PNGs pass decoding and hash validation inside an isolated fixture',async t=>{
  const f=F.fixture(t),root=path.resolve(__dirname,'../../../..');
  for(const p of [f.source,F.BANNER+'/flag-source.png',F.BANNER+'/flag-Replicant.png',F.BANNER+'/flag-Replicant-packed.png',
    F.BANNER+'/faction.json',F.BANNER+'/verification.json',F.HOME+'/verification.json','V4/propositions/collaborations/cloud-ff7-01/flag-FF7.png'])f.write(p,fs.readFileSync(path.join(root,p)));
  const proof=f.read(F.BANNER+'/faction.json');
  f.put(F.HOME+'/art-review.json',{reviewed:true,assets:{village:{sha256:F.sha(bytes(f,f.source))},'faction-Replicant':{sha256:proof.fullFlag.sha256,packedSha256:proof.flagHash}}});
  delete f.options.decodeImage;
  const r=await f.optionsPublisher().publish();assert.equal(r.mode,'published');
  assert.deepEqual(r.assets.map(a=>[a.width,a.height]),[[1672,941],[109,230]]);
  for(const a of r.assets)assert.equal(F.sha(bytes(f,a.target)),a.sha256);
});
