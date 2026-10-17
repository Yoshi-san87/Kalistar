'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const script = fs.readFileSync(path.join(__dirname, 'card-media.js'), 'utf8');
const MiB = 1024 * 1024;

// Deterministic encoders and clocks expose races without allocating large bitmaps.
function fixture({ bytes = 1024, deferred = false, weapons } = {}) {
  function events() {
    const listeners = new Map();
    return {
      listeners,
      addEventListener(type, callback, capture = false) {
        const key = type + ':' + capture;
        if (!listeners.has(key)) listeners.set(key, new Set());
        listeners.get(key).add(callback);
      },
      removeEventListener(type, callback, capture = false) {
        listeners.get(type + ':' + capture)?.delete(callback);
      },
      async emit(type, event) {
        await Promise.all([...listeners].filter(([key]) => key.startsWith(type + ':'))
          .flatMap(([, callbacks]) => [...callbacks].map(fn => fn(event))));
      },
      count() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); }
    };
  }
  class Image {
    constructor(source) {
      this.dataset = {}; this.isConnected = false;
      this.src = source; this.complete = true;
      this.naturalWidth = 897; this.naturalHeight = 1497;
    }
    getAttribute(name) { return name === 'src' ? this.value : null; }
    get src() { return this.value; }
    set src(value) { this.value = value; this.currentSrc = value; this.complete = false; }
  }
  const window = events(), document = events(), encoders = [], observers = [], timers = new Map();
  const created = [], revoked = [], errors = [];
  let encodes = 0, draws = 0, sequence = 0;
  document.images = [];
  document.dispatchEvent = event => errors.push(event.detail);
  document.createElement = tag => {
    assert.equal(tag, 'canvas');
    return {
      getContext: () => ({ drawImage() { draws++; if (h.failDraw) { h.failDraw = false; throw Error('draw failed'); } } }),
      toBlob(callback) { encodes++; if (deferred) encoders.push(callback); else callback({ size: bytes }); }
    };
  };
  const sandbox = {
    ...window, document, module: { exports: {} }, console,
    HTMLImageElement: Image,
    // Frozen wall time verifies genuine LRU ordering, including same-tick hits.
    Date: { now: () => 1 },
    URL: {
      createObjectURL(blob) { const url = 'blob:qa-' + created.length; created.push({ url, size: blob.size }); return url; },
      revokeObjectURL(url) { revoked.push(url); }
    },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; this.active = false; observers.push(this); }
      observe() { this.active = true; }
      disconnect() { this.active = false; }
    },
    CustomEvent: class { constructor(type, data) { this.type = type; this.detail = data.detail; } },
    setTimeout(callback) { const id = ++sequence; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    KalistarBaseWeapons: weapons
  };
  vm.runInNewContext(script, sandbox, { filename: 'card-media.js' });
  const api = sandbox.module.exports;
  api.install();
  const h = {
    api, document, window, encoders, observers, timers, created, revoked, errors,
    get encodes() { return encodes; }, get draws() { return draws; },
    source(id, kind = 'card') { return api.image({ pngUrl: '/native/' + id + '.png', weapon: 'Instrument' }, kind); },
    make(source, connected = true) {
      const img = new Image(source);
      if (connected) { img.isConnected = true; document.images.push(img); }
      return img;
    },
    mutate(changes) { for (const observer of observers) if (observer.active) observer.callback(changes); },
    insert(img) {
      img.isConnected = true; document.images.push(img);
      h.mutate([{ type: 'childList', addedNodes: [img], removedNodes: [] }]);
    },
    remove(img) {
      img.isConnected = false; document.images = document.images.filter(node => node !== img);
      h.mutate([{ type: 'childList', addedNodes: [], removedNodes: [img] }]);
    },
    prepare(img) { h.mutate([{ type: 'attributes', target: img }]); },
    load(img) { return document.emit('load', { target: img }); },
    async render(id, connected = false) {
      const img = h.make(h.source(id)), pending = h.load(img);
      if (!connected) h.remove(img);
      await pending; return img;
    },
    flush() {
      const pending = [...timers.values()]; timers.clear(); for (const callback of pending) callback();
    }
  };
  return h;
}

