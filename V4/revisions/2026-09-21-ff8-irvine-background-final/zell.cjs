'use strict';
const assert = require('node:assert/strict');
const M = require('../../collaborations/ff8-set-01/model.cjs');
const WIDTH = 897, HEIGHT = 1497;
const componentLayer = name => name === 'CADRE V4 - structure validee' || /^ATK D[1-6] - (fond physique|HALO MAGIQUE)$/.test(name) || /^(BRANCHES|CRISTAL) (PYRO|ELECTRO)/.test(name);

function nextData(set, profile, D, weapons) {
  M.validateSet(set); const old = set.cards.find(c => c.key === 'zell'); M.validateProfile(profile, old);
  assert.equal(old.element, 'PYRO', 'Cette revision attend Zell PYRO.');
  const nextSet = structuredClone(set); nextSet.cards.find(c => c.key === 'zell').element = 'ELECTRO';
  const derived = M.profile({ ...old, element: 'ELECTRO' }, D, weapons);
  const nextProfile = { ...profile, element: 'ELECTRO', color: derived.color, hue: derived.hue };
  M.validateProfile(nextProfile, nextSet.cards.find(c => c.key === 'zell'));
  return { set: nextSet, profile: nextProfile };
}
function replacements(plan, manifest) {
  const selected = plan.layers.filter(l => componentLayer(l.name));
  assert.equal(selected.length, 9, 'Cadre, six fonds ATK, branches et cristal requis.');
  return selected.map(old => {
    let asset;
    if (old.name === 'CADRE V4 - structure validee') asset = manifest.frame.electro;
    else if (old.name.startsWith('ATK ')) asset = manifest.stats.atk.ELECTRO[Number(old.name[5])][old.name.endsWith('HALO MAGIQUE') ? 'magic' : 'physical'];
    else asset = manifest.elements.ELECTRO[old.name.startsWith('BRANCHES') ? 'branch' : 'crystal'];
    assert.ok(asset?.file);
    const { left, top, width, height } = asset;
    return { old, next: { file: old.file, name: old.name.replace('PYRO', 'ELECTRO'), left, top, width, height }, asset: asset.file };
  });
}
function checkNative(n, oldNative, change) {
  const semantic = layers => layers.map(({ id, ...l }) => l);
  assert.deepEqual(semantic(n.before), semantic(oldNative.layers), 'Etat original de Zell different.');
  assert.equal(n.before.length, n.after.length);
  for (let i = 0; i < n.before.length; i++) {
    const before = n.before[i], after = n.after[i], replacement = change.replacements.find(r => r.old.name === before.name);
    if (!replacement) assert.deepEqual(after, before, 'Calque non autorise modifie : ' + before.name);
    else {
      const { left, top, width, height, name } = replacement.next;
      assert.equal(after.kind, 'LayerKind.SMARTOBJECT'); assert.equal(after.visible, true);
      const expected = { ...before, id: after.id, name, path: before.path.replace(before.name, name), bounds: [left, top, left + width, top + height] };
      assert.deepEqual(after, expected, 'Geometrie ou proprietes ELECTRO incorrectes : ' + name);
    }
  }
  assert.deepEqual(semantic(n.after), semantic(n.layers), 'Calques differents apres reouverture.');
  const textNames = n.before.filter(l => l.kind === 'LayerKind.TEXT').map(l => l.name).sort();
  for (const colors of [n.colorsBefore, n.colorsAfter, n.colorsReopened]) assert.deepEqual(Object.keys(colors).sort(), textNames);
  assert.ok(textNames.includes('JOB') && textNames.includes('RACE'));
  for (const name of textNames) {
    const expected = ['JOB', 'RACE'].includes(name) ? change.profile.color : n.colorsBefore[name];
    assert.equal(n.colorsAfter[name], expected); assert.equal(n.colorsReopened[name], expected);
  }
}
function paintDifference(mask, old, next, a, b) {
  for (const [spec, pixels] of [[old, a], [next, b]]) {
    assert.deepEqual([pixels.info.width, pixels.info.height, pixels.info.channels], [spec.width, spec.height, 4]);
    assert.ok(spec.left >= 0 && spec.top >= 0 && spec.left + spec.width <= WIDTH && spec.top + spec.height <= HEIGHT);
  }
  const pixel = (image, spec, x, y) => x < spec.left || y < spec.top || x >= spec.left + spec.width || y >= spec.top + spec.height ? -1 : ((y - spec.top) * spec.width + x - spec.left) * 4;
  for (let y = Math.min(old.top, next.top); y < Math.max(old.top + old.height, next.top + next.height); y++) {
    for (let x = Math.min(old.left, next.left); x < Math.max(old.left + old.width, next.left + next.width); x++) {
      const ai = pixel(a, old, x, y), bi = pixel(b, next, x, y);
      if (!(ai >= 0 && a.data[ai + 3]) && !(bi >= 0 && b.data[bi + 3])) continue;
      for (let c = 0; c < 4; c++) if ((ai < 0 ? 0 : a.data[ai + c]) !== (bi < 0 ? 0 : b.data[bi + c])) { mask[y * WIDTH + x] = 1; break; }
    }
  }
}
function compareMasked(a, b, mask) {
  assert.deepEqual(a.info, b.info); assert.deepEqual([a.info.width, a.info.height, a.info.channels], [WIDTH, HEIGHT, 4]);
  let changed = 0, outside = 0;
  for (let i = 0; i < mask.length; i++) {
    if (a.data.subarray(i * 4, i * 4 + 4).equals(b.data.subarray(i * 4, i * 4 + 4))) continue;
    changed++; if (!mask[i]) outside++;
  }
  assert.equal(outside, 0, 'Pixels modifies hors composants ELECTRO et libelles colores.');
  assert.ok(changed > 0, 'Conversion sans changement visible.'); return { changed, outside, allowedPixels: mask.reduce((a, b) => a + b, 0) };
}
async function verifyPixels(L, card, change, native, original) {
  const { path, sharp } = L, work = name => path.join(card.work, name);
  const pixels = file => sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(WIDTH * HEIGHT);
  for (const r of change.replacements) paintDifference(mask, r.old, r.next,
    await pixels(original(path.join(card.source, 'render', r.old.file))), await pixels(work(r.next.file)));
  // Only glyph bounds may change for the two element-colored editable labels.
  for (const name of ['JOB', 'RACE']) {
    const layer = native.before.find(l => l.name === name); assert.equal(layer.kind, 'LayerKind.TEXT');
    const [left, top, right, bottom] = layer.bounds;
    assert.ok(left >= 0 && top >= 0 && right <= WIDTH && bottom <= HEIGHT);
    for (let y = Math.floor(top); y < Math.ceil(bottom); y++) for (let x = Math.floor(left); x < Math.ceil(right); x++) mask[y * WIDTH + x] = 1;
  }
  const outside = compareMasked(await pixels(original(path.join(card.source, 'card.png'))), await pixels(work('card.png')), mask);
  const withoutChanges = await L.diff(work('before-without-changes.png'), work('after-without-changes.png'));
  const artwork = await L.diff(work('before-art-only.png'), work('after-art-only.png'));
  assert.equal(withoutChanges.changed, 0); assert.equal(artwork.changed, 0, 'Illustration Zell modifiee.');
  return { outside, withoutChanges, artwork, from: 'PYRO', to: 'ELECTRO' };
}
module.exports = { nextData, replacements, componentLayer, checkNative, verifyPixels, paintDifference, compareMasked, WIDTH, HEIGHT };
