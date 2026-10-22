'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp = createRequire(path.join(runtime,'_journey_covers.cjs'))('sharp');
const root = path.resolve(__dirname,'../..');
const provenance = require('../revisions/2026-10-17-fragment-covers/provenance.json');
const adventure = require('../revisions/2026-10-22-fragment-adventure/art-provenance.json');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');

test('Fragment covers use the paintings belonging to the rewarded model versions', async () => {
  const books = require('./journey-definitions.js').catalogue({cards:[]});
  const catalogue = require('../donnees/catalogue.json').cards;
  const media = require('../deploy/runtime-media.json').files;
  const ui = fs.readFileSync(path.join(__dirname,'journey-view.js'),'utf8');
  for (const book of books) {
    const asset = [...provenance.assets,...adventure.assets].find(asset=>asset.modelId===book.rewardModelId);
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
