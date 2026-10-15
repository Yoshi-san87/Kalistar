const test=require('node:test');
const L=require('./lib.cjs');
const {assert,fs,path,DATA,baseline,editable,validatePatch}=L;
const ref=baseline(),momo=ref.cards.find(c=>c.key==='momo'),none=ref.cards.find(c=>c.key==='malaba');
test('current references retain historical identities and independent working copies',()=>{
  const historical={momo:'30000001',taulio:'30000013','jelly-joe':'30000032','momo-bal':'30000014',rikka:'40000042',ruby:'30000039',cana:'30000002',scrow:'30000015',soryn:'30000040',gilmarr:'30000038',darnako:'30000004',malinia:'30000005',aelis:'30000006',iliane:'30000017',belrog:'30000019',lok:'30000018',balmhyr:'30000007',magnar:'30000024',thalie:'30000041',bloom:'30000033',victorvine:'30000008',kaylis:'30000012',elenion:'30000036',seraphina:'30000020',valazar:'30000034',malaba:'30000022'};
  assert.equal(new Set(ref.cards.map(c=>c.key)).size,ref.cards.length);
  assert.equal(new Set(ref.cards.map(c=>c.card.id)).size,ref.cards.length);
  for(const [key,id]of Object.entries(historical))assert.equal(ref.cards.find(c=>c.key===key)?.card.id,id,key+' historical identity');
  for(const c of ref.cards){assert.ok(c.psd.startsWith('V4/templates/'));assert.ok(c.png.startsWith('V4/cartes/'));assert.ok(c.profile.startsWith('V4/template-stable/'));}
  const next=validatePatch(momo,{name:'MOMO ESSAI',positions:[5,1]});
  assert.equal(next.name,'MOMO ESSAI');assert.deepEqual(next.positions,[1,5]);assert.equal(next.id,momo.card.id);assert.equal(momo.card.name,'MOMO');
  assert.throws(()=>validatePatch(momo,{element:'PYRO'}),/protege/);
  assert.throws(()=>validatePatch(momo,{id:'90000000'}),/protege/);
  assert.throws(()=>validatePatch(momo,JSON.parse('{"__proto__":{"x":1}}')),/protege/);
});
test('strict stats, calibrated icons and crystal rules',()=>{
  assert.throws(()=>validatePatch(momo,{atk:[9999,1,1,1,1,1]}));
  assert.throws(()=>validatePatch(momo,{atk:['arbitrary',1,1,1,1,1]}));
  assert.throws(()=>validatePatch(momo,{positions:[3,3]}));
  assert.throws(()=>validatePatch(momo,{positions:[]}));
  assert.throws(()=>validatePatch(momo,{magic:[4]}));
  assert.throws(()=>validatePatch(none,{magic:[6]}),/Sans cristal/);
  assert.throws(()=>validatePatch(none,{barriers:[6]}),/Sans cristal/);
  assert.throws(()=>validatePatch(momo,{description:'bad\u2028line'}));
  assert.equal(validatePatch(momo,{name:'  MOMO  ESSAI  '}).name,'MOMO ESSAI');
});
test('filesystem containment rejects traversal and absolute paths',()=>{
  assert.throws(()=>L.inside(DATA,'../templates/card.psd'));
  assert.throws(()=>L.inside(DATA,'C:/Windows/system.ini'));
  assert.throws(()=>L.jobDir('../../V4'));
  assert.throws(()=>L.inside(DATA,'.'));
});
test('native worker parses and public scripts compile',()=>{
  const vm=require('node:vm');
  new vm.Script(fs.readFileSync(path.join(__dirname,'worker.jsx'),'utf8').replace(/^#.*$/gm,''));
  new vm.Script(fs.readFileSync(path.join(__dirname,'public/app.js'),'utf8'));
});
test('source fingerprints detect a changed file without rewriting it',async()=>{
  const target=L.inside(DATA,'test-lock-'+L.crypto.randomUUID()+'.json');
  try{
    fs.writeFileSync(target,'{"version":1}');
    const relative=path.relative(L.ROOT,target).replace(/\\/g,'/');
    const reference={protectedFiles:{[relative]:await L.hash(target)}};
    assert.equal(await L.protectedCheck(reference),1);
    fs.writeFileSync(target,'{"version":2}');
    await assert.rejects(()=>L.protectedCheck(reference),/Reference modifiee/);
    assert.equal(fs.readFileSync(target,'utf8'),'{"version":2}');
  }finally{if(fs.existsSync(target))fs.unlinkSync(target);}
});
test('HTTP origin, token, read-only originals and draft conflicts',async()=>{
  const {makeServer}=require('./server.cjs');const app=makeServer();app.setOrigin('http://127.0.0.1:0');
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;app.setOrigin(base);
  let created;
  try{
    const boot=await (await fetch(base+'/api/bootstrap')).json();assert.equal(boot.cards.length,ref.cards.length);
    assert.deepEqual(boot.cards.map(c=>c.key).sort(),ref.cards.map(c=>c.key).sort());
    const headers={'Content-Type':'application/json',Origin:base,'X-Atelier-Token':boot.token};
    assert.equal((await fetch(base+'/api/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/api/drafts',{method:'POST',headers:{...headers,Origin:'https://example.org'},body:'{}'})).status,403);
    const rawStatus=await new Promise((resolve,reject)=>{require('node:http').get(base+'/api/bootstrap',{headers:{Host:'attacker.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});
    assert.equal(rawStatus,403);
    assert.equal((await fetch(base+'/api/bootstrap',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
    assert.equal((await fetch(base+'/media/reference/momo.png',{method:'PUT',headers})).status,405);
    assert.equal((await fetch(base+'/templates/MOMO_V4_11_POSITIONS.psd')).status,404);
    const bad=await fetch(base+'/api/drafts',{method:'POST',headers,body:JSON.stringify({key:'momo',profile:{sourcePSD:'C:/Windows/x'}})});assert.equal(bad.status,400);
    assert.equal((await fetch(base+'/api/jobs',{method:'POST',headers,body:JSON.stringify({key:'momo',profile:editable(momo.card)})})).status,409);
    const profile={...editable(momo.card),name:'TEST ATELIER'};
    const saved=await fetch(base+'/api/drafts',{method:'POST',headers,body:JSON.stringify({key:'momo',profile})});assert.equal(saved.status,200);created=await saved.json();assert.equal(created.revision,1);
    const conflict=await fetch(base+'/api/drafts',{method:'POST',headers,body:JSON.stringify({...created,revision:0})});assert.equal(conflict.status,409);
    const again=await fetch(base+'/api/drafts',{method:'POST',headers,body:JSON.stringify(created)});assert.equal(again.status,200);assert.equal((await again.json()).revision,2);
    assert.equal((await fetch(base+'/api/uploads',{method:'POST',headers,body:JSON.stringify({base64:'not base64!'})})).status,400);
    const image=await fetch(base+'/media/reference/momo.png');assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');await image.arrayBuffer();
    assert.equal((await fetch(base+'/exports/'+L.crypto.randomUUID()+'/card.psd')).status,400);
  }finally{
    if(created){const target=L.inside(path.join(DATA,'drafts'),created.id+'.json');assert.equal(L.read(target).profile.name,'TEST ATELIER');fs.unlinkSync(target);}
    await new Promise(resolve=>app.server.close(resolve));
  }
});
