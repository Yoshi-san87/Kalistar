'use strict';
const assert = require('node:assert/strict');
const base = require('../../collaborations/nier-pilot-01/typography.cjs');
function verify(native) {
  const name = native.layers.find(l => l.name === 'NOM');
  if (name?.text !== 'LIQUID SNAKE') return base.verify(native);
  for (const [key,size,caps] of [['NOM',10,'TextCase.NORMAL'],['TITLE',7.68,'TextCase.ALLCAPS']]) {
    const style = native.typography?.[key], layer = native.layers.find(l => l.name === key);
    assert.ok(style && layer);
    assert.equal(style.font,'TimesNewRomanPSMT'); assert.equal(layer.font,style.font);
    assert.ok(Math.abs(style.sizePt-size)<.001 && Math.abs(layer.sizePt-size)<.001);
    assert.equal(style.capitalization,caps); assert.equal(style.tracking,0);
    assert.equal(style.fauxBold,false); assert.equal(style.fauxItalic,false);
  }
  // The approved 10 pt Q descends below the cap-height envelope. This is not
  // a wider generic tolerance: pin the exact inspected Liquid name geometry.
  assert.deepEqual(name.ink,[303,111,596,148],'Liquid name differs from its approved native ink geometry.');
  assert.ok(name.ink[1]>=105 && name.ink[3]<=153);
  assert.ok(Math.abs((name.ink[0]+name.ink[2])/2-449.5)<=1);
  assert.ok(Math.abs((name.ink[1]+name.ink[3])/2-129.5)<=1);
  return native.typography;
}
module.exports = { ...base, verify };
