'use strict';
const L = require('../../atelier/lib.cjs');
function loadCalibration() {
  const file = name => L.path.join(__dirname, name), proof = L.read(file('typography-calibration.json'));
  const hash = f => L.crypto.createHash('sha256').update(L.fs.readFileSync(f)).digest('hex');
  L.assert.equal(hash(file('typography-calibration-native.json')), proof.nativeHash);
  L.assert.equal(hash(file('typography-calibration-request.json')), proof.requestHash);
  L.assert.deepEqual(proof.names, L.read(file('typography-calibration-native.json')).names);
  L.assert.deepEqual(proof.names.map(n => n.name), L.read(file('typography-calibration-request.json')).names);
  for (const [name, expected] of Object.entries(proof.inputs)) L.assert.equal(hash(L.inside(L.ROOT, name)), expected);
  return proof;
}
function verify(native, calibration = loadCalibration()) {
  const { assert } = L;
  for (const [name, size, caps] of [['NOM', 10, 'TextCase.NORMAL'], ['TITLE', 7.68, 'TextCase.ALLCAPS']]) {
    const style = native.typography?.[name], layer = native.layers.find(l => l.name === name);
    assert.ok(style && layer, 'Preuve typographique native absente : ' + name);
    assert.equal(style.font, 'TimesNewRomanPSMT'); assert.equal(layer.font, style.font);
    assert.ok(Math.abs(style.sizePt - size) < .001 && Math.abs(layer.sizePt - size) < .001);
    assert.equal(style.capitalization, caps); assert.equal(style.tracking, 0);
    assert.equal(style.fauxBold, false); assert.equal(style.fauxItalic, false);
  }
  const name = native.layers.find(l => l.name === 'NOM'), expected = calibration.names.find(n => n.name === name.text);
  assert.ok(expected, 'Nom non calibre.');
  assert.ok(Math.abs((name.ink[2] - name.ink[0]) - expected.width) <= 1, 'Largeur native du nom differente.');
  assert.ok(Math.abs((name.ink[3] - name.ink[1]) - expected.height) <= 1, 'Hauteur native du nom differente.');
  assert.ok(name.ink[1] >= 99 && name.ink[3] <= 160 && Math.abs((name.ink[0] + name.ink[2]) / 2 - 449.5) <= 1 && Math.abs((name.ink[1] + name.ink[3]) / 2 - 129.5) <= 1, 'Nom hors du bandeau natif.');
  return native.typography;
}
module.exports = { verify, loadCalibration, preview: require('../../collaborations/nier-pilot-01/typography.cjs').preview };
