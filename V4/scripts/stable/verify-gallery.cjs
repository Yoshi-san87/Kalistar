const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, ''));
const html = fs.readFileSync(path.join(root, 'V4/galerie-elements.html'), 'utf8');
const cards = JSON.parse(html.match(/<script type="application\/json" id="card-data">([\s\S]*?)<\/script>/)[1]);
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
new vm.Script(script);
const elements = vm.runInNewContext(script.match(/const elements = (\[[\s\S]*?\]);/)[1]);
assert.equal(cards.length, 26);
assert.equal(new Set(cards.map(c => c.output)).size, cards.length);
assert.equal(elements.length, 13);
const expected = [...read('V4/template-stable/current.json').cards,
  ...read('V4/template-stable/elements-01/manifest.json').cards,
  ...read('V4/template-stable/elements-02/manifest.json').cards];
assert.deepEqual(cards.map(c => c.output).sort(), expected.map(c => c.output).sort());
for (const card of cards) {
  assert.ok(elements.some(e => e.id === card.element));
  for (const [folder, ext] of [['cartes', 'png'], ['templates', 'psd']])
    assert.ok(fs.statSync(path.join(root, `V4/${folder}/${card.output}.${ext}`)).size > 0);
}
const crystals = fs.readdirSync(path.join(root, 'V3/assets/cristaux'))
  .filter(f => /^[A-Z]+\.png$/.test(f)).map(f => path.basename(f, '.png')).sort();
assert.deepEqual(Array.from(elements, e => e.id).sort(), crystals);
assert.equal(elements.find(e => e.id === 'MINERO').label, 'Roche');
assert.equal(elements.find(e => e.id === 'GEO').label, 'Terre');
const start = script.indexOf('function galleryLayout(');
const end = script.indexOf('\n    function layout(', start);
const calculate = vm.runInNewContext(`const ratio=897/1497; (${script.slice(start, end).trim()})`);
const cases = [];
for (const [width, height] of [[320,568],[390,844],[768,1024],[844,390],[1280,720],[1440,900],[1920,1080],[2560,1440]]) {
  const narrow = width <= 640, short = !narrow && height <= 450;
  const columns = narrow ? 4 : width >= 1500 ? 13 : 7;
  // Extra mobile tab height conservatively allows long labels to wrap.
  const tabs = Math.ceil(elements.length / columns) * (narrow ? 50 : short ? 36 : 48);
  const availableWidth = width - (narrow ? 28 : 48);
  const availableHeight = height - (narrow ? 48+48+16 : short ? 36+40+10 : 56+52+24) - tabs - 4;
  for (const e of elements) {
    const count = cards.filter(c => c.element === e.id).length;
    assert.ok(count > 0);
    const result = calculate(availableWidth, availableHeight, count, narrow);
    const usedWidth = result.artWidth * result.size + (result.size - 1) * (narrow ? 12 : 20);
    assert.ok(usedWidth <= availableWidth + 1);
    assert.ok(result.artHeight + 40 <= availableHeight);
    assert.ok(result.artHeight > 100);
    cases.push({width, height, element:e.id, ...result});
  }
}
const result = {passed:true, cards:cards.length, categories:elements.length, sizingCases:cases.length,
  browserVisualTest:false, note:'Static paths, JavaScript syntax and sizing arithmetic only.'};
fs.writeFileSync(path.join(root, 'V4/template-stable/elements-02/gallery-verification.json'), JSON.stringify(result, null, 2));
console.log(result);
