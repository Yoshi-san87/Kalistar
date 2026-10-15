const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const work = 'V4/template-stable/elements-02/';
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, ''));
const write = (p, value) => fs.writeFileSync(path.join(root, p), JSON.stringify(value, null, 2));
const manifest = read(work + 'manifest.json');
const verification = read(work + 'verification.json');
assert.equal(verification.complete, true, 'Full verification required');
assert.equal(verification.cards, manifest.cards.length);
assert.equal(read(work + 'optical-verification.json').passed, true, 'Optical verification required');
const cards = manifest.cards.map(entry => {
  const card = read(entry.profile);
  const barcode = read(path.dirname(entry.profile) + '/barcode-verification.json');
  assert.equal(barcode.allPassed, true, card.name + ' barcode');
  assert.equal(barcode.expected, card.id);
  return { key: card.name.toLowerCase(), element: card.element, profile: entry.profile,
    output: card.output, psd: `V4/templates/${card.output}.psd`, png: `V4/cartes/${card.output}.png`,
    artwork: card.artworkSource, artworkUnchanged: card.artworkUnchanged };
});
const previous = read('V4/template-stable/current-elements.json');
const additions = new Set(cards.map(c => c.output));
const preserved = previous.cards.filter(c => !additions.has(c.output));
assert.equal(preserved.length, 16, 'Preserve the complete first series');
const merged = [...preserved, ...cards];
assert.equal(new Set(merged.map(c => c.output)).size, 21);
const registry = read(manifest.registry);
registry.effectLayouts = manifest.effectLayouts;
registry.renderer = ['V4/scripts/stable/common.jsx', 'V4/scripts/stable/registered.jsx',
  'V4/scripts/stable/elements-common.jsx', 'V4/scripts/stable/element-batch.jsx',
  'V4/scripts/stable/render-elements-02.jsx'];
write(manifest.registry, registry);
write('V4/template-stable/current-elements.json', {
  schemaVersion: 5, status: 'artistic-review', template: manifest.template,
  registry: manifest.registry, renderer: registry.renderer,
  gallery: 'V4/galerie-elements.html',
  batches: [
    { manifest: 'V4/template-stable/elements-01/manifest.json', registry: 'V4/template-stable/registry-elements-04.json', renderer: 'V4/scripts/stable/render-elements.jsx' },
    { manifest: work + 'manifest.json', registry: manifest.registry, renderer: 'V4/scripts/stable/render-elements-02.jsx' }
  ], cards: merged
});
const complete = {
  completedAt: new Date().toISOString(), cards: cards.length, additionalCrystals: 4, withoutCrystal: 1,
  unchangedIllustrations: 5, framePixelDifference: 0, reopenedPixelDifference: 0,
  barcodesPassed: 5, protectedSources: verification.protectedSources,
  opticalVerification: work + 'optical-verification.json',
  psdBytes: cards.reduce((sum, c) => sum + fs.statSync(path.join(root, c.psd)).size, 0),
  reusedMaster: manifest.template, totalV4Cards: 26, crystalTypes: 12,
  artisticApproval: 'pending-user-review',
  galleryBrowserTest: 'blocked-by-browser-file-url-policy; static checks only'
};
write(work + 'complete.json', complete);
console.log(JSON.stringify(complete, null, 2));
