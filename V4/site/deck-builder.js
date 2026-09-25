(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./deck-library.js') : root.KalistarDeckLibrary);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KalistarDeckBuilder = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Library) {
  'use strict';
  const ROLES = ['Tank', 'DPS physique', 'Middle', 'DPS magique', 'Support'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = d => ({ name: d.name, cards: d.cards.slice() });
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const button = (action, symbol, label, extra = '') => `<button type="button" class="kdb-icon" data-deck-action="${action}" title="${esc(label)}" aria-label="${esc(label)}" ${extra}>${icon(symbol)}</button>`;
  const image = c => globalThis.KalistarCardMedia.image(c);
  function errorsFrom(fn) {
    try {
      const result = fn();
      return Array.isArray(result) && result.every(e => typeof e === 'string') ? result : ['Validation indisponible.'];
    } catch (error) { return [error.message || 'Validation indisponible.']; }
  }
  function createModel({ data, engine, registry, userId, validateDeck }) {
    if (!data?.cards?.length || !engine || typeof engine.validateDeck !== 'function' || typeof engine.lineup !== 'function' || typeof engine.synergy !== 'function')
      throw new Error('Catalogue et moteur Kalistar V4 requis.');
    const byId = new Map(data.cards.map(c => [String(c.id), c]));
    const count = cards => {
      const coverage = engine.deckCoverage?.(cards.slice());
      return Array.from({ length: 5 }, (_, p) => Number.isInteger(coverage?.[p + 1]) ? coverage[p + 1] : cards.filter(id => byId.get(id)?.positions.includes(p + 1)).length);
    };
    function ownership(ids) {
      if (!registry || typeof registry.deckErrors !== 'function' || typeof registry.owned !== 'function') return ['Registre local indisponible.'];
      return errorsFrom(() => registry.deckErrors(userId, ids.slice()));
    }
    function availability(id) {
      try {
        if (!byId.has(id) || !registry || typeof registry.owned !== 'function') return { owned: 0, available: 0 };
        const owned = registry.owned(userId, id);
        if (!Array.isArray(owned)) return { owned: 0, available: 0 };
        let available = Math.min(1, owned.length);
        while (available > 0 && ownership(Array(available).fill(id)).length) available--;
        return { owned: owned.length, available };
      } catch { return { owned: 0, available: 0 }; }
    }
    function evaluate(slots) {
      const ids = slots.filter(id => id !== null), coverage = count(ids);
      const strict = typeof engine.validatePlayableDeck === 'function';
      const errors = errorsFrom(() => strict ? engine.validatePlayableDeck(ids.slice()) : engine.validateDeck(ids.slice()));
      if (slots.length !== 10 || ids.length !== 10) errors.push('10 cartes requises.');
      if (ids.some(id => !byId.has(id))) errors.push('Carte V4 inconnue.');
      const characters = ids.map(id => byId.get(id)?.characterId).filter(Boolean);
      if (new Set(characters).size !== characters.length) errors.push('Une seule carte par personnage, toutes versions confondues.');
      const missing = coverage.flatMap((n, p) => n < 2 ? [p + 1] : []);
      if (missing.length && !strict) errors.push('Deux compatibles requis : ' + missing.map(p => 'P' + p).join(', ') + '.');
      let formation = null;
      try { formation = engine.lineup(ids.slice()); } catch { /* Fail closed below. */ }
      if (!Array.isArray(formation) || formation.length !== 5 || new Set(formation).size !== 5 || formation.some((index, p) => !Number.isInteger(index) || !byId.get(ids[index])?.positions.includes(p + 1))) {
        formation = null; errors.push('Formation P1\u2013P5 impossible.');
      }
      errors.push(...ownership(ids));
      if (validateDeck !== undefined) errors.push(...errorsFrom(() => validateDeck(ids.slice())));
      return { count: ids.length, coverage, missing, formation: formation?.map(index => ids[index]) || null, errors: [...new Set(errors)], playable: errors.length === 0 && !missing.length };
    }
    // Only synthetic boards of at most five units reach the engine's synergy API.
    function bonus(ids, field) {
      const board = ids.slice(0, 5).map((cardId, i) => ({ cardId, uid: 'preview-' + i }));
      if (!board.length) return 0;
      return engine.synergy({ board: board.concat(Array(5 - board.length).fill(null)) }, board[0], field);
    }
    function groups(slots, field) {
      const values = new Map();
      slots.forEach((id, index) => {
        const c = byId.get(id); if (!c) return;
        if (!values.has(c[field])) values.set(c[field], []);
        values.get(c[field]).push({ id, index, name: c.name });
      });
      return [...values].map(([value, members]) => ({ value, members, count: members.length, bonus: bonus(members.map(m => m.id), field) }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'fr'));
    }
    function candidate(slots, index, id) {
      const c = byId.get(id); if (!c || !Number.isInteger(index) || index < 0 || index > 9) return null;
      const base = slots.filter((_, i) => i !== index), next = slots.slice(); next[index] = id;
      const available = availability(id), copies = base.filter(other => other === id).length;
      const characterConflict = base.some(other => byId.get(other)?.characterId === c.characterId);
      const rainbow = c.element === 'RAINBOW' && base.some(other => byId.get(other)?.element === 'RAINBOW');
      const same = slots[index] === id;
      const allowed = !same && !characterConflict && copies < available.available && !rainbow;
      const reason = same ? 'D\u00e9j\u00e0 dans ce slot' : characterConflict ? 'Une seule carte par personnage' : rainbow ? 'Une seule Rainbow' : copies >= available.available ? 'Aucun exemplaire disponible' : '';
      const affinities = {};
      for (const field of ['faction', 'race']) {
        const members = base.flatMap(other => byId.get(other)?.[field] === c[field] ? [{ id: other, name: byId.get(other).name }] : []);
        const before = slots.filter(other => byId.get(other)?.[field] === c[field]);
        const after = members.map(m => m.id).concat(id);
        const potential = bonus(after, field);
        affinities[field] = { value: c[field], members, count: after.length, bonus: potential, delta: potential - bonus(before, field) };
      }
      const before = count(slots), after = count(next);
      return { id, allowed, reason, ...available, copies, affinities,
        coverage: before.flatMap((n, p) => n < 2 && after[p] > n ? [p + 1] : []),
        lostCoverage: before.flatMap((n, p) => n >= 2 && after[p] < 2 ? [p + 1] : []) };
    }
    return Object.freeze({ evaluate, groups, candidate, availability });
  }
  function create(options = {}) {
    const { data, engine, registry, userId, getDraft, onDraft, onPlay, onDetail, renderHeaderTools = () => '', toast = () => {} } = options;
    if (typeof getDraft !== 'function' || typeof onDraft !== 'function') throw new Error('getDraft et onDraft sont requis.');
    const model = createModel(options), byId = new Map(data.cards.map(c => [String(c.id), c]));
    let library, libraryError = '', root = null, selected = '', target = 0, previewId = null;
    let pendingDelete = false, working = new Map(), fileEpoch = 0, resizeObserver = null, busy = false, painting = false;
    let drag = null, dragFrame = 0, reorderFrom = null, reorderTo = null, suppressClickUntil = 0, announcement = '';
    let mountedWindow = null, mountedDocument = null;
    let affinityType = 'faction', affinityPage = 0, panel = 'board', managing = false, filtering = false;
    const histories = new Map();
    let comparison = null;
    let filters = { search: '', position: '', faction: '', race: '', element: '', weapon: '', synergy: '' };
    function normalize(value) {
      if (!value || typeof value.name !== 'string' || value.name.length > 50 || /[\x00-\x1f\x7f]/.test(value.name) || !Array.isArray(value.cards) || value.cards.length > 10)
        throw new Error('Brouillon de profil invalide.');
      const cards = Array.from(value.cards);
      if (cards.some(id => id !== null && (typeof id !== 'string' || !byId.has(id)))) throw new Error('Brouillon incompatible avec les cartes V4 connues.');
      return { name: value.name, cards: cards.concat(Array(10 - cards.length).fill(null)) };
    }
    let draft = normalize(getDraft());
    working.set('', clone(draft)); target = Math.max(0, draft.cards.indexOf(null));
    try {
      library = Library.create({ storage: options.storage || globalThis.localStorage, userId,
        knownIds: data.cards.map(c => String(c.id)), crypto: options.crypto || globalThis.crypto });
    } catch (error) { libraryError = error.message; }
    function savedDecks() {
      if (!library) return [];
      try { const list = library.list(); libraryError = ''; return list; }
      catch (error) { libraryError = error.message; return []; }
    }
    function emit() { working.set(selected, clone(draft)); onDraft(clone(draft)); }
    const editState = () => ({ cards: draft.cards.slice(), target, previewId });
    function history() {
      if (!histories.has(selected)) histories.set(selected, { undo: [], redo: [] });
      return histories.get(selected);
    }
    function remember(before) {
      const h = history(); h.undo.push(before); if (h.undo.length > 40) h.undo.shift(); h.redo = [];
    }
    function travel(direction) {
      if (busy || comparison) return;
      const h = history(), next = h[direction].at(-1); if (!next) return;
      const ids = next.cards.filter(Boolean), characters = ids.map(id => byId.get(id)?.characterId || id);
      const errors = errorsFrom(() => registry.deckErrors(userId, ids));
      if (errors.length || new Set(characters).size !== characters.length || ids.filter(id => byId.get(id)?.element === 'RAINBOW').length > 1) {
        toast(errors[0] || 'Cette composition n\u2019est plus disponible.'); return;
      }
      const before = editState();
      draft.cards = next.cards.slice(); target = next.target; previewId = next.previewId;
      try { emit(); }
      catch (error) { draft.cards = before.cards; target = before.target; previewId = before.previewId; working.set(selected, clone(draft)); toast(error.message); return; }
      h[direction].pop(); h[direction === 'undo' ? 'redo' : 'undo'].push(before);
      cancelReorder(); pendingDelete = false;
      announce(direction === 'undo' ? 'Modification annul\u00e9e.' : 'Modification r\u00e9tablie.');
      repaint({ action: direction });
    }
    function setDraft(next, id = selected) {
      cancelReorder();
      comparison = null;
      draft = normalize(next); selected = id; pendingDelete = false;
      target = Math.max(0, draft.cards.indexOf(null)); previewId = null; emit();
    }
    function visibleCandidates() {
      const search = filters.search.toLocaleLowerCase('fr').trim();
      const list = data.cards.map(c => ({ card: c, detail: model.candidate(draft.cards, target, c.id) })).filter(({ card: c, detail: d }) => {
        if (search && ![c.name, c.title, c.faction, c.race, c.id].join(' ').toLocaleLowerCase('fr').includes(search)) return false;
        if (filters.position && !c.positions.includes(Number(filters.position))) return false;
        if (['faction', 'race', 'element', 'weapon'].some(field => filters[field] && c[field] !== filters[field])) return false;
        const f = d.affinities.faction, r = d.affinities.race;
        if (filters.synergy === 'shared' && !f.members.length && !r.members.length) return false;
        if (filters.synergy === 'faction' && f.delta <= 0) return false;
        if (filters.synergy === 'race' && r.delta <= 0) return false;
        if (filters.synergy === 'coverage' && !d.coverage.length) return false;
        if (filters.synergy === 'available' && !d.allowed) return false;
        return true;
      });
      list.sort((a, b) => Number(b.detail.allowed) - Number(a.detail.allowed) ||
        b.detail.coverage.length - a.detail.coverage.length ||
        (b.detail.affinities.faction.delta + b.detail.affinities.race.delta) - (a.detail.affinities.faction.delta + a.detail.affinities.race.delta) || a.card.id.localeCompare(b.card.id));
      return { total: list.length, items: list };
    }
    const signed = n => (n >= 0 ? '+' : '') + n;
    function selectFilter(field, label, values) {
      return `<label>${label}<select data-deck-filter="${field}" aria-label="${label}"><option value="">Tous</option>${values.map(([value, title]) => `<option value="${esc(value)}" ${filters[field] === String(value) ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>`;
    }
    function filtersHTML() {
      const unique = field => [...new Set(data.cards.map(c => c[field]))].sort((a, b) => a.localeCompare(b, 'fr')).map(v => [v, field === 'element' ? data.elements?.[v]?.label || v : v]);
      return `<div class="kdb-filters" ${filtering ? '' : 'hidden'}>
        ${selectFilter('position', 'Poste', ROLES.map((r, i) => [String(i + 1), 'P' + (i + 1) + ' \u00b7 ' + r]))}
        ${selectFilter('faction', 'Faction', unique('faction'))}${selectFilter('race', 'Race', unique('race'))}
        ${selectFilter('element', 'Cristal', unique('element'))}${selectFilter('weapon', 'Arme', unique('weapon'))}
        ${selectFilter('synergy', 'Synergie', [['shared', 'Affinit\u00e9 partag\u00e9e'], ['faction', 'Gain de bonus faction'], ['race', 'Gain de bonus race'], ['coverage', 'Couverture manquante'], ['available', 'Disponible']])}
        ${button('reset-filters', 'filter-x', 'Effacer les filtres')}${button('filters', 'x', 'Fermer les filtres')}</div>`;
    }
    function groupHTML(field) {
      const groups = model.groups(draft.cards, field), attack = field === 'faction';
      const pages = Math.max(1, Math.ceil(groups.length / 4)); affinityPage = Math.min(affinityPage, pages - 1);
      return `<section class="kdb-affinity"><h3>${attack ? 'Liens offensifs' : 'Liens d\u00e9fensifs'}</h3><ul>${groups.slice(affinityPage * 4, affinityPage * 4 + 4).map(g => `<li data-affinity="${esc(g.value)}"><button type="button" data-deck-action="group-filter" data-field="${field}" data-value="${esc(g.value)}" title="Filtrer ${esc(g.value)}" aria-pressed="${filters[field] === g.value}">${icon(attack ? 'flag' : 'users-round')}<span><b>${esc(g.value)}</b><small>${g.count} carte${g.count > 1 ? 's' : ''}</small><span class="kdb-link-pips" aria-hidden="true">${Array.from({length:5}, (_, i) => `<i class="${i < g.count ? 'lit' : ''}"></i>`).join('')}</span></span><strong>${signed(g.bonus)}<small>${attack ? 'ATK' : 'DEF'}</small></strong></button></li>`).join('') || '<li class="kdb-muted">Aucune affinit\u00e9</li>'}</ul><nav class="kdb-affinity-pagination" aria-label="Pages de synergies">${button('affinity-previous', 'chevron-left', 'Synergies pr\u00e9c\u00e9dentes', affinityPage === 0 ? 'disabled' : '')}<span>${affinityPage + 1} / ${pages}</span>${button('affinity-next', 'chevron-right', 'Synergies suivantes', affinityPage === pages - 1 ? 'disabled' : '')}</nav></section>`;
    }
    function linksHTML() {
      const active = byId.get(previewId || draft.cards[target])?.[affinityType];
      return model.groups(draft.cards, affinityType).flatMap(g => g.members.slice(1).map((m, i) => {
        const a = g.members[i].index, b = m.index;
        return `<line x1="${a % 5 * 20 + 10}" y1="${a < 5 ? 25 : 75}" x2="${b % 5 * 20 + 10}" y2="${b < 5 ? 25 : 75}" class="${g.value === active ? 'active' : ''}" vector-effect="non-scaling-stroke"/>`;
      })).join('');
    }
    function highlightLinks() {
      if (!root) return;
      const value = byId.get(previewId || draft.cards[target])?.[affinityType], svg = root.querySelector('.kdb-links');
      if (svg) svg.innerHTML = linksHTML();
      root.querySelectorAll('[data-deck-slot]').forEach(n => n.classList.toggle('is-affinity', !!value && byId.get(draft.cards[Number(n.dataset.deckSlot)])?.[affinityType] === value));
      root.querySelectorAll('[data-affinity]').forEach(n => n.classList.toggle('is-active', n.dataset.affinity === value));
    }
    function updateRecruitmentRail() {
      const rail = root?.querySelector('.kdb-candidates');
      if (!rail) return;
      const canScroll = rail.scrollWidth > rail.clientWidth + 2;
      rail.classList.toggle('has-overflow', canScroll);
      rail.classList.toggle('can-scroll-left', rail.scrollLeft > 2);
      rail.classList.toggle('can-scroll-right', rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2);
      const left = root.querySelector('[data-deck-action=rail-left]'), right = root.querySelector('[data-deck-action=rail-right]');
      if (left) left.disabled = !canScroll || rail.scrollLeft <= 2;
      if (right) right.disabled = !canScroll || rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
    }
    function bindRecruitmentRail() {
      root?.querySelector('.kdb-candidates')?.addEventListener('scroll', updateRecruitmentRail, { passive: true });
    }
    function scrollRecruitmentRail(direction) {
      const rail = root?.querySelector('.kdb-candidates');
      if (!rail) return;
      rail.scrollBy({ left: direction * Math.max(rail.clientWidth * .82, 160), behavior: mountedWindow?.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    function previewHTML() {
      const c = byId.get(previewId) || byId.get(draft.cards[target]) || byId.get(visibleCandidates().items[0]?.card.id);
      if (!c) return '<div class="kdb-preview-empty">Aucune carte</div>';
      const d = model.candidate(draft.cards, target, c.id);
      return `<div class="kdb-preview-heading"><h2>${esc(c.name)}</h2>${button('detail', 'scan-eye', 'D\u00e9tails de ' + c.name, `data-id="${c.id}" ${onDetail ? '' : 'disabled'}`)}</div>
        <img class="kdb-preview-image" src="${image(c)}" alt="Carte compl\u00e8te ${esc(c.name)} : ${esc(c.title)}">
        <p class="kdb-preview-title">${esc(c.title)}</p><p class="kdb-muted">${c.positions.map(p => 'P' + p).join(' / ')} \u00b7 ${esc(c.weapon)}</p>
        <p class="kdb-owned">${d.available} disponible${d.available === 1 ? '' : 's'} / ${d.owned} poss\u00e9d\u00e9${d.owned === 1 ? '' : 's'}</p>
        <div class="kdb-preview-affinities">${['faction', 'race'].map(field => {
          const a = d.affinities[field], stat = field === 'faction' ? 'ATK' : 'DEF';
          return `<div title="${esc(a.members.map(m => m.name).join(', '))}"><strong>${esc(a.value)} <em>${signed(a.delta)} ${stat}</em></strong><small>Potentiel ${signed(a.bonus)} \u00b7 ${a.count} carte${a.count === 1 ? '' : 's'}</small></div>`;
        }).join('')}</div><p class="kdb-muted">${d.allowed ? 'Si remplacement du slot ' : 'Slot '}${target + 1} \u00b7 potentiel plateau 5</p>
        ${d.coverage.length ? `<p class="kdb-positive">Couverture + ${d.coverage.map(p => 'P' + p).join(', ')}</p>` : ''}
        ${d.lostCoverage.length ? `<p class="kdb-warning">Couverture perdue : ${d.lostCoverage.map(p => 'P' + p).join(', ')}</p>` : ''}`;
    }
    function candidateHTML({ card: c, detail: d }, index = 0) {
      const f = d.affinities.faction, r = d.affinities.race;
      return `<article class="kdb-candidate ${d.allowed ? '' : 'is-unavailable'}" data-deck-preview="${c.id}"><button type="button" class="kdb-candidate-image" data-deck-action="preview" data-deck-recruit="${c.id}" data-id="${c.id}" title="${esc(c.name+' : '+c.title)}" aria-label="Aper\u00e7u de ${esc(c.name)}"><img src="${image(c)}" alt="${esc(c.name)}" loading="${index<10?'eager':'lazy'}" decoding="async" draggable="false"></button>
        <div class="kdb-candidate-info"><b>${esc(c.name)}</b><span>${c.positions.map(p => 'P' + p).join('/')}</span>
        <span class="kdb-candidate-gain" title="Variation de potentiel au slot ${target+1}">${icon('sword')}${signed(f.delta)} ${icon('shield')}${signed(r.delta)}</span>
        <div class="kdb-candidate-controls"><span>${d.copies}/${d.available}</span>${button('add', draft.cards[target] ? 'replace' : 'plus', d.allowed ? (draft.cards[target] ? 'Remplacer le slot ' : 'Ajouter au slot ') + (target + 1) + ' : ' + c.name : d.reason, `data-id="${c.id}" ${d.allowed && !busy ? '' : 'disabled'}`)}</div></div></article>`;
    }
    function comparisonHTML() {
      if (!comparison) return '';
      const old = byId.get(comparison.outgoing), next = byId.get(comparison.id), detail = model.candidate(draft.cards, comparison.index, next.id);
      const face = (c, field, i) => {
        const value = c[field][i], magical = (field === 'atk' ? c.magic : c.barriers).includes(6-i);
        const label = ({guard:'Garde',retry:'Tr\u00e8fle',mana:'Potion',revive:'Reraise',death:'Mort',dodge:'Esquive',buff_atk:'Puissance physique'})[value] || value;
        return `<td class="${magical?'is-magic':''}" title="${magical?field==='atk'?'Magique':'Barri\u00e8re magique':'Physique'}">${typeof value === 'number'?`${magical?icon('sparkles'):''}${value}`:`<img src="${globalThis.KalistarCollaborations.asset('effets',value)}" alt="${esc(label)}">`}</td>`;
      };
      const after = draft.cards.slice(); after[comparison.index] = next.id;
      const gains = ['faction','race'].flatMap(field => {
        const beforeGroups = model.groups(draft.cards,field), afterGroups = model.groups(after,field);
        return [...new Set([old[field],next[field]])].flatMap(value => {
          const before = beforeGroups.find(g=>g.value===value)?.bonus||0, bonus = afterGroups.find(g=>g.value===value)?.bonus||0;
          return bonus===before?[]:[`<span class="${bonus>before?'kdb-positive':'kdb-warning'}">${icon(field==='faction'?'sword':'shield')}${esc(value)} ${signed(bonus-before)}</span>`];
        });
      });
      return `<dialog class="kdb-compare" aria-labelledby="kdb-compare-title"><header><h2 id="kdb-compare-title">Remplacement · Slot ${comparison.index+1}</h2>${button('cancel-replace','x','Annuler le remplacement','autofocus')}</header><div class="kdb-compare-body"><div class="kdb-compare-cards">${[old,next].map((c,i)=>`<figure><small>${i?'Entrante':'Sortante'}</small><img src="${image(c)}" alt="${esc(c.name+' : '+c.title)}"><figcaption><b>${esc(c.name)}</b><span>${esc(c.title)}</span><small>${c.positions.map(p=>'P'+p).join(' · ')} · ${esc(c.weapon)}</small></figcaption></figure>`).join('')}</div><table class="kdb-compare-faces"><caption>Faces ATK / DEF</caption><thead><tr><th colspan="2">${esc(old.name)}</th><th>Dé</th><th colspan="2">${esc(next.name)}</th></tr><tr><th>${icon('sword')}ATK</th><th>${icon('shield')}DEF</th><th></th><th>${icon('sword')}ATK</th><th>${icon('shield')}DEF</th></tr></thead><tbody>${[6,5,4,3,2,1].map((die,i)=>`<tr>${face(old,'atk',i)}${face(old,'defense',i)}<th>${die}</th>${face(next,'atk',i)}${face(next,'defense',i)}</tr>`).join('')}</tbody></table><div class="kdb-compare-gains"><h3>Variation du potentiel de synergie</h3>${gains.join('')||'<span>Inchangé</span>'}${detail.lostCoverage.length?`<p class="kdb-warning">Couverture perdue : ${detail.lostCoverage.map(p=>'P'+p).join(', ')}</p>`:''}${detail.coverage.length?`<p class="kdb-positive">Couverture renforcée : ${detail.coverage.map(p=>'P'+p).join(', ')}</p>`:''}</div></div><footer><button type="button" data-deck-action="cancel-replace">Annuler</button><button type="button" data-deck-action="confirm-replace" ${detail.allowed?'':'disabled'}>${icon('replace')}Remplacer</button></footer></dialog>`;
    }
    function targetHTML() {
      const c = byId.get(draft.cards[target]);
      return `<div class="kdb-target" aria-label="Emplacement ciblé">${c?`<img src="${image(c)}" alt="">`:icon('plus')}<span><small>Slot ${target+1} · ${c?'Remplacement':'Libre'}</small><b>${c?esc(c.name):'Nouvelle carte'}</b></span>${button('target-previous','chevron-left','Emplacement précédent',target===0?'disabled':'')}${button('target-next','chevron-right','Emplacement suivant',target===9?'disabled':'')}</div>`;
    }
    function render() {
      const saved = savedDecks(), state = model.evaluate(draft.cards), list = visibleCandidates();
      const entry = saved.find(d => d.id === selected), dirty = !entry || JSON.stringify(clone(entry)) !== JSON.stringify(draft);
      const locked = libraryError || !library || busy;
      const profile = userId === 'user-paris' ? 'Paris' : userId === 'user-tokyo' ? 'Tokyo' : userId;
      return `<section class="kdb-page ${managing ? 'is-managing' : ''} ${filtering ? 'is-filtering' : ''}" data-panel="${panel}" aria-label="Composition du deck" ${busy ? 'aria-busy="true"' : ''}>
        <header class="kdb-heading"><div class="kdb-heading-title"><span class="kdb-eyebrow">KALISTAR · ${esc(profile)}</span><h1>Escouade</h1></div>
        <div class="kdb-deck-picker">${button('deck-previous','chevron-left','Deck précédent', !saved.length || busy ? 'disabled' : '')}<select data-deck-action="select" aria-label="Deck sauvegardé" ${busy ? 'disabled' : ''}><option value="">Brouillon du profil</option>${saved.map(d => `<option value="${d.id}" ${selected === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>${button('deck-next','chevron-right','Deck suivant', !saved.length || busy ? 'disabled' : '')}</div>
        <label class="kdb-name-label"><span class="kdb-sr-only">Nom du deck</span><input data-deck-action="name" aria-label="Nom du deck" maxlength="50" value="${esc(draft.name)}" autocomplete="off" ${busy ? 'disabled' : ''}></label>
        ${renderHeaderTools()}
        <div class="kdb-heading-state"><span class="kdb-badge ${state.playable ? 'is-ready' : ''}">${state.playable ? 'Prêt' : 'Brouillon'}</span><strong>${state.count}<small>/10</small></strong></div>
        ${button('save','save', selected ? 'Enregistrer les modifications' : 'Sauvegarder le deck', locked || !selected && saved.length >= 10 ? 'disabled' : '')}${button('manage','settings-2','Gestion des decks', `aria-expanded="${managing}"`)}<button type="button" class="kdb-play" data-deck-action="play" ${state.playable && onPlay && !busy ? '' : 'disabled'}>${icon('swords')}<span>Jouer</span></button></header>
        <div class="kdb-library-bar" ${managing ? '' : 'hidden'}><div class="kdb-menu-heading"><b>${saved.length}/10 decks</b><span class="kdb-save-state" data-deck-save-state>${dirty ? 'Non enregistré' : 'Enregistré'}</span>${button('manage','x','Fermer la gestion')}</div><div class="kdb-library-actions">${button('duplicate','copy','Dupliquer le deck courant',locked || saved.length >= 10 ? 'disabled' : '')}${button('new','file-plus-2','Nouveau brouillon',busy ? 'disabled' : '')}${button('delete','trash-2','Supprimer le deck sauvegardé',locked || !selected ? 'disabled' : '')}${button('export','download','Exporter la bibliothèque JSON',locked || !saved.length ? 'disabled' : '')}${button('import','upload','Importer une bibliothèque JSON',locked ? 'disabled' : '')}</div></div><input type="file" accept="application/json,.json" data-deck-file hidden>
        ${libraryError ? `<p class="kdb-storage-error" role="alert">Bibliothèque : ${esc(libraryError)}</p>` : ''}
        ${pendingDelete ? `<div class="kdb-delete-confirm" role="group" aria-label="Confirmer la suppression"><span>Supprimer ${esc(entry?.name)} ?</span>${button('confirm-delete','check','Confirmer la suppression')}${button('cancel-delete','x','Annuler la suppression')}</div>` : ''}
        <nav class="kdb-mobile-nav" role="tablist" aria-label="Vues de composition">${[['board','Composition','layout-grid'],['recruit','Recruter','user-plus'],['synergy','Synergies','git-branch'],['inspect','Carte','scan-eye']].map(([id,label,symbol]) => `<button data-deck-action="panel" data-id="${id}" role="tab" aria-selected="${panel === id}" aria-controls="kdb-panel-${id}" tabindex="${panel === id ? 0 : -1}">${icon(symbol)}${label}</button>`).join('')}</nav>
        <div class="kdb-workbench"><aside class="kdb-affinities" id="kdb-panel-synergy" aria-label="Synergies du deck"><div class="kdb-band-heading"><h2>Synergies</h2>${icon('git-branch')}</div><div class="kdb-affinity-tabs" role="group" aria-label="Type de synergie">${[['faction','Factions','flag'],['race','Races','users-round']].map(([id,label,symbol])=>`<button data-deck-action="affinity-type" data-id="${id}" aria-pressed="${affinityType === id}">${icon(symbol)}${label}</button>`).join('')}</div>${groupHTML(affinityType)}<p class="kdb-synergy-note">Potentiel · 5 cartes sur le plateau</p></aside>
        <section class="kdb-composition" id="kdb-panel-board" aria-label="Dix emplacements du deck"><div class="kdb-band-heading"><h2>Composition</h2><div class="kdb-edit-tools">${button('undo','undo-2','Annuler la modification',history().undo.length&&!busy?'':'disabled')}${button('redo','redo-2','Rétablir la modification',history().redo.length&&!busy?'':'disabled')}<small>Slot ${target + 1}</small></div></div>
        <div class="kdb-slots"><svg class="kdb-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${linksHTML()}</svg>${draft.cards.map((id, i) => {
          const c = byId.get(id), unavailable = c && draft.cards.filter(other => other === id).length > model.availability(id).available;
          return `<div class="kdb-slot ${i === target ? 'is-selected' : ''} ${unavailable ? 'is-unavailable' : ''}" data-deck-slot="${i}" ${c ? `data-deck-preview="${id}"` : ''}><div class="kdb-slot-top"><span>${String(i + 1).padStart(2, '0')}</span>${button('reorder', 'grip-vertical', '\u00c9changer le slot ' + (i + 1) + (c ? ' : ' + c.name : ' vide'), `data-slot="${i}" aria-pressed="${reorderFrom === i}" ${busy ? 'disabled' : ''}`)}${c ? button('remove', 'x', 'Retirer ' + c.name + ' du slot ' + (i + 1), `data-slot="${i}" ${busy ? 'disabled' : ''}`) : '<span class="kdb-empty-tool"></span>'}</div>
          <button type="button" class="kdb-slot-image" data-deck-action="slot" data-slot="${i}" aria-pressed="${i === target}" aria-label="Slot ${i + 1}${c ? ' : ' + esc(c.name) : ' vide'}" ${busy ? 'disabled' : ''}>${c ? `<img src="${image(c)}" alt="${esc(c.name)}" draggable="false">` : `${icon('plus')}<span>Vide</span>`}</button><span class="kdb-slot-label" title="${c ? esc(c.name) : 'Slot libre'}">${unavailable ? 'Indisponible' : c ? esc(c.name) : 'Libre'}</span></div>`;
        }).join('')}</div>

        <p class="kdb-reorder-status" data-deck-reorder-status role="status" aria-live="polite" aria-atomic="true">${esc(announcement)}</p>
        <div class="kdb-coverage" aria-label="Compatibilité par poste">${state.coverage.map((n,p)=>`<button type="button" data-deck-action="position-filter" data-id="${p+1}" class="${n < 2 ? 'is-missing' : ''}" title="P${p+1} ${ROLES[p]} : ${n} compatibles, 2 requis"><b>${icon(['shield','sword','compass','sparkles','heart-pulse'][p])}P${p+1}<span>${n}/2</span></b><small>${ROLES[p]}</small></button>`).join('')}</div>
        <div class="kdb-validation" role="status"><span class="${state.playable ? 'kdb-positive' : 'kdb-warning'}" title="${esc(state.errors.join(' '))}">${state.playable ? 'Formation P1–P5 possible' : state.count<10?`${10-state.count} carte${state.count<9?'s':''} à recruter` : esc(state.errors[0]||'Formation incomplète')}</span></div></section>
        <aside class="kdb-preview" id="kdb-panel-inspect" aria-label="Aperçu de carte"><div class="kdb-preview-content" data-deck-preview-panel>${previewHTML()}</div></aside>
        <section class="kdb-browser" aria-label="Cartes candidates">
          <div class="kdb-band-heading"><h2>Recrutement <small>${list.total}</small></h2><div class="kdb-recruit-tools">
            <label class="kdb-search"><span class="kdb-sr-only">Recherche</span><input type="search" data-deck-filter="search" aria-label="Recherche de cartes" value="${esc(filters.search)}" placeholder="Rechercher" autocomplete="off"></label>
            ${button('filters','sliders-horizontal','Filtres de recrutement',`aria-expanded="${filtering}"`)}${Object.values(filters).some(Boolean)?button('reset-filters','filter-x','Effacer les filtres'):''}
            <span class="kdb-rail-controls" role="group" aria-label="Faire défiler les cartes">${button('rail-left','chevron-left','Faire défiler vers la gauche','disabled')}${button('rail-right','chevron-right','Faire défiler vers la droite','disabled')}</span>
          </div></div>${filtersHTML()}${targetHTML()}<div class="kdb-candidates" tabindex="0" aria-label="Cartes disponibles, faites défiler horizontalement">${list.items.map(candidateHTML).join('') || '<p class="kdb-empty-results">Aucune carte pour ces filtres.</p>'}</div></section></div>${comparisonHTML()}</section>`;
    }
    function icons(node) { globalThis.lucide?.createIcons({ root: node }); }
    function repaint(focus) {
      if (!root || painting) return;
      cancelPointer();
      const active = root.ownerDocument.activeElement;
      const descriptor = focus || (active && root.contains(active) ? { action: active.dataset.deckAction, filter: active.dataset.deckFilter, id: active.dataset.id, slot: active.dataset.slot, start: active.selectionStart, end: active.selectionEnd } : null);
      // Removing the focused input can synchronously fire change in Chromium.
      painting = true;
      try {
        root.innerHTML = render(); icons(root); markReorder(); highlightLinks(); bindRecruitmentRail(); updateRecruitmentRail();
        root.querySelector('.kdb-browser').id = 'kdb-panel-recruit';
        const dialog = root.querySelector('.kdb-compare'); dialog?.showModal();
        if (dialog) return;
        if (!descriptor) return;
        const next = [...root.querySelectorAll('button,input,select')].find(n => descriptor.filter ? n.dataset.deckFilter === descriptor.filter : descriptor.action && n.dataset.deckAction === descriptor.action && (descriptor.id === undefined || n.dataset.id === descriptor.id) && (descriptor.slot === undefined || n.dataset.slot === descriptor.slot));
        if (next && !next.disabled) { next.focus({ preventScroll: true }); if (descriptor.start !== null && descriptor.start !== undefined && next.type === 'search') next.setSelectionRange(descriptor.start, descriptor.end); }
        else { const stage = root.querySelector('.kdb-page'); stage.tabIndex = -1; stage.focus({ preventScroll: true }); }
      } finally { painting = false; }
    }
    function showPreview(id) {
      if (!byId.has(id) || previewId === id) return;
      previewId = id;
      const panel = root?.querySelector('[data-deck-preview-panel]');
      if (panel) { panel.innerHTML = previewHTML(); icons(panel); } highlightLinks();
    }
    function announce(message) {
      announcement = message;
      const node = root?.querySelector('[data-deck-reorder-status]'); if (node) node.textContent = message;
    }
    function markReorder() {
      if (!root) return;
      const source = drag?.active ? drag.from : reorderFrom, destination = drag?.active ? drag.to : reorderTo;
      root.querySelector('.kdb-slots')?.classList.toggle('is-reordering', source !== null || !!drag?.active);
      root.querySelectorAll('[data-deck-slot]').forEach(node => {
        const index = Number(node.dataset.deckSlot);
        node.classList.toggle('is-reorder-source', source === index);
        node.classList.toggle('is-pointer-source', !!drag?.active && source === index);
        node.classList.toggle('is-drop-target', destination === index && destination !== source);
        const eligible = !!drag?.active && !!drag.recruit && model.candidate(draft.cards, index, drag.recruit)?.allowed;
        node.classList.toggle('is-drop-eligible', eligible);
        node.classList.toggle('is-drop-blocked', !!drag?.active && !!drag.recruit && !eligible);
        node.querySelector('[data-deck-action=reorder]')?.setAttribute('aria-pressed', String(source === index));
      });
    }
    function cancelPointer() {
      const current = drag; drag = null;
      if (dragFrame && mountedWindow) mountedWindow.cancelAnimationFrame(dragFrame);
      dragFrame = 0;
      if (current) {
        current.ghost?.remove();
        try { if (current.node.hasPointerCapture(current.pointer)) current.node.releasePointerCapture(current.pointer); } catch { /* Detached pointers are already cancelled. */ }
      }
      markReorder();
    }
    function cancelReorder(message = '') {
      reorderFrom = null; reorderTo = null; cancelPointer();
      if (message) announce(message);
    }
    function swapSlots(from, to) {
      if (busy || painting || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 9 || to < 0 || to > 9 || from === to) return;
      const before = clone(draft), oldTarget = target, oldPreview = previewId, undo = editState();
      if (before.cards[from] === before.cards[to]) return;
      const next = clone(draft); [next.cards[from], next.cards[to]] = [next.cards[to], next.cards[from]];
      draft = next; target = to; previewId = next.cards[to]; pendingDelete = false;
      try { emit(); }
      catch (error) { draft = before; target = oldTarget; previewId = oldPreview; working.set(selected, clone(before)); toast(error.message); repaint(); return; }
      remember(undo);
      announce('Slots ' + (from + 1) + ' et ' + (to + 1) + ' \u00e9chang\u00e9s.');
      repaint({ action: 'slot', slot: String(to) });
    }
    function recruitTo(id, index, advance = false, confirmed = false) {
      const candidate = model.candidate(draft.cards, index, id);
      if (busy || !candidate?.allowed) { toast(candidate?.reason || 'Carte indisponible.'); return; }
      if (draft.cards[index] && !confirmed) {
        comparison = { id, index, advance, outgoing: draft.cards[index], deck: selected }; repaint(); return;
      }
      const before = clone(draft), oldTarget = target, oldPreview = previewId, undo = editState();
      draft = clone(draft); draft.cards[index] = id; target = index; previewId = id; pendingDelete = false;
      if (advance) { const empty = draft.cards.indexOf(null); if (empty >= 0) target = empty; }
      try { emit(); }
      catch (error) { draft = before; target = oldTarget; previewId = oldPreview; working.set(selected, clone(before)); toast(error.message); repaint(); return; }
      remember(undo);
      announce(byId.get(id).name + ' rejoint le slot ' + (index + 1) + '.');
      repaint({ action: 'slot', slot: String(target) });
    }
    function hitSlot(x, y) {
      const node = mountedDocument?.elementFromPoint(x, y)?.closest('[data-deck-slot]');
      return node && root?.contains(node) ? Number(node.dataset.deckSlot) : null;
    }
    function moveGhost() {
      if (!drag?.active || !mountedWindow) return;
      const width = drag.ghost.getBoundingClientRect().width, height = drag.ghost.getBoundingClientRect().height;
      const x = Math.max(4, Math.min(drag.x + 16, mountedWindow.innerWidth - width - 4));
      const y = Math.max(4, Math.min(drag.y + 16, mountedWindow.innerHeight - height - 4));
      drag.ghost.style.transform = `translate(${x}px,${y}px)`;
      drag.to = hitSlot(drag.x, drag.y); markReorder();
    }
    function dragTick() {
      dragFrame = 0;
      if (!drag?.active || !mountedWindow) return;
      moveGhost(); dragFrame = mountedWindow.requestAnimationFrame(dragTick);
    }
    function pointerDown(event) {
      if (event.button !== 0 || !event.isPrimary || busy || painting || drag) return;
      const node = event.target.closest('[data-deck-action=slot],[data-deck-action=reorder],[data-deck-recruit]');
      if (!node || !root?.contains(node) || node.disabled) return;
      if (event.pointerType === 'touch' && node.dataset.deckRecruit) return;
      suppressClickUntil = 0;
      // A captured pointer stages an exchange; the draft changes only on a valid drop.
      drag = { node, pointer: event.pointerId, recruit: node.dataset.deckRecruit || null, from: node.dataset.deckRecruit ? null : Number(node.dataset.slot), to: null, active: false,
        x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, cards: draft.cards.slice() };
      try { node.setPointerCapture(event.pointerId); } catch { cancelPointer(); }
    }
    function pointerMove(event) {
      if (!drag || event.pointerId !== drag.pointer) return;
      drag.x = event.clientX; drag.y = event.clientY;
      if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 8) {
        reorderFrom = null; reorderTo = null; drag.active = true;
        if (drag.recruit && panel !== 'board') {
          panel = 'board'; root.querySelector('.kdb-page').dataset.panel = panel;
          root.querySelectorAll('[data-deck-action=panel]').forEach(n => { n.setAttribute('aria-selected', String(n.dataset.id === panel)); n.tabIndex = n.dataset.id === panel ? 0 : -1; });
        }
        const ghost = mountedDocument.createElement('div'), c = byId.get(drag.recruit || draft.cards[drag.from]);
        ghost.className = 'kdb-drag-ghost'; ghost.setAttribute('aria-hidden', 'true');
        ghost.style.width = Math.min(130, drag.recruit ? 100 : root.querySelector(`[data-deck-slot="${drag.from}"]`).getBoundingClientRect().width) + 'px';
        if (c) { const img = mountedDocument.createElement('img'); img.src = image(c); img.alt = ''; img.draggable = false; ghost.append(img); }
        else ghost.textContent = 'Vide';
        root.querySelector('.kdb-page').append(ghost); drag.ghost = ghost;
        announce(drag.recruit ? c.name + ' en recrutement.' : 'Slot ' + (drag.from + 1) + ' en d\u00e9placement.');
        dragFrame = mountedWindow.requestAnimationFrame(dragTick);
      }
      if (drag.active) { event.preventDefault(); event.stopPropagation(); moveGhost(); }
    }
    function pointerUp(event) {
      if (!drag || event.pointerId !== drag.pointer) return;
      const current = drag, destination = current.active ? hitSlot(event.clientX, event.clientY) : null;
      if (current.active) {
        event.preventDefault(); event.stopPropagation(); suppressClickUntil = Date.now() + 500;
      }
      cancelPointer();
      if (!current.active) return;
      if (destination !== null && current.cards.every((id, i) => draft.cards[i] === id)) {
        if (current.recruit) recruitTo(current.recruit, destination);
        else swapSlots(current.from, destination);
      }
      else announce('D\u00e9placement annul\u00e9.');
    }
    function pointerCancel(event) {
      if (!drag || event && event.pointerId !== drag.pointer) return;
      suppressClickUntil = Date.now() + 500; cancelReorder('D\u00e9placement annul\u00e9.');
    }
    function interrupt() {
      if (drag || reorderFrom !== null) { suppressClickUntil = Date.now() + 500; cancelReorder('D\u00e9placement annul\u00e9.'); }
    }
    function secondaryPointer(event) {
      if (drag && event.pointerId !== drag.pointer) interrupt();
      else if (!drag && event.isPrimary) suppressClickUntil = 0;
    }
    function suppressClick(event) {
      if (event.detail && Date.now() < suppressClickUntil) { suppressClickUntil = 0; event.preventDefault(); event.stopImmediatePropagation(); }
    }
    function railWheel(event) {
      const rail = event.target.closest('.kdb-candidates');
      if (!rail || rail.scrollWidth <= rail.clientWidth + 2 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault(); rail.scrollBy({ left: event.deltaY, behavior: 'auto' });
    }
    function nativeDrag(event) { if (event.target.closest('[data-deck-slot],[data-deck-recruit]')) event.preventDefault(); }
    function reorderKey(event) {
      if (busy || painting) return;
      if (comparison) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeComparison(); } return; }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.target.closest('input,textarea,select,[contenteditable=true]') && ['z','y'].includes(event.key.toLowerCase())) {
        event.preventDefault(); event.stopPropagation(); travel(event.key.toLowerCase()==='y'||event.shiftKey?'redo':'undo'); return;
      }
      if (event.key === 'Escape' && (drag || reorderFrom !== null)) { event.preventDefault(); event.stopPropagation(); interrupt(); return; }
      if (event.key === 'Escape' && (managing || filtering)) { event.preventDefault(); managing = filtering = pendingDelete = false; repaint(); return; }
      if (event.target.matches('[data-deck-action=panel]') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
        const panels = ['board','recruit','synergy','inspect'], i = panels.indexOf(panel);
        panel = panels[event.key === 'Home' ? 0 : event.key === 'End' ? panels.length-1 : (i + (event.key === 'ArrowRight' ? 1 : panels.length-1)) % panels.length];
        event.preventDefault(); repaint({action:'panel',id:panel}); return;
      }
      if (event.target.matches('.kdb-candidates') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
        const rail = event.target, end = rail.scrollWidth - rail.clientWidth;
        event.preventDefault();
        rail.scrollTo({ left: event.key === 'Home' ? 0 : event.key === 'End' ? end : rail.scrollLeft + (event.key === 'ArrowRight' ? 1 : -1) * Math.max(rail.clientWidth * .25, 90), behavior: mountedWindow?.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        return;
      }
      if (reorderFrom === null) return;
      if (event.key === 'Tab') { cancelReorder(); return; }
      const index = reorderTo ?? reorderFrom;
      let next = index;
      if (event.key === 'ArrowLeft' && index % 5 > 0) next--;
      else if (event.key === 'ArrowRight' && index % 5 < 4) next++;
      else if (event.key === 'ArrowUp' && index >= 5) next -= 5;
      else if (event.key === 'ArrowDown' && index < 5) next += 5;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = 9;
      else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); event.stopPropagation();
        const from = reorderFrom; cancelReorder(); swapSlots(from, index); return;
      } else if (!event.key.startsWith('Arrow')) return;
      event.preventDefault(); event.stopPropagation(); reorderTo = next; markReorder();
      const node = root.querySelector(`[data-deck-action="slot"][data-slot="${next}"]`);
      node?.focus({ preventScroll: true }); node?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      announce('Slot ' + (reorderFrom + 1) + ' vers slot ' + (next + 1) + '.');
    }
    function focusOut(event) {
      if (!painting && reorderFrom !== null && event.relatedTarget && !root?.contains(event.relatedTarget)) cancelReorder();
    }
    function saveCurrent(asCopy = false) {
      if (!library || libraryError) throw new Error(libraryError || 'Stockage indisponible.');
      const value = clone(draft);
      if (asCopy) value.name = value.name.slice(0, 42) + ' (copie)';
      else if (selected) value.id = selected;
      const edits = history(), result = library.save(value); setDraft(result, result.id);
      histories.set(result.id, { undo: edits.undo.slice(), redo: edits.redo.slice() }); toast('Deck enregistr\u00e9.');
    }
    function closeComparison() {
      const pending = comparison; comparison = null;
      repaint(pending ? { action: 'add', id: pending.id } : undefined);
    }
    async function click(event) {
      if (event.target.matches('.kdb-compare')) { event.stopPropagation(); closeComparison(); return; }
      const control = event.target.closest('[data-deck-action]');
      if (!control || !root?.contains(control) || control.tagName !== 'BUTTON') return;
      event.stopPropagation(); if (control.disabled || busy || painting) return;
      const action = control.dataset.deckAction, id = control.dataset.id;
      try {
        if (action === 'cancel-replace') { closeComparison(); return; }
        if (action === 'confirm-replace' && comparison) {
          const pending = comparison; comparison = null;
          if (selected !== pending.deck || draft.cards[pending.index] !== pending.outgoing) { toast('La composition a changé.'); repaint(); return; }
          recruitTo(pending.id, pending.index, pending.advance, true); repaint({action:'slot',slot:String(target)}); return;
        }
        if (comparison) return;
        if (action === 'undo' || action === 'redo') { travel(action); return; }
        if (action === 'reorder') {
          const index = Number(control.dataset.slot), from = reorderFrom;
          cancelReorder();
          if (from !== null && from !== index) swapSlots(from, index);
          else if (from === null) { reorderFrom = index; reorderTo = index; markReorder(); announce('Slot ' + (index + 1) + ' s\u00e9lectionn\u00e9 pour \u00e9change.'); }
          return;
        }
        if (action === 'slot' && reorderFrom !== null) { const from = reorderFrom; cancelReorder(); swapSlots(from, Number(control.dataset.slot)); return; }
        cancelReorder();
        if (action === 'preview') {
          showPreview(id);
          if (root.getBoundingClientRect().width <= 900) { panel = 'inspect'; repaint({action:'panel',id:panel}); }
          return;
        }
        if (action === 'detail') { onDetail?.(id); return; }
        if (action === 'manage') { managing = !managing; filtering = false; }
        if (action === 'filters') { filtering = !filtering; managing = false; }
        if (action === 'panel') { panel = id; filtering = managing = false; }
        if (action === 'affinity-type') { affinityType = id === 'race' ? 'race' : 'faction'; affinityPage = 0; }
        if (action === 'affinity-previous') affinityPage = Math.max(0, affinityPage - 1);
        if (action === 'affinity-next') affinityPage++;
        if (action === 'rail-left' || action === 'rail-right') { scrollRecruitmentRail(action === 'rail-left' ? -1 : 1); return; }
        if (action === 'position-filter') { filters.position = filters.position === id ? '' : id; }
        if (action === 'deck-previous' || action === 'deck-next') {
          const ids = ['', ...savedDecks().map(d=>d.id)], at = ids.indexOf(selected), nextId = ids[(at + (action === 'deck-next' ? 1 : ids.length - 1)) % ids.length];
          working.set(selected, clone(draft)); setDraft(working.get(nextId) || library.get(nextId), nextId);
        }
        if (action === 'slot' || action === 'target-previous' || action === 'target-next') { target = action==='slot'?Number(control.dataset.slot):Math.max(0,Math.min(9,target+(action==='target-next'?1:-1))); previewId = draft.cards[target]; }
        if (action === 'slot' && mountedWindow?.matchMedia('(max-width:900px) and (max-height:700px)').matches) panel='recruit';
        if (action === 'remove') {
          const before = editState(); target = Number(control.dataset.slot); draft.cards = draft.cards.slice(); draft.cards[target] = null; pendingDelete = false; previewId = null;
          try { emit(); remember(before); }
          catch (error) { draft.cards = before.cards; target = before.target; previewId = before.previewId; working.set(selected, clone(draft)); throw error; }
        }
        if (action === 'add') {
          recruitTo(id, target, true); return;
        }
        if (action === 'save' || action === 'duplicate') saveCurrent(action === 'duplicate');
        if (action === 'new') { working.set(selected, clone(draft)); histories.delete(''); setDraft({ name: 'Nouveau deck', cards: Array(10).fill(null) }, ''); }
        if (action === 'delete') pendingDelete = true;
        if (action === 'cancel-delete') pendingDelete = false;
        if (action === 'confirm-delete' && pendingDelete && selected) {
          library.remove(selected); histories.delete(selected); histories.delete(''); working.delete(selected); selected = ''; pendingDelete = false; emit(); toast('Deck supprim\u00e9. Composition conserv\u00e9e en brouillon.');
        }
        if (action === 'group-filter') { filters[control.dataset.field] = filters[control.dataset.field] === control.dataset.value ? '' : control.dataset.value; }
        if (action === 'reset-filters') { filters = Object.fromEntries(Object.keys(filters).map(k => [k, ''])); }
        if (action === 'import') { root.querySelector('[data-deck-file]').click(); return; }
        if (action === 'export') {
          const url = URL.createObjectURL(new Blob([library.exportJSON()], { type: 'application/json' }));
          const link = root.ownerDocument.createElement('a'); link.href = url; link.download = 'Kalistar-V4-decks-' + userId.replace(/[^a-z0-9_-]/gi, '_') + '.json'; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000); return;
        }
        if (action === 'play') {
          const state = model.evaluate(draft.cards);
          if (!state.playable) throw new Error(state.errors.join(' '));
          if (!onPlay) return;
          emit(); busy = true; repaint();
          try { await onPlay(); } finally { busy = false; }
        }
        repaint(action === 'add' || action === 'remove' ? { action: 'slot', slot: String(target) } : undefined);
      } catch (error) { toast(error.message); repaint(); }
    }
    function input(event) {
      if (busy || painting) return;
      const node = event.target;
      if (node.dataset.deckAction === 'name') {
        event.stopPropagation(); draft.name = node.value; pendingDelete = false;
        try { emit(); } catch (error) { toast(error.message); }
        const status = root.querySelector('[data-deck-save-state]'); if (status) status.textContent = 'Non enregistr\u00e9';
      }
      if (node.dataset.deckFilter === 'search') { event.stopPropagation(); filters.search = node.value; repaint(); }
    }
    async function change(event) {
      const node = event.target;
      if (!root?.contains(node) || busy || painting) return;
      if (!node.matches('[data-deck-action],[data-deck-filter],[data-deck-file]')) return;
      event.stopPropagation();
      try {
        if (node.dataset.deckAction === 'select') {
          working.set(selected, clone(draft));
          const id = node.value, next = working.get(id) || (id ? library.get(id) : working.get(''));
          setDraft(next, id);
        }
        if (node.dataset.deckFilter) { filters[node.dataset.deckFilter] = node.value; }
        if (node.matches('[data-deck-file]')) {
          const file = node.files?.[0]; if (!file) return;
          if (file.size > 65536) throw new Error('Fichier JSON trop volumineux.');
          const epoch = ++fileEpoch, content = await file.text();
          if (!root || fileEpoch !== epoch) return;
          library.importJSON(content); histories.clear(); working = new Map(); selected = ''; emit(); toast('Biblioth\u00e8que import\u00e9e.');
        }
        if (node.dataset.deckAction !== 'name') repaint();
      } catch (error) { toast(error.message); repaint(); }
    }
    function preview(event) {
      if (painting || comparison || drag?.active || reorderFrom !== null) return;
      const node = event.target.closest('[data-deck-preview]');
      if (node && root?.contains(node)) showPreview(node.dataset.deckPreview);
    }
    function size() { updateRecruitmentRail(); }
    function detach() {
      root?.querySelector('.kdb-compare')?.close(); comparison = null;
      cancelReorder(); suppressClickUntil = 0;
      fileEpoch++; resizeObserver?.disconnect(); resizeObserver = null;
      if (root) for (const [type, fn, capture] of listeners) root.removeEventListener(type, fn, capture);
      root?.removeEventListener('wheel', railWheel);
      mountedDocument?.removeEventListener('pointerdown', secondaryPointer, true);
      mountedWindow?.removeEventListener('blur', interrupt); mountedWindow?.removeEventListener('pagehide', interrupt); mountedWindow?.removeEventListener('resize', interrupt);
      mountedWindow = null; mountedDocument = null;
      root = null;
    }
    function refresh() {
      cancelReorder();
      const source = getDraft(), incoming = normalize(source);
      // Legacy parents echo compact preferences; do not collapse internal holes.
      if (source.cards.length < 10 && source.cards.every(id => id !== null) &&
          JSON.stringify(source.cards) === JSON.stringify(draft.cards.filter(id => id !== null))) incoming.cards = draft.cards.slice();
      if (JSON.stringify(incoming) !== JSON.stringify(draft)) {
        histories.clear(); comparison = null; working = new Map(); draft = incoming; selected = ''; working.set('', clone(draft));
        target = Math.max(0, draft.cards.indexOf(null)); pendingDelete = false; previewId = null;
      }
      const saved = savedDecks();
      if (selected && !saved.some(d => d.id === selected) && !libraryError) { selected = ''; working.set('', clone(draft)); }
      repaint();
    }
    const listeners = [['click', suppressClick, true], ['click', click], ['input', input], ['change', change], ['pointerover', preview], ['focusin', preview],
      ['pointerdown', pointerDown], ['pointermove', pointerMove], ['pointerup', pointerUp], ['pointercancel', pointerCancel], ['lostpointercapture', pointerCancel],
      ['keydown', reorderKey], ['focusout', focusOut], ['dragstart', nativeDrag]];
    return Object.freeze({
      render,
      mount(element) {
        if (!element || typeof element.addEventListener !== 'function') throw new Error('Racine DOM requise.');
        detach(); root = element;
        mountedDocument = root.ownerDocument; mountedWindow = mountedDocument.defaultView;
        repaint();
        size();
        for (const [type, fn, capture] of listeners) root.addEventListener(type, fn, capture);
        root.addEventListener('wheel', railWheel, { passive: false });
        mountedDocument.addEventListener('pointerdown', secondaryPointer, true);
        mountedWindow?.addEventListener('blur', interrupt); mountedWindow?.addEventListener('pagehide', interrupt); mountedWindow?.addEventListener('resize', interrupt);
        const Observer = root.ownerDocument.defaultView?.ResizeObserver;
        if (Observer) { resizeObserver = new Observer(size); resizeObserver.observe(root); }
      },
      refresh, destroy: detach,
      listDecks: () => savedDecks().map(d=>({...d,cards:d.cards.slice()})),
      openDeck(id, cardId) {
        const saved = savedDecks().find(d=>d.id===id); if (!saved) throw new Error('Deck introuvable pour ce profil.');
        working.set(selected, clone(draft)); setDraft(working.get(id)||saved, id);
        const index = draft.cards.findIndex(value=>value===cardId); if(index>=0){target=index;previewId=cardId;}
        panel='board'; filtering=managing=false;
      },
      inspect: () => ({ draft: clone(draft), selectedId: selected || null, targetSlot: target, ...model.evaluate(draft.cards) })
    });
  }
  return Object.freeze({ create, createModel });
});