test('cache: entry eviction is true LRU even when all hits share a clock tick', async () => {
  const h = fixture(), first = await h.render('oldest', true), firstURL = first.src;
  h.remove(first);
  for (let i = 0; i < 47; i++) await h.render(i);
  const hit = h.make(h.source('oldest')); h.prepare(hit); h.remove(hit);
  await h.render('newest'); h.api.collect();
  assert.equal(h.api.cacheStats().entries, 48);
  assert(!h.revoked.includes(firstURL), 'a reused oldest entry becomes most recent');
  assert(h.revoked.includes(h.created[1].url));
  assert.equal(h.api.image({ pngUrl: '/native/oldest.png' }), '/native/oldest.png#v4-card');
  h.api.dispose();
});

test('cache: byte eviction and oversized entries stay bounded without visible consumers', async () => {
  const h = fixture({ bytes: 13 * MiB });
  await h.render(1); await h.render(2); h.api.collect();
  assert.equal(h.api.cacheStats().entries, 1); assert.equal(h.api.cacheStats().bytes, 13 * MiB);
  assert.deepEqual(h.revoked, [h.created[0].url]); h.api.dispose();
  const large = fixture({ bytes: 25 * MiB });
  await large.render('oversized'); large.api.collect();
  assert.equal(large.api.cacheStats().entries, 0); large.api.dispose();
});

test('cache: visible images can exceed both limits and removal reclaims unpinned URLs', async () => {
  const h = fixture({ bytes: MiB }), images = [];
  for (let i = 0; i < 52; i++) images.push(await h.render(i, true));
  h.api.collect();
  assert.equal(h.api.cacheStats().entries, 52); assert.equal(h.revoked.length, 0);
  for (const img of images.slice(1)) h.remove(img);
  h.flush();
  assert.equal(h.api.cacheStats().entries, 24); assert.equal(h.api.cacheStats().bytes, 24 * MiB);
  assert(!h.revoked.includes(images[0].src)); h.api.dispose();
});

test('cache: currentSrc remains pinned while a replacement image is loading', async () => {
  const h = fixture({ bytes: 13 * MiB }), img = await h.render('visible', true), visibleURL = img.src;
  img.src = '/replacement.png'; img.currentSrc = visibleURL;
  await h.render('other'); h.api.collect();
  assert(!h.revoked.includes(visibleURL));
  img.currentSrc = img.src; await h.load(img);
  await h.render('third'); h.flush();
  assert(h.revoked.includes(visibleURL)); h.api.dispose();
});

test('cache: detached and reinserted nodes recover after eviction, without hijacking unrelated sources', async () => {
  const h = fixture({ bytes: 13 * MiB }), img = await h.render('reuse', true), oldURL = img.src;
  h.remove(img); await h.render('other'); h.api.collect();
  assert(h.revoked.includes(oldURL));
  h.insert(img); assert.equal(img.src, h.source('reuse')); assert.equal(img.dataset.v4Cropped, undefined);
  await h.load(img); assert.notEqual(img.src, oldURL);
  img.src = '/unrelated.png'; h.prepare(img); assert.equal(img.src, '/unrelated.png');
  assert.equal(img.dataset.v4MediaSource, undefined); assert.equal(img.dataset.v4Cropped, undefined);
  img.src = h.source('reuse'); h.prepare(img);
  img.src = 'blob:external-owner'; h.prepare(img); assert.equal(img.src, 'blob:external-owner');
  h.api.dispose();
});

test('cache: an already-loaded detached source is cropped on insertion', async () => {
  const h = fixture(), img = h.make(h.source('preloaded'), false);
  h.insert(img); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.encodes, 1); assert(img.src.startsWith('blob:')); h.api.dispose();
});

test('cache: concurrent loads share one encoder, and detached waiters keep stable sources', async () => {
  const h = fixture({ deferred: true }), source = h.source('shared');
  const first = h.make(source), second = h.make(source);
  const p1 = h.load(first), p2 = h.load(second);
  assert.equal(h.encodes, 1); h.api.collect(); assert.equal(h.api.cacheStats().entries, 1);
  h.remove(second); h.encoders.shift()({ size: 1024 }); await Promise.all([p1, p2]);
  assert.equal(h.created.length, 1); assert(first.src.startsWith('blob:'));
  assert.equal(second.src, source, 'detached consumers never receive an evictable URL');
  h.insert(second); assert.equal(second.src, first.src); h.api.dispose();
});

