'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const M = require('./model.cjs'), set = require('./set.json');
const {buildCatalog} = require('../../atelier/game-catalog.cjs');
const {createEngine} = require('../../site/engine.js');
const profile = require('./cards/varkhen/profile.json');
const catalogue = require('../../donnees/catalogue.json');
const published = catalogue.cards.filter(c => c.kind === 'created' && c.id !== profile.id);
published.push({id:profile.id, profile, pngUrl:'/media/created/' + profile.id + '.png'});
const dataPromise = buildCatalog({published});
test('Published Varkhen matches the verified native profile and image', () => {
  const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
  const matches = catalogue.cards.filter(c => c.id === profile.id);
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].profile, profile);
  const dir = path.resolve(__dirname, '../../creations', profile.id);
  const proof = JSON.parse(fs.readFileSync(path.join(dir, 'verification.json'), 'utf8'));
  assert(proof.passed && proof.barcode.passed);
  assert.equal(proof.roundtrip.changed, 0);
  assert.equal(proof.components.fixedDifferences, 0);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'card.png'))).digest('hex'), proof.hashes['card.png']);
});
test('Varkhen preserves stable identity, role bounds and native rules', () => {
  M.validateSet(set); M.validateProfile(profile, set.cards[0]);
  for (const mutate of [
    s => s.cards[0].atk[0] = 211,
    s => s.cards[0].defense[0] = 301,
    s => s.cards[0].magic.push(1),
    s => s.cards[0].barriers.push(0),
    s => s.cards[0].race = 'HUMAIN',
    s => s.cards[0].characterId = 'VARKHEN',
    s => s.cards[0].atk[5] = 'death'
  ]) { const invalid = structuredClone(set); mutate(invalid); assert.throws(() => M.validateSet(invalid)); }
});
test('Original collection, weapons and synergies work without a new mechanic', async () => {
  const data = await dataPromise, E = createEngine(data);
  const result = M.validateGame(data, set, createEngine);
  assert.equal(result.added, 1);
  const card = data.cards.find(c => c.id === profile.id);
  assert(require('../../site/collection-binder.js').matchesScope(card, 'kalistar'));
  const board = [{uid:'0-1', cardId:card.id},{uid:'0-2',cardId:'30000035'}];
  for (const field of ['race','faction']) assert.equal(E.synergy({board},board[0],field), E.rules.synergy[2]);
  assert.equal(card.weapon, 'Ep\u00e9e longue');
  assert.equal(card.canGuard, true); assert.equal(card.canHeal, false);
});
function step(E, s) {
  if(s.phase === 'choose') E.lock(s,...E.aiChoice(s));
  else if(s.phase === 'attack') E.rollAttack(s);
  else if(s.phase === 'kalistel') E.acceptAttack(s);
  else if(s.phase === 'defense') E.rollDefense(s);
  else if(s.phase === 'replace') E.autoDeploy(s,s.replacing);
  else if(s.phase === 'result') E.next(s);
  else {
    const effects = {clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
    assert(effects[s.phase],s.phase);
    const [grant,choose] = effects[s.phase]; E[grant](s,E[choose](s));
  }
}
test('Varkhen fights and supports across 24 complete save/restore matches', async () => {
  const data = await dataPromise, E = createEngine(data), decks = M.qaDecks(data);
  let visible = 0, guard = 0;
  for(let seed = 0; seed < 24; seed++) {
    let s = E.newGame(decks[0], decks[1], {seed:'CRYPTOWN-' + seed, kalistel:false});
    E.autoDeploy(s,0); E.autoDeploy(s,1); E.start(s);
    for(let n = 0; n < 4000 && s.phase !== 'over'; n++) {
      if(s.players.some(p => p.board.some(u => u && u.cardId === profile.id))) visible++;
      if(s.phase === 'guard') guard++;
      step(E,s); E.assertState(s);
      if(n % 11 === 0) { const restored = E.restoreGame(JSON.parse(JSON.stringify(s))); assert.deepEqual(restored,s); s = restored; }
    }
    assert.equal(s.phase,'over'); assert(E.matchStats(s).complete);
  }
  assert(visible > 0); assert(guard > 0);
});
