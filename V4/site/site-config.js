(() => {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  const online = document.documentElement.dataset.hosting === 'static';
  const url = value => {
    if (typeof value !== 'string' || !/^\/(?!\/)/.test(value)
        || base.pathname === '/' || value.startsWith(base.pathname)) return value;
    return new URL(value.slice(1), base).href;
  };
  window.KalistarSite = Object.freeze({ online, url,
    catalogue: online ? 'catalogue.json' : '/api/game/catalogue' });
  if (online) document.querySelectorAll('[data-view="atelier"]').forEach(node => node.remove());
})();
