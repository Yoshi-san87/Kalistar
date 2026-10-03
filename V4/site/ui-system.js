(function (global) {
  'use strict';
  const ignored = '.main-nav,.mobile-menu,#atelier-panel,.lineup-intro,[data-kui-native]';
  const tabs = '[role=tab],.cb-scopes button,.sheet-segment button,.sheet-tabs button,.match-filters button,.match-groups button,.cb-media-tools button,.cb-mobile-panes button,.cb-versions button,.registry-tabs button';
  const commands = '.icon-button,.primary,.danger,.ghost,.kdb-icon,.kdb-play,.cb-icon,.cb-back,.cb-equipped,.account-button,.deck-button,.text-link,'+
    '.dialog-head button,.dialog-form button,.detail-actions button,.match-report-actions button,.match-footer button,'+
    '.kdb-demo-tools button,.kdb-library-actions button,.cb-toolbar button,.cb-footer button,.cb-filter-actions button,'+
    '.sheet-tools button,.sheet-pagination button,.sheet-heading button,.weapons-heading button,.arena-toolbar button,'+
    '.registry-command-row button,.transfer-row-actions button,button[data-weapon-action],button[data-deck-action=equip],button[data-deck-action=unequip]';
  let observer, controller, tooltip, target, timer, frame;
  const pending = new Set(), animations = new Map(), hints = new Map();
  const reduced = () => global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function controls(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return [];
    return [...(root.matches?.('button,input,select,textarea,dialog,.dialog-head h2,.cb-filter-heading h2') ? [root] : []),
      ...root.querySelectorAll('button,input,select,textarea,dialog,.dialog-head h2,.cb-filter-heading h2')];
  }
  function enhance(root = document) {
    for (const node of controls(root)) {
      if (node.closest(ignored)) continue;
      if (node.matches('button')) {
        const kind = node.matches(tabs) ? 'tab' : node.matches(commands) ? 'command' : null;
        if (!kind) continue;
        node.dataset.kui = kind === 'command' && node.closest('.kdb-slot,.kdb-candidate') ? 'quiet' : kind;
        if (node.matches('.primary,.kdb-play,[type=submit],[data-deck-action=save],[data-action=save-game],.cb-filter-actions>button:last-child')) node.dataset.kuiTone='primary';
        if (kind === 'command' && !node.textContent.trim() && (node.title || node.getAttribute('aria-label'))) {
          if (node.title) { hints.set(node, node.title); node.removeAttribute('title'); }
          if (!node.hasAttribute('aria-label')) node.setAttribute('aria-label', hints.get(node));
        }
      } else if (node.matches('input,select,textarea')) {
        if (node.matches('[type=hidden],[type=file]')) continue;
        node.dataset.kui = node.matches('[type=range]') ? 'range' : node.matches('[type=checkbox],[type=radio]') ? 'check' : 'field';
      } else if (node.matches('dialog')) {
        node.dataset.kui = 'dialog';
      } else if (!node.querySelector('.kui-emblem')) {
        const id = node.closest('dialog')?.id;
        const asset = node.closest('.cb-overlay') ? 'navigation/collection-v1.webp' : id === 'match-dialog' ? 'trophies/golden-crystal.webp' :
          ({'new-game-dialog':'navigation/arena-v1.webp','weapons-dialog':'navigation/weapons-v1.webp',
            'rules-dialog':'navigation/story-v1.webp','journal-dialog':'navigation/story-v1.webp',
            'combat-reference-dialog':'navigation/weapons-v1.webp','deck-dialog':'navigation/decks-v1.webp'})[id];
        if (!asset) continue;
        const img = document.createElement('img');
        img.className = 'kui-emblem'; img.alt = ''; img.width = 28; img.height = 28;
        img.src = global.KalistarSite?.url('assets/'+asset) || 'assets/'+asset;
        node.prepend(img); node.classList.add('kui-heading');
      }
    }
  }
  function dismiss() {
    clearTimeout(timer);
    if (target) {
      const ids = (target.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== 'kalistar-ui-hint');
      if (ids.length) target.setAttribute('aria-describedby', ids.join(' '));
      else target.removeAttribute('aria-describedby');
    }
    target = null;
    if (tooltip?.matches(':popover-open')) tooltip.hidePopover();
  }
  function hint(node, immediate = false) {
    dismiss();
    if (!node || node.disabled || !hints.has(node) && !node.getAttribute('aria-label') || node.textContent.trim()) return;
    target = node;
    timer = setTimeout(() => {
      if (target !== node || !node.isConnected || node.closest('[inert]')) return dismiss();
      const text = hints.get(node) || node.getAttribute('aria-label');
      tooltip.textContent = text; tooltip.showPopover();
      const r = node.getBoundingClientRect(), t = tooltip.getBoundingClientRect(), viewport = global.visualViewport;
      const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
      const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
      tooltip.style.left = Math.max(left+8, Math.min(r.x+r.width/2-t.width/2,left+width-t.width-8))+'px';
      tooltip.style.top = Math.max(top+8, Math.min(r.bottom+8+t.height>top+height-8?r.top-t.height-8:r.bottom+8,top+height-t.height-8))+'px';
      const ids = new Set((node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      ids.add(tooltip.id); node.setAttribute('aria-describedby', [...ids].join(' '));
    }, immediate ? 0 : 360);
  }
  function reveal(dialog) {
    animations.get(dialog)?.cancel();
    if (!dialog.open || !dialog.isConnected) { animations.delete(dialog); return; }
    const animation = dialog.animate(reduced() ? [{opacity:0},{opacity:1}] : [{opacity:0,translate:'0 6px'},{opacity:1,translate:'0 0'}],
      {duration:reduced()?70:200,easing:'cubic-bezier(.2,.7,.2,1)'});
    animations.set(dialog, animation);
    animation.finished.catch(() => {}).finally(() => { if (animations.get(dialog) === animation) animations.delete(dialog); });
  }
  function flush() {
    frame = null;
    for (const node of pending) if (node.isConnected) enhance(node);
    pending.clear();
    for (const node of hints.keys()) if (!node.isConnected) hints.delete(node);
    for (const [node, animation] of animations) if (!node.isConnected || !node.open) { animation.cancel(); animations.delete(node); }
    if (target && !target.isConnected) dismiss();
  }
  function init() {
    if (controller) return;
    controller = new AbortController();
    document.body.classList.add('kalistar-ui');
    tooltip = document.createElement('div'); tooltip.id = 'kalistar-ui-hint';
    tooltip.className = 'kui-tooltip'; tooltip.setAttribute('role','tooltip'); tooltip.setAttribute('popover','manual');
    document.body.append(tooltip);
    enhance();
    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') { if (record.target.matches('dialog')) { enhance(record.target); reveal(record.target); dismiss(); } }
        else for (const node of record.addedNodes) if (node.nodeType === 1 && node !== tooltip) pending.add(node);
      }
      if (!frame) frame = requestAnimationFrame(flush);
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
    const on = (name, fn, options={}) => document.addEventListener(name, fn, {...options,signal:controller.signal});
    const button = event => event.target.closest?.('button[data-kui]');
    on('pointerover', event => { if (event.pointerType === 'mouse' && button(event) !== target) hint(button(event)); });
    on('pointerout', event => { if (target && !target.contains(event.relatedTarget)) dismiss(); });
    on('focusin', event => { if (button(event)?.matches(':focus-visible')) hint(button(event),true); });
    on('focusout', dismiss);
    on('pointerdown', dismiss, {capture:true});
    on('click', dismiss, {capture:true});
    on('scroll', dismiss, {capture:true,passive:true});
    on('keydown', event => { if (event.key === 'Escape') dismiss(); });
    global.addEventListener('resize',dismiss,{signal:controller.signal,passive:true});
    global.addEventListener('pagehide',destroy,{signal:controller.signal});
  }
  function destroy() {
    dismiss(); observer?.disconnect(); controller?.abort(); controller=null;
    cancelAnimationFrame(frame); frame=null; pending.clear();
    for (const animation of animations.values()) animation.cancel();
    animations.clear();
    for (const [node,title] of hints) if (node.isConnected) node.title=title;
    hints.clear(); tooltip?.remove(); tooltip=null;
  }
  global.KalistarUI={init,enhance,destroy};
  global.addEventListener('pageshow',init);
  init();
})(window);
