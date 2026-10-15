'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const M = require('./model.cjs'), set = require('./set.json'), D = require('../../atelier/designer-core.cjs');
const {buildCatalog} = require('../../atelier/game-catalog.cjs'), {createEngine} = require('../../site/engine.js');
const {fixture} = require('./test-fixture.cjs');
const clone = value => structuredClone(value);
const catalogueBefore = fs.readFileSync(D.CATALOGUE);
test.after(() => assert.deepEqual(fs.readFileSync(D.CATALOGUE),catalogueBefore));
const profiles = () => set.cards.map(c => M.profile(c,D));
const published = () => profiles().map(profile => ({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'}));
const oldPublications = () => D.catalogue().cards.filter(c => c.kind==='created' && !set.cards.some(s => s.id===c.id));

test('13 models, 11 characters, exact user positions and elements', () => {
  M.validateSet(set);
  for (const c of set.cards) M.validateProfile(M.profile(c,D),c);
  const expected = { 'revolver-ocelot':[2], 'sniper-wolf':[4,5], 'vulcan-raven':[1], ninja:[2,3,4], meryl:[2], 'psycho-mantis':[4], 'malaba-mine':[1], 'voloden-mine':[3,4], 'momo-silence':[5] };
  for (const [key,positions] of Object.entries(expected)) assert.deepEqual(set.cards.find(c=>c.key===key).positions,positions);
  assert.equal(set.cards.find(c=>c.key==='vulcan-raven').element,'CRYO');
  assert.equal(set.cards.find(c=>c.key==='psycho-mantis').element,'NECRO');
  assert.equal(set.cards.find(c=>c.key==='malaba-mine').weapon,'Hache');
});
test('IDs do not collide with current catalogue or designer reservations', () => {
  const L=require('../../atelier/lib.cjs'), own=new Set(set.cards.map(c=>c.id)), ids=new Set(D.catalogue().cards.filter(c=>!own.has(c.id)).map(c=>c.id));
  const dir=path.join(L.DATA,'designer/requests');
  if(fs.existsSync(dir)) for(const n of fs.readdirSync(dir).filter(n=>n.endsWith('.json'))) ids.add(L.read(path.join(dir,n)).modelId);
  for(const c of set.cards) assert.ok(!ids.has(c.id),'Already taken: '+c.id);
});
test('strict principal-role ceilings and support restrictions', () => {
  for(const c of set.cards) for(const side of ['atk','defense']) {
    const s=clone(set), item=s.cards.find(x=>x.key===c.key), i=item[side].findIndex(v=>typeof v==='number');
    item[side][i]=require('../../../V3/donnees/regles_demo.json').roleBounds[c.role][side][i]+1;
    assert.throws(()=>M.validateSet(s),/Plafond/);
  }
  for(const effect of ['guard','revive']) { const s=clone(set);s.cards.find(c=>c.key==='meryl').atk[2]=effect;assert.throws(()=>M.validateSet(s)); }
  const s=clone(set);s.cards.find(c=>c.key==='malaba-mine').magic=[6];assert.throws(()=>M.validateSet(s));
});
test('three Snake models share one character and cannot share a deck', async () => {
  const data=await buildCatalog({published:[...oldPublications(),...published()]}), e=createEngine(data);
  const qa=M.validateGame(data,set,createEngine)[0]; assert.deepEqual(e.validatePlayableDeck(qa.cards),[]);
  for(const replacement of ['48683979','46676157']) { const deck=[...qa.cards];deck[1]=replacement;assert.ok(e.validatePlayableDeck(deck).some(s=>/personnage/i.test(s))); }
  assert.equal(new Set(set.cards.filter(c=>c.collaboration).map(M.characterId)).size,8);
});
test('canonical Kalistar lineage remains shared across variants', async () => {
  const data=await buildCatalog({published:[...oldPublications(),...published()]});
  for(const spec of set.cards.filter(c=>c.lineage)) assert.equal(data.cards.find(c=>c.id===spec.lineage).characterId,spec.characterId);
  assert.equal(set.cards.find(c=>c.key==='ninja').race,'CYBORG');
  assert.equal(set.cards.find(c=>c.key==='ninja').defense.filter(v=>v==='dodge').length,1);
});
test('MGS1/MGS2/MGS4 synergies stay separate', async () => {
  const data=await buildCatalog({published:published()}), e=createEngine(data);
  const board=['45297565','48312725','48683979','46676157'].map(cardId=>({cardId}));
  assert.equal(e.synergy({board},board[0],'faction'),10);
  assert.equal(e.synergy({board},board[2],'faction'),0);
  assert.equal(e.synergy({board},board[3],'faction'),0);
});
test('additive build preserves every old card and all arenas', async () => {
  const before=await buildCatalog({published:oldPublications()}), after=await buildCatalog({published:[...oldPublications(),...published()]});
  assert.equal(after.cards.length,before.cards.length+13);
  assert.deepEqual(after.cards.filter(c=>before.cards.some(b=>b.id===c.id)),before.cards);
  assert.deepEqual(after.arenas,before.arenas);
});
test('narratives use no more than four preview lines', async () => {
  const R=require('../../atelier/designer-render.cjs');
  for(const c of set.cards) { const lines=(await R.previewText(M.donor(c,D))).filter(l=>l.top>=1200);assert.ok(lines.length<=4,c.key+': '+lines.length+' lines'); }
});
test('native composer parses and uses only the approved Photoshop 2025 instance', () => {
  for(const f of ['compose.jsx','compose-one.jsx']) assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(__dirname,f),'utf8').replace(/^#.*$/gm,'')));
  const script=fs.readFileSync(path.join(__dirname,'render.ps1'),'utf8');
  assert.match(script,/GetActiveObject\('Photoshop.Application.190'\)/);assert.match(script,/26\.11\.7/);assert.doesNotMatch(script,/New-Object -ComObject/);
});
test('supplied sources are preserved exactly and faction masks match approved geometry', async () => {
  const L=require('../../atelier/lib.cjs');
  await require('./assets.cjs').createAssets(L,__dirname).verify();
  for(const c of set.cards) {
    const source=path.join(L.ROOT,M.artPath(c)), copy=path.join(__dirname,'cards',c.key,'illustration.png');
    const m=await L.sharp(source).metadata();assert.equal(m.format,'png');
    if(fs.existsSync(copy)) assert.equal(await L.hash(copy),await L.hash(source));
  }
});
test('publication is additive, atomic and idempotent for mixed factions', async () => {
  const f=fixture(), before=clone(f.D.catalogue());
  assert.equal((await f.publisher.preflight()).added,13);assert.deepEqual(f.ops,[]);
  assert.equal((await f.publisher.publish()).added,13);f.assertOldFiles();
  const after=f.D.catalogue();assert.deepEqual(after.cards.slice(0,before.cards.length),before.cards);
  assert.equal(after.cards.length,before.cards.length+13);assert.equal((await f.publisher.publish()).mode,'unchanged');
  assert.equal(after.cards.filter(c=>c.profile.characterId==='solid-snake-mgs').length,3);
});
test('copy, install and index failures preserve the catalogue and recover', async () => {
  for(const phase of ['copy','install','commit']) {
    const f=fixture();let installs=0;
    f.fault(e=>{if(phase==='copy'&&e.op==='copy'&&e.from.endsWith('card.psd')||phase==='install'&&e.op==='rename'&&e.from.includes(path.sep+'staging'+path.sep)&&++installs===3||phase==='commit'&&e.op==='rename'&&e.to===f.D.CATALOGUE)throw Error('INJECTED');});
    await assert.rejects(f.publisher.publish(),/INJECTED/);assert.deepEqual(f.files.get(f.D.CATALOGUE),f.initial.get(f.D.CATALOGUE));f.assertOldFiles();
    assert.ok(!f.files.has(f.lock));f.fault(()=>{});assert.equal((await f.publisher.publish()).added,13);
  }
});
test('concurrent edits, tampered proof and foreign IDs are never overwritten', async () => {
  const f=fixture();let once=false;
  f.fault(e=>{if(!once&&e.op==='copy'){once=true;const cat=f.D.catalogue();cat.concurrent='keep';f.put(f.D.CATALOGUE,cat);}});
  await assert.rejects(f.publisher.publish(),/Catalogue modifie/);assert.equal(f.read(f.D.CATALOGUE).concurrent,'keep');
  for(const tamper of [
    f=>f.seed(path.join(f.source('solid-snake-mgs1'),'card.png'),'tamper'),
    f=>{const c=f.D.catalogue();c.cards.push({...c.cards[0],id:set.cards[0].id});f.put(f.D.CATALOGUE,c);},
    f=>{const p=f.read(path.join(f.source('malaba-mine'),'verification.json'));delete p.none;f.put(path.join(f.source('malaba-mine'),'verification.json'),p);},
    f=>f.put(f.lock,{id:'someone-else'})
  ]) { const g=fixture();tamper(g);const before=new Map(g.files);await assert.rejects(g.publisher.publish());assert.deepEqual(g.files,before); }
});
