'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp = createRequire(path.join(runtime,'_journey_covers.cjs'))('sharp');
const root = path.resolve(__dirname,'../..');
const provenance = require('../revisions/2026-10-17-fragment-covers/provenance.json');
const adventure = require('../revisions/2026-10-22-fragment-adventure/art-provenance.json');
const balmhyr = require('../revisions/2026-10-22-balmhyr-fragment/cover-provenance.json');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');

test('Fragment covers use the paintings belonging to the rewarded model versions', async () => {
  const books = require('./journey-definitions.js').catalogue({cards:[]});
  const catalogue = require('../donnees/catalogue.json').cards;
  const media = require('../deploy/runtime-media.json').files;
  const ui = fs.readFileSync(path.join(__dirname,'journey-view.js'),'utf8');
  for (const book of books) {
    const asset = [...provenance.assets,...adventure.assets,...balmhyr.assets].find(asset=>asset.modelId===book.rewardModelId);
    assert.ok(asset,book.id+' has its own exact version painting');
    const card = catalogue.find(card=>card.id===book.rewardModelId);
    const source = card.profile.artworkSource || card.profile.art || `V4/creations/${card.id}/illustration.png`;
    assert.equal(asset.source,source);
    assert.equal(hash(asset.source),asset.sourceSha256,'original painting unchanged');
    assert.equal(hash(asset.output),asset.sha256);
    assert.equal(media.find(file=>file.source===asset.output)?.sha256,asset.sha256);
    assert.ok(ui.includes(`'${asset.modelId}':'assets/journeys/${path.basename(asset.output)}'`));
    const meta = await sharp(path.join(root,asset.output)).metadata();
    assert.equal(meta.width,900);assert.equal(meta.height,asset.height);
  }
});

test('the seven narrative scenes preserve their originals and ship two bounded WebP sizes', async () => {
  const media = require('../deploy/runtime-media.json').files;
  const scenes = adventure.assets.filter(asset=>!asset.modelId);
  assert.equal(scenes.length,14);
  assert.equal(new Set(scenes.map(asset=>asset.source)).size,7);
  for (const asset of scenes) {
    assert.equal(hash(asset.source),asset.sourceSha256);
    assert.equal(hash(asset.output),asset.sha256);
    assert.equal(media.find(file=>file.source===asset.output)?.sha256,asset.sha256);
    const meta = await sharp(path.join(root,asset.output)).metadata();
    assert.equal(meta.format,'webp');
    assert.equal(meta.width,asset.width);assert.equal(meta.height,asset.height);
    assert.ok(Math.abs(meta.width/meta.height-16/9)<0.01);
    assert.ok(asset.bytes<500000,'desktop scene stays under 500 kB');
    if(asset.output.includes('-small.'))assert.ok(asset.width===840&&asset.bytes<180000,'phone scene stays under 180 kB');
  }
  const ui = fs.readFileSync(path.join(__dirname,'journey-view.js'),'utf8');
  assert.ok(ui.includes("'30000001':'assets/journeys/30000001-art-v1.webp'"),'historical reward cover remains available');
});

test('the later-story Kaylis scene uses revision 2 and preserves its reference and first edition', () => {
  const edit = require('../revisions/2026-10-22-fragment-adventure/kaylis-cape-v2.json');
  for(const item of [edit.editTarget,edit.reference,edit.output,...edit.preservedExports]) assert.equal(hash(item.source),item.sha256);
  assert.equal(edit.reference.modelId,'49902701');
  const scene = adventure.assets.filter(asset=>asset.source===edit.output.source);
  assert.equal(scene.length,2);
  for(const asset of scene) assert.match(asset.output,/momo-boite-v2(?:-small)?\.webp$/);
});

