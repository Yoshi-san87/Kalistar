'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const R = require('../../atelier/designer-render.cjs'), T = require('../../collaborations/nier-pilot-01/typography.cjs');
const M = require('../../expansions/2026-09-27-metal-gear-mines/model.cjs');
const S = require('./specs.cjs');
const { fs, path, ROOT, read, write, hash, sharp, assert } = L;
const rev = '2026-10-04-kalistel-armor', home = __dirname;
const f = n => path.join(home, n), rel = n => path.relative(ROOT, n).replace(/\\/g, '/');
const FILES = ['profile.json','card.png','card.psd','verification.json','illustration.png','creation.json'];
const select = key => { const cards = S.cards.filter(c => !key || key.split(',').includes(c.key)); assert(cards.length); return cards; };
const base = () => read(f('before.json'));
async function locked(fn) {
  const lock = path.join(L.DATA, 'render.lock'), id = L.crypto.randomUUID(); let fd;
  try { fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id, pid:process.pid, kind:rev })); return await fn(); }
  finally { if (fd !== undefined) { fs.closeSync(fd); if (read(lock).id === id) fs.unlinkSync(lock); } }
}
async function freeze() {
  assert(!fs.existsSync(f('before.json')), 'Never reset an existing snapshot');
  await L.protectedCheck(); await R.verifyAssets();
  const catalogue = D.catalogue(), before = { catalogue, files:{}, backups:{} };
  for (const c of catalogue.cards) {
    const names = c.kind === 'created' ? FILES.map(n => path.join(ROOT,'V4/creations',c.id,n)) : [path.join(ROOT,c.png)];
    for (const file of names) before.files[rel(file)] = await hash(file);
  }
  const targets = [D.CATALOGUE, ...S.cards.flatMap(c => FILES.map(n => path.join(ROOT,'V4/creations',c.id,n)))];
  for (const src of targets) {
    const dest = f('before/' + rel(src)); fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(src,dest,fs.constants.COPYFILE_EXCL);
    before.backups[rel(src)] = { backup:rel(dest), sha256:await hash(src) };
  }
  write(f('before.json'),before); return { frozen:Object.keys(before.files).length, cards:S.cards.length };
}
async function unchanged(includeTargets = false) {
  const targets = new Set(S.cards.map(c => c.id));
  for (const [p,h] of Object.entries(base().files)) {
    if (!includeTargets && targets.has(p.split('/')[2])) continue;
    assert.equal(await hash(path.join(ROOT,p)),h,'Preservation: '+p);
  }
  await L.protectedCheck(); await R.verifyAssets();
}
function profile(c) {
  const old = base().catalogue.cards.find(p => p.id === c.id).profile;
  return { ...old, artworkSource:M.artPath(c), visual_revision:'V4-'+rev };
}
function validate(c,p) {
  M.validateProfile(p,c);
  const old = base().catalogue.cards.find(v => v.id === c.id).profile;
  for (const key of Object.keys(old)) if (!['artworkSource','visual_revision'].includes(key)) assert.deepEqual(p[key],old[key],c.key+'.'+key);
  assert.deepEqual(Object.keys(p).sort(),Object.keys(old).sort());
}
async function prepare(key) { return locked(async () => {
  await unchanged(true);
  const prompts = read(f('art-prompts.json'));
  for (const c of select(key)) {
    const out=f('cards/'+c.key), render=path.join(out,'render'), p=profile(c), art=path.join(ROOT,M.artPath(c));
    assert(!fs.existsSync(path.join(out,'preparation.json')), 'Preparation already exists: '+c.key);
    validate(c,p); fs.mkdirSync(render,{recursive:true});
    const source=prompts.find(p=>p.key===c.key).selectedSource, selected=f('selected-art/'+c.key+'.png');
    fs.mkdirSync(path.dirname(selected),{recursive:true});
    for (const dest of [selected, art]) {
      if (fs.existsSync(dest)) assert.equal(await hash(dest),await hash(source),'Existing source differs: '+dest);
      else fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);
    }
    write(path.join(out,'profile.json'),p); fs.copyFileSync(art,path.join(out,'illustration.png'));
    const donor=M.donor(c,D), layers=await R.components(donor,{id:p.id,positionsText:true});
    layers[0]={...layers[0],input:await sharp(art).resize(R.ART.width,R.ART.height,{fit:'cover'}).png().toBuffer()};
    await sharp(await R.composite(layers)).composite(await T.preview(donor,R)).png().toFile(path.join(out,'preview.png'));
    const native=layers.filter(l=>!l.name.startsWith('POSITION SLOT ')), plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
    for (const [i,l] of native.entries()) {
      const file='component-'+String(i).padStart(2,'0')+'.png'; await sharp(l.input).png().toFile(path.join(render,file));
      plan.layers.push({file,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
    }
    write(path.join(render,'composition.json'),plan);
    await sharp(await R.composite(native)).png().toFile(path.join(render,'expected-components.png'));
    const inputs={};
    for (const n of ['profile.json','illustration.png','render/composition.json','render/expected-components.png',...plan.layers.map(l=>'render/'+l.file)]) inputs[n]=await hash(path.join(out,n));
    write(path.join(out,'preparation.json'),inputs);
  }
  return {prepared:select(key).map(c=>c.id)};
}); }
async function inputs(c) {
  const out=f('cards/'+c.key);
  for(const [n,h] of Object.entries(read(path.join(out,'preparation.json')))) assert.equal(await hash(path.join(out,n)),h);
}
async function render(key) { assert.equal(process.env.KALISTAR_ARMOR_PS,'2026-10-04'); return locked(async () => {
  await unchanged(true); const cards=select(key); for(const c of cards) await inputs(c);
  write(f('render-request.json'),{keys:cards.map(c=>c.key)});
  const output=await R.command('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
    ['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',f('render.ps1')],f('photoshop.log'));
  for(const c of cards) await inputs(c); return {output};
}); }
async function verify(key) { return locked(async () => {
  await unchanged(true); const checks=[];
  for(const c of select(key)) {
    await inputs(c); const out=f('cards/'+c.key),p=read(path.join(out,'profile.json')); validate(c,p);
    const proof=await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(out,p);
    const native=read(path.join(out,'render/native.json')); T.verify(native);
    if(p.element==='NONE') proof.none=await require('../../collaborations/ff8-set-01/build.cjs').createBuilder().noneProof(out,
      read(path.join(out,'render/composition.json')),read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')));
    assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
    const diff=await L.diff(f('before/V4/creations/'+c.id+'/card.png'),path.join(out,'card.png'),[[80,156,817,1077]]);
    assert.equal(diff.outside,0,c.key+' changes outside illustration'); assert(diff.changed>0);
    write(path.join(out,'verification.json'),{...proof,typography:true,revision:rev,artOnly:diff});
    await sharp(path.join(out,'card.png')).resize({width:300}).png().toFile(path.join(out,'small.png'));
    checks.push({key:c.key,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed,outside:diff.outside});
  }
  write(f('native-checks.json'),checks); return checks;
}); }
async function game() {
  const build=require('../../atelier/game-catalog.cjs').buildCatalog, before=base().catalogue;
  const after=structuredClone(before);
  for(const c of S.cards) after.cards.find(v=>v.id===c.id).profile=profile(c);
  const a=await build({published:before.cards.filter(c=>c.kind==='created')}),b=await build({published:after.cards.filter(c=>c.kind==='created')});
  assert.deepEqual(b,a,'Playable catalogue must be completely unchanged');
  return {passed:true,cards:b.cards.length,gameplayIdentical:true};
}
async function publish() { assert.equal(process.env.KALISTAR_ARMOR_PUBLISH,'2026-10-04'); return locked(async () => {
  await game(); await unchanged(true); const before=base();
  assert.deepEqual(D.catalogue(),before.catalogue,'Catalogue changed since snapshot');
  const next=structuredClone(before.catalogue),changes=[];
  async function change(src,target) {
    const saved=before.backups[rel(target)]; assert(saved,'Missing backup '+target);
    changes.push({target,stage:src,backup:path.join(ROOT,saved.backup),beforeHash:saved.sha256,afterHash:await hash(src)});
  }
  for(const c of S.cards) {
    const out=f('cards/'+c.key),p=read(path.join(out,'profile.json')),v=read(path.join(out,'verification.json'));
    validate(c,p); await inputs(c);
    assert(v.passed&&v.roundtrip.changed===0&&v.components.fixedDifferences===0&&v.barcode.passed&&v.artOnly.outside===0);
    assert.equal(v.profileHash,await hash(path.join(out,'profile.json')));
    for(const n of ['card.png','card.psd']) assert.equal(v.hashes[n],await hash(path.join(out,n)));
    const target=path.join(ROOT,'V4/creations',c.id),hashes={};
    for(const n of FILES.filter(n=>n!=='creation.json')) hashes[n]=await hash(path.join(out,n));
    write(path.join(out,'creation.json'),{...read(path.join(target,'creation.json')),hashes,nativeRevision:rev});
    for(const n of FILES) await change(path.join(out,n),path.join(target,n));
    Object.assign(next.cards.find(v=>v.id===c.id),{profile:p,nativeRevision:rev});
  }
  write(f('catalogue.next.json'),next); await change(f('catalogue.next.json'),D.CATALOGUE);
  const result=await require('../2026-09-23-nier-art-refinement/transaction.cjs').transactionIO(L,f('publication.json')).commit({changes});
  await unchanged(); return result;
}); }
module.exports={freeze,prepare,render,verify,game,publish,unchanged};
if(require.main===module) {
  const [action,key]=process.argv.slice(2); assert(Object.hasOwn(module.exports,action));
  module.exports[action](key).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
}
