'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const T = require('./typography.cjs');
function proof() {
  const typography = Object.fromEntries([['NOM', 10, 'TextCase.NORMAL'], ['TITLE', 7.68, 'TextCase.ALLCAPS']].map(([name, sizePt, capitalization]) => [name, { font: 'TimesNewRomanPSMT', sizePt, tracking: 0, capitalization, fauxBold: false, fauxItalic: false }]));
  return { typography, layers: Object.entries(typography).map(([name, style]) => ({ name, ...style, ink: [420, 115, 480, 145] })) };
}
test('name and version have explicit native typography; missing/substituted styles fail', () => {
  T.verify(proof());
  for (const change of [p => delete p.typography, p => p.layers[0].font = 'Augustus', p => p.typography.NOM.sizePt = 8, p => p.typography.TITLE.capitalization = 'TextCase.NORMAL', p => p.typography.NOM.tracking = -200, p => p.typography.NOM.fauxBold = true, p => p.layers[0].ink[3] = 130]) {
    const p = proof(); change(p); assert.throws(() => T.verify(p));
  }
});
test('preview retains the original strings but uses capitals for the visible version', async () => {
  let seen;
  const original = { name: '2B', title: 'Lame des ruines' };
  const result = await T.preview(original, { previewText: async p => { seen = p; return [{}, { title: p.title }]; } });
  assert.equal(seen.title, 'LAME DES RUINES'); assert.equal(original.title, 'Lame des ruines');
  assert.equal(result.length, 2); assert.ok(Buffer.isBuffer(result[0].input));
  assert.ok(result[0].left > 400 && result[0].top > 105);
});
