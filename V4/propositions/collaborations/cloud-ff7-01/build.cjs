'use strict';
const L = require('../../../atelier/lib.cjs');
const D = require('../../../atelier/designer-core.cjs');
const R = require('../../../atelier/designer-render.cjs');
const {buildCatalog} = require('../../../atelier/game-catalog.cjs');
const {createEngine} = require('../../../site/engine.js');
const {fs,path,assert,read,write,sharp,crypto} = L;
const home = __dirname, render = path.join(home,'render');
const file = name => path.join(home,name);
const baselineFiles = ['V4/atelier/data/references.json','V4/atelier/data/regression.json','V4/donnees/catalogue.json','V4/atelier/designer-assets/manifest.json'];
const alive = pid => {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try { process.kill(pid,0); return true; } catch(e) { return e.code !== 'ESRCH'; }
};
async function snapshots() {
  const result = {};
  for (const name of baselineFiles) result[name] = await L.hash(path.join(L.ROOT,name));
  return result;
}
async function prepare() {
  fs.mkdirSync(render,{recursive:true});
  await L.protectedCheck();
  const manifest = await R.verifyAssets();
  const design = read(file('design.json'));
  assert.equal(design.faction,'FF7');
  // Chroma is only the layout donor; the new flag and actual faction are explicit.
  const donor = D.validate({...design,faction:'Chroma'},{final:true});
  await R.previewText(donor);
  const sourceArt = await sharp(file('illustration.png')).metadata();
  const art = await sharp(file('illustration.png')).resize(R.ART.width,R.ART.height,{fit:'cover'}).png().toBuffer();
  const layers = await R.components(donor,{positionsText:true});
  layers[0] = {...layers[0],input:art};
  const faction = manifest.factions.Chroma;
  const flag = await sharp(file('flag-source.png')).resize(faction.width,faction.height,{fit:'fill'}).png().toBuffer();
  const mask = await sharp(path.join(R.ASSETS,faction.nativeGroupMaskApplied)).extract({left:faction.left,top:faction.top,width:faction.width,height:faction.height}).png().toBuffer();
  const clippedFlag = await sharp(flag).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  await sharp(clippedFlag).toFile(file('flag-FF7.png'));
  // Native placement measures painted bounds; trim alpha without scaling the art.
  const rgba = await sharp(clippedFlag).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const bounds = [rgba.info.width,rgba.info.height,-1,-1];
  for(let y=0;y<rgba.info.height;y++)for(let x=0;x<rgba.info.width;x++)if(rgba.data[(y*rgba.info.width+x)*4+3]) {
    bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);
    bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);
  }
  assert.ok(bounds[2]>=bounds[0]&&bounds[3]>=bounds[1]);
  const packedGeometry={left:faction.left+bounds[0],top:faction.top+bounds[1],width:bounds[2]-bounds[0]+1,height:bounds[3]-bounds[1]+1};
  const packedFlag=await sharp(clippedFlag).extract({left:bounds[0],top:bounds[1],width:packedGeometry.width,height:packedGeometry.height}).png().toBuffer();
  await sharp(packedFlag).toFile(file('flag-FF7-packed.png'));
  const flagIndex = layers.findIndex(l=>l.name==='FACTION - Chroma');
  assert.ok(flagIndex>0);
  layers[flagIndex]={...layers[flagIndex],...packedGeometry,input:packedFlag,name:'FACTION - FF7 - meteor'};
  const taken = new Set(D.catalogue().cards.map(c=>c.id));
  let id = fs.existsSync(file('profile.json')) ? read(file('profile.json')).id : null;
  if (!id) do { id=String(crypto.randomInt(40000043,50000000)); } while(taken.has(id));
  assert.ok(!taken.has(id),'Trial ID already published; do not overwrite.');
  const profile = {...D.profileCard(donor,id),faction:'FF7',characterId:'cloud-ff7',source:'Private Kalistar x FF7 crossover experiment',artworkSource:path.relative(L.ROOT,file('illustration.png')).split(path.sep).join('/'),collaboration:'FF7',testOnly:true,published:false};
  write(file('profile.json'),profile);
  const barcode = layers.find(l=>l.name.startsWith('ID CODE128'));
  barcode.input = await R.barcode(id); barcode.name='ID CODE128 - '+id;
  const preview = await sharp(await R.composite(layers)).composite(await R.previewText(donor)).png().toBuffer();
  await sharp(preview).toFile(file('preview.png'));
  const nativeLayers = layers.filter(l=>!l.name.startsWith('POSITION SLOT '));
  const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
  for(let i=0;i<nativeLayers.length;i++) {
    const layer=nativeLayers[i],name='component-'+String(i).padStart(2,'0')+'.png';
    await sharp(layer.input).png().toFile(path.join(render,name));
    plan.layers.push({file:name,name:layer.name,left:layer.left,top:layer.top,width:layer.width,height:layer.height});
  }
  await sharp(await R.composite(nativeLayers)).toFile(path.join(render,'expected-components.png'));
  write(path.join(render,'composition.json'),plan);
  const catalog=await buildCatalog({published:[{id,profile,pngUrl:'/experiments/cloud-ff7.png'}]});
  const engine=createEngine(catalog),cloud=engine.byId[id];
  assert.equal(cloud.faction,'FF7');assert.equal(cloud.role,2);assert.deepEqual(cloud.positions,[2]);
  const factionTests=[];
  for(let n=1;n<=5;n++) {
    const board=Array.from({length:n},(_,i)=>({uid:'fixture-'+i,cardId:id}));
    const actual=engine.synergy({board},board[0],'faction');
    assert.equal(actual,(n-1)*10);
    factionTests.push({members:n,attackBonus:actual});
  }
  const chroma=catalog.cards.find(c=>c.faction==='Chroma');
  assert.equal(engine.synergy({board:[{cardId:id},{cardId:chroma.id}]},{cardId:id},'faction'),0);
  write(file('faction.json'),{id:'FF7',label:'Final Fantasy VII',status:'private-experiment-not-published',flag:'flag-FF7.png',packedFlag:'flag-FF7-packed.png',packedGeometry,bonusField:'faction',bonusStat:'ATK',membersScope:'living-board-only',factionTests,testsScope:'pure engine grouping fixtures, not five legal copies of Cloud',chromaExcluded:true});
  write(file('preparation.json'),{id,testOnly:true,published:false,referenceId:L.baseline().id,baselineHashes:await snapshots(),sourceArt:{width:sourceArt.width,height:sourceArt.height,sha256:await L.hash(file('illustration.png'))},layoutDonor:'Chroma for native geometry only; replaced by FF7',factionBounds:faction,profileHash:await L.hash(file('profile.json'))});
  return {plan,nativeLayers,profile};
}
async function verify(plan,nativeLayers,profile) {
  const native=read(path.join(render,'native.json'));
  assert.equal(native.width,897);assert.equal(native.height,1497);assert.equal(native.resolution,300);
  for(const e of native.expected) {
    const l=native.layers.find(l=>l.name===e.name);
    assert.equal(l?.kind,'LayerKind.TEXT');assert.equal(l.text,e.value);assert.ok(l.visible);
    assert.ok(Math.abs((l.ink[0]+l.ink[2])/2-e.center[0])<=1);
    assert.ok(Math.abs((l.ink[1]+l.ink[3])/2-e.center[1])<=1);
  }
  const description=native.layers.find(l=>l.name==='DESCRIPTION');
  assert.equal(description.text.replace(/\r/g,' '),profile.description);
  assert.ok(description.ink[1]>=1251&&description.ink[3]<=1387);
  for(const spec of plan.layers) {
    const l=native.layers.find(l=>l.name===spec.name);
    assert.equal(l?.kind,'LayerKind.SMARTOBJECT');assert.ok(l.visible);
  }
  const expected=await sharp(path.join(render,'expected-components.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const actual=await sharp(path.join(render,'without-text.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(expected.info,actual.info);
  const frame=await sharp(nativeLayers[1].input).ensureAlpha().raw().toBuffer();
  const fixed=new Uint8Array(897*1497);
  for(let i=0;i<fixed.length;i++)fixed[i]=frame[i*4+3]===255?1:0;
  for(const layer of nativeLayers.slice(2)) {
    const p=await sharp(layer.input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let y=0;y<p.info.height;y++)for(let x=0;x<p.info.width;x++)if(p.data[(y*p.info.width+x)*4+3])fixed[(y+layer.top)*897+x+layer.left]=0;
  }
  const pixels={changed:0,maxChannelDelta:0,severePixels:0,fixedDifferences:0};
  for(let i=0;i<fixed.length;i++) {
    let delta=0;for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(expected.data[i*4+c]-actual.data[i*4+c]));
    if(delta){pixels.changed++;pixels.maxChannelDelta=Math.max(pixels.maxChannelDelta,delta);if(delta>2)pixels.severePixels++;if(fixed[i])pixels.fixedDifferences++;}
  }
  assert.equal(pixels.fixedDifferences,0);assert.equal(pixels.severePixels,0);
  const roundtrip=await L.diff(file('CLOUD_FF7_V4_01.png'),path.join(render,'reopened.png'));assert.equal(roundtrip.changed,0);
  const barcode=JSON.parse(await R.command(L.PYTHON,[path.join(L.ROOT,'V4/atelier/barcode.py'),file('CLOUD_FF7_V4_01.png'),profile.id]));assert.equal(barcode.passed,true);
  const protectedFiles=await L.protectedCheck();await R.verifyAssets();
  assert.deepEqual(await snapshots(),read(file('preparation.json')).baselineHashes);
  assert.equal(await L.hash(file('profile.json')),read(file('preparation.json')).profileHash);
  const report={passed:true,testOnly:true,published:false,modelId:profile.id,referenceId:L.baseline().id,protectedFiles,components:pixels,roundtrip,barcode,nativeTexts:native.expected.length,smartObjects:plan.layers.length,faction:read(file('faction.json')),pngHash:await L.hash(file('CLOUD_FF7_V4_01.png')),psdHash:await L.hash(file('CLOUD_FF7_V4_01.psd')),checkedAt:new Date().toISOString()};
  write(file('verification.json'),report);
  await sharp(file('CLOUD_FF7_V4_01.png')).extract({left:50,top:50,width:797,height:1388}).resize({width:320}).toFile(file('small-preview.png'));
  return report;
}
async function main() {
  const previous = process.argv.includes('--repeat') ? read(file('verification.json')) : null;
  if(previous) {
    assert.ok(process.argv.includes('--native')&&previous.passed);
    assert.equal(await L.hash(file('CLOUD_FF7_V4_01.png')),previous.pngHash);
    fs.copyFileSync(file('CLOUD_FF7_V4_01.png'),path.join(render,'repeat-before.png'));
  }
  const {plan,nativeLayers,profile}=await prepare();
  if(!process.argv.includes('--native')) {console.log(JSON.stringify({prepared:true,id:profile.id,preview:file('preview.png'),published:false}));return;}
  const lock=path.join(L.DATA,'render.lock');let fd;
  if(fs.existsSync(lock)) {
    const bytes=fs.readFileSync(lock),owner=JSON.parse(bytes);
    if(owner.kind!=='designer'||alive(owner.pid)||alive(owner.workerPid))throw Error('Render lock is active or ambiguous.');
    const archive=file('previous-stale-render.lock.json');
    if(fs.existsSync(archive))throw Error('A lock was already archived; inspect before retrying.');
    assert.ok(path.resolve(lock).startsWith(path.resolve(L.DATA)+path.sep));
    assert.deepEqual(fs.readFileSync(lock),bytes);
    fs.renameSync(lock,archive);
  }
  try {
    fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,kind:'collaboration-experiment',home}));
    await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('compose.ps1')],path.join(render,'photoshop.log'),workerPid=>fs.writeFileSync(lock,JSON.stringify({pid:process.pid,workerPid,kind:'collaboration-experiment',home})));
    const report=await verify(plan,nativeLayers,profile);
    if(previous) {
      const repeat=await L.diff(path.join(render,'repeat-before.png'),file('CLOUD_FF7_V4_01.png'));
      assert.equal(repeat.changed,0,'Repeated render pixels differ.');
      write(file('repeat-verification.json'),{passed:true,previousCheckedAt:previous.checkedAt,checkedAt:report.checkedAt,previousPngHash:previous.pngHash,pngHash:report.pngHash,byteIdentical:previous.pngHash===report.pngHash,pixelComparison:repeat,metadataNote:'Photoshop XMP timestamps and instance IDs change between exports.',published:false});
    }
    console.log(JSON.stringify({passed:report.passed,published:false,png:file('CLOUD_FF7_V4_01.png'),psd:file('CLOUD_FF7_V4_01.psd'),fixedDifferences:report.components.fixedDifferences,roundtrip:report.roundtrip.changed,barcode:report.barcode.passed}));
  } finally {
    if(fd!==undefined){fs.closeSync(fd);if(read(lock).pid===process.pid)fs.unlinkSync(lock);}
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
