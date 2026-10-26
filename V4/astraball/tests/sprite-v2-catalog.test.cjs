const test=require('node:test'),assert=require('node:assert/strict');
const {planEntries,workerPages,workerRecipes,canReuseBake}=require('../tools/sprite-v2-catalog.cjs');
const character={characterId:'example',modelId:'30000001',modelIds:['30000001','30000002'],name:'Example',reference:'art.png',referenceSha256:'a'.repeat(64),race:'HUMAIN',faction:'Chroma'};
const native={characterId:'example',modelId:'30000001',name:'Example',heightCm:182,bodyPixels:116,weapon:'Lance',physicalFamily:'polearm',magicFamily:'orb'};
test('native reuse requires unchanged sources and the same body and animation contract',()=>{
  const previous={...native,workerFingerprint:'same-sources',bakes:[{manifest:'native-r1/actor.json'}]};
  assert.equal(canReuseBake(previous,native,'same-sources'),true);
  assert.equal(canReuseBake(previous,native,'new-sources'),false);
  assert.equal(canReuseBake(null,native,'same-sources'),false);
  assert.equal(canReuseBake({...previous,bakes:[]},native,'same-sources'),false);
  for(const [key,value] of Object.entries({characterId:'other',modelId:'30000002',heightCm:205,bodyPixels:131,weapon:'Hache',physicalFamily:'heavy',magicFamily:'staff'})){
    assert.equal(canReuseBake(previous,{...native,[key]:value},'same-sources'),false,key);
  }
});
test('full catalogue plans one exact appearance per identity without silently aliasing card variants',()=>{
  const [entry]=planEntries([character],[native],[]);
  assert.equal(entry.modelId,'30000001');assert.deepEqual(entry.variantModelIds,['30000001','30000002']);assert.equal(entry.pilotManifest,null);
  assert.throws(()=>planEntries([character],[{...native,modelId:'30000002'}],[]),/No exact model/);
  assert.throws(()=>planEntries([character,character],[native],[]),/Duplicate/);
  assert.throws(()=>planEntries([{...character,characterId:'../private'}],[native],[]),/unsafe/);
  assert.throws(()=>planEntries([character],[{...native,heightCm:null}],[]),/Incomplete native/);
});
test('only the matching pilot model may be reused, and it stays in its existing directory',()=>{
  const pilot={characterId:'example',modelId:'30000001',manifest:'example/native-r3/actor.json'};
  assert.equal(planEntries([character],[native],[pilot])[0].pilotManifest,'ten-characters/example/native-r3/actor.json');
  assert.equal(planEntries([character],[native],[{...pilot,modelId:'30000002'}])[0].pilotManifest,null);
});
test('worker handoff requires four complete, calibrated, uniquely named sources and exact identity',()=>{
  const worker={characterId:'example',modelId:'30000001',subject:'Distinct adult character in a blue travel costume.',pages:Array.from({length:4},(_,page)=>({page,file:`source-${page}-r1.png`,sha256:'a'.repeat(64),prompt:'Full native sprite generation prompt. '.repeat(5),referenceFrame:0,crownInsetPx:12}))};
  assert.equal(workerPages(worker,native).length,4);
  assert.equal(Object.hasOwn(workerRecipes(worker.pages)[0],'soleInsetPx'),false);
  const soles=structuredClone(worker);soles.pages[0].soleInsetPx=20;
  assert.equal(workerRecipes(workerPages(soles,native))[0].soleInsetPx,20);
  for(const value of [null,'20',-1,.5,Infinity]){soles.pages[0].soleInsetPx=value;assert.throws(()=>workerPages(soles,native),/sole measurement/);}
  assert.throws(()=>workerPages({...worker,modelId:'30000002'},native),/identity/);
  assert.throws(()=>workerPages({...worker,pages:worker.pages.slice(0,3)},native),/Four source/);
  for(const [field,value] of [['file','../../source-0-r1.png'],['sha256','incorrect'],['prompt',''],['referenceFrame',16],['crownInsetPx',-1]]){
    const broken=structuredClone(worker);broken.pages[0][field]=value;assert.throws(()=>workerPages(broken,native));
  }
  const duplicate=structuredClone(worker);duplicate.pages[1]=duplicate.pages[0];assert.throws(()=>workerPages(duplicate,native),/duplicate/);
  const origins=structuredClone(worker);
  origins.pages[0].sourceOrigins={schemaVersion:1,sourceSha256:'a'.repeat(64),coordinateSpace:'source-pixels',method:'manual',review:'proposed',
    note:'Ground and root measured against the exact source page.',
    points:Array.from({length:16},()=>({x:40,y:100,grounded:false}))};
  assert.equal(workerPages(origins,native)[0].sourceOrigins.points[0].grounded,false);
  origins.pages[0].sourceOrigins.sourceSha256='b'.repeat(64);
  assert.throws(()=>workerPages(origins,native),/stale/);
  const authored=structuredClone(worker);
  authored.pages[0].authoredPlacement={schemaVersion:1,status:'authored-proposal',source:{sha256:'a'.repeat(64)}};
  assert.deepEqual(workerRecipes(workerPages(authored,native))[0].authoredPlacement,authored.pages[0].authoredPlacement);
  assert.equal(Object.hasOwn(workerRecipes(worker.pages)[0],'authoredPlacement'),false);
  authored.pages[0].sourceOrigins=origins.pages[0].sourceOrigins;
  assert.throws(()=>workerPages(authored,native),/never both/);
  delete authored.pages[0].sourceOrigins;
  authored.pages[0].authoredPlacement.source.sha256='b'.repeat(64);
  assert.throws(()=>workerPages(authored,native),/stale/);
  authored.pages[0].authoredPlacement=null;
  assert.throws(()=>workerPages(authored,native),/missing or stale/);
});
