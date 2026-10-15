(() => {
  'use strict';
  const marker = 'kalistarDialogBack';
  const session = globalThis.crypto?.randomUUID?.() || Date.now() + ':' + Math.random();
  const extras = new Map(), identities = new WeakMap();
  let stack = [], serial = 0, controller, observer, traversing = false, destination = location.href;
  const owned = () => history.state?.[marker]?.session === session;
  function clean(state = history.state) {
    if (!state || typeof state !== 'object' || !Object.hasOwn(state, marker)) return state;
    const value = {...state}; delete value[marker];
    return Object.keys(value).length ? value : null;
  }
  function identity(node) {
    const name = node.id || node.getAttribute('aria-labelledby') || node.getAttribute('aria-label');
    if (name) return 'dialog:' + name;
    if (!identities.has(node)) identities.set(node, 'dialog:' + ++serial);
    return identities.get(node);
  }
  function dismiss(node) {
    if (node.requestClose) node.requestClose();
    else if (node.dispatchEvent(new Event('cancel', {cancelable:true}))) node.close();
  }
  function collect() {
    const current = new Map();
    for (const node of document.querySelectorAll('dialog[open]')) {
      current.set(identity(node), {key:identity(node), dismiss:() => dismiss(node)});
    }
    for (const [key, layer] of extras) if (layer.visible()) current.set(key, {key,...layer});
    // A filter repaint replaces its DOM dialog, not its logical history layer.
    const next = stack.filter(layer => current.has(layer.key)).map(layer => current.get(layer.key));
    for (const [key, layer] of current) if (!next.some(item => item.key === key)) next.push(layer);
    stack = next;
  }
  function reconcile() {
    if (!controller) return;
    collect();
    if (traversing) return;
    if (stack.length && !owned()) {
      destination = location.href;
      history.pushState({...clean(), [marker]:{session}}, '', location.href);
    } else if (!stack.length && owned()) {
      destination = location.href;
      traversing = true;
      history.back();
    }
  }
  function popped() {
    if (traversing) {
      traversing = false;
      // A menu can close and switch views before history.back() finishes.
      if (location.href !== destination) history.replaceState(clean(), '', destination);
    } else if (stack.length) {
      collect();
      if (stack.length && location.href !== destination) history.replaceState(clean(), '', destination);
      stack.at(-1)?.dismiss();
    } else if (history.state?.[marker]) {
      // Forward/reload never resurrects a dismissed popup.
      history.replaceState(clean(), '', location.href);
    }
    reconcile();
  }
  function replace(url) {
    history.replaceState(history.state, '', url);
    destination = location.href;
  }
  function open(node) {
    if (!node) return;
    if (!node.open) node.showModal();
    reconcile();
  }
  function track(key, layer) {
    extras.set(key, layer);
    return () => { extras.delete(key); reconcile(); };
  }
  function init() {
    if (controller) return;
    controller = new AbortController();
    window.addEventListener('popstate', popped, {signal:controller.signal});
    window.addEventListener('kalistar-overlay', reconcile, {signal:controller.signal});
    document.addEventListener('close', reconcile, {capture:true,signal:controller.signal});
    observer = new MutationObserver(records => {
      const relevant = records.some(record => record.type === 'attributes' ? record.target.matches('dialog') :
        [...record.addedNodes,...record.removedNodes].some(node => node.nodeType === 1 && (node.matches('dialog') || node.querySelector('dialog'))));
      if (relevant) reconcile();
    });
    observer.observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['open']});
    if (history.state?.[marker]) {
      destination = location.href; traversing = true; history.back();
    } else reconcile();
  }
  function destroy() {
    observer?.disconnect(); controller?.abort(); controller = null;
    stack = []; traversing = false;
  }
  window.KalistarDialogHistory = {open,replace,track,refresh:reconcile,init,destroy};
  window.addEventListener('pagehide', destroy);
  window.addEventListener('pageshow', init);
  init();
})();
