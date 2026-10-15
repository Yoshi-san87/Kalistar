'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const M=require('./model.cjs'),set=require('./set.json'),D=require('../../atelier/designer-core.cjs');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const registry=require('../../site/collaborations.js');
const clone=v=>JSON.parse(JSON.stringify(v));
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {fixture}=require('./test-fixture.cjs');
const catalogueBefore=fs.readFileSync(D.CATALOGUE);
test.after(()=>assert.deepEqual(fs.readFileSync(D.CATALOGUE),catalogueBefore));
const profiles=()=>set.cards.map(c=>M.profile(c,D));
const published=()=>profiles().map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'}));
test('eleven reserved models, ten distinct characters and strict face bounds',()=>{
  M.validateSet(set);
  for(const c of set.cards){
    const id=String(40000000+crypto.createHash('sha256').update('kalistar-ff10-set-01:'+c.key).digest().readUInt32BE(0)%10000000);
    assert.equal(c.id,id);M.validateProfile(M.profile(c,D),c);
  }
});
test('IDs do not collide with current cards or designer reservations',()=>{
  const L=require('../../atelier/lib.cjs'),ids=new Set(D.catalogue().cards.filter(c=>c.profile?.collaboration!=='FF10').map(c=>c.id));
  const dir=L.path.join(L.DATA,'designer/requests');
  if(L.fs.existsSync(dir))for(const n of L.fs.readdirSync(dir).filter(n=>n.endsWith('.json')))ids.add(L.read(L.path.join(dir,n)).modelId);
  for(const c of set.cards)assert.ok(!ids.has(c.id),'Already taken: '+c.id);
});
test('role bounds and effect eligibility reject invalid profiles',()=>{
  for(const c of set.cards)for(const side of ['atk','defense']){
    const next=clone(set),item=next.cards.find(x=>x.key===c.key),i=item[side].findIndex(v=>typeof v==='number');
    item[side][i]=require('../../../V3/donnees/regles_demo.json').roleBounds[c.role][side][i]+1;
    assert.throws(()=>M.validateSet(next),/Plafond/);
  }
  for(const effect of ['guard','revive']){const next=clone(set);next.cards.find(c=>c.key==='rikku').atk[1]=effect;assert.throws(()=>M.validateSet(next));}
});
test('shared Tidus identity rejects both versions in a single deck',async()=>{
  const data=await buildCatalog({published:published()}),e=createEngine(data);
  M.validateGame(data,set,createEngine);
  const cards=set.presets[0].characters.map(k=>set.cards.find(c=>c.key===k).id);cards[1]=set.cards[1].id;
  assert.ok(e.validatePlayableDeck(cards).some(x=>/personnage/i.test(x)));
  assert.equal(data.decks.presets.filter(p=>p.id.startsWith('ff10-')).length,2);
});
test('two presets differ only in Tidus and cover every position twice',async()=>{
  const data=await buildCatalog({published:published()}),e=createEngine(data),presets=M.validateGame(data,set,createEngine);
  assert.deepEqual(presets[0].cards.slice(1),presets[1].cards.slice(1));
  for(const p of presets){assert.deepEqual(e.validatePlayableDeck(p.cards),[]);assert.equal(new Set(p.cards.map(id=>e.byId[id].characterId)).size,10);}
});
test('FF10 registry and local faction asset do not leak into existing groups',()=>{
  assert.equal(registry.of({faction:'FF10'}).id,'ff10');assert.equal(registry.asset('factions','FF10'),'assets/factions/FF10.png');
  assert.equal(registry.universe({faction:'FF7'}),'FF7');assert.equal(registry.universe({faction:'Chroma'}),'kalistar');
  assert.ok(!registry.choices([]).some(([id])=>id==='FF10'));
});
test('FF10 arenas remain absent before the first FF10 publication',async()=>{
  const data=await buildCatalog();assert.ok(!data.arenas.some(a=>a.id.startsWith('ff10-')));
  const wrong=published()[0];wrong.profile.faction='FF7';wrong.profile.collaboration='FF7';
  assert.ok(!(await buildCatalog({published:[wrong]})).arenas.some(a=>a.id.startsWith('ff10-')));
});
test('arena bonuses are bounded and Tidus variants have identical home affinity',async()=>{
  const data=await buildCatalog({published:published()}),e=createEngine(data),arenas=data.arenas.filter(a=>a.id.startsWith('ff10-'));
  assert.equal(arenas.length,2);
  for(const a of arenas){
    const first=e.arenaBonuses({arenaId:a.id},{cardId:set.cards[0].id}),second=e.arenaBonuses({arenaId:a.id},{cardId:set.cards[1].id});
    assert.deepEqual(first,second);assert.equal(first.homeAttack,10);
    for(const p of profiles()){const b=e.arenaBonuses({arenaId:a.id},{cardId:p.id});assert.ok(b.attack<=25&&b.defense<=10);}
  }
});
test('FF10 synergy counts only living FF10 allies on the board',async()=>{
  const data=await buildCatalog({published:published()}),e=createEngine(data),away=data.cards.find(c=>c.faction!=='FF10');
  for(let n=1;n<=5;n++){
    const board=set.cards.slice(2,2+n).map(c=>({cardId:c.id}));
    assert.equal(e.synergy({board},board[0],'faction'),10*(n-1));
    if(n<5){const u={cardId:away.id};board.push(u);assert.equal(e.synergy({board},u,'faction'),0);assert.equal(e.synergy({board},board[0],'faction'),10*(n-1));}
  }
});
test('old catalogue card profiles remain byte-equivalent under additive build',async()=>{
  const old=D.catalogue().cards.filter(c=>c.kind==='created'&&c.profile?.collaboration!=='FF10'),before=await buildCatalog({published:old}),after=await buildCatalog({published:[...old,...published()]});
  assert.equal(before.cards.length,89);assert.equal(after.cards.length,100);
  assert.deepEqual(after.cards.filter(c=>before.cards.some(b=>b.id===c.id)),before.cards);
  assert.equal(before.arenas.length,23);assert.equal(after.arenas.length,25);
});
test('narratives fit four preview lines without touching the shared typography',async()=>{
  const R=require('../../atelier/designer-render.cjs');
  for(const c of set.cards){const lines=(await R.previewText(M.donor(c,D))).filter(l=>l.top>=1200);assert.ok(lines.length<=4,c.key+': '+lines.length+' lines');}
});
test('native composer parses and targets only the inspected Photoshop 2025 instance',()=>{
  for(const f of ['compose.jsx','compose-one.jsx'])assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(__dirname,f),'utf8').replace(/^#.*$/gm,'')));
  const script=fs.readFileSync(path.join(__dirname,'render.ps1'),'utf8');
  assert.match(script,/GetActiveObject\('Photoshop.Application.190'\)/);assert.match(script,/26\.11\.7/);assert.doesNotMatch(script,/New-Object -ComObject/);
});
test('publication is additive, atomic and idempotent with shared Tidus identity',async()=>{
  const f=fixture(),before=clone(f.D.catalogue());
  assert.equal((await f.publisher.preflight()).added,11);assert.deepEqual(f.ops,[]);
  assert.equal((await f.publisher.publish()).added,11);f.assertOldFiles();
  const after=f.D.catalogue();assert.deepEqual(after.cards.slice(0,before.cards.length),before.cards);
  assert.equal(after.cards.length,before.cards.length+11);assert.equal((await f.publisher.publish()).mode,'unchanged');
  assert.equal(after.cards.filter(c=>c.profile.characterId==='tidus-ff10').length,2);
});
test('copy, install and index commit failures preserve catalogue and recover safely',async()=>{
  for(const phase of ['copy','install','commit']){
    const f=fixture();let installs=0;
    f.fault(e=>{if(phase==='copy'&&e.op==='copy'&&e.from.endsWith('card.psd')||phase==='install'&&e.op==='rename'&&e.from.includes(path.sep+'staging'+path.sep)&&++installs===3||phase==='commit'&&e.op==='rename'&&e.to===f.D.CATALOGUE)throw Error('INJECTED');});
    await assert.rejects(f.publisher.publish(),/INJECTED/);assert.deepEqual(f.files.get(f.D.CATALOGUE),f.initial.get(f.D.CATALOGUE));f.assertOldFiles();
    assert.ok(!f.files.has(f.lock));f.fault(()=>{});assert.equal((await f.publisher.publish()).added,11);
  }
});
test('concurrent catalogue edits, altered proof and foreign IDs are never overwritten',async()=>{
  const f=fixture();let once=false;
  f.fault(e=>{if(!once&&e.op==='copy'){once=true;const cat=f.D.catalogue();cat.concurrent='keep';f.put(f.D.CATALOGUE,cat);}});
  await assert.rejects(f.publisher.publish(),/Catalogue modifie/);assert.equal(f.read(f.D.CATALOGUE).concurrent,'keep');
  for(const tamper of [
    f=>f.seed(path.join(f.source('tidus-epee'),'card.png'),'tamper'),
    f=>{const c=f.D.catalogue();c.cards.push({...c.cards[0],id:set.cards[0].id});f.put(f.D.CATALOGUE,c);},
    f=>f.files.delete(f.arena('ff10-luca-stadium')),
    f=>f.put(f.lock,{id:'someone-else'})
  ]){const g=fixture();tamper(g);const before=new Map(g.files);await assert.rejects(g.publisher.publish());assert.deepEqual(g.files,before);}
});
