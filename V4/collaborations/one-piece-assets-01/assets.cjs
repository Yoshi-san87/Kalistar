'use strict';
const L = require('../../atelier/lib.cjs');
const A = require('../nier-pilot-01/assets.cjs');
const {FLAG,GEOMETRY} = require('./prepare.cjs');
const file = name => L.path.join(__dirname,name);
const absolute = name => L.path.join(L.ROOT,name);
const bank = absolute('V4/atelier/designer-assets');
const alpha = input => L.sharp(input).ensureAlpha().extractChannel(3).raw().toBuffer();
async function verify() {
  const {assert,read,hash,sharp} = L;
  const entries = read(file('factions.json')).factions;
  assert.deepEqual(entries.map(entry=>entry.id),['ONEPIECE']);
  const f = entries[0];
  assert.deepEqual(f.packedGeometry,FLAG);
  for (const [name,key,width,height] of [[f.flag,'flagHash',109,230],[f.packedFlag,'packedHash',98,223],[f.source,'sourceHash']]) {
    assert.equal(await hash(file(name)),f[key]);
    if (width) { const meta=await sharp(file(name)).metadata(); assert.equal(meta.width,width); assert.equal(meta.height,height); }
  }
  assert.equal(await hash(absolute(f.outline)),f.outlineHash);
  const packedOutline=absolute('V4/collaborations/ff8-set-01/flag-FF8-packed.png');
  assert.equal(await hash(packedOutline),f.packedOutlineHash);
  assert.deepEqual(await alpha(file(f.flag)),await alpha(absolute(f.outline)));
  assert.deepEqual(await alpha(file(f.packedFlag)),await alpha(packedOutline));
  assert.equal(await hash(absolute('V4/site/assets/factions/ONEPIECE.png')),f.flagHash);
  const race=read(file('race-components.json')).races.SHARKAN;
  for (const key of Object.keys(GEOMETRY)) assert.equal(race[key],GEOMETRY[key]);
  for (const [name,expected] of [[file('race-SHARKAN.png'),race.sha256],[absolute(race.source),race.sourceHash],[absolute(race.motif),race.motifHash],[absolute(race.nativeEmail),race.nativeEmailHash]]) assert.equal(await hash(name),expected);
  const meta=await sharp(file('race-SHARKAN.png')).metadata();
  assert.equal(meta.width,96); assert.equal(meta.height,95);
  const metrics=A.opticalMetrics(await sharp(absolute(race.motif)).ensureAlpha().raw().toBuffer({resolveWithObject:true}));
  assert(metrics.fullAlphaRadius<=39,'Full nonzero motif alpha must breathe inside painted rim');
  assert(metrics.opticalError<=.75,'Optical centre must match medallion');
  const before=read(file('baseline.json')),extensions=read(L.path.join(bank,'race-extensions.json')).races;
  assert.equal(await hash(absolute('V4/atelier/data/references.json')),before.referencesHash,'Protected reference lock changed');
  assert.equal(await hash(L.path.join(bank,'manifest.json')),before.manifestHash,'Protected component manifest changed');
  for (const [id,spec] of Object.entries(before.raceExtensions.races)) {
    assert.deepEqual(extensions[id],spec,'Preexisting race entry changed');
    assert.equal(await hash(L.path.join(bank,spec.file)),spec.sha256);
  }
  assert.deepEqual(extensions.SHARKAN,{file:'extensions/race-SHARKAN.png',...GEOMETRY,sha256:race.sha256});
  assert.equal(await hash(L.path.join(bank,extensions.SHARKAN.file)),race.sha256);
  const site=await sharp(file('source-SHARKAN.png')).resize(256,256,{fit:'contain',background:'#00000000'}).png().toBuffer();
  assert(L.fs.readFileSync(absolute('V4/site/assets/races/SHARKAN.png')).equals(site));
  return {factions:['ONEPIECE'],races:['SHARKAN'],metrics,protectedLocksUnchanged:true};
}
function banner(layers,spec) {
  L.assert.equal(spec.faction,'ONEPIECE','Unknown One Piece faction');
  const indexes=layers.map((layer,index)=>Object.keys(FLAG).every(key=>layer[key]===FLAG[key])?index:-1).filter(index=>index>=0);
  L.assert.equal(indexes.length,1,'Expected one packed faction layer');
  layers[indexes[0]]={...FLAG,name:'FACTION - ONEPIECE',input:file('flag-ONEPIECE-packed.png')};
  return layers;
}
const inputs=()=>['assets.cjs','prepare.cjs','requests.json','provenance.json','baseline.json','factions.json','source-ONEPIECE.png','flag-ONEPIECE.png','flag-ONEPIECE-packed.png','source-SHARKAN.png','race-SHARKAN.png','race-SHARKAN.motif.png','race-components.json'].map(file);
module.exports={verify,banner,inputs,FLAG,GEOMETRY};
if(require.main===module)verify().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error);process.exitCode=1;});
