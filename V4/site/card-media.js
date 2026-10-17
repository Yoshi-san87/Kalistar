(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.KalistarCardMedia = api; api.install(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const crop = { left: 50, top: 50, width: 797, height: 1388 };
  const artwork = { left: 218, top: 175, width: 460, height: 880 };
  const requests = new Map(), cache = new Map();
  const maxEntries = 48, maxBytes = 24 * 1024 * 1024;
  let installed = false, observer = null, timer = null, generation = 0, usage = 0;
  function collect() {
    // currentSrc can still display the old bitmap while a replacement loads.
    const live = new Set([...document.images].flatMap(img => [img.getAttribute('src'), img.currentSrc]));
    let bytes = [...cache.values()].reduce((n, row) => n + (row.bytes || 0), 0);
    for (const [source, row] of [...cache].sort((a, b) => a[1].used - b[1].used)) {
      if (cache.size <= maxEntries && bytes <= maxBytes) break;
      if (!row.url || live.has(row.url) || row.waiters) continue;
      URL.revokeObjectURL(row.url); bytes -= row.bytes || 0; row.url = null; cache.delete(source);
    }
  }
  function schedule() {
    if (timer !== null || !installed) return;
    timer = setTimeout(() => { timer = null; collect(); }, 0);
  }
  function forget(img) {
    delete img.dataset.v4MediaSource; delete img.dataset.v4MediaUrl;
    delete img.dataset.v4Cropped; delete img.dataset.v4MediaError;
  }
  function apply(img, source, row) {
    row.used = ++usage;
    img.dataset.v4MediaSource = source; img.dataset.v4MediaUrl = row.url;
    img.dataset.v4Cropped = requests.get(source).kind; delete img.dataset.v4MediaError;
    if (img.getAttribute('src') !== row.url) img.src = row.url;
  }
  function prepare(img) {
    if (!installed || !(img instanceof HTMLImageElement) || !img.isConnected) return;
    const src = img.getAttribute('src');
    // The exact assigned URL distinguishes a reinserted crop (including clones)
    // from a node deliberately reused for an unrelated image or Blob.
    const source = requests.has(src) ? src : src === img.dataset.v4MediaUrl ? img.dataset.v4MediaSource : null;
    if (!requests.has(source)) { forget(img); return; }
    const row = cache.get(source);
    if (row?.url) apply(img, source, row);
    else if (src !== source) { forget(img); img.src = source; }
    else {
      if (img.dataset.v4MediaSource !== source) forget(img);
      if (img.complete && img.naturalWidth) void loaded({ target: img });
    }
  }
  function validateDimensions(width, height) {
    if (width !== 897 || height !== 1497) throw Error('Format de carte V4 invalide : 897 x 1497 requis.');
    return crop;
  }
  function image(card, kind = 'card') {
    if (!card?.pngUrl) throw Error('Visuel V4 indisponible.');
    const source = (globalThis.KalistarSite?.url(card.pngUrl) || card.pngUrl) + (kind === 'art' ? '#v4-art' : '#v4-card');
    requests.set(source, {kind,weapon:card.weapon});
    // Stable URLs survive deferred markup insertion and eviction of an old Blob.
    return source;
  }
  function current(source, row) { return installed && cache.get(source) === row; }
  async function render(img, source, row) {
    const request = requests.get(source), rect = request.kind === 'art' ? artwork : crop;
    const canvas = document.createElement('canvas');
    canvas.width = rect.width; canvas.height = rect.height;
    canvas.getContext('2d').drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
    let blob;
    if (request.kind!=='art' && globalThis.KalistarBaseWeapons) {
      // A missing optional glyph must not prevent the original card from loading.
      try {
        const motif = await KalistarBaseWeapons.load(request.weapon);
        if (!current(source, row)) return null;
        if (motif) blob = KalistarBaseWeapons.compose(canvas, rect, motif);
      } catch (error) {
        if (!current(source, row)) return null;
        console.warn('Arme classique : ' + error.message);
      }
    }
    if (!blob) blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .95));
    // Canvas/glyph promises cannot be cancelled. Disposed generations must never
    // allocate a URL, overwrite a fresh row, or update a new installation's DOM.
    if (!current(source, row)) return null;
    if (!blob) throw Error('Recadrage de carte impossible.');
    row.bytes = blob.size; row.url = URL.createObjectURL(blob); return row.url;
  }
  async function loaded(event) {
    const img = event.target, source = img?.getAttribute?.('src'), epoch = generation;
    if (!installed || !(img instanceof HTMLImageElement)) return;
    schedule();
    if (!requests.has(source) || !img.isConnected) return;
    let result;
    try {
      validateDimensions(img.naturalWidth, img.naturalHeight);
      result = cache.get(source);
      if (!result) {
        result = { used: ++usage, waiters: 0 };
        cache.set(source, result);
        result.promise = render(img, source, result).catch(error => {
          if (cache.get(source) === result) cache.delete(source);
          throw error;
        });
      }
      result.waiters++; result.used = ++usage;
      const url = await result.promise;
      if (url && current(source, result) && img.isConnected && img.getAttribute('src') === source) apply(img, source, result);
    } catch (error) {
      if (installed && epoch === generation && img.isConnected && img.getAttribute('src') === source) {
        img.dataset.v4MediaError = error.message;
        document.dispatchEvent(new CustomEvent('kalistar:media-error', { detail: error.message }));
      }
    } finally {
      if (result) result.waiters--;
      if (epoch === generation) schedule();
    }
  }
  function imageError(event) { if (event.target instanceof HTMLImageElement) schedule(); }
  function mutations(changes) {
    for (const change of changes) {
      if (change.type === 'attributes') prepare(change.target);
      for (const node of change.addedNodes || []) { prepare(node); for (const img of node.querySelectorAll?.('img') || []) prepare(img); }
    }
    schedule();
  }
  function pageHide(event) { if (!event.persisted) dispose(); }
  function install() {
    if (installed) return;
    installed = true;
    document.addEventListener('load', loaded, true); document.addEventListener('error', imageError, true);
    observer = new MutationObserver(mutations);
    observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
    globalThis.addEventListener?.('pagehide', pageHide);
    for (const img of document.images) prepare(img);
    schedule();
  }
  function dispose() {
    installed = false; generation++;
    observer?.disconnect(); observer = null; clearTimeout(timer); timer = null;
    document.removeEventListener('load', loaded, true); document.removeEventListener('error', imageError, true);
    globalThis.removeEventListener?.('pagehide', pageHide);
    for (const img of document.images) {
      const source = img.dataset.v4MediaSource;
      if (requests.has(source) && img.getAttribute('src') === img.dataset.v4MediaUrl) { forget(img); img.src = source; }
    }
    for (const row of cache.values()) if (row.url) { URL.revokeObjectURL(row.url); row.url = null; }
    cache.clear();
  }
  return { image, crop, validateDimensions, install,collect,dispose,
    cacheStats:()=>({entries:cache.size,bytes:[...cache.values()].reduce((n,row)=>n+(row.bytes||0),0),maxEntries,maxBytes}) };
});
