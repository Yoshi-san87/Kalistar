'use strict';

const assert = require('node:assert/strict');
const {test} = require('node:test');
const manuscript = require('./story-content.json');
const words = section => section.paragraphs.reduce((count, paragraph) => count + (paragraph.match(/\S+/g) || []).length, 0);

test('the completed novel remains near the requested 80000 words', () => {
  const total = manuscript.sections.reduce((count, section) => count + words(section), 0);
  assert.ok(total >= 80000 && total <= 84000, `Novel word count: ${total}`);
  assert.ok(words(manuscript.sections[0]) >= 2000, 'the prologue is developed');
  assert.ok(manuscript.sections.slice(1).every(section => words(section) >= 3000), 'no chapter regresses to the original short synopsis');
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
      assert.ok(!paragraphs.has(paragraph), `Repeated paragraph in ${section.id}`);
      paragraphs.add(paragraph);
    }
  }
});

test('approved illustrations follow the actual depicted scenes', () => {
  const expected = new Map([
    ['chapter-1', ['30000022', /Au comptoir, Baba leva sa chope/]],
    ['chapter-4', ['30000012', /Kaylis s’arrêta tout à fait/]],
    ['chapter-5', ['30000007', /Il s’appelait Balmhyr.*Belzébuth/]],
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
