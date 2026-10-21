'use strict';
const collaborations = require('../site/collaborations.js');
const slug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;

function supplementalArenas(entries, characterIds, elements, existing, cards, native) {
  if (!Array.isArray(entries)) throw Error('La liste des arenes est invalide.');
  const ids = new Set(existing.map(a => a.id)), arenas = [];
  for (const a of entries) {
    if (!a || typeof a !== 'object' || Array.isArray(a) || !slug(a.id) || ids.has(a.id)
      || (native ? a.collaboration != null : !slug(a.collaboration))) throw Error('Identifiant d arene invalide ou duplique.');
    ids.add(a.id);
    for (const field of ['name', 'subtitle', 'source']) {
      if (typeof a[field] !== 'string' || !a[field].trim() || a[field].length > 500 || /[<>"\x00-\x1f]/.test(a[field])) throw Error('Champ d arene invalide : ' + field);
    }
    if (typeof a.image !== 'string' || !/^\/jeu\/assets\/arenes\/[a-z0-9][a-z0-9_-]*\.(png|webp|jpg|jpeg)$/.test(a.image)) throw Error('Image d arene invalide.');
    if (![null, 'NONE', ...Object.keys(elements)].includes(a.element)) throw Error('Element d arene invalide.');
    for (const [field, max] of [['elementBonus', 15], ['homeAttack', 10], ['homeDefense', 10]]) {
      if (!Number.isInteger(a[field]) || a[field] < 0 || a[field] > max) throw Error('Bonus d arene invalide : ' + field);
    }
    if ((a.element == null || a.element === 'NONE') && a.elementBonus !== 0) throw Error('Bonus elementaire d arene neutre invalide.');
    if (!Array.isArray(a.homeCharacters) || a.homeCharacters.some(id => !slug(id))
      || new Set(a.homeCharacters).size !== a.homeCharacters.length || native && !a.homeCharacters.length) throw Error('Affinites d arene invalides.');
    // Native places require a published native host; crossover availability follows the version's universe.
    const available = native
      ? (cards || []).some(card => !collaborations.of(card) && a.homeCharacters.includes(card.characterId))
      : cards ? cards.some(card => collaborations.matches(card, a.collaboration))
        : [...characterIds].some(id => id.endsWith('-' + a.collaboration));
    if (!available) continue;
    const { collaboration, ...arena } = a;
    arenas.push({ ...arena, homeCharacters: a.homeCharacters.filter(id => characterIds.has(id)) });
  }
  return arenas;
}

const collaborationArenas = (entries, characterIds, elements, existing, cards) => supplementalArenas(entries, characterIds, elements, existing, cards, false);
const kalistarArenas = (entries, characterIds, elements, existing, cards) => supplementalArenas(entries, characterIds, elements, existing, cards, true);
module.exports = { collaborationArenas, kalistarArenas };