test('cache: dispose during encoding prevents late allocation or DOM writes', async () => {
  const h = fixture({ deferred: true }), img = h.make(h.source('pending')), source = img.src;
  const pending = h.load(img); h.api.dispose(); h.encoders.shift()({ size: 1024 }); await pending;
  assert.equal(h.created.length, 0); assert.equal(h.api.cacheStats().entries, 0);
  assert.equal(img.src, source); assert.equal(h.timers.size, 0); assert.deepEqual(h.errors, []);
});

test('cache: changing sources during encoding applies only the latest result', async () => {
  const h = fixture({ deferred: true }), img = h.make(h.source('before'));
  const old = h.load(img);
  img.src = h.source('after'); const fresh = h.load(img);
  h.encoders[1]({ size: 2048 }); await fresh; const freshURL = img.src;
  h.encoders[0]({ size: 1024 }); await old;
  assert.equal(img.src, freshURL); assert.equal(img.dataset.v4MediaSource, h.source('after'));
  assert.deepEqual(h.errors, []); h.api.dispose();
});

test('cache: old successful encoders cannot overwrite a reinstalled cache entry', async () => {
  const h = fixture({ deferred: true }), img = h.make(h.source('restart')), source = img.src;
  const old = h.load(img); h.api.dispose(); h.api.install(); const fresh = h.load(img);
  assert.equal(h.encoders.length, 2);
  h.encoders[0]({ size: 1024 }); await old;
  assert.equal(img.src, source); assert.equal(h.created.length, 0);
  h.encoders[1]({ size: 2048 }); await fresh;
  assert.equal(h.api.cacheStats().entries, 1); assert.equal(h.api.cacheStats().bytes, 2048);
  assert.equal(img.src, h.created[0].url); h.api.dispose();
});

test('cache: stale failures cannot remove fresh entries or emit errors after dispose', async () => {
  const h = fixture({ deferred: true }), img = h.make(h.source('restart-failure'));
  const old = h.load(img); h.api.dispose(); h.api.install(); const fresh = h.load(img);
  h.encoders[1]({ size: 2048 }); await fresh;
  h.encoders[0](null); await old;
  assert.equal(h.api.cacheStats().entries, 1); assert.equal(h.api.cacheStats().bytes, 2048);
  assert.deepEqual(h.errors, []); assert.equal(img.dataset.v4MediaError, undefined); h.api.dispose();
});

test('cache: queued render rejection cannot delete an entry created after reinstall', async () => {
  const h = fixture({ deferred: true }), img = h.make(h.source('draw-failure'));
  h.failDraw = true; const old = h.load(img);
  h.api.dispose(); h.api.install(); const fresh = h.load(img);
  await old; assert.equal(h.api.cacheStats().entries, 1); assert.deepEqual(h.errors, []);
  h.encoders[0]({ size: 1024 }); await fresh;
  assert.equal(h.api.cacheStats().entries, 1); assert.equal(img.src, h.created[0].url); h.api.dispose();
});

test('cache: failures are retryable, and a successful retry clears stale error metadata', async () => {
  const h = fixture({ deferred: true }), img = h.make(h.source('retry'));
  const failed = h.load(img); h.encoders.shift()(null); await failed;
  assert.equal(h.api.cacheStats().entries, 0); assert.equal(h.errors.length, 1);
  const retry = h.load(img); h.encoders.shift()({ size: 1234 }); await retry;
  assert(img.src.startsWith('blob:')); assert.equal(img.dataset.v4MediaError, undefined); h.api.dispose();
});

test('cache: optional glyph failure falls back, and disposal while loading it cancels composition', async () => {
  const fallback = fixture({ weapons: { load: async () => { throw Error('optional'); } } });
  await fallback.render('fallback', true); assert.equal(fallback.created.length, 1);
  assert.deepEqual(fallback.errors, []); fallback.api.dispose();
  let resolve, compositions = 0;
  const h = fixture({ weapons: {
    load: () => new Promise(done => { resolve = done; }),
    compose: () => { compositions++; return { size: 1024 }; }
  } });
  const img = h.make(h.source('weapon')), pending = h.load(img);
  h.api.dispose(); resolve({}); await pending;
  assert.equal(compositions, 0); assert.equal(h.encodes, 0); assert.equal(h.created.length, 0);
});

