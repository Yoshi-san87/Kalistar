(() => {
  'use strict';
  let serial = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = name => `<i data-lucide="${escape(name)}" aria-hidden="true"></i>`;
  const phoneQuery = '(max-width: 699px), (pointer: coarse) and (max-width: 1100px) and (max-height: 500px)';
  const numerals = ['I','II','III','IV','V','VI'];

  function create({documents} = {}) {
    const instance = ++serial, dialogId = 'kalistar-library-dialog-' + instance;
    let root, dialog, controller, lifecycle, media, untrack, selected = null, presentation = null;
    const list = () => documents || window.KalistarRulesDocuments?.documents || [];
    const find = id => list().find(document => document.id === id);
    const prefix = id => 'library-' + instance + '-' + id;
    const icons = target => window.KalistarUI?.icons(target) ?? window.lucide?.createIcons({root:target});
    const trigger = id => [...(root?.querySelectorAll('[data-library-open]') || [])].find(node => node.dataset.libraryOpen === id);
    const panel = id => document.getElementById(prefix(id) + '-panel');
    const refreshHistory = () => window.KalistarDialogHistory?.refresh();

    function render() {
      const documents = list();
      return `<section class="kalistar-library" data-kui-native aria-labelledby="${prefix('title')}">
        <header class="library-heading"><div><p class="library-kicker">Codex de Kalistar</p><h1 id="${prefix('title')}">Biblioth\u00e8que</h1></div><span class="library-inventory">${escape(documents.length)} manuscrits</span></header>
        <div class="library-shelves" tabindex="-1">${documents.map((document,index) => `<article class="library-manuscript" data-library-entry="${escape(document.id)}">
          <button type="button" class="library-preview" id="${prefix(document.id)}-trigger" data-library-open="${escape(document.id)}" aria-controls="${prefix(document.id)}-panel" aria-expanded="false">
            <span class="library-seal">${icon(document.icon)}<span>${numerals[index] || index + 1}</span></span>
            <span class="library-category">${escape(document.category)}</span><span class="library-preview-title">${escape(document.title)}</span>
            <span class="library-description">${escape(document.description)}</span>
            <span class="library-preview-foot"><span>${document.sections.filter(section => section.depth === 2).length} chapitres</span>${icon('chevron-down')}</span>
          </button><div class="library-inline" id="${prefix(document.id)}-panel" role="region" aria-labelledby="${prefix(document.id)}-trigger" hidden></div>
        </article>`).join('')}${documents.length ? '' : '<p class="library-empty" role="status">Les manuscrits ne sont pas disponibles.</p>'}</div>
        <dialog class="library-dialog" id="${dialogId}" data-kui-native aria-labelledby="${prefix('reader-title')}"></dialog>
      </section>`;
    }

    function reader(document, inline) {
      const sections = document.sections.filter(section => section.depth === 2);
      return `<div class="library-unfurl${inline ? ' library-unfurl-inline' : ''}">
        <header class="library-reader-heading"><div><p class="library-category">${escape(document.category)}</p><h2 id="${prefix('reader-title')}" tabindex="-1">${escape(document.title)}</h2></div><button type="button" class="library-tool" data-library-close title="${inline ? 'Replier le manuscrit' : 'Fermer le manuscrit'}" aria-label="${inline ? 'Replier le manuscrit' : 'Fermer le manuscrit'}">${icon(inline ? 'chevron-up' : 'x')}</button></header>
        <div class="library-reading-layout">
          ${inline ? '' : `<nav class="library-contents" aria-label="Chapitres du manuscrit"><p>Sommaire</p>${sections.map(section => `<button type="button" data-library-heading="${escape(section.id)}">${escape(section.title)}</button>`).join('')}</nav>`}
          <div class="library-reading-column">${sections.length ? `<select class="library-chapter-picker" aria-label="Chapitre du manuscrit"><option value="">Sommaire</option>${sections.map(section => `<option value="${escape(section.id)}">${escape(section.title)}</option>`).join('')}</select>` : ''}
            <div class="library-reading" tabindex="0" role="region" aria-label="${escape(document.title)}"><article class="library-prose">${document.html}</article></div>
          </div>
        </div>
      </div>`;
    }

    function cancelAnimations(target = root) {
      for (const animation of target?.getAnimations?.({subtree:true}) || []) animation.cancel();
    }

    function markOpen() {
      for (const button of root.querySelectorAll('[data-library-open]')) {
        const open = button.dataset.libraryOpen === selected;
        button.setAttribute('aria-expanded',String(open));
        button.setAttribute('aria-controls',presentation === 'dialog' && open ? dialogId : prefix(button.dataset.libraryOpen) + '-panel');
        if (media.matches) button.removeAttribute('aria-haspopup');
        else button.setAttribute('aria-haspopup','dialog');
        button.closest('.library-manuscript').classList.toggle('is-open',open);
      }
    }

    function clearInline() {
      for (const node of root.querySelectorAll('.library-inline')) { cancelAnimations(node); node.hidden = true; node.replaceChildren(); }
    }

    function close({focus = true} = {}) {
      if (!root) return;
      const previous = selected, wasInline = presentation === 'inline';
      selected = presentation = null;
      cancelAnimations();
      if (dialog.open) dialog.close();
      dialog.replaceChildren(); clearInline(); markOpen(); refreshHistory();
      if (focus && previous) {
        const button = trigger(previous);
        button?.focus({preventScroll:true});
        if (wasInline) button?.scrollIntoView({block:'nearest',behavior:'instant'});
      }
    }

    function show(id, {focus = true, section = ''} = {}) {
      const document = find(id);
      if (!root || !document) return;
      selected = id;
      presentation = media.matches ? 'inline' : 'dialog';
      cancelAnimations(); clearInline();
      let target;
      if (presentation === 'inline') {
        if (dialog.open) dialog.close();
        dialog.replaceChildren(); target = panel(id); target.hidden = false;
        target.innerHTML = reader(document,true);
      } else {
        target = dialog; target.innerHTML = reader(document,false);
        if (!dialog.open) {
          if (window.KalistarDialogHistory) window.KalistarDialogHistory.open(dialog);
          else dialog.showModal();
        }
      }
      markOpen(); icons(target); refreshHistory();
      if (focus) {
        if (presentation === 'inline') trigger(id)?.focus({preventScroll:true});
        else target.querySelector('h2').focus({preventScroll:true});
      }
      if (section) goToHeading(section);
      else if (presentation === 'inline') trigger(id)?.scrollIntoView({block:'nearest',behavior:'instant'});
    }

    function goToHeading(id) {
      const active = presentation === 'dialog' ? dialog : panel(selected);
      const heading = [...(active?.querySelectorAll('.library-prose [id]') || [])].find(node => node.id === id);
      if (!heading) return;
      heading.scrollIntoView({block:'start',behavior:'instant'});
      heading.focus({preventScroll:true});
      const picker = active.querySelector('.library-chapter-picker');
      if (picker) picker.value = id;
    }

    function click(event) {
      const button = event.target.closest('[data-library-open],[data-library-close],[data-library-heading],[data-library-document]');
      if (!button || !root.contains(button)) return;
      if (button.hasAttribute('data-library-open')) {
        const id = button.dataset.libraryOpen;
        if (selected === id) close(); else show(id);
      } else if (button.hasAttribute('data-library-close')) close();
      else if (button.hasAttribute('data-library-heading')) goToHeading(button.dataset.libraryHeading);
      else { event.preventDefault(); show(button.dataset.libraryDocument,{section:button.dataset.librarySection}); }
    }

    function keydown(event) {
      if (event.key === 'Escape' && presentation === 'inline') { event.preventDefault(); close(); return; }
      const button = event.target.closest('[data-library-open]');
      if (!button || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      const buttons = [...root.querySelectorAll('[data-library-open]')], index = buttons.indexOf(button);
      const columns = media.matches ? 1 : getComputedStyle(root.querySelector('.library-shelves')).gridTemplateColumns.split(' ').length;
      const step = ['ArrowUp','ArrowDown'].includes(event.key) ? columns : 1;
      const delta = ['ArrowDown','ArrowRight'].includes(event.key) ? step : -step;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + delta + buttons.length) % buttons.length;
      event.preventDefault(); buttons[next].focus();
    }

    function stop() {
      if (root && dialog) close({focus:false});
      controller?.abort(); controller = null;
      untrack?.(); untrack = null;
    }

    function mount(target) {
      destroy();
      root = target; root.innerHTML = render();
      dialog = root.querySelector('.library-dialog');
      controller = new AbortController(); lifecycle = new AbortController();
      media = window.matchMedia(phoneQuery);
      const signal = controller.signal;
      root.addEventListener('click',click,{signal}); root.addEventListener('keydown',keydown,{signal});
      root.addEventListener('change',event => { if (event.target.matches('.library-chapter-picker')) goToHeading(event.target.value); },{signal});
      dialog.addEventListener('cancel',event => { event.preventDefault(); close(); },{capture:true,signal});
      dialog.addEventListener('close',() => { if (selected && presentation === 'dialog' && !dialog.open) close(); },{signal});
      dialog.addEventListener('click',event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      },{signal});
      media.addEventListener('change',() => { if (selected) show(selected); else markOpen(); },{signal});
      // The inline accordion and native dialog share one logical Back layer.
      untrack = window.KalistarDialogHistory?.track('dialog:' + dialogId,{visible:() => Boolean(selected && presentation === 'inline'),dismiss:close});
      window.addEventListener('pagehide',stop,{signal:lifecycle.signal});
      window.addEventListener('pageshow',event => { if (event.persisted && !controller && root?.isConnected) mount(root); },{signal:lifecycle.signal});
      markOpen(); icons(root);
    }

    function destroy() {
      stop(); lifecycle?.abort(); lifecycle = null;
      root = dialog = media = null; selected = presentation = null;
    }

    return {render,mount,destroy};
  }
  window.KalistarLibrary = Object.freeze({create});
})();
