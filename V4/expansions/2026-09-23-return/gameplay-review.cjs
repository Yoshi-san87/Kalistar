'use strict';
const L = require('../../atelier/lib.cjs');
const { createEngine } = require('../../site/engine.js');
async function main() {
  const set = L.read(L.path.join(__dirname, 'set.json'));
  const data = L.fs.existsSync(L.path.join(__dirname, 'published.json'))
    ? await require('../../atelier/game-catalog.cjs').buildCatalog({ published: L.read(L.path.join(L.ROOT, 'V4/donnees/catalogue.json')).cards.filter(c => c.kind === 'created') })
    : await require('./build.cjs').createBuilder().game();
  const e = createEngine(data), originals = L.read(L.path.join(L.ROOT, 'V3/donnees/cartes.json'));
  const fields = ['characterId', 'race', 'faction', 'weapon', 'positions', 'role', 'atk', 'defense', 'magic', 'barriers'];
  for (const spec of set.cards.filter(c => c.edition === 'canonical')) {
    const old = originals.find(c => c.id === spec.legacyId), current = e.byId[spec.id];
    for (const key of fields) L.assert.deepEqual(current[key], old[key], 'Canonical gameplay changed: ' + spec.key + '.' + key);
  }
  function deck(first, offset) {
    const cards = [...data.cards.slice(offset), ...data.cards.slice(0, offset)], selected = first ? [first] : [];
    while (selected.length < 10) {
      const coverage = [1, 2, 3, 4, 5].map(p => selected.filter(id => e.byId[id].positions.includes(p)).length);
      const available = cards.filter(c => !selected.some(id => e.byId[id].characterId === c.characterId)
        && (c.element !== 'RAINBOW' || !selected.some(id => e.byId[id].element === 'RAINBOW')));
      const gain = c => c.positions.reduce((n, p) => n + Math.max(0, 2 - coverage[p - 1]), 0);
      available.sort((a, b) => gain(b) - gain(a)); L.assert.ok(available.length); selected.push(available[0].id);
    }
    L.assert.deepEqual(e.validatePlayableDeck(selected), []); return selected;
  }
  const results = [];
  for (const [index, spec] of set.cards.entries()) {
    let s = e.newGame(deck(spec.id, index), deck(null, index + 7), { seed: 'RETURN-' + spec.key, mode: 'local', deckCoverage: 2 });
    e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s);
    let steps = 0;
    while (s.phase !== 'over' && steps++ < 3500) {
      if (s.phase === 'choose') e.lock(s, ...e.aiChoice(s));
      else if (s.phase === 'attack') e.rollAttack(s);
      else if (s.phase === 'kalistel') e.aiUseKalistel(s) ? e.useKalistel(s) : e.acceptAttack(s);
      else if (s.phase === 'defense') e.rollDefense(s);
      else if (s.phase === 'result') e.next(s);
      else if (s.phase === 'replace') e.autoDeploy(s, s.replacing);
      else {
        const effect = { guard: 'Guard', heart: 'Reraise', potion: 'Potion', physical: 'Physical', clover: 'Clover' }[s.phase];
        L.assert.ok(effect, s.phase); e['grant' + effect](s, e['ai' + effect + 'Choice'](s));
      }
      s = e.restoreGame(s);
    }
    L.assert.equal(s.phase, 'over'); L.assert.ok(s.kalistel.spent.length <= 4);
    L.assert.equal(new Set(s.match.events.map(v => v.round)).size, s.match.events.length);
    results.push({ key: spec.key, id: spec.id, steps, rounds: s.round, events: s.match.events.length, winner: s.winner });
  }
  const report = { passed: true, catalogueCards: data.cards.length, canonicalGameplayPreserved: 11, matches: results,
    scope: 'Valid playable decks, each added card included in one match, all intermediate states restorable; not a competitive balance or guaranteed participation claim.' };
  L.write(L.path.join(__dirname, 'gameplay-review.json'), report);
  console.log(JSON.stringify({ passed: true, cards: data.cards.length, matches: results.length, originalProfiles: 11 }));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