test('cache: install is idempotent; dispose removes observers, timers and all DOM listeners', async () => {
  const h = fixture(); h.api.install(); h.api.install();
  assert.equal(h.observers.length, 1); assert.equal(h.window.count(), 1);
  assert.equal(h.document.listeners.get('load:true').size, 1);
  const img = await h.render('live', true), source = h.source('live'), url = img.src;
  await h.window.emit('pagehide', { persisted: true }); assert.equal(h.revoked.length, 0);
  await h.window.emit('pagehide', { persisted: false });
  assert.equal(h.window.count(), 0); assert.equal(h.document.count(), 0);
  assert(h.observers.every(observer => !observer.active)); assert.equal(h.timers.size, 0);
  assert.equal(img.src, source, 'dispose restores connected images before revoking their URLs');
  assert.deepEqual(h.revoked, [url]); h.api.dispose(); assert.deepEqual(h.revoked, [url]);
  img.complete = true; h.api.install(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.encodes, 2, 'install scans images that already finished loading'); h.api.dispose();
});

test('cache: native dimensions and artwork crop retain their contracts', async () => {
  const h = fixture(); assert.throws(() => h.api.validateDimensions(897, 1496), /897 x 1497/);
  const bad = h.make(h.source('bad')); bad.naturalWidth = 1; await h.load(bad);
  assert.equal(h.encodes, 0); assert.equal(h.errors.length, 1);
  const art = h.make(h.source('art', 'art')); await h.load(art);
  assert.equal(art.dataset.v4Cropped, 'art'); assert.equal(h.encodes, 1); h.api.dispose();
});

