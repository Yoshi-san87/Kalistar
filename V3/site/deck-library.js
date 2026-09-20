(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KalistarDeckLibrary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LIMIT = 10, SLOTS = 10, MAX_JSON = 65536;
  const CARD_ID = /^300000(?:0[1-9]|[1-3][0-9]|4[01])$/;
  const DECK_ID = /^kd-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function fail(code, message) {
    const error = new Error(message); error.name = 'DeckLibraryError'; error.code = code; throw error;
  }
  function exact(value, keys) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).length === keys.length && keys.every(k => own(value, k));
  }
  function name(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 50 || /[\x00-\x1f\x7f]/.test(value))
      fail('INVALID_NAME', 'Nom requis, de 1 a 50 caracteres sans caracteres de controle.');
    return value.trim();
  }
  const copy = deck => ({ id: deck.id, name: deck.name, cards: deck.cards.slice() });
  const envelope = decks => ({ schema: 1, edition: 'V3', decks });
  function create({ storage, userId, knownIds, crypto: random = globalThis.crypto } = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function')
      fail('NO_STORAGE', 'Stockage local indisponible.');
    if (typeof userId !== 'string' || !userId.trim() || userId.length > 120 || /[\x00-\x1f\x7f]/.test(userId))
      fail('INVALID_USER', 'Profil de bibliotheque invalide.');
    if (!Array.isArray(knownIds) || !knownIds.length || Array.from(knownIds).some(id => typeof id !== 'string' || !CARD_ID.test(id)) || new Set(knownIds).size !== knownIds.length)
      fail('INVALID_CATALOGUE', 'Identifiants connus du catalogue V3 requis.');
    const known = new Set(knownIds), key = 'kalistar.v3.deckLibrary.' + encodeURIComponent(userId);
    function slots(value) {
      if (!Array.isArray(value) || value.length !== SLOTS) fail('INVALID_SLOTS', 'Dix slots sont requis, avec null pour une place vide.');
      for (let i = 0; i < SLOTS; i++) {
        if (!own(value, i) || value[i] !== null && (typeof value[i] !== 'string' || !CARD_ID.test(value[i]) || !known.has(value[i])))
          fail('INVALID_CARD', 'Carte inconnue ou incompatible V3 dans le slot ' + (i + 1) + '.');
      }
      return value.slice();
    }
    function entry(value) {
      if (!exact(value, ['id', 'name', 'cards']) || typeof value.id !== 'string' || !DECK_ID.test(value.id))
        fail('INVALID_DECK', 'Deck sauvegarde invalide.');
      return { id: value.id, name: name(value.name), cards: slots(value.cards) };
    }
    function validate(value) {
      if (!exact(value, ['schema', 'edition', 'decks']) || value.schema !== 1 || value.edition !== 'V3' || !Array.isArray(value.decks))
        fail('INVALID_LIBRARY', 'Bibliotheque JSON V3 invalide.');
      if (value.decks.length > LIMIT) fail('LIBRARY_FULL', 'Dix decks maximum par profil.');
      const decks = Array.from(value.decks, entry);
      if (new Set(decks.map(d => d.id)).size !== decks.length) fail('DUPLICATE_ID', 'Identifiants de decks dupliques.');
      return decks;
    }
    function parse(raw) {
      if (typeof raw !== 'string' || raw.length > MAX_JSON) fail('INVALID_JSON', 'Fichier JSON absent ou trop volumineux.');
      let value;
      try { value = JSON.parse(raw); } catch { fail('INVALID_JSON', 'JSON illisible. Aucune sauvegarde modifiee.'); }
      return validate(value);
    }
    function read() {
      const raw = storage.getItem(key);
      return { raw, decks: raw === null ? [] : parse(raw) };
    }
    function mutate(fn) {
      const { raw, decks } = read();
      const result = fn(decks);
      const checked = validate(envelope(decks));
      const json = JSON.stringify(envelope(checked));
      if (storage.getItem(key) !== raw) fail('CONFLICT', 'Bibliotheque modifiee ailleurs. Actualisez avant de sauvegarder.');
      storage.setItem(key, json);
      return result;
    }
    function newId(decks) {
      if (!random || typeof random.randomUUID !== 'function') fail('NO_CRYPTO', 'Generation securisee des identifiants indisponible.');
      const id = 'kd-' + random.randomUUID();
      if (!DECK_ID.test(id) || decks.some(d => d.id === id)) fail('ID_COLLISION', 'Identifiant securise invalide ou deja utilise.');
      return id;
    }
    function lookup(decks, id) {
      const index = decks.findIndex(d => d.id === id);
      if (index < 0) fail('NOT_FOUND', 'Deck sauvegarde introuvable.');
      return index;
    }
    return Object.freeze({
      key,
      list: () => read().decks.map(copy),
      get: id => { const decks = read().decks; return copy(decks[lookup(decks, id)]); },
      validateDraft: value => {
        if (!exact(value, ['name', 'cards'])) fail('INVALID_DRAFT', 'Brouillon invalide.');
        return { name: name(value.name), cards: slots(value.cards) };
      },
      save(value) {
        if (!value || !exact(value, own(value, 'id') ? ['id', 'name', 'cards'] : ['name', 'cards'])) fail('INVALID_DRAFT', 'Brouillon invalide.');
        const clean = { name: name(value.name), cards: slots(value.cards) };
        return mutate(decks => {
          const index = own(value, 'id') ? lookup(decks, value.id) : decks.length;
          if (index === LIMIT) fail('LIBRARY_FULL', 'Dix decks maximum par profil.');
          const next = { id: own(value, 'id') ? value.id : newId(decks), ...clean };
          decks[index] = next; return copy(next);
        });
      },
      duplicate(id, nextName) {
        return mutate(decks => {
          const source = decks[lookup(decks, id)];
          if (decks.length === LIMIT) fail('LIBRARY_FULL', 'Dix decks maximum par profil.');
          const next = { ...copy(source), id: newId(decks), name: name(nextName === undefined ? source.name.slice(0, 42) + ' (copie)' : nextName) };
          decks.push(next); return copy(next);
        });
      },
      remove(id) { return mutate(decks => copy(decks.splice(lookup(decks, id), 1)[0])); },
      exportJSON: () => JSON.stringify(envelope(read().decks), null, 2),
      importJSON(raw, { mode = 'merge' } = {}) {
        const incoming = parse(raw);
        if (!['merge', 'replace'].includes(mode)) fail('INVALID_MODE', 'Mode import invalide.');
        return mutate(decks => {
          if (mode === 'replace') decks.splice(0, decks.length, ...incoming);
          else decks.push(...incoming);
          return decks.map(copy);
        });
      }
    });
  }
  return Object.freeze({ create, LIMIT, SLOTS });
});
