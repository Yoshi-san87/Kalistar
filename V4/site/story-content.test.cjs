'use strict';

const assert = require('node:assert/strict');
const {test} = require('node:test');
const {createHash} = require('node:crypto');
const manuscript = require('./story-content.json');
const words = section => section.paragraphs.reduce((count, paragraph) => count + (paragraph.match(/\S+/g) || []).length, 0);

test('the completed novel meets the requested 100000 to 120000 words', () => {
  const total = manuscript.sections.reduce((count, section) => count + words(section), 0);
  assert.ok(total >= 100000 && total <= 120000, `Novel word count: ${total}`);
  assert.ok(words(manuscript.sections[0]) >= 2000, 'the prologue is developed');
  assert.ok(manuscript.sections.slice(1).every(section => words(section) >= 5000), 'each chapter retains developed scenes');
});

test('the manuscript has ordered, unique sections and nonempty French prose', () => {
  assert.equal(manuscript.sections.length, 18);
  assert.deepEqual(manuscript.sections.map(section => section.id), [
    'prologue', ...Array.from({length: 17}, (_, index) => `chapter-${index + 1}`)
  ]);
  const paragraphs = new Set();
  for (const section of manuscript.sections) {
    assert.ok(section.title && section.label);
    assert.ok(section.paragraphs.length > 0);
    for (const paragraph of section.paragraphs) {
      assert.equal(typeof paragraph, 'string');
      assert.ok(paragraph.trim().length > 0);
      assert.doesNotMatch(paragraph, /(?:TODO|FIXME|\[A COMPLETER\]|\[À COMPLÉTER\]|lorem ipsum)/i, 'no writing placeholder reaches the reader');
      assert.ok(!paragraphs.has(paragraph), `Repeated paragraph in ${section.id}`);
      paragraphs.add(paragraph);
    }
  }
});

test('the new author source restores Gen without publishing sequel lore', () => {
  const byId = Object.fromEntries(manuscript.sections.map(section => [section.id, section.paragraphs.join('\n')]));
  assert.match(byId['chapter-4'], /transfusion Electro/);
  assert.match(byId['chapter-4'], /Il était devenu un Sentry/);
  assert.match(byId['chapter-4'], /main droite/);
  assert.match(byId['chapter-4'], /Baba.*Lanio/s);
  const novel = Object.values(byId).join('\n');
  // Keep the unpublished author terms themselves out of the public sources.
  const reserved = new Set([
    '08e501d4fc6515d8ce09f7abefb806599aa95159c0c3a12e9b0111eb8193653e',
    '8c624bed3df9fb97c8c767d646efb69df588deca0205757ef112b308440e41e7',
    '22f144b7fc0c7529145f8685d765ed0d6af0f710808c642029f7ab7df2877fa9',
    '5802231e953b7dc4c548c9afb591eb28a291f0521588eb6b15a10feaf1965916',
    'cdafe6992975879b9b9b68db06adda2a5b81e639504b9d9cba2d9539a86036c9'
  ]);
  const tokens = novel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').match(/[a-z]+/g) || [];
  for (let i = 0; i < tokens.length; i++) for (const size of [2, 3]) {
    const hash = createHash('sha256').update(tokens.slice(i, i + size).join(' ')).digest('hex');
    assert.ok(!reserved.has(hash), 'reserved author mechanisms remain outside Tome I');
  }
  assert.doesNotMatch(novel, /Gen n['’]était pas un Sentry|Gen ne possédait aucun pouvoir/);
});

test('approved illustrations follow the actual depicted scenes', () => {
  const expected = new Map([
    ['chapter-1', ['30000022', /Au comptoir, Baba leva sa chope/]],
    ['chapter-4', ['30000012', /Kaylis s’arrêta tout à fait/]],
    ['chapter-5', ['30000007', /Balmhyr.*Belzébuth/]],
    ['chapter-8', ['30000021', /Un joueur lui lança le ballon/]]
  ]);
  let scenes = 0;
  for (const section of manuscript.sections) {
    const anchors = new Set();
    for (const scene of section.illustrations || []) {
      assert.ok(Number.isInteger(scene.afterParagraph));
      assert.ok(scene.afterParagraph >= 0 && scene.afterParagraph < section.paragraphs.length);
      assert.ok(!anchors.has(scene.afterParagraph));
      anchors.add(scene.afterParagraph);
      assert.ok(scene.alt && scene.caption);
      const reference = expected.get(section.id);
      assert.ok(reference, `Unexpected scene in ${section.id}`);
      assert.equal(scene.cardId, reference[0]);
      assert.match(section.paragraphs[scene.afterParagraph], reference[1]);
      scenes += 1;
    }
  }
  assert.equal(scenes, expected.size);
});

test('the Council and open ending retain the author sequence', () => {
  const council = manuscript.sections.find(section => section.id === 'chapter-15').paragraphs.join('\n');
  const order = [
    'Six voix approuvèrent. Six refusèrent.',
    'Lok sortit une dague courbe.',
    'Ils entrèrent avant que les soldats',
    'J’ai échoué.',
    'Le second choc ouvrit la baie',
    'ferma doucement les yeux de leur ami'
  ].map(moment => council.indexOf(moment));
  assert.ok(order.every((index, i) => index >= 0 && (!i || index > order[i - 1])), 'vote, murder, intervention, remorse and fatal fall stay in order');
  const ending = manuscript.sections.at(-1).paragraphs.join('\n');
  const refusal = ending.indexOf('Je ne te laisserai pas l’emporter.');
  assert.ok(refusal >= 0 && ending.indexOf('Le violet apparut') > refusal);
  assert.match(ending, /Gen.*Mennuyir|Mennuyir.*Gen/s);
  assert.match(manuscript.sections.at(-1).paragraphs.at(-1), /Kaylis.*Mennuyir.*captif/s);
});