test('browser: isolated source fixture exercises real images, eviction and DOM reuse', { timeout: 120000 }, async () => {
  const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE,
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const { chromium } = createRequire(path.join(runtime, '__card_media_cache__.cjs'))('playwright');
  const root = path.resolve(__dirname, '../..');
  const reference = JSON.parse(fs.readFileSync(path.join(root, 'V4/atelier/data/references.json'), 'utf8')).cards[0];
  const native = fs.readFileSync(path.join(root, reference.png));
  const weaponScript = fs.readFileSync(path.join(__dirname, 'base-weapons.js'));
  const weaponAssets = new Map(['11.svg', 'enamel.png'].map(name =>
    ['/assets/base-weapons/' + name, fs.readFileSync(path.join(__dirname, 'assets/base-weapons', name))]));
  // All HTTP responses come from these source buffers; no production server,
  // build, account, persistent browser profile or database is involved.
  const origin = 'http://127.0.0.1:19004';
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 412, height: 915 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', route => {
        const url = route.request().url();
        if (!url.startsWith(origin + '/')) return route.abort();
        const pathname = new URL(url).pathname;
        if (pathname.startsWith('/native/')) return route.fulfill({ contentType: 'image/png', body: native });
        if (pathname === '/card-media.js') return route.fulfill({ contentType: 'text/javascript', body: script });
        if (pathname === '/base-weapons.js') return route.fulfill({ contentType: 'text/javascript', body: weaponScript });
        if (weaponAssets.has(pathname)) return route.fulfill({
          contentType: pathname.endsWith('.svg') ? 'image/svg+xml' : 'image/png', body: weaponAssets.get(pathname)
        });
        if (pathname !== '/') return route.abort();
        return route.fulfill({ contentType: 'text/html', body:
          '<!doctype html><html><head><link rel="icon" href="data:,"></head><body><main></main><script src="/card-media.js"></script></body></html>' });
      });
      await context.addInitScript(() => {
        const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
        window.qaURLs = new Map(); window.qaRevoked = [];
        URL.createObjectURL = function(blob) { const url = create.call(this, blob); qaURLs.set(url, blob.size); return url; };
        URL.revokeObjectURL = function(url) { qaRevoked.push(url); qaURLs.delete(url); return revoke.call(this, url); };
      });
      await page.goto(origin);
      const result = await page.evaluate(async () => {
        const api = KalistarCardMedia, root = document.querySelector('main');
        const until = async predicate => {
          for (let i = 0; i < 1000; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
          throw Error('Timed out waiting for the source-only media fixture');
        };
        const source = id => api.image({ pngUrl: '/native/' + id + '.png' });
        const insert = id => { const img = new Image(); img.width = 80; img.src = source(id); root.append(img); return img; };
        const ready = img => img.dataset.v4Cropped === 'card' && img.complete && img.naturalWidth === 797;
        const images = [];
        // Enough live entries to exceed both the historical count and the new limits.
        for (let start = 0; start < 144; start += 12) {
          const batch = Array.from({ length: 12 }, (_, i) => insert(start + i)); images.push(...batch);
          await until(() => batch.every(ready));
        }
        api.collect();
        const visible = { ...api.cacheStats(), blobs: qaURLs.size, allReadable: images.every(ready) };
        const retained = images[0], detached = images[1], oldURL = detached.src;
        const clone = detached.cloneNode(true);
        for (const img of images.slice(1)) img.remove();
        await until(() => api.cacheStats().entries <= 48 && api.cacheStats().bytes <= 24 * 1024 * 1024);
        const bounded = { ...api.cacheStats(), blobs: qaURLs.size, liveURLRevoked: qaRevoked.includes(retained.src) };
        await until(() => qaRevoked.includes(oldURL));
        const holder = document.createElement('section'); holder.append(detached); root.append(holder);
        await until(() => ready(detached) && detached.src !== oldURL);
        holder.append(clone); await until(() => ready(clone));
        const cloneRecovered = clone.src === detached.src && clone.src !== oldURL;
        const recovered = detached.src;
        detached.src = '/native/unrelated.png';
        await until(() => detached.complete && detached.naturalWidth === 897);
        const unrelated = { src: detached.getAttribute('src'), marked: Boolean(detached.dataset.v4Cropped) };
        const external = URL.createObjectURL(await (await fetch('/native/external.png')).blob());
        detached.src = external; await detached.decode(); await new Promise(resolve => setTimeout(resolve, 0));
        const unrelatedBlobPreserved = detached.src === external;
        const preloaded = new Image(); preloaded.src = source('preloaded'); await preloaded.decode(); root.append(preloaded);
        await until(() => ready(preloaded));
        const lazy = new Image(); lazy.loading = 'lazy'; lazy.src = source('lazy'); root.append(lazy);
        await until(() => ready(lazy));
        const art = new Image(); art.src = api.image({ pngUrl: '/native/art.png' }, 'art'); root.append(art);
        await until(() => art.complete && art.dataset.v4Cropped === 'art' && art.naturalWidth === 460 && art.naturalHeight === 880);
        await new Promise((resolve, reject) => {
          const script = document.createElement('script'); script.src = '/base-weapons.js';
          script.onload = resolve; script.onerror = reject; document.head.append(script);
        });
        const glyph = new Image(); glyph.src = api.image({ pngUrl: '/native/glyph.png', weapon: 'Instrument' }); root.append(glyph);
        await until(() => ready(glyph));
        const glyphType = (await (await fetch(glyph.src)).blob()).type;
        const stableSource = source(0);
        api.dispose(); api.dispose();
        const disposed = { ...api.cacheStats(), ownedBlobs: qaURLs.size - 1, src: retained.getAttribute('src') };
        api.install(); api.install(); await until(() => ready(retained) && ready(preloaded) && ready(lazy));
        const restored = retained.src !== recovered && ready(retained);
        root.replaceChildren(); await new Promise(resolve => setTimeout(resolve, 0)); api.dispose();
        URL.revokeObjectURL(external);
        return { visible, bounded, cloneRecovered, glyphType, unrelated, unrelatedBlobPreserved, disposed, restored, stableSource,
          remainingBlobs: qaURLs.size, duplicateRevokes: qaRevoked.length - new Set(qaRevoked).size };
      });
      assert.equal(result.visible.entries, 144); assert.equal(result.visible.blobs, 144);
      assert(result.visible.allReadable); assert(result.visible.bytes > 24 * MiB);
      assert(result.bounded.entries <= 48); assert(result.bounded.bytes <= 24 * MiB);
      assert.equal(result.bounded.entries, result.bounded.blobs); assert(!result.bounded.liveURLRevoked);
      assert(result.cloneRecovered); assert.equal(result.glyphType, 'image/svg+xml');
      assert.deepEqual(result.unrelated, { src: '/native/unrelated.png', marked: false });
      assert(result.unrelatedBlobPreserved); assert.equal(result.disposed.entries, 0);
      assert.equal(result.disposed.ownedBlobs, 0); assert.equal(result.disposed.src, result.stableSource);
      assert(result.restored); assert.equal(result.remainingBlobs, 0); assert.equal(result.duplicateRevokes, 0);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ viewport, source: reference.png, ...result }));
      await context.close();
    }
  } finally {
    await browser?.close();
  }
});
