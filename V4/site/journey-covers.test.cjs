'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp = createRequire(path.join(runtime,'_journey_covers.cjs'))('sharp');
const root = path.resolve(__dirname,'../..');
const provenance = require('../revisions/2026-10-17-fragment-covers/provenance.json');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');

test('Fragment covers use the paintings belonging to the rewarded model versions', async () => {
  const books = require('./journey-definitions.js').catalogue({cards:[]});
  const catalogue = require('../donnees/catalogue.json').cards;
  const media = require('../deploy/runtime-media.json').files;
  const ui = fs.readFileSync(path.join(__dirname,'journey-view.js'),'utf8');
  for (const book of books) {
    const asset = provenance.assets.find(asset=>asset.modelId===book.rewardModelId);
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
