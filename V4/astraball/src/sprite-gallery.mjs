import { createSpriteLibrary } from './sprite-library.mjs';
import { CLIPS, frameAt } from './sprites.mjs';
const $ = selector => document.querySelector(selector);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const labels = { idle: 'attente', run: 'course', throw: 'lancer', guard: 'garde', charge: 'charge', hit: 'impact', celebrate: 'victoire' };
let running = !reduced.matches, elapsed = 0, last = 0, raf = 0, loaded = false, draws = 0, disposed = false;
const items = [], visible = new Set(), disposers = [];
function listen(target, event, callback) { target.addEventListener(event, callback); disposers.push(() => target.removeEventListener(event, callback)); }
function icons() { window.lucide?.createIcons(); }
function playbackButton() {
  const button = $('#play'), title = running ? 'Mettre en pause' : 'Lire';
  button.title = title; button.setAttribute('aria-label', title);
  button.innerHTML = '<i data-lucide="' + (running ? 'pause' : 'play') + '"></i>'; icons();
}
function draw(all = false) {
  const pose = $('#pose').value, frame = frameAt(pose, elapsed);
  for (const item of items) {
    if (!all && (!visible.has(item.node) || item.node.hidden)) continue;
    const size = Number(item.sprite.dataset.size || 192);
    item.sprite.style.backgroundPosition = -(frame % 4) * size + 'px ' + -Math.floor(frame / 4) * size + 'px';
    item.sprite.dataset.frame = String(frame);
    item.sprite.setAttribute('aria-label', item.entry.name + ', ' + labels[pose] + ', pose ' + (frame + 1) + ' sur 16');
  }
  draws++;
}
function resize() {
  const desired = 96 * Number($('#zoom').value);
  $('#gallery').style.gridTemplateColumns = 'repeat(auto-fit,minmax(min(' + Math.max(240, desired + 24) + 'px,100%),1fr))';
  for (const { node, sprite } of items) {
    if (node.hidden) continue;
    const size = Math.max(96, Math.min(desired, Math.floor(node.clientWidth / 96) * 96));
    sprite.dataset.size = String(size);
    sprite.style.width = sprite.style.height = size + 'px';
    sprite.style.backgroundSize = size * 4 + 'px ' + size * 4 + 'px';
  }
  draw(true);
}
function tick(now) {
  raf = 0;
  if (!running || document.hidden || !loaded) return;
  if (last) elapsed += Math.min(100, now - last);
  last = now; draw();
  const clip = CLIPS[$('#pose').value];
  if (!clip.loop && elapsed >= clip.frames.length / clip.fps * 1000) { running = false; playbackButton(); return; }
  raf = requestAnimationFrame(tick);
}
function schedule() { cancelAnimationFrame(raf); raf = 0; last = 0; if (running && loaded && !document.hidden) raf = requestAnimationFrame(tick); }
function filter() {
  const text = $('#search').value.trim().toLocaleLowerCase('fr'), faction = $('#faction').value;
  for (const item of items) item.node.hidden = !(item.entry.name.toLocaleLowerCase('fr').includes(text) && (!faction || item.entry.faction === faction));
  const count = items.filter(item => !item.node.hidden).length;
  $('#count').textContent = count + (count === 1 ? ' personnage / ' : ' personnages / ') + items.length + ' · ' + items.length * 16 + ' poses';
  $('#empty').hidden = count > 0; resize();
}
async function loadSprite(item) {
  if (item.loading || item.ready || disposed) return;
  item.loading = true;
  try {
    const image = new Image(); image.src = item.entry.file;
    await image.decode();
    if (image.naturalWidth !== 384 || image.naturalHeight !== 384) throw Error('Atlas invalide : ' + item.entry.name);
    if (disposed) return;
    item.sprite.style.backgroundImage = 'url("' + item.entry.file + '")';
    item.ready = true; item.node.dataset.loaded = 'true';
  } catch (error) {
    if (!disposed) { $('#error').hidden = false; $('#error').textContent = error.message; }
  } finally { item.loading = false; }
}
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      visible.add(entry.target);
      const item = items.find(item => item.node === entry.target);
      if (item && !item.node.hidden) void loadSprite(item);
    } else visible.delete(entry.target);
  }
  draw();
});
async function boot() {
  const response = await fetch('data/sprite-library.json', { cache: 'no-store' });
  if (!response.ok) throw Error('Catalogue indisponible');
  const library = createSpriteLibrary(await response.json());
  for (const faction of [...new Set(library.entries.map(entry => entry.faction))].sort()) {
    $('#faction').add(new Option(faction, faction));
  }
  for (const entry of library.entries) {
    const node = document.createElement('article'); node.className = 'character'; node.dataset.id = entry.id;
    const stage = document.createElement('div'); stage.className = 'stage';
    const sprite = document.createElement('div'); sprite.className = 'sprite'; sprite.setAttribute('role', 'img');
    const info = document.createElement('div'); info.className = 'info';
    const name = document.createElement('h2'); name.textContent = entry.name;
    const meta = document.createElement('p'); meta.className = 'meta'; meta.textContent = entry.race + ' · ' + entry.faction;
    const links = document.createElement('div'); links.className = 'links';
    const atlas = document.createElement('a'); atlas.href = entry.file; atlas.textContent = 'Atlas PNG'; atlas.target = '_blank'; atlas.rel = 'noopener';
    const download = document.createElement('a'); download.href = entry.file; download.download = entry.spriteKey + '.png'; download.textContent = 'Telecharger';
    links.append(atlas, download);
    const identity = document.createElement('small'); identity.className = 'identity'; identity.textContent = entry.characterId + ' / ' + entry.modelId;
    info.append(name, meta, links, identity); stage.append(sprite); node.append(stage, info); $('#gallery').append(node);
    const item = { entry, node, sprite }; items.push(item); observer.observe(node);
  }
  loaded = true; playbackButton(); filter(); schedule(); document.body.dataset.ready = 'true';
}
listen($('.toolbar'), 'submit', event => event.preventDefault());
listen($('#search'), 'input', filter); listen($('#faction'), 'change', filter);
listen($('#play'), 'click', () => { running = !running; playbackButton(); schedule(); });
listen($('#restart'), 'click', () => { elapsed = 0; running = !reduced.matches; playbackButton(); draw(true); schedule(); });
listen($('#pose'), 'change', () => { elapsed = 0; running = !reduced.matches; playbackButton(); draw(true); schedule(); });
listen($('#zoom'), 'change', resize);
listen(window, 'resize', resize);
listen($('#flip'), 'click', () => {
  const button = $('#flip'), flipped = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(flipped)); document.body.style.setProperty('--facing', flipped ? '-1' : '1');
  button.title = flipped ? 'Regarder vers la droite' : 'Regarder vers la gauche'; button.setAttribute('aria-label', button.title);
});
listen($('#background'), 'click', () => {
  const light = document.body.classList.toggle('light'), button = $('#background'); button.setAttribute('aria-pressed', String(light));
  button.title = light ? 'Fond sombre' : 'Fond clair'; button.setAttribute('aria-label', button.title);
});
listen(reduced, 'change', () => { if (reduced.matches) { running = false; elapsed = 0; playbackButton(); draw(true); schedule(); } });
listen(document, 'visibilitychange', schedule);
listen(window, 'pageshow', schedule);
listen(window, 'pagehide', event => {
  cancelAnimationFrame(raf);
  if (!event.persisted) { disposed = true; observer.disconnect(); disposers.forEach(dispose => dispose()); }
});
Object.defineProperty(window, 'SpriteGallery', { value: Object.freeze({ metrics: () => ({ loaded, textures: items.filter(item => item.ready).length, count: items.length, draws, running, visible: visible.size, elapsed }) }) });
boot().catch(error => { running = false; schedule(); $('#error').hidden = false; $('#error').textContent = error.message; });
