(() => {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  const atlas = new URL('assets/ui/kalistar-atlas-1.39.webp', document.currentScript.src).href;
  const online = document.documentElement.dataset.hosting === 'static';
  const url = value => {
    if (typeof value !== 'string' || !/^\/(?!\/)/.test(value)
        || base.pathname === '/' || value.startsWith(base.pathname)) return value;
    return new URL(value.slice(1), base).href;
  };
  window.KalistarSite = Object.freeze({ online, url, atlas,
    catalogue: online ? 'catalogue.json' : '/api/game/catalogue' });
  document.documentElement.style.setProperty('--kalistar-atlas-image', `url(${JSON.stringify(atlas)})`);
  if (online) document.querySelectorAll('[data-view="atelier"]').forEach(node => node.remove());
})();
