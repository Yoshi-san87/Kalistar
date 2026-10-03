(() => {
  'use strict';
  const release = new URL(document.currentScript?.src || location.href).searchParams.get('v') || '';
  const scripts = ['assets/lucide.min.js', 'ui-system.js', 'weapons.js', 'weapon-art.js', 'equipment.js', 'engine.js', 'collaborations.js', 'card-media.js', 'equipment-presentation.js', 'elemental-roll.js',
    'arena-ambience.js', 'combat-effects.js', 'duel-focus.js', 'lineup-intro.js', 'formation-drag.js', 'match-metrics.js', 'trophies.js', 'match-report.js',
    'ownership.js', 'local-db.js', 'weapon-cards.js', 'weapons-ui.js', 'catalogue.js', 'collection-binder.js', 'accounts-ui.js',
    'reserve-preview.js', 'deck-library.js', 'team-composition.js', 'deck-builder.js', 'statistics.js', 'story-reader.js', 'app.js'];
  const fail = error => {
    if (window.KALISTAR_READY || window.KALISTAR_PREVIEW_READY) return;
    const app = document.getElementById('app'); app.replaceChildren();
    const panel = document.createElement('section'); panel.className = 'boot-status';
    const title = document.createElement('h1'); title.textContent = 'Jeu V4 indisponible';
    const message = document.createElement('p'); message.textContent = error.message || 'Le catalogue ne peut pas etre charge.';
    const retry = document.createElement('button'); retry.textContent = 'Reessayer'; retry.onclick = () => location.reload();
    const atelier = document.createElement('a'); atelier.href = '/'; atelier.textContent = 'Atelier';
    panel.append(title, message, retry);
    if (!window.KalistarSite?.online) panel.append(atelier);
    app.append(panel);
  };
  window.addEventListener('unhandledrejection', event => fail(event.reason || {}));
  window.addEventListener('error', event => { if (event.message) fail(event); });
  async function start() {
    if(window.KalistarPhonePreview?.isHost){
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src='assets/lucide.min.js';
        script.onload=resolve;script.onerror=()=>reject(Error('Icônes indisponibles.'));document.head.append(script);
      });
      window.KalistarPhonePreview.mountHost();return;
    }
    const response = await fetch(window.KalistarSite?.catalogue || '/api/game/catalogue', { cache: 'no-store' });
    if (!response.ok) throw Error('Catalogue V4 indisponible (HTTP ' + response.status + ').');
    const data = await response.json();
    if (data.version !== 4 || data.edition !== 'V4' || !data.cards?.length || data.cards.some(c => c.edition !== 'V4' || !c.pngUrl)) throw Error('Catalogue V4 attendu. Aucun catalogue historique ne sera charge.');
    window.KALISTAR_DATA = data;
    for (const src of scripts) await new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = release ? `${src}?v=${encodeURIComponent(release)}` : src;
      script.onload = resolve; script.onerror = () => reject(Error('Module introuvable : ' + src));
      document.head.append(script);
    });
  }
  start().catch(fail);
})();
