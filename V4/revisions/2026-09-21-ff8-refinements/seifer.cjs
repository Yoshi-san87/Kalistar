'use strict';
const assert = require('node:assert/strict');
const M = require('../../collaborations/ff8-set-01/model.cjs');
const OLD_FIRST = 'Seifer rel\u00e8ve le menton, sourire insolent et gunblade pr\u00eate.';
const FIRST = '\u00c0 Balamb, Seifer pose les pieds sur son pupitre, sourire insolent.';
function nextData(set, profile) {
  M.validateProfile(profile, set.cards.find(c => c.key === 'seifer'));
  assert.ok(profile.description.startsWith(OLD_FIRST), 'Premiere phrase Seifer inattendue.');
  assert.equal(profile.text, profile.description);
  const description = FIRST + profile.description.slice(OLD_FIRST.length);
  // The exact requested sentence plus the unchanged suffix is 210, not 205.
  assert.equal(description.length, 210, 'La suite du recit Seifer a change.');
  return { before: profile.description, description, profile: { ...profile, description, text: description } };
}
async function preview(change, D, R) {
  const lines = (await R.previewText(M.donor(change.profile, D))).filter(l => l.top >= 1200);
  assert.ok(lines.length > 0 && lines.length <= 4, 'Description Seifer au-dela de quatre lignes.');
}
function checkNative(n, oldNative, change) {
  const semantic = layers => layers.map(({ id, ...layer }) => layer);
  assert.deepEqual(semantic(n.before), semantic(oldNative.layers), 'Etat original Seifer different.');
  assert.equal(n.before.length, n.after.length);
  assert.equal(n.before.filter(l => l.name === 'DESCRIPTION').length, 1);
  const rectangles = [];
  for (let i = 0; i < n.before.length; i++) {
    const before = n.before[i], after = n.after[i];
    if (before.name !== 'DESCRIPTION') { assert.deepEqual(after, before, 'Calque hors description modifie : ' + before.name); continue; }
    assert.equal(before.kind, 'LayerKind.TEXT'); assert.equal(before.visible, true);
    assert.equal(before.text.replace(/\r/g, ' '), change.before);
    assert.equal(after.text.replace(/\r/g, ' '), change.description);
    assert.ok(after.text.split('\r').length <= 4, 'Description native au-dela de quatre lignes.');
    const strip = ({ text, bounds, ink, ...rest }) => rest;
    assert.deepEqual(strip(after), strip(before), 'Style ou identite du recit modifie.');
    for (const layer of [before, after]) {
      const [left, top, right, bottom] = layer.ink;
      assert.ok(right - left <= 574 && top >= 1251 && bottom <= 1387, 'Recit hors cadre.');
      assert.ok(Math.abs((left + right) / 2 - 448.5) <= 1 && Math.abs((top + bottom) / 2 - 1318.5) <= 1, 'Recit decentre.');
      const b = layer.bounds;
      assert.ok(b[0] >= 160 && b[1] >= 1251 && b[2] <= 737 && b[3] <= 1387, 'Bornes de description hors zone.');
      rectangles.push([Math.floor(b[0]), Math.floor(b[1]), Math.ceil(b[2]), Math.ceil(b[3])]);
    }
  }
  assert.deepEqual(semantic(n.after), semantic(n.layers), 'Calques differents apres reouverture.');
  const textNames = n.before.filter(l => l.kind === 'LayerKind.TEXT').map(l => l.name).sort();
  for (const colors of [n.colorsBefore, n.colorsAfter, n.colorsReopened]) assert.deepEqual(Object.keys(colors).sort(), textNames);
  assert.deepEqual(n.colorsAfter, n.colorsBefore); assert.deepEqual(n.colorsReopened, n.colorsBefore);
  return rectangles;
}
module.exports = { OLD_FIRST, FIRST, nextData, preview, checkNative };
