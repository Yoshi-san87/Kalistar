(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function create({storageKey = 'kalistar.v4.story-progress'} = {}) {
    let root = null, manuscript = null, loading = null, saveTimer = 0, observer = null, wordCounts = [], wordTotal = 0;
    let state = {section: 0, ratio: 0, size: 'regular', paper: 'day'};
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      state = {...state, ...saved};
      if (!['small','regular','large'].includes(state.size)) state.size = 'regular';
      if (!['day','night'].includes(state.paper)) state.paper = 'day';
      if (!Number.isInteger(state.section) || state.section < 0) state.section = 0;
      state.ratio = Number.isFinite(state.ratio) ? Math.max(0, Math.min(1, state.ratio)) : 0;
    } catch { /* Browser storage can be disabled; reading still works. */ }

    const wordCount = text => (text.match(/\S+/g) || []).length;
    const sectionWords = (section, index = manuscript.sections.indexOf(section)) => wordCounts[index] || 0;
    const sectionMinutes = section => Math.max(1, Math.ceil(sectionWords(section) / 220));
    const totalWords = () => wordTotal;
    const sectionProgress = ratio => Math.round(ratio * 100);
    function sceneMarkup(scene) {
      const card = window.KALISTAR_DATA?.cards?.find(item => String(item.id) === scene.cardId);
      if (!card?.pngUrl) return '';
      const fullImage = window.KalistarSite?.url(card.pngUrl) || card.pngUrl;
      const illustration = window.KalistarCardMedia?.image(card, 'art') || fullImage;
      return `<figure class="story-illustration">
        <button type="button" class="story-illustration-trigger" data-story-preview data-story-full="${escape(fullImage)}" data-story-alt="Carte complète de ${escape(card.name)} · ${escape(card.title)}" data-story-caption="${escape(scene.caption)}" aria-label="Agrandir la carte de ${escape(card.name)}">
          <img src="${escape(illustration)}" alt="${escape(scene.alt)}" width="460" height="880" loading="lazy" decoding="async">
          <span class="story-illustration-zoom" aria-hidden="true"><i data-lucide="expand"></i></span>
        </button>
        <figcaption>${escape(scene.caption)}</figcaption>
      </figure>`;
    }
    function bookProgress(ratio = state.ratio) {
      const sections = manuscript.sections;
      const before = sections.slice(0, state.section).reduce((sum, section) => sum + sectionWords(section), 0);
      return Math.round((before + sectionWords(sections[state.section]) * ratio) / totalWords() * 100);
    }
    function save(ratio = state.ratio) {
      state.ratio = Math.max(0, Math.min(1, ratio));
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Reading remains available without progress storage. */ }
    }
    function fitBook() {
      if (!root || matchMedia('(max-width: 850px), (max-width: 950px) and (max-height: 500px)').matches) return;
      const stage = root.querySelector('.story-reader'), book = root.querySelector('.story-reader-book');
      if (!stage || !book) return;
      const ratio = 1692 / 940, width = Math.min(stage.clientWidth, stage.clientHeight * ratio);
      book.style.width = `${Math.max(0, width)}px`;
      book.style.height = `${Math.max(0, width / ratio)}px`;
    }
    function progressMarkup(ratio) {
      const overall = bookProgress(ratio), current = sectionProgress(ratio);
      return `<div class="story-progress" aria-label="Repère dans le livre">
        <div class="story-progress-heading"><span>Repère dans le livre</span><b class="story-progress-label">${overall}%</b></div>
        <div class="story-progress-track" role="progressbar" aria-label="Position dans Le Réveil" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${overall}"><span class="story-book-progress-fill" style="width:${overall}%"></span></div>
        <div class="story-progress-foot"><span>${manuscript.sections.length} sections · ${totalWords().toLocaleString('fr-FR')} mots</span><span class="story-section-progress-label">${current}% du chapitre</span></div>
      </div>`;
    }
    function render({restore = false} = {}) {
      if (!root || !manuscript) return;
      state.section = Math.max(0, Math.min(manuscript.sections.length - 1, state.section));
      const section = manuscript.sections[state.section], ratio = restore ? state.ratio : 0;
      const previous = state.section > 0 ? manuscript.sections[state.section - 1] : null;
      const next = state.section < manuscript.sections.length - 1 ? manuscript.sections[state.section + 1] : null;
      const chapters = manuscript.sections.map((item, index) => `<button class="story-chapter" type="button" data-story-section="${index}" ${index === state.section ? 'aria-current="page"' : ''}>
        <span class="story-chapter-number">${escape(item.label)}</span><span class="story-chapter-name">${escape(item.title)}</span>
      </button>`).join('');
      const options = manuscript.sections.map((item, index) => `<option value="${index}" ${index === state.section ? 'selected' : ''}>${escape(item.label)} · ${escape(item.title)}</option>`).join('');
      const themeLabel = state.paper === 'day' ? 'Passer en mode nuit' : 'Passer en mode papier';
      const scenes = new Map((section.illustrations || []).map(scene => [scene.afterParagraph, scene]));
      root.innerHTML = `<section class="story-reader" data-paper="${state.paper}" data-text-size="${state.size}" aria-label="Liseuse Kalistar">
        <div class="story-reader-book">
          <aside class="story-toc" aria-label="Sommaire du livre">
            <div class="story-book-heading"><span class="story-book-sigil"><i data-lucide="sparkles"></i></span><p class="story-kicker">${escape(manuscript.series)} · ${escape(manuscript.volume)}</p><h1>${escape(manuscript.title)}</h1><p class="story-book-subtitle">Le premier tome</p></div>
            ${progressMarkup(ratio)}
            <nav class="story-chapters" aria-label="Sections">
              <p class="story-toc-label">Dans ce volume</p>${chapters}
            </nav>
            <p class="story-toc-quote">${escape(manuscript.epigraph)}<span>${escape(manuscript.attribution)}</span></p>
          </aside>
          <main class="story-reading-page">
            <header class="story-reading-header">
              <div class="story-current-heading"><span class="story-kicker">${escape(section.label)} · ${sectionMinutes(section)} min de lecture</span><h2 tabindex="-1" aria-live="polite">${escape(section.title)}</h2></div>
              <div class="story-reading-tools" role="group" aria-label="Réglages de lecture">
                <select class="story-chapter-picker" data-story-select aria-label="Choisir un chapitre">${options}</select>
                <button type="button" data-story-action="smaller" title="Réduire la taille du texte" aria-label="Réduire la taille du texte" ${state.size === 'small' ? 'disabled' : ''}>A−</button>
                <button type="button" data-story-action="larger" title="Agrandir la taille du texte" aria-label="Agrandir la taille du texte" ${state.size === 'large' ? 'disabled' : ''}>A+</button>
                <button type="button" class="story-theme-toggle" data-story-action="theme" title="${themeLabel}" aria-label="${themeLabel}"><i data-lucide="${state.paper === 'day' ? 'moon' : 'sun'}"></i></button>
              </div>
            </header>
            <article class="story-text" tabindex="0" aria-label="${escape(section.label)} : ${escape(section.title)}">
              ${section.paragraphs.map((paragraph, index) => `<p>${escape(paragraph)}</p>${scenes.has(index) ? sceneMarkup(scenes.get(index)) : ''}`).join('')}
            </article>
            <footer class="story-reading-footer">
              <button type="button" data-story-action="previous" ${previous ? '' : 'disabled'}><i data-lucide="chevron-left"></i><span>${previous ? escape(previous.label) : 'Début'}</span></button>
              <div class="story-page-progress"><span>${escape(section.label)} · ${sectionProgress(ratio)}%</span><div class="story-progress-track"><span class="story-section-progress-fill" style="width:${sectionProgress(ratio)}%"></span></div></div>
              <button type="button" data-story-action="next" ${next ? '' : 'disabled'}><span>${next ? escape(next.label) : 'Fin'}</span><i data-lucide="chevron-right"></i></button>
            </footer>
          </main>
        </div>
        <dialog class="story-card-dialog" data-story-dialog aria-label="Carte illustrant le récit">
          <header><span class="story-kicker">Carte du récit</span><button type="button" data-story-action="close-card" aria-label="Fermer la carte"><i data-lucide="x"></i></button></header>
          <figure><img data-story-full-image alt=""><figcaption data-story-dialog-caption></figcaption></figure>
        </dialog>
      </section>`;
      fitBook();
      window.lucide?.createIcons();
      root.querySelector('[data-story-dialog]')?.addEventListener('close', event => {
        event.currentTarget.querySelector('[data-story-full-image]')?.removeAttribute('src');
      });
      if (restore) requestAnimationFrame(() => {
        const text = root?.querySelector('.story-text');
        if (text) text.scrollTop = state.ratio * Math.max(0, text.scrollHeight - text.clientHeight);
        fitBook();
      });
    }
    function updateProgress() {
      const text = root?.querySelector('.story-text');
      if (!text) return;
      const ratio = Math.max(0, Math.min(1, text.scrollTop / Math.max(1, text.scrollHeight - text.clientHeight)));
      state.ratio = ratio;
      const overall = bookProgress(ratio), current = sectionProgress(ratio);
      const fill = root.querySelector('.story-book-progress-fill');
      if (fill) fill.style.width = `${overall}%`;
      const overallLabel = root.querySelector('.story-progress-label');
      if (overallLabel) overallLabel.textContent = `${overall}%`;
      const track = root.querySelector('.story-progress-track[role=progressbar]');
      if (track) track.setAttribute('aria-valuenow', String(overall));
      const chapterLabel = root.querySelector('.story-section-progress-label');
      if (chapterLabel) chapterLabel.textContent = `${current}% du chapitre`;
      const chapterFill = root.querySelector('.story-section-progress-fill');
      if (chapterFill) chapterFill.style.width = `${current}%`;
      root.querySelector('.story-page-progress > span')?.replaceChildren(document.createTextNode(`${manuscript.sections[state.section].label} · ${current}%`));
      clearTimeout(saveTimer); saveTimer = setTimeout(() => save(ratio), 180);
    }
    function selectSection(index, focusSelector = '.story-current-heading h2') {
      if (!Number.isInteger(index) || index < 0 || index >= manuscript.sections.length || index === state.section) return;
      clearTimeout(saveTimer);
      saveTimer = 0;
      state.section = index; state.ratio = 0; save(0); render();
      requestAnimationFrame(() => root?.querySelector(focusSelector)?.focus({preventScroll: true}));
    }
    function click(event) {
      if (event.target.matches('[data-story-dialog]')) return event.target.close();
      const preview = event.target.closest('[data-story-preview]');
      if (preview && root.contains(preview)) {
        const dialog = root.querySelector('[data-story-dialog]'), image = dialog?.querySelector('[data-story-full-image]');
        if (!dialog || !image) return;
        image.src = preview.dataset.storyFull;
        image.alt = preview.dataset.storyAlt;
        dialog.querySelector('[data-story-dialog-caption]').textContent = preview.dataset.storyCaption;
        dialog.showModal();
        return;
      }
      const chapter = event.target.closest('[data-story-section]');
      if (chapter) return selectSection(Number(chapter.dataset.storySection), `[data-story-section="${Number(chapter.dataset.storySection)}"]`);
      const button = event.target.closest('[data-story-action]');
      if (!button || !root.contains(button)) return;
      const action = button.dataset.storyAction;
      if (action === 'retry') return retry();
      if (action === 'close-card') return root.querySelector('[data-story-dialog]')?.close();
      if (action === 'previous') return selectSection(state.section - 1);
      if (action === 'next') return selectSection(state.section + 1);
      if (action === 'theme') state.paper = state.paper === 'day' ? 'night' : 'day';
      if (action === 'smaller' || action === 'larger') {
        const sizes = ['small','regular','large'], index = sizes.indexOf(state.size) + (action === 'larger' ? 1 : -1);
        state.size = sizes[Math.max(0, Math.min(sizes.length - 1, index))];
      }
      if (['theme','smaller','larger'].includes(action)) { save(); render({restore: true}); }
    }
    function change(event) {
      if (event.target.matches('[data-story-select]')) selectSection(Number(event.target.value), '.story-chapter-picker');
    }
    function scroll(event) {
      if (event.target.matches('.story-text')) updateProgress();
    }
    async function load() {
      if (!loading) loading = fetch(window.KalistarSite?.url('story-content.json') || 'story-content.json', {cache: 'no-cache'}).then(response => {
        if (!response.ok) throw Error(`Manuscrit indisponible (HTTP ${response.status}).`);
        return response.json();
      }).then(value => {
        if (!Array.isArray(value.sections) || value.sections.length !== 10 || value.sections.some(section => !Array.isArray(section.paragraphs))) throw Error('Structure du manuscrit invalide.');
        const cards = new Set((window.KALISTAR_DATA?.cards || []).map(card => String(card.id)));
        for (const section of value.sections) {
          const anchors = new Set();
          for (const scene of section.illustrations || []) {
            if (!Number.isInteger(scene.afterParagraph) || scene.afterParagraph < 0 || scene.afterParagraph >= section.paragraphs.length || anchors.has(scene.afterParagraph) || !cards.has(String(scene.cardId)) || !scene.caption || !scene.alt) throw Error(`Repère d’illustration invalide dans ${section.label}.`);
            anchors.add(scene.afterParagraph);
          }
        }
        manuscript = value;
        wordCounts = value.sections.map(section => section.paragraphs.reduce((count, paragraph) => count + wordCount(paragraph), 0));
        wordTotal = wordCounts.reduce((sum, count) => sum + count, 0);
        state.section = Math.min(state.section, value.sections.length - 1);
      });
      return loading;
    }
    async function mount(target) {
      root = target;
      root.innerHTML = '<div class="story-loading" role="status">Ouverture du grimoire…</div>';
      root.addEventListener('click', click);
      root.addEventListener('change', change);
      root.addEventListener('scroll', scroll, true);
      if (!observer) observer = new ResizeObserver(fitBook);
      observer.observe(root);
      try { await load(); if (root !== target) return; render({restore: true}); }
      catch (error) {
        if (root !== target) return;
        root.innerHTML = `<section class="story-load-error"><i data-lucide="book-x"></i><h1>Le manuscrit ne s’est pas ouvert</h1><p>${escape(error.message)}</p><button type="button" data-story-action="retry">Réessayer</button></section>`;
        window.lucide?.createIcons();
      }
    }
    function retry() { const target = root; destroy(); loading = null; manuscript = null; if (target) mount(target); }
    function destroy() {
      save(state.ratio);
      clearTimeout(saveTimer);
      if (root) { root.removeEventListener('click', click); root.removeEventListener('change', change); root.removeEventListener('scroll', scroll, true); observer?.unobserve(root); }
      root = null;
    }
    return {mount, destroy};
  }
  window.KalistarStoryReader = Object.freeze({create});
})();
