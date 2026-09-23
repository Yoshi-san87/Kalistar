'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const batch = 'V4/expansions/2026-09-23-return/';
const profiles = read(batch + 'profiles-b.json');
const provenance = read(batch + 'provenance-b.json');
const legacy = read('V3/donnees/cartes.json');
const rules = read('V3/donnees/regles_demo.json');
const weapons = read('V3/donnees/armes.json');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
assert.equal(profiles.length, 8);
assert.equal(new Set(profiles.map(c => c.key)).size, 8);
const variants = new Set(['gen-electro', 'lanio-mines']);
const gameplay = ['element','race','faction','weapon','positions','role','atk','defense','magic','barriers'];
const cards = profiles.map(c => {
  const source = legacy.find(x => x.id === c.legacyId);
  assert.ok(source, c.key + ' legacy source');
  assert.equal(c.characterId, source.characterId);
  assert.ok(c.positions.includes(c.role));
  assert.ok(Object.hasOwn(weapons, c.weapon), c.key + ' weapon');
  assert.ok(c.title.length <= 35, c.key + ' title length');
  for (const side of ['atk','defense']) {
    assert.equal(c[side].length, 6);
    c[side].forEach((v, i) => {
      if (typeof v === 'number') assert.ok(Number.isInteger(v) && v >= 0 && v <= rules.roleBounds[c.role][side][i], c.key + ' ' + side + ' D' + (6-i));
      else assert.ok((side === 'atk' ? ['revive','guard','retry','mana','buff_atk'] : ['dodge','retry']).includes(v));
    });
  }
  if (c.atk.includes('revive')) assert.ok(rules.reraise.allowedRoles.includes(c.role));
  if (c.atk.includes('guard')) assert.ok(rules.guard.allowedRoles.includes(c.role));
  for (const [effect, side] of [['magic','atk'],['barriers','defense']]) {
    assert.equal(new Set(c[effect]).size, c[effect].length);
    c[effect].forEach(d => assert.ok(Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6-d] === 'number'));
  }
  if (c.element === 'NONE') { assert.deepEqual(c.magic, []); assert.deepEqual(c.barriers, []); }
  if (!variants.has(c.key)) for (const field of gameplay) assert.deepEqual(c[field], source[field], c.key + ' preserved ' + field);
  const image = fs.readFileSync(path.join(root, c.art));
  assert.equal(image.subarray(1,4).toString(), 'PNG');
  const dimensions = [image.readUInt32BE(16), image.readUInt32BE(20)];
  assert.ok(dimensions[0] >= 737 && dimensions[1] >= 921);
  const p = provenance.entries.find(x => x.key === c.key);
  assert.equal(p.selected, c.art);
  if (p.mode === 'byte-identical-reuse') assert.equal(hash(p.original), hash(p.selected));
  else {
    const request = read(p.exactRequest);
    assert.ok(request.prompt.length > 100);
    assert.ok(request.referenced_image_paths.every(f => fs.existsSync(f)));
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p.generatedOriginal)).digest('hex'), hash(c.art));
  }
  return {key:c.key,role:c.role,legacyGameplayPreserved:!variants.has(c.key),dimensions,textLength:c.text.length,sha256:hash(c.art),art:c.art};
});
const reusePrompts = provenance.entries.filter(e => e.mode === 'byte-identical-reuse').map(e => ({key:e.key,source:e.originalPromptSource,prompt:legacy.find(c => c.id === e.legacyId).prompt}));
console.log(JSON.stringify({passed:true,count:8,preservedProfiles:6,newVariantProfiles:2,reusedArt:5,generatedArt:3,generationCalls:4,rejectedArt:1,sharedCharacterIds:{gen:profiles.filter(c=>c.characterId==='gen').map(c=>c.key),lanio:profiles.filter(c=>c.characterId==='lanio').map(c=>c.key)},cards,reusePrompts},null,2));
