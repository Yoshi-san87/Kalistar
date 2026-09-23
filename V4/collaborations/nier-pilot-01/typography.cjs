'use strict';
const { assert, sharp } = require('../../atelier/lib.cjs');
function verify(native) {
  for (const [name, size, caps] of [['NOM', 10, 'TextCase.NORMAL'], ['TITLE', 7.68, 'TextCase.ALLCAPS']]) {
    const style = native.typography?.[name], layer = native.layers.find(l => l.name === name);
    assert.ok(style && layer, 'Preuve typographique native absente : ' + name);
    assert.equal(style.font, 'TimesNewRomanPSMT'); assert.equal(layer.font, style.font);
    assert.ok(Math.abs(style.sizePt - size) < .001 && Math.abs(layer.sizePt - size) < .001);
    assert.equal(style.capitalization, caps); assert.equal(style.tracking, 0);
    assert.equal(style.fauxBold, false); assert.equal(style.fauxItalic, false);
  }
  const name = native.layers.find(l => l.name === 'NOM');
  assert.ok(name.ink[3] - name.ink[1] >= 25 && name.ink[3] - name.ink[1] <= 35, 'Nom illisible ou trop grand.');
  return native.typography;
}
async function preview(profile, renderer) {
  const layers = await renderer.previewText({ ...profile, title: profile.title.toUpperCase() });
  const text = profile.name.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const input = await sharp({ text: { text: '<span foreground="#f0efec">' + text + '</span>', font: 'Times New Roman 41.6667', rgba: true } }).png().toBuffer();
  const meta = await sharp(input).metadata(); assert.ok(meta.width <= 470);
  layers[0] = { input, left: Math.round(449.5 - meta.width / 2), top: Math.round(129.5 - meta.height / 2) };
  return layers;
}
module.exports = { verify, preview };
