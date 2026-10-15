'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../../../..');
const BATCH = path.dirname(__dirname);
const { sharp } = require(path.join(ROOT, 'V4/atelier/lib.cjs'));
const { normalize } = require('../model.cjs');
const { cropArt, cropRect } = require('../geometry.cjs');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function main() {
  assert.ok(process.argv.slice(2).every(arg => arg === '--preview'), 'Only --preview is supported.');
  const proof = read(path.join(__dirname, 'provenance.json'));
  const profilesFile = path.join(BATCH, 'profiles-a.json');
  const profiles = read(profilesFile);
  assert.equal(hash(profilesFile), proof.profile.sha256, 'Profiles changed since provenance capture.');
  assert.deepEqual(profiles.map(p => p.key).sort(), ['aelis-veille', 'baptiste', 'kaylis-entrainement', 'sapphire']);
  assert.equal(proof.assets.length, 4);
  let requestChecks = 0, referenceChecks = 0, archiveChecks = 0;
  const assets = [], previews = [];
  for (const p of profiles) {
    normalize(p);
    const entry = proof.assets.find(a => a.key === p.key);
    assert.ok(entry, p.key);
    assert.equal(p.art, entry.selected);
    const file = path.join(BATCH, p.art);
    assert.equal(hash(file), entry.sha256, p.key + ': selected hash');
    const meta = await sharp(file).metadata();
    assert.equal(meta.format, 'png');
    assert.equal(meta.width, entry.width);
    assert.equal(meta.height, entry.height);
    assert.ok(meta.width >= 737 && meta.height >= 921);
    const raw = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(raw.info.channels, 4);
    assert.equal(raw.info.width * raw.info.height, entry.decodedPixels);
    for (let i = 3; i < raw.data.length; i += 4) assert.equal(raw.data[i], 255, p.key + ': non-opaque pixel');
    const stats = await sharp(file).stats();
    assert.ok(stats.channels.slice(0, 3).every(c => c.stdev > 10), p.key + ': blank image');
    assert.deepEqual(cropRect(meta.width, meta.height, p.crop), entry.crop);
    if (p.key === 'aelis-veille') {
      const source = path.join(ROOT, entry.source);
      assert.equal(hash(source), entry.sourceSha256);
      assert.ok(fs.readFileSync(file).equals(fs.readFileSync(source)), 'Aelis is not an exact copy.');
    } else {
      const revisionSuffix = entry.revision > 1 ? '-v' + entry.revision : '';
      assert.equal(entry.archive, 'art-a/originals/' + p.key + revisionSuffix + '.png');
      assert.equal(hash(path.join(BATCH, entry.archive)), entry.sha256);
      archiveChecks++;
      const requestFile = path.join(BATCH, entry.request);
      assert.equal(hash(requestFile), entry.requestSha256);
      const request = read(requestFile);
      assert.equal(request.referenced_image_paths.length, entry.references.length);
      assert.ok(typeof request.prompt === 'string' && request.prompt.length > 0);
      requestChecks++;
      for (let i = 0; i < entry.references.length; i++) {
        const reference = entry.references[i];
        const source = path.join(ROOT, reference.path);
        assert.equal(path.normalize(source), path.normalize(request.referenced_image_paths[i]));
        const evidence = reference.archivedReference ? path.join(BATCH, reference.archivedReference) : source;
        assert.equal(hash(evidence), reference.sha256, reference.path + ': reference evidence changed');
        referenceChecks++;
      }
    }
    const cropped = await cropArt(sharp, file, p.crop);
    const croppedMeta = await sharp(cropped).metadata();
    assert.equal(croppedMeta.width, 737); assert.equal(croppedMeta.height, 921);
    if (process.argv.includes('--preview')) previews.push(await sharp(cropped).resize(294, 368).png().toBuffer());
    assets.push({ key: p.key, width: meta.width, height: meta.height, decodedPixels: entry.decodedPixels, crop: entry.crop });
  }
  const history = read(path.join(__dirname, 'revisions/history.json'));
  assert.equal(history.records.length, history.generationCalls);
  for (const entry of history.records) {
    assert.match(entry.archive, /^art-a\/originals\/[a-z0-9-]+\.png$/);
    assert.equal(hash(path.join(BATCH, entry.archive)), entry.sha256, 'Historical original changed.');
    assert.match(entry.request, /^art-a\/[a-z0-9.-]+\.request\.json$/);
    const requestFile = path.join(BATCH, entry.request);
    assert.equal(hash(requestFile), entry.requestSha256, 'Historical request changed.');
    const request = read(requestFile);
    assert.equal(request.referenced_image_paths.length, entry.references.length);
    for (let i = 0; i < entry.references.length; i++) {
      const ref = entry.references[i], source = path.join(ROOT, ref.path);
      assert.equal(path.normalize(source), path.normalize(request.referenced_image_paths[i]));
      assert.equal(hash(ref.archivedReference ? path.join(BATCH, ref.archivedReference) : source), ref.sha256);
    }
  }
  if (previews.length) {
    const qa = path.join(__dirname, 'qa');
    fs.mkdirSync(qa, { recursive: true });
    await sharp({ create: { width: 1206, height: 368, channels: 3, background: '#161918' } })
      .composite(previews.map((input, i) => ({ input, top: 0, left: i * 304 })))
      .png().toFile(path.join(qa, 'native-window-contact.png'));
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), profileSha256: hash(profilesFile),
    passed: true, profiles: 4, decodedPngs: 4, originalArchiveChecks: archiveChecks,
    exactAelisCopy: true, exactRequests: requestChecks, referenceChecks, cropChecks: 4,
    historicalRequests: history.records.length, archivedGenerationOutputs: history.records.length,
    nativeRenderValidated: false, userApprovedArt: false, publicationPerformed: false, assets }, null, 2));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