test('Balmhyr has seven distinct narrative originals and exactly two registered WebP sizes per stage', async () => {
  const provenance = require('../revisions/2026-10-22-balmhyr-scenes/art-provenance.json');
  const book = require('./journey-definitions.js').catalogue({cards:[]}).find(book=>book.id==='balmhyr-retour');
  const ids = ['horizon','durane','guide','portes','serment','rempart','empreinte'];
  assert.deepEqual([...book.stages,...book.bonusStages].map(stage=>stage.id),ids);
  const scenes = provenance.assets.filter(asset=>!asset.modelId);
  for(const [source,sha256] of Object.entries(provenance.references)) assert.equal(hash(source),sha256,'approved character and equipment reference unchanged');
  const expected = ids.flatMap(id=>['','-small'].map(size=>`V4/site/assets/journeys/balmhyr-${id}-v1${size}.webp`));
  assert.deepEqual(scenes.map(asset=>asset.output).sort(),expected.sort());
  assert.equal(new Set(scenes.map(asset=>asset.source)).size,7,'seven original paintings, not repeated crops');
  assert.equal(new Set(scenes.map(asset=>asset.sourceSha256)).size,7,'the originals contain seven distinct images');
  assert.equal(new Set(scenes.map(asset=>asset.sha256)).size,14,'every delivered variant has its own pixels');
  const media = require('../deploy/runtime-media.json').files;
  for(const id of ids) {
    const pair = scenes.filter(asset=>path.basename(asset.output).startsWith(`balmhyr-${id}-`));
    assert.equal(pair.length,2);
    assert.equal(pair[0].source,pair[1].source,'both responsive exports use the same approved original');
    if(id==='empreinte') assert.match(pair[0].source,/\/balmhyr-empreinte-v2\.png$/,'the final combat uses the approved action revision, while runtime URLs stay v1');
    for(const asset of pair) {
      assert.equal(hash(asset.source),asset.sourceSha256,'approved source preserved');
      assert.equal(hash(asset.output),asset.sha256);
      assert.equal(fs.statSync(path.join(root,asset.output)).size,asset.bytes);
      assert.equal(media.find(file=>file.source===asset.output)?.sha256,asset.sha256,'release registry matches the delivered scene');
      const meta = await sharp(path.join(root,asset.output)).metadata();
      const small = asset.output.includes('-small.');
      assert.equal(meta.format,'webp');
      assert.equal(meta.width,small?840:1672);assert.equal(meta.width,asset.width);assert.equal(meta.height,asset.height);
      assert.ok(Math.abs(meta.width/meta.height-16/9)<0.01);
      assert.ok(asset.bytes<(small?180000:500000),'bounded scene payload for '+asset.output);
    }
  }
});

test('the explicitly approved Madania scene retains its source and both approved exports byte for byte', () => {
  const provenance = require('../revisions/2026-10-22-balmhyr-scenes/art-provenance.json');
  const source = 'V4/revisions/2026-10-22-balmhyr-scenes/sources/balmhyr-portes-v1.png';
  // Author-approved scene: updating a manifest must never silently replace it.
  const approved = 'e74690a642966f93b34776f889261780720527933032aa9f73d71a9395224c47';
  const exports = {
    'balmhyr-portes-v1.webp':'ee577f8bb044c9dc8360630fc0180df378a026ab0f15585794eb4fda52235b77',
    'balmhyr-portes-v1-small.webp':'d52c5238b071a113f0ea36616307e841b4223d61dc131e470862d50478a94d5a'
  };
  assert.equal(hash(source),approved);
  for(const [name,sha256] of Object.entries(exports)) {
    const output = 'V4/site/assets/journeys/'+name;
    const asset = provenance.assets.find(asset=>asset.output===output);
    assert.ok(asset,name);
    assert.equal(asset.source,source);assert.equal(asset.sourceSha256,approved);
    assert.equal(asset.sha256,sha256);assert.equal(hash(output),sha256);
  }
});

test('new binding is transparent at the painting aperture and opaque at the title plaque', async () => {
  const asset = provenance.assets.find(asset=>!asset.modelId);
  assert.equal(hash(asset.source),asset.sourceSha256);
  assert.equal(hash(asset.output),asset.sha256);
  const {data,info} = await sharp(path.join(root,asset.output)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,1024);assert.equal(info.height,1536);
  const alpha = (x,y) => data[(y*info.width+x)*4+3];
  for (const [x,y] of [[0,0],[500,200],[500,500],[500,1000]]) assert.equal(alpha(x,y),0);
  assert.ok(alpha(500,1210)>250,'title is printed on solid leather');
  assert.ok(fs.statSync(path.join(root,asset.output)).size<400000,'binding is shared and web-optimized');
});
