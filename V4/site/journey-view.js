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
  const coverElements = new Set(['ELECTRO','PYRO','HYDRO','CRYO','AERO','HERBO','GEO','HEMATO','NECRO','LUXO','RAINBOW']);

  function create({data = {}, image, art, getState, onStart, onResume, onClaim, onAcknowledge, onPreview, onDetail, onRefresh, toast} = {}) {
    let root = null, view = null, controller = null, observer = null, frame = 0;
    let generation = 0, paint = 0, selectedBook = null, selectedStage = 0, passage = 'intro', lastCleared = 0;
    let pending = null, detailPending = null, claimBook = null, errorMessage = '', reward = null;
    const libraryPosition = {left:0,top:0};
    const filters = {character:'', element:'', status:'', search:''};
    const cards = new Map((data.cards || []).map(card => [String(card.id), card]));
    const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const model = id => cards.get(String(id));
    const booksOf = state => Array.isArray(state.books) ? state.books : [];
    const stagesOf = book => Array.isArray(book?.stages) ? book.stages : [];
    const titleOf = book => String(book.title || book.subtitle || 'Parcours');
    const characterOf = book => model(book.rewardModelId)?.name || book.subtitle || book.characterId;
    function stateNow() {
      try {
        const state = getState?.();
        return state && ['ready','loading','error'].includes(state.status) ? state : {status:'loading'};
      } catch (error) { return {status:'error', error}; }
    }
    function progressOf(book, state) {
      const value = state.progress?.[book.id] || {}, total = stagesOf(book).length;
      return {
        cleared:Math.max(0, Math.min(total, Number.isFinite(value.cleared) ? Math.floor(value.cleared) : 0)),
        completed:value.completed === true, claimed:value.claimed === true,
        acknowledged:value.acknowledged === true, activeAttempt:value.activeAttempt || null
      };
    }
    const statusOf = p => p.claimed ? 'claimed' : p.completed ? 'reward' : p.activeAttempt || p.cleared ? 'started' : 'new';
    const statusLabel = p => ({claimed:'Achevé', reward:'Récompense disponible', started:p.activeAttempt ? 'Combat en cours' : 'En cours', new:'À découvrir'}[statusOf(p)]);
    function elementOf(book) {
      const value = data.elements?.[book.element];
      return {label:value?.label || (book.element === 'NONE' ? 'Sans cristal' : book.element || 'Sans cristal'),
        color:/^#?[\da-f]{6}$/i.test(value?.color || '') ? '#' + value.color.replace(/^#/, '') : '#a4c7bd'};
    }
    function coverOf(book) {
      return asset(coverElements.has(book.element) ? `assets/ui/story-books/${book.element.toLowerCase()}-book-v1.webp` : 'assets/ui/story-closed-grimoire-v2.webp');
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
      return `<section class="jv-library" aria-label="Bibliothèque de parcours">
        <header class="jv-library-heading"><div><p class="jv-eyebrow">Kalistar</p><h1>Bibliothèque de parcours</h1></div><span class="jv-library-total">${all.filter(book => progressOf(book,state).claimed).length} / ${all.length} achevés</span></header>
        <form class="jv-filters" role="search" aria-label="Filtrer les parcours">
          <label class="jv-search"><span class="jv-sr-only">Rechercher un parcours</span>${icon('search')}<input type="search" data-jv-filter="search" data-jv-key="filter-search" value="${esc(filters.search)}" placeholder="Rechercher un parcours" autocomplete="off"></label>
          ${select('character','Personnage',characters)}${select('element','Cristal',elements)}${select('status','État',[['new','À découvrir'],['started','En cours'],['reward','Récompense disponible'],['claimed','Achevé']])}
          ${tool('reset-filters','Réinitialiser les filtres','filter-x',Object.values(filters).some(Boolean) ? '' : 'disabled')}
        </form>${errorMarkup()}
        <div class="jv-shelf-heading"><p role="status">${books.length} livre${books.length === 1 ? '' : 's'}</p><div class="jv-shelf-tools">${tool('shelf-left','Livres précédents','chevron-left')}${tool('shelf-right','Livres suivants','chevron-right')}</div></div>
        ${books.length ? `<div class="jv-shelf" tabindex="0" role="region" aria-label="Rayonnage des parcours" data-jv-key="shelf"><ol class="jv-volumes">${books.map(book => {
          const p = progressOf(book,state), card = model(book.rewardModelId), total = stagesOf(book).length;
          return `<li class="jv-volume" style="--jv-element:${elementOf(book).color}">
            <button type="button" class="jv-cover" data-jv-action="open" data-jv-book="${esc(book.id)}" data-jv-key="open-${esc(book.id)}" aria-label="${p.claimed ? 'Consulter' : 'Ouvrir'} ${esc(titleOf(book))}, ${esc(statusLabel(p))}">
              <span class="jv-cover-object"><img class="jv-cover-skin" src="${esc(coverOf(book))}" alt="" width="1024" height="1536" decoding="async" draggable="false">
                <span class="jv-cover-inscription"><span class="jv-cover-character">${esc(book.subtitle || characterOf(book))}</span><span class="jv-cover-title">${esc(titleOf(book))}</span></span>
                <span class="jv-cover-card">${media(book.rewardModelId,'card',`Carte récompense : ${card?.name || book.subtitle}`)}</span>
                <span class="jv-cover-seal" aria-hidden="true">${icon(p.claimed ? 'check' : 'gem')}</span>
              </span><span class="jv-cover-command">${icon(p.claimed ? 'book-open' : p.cleared || p.activeAttempt ? 'bookmark' : 'book-open')}<span>${p.claimed ? 'Consulter' : p.cleared || p.activeAttempt ? 'Poursuivre' : 'Ouvrir'}</span>${icon('chevron-right')}</span>
            </button>
            <div class="jv-volume-meta"><span class="jv-volume-element"><span class="jv-element-dot" aria-hidden="true"></span>${esc(elementOf(book).label)}</span><span class="jv-volume-state" data-state="${statusOf(p)}">${esc(statusLabel(p))}</span><progress max="${Math.max(1,total)}" value="${p.cleared}" aria-label="${esc(titleOf(book))} : ${p.cleared} combats gagnés sur ${total}"></progress><span class="jv-volume-count">${p.cleared} / ${total} combats</span></div>
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
      }).join('')}<li class="jv-route-end ${p.claimed ? 'is-done' : p.completed ? 'is-current' : 'is-locked'}"><button type="button" data-jv-action="reward-page" data-jv-key="reward-page" aria-label="${p.claimed ? 'Carte obtenue' : 'Récompense du parcours'}" title="Récompense" ${selectedStage === stages.length ? 'aria-current="step"' : ''} ${!p.completed ? 'disabled' : ''}><span class="jv-station">${icon(p.claimed ? 'check' : 'x')}</span><span class="jv-station-label">Carte</span></button></li></ol></nav>`;
    }
    function primaryMarkup(book,p) {
      const total = stagesOf(book).length, busy = !!pending;
      if (p.completed) {
        if (!p.claimed) return button('claim','Recevoir la carte','gem',{primary:true,disabled:busy || !onClaim});
        if (!p.acknowledged) return button('reveal','Voir la carte obtenue','gem',{primary:true,disabled:busy || !onAcknowledge});
        return `<span class="jv-earned">${icon('check')}Carte déjà obtenue</span>`;
      }
      if (p.activeAttempt) return button('resume','Reprendre le combat','swords',{primary:true,disabled:busy || !onResume});
      if (!total || p.cleared >= total) return `<span class="jv-earned">${icon('hourglass')}Validation en attente</span>`;
      if (selectedStage !== p.cleared || passage === 'outro') return button('current','Étape suivante','arrow-right',{primary:true,disabled:busy});
      return button('start',p.cleared ? 'Lancer le combat' : 'Commencer le parcours','swords',{primary:true,disabled:busy || !onStart});
    }
    function readerMarkup(book,state,opening) {
      const p = progressOf(book,state), stages = stagesOf(book), stage = stages[selectedStage], card = model(book.rewardModelId);
      const done = selectedStage < p.cleared, isReward = selectedStage === stages.length;
      const locked = stage && !done && (p.completed || selectedStage > p.cleared), admin = locked && state.isAdmin;
      const nextAvailable = selectedStage+1 < stages.length ? state.isAdmin || selectedStage+1 <= p.cleared : selectedStage+1 === stages.length && p.completed;
      const outro = done && passage === 'outro';
      const paragraphs = stage && !isReward ? (outro ? stage.outro : stage.intro) : [];
      const sceneId = stage?.imageModelId || book.rewardModelId, scene = model(sceneId);
      const arena = (data.arenas || []).find(item => item.id === stage?.arenaId);
      return `<section class="jv-reader" aria-label="${esc(titleOf(book))}" style="--jv-element:${elementOf(book).color}">
        <header class="jv-reader-toolbar">${tool('library','Fermer le livre','library')}<span>${esc(book.subtitle || characterOf(book))}</span><span class="jv-reader-status">${esc(statusLabel(p))} · ${p.cleared} / ${stages.length}</span></header>
        ${errorMarkup()}<div class="jv-spread${opening ? ' jv-book-opening' : ''}">
          <aside class="jv-illustrated-page"><header><p class="jv-eyebrow">${esc(elementOf(book).label)}</p><h2 tabindex="-1" data-jv-key="book-title">${esc(titleOf(book))}</h2></header>
            <button type="button" class="jv-scene" data-jv-action="detail" data-jv-model="${esc(sceneId)}" aria-label="Voir la fiche de ${esc(scene?.name || book.subtitle)}" title="Voir la carte" ${!scene || !onDetail ? 'disabled' : ''}>${media(sceneId,'art',scene?.title || stage?.title || titleOf(book),{lazy:false})}<span class="jv-scene-zoom" aria-hidden="true">${icon('scan-eye')}</span></button>
            <p class="jv-scene-caption">${esc(scene?.name || book.subtitle)}${scene?.title ? `<span>${esc(scene.title)}</span>` : ''}</p>
          </aside>
          <section class="jv-story-page" aria-label="Parcours et récit">${routeMarkup(book,p,state)}
            <header class="jv-stage-heading"><p class="jv-eyebrow">${isReward ? 'Récompense' : `${admin ? 'Aperçu admin · ' : ''}Combat ${selectedStage+1} / ${stages.length}${outro ? ' · Victoire' : ''}`}</p><h3 tabindex="-1" data-jv-key="stage-title">${esc(isReward ? card?.title || 'Le parcours achevé' : stage?.title || 'Parcours indisponible')}</h3>
            ${stage && done ? `<div class="jv-passages" role="group" aria-label="Passage du récit"><button type="button" data-jv-action="intro" data-jv-key="intro" aria-pressed="${!outro}">Avant le combat</button><button type="button" data-jv-action="outro" data-jv-key="outro" aria-pressed="${outro}">Après la victoire</button></div>` : ''}</header>
            <article class="jv-reading" tabindex="0" data-jv-key="reading" aria-label="${outro ? 'Après la victoire' : 'Récit du parcours'}">${isReward ? `<div class="jv-reward-page"><button type="button" class="jv-reward-card-link" data-jv-action="detail" data-jv-model="${esc(book.rewardModelId)}" aria-label="Voir la fiche de la carte récompense" ${!onDetail ? 'disabled' : ''}>${media(book.rewardModelId,'card',card?.name || book.subtitle,{lazy:false})}</button><p>${p.claimed ? 'Carte obtenue' : 'Récompense disponible'}</p><strong>${esc(card?.name || book.subtitle)}</strong></div>` : (Array.isArray(paragraphs) ? paragraphs : []).map(text => `<p>${esc(text)}</p>`).join('')}${admin ? `<p class="jv-admin-note">${icon('eye')}Aperçu sans progression ni récompense</p>` : ''}</article>
            <footer class="jv-stage-footer">${arena && !isReward ? `<span class="jv-arena">${icon('map-pin')}${esc(arena.name)}</span>` : ''}<div class="jv-stage-actions">${admin ? button('preview','Aperçu du combat','eye',{disabled:!!pending || !onPreview}) : primaryMarkup(book,p)}${state.isAdmin && stage && !admin ? tool('preview','Aperçu admin du combat','eye',pending || !onPreview ? 'disabled' : '') : ''}${tool('previous-stage','Étape précédente','chevron-left',selectedStage === 0 ? 'disabled' : '')}${tool('next-stage','Étape suivante','chevron-right',nextAvailable ? '' : 'disabled')}</div></footer>
          </section>
        </div><p class="jv-busy" role="status">${pending ? 'Action en cours…' : ''}</p>
      </section>`;
    }
    function syncSelection(state) {
      const book = booksOf(state).find(item => item.id === selectedBook);
      if (!book) { selectedBook = null; return null; }
      const p = progressOf(book,state), total = stagesOf(book).length;
      if (p.cleared > lastCleared) { selectedStage = Math.max(0,p.cleared-1); passage = 'outro'; }
      lastCleared = p.cleared;
      selectedStage = Math.min(selectedStage,total);
      if (!state.isAdmin && (selectedStage > p.cleared || selectedStage === total && !p.completed)) { selectedStage = Math.min(p.cleared,Math.max(0,total-1)); passage = 'intro'; }
      if (selectedStage >= p.cleared) passage = 'intro';
      return book;
    }
    function rememberLibrary() {
      const library = view?.querySelector('.jv-library'), shelf = view?.querySelector('.jv-shelf');
      if (library) libraryPosition.top = library.scrollTop;
      if (shelf) libraryPosition.left = shelf.scrollLeft;
    }
    function draw({opening = false, reset = false} = {}) {
      if (!view) return;
      rememberLibrary();
      if (reset && !selectedBook) { libraryPosition.left = 0; libraryPosition.top = 0; }
      const focused = view.contains(document.activeElement) ? document.activeElement : null;
      const focusKey = focused?.dataset.jvKey, selection = focused?.tagName === 'INPUT' ? [focused.selectionStart,focused.selectionEnd] : null;
      const scrolls = reset ? [] : ['.jv-reader','.jv-reading'].map(selector => [selector,view.querySelector(selector)?.scrollLeft || 0,view.querySelector(selector)?.scrollTop || 0]);
      const state = stateNow();
      paint++;
      view.setAttribute('aria-busy', String(state.status === 'loading' || !!pending));
      if (state.status !== 'ready') {
        view.innerHTML = `<section class="jv-message" ${state.status === 'error' ? 'role="alert"' : 'role="status"'}>${icon(state.status === 'error' ? 'book-x' : 'library')}<h1>${state.status === 'error' ? 'Bibliothèque indisponible' : 'Ouverture de la bibliothèque…'}</h1>${state.status === 'error' ? `<p>${esc(state.error?.message || state.error || 'Impossible de charger les parcours.')}</p>${button('refresh','Réessayer','refresh-cw',{disabled:!!pending})}${errorMarkup()}` : ''}</section>`;
      } else {
        const book = syncSelection(state);
        view.innerHTML = book ? readerMarkup(book,state,opening) : libraryMarkup(state);
      }
      hydrate(view);
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
      const p = progressOf(book,state), total = stagesOf(book).length;
      lastCleared = p.cleared;
      selectedStage = Math.min(Math.max(0,total-1), p.activeAttempt ? p.cleared : Math.max(0,p.cleared-1));
      passage = selectedStage < p.cleared ? 'outro' : 'intro';
      errorMessage = '';
      draw({opening:true,reset:true}); focusKey('book-title');
    }
    function selectStage(index) {
      const state = stateNow(), book = booksOf(state).find(item => item.id === selectedBook);
      if (!book || !Number.isInteger(index)) return;
      const p = progressOf(book,state), total = stagesOf(book).length;
      if (index < 0 || index > total || index === total && !p.completed || index < total && index > p.cleared && !state.isAdmin) return;
      selectedStage = index; passage = index < p.cleared ? 'outro' : 'intro';
      draw({reset:true}); focusKey('stage-title');
    }
    async function run(callback,args,{claim = false} = {}) {
      if (!root || pending || !callback) return;
      const revision = generation, operation = {};
      pending = operation; errorMessage = '';
      if (claim) claimBook = args[0];
      draw();
      try { await callback(...args); }
      catch (error) { if (revision === generation && root) report(error); }
      finally {
        if (revision === generation && root && pending === operation) {
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
      if (reward) return reward.bookId === book.id ? reward.promise : Promise.resolve(false);
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      const dialog = document.createElement('dialog');
      dialog.className = 'jv-reward'; dialog.setAttribute('aria-label','Carte du parcours obtenue');
      reward = {dialog,bookId:book.id,promise,resolve,closing:false,focus:document.activeElement};
      dialog.innerHTML = `<div class="jv-reward-ceremony"><p class="jv-eyebrow">Parcours achevé</p><h2>${alreadyOwned ? 'Déjà dans votre collection' : 'Une carte vous rejoint'}</h2><p class="jv-reward-origin">${esc(titleOf(book))}</p><div class="jv-reward-display"><div class="jv-reward-engraving" aria-hidden="true"></div><button type="button" class="jv-reward-prize" data-jv-action="detail" data-jv-model="${esc(card.id)}" title="Voir la fiche de la carte" aria-label="Voir la fiche de ${esc(card.name || book.subtitle)}" ${!onDetail ? 'disabled' : ''}>${media(card.id,'card',card.name || book.subtitle,{lazy:false})}</button></div><div class="jv-reward-name"><strong>${esc(card.name || book.subtitle)}</strong><span>${esc(card.title || '')}</span></div><p class="jv-reward-note">${alreadyOwned ? 'Aucun deuxième exemplaire n’est ajouté.' : 'La récompense de ce parcours a été attribuée.'}</p><p class="jv-reward-error" role="alert"></p>${button('acknowledge','Continuer','check',{primary:true})}</div>`;
      root.append(dialog); hydrate(dialog);
      dialog.addEventListener('cancel', event => { event.preventDefault(); void acknowledgeReward(); }, {signal:controller.signal});
      dialog.addEventListener('close', () => { if (reward?.dialog === dialog && !reward.closing) void acknowledgeReward(); }, {signal:controller.signal});
      try {
        if (globalThis.KalistarDialogHistory) globalThis.KalistarDialogHistory.open(dialog);
        else dialog.showModal();
        dialog.querySelector('[data-jv-action="acknowledge"]')?.focus({preventScroll:true});
      } catch (error) { reward = null; dialog.remove(); resolve(false); report(error); draw(); }
      return promise;
    }
    async function acknowledgeReward() {
      const current = reward;
      if (!current || current.closing) return;
      current.closing = true;
      const revision = generation, button = current.dialog.querySelector('[data-jv-action="acknowledge"]');
      button.disabled = true; button.setAttribute('aria-busy','true');
      try {
        const book = booksOf(stateNow()).find(item => item.id === current.bookId);
        if (!book) throw Error('Parcours indisponible. Réessayez.');
        if (!progressOf(book,stateNow()).acknowledged) {
          if (!onAcknowledge) throw Error('Validation indisponible. Réessayez.');
          await onAcknowledge(current.bookId);
        }
        if (revision !== generation || reward !== current) return;
        reward = null; claimBook = null;
        current.dialog.close(); current.dialog.remove(); current.resolve(true);
        draw();
        if (current.focus?.isConnected) current.focus.focus({preventScroll:true});
        else focusKey('book-title');
      } catch (error) {
        if (revision !== generation || reward !== current) return;
        current.closing = false; button.disabled = false; button.removeAttribute('aria-busy');
        current.dialog.querySelector('.jv-reward-error').textContent = error?.message || String(error);
        if (!current.dialog.open) current.dialog.showModal();
        button.focus({preventScroll:true});
      }
    }
    function click(event) {
      const node = event.target.closest?.('[data-jv-action]');
      if (!node || !root?.contains(node) || node.disabled) return;
      const action = node.dataset.jvAction;
      if (action === 'acknowledge') { void acknowledgeReward(); return; }
      if (action === 'detail') { void showDetail(node); return; }
      if (reward) return;
      if (action === 'open') return openBook(node.dataset.jvBook);
      if (action === 'library') { const id = selectedBook; selectedBook = null; errorMessage = ''; draw(); focusKey('open-'+id); return; }
      if (action === 'refresh') return onRefresh ? void run(onRefresh,[]) : draw();
      if (action === 'dismiss-error') { errorMessage = ''; draw(); return; }
      if (action === 'reset-filters') { Object.keys(filters).forEach(key => { filters[key] = ''; }); draw({reset:true}); focusKey('filter-search'); return; }
      if (action === 'shelf-left' || action === 'shelf-right') return scrollShelf(action === 'shelf-left' ? -1 : 1);
      const state = stateNow(), book = booksOf(state).find(item => item.id === selectedBook);
      if (state.status !== 'ready' || !book) return;
      const p = progressOf(book,state), total = stagesOf(book).length;
      if (action === 'stage') return selectStage(Number(node.dataset.jvStage));
      if (action === 'previous-stage' || action === 'next-stage') return selectStage(selectedStage+(action === 'previous-stage' ? -1 : 1));
      if (action === 'reward-page') return selectStage(total);
      if (action === 'intro' || action === 'outro') { if (selectedStage < p.cleared) { passage = action; draw({reset:true}); } return; }
      if (action === 'current') return selectStage(p.cleared);
      if (action === 'start' && !p.completed && !p.activeAttempt && p.cleared < total && selectedStage === p.cleared) return void run(onStart,[book.id]);
      if (action === 'resume' && p.activeAttempt && !p.completed) return void run(onResume,[book.id]);
      if (action === 'claim' && p.completed && !p.claimed) return void run(onClaim,[book.id],{claim:true});
      if (action === 'reveal' && p.completed && p.claimed && !p.acknowledged) return void revealReward(model(book.rewardModelId));
      if (action === 'preview' && state.isAdmin && selectedStage < total) return void run(onPreview,[book.id,selectedStage]);
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
      root.addEventListener('error',event => { if (event.target.matches('img[data-jv-media]')) { event.target.classList.add('jv-media-unavailable'); event.target.alt = 'Visuel indisponible'; } },{capture:true,signal});
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
      if (reward) { const current = reward; reward = null; for (const animation of current.dialog.getAnimations?.({subtree:true}) || []) animation.cancel(); current.dialog.close(); current.dialog.remove(); current.resolve(false); }
      if (view) { for (const animation of view.getAnimations?.({subtree:true}) || []) animation.cancel(); view.remove(); }
      root = null; view = null; pending = null; detailPending = null; claimBook = null; errorMessage = '';
    }
    return {mount,refresh,destroy,revealReward};
  }
  return {create};
});
