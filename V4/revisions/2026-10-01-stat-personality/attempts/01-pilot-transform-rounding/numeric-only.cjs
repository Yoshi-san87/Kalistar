'use strict';
const assert = require('node:assert/strict');
const REV = '2026-10-01-stat-personality';
const SIDES = ['atk', 'defense'];
const layerName = (side, i) => (side === 'atk' ? 'ATK' : 'DEF') + ' D' + (6 - i) + ' - valeur';
function numericOnly(before, after, bounds) {
  assert.deepEqual({ ...after, atk: before.atk, defense: before.defense }, before, 'Only numeric ATK/DEF may change.');
  let changes = 0;
  for (const side of SIDES) {
    assert.equal(after[side].length, 6);
    before[side].forEach((v, i) => {
      const next = after[side][i];
      if (typeof v !== 'number') assert.equal(next, v, 'Special face changed.');
      else {
        const range = bounds[before.role][side], minimum = range[i + 1] || 0;
        assert(Number.isInteger(next) && next >= minimum && next <= range[i], before.id + ' ' + side + ' D' + (6 - i) + ' outside role interval.');
        if (next !== v) changes++;
      }
    });
  }
  assert(changes > 0, 'No numeric revision.');
  return changes;
}
function changes(before, after) {
  return SIDES.flatMap(side => before[side].flatMap((v, i) => typeof v === 'number' && v !== after[side][i] ? [{ name: layerName(side, i), before: String(v), after: String(after[side][i]) }] : []));
}
function catalogueChange(before, after, profiles, bounds) {
  assert.deepEqual({ ...after, cards: undefined }, { ...before, cards: undefined });
  assert.equal(after.cards.length, before.cards.length);
  const ids = new Set(profiles.map(p => p.id));
  assert.equal(ids.size, profiles.length);
  for (const id of ids) assert.equal(before.cards.filter(c => c.id === id).length, 1);
  before.cards.forEach((a, i) => {
    const b = after.cards[i];
    if (!ids.has(a.id)) assert.deepEqual(b, a, 'Unrelated catalogue entry changed.');
    else {
      numericOnly(a.profile, b.profile, bounds);
      assert.deepEqual(b.profile, profiles.find(p => p.id === a.id));
      assert.deepEqual({ ...b, profile: a.profile, nativeRevision: a.nativeRevision }, a, 'Catalogue identity or metadata changed.');
      assert.equal(b.nativeRevision.id, REV);
    }
  });
}
const withoutId = ({ id, ...layer }) => layer;
function assertNative(audit, native, old, before, after) {
  const edited = changes(before, after), names = new Set(edited.map(c => c.name));
  assert.deepEqual(audit.before.map(withoutId), old.layers.map(withoutId), 'Original native evidence is stale.');
  for (const state of [audit.after, audit.reopened]) {
    assert.equal(state.length, old.layers.length);
    old.layers.forEach((original, i) => {
      const layer = state[i], change = edited.find(c => c.name === original.name);
      if (!change) assert.deepEqual(withoutId(layer), withoutId(original), 'Unchanged native layer: ' + original.name);
      else {
        assert.equal(layer.kind, 'LayerKind.TEXT'); assert.equal(layer.text, change.after);
        const style = ({ id, text, bounds, ink, ...rest }) => rest;
        assert.deepEqual(style(layer), style(original), 'Numeric layer formatting changed.');
        const spec = old.expected.find(e => e.name === layer.name);
        assert(Math.abs((layer.ink[0] + layer.ink[2]) / 2 - spec.center[0]) <= 1);
        assert(Math.abs((layer.ink[1] + layer.ink[3]) / 2 - spec.center[1]) <= 1);
        assert(layer.ink[2] - layer.ink[0] <= spec.maxWidth + 1);
      }
    });
  }
  assert.deepEqual(native.layers, audit.reopened);
  assert.deepEqual(audit.textsAfter, audit.textsBefore, 'Text style descriptors changed.');
  assert.deepEqual(audit.textsReopened, audit.textsBefore, 'Reopened text style descriptors changed.');
  assert.deepEqual(audit.effectsAfter, audit.effectsBefore, 'Layer effects changed.');
  assert.deepEqual(audit.effectsReopened, audit.effectsBefore);
  assert.deepEqual(audit.embeddedAfter, audit.embeddedBefore, 'Embedded artwork or components changed.');
  assert.deepEqual(audit.embeddedReopened, audit.embeddedBefore);
  assert(audit.embeddedBefore.length > 0 && audit.embeddedBefore.every(s => s.linked === false));
  const expected = old.expected.map(e => names.has(e.name) ? { ...e, value: edited.find(c => c.name === e.name).after } : e);
  assert.deepEqual(native.expected, expected);
  assert.deepEqual(native.typography, old.typography);
}
// True circular masks exclude the corners of the numeric-field rectangles.
function circlesFor(edits) {
  const y = [147, 372.5, 476.5, 577.5, 677.5, 774.5];
  return edits.map(e => {
    const [, side, die] = /^(ATK|DEF) D([1-6]) - valeur$/.exec(e.name);
    const i = 6 - Number(die);
    return { name: e.name, x: side === 'ATK' ? (i ? 157.5 : 142) : (i ? 736.5 : 756), y: y[i], radius: i ? 35.5 : 52 };
  });
}
function diffPixels(a, b, width, height, circles) {
  assert.equal(a.length, b.length); assert.equal(a.length, width * height * 4);
  let changed = 0, outside = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (a[i] === b[i] && a[i+1] === b[i+1] && a[i+2] === b[i+2] && a[i+3] === b[i+3]) continue;
    changed++;
    if (!circles.some(c => (x + 0.5 - c.x) ** 2 + (y + 0.5 - c.y) ** 2 <= c.radius ** 2)) outside++;
  }
  return { changed, outside };
}
module.exports = { REV, SIDES, layerName, numericOnly, changes, catalogueChange, assertNative, circlesFor, diffPixels };
