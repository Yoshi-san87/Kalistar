(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KalistarJourneyView = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const asset = path => globalThis.KalistarSite?.url(path) || path;
  // Keyed by the rewarded model, never by a display name or another version.
  const coverArt = Object.freeze({
    '30000001':'assets/journeys/30000001-art-v1.webp',
    '30000014':'assets/journeys/30000014-art-v1.webp',
    '30000007':'assets/journeys/30000007-art-v1.webp',
    '49900802':'assets/journeys/49900802-art-v1.webp',
    '49055457':'assets/journeys/49055457-art-v1.webp'
  });
  const momoScenes = Object.freeze({
    rebuts:['momo-rebuts','Momo devant la maison qui l’a rejeté.'],
    passage:['momo-passage','Taulio abrite Momo parmi les débris de la casse.'],
    carillons:['momo-carillons','Une première lumière accompagne la flûte de Momo.'],
    rester:['momo-rester','Debout, Momo fait danser la lumière parmi les objets oubliés.'],
    souffle:['momo-souffle','Momo retrouve sa mélodie au milieu des outils d’un atelier.'],
    coutures:['momo-coutures','Taulio ajuste le harnais de Momo avant le passage du pont.'],
    boite:['momo-boite','Momo et Kaylis, en cape noire, écoutent une boîte à musique au matin.',2]
  });
  const balmhyrScenes = Object.freeze({
    horizon:['balmhyr-horizon','Dans la salle du Conseil, Balmhyr fait face à la trahison de son frère Lok.'],
    durane:['balmhyr-durane','Au crépuscule, Balmhyr reste prostré devant la limite magnétique de son exil.'],
    guide:['balmhyr-guide','Dans l’intimité de sa maison d’exil, Balmhyr se confie à Kaylis avant sa libération.'],
    portes:['balmhyr-portes','Madania ajuste le Gant de Fer de Balmhyr, de retour après ses années d’exil.'],
    serment:['balmhyr-serment','Avant de repartir, Balmhyr reprend sa hache et retrouve l’équilibre de sa garde.'],
    rempart:['balmhyr-rempart','Balmhyr tient le passage vers le Conseil derrière le Rempart de Durane.'],
    empreinte:['balmhyr-empreinte','Au cœur du combat final, Balmhyr pare la dague de Lok avec le Gant de Fer tandis que Kaylis rompt la pression magnétique.']
  });

  // Parent contract: stages stays at four; bonusStages adds absolute stages 4..6.
  // Progress is read-only: cleared 0..7, completed means card earned (>=4),
  // claimed/acknowledged refer only to that card, finished means all rewards.
  // equipmentClaims contains only won stages: {stage,equipmentId,kind,alreadyOwned,acknowledged}.
  // onStart/onResume still take bookId; onPreview takes (bookId, absoluteStage).
  // The parent claims and refreshes authoritative progress/ownership BEFORE awaiting
  // revealReward(card) / revealEquipment(fullCatalogueItem, {alreadyOwned}).
  // Public reveals are presentation-only: true on user confirmation, false on destroy.
  // After true, the parent ACKs, refreshes, then may await revealSequel(book, stage).
  // Resume-reward buttons use onAcknowledge[Equipment] AFTER a true reveal result.
  // These callbacks only ACK/refresh; they must not open/await another ceremony.
  // revealSequel(book, absoluteStage) never runs from draw/mount, so reload is quiet.
  // Narrative: stage.reveal {title,paragraphs}, else book.bonusReveal for stage 4.
  function create({data = {}, image, art, getState, onStart, onResume, onClaim, onAcknowledge, onClaimEquipment, onAcknowledgeEquipment, onPreview, onDetail, onRefresh, toast} = {}) {
    let root = null, view = null, controller = null, observer = null, frame = 0;
    let generation = 0, paint = 0, selectedBook = null, selectedStage = 0, passage = 'intro', lastCleared = 0;
    let pending = null, detailPending = null, claimBook = null, claimStage = null, errorMessage = '', reward = null;
    const equipmentItems = new Map();
    const CARD_PAGE = -1;
    const libraryPosition = {left:0,top:0};
    const filters = {character:'', element:'', status:'', search:''};
    let filtersOpen = false;
    const cards = new Map((data.cards || []).map(card => [String(card.id), card]));
    const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const model = id => cards.get(String(id));
    const booksOf = state => Array.isArray(state.books) ? state.books : [];
    const stagesOf = book => Array.isArray(book?.stages) ? book.stages : [];
    const bonusOf = book => Array.isArray(book?.bonusStages) ? book.bonusStages.slice(0,3) : [];
    const allStagesOf = book => [...stagesOf(book), ...bonusOf(book)];
    const equipmentOf = id => equipmentItems.get(id) || globalThis.KalistarWeapons?.weapons.find(item => item.id === id);
    const kindLabel = kind => ({weapon:'Arme',shield:'Protection',protection:'Protection',relic:'Relique'}[kind] || 'Équipement');
    const claimLabel = kind => ({weapon:'Recevoir l’arme',shield:'Recevoir la protection',protection:'Recevoir la protection',relic:'Recevoir la relique'}[kind] || 'Recevoir l’équipement');
    const titleOf = book => String(book.title || book.subtitle || 'Parcours');
    const characterOf = book => model(book.rewardModelId)?.name || book.subtitle || book.characterId;
    function stateNow() {
      try {
        const state = getState?.();
        return state && ['ready','loading','error'].includes(state.status) ? state : {status:'loading'};
      } catch (error) { return {status:'error', error}; }
    }
    function progressOf(book, state) {
      const value = state.progress?.[book.id] || {}, total = allStagesOf(book).length;
      const cleared = Math.max(0, Math.min(total, Number.isFinite(value.cleared) ? Math.floor(value.cleared) : 0));
      return {
        cleared, completed:cleared >= stagesOf(book).length, claimed:value.claimed === true,
        acknowledged:value.acknowledged === true, alreadyOwned:value.alreadyOwned === true, activeAttempt:value.activeAttempt || null,
        finished:value.finished === true || !bonusOf(book).length && value.claimed === true,
        equipmentClaims:(Array.isArray(value.equipmentClaims) ? value.equipmentClaims : []).filter(claim =>
          Number.isInteger(claim?.stage) && claim.stage >= 4 && claim.stage <= 6 && claim.stage < cleared &&
          bonusOf(book)[claim.stage-4]?.rewardEquipmentId === claim.equipmentId)
      };
    }
    const claimOf = (p,stage) => p.equipmentClaims.find(claim => claim.stage === stage);
    function visibleBonus(book,p) {
      if (!p.claimed || !p.acknowledged) return 0;
      let count = 0;
      for (let index = 0; index < bonusOf(book).length; index++) {
        count++;
        if (!claimOf(p,3+count)?.acknowledged) break;
      }
      return count;
    }
    const stageAvailable = (book,p,index) => index >= 0 && index < allStagesOf(book).length &&
      (index < 4 ? index <= p.cleared : index-4 < visibleBonus(book,p) && index <= p.cleared);
    const cardCount = p => Math.min(4,p.cleared);
    const statusOf = p => p.finished ? 'claimed' : p.completed && (!p.claimed || !p.acknowledged) ? 'reward' : p.activeAttempt || p.cleared ? 'started' : 'new';
    const statusLabel = p => ({claimed:'Achevé', reward:'Récompense disponible', started:p.activeAttempt ? 'Combat en cours' : 'En cours', new:'À découvrir'}[statusOf(p)]);
    function elementOf(book) {
      const value = data.elements?.[book.element];
      return {label:value?.label || (book.element === 'NONE' ? 'Sans cristal' : book.element || 'Sans cristal'),
        color:/^#?[\da-f]{6}$/i.test(value?.color || '') ? '#' + value.color.replace(/^#/, '') : '#a4c7bd'};
    }
    function coverIllustration(book) {
      const source = Object.hasOwn(coverArt,book.rewardModelId) ? coverArt[book.rewardModelId] : null, label = `Illustration de la carte récompense : ${characterOf(book)}`;
      return source ? `<img src="${esc(asset(source))}" data-jv-cover-model="${esc(book.rewardModelId)}" alt="${esc(label)}" width="900" height="1200" loading="lazy" decoding="async" draggable="false">` : media(book.rewardModelId,'art',label);
    }
    function button(action, label, glyph, {key = action, disabled = false, primary = false, extra = ''} = {}) {
      return `<button type="button" class="jv-command${primary ? ' jv-primary' : ''}" data-jv-action="${action}" data-jv-key="${esc(key)}" ${disabled ? 'disabled' : ''} ${extra}>${icon(glyph)}<span>${esc(label)}</span></button>`;
    }
    function tool(action, label, glyph, extra = '') {
      return `<button type="button" class="jv-tool" data-jv-action="${action}" data-jv-key="${esc(action)}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(glyph)}</button>`;
    }
    function media(id, kind, alt, {lazy = true} = {}) {
      if (!model(id)) return `<span class="jv-missing-art" role="img" aria-label="Visuel indisponible">${icon(kind === 'art' ? 'image' : 'gem')}</span>`;
      return `<img data-jv-media="${esc(id)}" data-jv-kind="${kind}" alt="${esc(alt)}" width="${kind === 'art' ? 460 : 797}" height="${kind === 'art' ? 880 : 1388}" ${lazy ? 'loading="lazy"' : ''} decoding="async" draggable="false">`;
    }
    function sceneMarkup(book,stage,id) {
      const scene = book.id === 'momo-petits-bonheurs' ? momoScenes[stage?.id || 'rester'] :
        book.id === 'balmhyr-retour' ? balmhyrScenes[stage?.id || 'portes'] : null;
      const key = book.id+':'+(stage?.id || 'reward');
      if (!scene) return `<figure class="jv-panorama is-portrait" data-jv-scene="${esc(key)}">${media(id,'art',stage?.title || titleOf(book),{lazy:false})}</figure>`;
      const base = 'assets/journeys/'+scene[0]+'-v'+(scene[2] || 1);
      return `<figure class="jv-panorama" data-jv-scene="${esc(key)}"><img src="${esc(asset(base+'.webp'))}" srcset="${esc(asset(base+'-small.webp'))} 840w, ${esc(asset(base+'.webp'))} 1672w" sizes="100vw" alt="${esc(scene[1])}" width="1672" height="941" decoding="async" draggable="false"></figure>`;
    }
    function hydrate(scope) {
      const revision = generation, render = paint;
      for (const img of scope.querySelectorAll('img[data-jv-media]:not([src])')) {
        const card = model(img.dataset.jvMedia), callback = img.dataset.jvKind === 'art' ? art || image : image;
        Promise.resolve().then(() => generation === revision && img.isConnected ? callback?.(card) : null).then(source => {
          if (generation !== revision || !img.isConnected || scope === view && paint !== render) return;
          if (typeof source !== 'string' || !source.trim() || /^\s*javascript:/i.test(source)) throw Error('Visuel indisponible');
          img.src = source;
        }).catch(() => {
          if (generation !== revision || !img.isConnected) return;
          img.classList.add('jv-media-unavailable');
          img.alt = 'Visuel indisponible';
        });
      }
      if (globalThis.KalistarUI?.icons) globalThis.KalistarUI.icons(scope);
      else globalThis.lucide?.createIcons({root:scope});
    }
    function report(error) {
      errorMessage = error?.message || String(error || 'Action impossible. Réessayez.');
      try { Promise.resolve(toast?.(errorMessage)).catch(() => {}); } catch { /* The inline error remains available. */ }
    }
    function errorMarkup() {
      return errorMessage ? `<div class="jv-error" role="alert">${icon('circle-alert')}<p>${esc(errorMessage)}</p>${tool('dismiss-error', 'Masquer le message', 'x')}</div>` : '';
    }
    function filteredBooks(state) {
      const query = fold(filters.search).trim();
      return booksOf(state).filter(book => (!filters.character || book.characterId === filters.character) &&
        (!filters.element || book.element === filters.element) && (!filters.status || statusOf(progressOf(book, state)) === filters.status) &&
        (!query || fold([book.title, book.subtitle, characterOf(book), elementOf(book).label, model(book.rewardModelId)?.title].join(' ')).includes(query)));
    }
    function libraryMarkup(state) {
      const all = booksOf(state), books = filteredBooks(state);
      const characters = [...new Map(all.map(book => [book.characterId, characterOf(book)])).entries()].sort((a,b) => String(a[1]).localeCompare(String(b[1]), 'fr'));
      const elements = [...new Map(all.map(book => [book.element, elementOf(book).label])).entries()];
      const select = (key, label, options) => `<label class="jv-filter"><span>${label}</span><select data-jv-filter="${key}" data-jv-key="filter-${key}" aria-label="${label}"><option value="">Tous</option>${options.map(([value,text]) => `<option value="${esc(value)}" ${filters[key] === value ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
      const activeFilters=Object.values(filters).filter(Boolean).length;
      return `<section class="jv-library" aria-label="Fragment" data-filters-open="${filtersOpen}">
        <header class="jv-library-heading"><div><p class="jv-eyebrow">Kalistar</p><h1>Fragment</h1></div><div class="jv-library-actions"><span class="jv-library-total">${all.filter(book => progressOf(book,state).claimed).length} / ${all.length} cartes obtenues</span><button type="button" class="jv-tool jv-filter-toggle" data-jv-action="toggle-filters" data-jv-key="toggle-filters" aria-label="Filtres${activeFilters ? ', '+activeFilters+' actifs' : ''}" title="Filtres" aria-expanded="${filtersOpen}" aria-controls="jv-filters">${icon('sliders-horizontal')}${activeFilters ? `<b>${activeFilters}</b>` : ''}</button></div></header>
        <form id="jv-filters" class="jv-filters" role="search" aria-label="Filtrer les parcours">
          <label class="jv-search"><span class="jv-sr-only">Rechercher un parcours</span>${icon('search')}<input type="search" data-jv-filter="search" data-jv-key="filter-search" value="${esc(filters.search)}" placeholder="Rechercher un parcours" autocomplete="off"></label>
          ${select('character','Personnage',characters)}${select('element','Cristal',elements)}${select('status','État',[['new','À découvrir'],['started','En cours'],['reward','Récompense disponible'],['claimed','Achevé']])}
          ${tool('reset-filters','Réinitialiser les filtres','filter-x',Object.values(filters).some(Boolean) ? '' : 'disabled')}
        </form>${errorMarkup()}
        <div class="jv-shelf-heading"><p role="status">${books.length} livre${books.length === 1 ? '' : 's'}</p><div class="jv-shelf-tools">${tool('shelf-left','Livres précédents','chevron-left')}${tool('shelf-right','Livres suivants','chevron-right')}</div></div>
        ${books.length ? `<div class="jv-shelf" tabindex="0" role="region" aria-label="Rayonnage des parcours" data-jv-key="shelf"><ol class="jv-volumes">${books.map(book => {
          const p = progressOf(book,state), card = model(book.rewardModelId), total = stagesOf(book).length;
          return `<li class="jv-volume" style="--jv-element:${elementOf(book).color}">
            <button type="button" class="jv-cover" data-jv-action="open" data-jv-book="${esc(book.id)}" data-jv-key="open-${esc(book.id)}" aria-label="${p.finished ? 'Consulter' : p.cleared || p.activeAttempt ? 'Poursuivre' : 'Ouvrir'} ${esc(titleOf(book))}, ${esc(statusLabel(p))}">
              <span class="jv-cover-object"><span class="jv-cover-art">${coverIllustration(book)}</span><img class="jv-cover-skin" src="${esc(asset('assets/journeys/binding-v1.webp'))}" alt="" width="1024" height="1536" loading="lazy" decoding="async" draggable="false">
                <span class="jv-cover-character">${esc(card?.name || book.subtitle || characterOf(book))}</span>
                <span class="jv-cover-inscription"><span class="jv-cover-title">${esc(titleOf(book))}</span></span>
                ${p.finished ? `<span class="jv-cover-seal" aria-hidden="true">${icon('check')}</span>` : ''}
              </span><span class="jv-cover-command">${icon(p.finished ? 'book-open' : p.cleared || p.activeAttempt ? 'bookmark' : 'book-open')}<span>${p.finished ? 'Consulter' : p.cleared || p.activeAttempt ? 'Poursuivre' : 'Ouvrir'}</span>${icon('chevron-right')}</span>
            </button>
            <div class="jv-volume-meta"><span class="jv-volume-element"><span class="jv-element-dot" aria-hidden="true"></span>${esc(elementOf(book).label)}</span><span class="jv-volume-state" data-state="${statusOf(p)}">${esc(statusLabel(p))}</span><progress max="${Math.max(1,total)}" value="${cardCount(p)}" aria-label="${esc(titleOf(book))} : ${cardCount(p)} combats gagnés sur ${total}"></progress><span class="jv-volume-count">${cardCount(p)} / ${total} combats${visibleBonus(book,p) ? ' · '+(p.finished ? 'Récit achevé' : 'Le récit continue') : ''}</span></div>
          </li>`;
        }).join('')}</ol></div>` : `<div class="jv-empty">${icon('library')}<h2>${all.length ? 'Aucun parcours trouvé' : 'Aucun parcours disponible'}</h2>${all.length ? button('reset-filters','Effacer les filtres','filter-x') : ''}</div>`}
      </section>`;
    }
    function routeMarkup(book,p,state) {
      const stages = stagesOf(book);
      return `<nav class="jv-route" aria-label="Étapes du parcours"><ol>${stages.map((stage,index) => {
        const done = index < p.cleared, locked = !done && (p.completed || index > p.cleared), active = index === selectedStage;
        const label = `${index+1}. ${stage.title || 'Combat'} : ${done ? 'faite' : locked ? 'verrouillée' : 'courante'}${locked && state.isAdmin ? ', aperçu admin' : ''}`;
        return `<li class="${done ? 'is-done' : locked ? 'is-locked' : 'is-current'}"><button type="button" data-jv-action="stage" data-jv-stage="${index}" data-jv-key="stage-${index}" aria-label="${esc(label)}" title="${esc(label)}" ${active ? 'aria-current="step"' : ''} ${locked && !state.isAdmin ? 'disabled' : ''}><span class="jv-station">${done ? icon('check') : locked ? icon('lock-keyhole') : index+1}</span><span class="jv-station-label">${index+1}/${stages.length}<span class="jv-station-state">${done ? 'Faite' : locked ? 'Verrouillée' : 'Courante'}</span></span></button></li>`;
      }).join('')}<li class="jv-route-end ${p.claimed ? 'is-done' : p.completed ? 'is-current' : 'is-locked'}"><button type="button" data-jv-action="reward-page" data-jv-key="reward-page" aria-label="${p.claimed ? 'Carte obtenue' : 'Récompense du parcours'}" title="Récompense" ${selectedStage === CARD_PAGE ? 'aria-current="step"' : ''} ${!p.completed ? 'disabled' : ''}><span class="jv-station">${icon(p.claimed ? 'check' : 'gem')}</span><span class="jv-station-label">Carte</span></button></li></ol>
      ${bonusOf(book).slice(0,state.isAdmin ? 3 : visibleBonus(book,p)).length ? `<ol class="jv-bonus-route" aria-label="${state.isAdmin ? 'Chapitres · Aperçu sans récompense' : 'La suite du récit'}">${bonusOf(book).slice(0,state.isAdmin ? 3 : visibleBonus(book,p)).map((stage,offset) => {
        const index = offset+4, available = stageAvailable(book,p,index), done = available && index < p.cleared;
        const label = `${index+1}. ${stage.title} · ${available ? kindLabel(stage.rewardKind) : 'Aperçu sans récompense'}`;
        return `<li class="${done ? 'is-done' : available ? 'is-current' : 'is-preview'}"><button type="button" data-jv-action="stage" data-jv-stage="${index}" data-jv-key="stage-${index}" title="${esc(label)}" aria-label="${esc(label)}" ${selectedStage === index ? 'aria-current="step"' : ''}><span class="jv-station">${icon(done ? 'check' : available ? 'book-open' : 'eye')}</span><span class="jv-station-label">${index+1}<span class="jv-station-state">${available ? kindLabel(stage.rewardKind) : 'Aperçu'}</span></span></button></li>`;
      }).join('')}</ol>` : ''}</nav>`;
    }
    function primaryMarkup(book,p) {
      const total = stagesOf(book).length, busy = !!pending;
      if (p.completed) {
        if (!p.claimed) return button('claim','Recevoir la carte','gem',{primary:true,disabled:busy || !onClaim});
        if (!p.acknowledged) return button('reveal','Voir la carte obtenue','gem',{primary:true,disabled:busy || !onAcknowledge});
        const visible = visibleBonus(book,p), stageIndex = visible+3, claim = claimOf(p,stageIndex);
        if (!visible) return `<span class="jv-earned">${icon('check')}Carte déjà obtenue</span>`;
        if (stageIndex < p.cleared && !claim) return button('claim-equipment',claimLabel(allStagesOf(book)[stageIndex].rewardKind),'gem',{primary:true,disabled:busy || !onClaimEquipment,extra:`data-jv-stage="${stageIndex}"`});
        if (claim && !claim.acknowledged) return button('reveal-equipment','Voir la récompense','gem',{primary:true,disabled:busy || !onAcknowledgeEquipment,extra:`data-jv-stage="${stageIndex}"`});
        if (p.finished && claim?.acknowledged) return `<span class="jv-earned">${icon('check')}Récit achevé</span>`;
        if (p.activeAttempt) return button('resume','Reprendre le combat','swords',{primary:true,disabled:busy || !onResume});
        if (selectedStage !== p.cleared || passage === 'outro') return button('current','Poursuivre le récit','book-open',{primary:true,disabled:busy || p.cleared >= allStagesOf(book).length});
        return button('start','Lancer le combat','swords',{primary:true,disabled:busy || !onStart || !stageAvailable(book,p,p.cleared)});
      }
      if (p.activeAttempt) return button('resume','Reprendre le combat','swords',{primary:true,disabled:busy || !onResume});
      if (!total || p.cleared >= total) return `<span class="jv-earned">${icon('hourglass')}Validation en attente</span>`;
      if (selectedStage !== p.cleared || passage === 'outro') return button('current','Étape suivante','arrow-right',{primary:true,disabled:busy});
      return button('start',p.cleared ? 'Lancer le combat' : 'Commencer le parcours','swords',{primary:true,disabled:busy || !onStart});
    }
    function readerMarkup(book,state,opening) {
      const p = progressOf(book,state), stages = allStagesOf(book), stage = stages[selectedStage], card = model(book.rewardModelId);
      const isReward = selectedStage === CARD_PAGE, done = !isReward && selectedStage < p.cleared;
      const admin = stage && !stageAvailable(book,p,selectedStage) && state.isAdmin;
      const next = nextStage(book,p,state), nextAvailable = next !== null;
      const outro = (done || state.isAdmin) && passage === 'outro';
      const paragraphs = stage && !isReward ? (outro ? stage.outro : stage.intro) : [];
      const sceneId = stage?.imageModelId || book.rewardModelId, scene = model(sceneId);
      const arena = (data.arenas || []).find(item => item.id === stage?.arenaId);
      return `<section class="jv-reader" data-jv-book="${esc(book.id)}" aria-label="${esc(titleOf(book))}" style="--jv-element:${elementOf(book).color}">
        <header class="jv-reader-toolbar">${tool('library','Fermer le livre','library')}<span>${esc(book.subtitle || characterOf(book))}</span><span class="jv-reader-status">${esc(statusLabel(p))} · ${cardCount(p)} / 4${visibleBonus(book,p) ? ' · '+(p.finished ? 'Récit achevé' : 'La suite du récit') : ''}</span></header>
        ${errorMarkup()}<div class="jv-spread${opening ? ' jv-book-opening' : ''}">
          ${sceneMarkup(book,stage,sceneId)}
          <aside class="jv-illustrated-page"><header><p class="jv-eyebrow">${esc(elementOf(book).label)}</p><h2 tabindex="-1" data-jv-key="book-title">${esc(titleOf(book))}</h2></header>
            <button type="button" class="jv-scene" data-jv-action="detail" data-jv-model="${esc(sceneId)}" aria-label="Voir la fiche de ${esc(scene?.name || book.subtitle)}" title="Voir la carte" ${!scene || !onDetail ? 'disabled' : ''}>${icon('scan-eye')}<span>${esc(scene?.name || book.subtitle)}${scene?.title ? `<small>${esc(scene.title)}</small>` : ''}</span></button>
          </aside>
          <section class="jv-story-page" aria-label="Parcours et récit">${routeMarkup(book,p,state)}
            <header class="jv-stage-heading"><p class="jv-eyebrow">${isReward ? 'Récompense' : `${admin ? 'Aperçu sans récompense · ' : ''}${selectedStage < 4 ? `Combat ${selectedStage+1} / 4` : `Chapitre ${selectedStage+1}`}${outro ? ' · Victoire' : ''}`}</p><h3 tabindex="-1" data-jv-key="stage-title">${esc(isReward ? card?.title || 'Le parcours achevé' : stage?.title || 'Parcours indisponible')}</h3>
            ${stage && (done || state.isAdmin) ? `<div class="jv-passages" role="group" aria-label="Passage du récit"><button type="button" data-jv-action="intro" data-jv-key="intro" aria-pressed="${!outro}">Avant le combat</button><button type="button" data-jv-action="outro" data-jv-key="outro" aria-pressed="${outro}">Après la victoire</button></div>` : ''}</header>
            <article class="jv-reading" tabindex="0" data-jv-key="reading" aria-label="${outro ? 'Après la victoire' : 'Récit du parcours'}">${isReward ? `<div class="jv-reward-page"><button type="button" class="jv-reward-card-link" data-jv-action="detail" data-jv-model="${esc(book.rewardModelId)}" aria-label="Voir la fiche de la carte récompense" ${!onDetail ? 'disabled' : ''}>${media(book.rewardModelId,'card',card?.name || book.subtitle,{lazy:false})}</button><p>${p.claimed ? 'Carte obtenue' : 'Récompense disponible'}</p><strong>${esc(card?.name || book.subtitle)}</strong></div>` : (Array.isArray(paragraphs) ? paragraphs : []).map(text => `<p>${esc(text)}</p>`).join('')}${admin ? `<p class="jv-admin-note">${icon('eye')}Aperçu sans progression ni récompense</p>` : ''}</article>
            <footer class="jv-stage-footer">${arena && !isReward ? `<span class="jv-arena">${icon('map-pin')}${esc(arena.name)}</span>` : ''}<div class="jv-stage-actions">${admin ? button('preview','Aperçu sans récompense','eye',{disabled:!!pending || !onPreview}) : primaryMarkup(book,p)}${state.isAdmin && stage && !admin ? tool('preview','Aperçu sans récompense','eye',pending || !onPreview ? 'disabled' : '') : ''}${tool('previous-stage','Étape précédente','chevron-left',selectedStage === 0 ? 'disabled' : '')}${tool('next-stage','Étape suivante','chevron-right',nextAvailable ? '' : 'disabled')}</div></footer>
          </section>
        </div><p class="jv-busy" role="status">${pending ? 'Action en cours…' : ''}</p>
      </section>`;
    }
    function nextStage(book,p,state) {
      const index = selectedStage === CARD_PAGE ? 4 : selectedStage+1;
      if (selectedStage === 3 && p.completed) return CARD_PAGE;
      return stageAvailable(book,p,index) || state.isAdmin && index < allStagesOf(book).length ? index : null;
    }
    function syncSelection(state) {
      const book = booksOf(state).find(item => item.id === selectedBook);
      if (!book) { selectedBook = null; return null; }
      const p = progressOf(book,state);
      if (p.cleared > lastCleared) { selectedStage = Math.max(0,p.cleared-1); passage = 'outro'; }
      lastCleared = p.cleared;
      if (selectedStage === CARD_PAGE ? !p.completed : !stageAvailable(book,p,selectedStage) && !state.isAdmin) {
        selectedStage = Math.min(p.cleared,visibleBonus(book,p) ? visibleBonus(book,p)+3 : 3); passage = 'intro';
      }
      if (selectedStage >= p.cleared && !state.isAdmin) passage = 'intro';
      return book;
    }
    function rememberLibrary() {
      const library = view?.querySelector('.jv-library'), shelf = view?.querySelector('.jv-shelf');
      if (library) libraryPosition.top = library.scrollTop;
      if (shelf) libraryPosition.left = shelf.scrollLeft;
    }
    function draw({opening = false, reset = false} = {}) {
      if (!view) return;
      const previousScene = view.querySelector('[data-jv-scene]')?.dataset.jvScene;
      rememberLibrary();
      if (reset && !selectedBook) { libraryPosition.left = 0; libraryPosition.top = 0; }
      const focused = view.contains(document.activeElement) ? document.activeElement : null;
      const focusKey = focused?.dataset.jvKey, selection = focused?.tagName === 'INPUT' ? [focused.selectionStart,focused.selectionEnd] : null;
      const scrolls = reset ? [] : ['.jv-reader','.jv-reading'].map(selector => [selector,view.querySelector(selector)?.scrollLeft || 0,view.querySelector(selector)?.scrollTop || 0]);
      const state = stateNow();
      paint++;
      view.setAttribute('aria-busy', String(state.status === 'loading' || !!pending));
      if (state.status !== 'ready') {
        view.innerHTML = `<section class="jv-message" ${state.status === 'error' ? 'role="alert"' : 'role="status"'}>${icon(state.status === 'error' ? 'book-x' : 'library')}<h1>${state.status === 'error' ? 'Fragment indisponible' : 'Ouverture de Fragment…'}</h1>${state.status === 'error' ? `<p>${esc(state.error?.message || state.error || 'Impossible de charger les parcours.')}</p>${button('refresh','Réessayer','refresh-cw',{disabled:!!pending})}${errorMarkup()}` : ''}</section>`;
      } else {
        const book = syncSelection(state);
        view.innerHTML = book ? readerMarkup(book,state,opening) : libraryMarkup(state);
      }
      hydrate(view);
      const panorama = view.querySelector('[data-jv-scene]'), picture = panorama?.querySelector('img');
      if (picture && panorama.dataset.jvScene !== previousScene && !reduced()) {
        const animate = () => { if (picture.isConnected) panorama.classList.add('jv-scene-enter'); };
        if (picture.complete && picture.naturalWidth) animate();
        else picture.addEventListener('load',animate,{once:true,signal:controller.signal});
      }
      for (const [selector,left,top] of scrolls) { const node = view.querySelector(selector); if (node) { node.scrollLeft = left; node.scrollTop = top; } }
      const library = view.querySelector('.jv-library'), shelf = view.querySelector('.jv-shelf');
      if (library) library.scrollTop = libraryPosition.top;
      if (shelf) shelf.scrollLeft = libraryPosition.left;
      if (focusKey) {
        const node = [...view.querySelectorAll('[data-jv-key]')].find(item => item.dataset.jvKey === focusKey);
        if (node && !node.disabled) { node.focus({preventScroll:true}); if (selection) try { node.setSelectionRange(...selection); } catch { /* Search inputs vary by browser. */ } }
      }
      updateShelf();
    }
    function focusKey(key) { [...(view?.querySelectorAll('[data-jv-key]') || [])].find(node => node.dataset.jvKey === key)?.focus({preventScroll:true}); }
    function openBook(id) {
      const state = stateNow(), book = booksOf(state).find(item => item.id === id);
      if (state.status !== 'ready' || !book) return;
      selectedBook = id;
      const p = progressOf(book,state), total = 4+visibleBonus(book,p);
      lastCleared = p.cleared;
      selectedStage = Math.min(Math.max(0,total-1), p.activeAttempt ? p.cleared : Math.max(0,p.cleared-1));
      passage = selectedStage < p.cleared ? 'outro' : 'intro';
      errorMessage = '';
      draw({opening:true,reset:true}); focusKey('book-title');
    }
    function selectStage(index) {
      const state = stateNow(), book = booksOf(state).find(item => item.id === selectedBook);
      if (!book || !Number.isInteger(index)) return;
      const p = progressOf(book,state);
      if (index === CARD_PAGE ? !p.completed : index < 0 || index >= allStagesOf(book).length || !stageAvailable(book,p,index) && !state.isAdmin) return;
      selectedStage = index; passage = index < p.cleared ? 'outro' : 'intro';
      draw({reset:true}); focusKey('stage-title');
    }
    async function run(callback,args,{claim = false} = {}) {
      if (!root || pending || !callback) return;
      const revision = generation, operation = {};
      pending = operation; errorMessage = '';
      if (claim) { claimBook = args[0]; claimStage = args[1] ?? null; }
      draw();
      try { await callback(...args); }
      catch (error) { if (revision === generation && root) report(error); }
      finally {
        if (revision === generation && root && pending === operation) {
          if (claim) { claimBook = null; claimStage = null; }
          pending = null; draw();
        }
      }
    }
    async function showDetail(node) {
      if (!onDetail || detailPending) return;
      const revision = generation, operation = {};
      detailPending = operation; node.disabled = true; node.setAttribute('aria-busy','true');
      try { await onDetail(node.dataset.jvModel); }
      catch (error) {
        if (revision !== generation || !root) return;
        if (reward) reward.dialog.querySelector('.jv-reward-error').textContent = error?.message || String(error);
        else { report(error); draw(); }
      } finally {
        if (revision === generation && detailPending === operation) {
          detailPending = null;
          if (node.isConnected) { node.disabled = false; node.removeAttribute('aria-busy'); }
        }
      }
    }
    function updateShelf() {
      const shelf = view?.querySelector('.jv-shelf');
      for (const [action,disabled] of [['shelf-left',!shelf || shelf.scrollLeft <= 1],['shelf-right',!shelf || shelf.scrollLeft+shelf.clientWidth >= shelf.scrollWidth-2]]) {
        const node = view?.querySelector(`[data-jv-action="${action}"]`);
        if (node) node.disabled = disabled;
      }
    }
    function scrollShelf(direction) {
      const shelf = view?.querySelector('.jv-shelf');
      shelf?.scrollBy({left:direction*Math.max(200,shelf.clientWidth*.8),behavior:reduced() ? 'instant' : 'smooth'});
    }
    function rewardBook(card) {
      const state = stateNow(), books = booksOf(state);
      return books.find(book => book.id === claimBook && String(book.rewardModelId) === String(card.id)) ||
        books.find(book => book.id === selectedBook && String(book.rewardModelId) === String(card.id)) ||
        books.find(book => String(book.rewardModelId) === String(card.id) && progressOf(book,state).claimed && !progressOf(book,state).acknowledged);
    }
    function revealReward(value,{alreadyOwned = false} = {}) {
      if (!root) return Promise.resolve(false);
      const card = typeof value === 'object' && value ? value : model(value);
      const book = card && rewardBook(card);
      if (!book) { report(Error('Parcours de la récompense introuvable.')); draw(); return Promise.resolve(false); }
      return ceremony({book,kind:'card',label:'Carte du parcours obtenue',markup:`<p class="jv-eyebrow">Quatre victoires</p><h2>${alreadyOwned ? 'Déjà dans votre collection' : 'Une carte vous rejoint'}</h2><p class="jv-reward-origin">${esc(titleOf(book))}</p><div class="jv-reward-display"><div class="jv-reward-engraving" aria-hidden="true"></div><button type="button" class="jv-reward-prize" data-jv-action="detail" data-jv-model="${esc(card.id)}" title="Voir la fiche de la carte" aria-label="Voir la fiche de ${esc(card.name || book.subtitle)}" ${!onDetail ? 'disabled' : ''}>${media(card.id,'card',card.name || book.subtitle,{lazy:false})}</button></div><div class="jv-reward-name"><strong>${esc(card.name || book.subtitle)}</strong><span>${esc(card.title || '')}</span></div><p class="jv-reward-note">${alreadyOwned ? 'Aucun deuxième exemplaire n’est ajouté.' : 'La récompense de ce parcours a été attribuée.'}</p>`});
    }
    function revealEquipment(item,{alreadyOwned = false} = {}) {
      if (!root || !item?.id || !item.name) return Promise.resolve(false);
      const state = stateNow();
      const matches = booksOf(state).flatMap(book => bonusOf(book).map((stage,offset) => ({book,stage:offset+4,id:stage.rewardEquipmentId})))
        .filter(match => match.id === item.id && stageAvailable(match.book,progressOf(match.book,state),match.stage) && claimOf(progressOf(match.book,state),match.stage));
      const match = matches.find(match => match.book.id === claimBook && match.stage === claimStage) ||
        matches.find(match => match.book.id === selectedBook && !claimOf(progressOf(match.book,state),match.stage).acknowledged) ||
        matches.find(match => !claimOf(progressOf(match.book,state),match.stage).acknowledged);
      if (!match) return Promise.resolve(false);
      equipmentItems.set(item.id,item);
      const face = globalThis.KalistarWeaponCards?.faces[item.id] || item.collectible;
      const illustration = face?.illustration || globalThis.KalistarWeaponArt?.get(item)?.scene;
      const kind = allStagesOf(match.book)[match.stage].rewardKind;
      const artMarkup = illustration ? `<img data-jv-equipment-media src="${esc(asset('assets/weapon-cards/'+illustration))}" alt="${esc(face?.alt || item.name)}" width="1000" height="700" decoding="async" draggable="false">` : `<span class="jv-missing-art" role="img" aria-label="Visuel indisponible">${icon('image')}</span>`;
      return ceremony({book:match.book,stage:match.stage,kind:'equipment',label:kindLabel(kind)+' obtenue',markup:`<p class="jv-eyebrow">${esc(kindLabel(kind))} · Chapitre ${match.stage+1}</p><h2>${alreadyOwned ? 'Déjà dans votre collection' : 'Un héritage vous rejoint'}</h2><p class="jv-reward-origin">${esc(titleOf(match.book))}</p><div class="jv-reward-display"><div class="jv-reward-engraving" aria-hidden="true"></div><div class="jv-reward-prize jv-equipment-art" data-jv-equipment="${esc(item.id)}">${artMarkup}</div></div><div class="jv-reward-name"><strong>${esc(item.name)}</strong></div><p class="jv-reward-note">${alreadyOwned ? 'Aucun deuxième exemplaire n’est ajouté.' : 'Cet équipement a rejoint votre collection.'}</p>`});
    }
    function revealSequel(value,index) {
      const state = stateNow(), book = booksOf(state).find(book => book.id === (typeof value === 'string' ? value : value?.id));
      if (!root || !book || !Number.isInteger(index) || index < 4 || index > 6) return Promise.resolve(false);
      const p = progressOf(book,state);
      if (!stageAvailable(book,p,index) || index < p.cleared) return Promise.resolve(false);
      const stage = allStagesOf(book)[index], narrative = stage.reveal || (index === 4 ? book.bonusReveal : null) || {title:stage.title};
      return ceremony({book,stage:index,kind:'sequel',label:'Une nouvelle page',markup:`<p class="jv-eyebrow">Le récit continue</p><div class="jv-sequel-leaf">${sceneMarkup(book,stage,stage.imageModelId || book.rewardModelId)}<div class="jv-sequel-seal" aria-hidden="true">${icon('gem')}</div><h2>${esc(narrative.title || stage.title)}</h2><div class="jv-sequel-paragraphs">${(Array.isArray(narrative.paragraphs) ? narrative.paragraphs : []).map(text => `<p>${esc(text)}</p>`).join('')}</div></div>`,command:'Ouvrir le chapitre'});
    }
    function ceremony({book,stage = null,kind,label,markup,command = 'Continuer'}) {
      if (reward) return reward.bookId === book.id && reward.stage === stage && reward.kind === kind ? reward.promise : Promise.resolve(false);
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      const dialog = document.createElement('dialog');
      dialog.className = 'jv-reward jv-'+kind+'-reveal'; dialog.setAttribute('aria-label',label);
      const current = reward = {dialog,bookId:book.id,stage,kind,promise,resolve,ready:false,events:new AbortController(),focus:document.activeElement};
      dialog.innerHTML = `<div class="jv-reward-ceremony">${markup}<p class="jv-reward-error" role="alert"></p>${button('acknowledge',command,kind === 'sequel' ? 'book-open' : 'check',{primary:true,disabled:true})}</div>`;
      root.append(dialog); hydrate(dialog);
      dialog.addEventListener('cancel', event => { event.preventDefault(); acknowledgeReward(); }, {signal:current.events.signal});
      dialog.addEventListener('close', () => {
        if (reward !== current) return;
        if (current.ready) acknowledgeReward();
        else dialog.showModal();
      }, {signal:current.events.signal});
      try {
        if (globalThis.KalistarDialogHistory) globalThis.KalistarDialogHistory.open(dialog);
        else dialog.showModal();
        // Finite CSS animations only: no RAF/timer loop, no automatic confirmation.
        const animations = dialog.getAnimations({subtree:true}).filter(animation => animation.effect?.getTiming().iterations !== Infinity);
        Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
          if (reward !== current || !root) return;
          current.ready = true;
          const button = dialog.querySelector('[data-jv-action="acknowledge"]');
          button.disabled = false;
          if (document.activeElement === dialog || !dialog.contains(document.activeElement)) button.focus({preventScroll:true});
        });
      } catch (error) { reward = null; current.events.abort(); dialog.remove(); resolve(false); report(error); draw(); }
      return promise;
    }
    function acknowledgeReward() {
      const current = reward;
      if (!current?.ready) return;
      reward = null; claimBook = null; claimStage = null; current.events.abort();
      current.dialog.close(); current.dialog.remove(); current.resolve(true);
      if (current.kind === 'sequel') { selectedBook = current.bookId; selectStage(current.stage); passage = 'intro'; draw({reset:true}); focusKey('stage-title'); }
      else { draw(); if (current.focus?.isConnected) current.focus.focus({preventScroll:true}); else focusKey('book-title'); }
    }
    async function resumeReward(book,index = null) {
      const revision = generation;
      const p = progressOf(book,stateNow()), claim = index === null ? null : claimOf(p,index);
      const item = index === null ? model(book.rewardModelId) : equipmentOf(claim?.equipmentId);
      if (!item) throw Error('Équipement indisponible. Actualisez le parcours.');
      const confirmed = await (index === null ? revealReward(item,{alreadyOwned:p.alreadyOwned}) : revealEquipment(item,{alreadyOwned:claim.alreadyOwned}));
      if (!confirmed || revision !== generation || !root) return;
      await (index === null ? onAcknowledge(book.id) : onAcknowledgeEquipment(book.id,index));
      if (revision !== generation || !root) return;
      const next = index === null ? 4 : index+1;
      await revealSequel(book,next);
    }
    function click(event) {
      const node = event.target.closest?.('[data-jv-action]');
      if (!node || !root?.contains(node) || node.disabled) return;
      const action = node.dataset.jvAction;
      if (action === 'acknowledge') { void acknowledgeReward(); return; }
      if (action === 'detail') { void showDetail(node); return; }
      if (reward) return;
      if (action === 'toggle-filters') { filtersOpen = !filtersOpen; draw(); return; }
      if (action === 'open') return openBook(node.dataset.jvBook);
      if (action === 'library') { const id = selectedBook; selectedBook = null; errorMessage = ''; draw(); focusKey('open-'+id); return; }
      if (action === 'refresh') return onRefresh ? void run(onRefresh,[]) : draw();
      if (action === 'dismiss-error') { errorMessage = ''; draw(); return; }
      if (action === 'reset-filters') { Object.keys(filters).forEach(key => { filters[key] = ''; }); draw({reset:true}); focusKey('filter-search'); return; }
      if (action === 'shelf-left' || action === 'shelf-right') return scrollShelf(action === 'shelf-left' ? -1 : 1);
      const state = stateNow(), book = booksOf(state).find(item => item.id === selectedBook);
      if (state.status !== 'ready' || !book) return;
      const p = progressOf(book,state), total = allStagesOf(book).length;
      if (action === 'stage') return selectStage(Number(node.dataset.jvStage));
      if (action === 'next-stage') { const next = nextStage(book,p,state); if (next !== null) selectStage(next); return; }
      if (action === 'previous-stage') return selectStage(selectedStage === CARD_PAGE ? 3 : selectedStage === 4 && p.completed ? CARD_PAGE : selectedStage-1);
      if (action === 'reward-page') return selectStage(CARD_PAGE);
      if (action === 'intro' || action === 'outro') { if (selectedStage !== CARD_PAGE && (selectedStage < p.cleared || state.isAdmin)) { passage = action; draw({reset:true}); } return; }
      if (action === 'current') return selectStage(p.cleared);
      if (action === 'start' && !p.activeAttempt && selectedStage === p.cleared && stageAvailable(book,p,p.cleared)) return void run(onStart,[book.id]);
      if (action === 'resume' && p.activeAttempt && stageAvailable(book,p,p.cleared)) return void run(onResume,[book.id]);
      if (action === 'claim' && p.completed && !p.claimed) return void run(onClaim,[book.id],{claim:true});
      if (action === 'reveal' && p.completed && p.claimed && !p.acknowledged) return void run(resumeReward,[book]);
      const index = Number(node.dataset.jvStage);
      if (index >= 4 && index <= 6 && index < p.cleared && stageAvailable(book,p,index)) {
        if (action === 'claim-equipment' && !claimOf(p,index)) return void run(onClaimEquipment,[book.id,index],{claim:true});
        if (action === 'reveal-equipment' && claimOf(p,index) && !claimOf(p,index).acknowledged && onAcknowledgeEquipment) return void run(resumeReward,[book,index]);
      }
      if (action === 'preview' && state.isAdmin && selectedStage >= 0 && selectedStage < total) return void run(onPreview,[book.id,selectedStage]);
    }
    function filter(event) {
      const node = event.target, key = node.dataset?.jvFilter;
      if (!Object.hasOwn(filters,key) || event.type !== (key === 'search' ? 'input' : 'change')) return;
      filters[key] = node.value; draw({reset:true});
    }
    function keydown(event) {
      if (reward) return;
      const shelf = event.target.closest?.('.jv-shelf');
      if (shelf && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        const buttons = [...shelf.querySelectorAll('.jv-cover')], index = buttons.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length-1 : Math.max(0,Math.min(buttons.length-1,index+(event.key === 'ArrowLeft' ? -1 : 1)));
        buttons[next]?.focus({preventScroll:true});
        buttons[next]?.scrollIntoView({block:'nearest',inline:'center',behavior:reduced() ? 'instant' : 'smooth'});
      } else if (event.key === 'Escape' && selectedBook && !event.target.matches('input,select')) {
        event.preventDefault(); const id = selectedBook; selectedBook = null; draw(); focusKey('open-'+id);
      }
    }
    function mount(target) {
      destroy();
      root = target; controller = new AbortController();
      view = document.createElement('div'); view.className = 'jv-view';
      root.replaceChildren(view);
      const signal = controller.signal;
      root.addEventListener('click',click,{signal});
      root.addEventListener('input',filter,{signal}); root.addEventListener('change',filter,{signal});
      root.addEventListener('submit',event => { if (event.target.matches('.jv-filters')) event.preventDefault(); },{signal});
      root.addEventListener('keydown',keydown,{signal});
      root.addEventListener('scroll',event => { if (event.target.matches('.jv-shelf')) updateShelf(); },{capture:true,passive:true,signal});
      root.addEventListener('error',event => { if (event.target.matches('img[data-jv-media],img[data-jv-cover-model],img[data-jv-equipment-media],.jv-panorama img')) { event.target.classList.add('jv-media-unavailable'); event.target.alt = 'Visuel indisponible'; } },{capture:true,signal});
      if (globalThis.ResizeObserver) {
        observer = new ResizeObserver(() => {
          cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { frame = 0; updateShelf(); });
        }); observer.observe(root);
      }
      draw();
    }
    function refresh() { draw(); }
    function destroy() {
      generation++; paint++;
      rememberLibrary();
      controller?.abort(); controller = null; observer?.disconnect(); observer = null;
      cancelAnimationFrame(frame); frame = 0;
      if (reward) { const current = reward; reward = null; current.events.abort(); for (const animation of current.dialog.getAnimations?.({subtree:true}) || []) animation.cancel(); current.dialog.close(); current.dialog.remove(); current.resolve(false); }
      if (view) { for (const animation of view.getAnimations?.({subtree:true}) || []) animation.cancel(); view.remove(); }
      root = null; view = null; pending = null; detailPending = null; claimBook = null; claimStage = null; errorMessage = ''; equipmentItems.clear();
    }
    return {mount,refresh,destroy,revealReward,revealEquipment,revealSequel};
  }
  return {create};
});
