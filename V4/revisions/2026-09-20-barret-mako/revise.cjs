'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const {fs,path,assert,read,write,sharp,ROOT,DATA} = L;
const home = __dirname, file = n => path.join(home,n);
const set = path.join(ROOT,'V4/collaborations/ff7-set-01');
const source = path.join(set,'cards/barret'), published = path.join(ROOT,'V4/creations/43698921');
const files = ['card.psd','card.png','profile.json','illustration.png','verification.json'];
async function hashes(folder,names=files) { const h={}; for(const n of names) h[n]=await L.hash(path.join(folder,n)); return h; }
async function protectedHashes() {
  const h={}; for(const c of read(path.join(ROOT,'V4/donnees/catalogue.json')).cards) {
    if(c.id==='43698921') continue;
    for(const p of [c.png,c.psd]) if(p) h[p]=await L.hash(path.join(ROOT,p));
  } return h;
}
async function main() {
  const action=process.argv[2];
  if(action==='prepare') {
    assert.ok(!fs.existsSync(file('originals')), 'Originals already preserved.');
    await L.protectedCheck(); await R.verifyAssets();
    assert.deepEqual(await hashes(source),await hashes(published));
    fs.mkdirSync(file('originals'));
    for(const n of files) fs.copyFileSync(path.join(source,n),file('originals/'+n));
    fs.copyFileSync(path.join(published,'creation.json'),file('originals/creation.json'));
    fs.copyFileSync(path.join(source,'render/native.json'),file('originals/native.json'));
    fs.copyFileSync(path.join(set,'verification.json'),file('originals/set-verification.json'));
    write(file('before.json'),{barret:await hashes(source),others:await protectedHashes(),referenceId:L.baseline().id});
    await sharp(file('illustration.png')).resize(737,921,{fit:'cover'}).png().toFile(file('component-00.png'));
  } else if(action==='render') {
    const lock=path.join(DATA,'render.lock'); let fd;
    try {
      fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,kind:'barret-illustration'}));
      console.log(await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(ROOT,'V4/revisions/2026-09-18-branches/bridge.ps1'),'-Script',file('replace.jsx')],file('photoshop.log')));
    } finally { if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);} }
  } else if(action==='verify') {
    const n=read(file('native.json')),before=read(file('before.json'));
    assert.deepEqual(n.before,n.after,'Native layers, values or geometry changed.');
    assert.deepEqual([n.width,n.height],[897,1497]);
    const withoutArt=await L.diff(file('before-without-art.png'),file('after-without-art.png'));
    const outside=await L.diff(file('originals/card.png'),file('card.png'),[[80,156,817,1077]]);
    const roundtrip=await L.diff(file('card.png'),file('reopened.png'));
    assert.equal(withoutArt.changed,0);assert.equal(outside.outside,0);assert.ok(outside.changed>100000);assert.equal(roundtrip.changed,0);
    const barcode=JSON.parse(await R.command(L.PYTHON,[path.join(ROOT,'V4/atelier/barcode.py'),file('card.png'),'43698921']));assert.ok(barcode.passed);
    await L.protectedCheck();await R.verifyAssets();assert.deepEqual(await protectedHashes(),before.others);
    const report={...read(file('originals/verification.json')),hashes:await hashes(home,['card.png','card.psd']),components:{fixedDifferences:0,severePixels:0,proof:'same PSD with only embedded artwork replaced',withoutArt},roundtrip,barcode,illustrationOnly:{outside,layerStateIdentical:true},revision:'2026-09-20-barret-mako',checkedAt:new Date().toISOString()};
    write(file('verification.json'),report);
    await sharp(file('card.png')).extract({left:50,top:50,width:797,height:1388}).resize({width:480}).toFile(file('preview.png'));
    console.log({passed:true,outsideArtChanged:outside.outside,nativeLayers:'unchanged',barcode:barcode.passed});
  } else if(action==='publish') {
    const v=read(file('verification.json')), before=read(file('before.json'));
    assert.ok(v.passed&&v.illustrationOnly.outside.outside===0);
    assert.deepEqual(await hashes(home,['card.png','card.psd']),v.hashes);
    assert.deepEqual(await hashes(source),before.barret);assert.deepEqual(await hashes(published),before.barret);
    assert.deepEqual(await protectedHashes(),before.others);
    for(const dir of [source,published]) for(const n of ['card.png','card.psd','illustration.png','verification.json']) fs.copyFileSync(file(n),path.join(dir,n));
    fs.copyFileSync(file('illustration.png'),path.join(set,'illustrations/barret.png'));
    fs.copyFileSync(file('component-00.png'),path.join(source,'render/component-00.png'));
    fs.copyFileSync(file('without-text.png'),path.join(source,'render/without-text.png'));
    fs.copyFileSync(file('reopened.png'),path.join(source,'render/reopened.png'));
    const native=read(file('originals/native.json'));native.layers=read(file('native.json')).layers;write(path.join(source,'render/native.json'),native);
    const plan=read(path.join(source,'render/composition.json'));
    await sharp(await R.composite(plan.layers.map(l=>({...l,input:path.join(source,'render',l.file)})))).toFile(path.join(source,'render/expected-components.png'));
    fs.copyFileSync(file('card.png'),path.join(source,'preview.png'));
    await sharp(file('card.png')).extract({left:50,top:50,width:797,height:1388}).resize({width:320}).toFile(path.join(source,'small-preview.png'));
    const creation=read(path.join(published,'creation.json'));creation.hashes=await hashes(published);creation.artworkRevision='2026-09-20-barret-mako';write(path.join(published,'creation.json'),creation);
    const proof=read(path.join(set,'verification.json'));proof.results=proof.results.map(r=>r.key==='barret'?v:r);write(path.join(set,'verification.json'),proof);
    const tiles=[];for(const [i,r] of proof.results.entries())tiles.push({input:await sharp(path.join(set,'cards',r.key,'small-preview.png')).resize({width:230}).png().toBuffer(),left:(i%5)*242+8,top:Math.floor(i/5)*414+8});
    await sharp({create:{width:1210,height:828,channels:4,background:'#101719'}}).composite(tiles).png().toFile(path.join(set,'set-preview.png'));
    assert.equal(await L.hash(path.join(published,'profile.json')),before.barret['profile.json']);
    await L.protectedCheck();assert.deepEqual(await protectedHashes(),before.others);
    write(file('publication.json'),{published:true,id:'43698921',profileUnchanged:true,otherCardsUnchanged:true,checkedAt:new Date().toISOString()});
    console.log('Published: Barret illustration only; profile, other cards and approved sources unchanged.');
  } else throw Error('Expected prepare, render, verify or publish');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
