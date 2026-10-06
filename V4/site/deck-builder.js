(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./deck-library.js') : root.KalistarDeckLibrary,typeof module==='object'&&module.exports?require('./team-composition.js'):root.KalistarTeamComposition);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KalistarDeckBuilder = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Library,Composition) {
  'use strict';
  const ROLES = ['Tank', 'DPS physique', 'Middle', 'DPS magique', 'Support'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = d => ({ name: d.name, cards: d.cards.slice(),...(d.formation?{formation:d.formation.slice(),captain:d.captain,equipment:{...d.equipment}}:{}) });
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const button = (action, symbol, label, extra = '') => `<button type="button" class="kdb-icon" data-deck-action="${action}" title="${esc(label)}" aria-label="${esc(label)}" ${extra}>${icon(symbol)}</button>`;
  const image = c => globalThis.KalistarCardMedia.image(c);
  const crown = () => `<img class="captain-crown" src="${globalThis.KalistarSite?.url('assets/ui/captain-crown-v1.webp')||'assets/ui/captain-crown-v1.webp'}" alt="" aria-hidden="true" draggable="false">`;
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
    function evaluate(value) {
      const team=Array.isArray(value)?null:value,slots=team?team.cards:value;
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
      try { formation = team?team.formation.map(id=>ids.indexOf(id)):engine.lineup(ids.slice()); } catch { /* Fail closed below. */ }
      if (!Array.isArray(formation) || formation.length !== 5 || new Set(formation).size !== 5 || formation.some((index, p) => !Number.isInteger(index) || !byId.get(ids[index])?.positions.includes(p + 1))) {
        formation = null; errors.push('Formation P1\u2013P5 impossible.');
      }
      errors.push(...ownership(ids));
      if(team)errors.push(...engine.validateComposition(team));
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
    function candidate(slots, index, id, {formation=false}={}) {
      const c = byId.get(id); if (!c || !Number.isInteger(index) || index < 0 || index > 9) return null;
      const base = slots.filter((_, i) => i !== index), next = slots.slice(); next[index] = id;
      const available = availability(id), copies = base.filter(other => other === id).length;
      const characterConflict = base.some(other => byId.get(other)?.characterId === c.characterId);
      const rainbow = c.element === 'RAINBOW' && base.some(other => byId.get(other)?.element === 'RAINBOW');
      const same = slots[index] === id;
      const misplaced=formation&&index<5&&!c.positions.includes(index+1);
      const allowed = !misplaced&&!same && !characterConflict && copies < available.available && !rainbow;
      const reason = misplaced?c.name+' ne peut pas occuper P'+(index+1)+'.':same ? 'D\u00e9j\u00e0 dans ce slot' : characterConflict ? 'Une seule carte par personnage' : rainbow ? 'Une seule Rainbow' : copies >= available.available ? 'Aucun exemplaire disponible' : '';
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
    const searchText=new Map(data.cards.map(c=>[c.id,[c.name,c.title,c.faction,c.race,c.id].join(' ').toLocaleLowerCase('fr')]));
    const Team=Composition.create(engine,options.getEquipmentDefaults);
    const candidate=(slots,index,id)=>model.candidate(slots,index,id,{formation:true});
    let recruitMode='characters',phoneLayout=false;
    let library, libraryError = '', root = null, selected = '', target = 0, previewId = null;
    let pendingDelete = false, working = new Map(), fileEpoch = 0, resizeObserver = null, busy = false, painting = false;
    let drag = null, dragFrame = 0, recruitFrame = 0, reorderFrom = null, reorderTo = null, suppressClickUntil = 0, announcement = '';
    let mountedWindow = null, mountedDocument = null;
    let panel = 'board', managing = false, filtering = false;
    const histories = new Map();
    let comparison = null;
    let filters = { search: '', position: '', faction: '', race: '', element: '', weapon: '', synergy: '' };
    function normalize(value) {
      if (!value || typeof value.name !== 'string' || value.name.length > 50 || /[\x00-\x1f\x7f]/.test(value.name) || !Array.isArray(value.cards) || value.cards.length > 10)
        throw new Error('Brouillon de profil invalide.');
      const cards = Array.from(value.cards);
      if (cards.some(id => id !== null && (typeof id !== 'string' || !byId.has(id)))) throw new Error('Brouillon incompatible avec les cartes V4 connues.');
      const team=Team.normalize(value);team.cards=Team.slots(team);return team;
    }
    let draft = normalize(getDraft());
    working.set('', clone(draft)); target = Math.max(0, draft.cards.indexOf(null));
    try {
      library = Library.create({ storage: options.storage || globalThis.localStorage, userId,
        knownIds: data.cards.map(c => String(c.id)), normalizeDeck:Team.normalize,crypto: options.crypto || globalThis.crypto });
    } catch (error) { libraryError = error.message; }
    function savedDecks() {
      if (!library) return [];
      try { const list = library.list(); libraryError = ''; return list; }
      catch (error) { libraryError = error.message; return []; }
    }
    function emit() { draft=Team.edit(draft,draft.cards);working.set(selected, clone(draft)); onDraft(clone(draft)); }
    const editState = () => ({ ...clone(draft), target, previewId });
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
      draft=clone(next); target = next.target; previewId = next.previewId;
      try { emit(); }
      catch (error) { draft=clone(before); target = before.target; previewId = before.previewId; working.set(selected, clone(draft)); toast(error.message); return; }
      h[direction].pop(); h[direction === 'undo' ? 'redo' : 'undo'].push(before);
      cancelReorder(); pendingDelete = false;
      announce(direction === 'undo' ? 'Modification annul\u00e9e.' : 'Modification r\u00e9tablie.');
      repaint({ action: direction });
    }
    function setDraft(next, id = selected) {
      cancelReorder();
      comparison = null;
      managing=false;filtering=false;
      draft = normalize(next); selected = id; pendingDelete = false;
      target = Math.max(0, draft.cards.indexOf(null)); previewId = null; emit();
    }
    function visibleCandidates() {
      const search = filters.search.toLocaleLowerCase('fr').trim();
      const list = data.cards.filter(c => {
        if (search && !searchText.get(c.id).includes(search)) return false;
        if (filters.position && !c.positions.includes(Number(filters.position))) return false;
        if (['faction', 'race', 'element', 'weapon'].some(field => filters[field] && c[field] !== filters[field])) return false;
        return true;
      }).map(c => ({ card: c, detail: candidate(draft.cards, target, c.id) })).filter(({ detail: d }) => {
        if(!d.owned)return false;
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
    function highlightLinks() {
      if (!root) return;
      const value = byId.get(previewId || draft.cards[target])?.faction;
      root.querySelectorAll('[data-deck-slot]').forEach(n => n.classList.toggle('is-affinity', !!value && byId.get(draft.cards[Number(n.dataset.deckSlot)])?.faction === value));
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
    function candidateHTML({ card: c, detail: d }, index = 0) {
      const f = d.affinities.faction, r = d.affinities.race;
      return `<article class="kdb-candidate ${d.allowed ? '' : 'is-unavailable'}" data-deck-preview="${c.id}"><button type="button" class="kdb-candidate-image" data-deck-action="add" data-deck-recruit="${c.id}" data-id="${c.id}" title="${esc(d.allowed?c.name+' : '+c.title:d.reason)}" aria-label="Recruter ${esc(c.name)}"><img src="${image(c)}" alt="${esc(c.name)}" loading="${index<10&&(!phoneLayout||panel==='recruit')?'eager':'lazy'}" decoding="async" draggable="false"></button>
        <div class="kdb-candidate-info"><b>${esc(c.name)}</b><span>${c.positions.map(p => 'P' + p).join('/')}</span>
        <span class="kdb-candidate-gain" title="Variation de potentiel au slot ${target+1}">${icon('sword')}${signed(f.delta)} ${icon('shield')}${signed(r.delta)}</span>
        <div class="kdb-candidate-controls"><span>${d.copies}/${d.available}</span>${button('detail','scan-eye','Inspecter '+c.name,`data-id="${c.id}"`)}${button('add', draft.cards[target] ? 'replace' : 'plus', d.allowed ? (draft.cards[target] ? 'Remplacer le slot ' : 'Ajouter au slot ') + (target + 1) + ' : ' + c.name : d.reason, `data-id="${c.id}" ${d.allowed && !busy ? '' : 'disabled'}`)}</div></div></article>`;
    }
    function comparisonHTML() {
      if (!comparison) return '';
      const old = byId.get(comparison.outgoing), next = byId.get(comparison.id), detail = candidate(draft.cards, comparison.index, next.id);
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
      return `<div class="kdb-target" aria-label="Emplacement ciblé">${c?`<img src="${image(c)}" alt="">`:icon('plus')}<span><small>${target<5?'P'+(target+1):'Reserve '+(target-4)} · ${c?'Remplacement':'Libre'}</small><b>${c?esc(c.name):'Nouvelle carte'}</b></span>${button('target-previous','chevron-left','Emplacement précédent',target===0?'disabled':'')}${button('target-next','chevron-right','Emplacement suivant',target===9?'disabled':'')}</div>`;
    }
    function swapError(from,to){
      if(from===null||to===null)return 'Choisissez une destination.';
      for(const [source,destination] of [[from,to],[to,from]]){
        const c=byId.get(draft.cards[source]);
        if(c&&destination<5&&!c.positions.includes(destination+1))return c.name+' ne peut pas occuper P'+(destination+1)+'.';
      }
      return '';
    }
    function slotHTML(id,i){
      const c=byId.get(id),w=c&&globalThis.KalistarWeapons.weapons.find(w=>w.id===draft.equipment[c.characterId]);
      const leader=!!c&&draft.captain===id,unavailable=c&&!model.availability(id).available;
      return `<div class="kdb-slot ${i===target?'is-selected':''} ${leader?'is-captain':''} ${unavailable?'is-unavailable':''}" data-deck-slot="${i}" ${c?`data-deck-preview="${id}"`:''}>
        <div class="kdb-slot-top"><span>${i<5?'P'+(i+1):'R'+(i-4)}</span>${button('reorder','grip-vertical','Echanger '+(c?c.name:'la place'),`data-slot="${i}" aria-pressed="${reorderFrom===i}"`)}${c?button('remove','x','Retirer '+c.name,`data-slot="${i}"`):'<span></span>'}</div>
        <button type="button" class="kdb-slot-image" data-deck-action="slot" data-slot="${i}" aria-pressed="${i===target}" aria-label="${i<5?'P'+(i+1):'Reserve'}${c?' : '+esc(c.name):' libre'}">${c?`<img src="${image(c)}" alt="${esc(c.name)}" draggable="false">${w?`<span class="team-equipped" role="img" aria-label="Equipement : ${esc(w.name)}">${globalThis.KalistarEquipmentFX.markup(w,{bonus:false})}</span>`:''}`:icon('plus')}</button>
        <div class="team-card-caption"><span class="kdb-slot-label" title="${c?esc(c.name):'Libre'}">${c?esc(c.name):'Libre'}</span>${c?button('detail','scan-eye','Inspecter '+c.name,`data-id="${id}"`):''}</div>
        ${i<5?`<button type="button" class="kdb-icon" data-deck-action="captain" data-slot="${i}" aria-pressed="${leader}" aria-label="${esc(leader?'Capitaine : '+c.name:'Definir le capitaine')}" title="${esc(leader?'Capitaine : '+c.name:'Definir le capitaine')}" ${c?'':'disabled'}>${crown()}</button>`:''}
      </div>`;
    }
    function dnaHTML(){
      const leader=byId.get(draft.captain),active=draft.formation.filter(Boolean);
      const group=(field,stat)=>model.groups(active,field).map(g=>`<button type="button" data-deck-action="group-filter" data-field="${field}" data-value="${esc(g.value)}"><img src="${globalThis.KalistarCollaborations.asset(field==='faction'?'factions':'races',g.value)}" alt=""><b>${esc(g.value)}</b><span class="kdb-link-pips" aria-label="${g.count} titulaires">${Array.from({length:5},(_,i)=>`<i class="${i<g.count?'lit':''}"></i>`).join('')}</span><strong>${signed(g.bonus)} ${stat}</strong>${leader?.[field]===g.value&&g.count>1?`<em title="Commandement du capitaine">${icon('crown')}+10</em>`:''}</button>`).join('');
      const crystals=model.groups(active,'element');
      return `<section class="team-dna" id="kdb-panel-synergy" aria-label="ADN de l'equipe"><div class="kdb-band-heading"><h2>ADN de l'equipe</h2><small>Formation de depart</small></div>
        <div class="team-dna-grid"><div><h3>${icon('swords')}Factions</h3>${group('faction','ATK')}</div><div><h3>${icon('shield')}Races</h3>${group('race','DEF')}</div>
        <div class="team-command"><h3>${icon('crown')}Capitaine</h3><b>${leader?esc(leader.name):'A choisir'}</b>${leader?`<span>${esc(leader.faction)} ${active.filter(id=>byId.get(id).faction===leader.faction).length>1?'+10 ATK':'sans lien'}</span><span>${esc(leader.race)} ${active.filter(id=>byId.get(id).race===leader.race).length>1?'+10 DEF':'sans lien'}</span>`:''}</div>
        <div class="team-crystals"><h3>${icon('gem')}Cristaux</h3>${crystals.map(g=>`<span title="${esc(g.value)}">${g.value==='NONE'?icon('minus'):`<img src="${globalThis.KalistarCollaborations.asset('cristaux',g.value)}" alt="${esc(g.value)}">`}<b>\u00d7${g.count}</b></span>`).join('')}</div></div>
        <details class="team-potential"><summary>Potentiel de l'equipe \u00b7 ${draft.cards.filter(Boolean).length} personnages</summary><div>${['faction','race'].map(field=>`<span>${icon(field==='faction'?'flag':'users')}${model.groups(draft.cards,field).map(g=>esc(g.value)+' \u00d7'+g.count).join(' \u00b7 ')}</span>`).join('')}</div></details></section>`;
    }
    function weaponHTML(){
      const c=byId.get(draft.cards[target]),equipped=c&&draft.equipment[c.characterId];
      if(!c)return '<p class="kdb-empty-results">Choisissez un personnage de votre equipe.</p>';
      const weapons=globalThis.KalistarWeapons.weapons.filter(w=>globalThis.KalistarEquipment.compatible(w,c));
      return `<div class="team-weapon-list">${weapons.map(w=>`<article class="team-weapon"><div class="team-weapon-art">${globalThis.KalistarEquipmentFX.markup(w,{bonus:false})}</div><div><h3>${esc(w.name)}</h3><strong>+${w.effect.value} ${w.effect.stat}</strong><p>${esc(w.condition)}</p><button type="button" data-deck-action="${equipped===w.id?'unequip':'equip'}" data-id="${w.id}" aria-pressed="${equipped===w.id}">${icon(equipped===w.id?'check':globalThis.KalistarWeapons.categories[globalThis.KalistarWeapons.kind(w)].icon)}${equipped===w.id?'Desequiper':'Equiper'}</button></div></article>`).join('')||'<p class="kdb-empty-results">Aucun équipement compatible.</p>'}</div>`;
    }
    function render() {
      const saved=savedDecks(),state=model.evaluate(draft),list=visibleCandidates();
      const entry=saved.find(d=>d.id===selected),dirty=!entry||JSON.stringify(clone(entry))!==JSON.stringify(draft);
      const locked=libraryError||!library||busy;
      phoneLayout=!!mountedWindow?.matchMedia('(max-width:900px)').matches;
      const controls=`<div class="kdb-deck-picker">${button('deck-previous','chevron-left','Deck précédent', !saved.length || busy ? 'disabled' : '')}<select data-deck-action="select" aria-label="Deck sauvegardé" ${busy ? 'disabled' : ''}><option value="">Brouillon du profil</option>${saved.map(d => `<option value="${d.id}" ${selected === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>${button('deck-next','chevron-right','Deck suivant', !saved.length || busy ? 'disabled' : '')}</div>
        <label class="kdb-name-label"><span class="${phoneLayout?'':'kdb-sr-only'}">Nom de l'equipe</span><input data-deck-action="name" aria-label="Nom du deck" maxlength="50" value="${esc(draft.name)}" autocomplete="off" ${busy ? 'disabled' : ''}></label>${renderHeaderTools()}`;
      const deletion=pendingDelete?`<div class="kdb-delete-confirm" role="group" aria-label="Confirmer la suppression"><span>Supprimer ${esc(entry?.name)} ?</span>${button('confirm-delete','check','Confirmer la suppression')}${button('cancel-delete','x','Annuler la suppression')}</div>`:'';
      const profile=userId==='user-paris'?'Paris':userId==='user-tokyo'?'Tokyo':userId;
      return `<section class="kdb-page team-page ${managing ? 'is-managing' : ''} ${filtering ? 'is-filtering' : ''}" data-panel="${panel}" aria-label="Composition du deck" ${busy ? 'aria-busy="true"' : ''}>
        <header class="kdb-heading">${phoneLayout?`<button class="team-heading-summary" type="button" data-deck-action="manage" aria-label="Gerer l'equipe ${esc(draft.name)}" aria-haspopup="dialog" aria-expanded="${managing}"><span><small>Composition</small><b class="team-current-name">${esc(draft.name)}</b></span>${icon('chevron-down')}</button>`:`<div class="kdb-heading-title"><span class="kdb-eyebrow">KALISTAR · ${esc(profile)}</span><h1>Composition</h1></div>${controls}`}
        <div class="kdb-heading-state"><span class="kdb-badge ${state.playable ? 'is-ready' : ''}">${state.playable ? 'Prêt' : 'Brouillon'}</span><strong>${state.count}<small>/10</small></strong></div>
        ${button('save','save', selected ? 'Enregistrer les modifications' : 'Sauvegarder le deck', locked || !selected && saved.length >= 10 ? 'disabled' : '')}${phoneLayout?'':button('manage','settings-2','Gestion des decks', `aria-expanded="${managing}"`)}<button type="button" class="kdb-play" data-deck-action="play" ${state.playable && onPlay && !busy ? '' : 'disabled'}>${icon('swords')}<span>Jouer</span></button></header>
        <${phoneLayout?'dialog':'div'} class="kdb-library-bar ${phoneLayout?'team-management':''}" ${phoneLayout?'aria-label="Gerer l\u0027equipe"':managing?'':'hidden'}><div class="kdb-menu-heading"><b>${phoneLayout?'Gerer l\u0027equipe':saved.length+'/10 decks'}</b><span class="kdb-save-state" data-deck-save-state>${dirty ? 'Non enregistré' : 'Enregistré'}</span>${button('manage','x','Fermer la gestion')}</div>${phoneLayout?`<div class="team-management-controls"><label class="team-management-field"><span>Equipes sauvegardees · ${saved.length}/10</span></label>${controls}</div>`:''}<div class="kdb-library-actions">${button('duplicate','copy','Dupliquer le deck courant',locked || saved.length >= 10 ? 'disabled' : '')}${button('new','file-plus-2','Nouveau brouillon',busy ? 'disabled' : '')}${button('delete','trash-2','Supprimer le deck sauvegardé',locked || !selected ? 'disabled' : '')}${button('export','download','Exporter la bibliothèque JSON',locked || !saved.length ? 'disabled' : '')}${button('import','upload','Importer une bibliothèque JSON',locked ? 'disabled' : '')}</div>${phoneLayout?deletion:''}</${phoneLayout?'dialog':'div'}><input type="file" accept="application/json,.json" data-deck-file hidden>
        ${libraryError ? `<p class="kdb-storage-error" role="alert">Bibliothèque : ${esc(libraryError)}</p>` : ''}
        ${phoneLayout?'':deletion}

        <nav class="kdb-mobile-nav" role="tablist" aria-label="Vues de composition">${[['board','Equipe','layout-grid'],['recruit','Recruter','user-plus'],['synergy','ADN','git-branch']].map(([id,label,symbol])=>`<button data-deck-action="panel" data-id="${id}" role="tab" aria-selected="${panel===id}" aria-controls="kdb-panel-${id}" tabindex="${panel===id?0:-1}">${icon(symbol)}${label}</button>`).join('')}</nav>
        <div class="kdb-workbench">
          <section class="kdb-composition" id="kdb-panel-board" aria-label="Composition de l'equipe">
            <div class="kdb-band-heading"><h2>Titulaires</h2><div class="kdb-edit-tools">${button('undo','undo-2','Annuler',history().undo.length&&!busy?'':'disabled')}${button('redo','redo-2','Retablir',history().redo.length&&!busy?'':'disabled')}</div></div>
            <div class="kdb-coverage" aria-label="Compatibilite sur les dix cartes">${state.coverage.map((n,p)=>`<button type="button" data-deck-action="position-filter" data-id="${p+1}" class="${n===0?'is-empty':n===1?'is-missing':''}" title="P${p+1} ${ROLES[p]} : ${n} compatibles, 2 requis"><b>${icon(['shield','sword','compass','sparkles','heart-pulse'][p])}P${p+1}<span>${n}/2</span></b><small>${ROLES[p]}</small></button>`).join('')}</div>
            <div class="kdb-slots team-starters">${draft.cards.slice(0,5).map(slotHTML).join('')}</div>
            <div class="team-reserve-heading"><h2>Reserve</h2><small>${draft.cards.slice(5).filter(Boolean).length}/5</small></div>
            <div class="kdb-slots team-reserves">${draft.cards.slice(5).map((id,i)=>slotHTML(id,i+5)).join('')}</div>
            <p class="kdb-reorder-status" data-deck-reorder-status role="status" aria-live="polite" aria-atomic="true">${esc(announcement)}</p>
            <div class="kdb-validation" role="status"><span class="${state.playable?'kdb-positive':'kdb-warning'}" title="${esc(state.errors.join(' '))}">${state.playable?'Equipe prete':esc(state.errors.find(e=>e.includes('capitaine'))||state.errors[0]||'Formation incomplete')}</span></div>
          </section>
          <section class="kdb-browser" id="kdb-panel-recruit" aria-label="Bibliotheque de recrutement">
            <div class="team-library-tabs" role="tablist" aria-label="Bibliotheque"><button type="button" role="tab" data-deck-action="recruit-mode" data-id="characters" aria-selected="${recruitMode==='characters'}">${icon('users')}Personnages</button><button type="button" role="tab" data-deck-action="recruit-mode" data-id="weapons" aria-selected="${recruitMode==='weapons'}">${icon('sword')}Équipements</button></div>
            ${targetHTML()}
            ${recruitMode==='weapons'?weaponHTML():`<div class="kdb-band-heading"><h2>Recrutement <small>${list.total}</small></h2><div class="kdb-recruit-tools"><label class="kdb-search"><span class="kdb-sr-only">Recherche</span><input type="search" data-deck-filter="search" aria-label="Recherche de cartes" value="${esc(filters.search)}" placeholder="Rechercher" autocomplete="off"></label>${button('filters','sliders-horizontal','Filtres',`aria-expanded="${filtering}"`)}${Object.values(filters).some(Boolean)?button('reset-filters','filter-x','Effacer les filtres'):''}</div></div>${filtersHTML()}<div class="kdb-candidates" tabindex="0" aria-label="Personnages disponibles">${list.items.map(candidateHTML).join('')||'<p class="kdb-empty-results">Aucun personnage pour ces filtres.</p>'}</div>`}
          </section>
          ${dnaHTML()}
        </div>${comparisonHTML()}</section>`;
    }
    function icons(node) { globalThis.KalistarUI?.icons(node)??globalThis.lucide?.createIcons({ root: node }); }
    function repaintCandidates() {
      if(!root||painting)return;
      const rail=root.querySelector('.kdb-candidates');if(!rail)return repaint();
      cancelPointer();
      const list=visibleCandidates();
      rail.innerHTML=list.items.map(candidateHTML).join('')||'<p class="kdb-empty-results">Aucun personnage pour ces filtres.</p>';
      icons(rail);
      root.querySelector('.kdb-browser .kdb-band-heading h2 small').textContent=list.total;
      const tools=root.querySelector('.kdb-recruit-tools'),reset=tools.querySelector('[data-deck-action=reset-filters]');
      if(Object.values(filters).some(Boolean)){if(!reset){tools.insertAdjacentHTML('beforeend',button('reset-filters','filter-x','Effacer les filtres'));icons(tools);}}
      else reset?.remove();
      if(!recruitFrame)recruitFrame=mountedWindow.requestAnimationFrame(()=>{recruitFrame=0;updateRecruitmentRail();});
    }
    function repaint(focus) {
      if (!root || painting) return;
      mountedWindow?.cancelAnimationFrame(recruitFrame);recruitFrame=0;
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
        const management=root.querySelector('.team-management');
        if(management&&managing){management.showModal();if(!descriptor||descriptor.action==='manage')return;}
        if (!descriptor) return;
        const next = [...root.querySelectorAll('button,input,select')].find(n => descriptor.filter ? n.dataset.deckFilter === descriptor.filter : descriptor.action && n.dataset.deckAction === descriptor.action && (descriptor.id === undefined || n.dataset.id === descriptor.id) && (descriptor.slot === undefined || n.dataset.slot === descriptor.slot));
        if (next && !next.disabled && (!management?.open||management.contains(next))) { next.focus({ preventScroll: true }); if (descriptor.start !== null && descriptor.start !== undefined && ['search','text'].includes(next.type)) next.setSelectionRange(descriptor.start, descriptor.end); }
        else { const stage = root.querySelector('.kdb-page'); stage.tabIndex = -1; stage.focus({ preventScroll: true }); }
      } finally { painting = false; }
    }
    function showPreview(id) {
      if (!byId.has(id) || previewId === id) return;
      previewId = id;
      highlightLinks();
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
        const eligible = !!drag?.active && (drag.recruit?candidate(draft.cards,index,drag.recruit)?.allowed:!swapError(source,index));
        node.classList.toggle('is-drop-eligible', eligible);
        node.classList.toggle('is-drop-blocked', !!drag?.active&&!eligible);
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
      const problem=swapError(from,to);if(problem){toast(problem);announce(problem);return;}
      const next = clone(draft); [next.cards[from], next.cards[to]] = [next.cards[to], next.cards[from]];
      draft = next; target = to; previewId = next.cards[to]; pendingDelete = false;
      try { emit(); }
      catch (error) { draft = before; target = oldTarget; previewId = oldPreview; working.set(selected, clone(before)); toast(error.message); repaint(); return; }
      remember(undo);
      announce('Slots ' + (from + 1) + ' et ' + (to + 1) + ' \u00e9chang\u00e9s.');
      repaint({ action: 'slot', slot: String(to) });
    }
    function recruitTo(id, index, advance = false, confirmed = false) {
      const choice = candidate(draft.cards, index, id);
      if (busy || !choice?.allowed) { toast(choice?.reason || 'Carte indisponible.'); return; }
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
      if (event.key === 'Escape' && (managing || filtering)) { event.preventDefault(); const action=managing?'manage':'filters';managing = filtering = pendingDelete = false; repaint({action}); return; }
      if (event.target.matches('[data-deck-action=panel]') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
        const panels = ['board','recruit','synergy'], i = panels.indexOf(panel);
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
      if(event.target.matches('.team-management')){event.stopPropagation();managing=pendingDelete=false;repaint({action:'manage'});return;}
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
          onDetail?.(id);
          return;
        }
        if (action === 'detail') { onDetail?.(id); return; }
        if(action==='recruit-mode'){recruitMode=id==='weapons'?'weapons':'characters';repaint();return;}
        if(action==='captain'){
          const index=Number(control.dataset.slot);if(index>=5||!draft.cards[index])return;
          const before=editState();draft.captain=draft.cards[index];
          try{emit();}catch(error){draft=clone(before);working.set(selected,clone(draft));throw error;}
          remember(before);announce(byId.get(draft.captain).name+' est capitaine.');repaint();return;
        }
        if(action==='equip'||action==='unequip'){
          const c=byId.get(draft.cards[target]);if(!c)return;
          const old=draft.equipment[c.characterId],carrier=Object.entries(draft.equipment).find(([key,value])=>value===id&&key!==c.characterId);
          if(action==='equip'&&(old||carrier)&&!mountedWindow.confirm('Remplacer ou deplacer cet equipement dans cette equipe ?'))return;
          const before=editState();draft=Team.equip(draft,c.id,action==='unequip'?null:id);
          try{emit();}catch(error){draft=clone(before);working.set(selected,clone(draft));throw error;}
          remember(before);repaint();return;
        }
        if (action === 'manage') { managing = !managing; filtering = false; }
        if (action === 'filters') { filtering = !filtering; managing = false; }
        if (action === 'panel') { panel = id; filtering = managing = false; }
        if (action === 'rail-left' || action === 'rail-right') { scrollRecruitmentRail(action === 'rail-left' ? -1 : 1); return; }
        if (action === 'position-filter') { filters.position = filters.position === id ? '' : id; recruitMode='characters';if(mountedWindow?.matchMedia('(max-width:900px)').matches)panel='recruit'; }
        if (action === 'deck-previous' || action === 'deck-next') {
          const ids = ['', ...savedDecks().map(d=>d.id)], at = ids.indexOf(selected), nextId = ids[(at + (action === 'deck-next' ? 1 : ids.length - 1)) % ids.length];
          working.set(selected, clone(draft)); setDraft(working.get(nextId) || library.get(nextId), nextId);
        }
        if (action === 'slot' || action === 'target-previous' || action === 'target-next') { target = action==='slot'?Number(control.dataset.slot):Math.max(0,Math.min(9,target+(action==='target-next'?1:-1))); previewId = draft.cards[target]; }
        if (action === 'slot' && mountedWindow?.matchMedia('(max-width:900px)').matches) panel='recruit';
        if (action === 'remove') {
          const before = editState(); target = Number(control.dataset.slot); draft.cards = draft.cards.slice(); draft.cards[target] = null; pendingDelete = false; previewId = null;
          try { emit(); remember(before); }
          catch (error) { draft=clone(before); target = before.target; previewId = before.previewId; working.set(selected, clone(draft)); throw error; }
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
        if (action === 'group-filter') { filters[control.dataset.field] = filters[control.dataset.field] === control.dataset.value ? '' : control.dataset.value; recruitMode='characters';if(mountedWindow?.matchMedia('(max-width:900px)').matches)panel='recruit'; }
        if (action === 'reset-filters') { filters = Object.fromEntries(Object.keys(filters).map(k => [k, ''])); }
        if (action === 'import') { root.querySelector('[data-deck-file]').click(); return; }
        if (action === 'export') {
          const url = URL.createObjectURL(new Blob([library.exportJSON()], { type: 'application/json' }));
          const link = root.ownerDocument.createElement('a'); link.href = url; link.download = 'Kalistar-V4-decks-' + userId.replace(/[^a-z0-9_-]/gi, '_') + '.json'; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000); return;
        }
        if (action === 'play') {
          const state = model.evaluate(draft);
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
        const name=root.querySelector('.team-current-name');if(name)name.textContent=draft.name;
      }
      if (node.dataset.deckFilter === 'search') { event.stopPropagation(); filters.search = node.value; repaintCandidates(); }
    }
    async function change(event) {
      const node = event.target;
      if (!root?.contains(node) || busy || painting) return;
      if (!node.matches('[data-deck-action],[data-deck-filter],[data-deck-file]')) return;
      event.stopPropagation();
      if(node.dataset.deckFilter==='search'){if(filters.search!==node.value){filters.search=node.value;repaintCandidates();}return;}
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
    function size() { if(root&&phoneLayout!==!!mountedWindow?.matchMedia('(max-width:900px)').matches)repaint();updateRecruitmentRail(); }
    function cancelManagement(event){if(event.target.matches('.team-management')){event.preventDefault();managing=pendingDelete=false;repaint({action:'manage'});}}
    function detach() {
      root?.querySelector('.kdb-compare')?.close(); comparison = null;
      root?.querySelector('.team-management')?.close();
      cancelReorder(); suppressClickUntil = 0;
      fileEpoch++; resizeObserver?.disconnect(); resizeObserver = null;
      if (root) for (const [type, fn, capture] of listeners) root.removeEventListener(type, fn, capture);
      root?.removeEventListener('wheel', railWheel);
      mountedDocument?.removeEventListener('pointerdown', secondaryPointer, true);
      mountedWindow?.removeEventListener('blur', interrupt); mountedWindow?.removeEventListener('pagehide', interrupt); mountedWindow?.removeEventListener('resize', interrupt);
      mountedWindow?.cancelAnimationFrame(recruitFrame);recruitFrame=0;
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
    const listeners = [['click', suppressClick, true], ['click', click], ['cancel',cancelManagement,true], ['input', input], ['change', change], ['pointerover', preview], ['focusin', preview],
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
      inspect: () => ({ draft: clone(draft), selectedId: selected || null, targetSlot: target, ...model.evaluate(draft) })
    });
  }
  return Object.freeze({ create, createModel });
});
