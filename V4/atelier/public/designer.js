'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const STORAGE = 'kalistar-v4-designer-v1';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const VIEW = { width: 737, height: 921 };
  const TEXT_LIMITS = { name: 30, title: 60, job: 22, description: 320 };
  const embedded = new URLSearchParams(location.search).get('embedded') === '1';
  const state = {
    profile: null, defaults: null, options: null, token: '', ready: false,
    draft: null, saved: '', drafts: [], catalogue: [], asset: null,
    side: 'atk', tab: 'identity', mode: 'catalogue', page: 0, pageSize: 5,
    saving: false, uploading: false, submitting: false, pending: null, intent: null,
    result: null, previewUrl: '', previewKind: '', previewSequence: 0, previewValid: false, previewError: '',
    previewController: null, previewTimer: null, pollTimer: null, initialized: false,
    epoch: 0, uploadSequence: 0, leaveAction: null, storageFailed: false,
  };
  document.documentElement.classList.toggle('embedded', embedded);
  if (embedded) document.querySelector('.brand').href = '/?embedded=1';
  const clone = value => structuredClone(value);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const signature = () => JSON.stringify(state.profile);
  const dirty = () => state.profile && signature() !== state.saved;
  const locked = () => !!(state.pending || state.intent || state.submitting);
  const icon = name => {
    const el = document.createElement('i');
    el.dataset.lucide = /^[a-z0-9-]+$/.test(name || '') ? name : 'circle';
    return el;
  };
  const icons = () => window.lucide?.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } });
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  function safeUrl(value) {
    if (typeof value !== 'string' || !value) return null;
    try {
      const url = new URL(value, location.origin);
      return url.origin === location.origin && /^https?:$/.test(url.protocol) ? url.href : null;
    } catch { return null; }
  }
  function toast(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { $('toast').hidden = true; }, 6500);
  }
  function status(title, detail = '', kind = '') {
    $('status-title').textContent = title;
    $('status-detail').textContent = detail;
    $('status-title').title = title;
    $('status-detail').title = detail;
    $('status-dot').className = 'status-dot ' + kind;
  }
  class ApiError extends Error {
    constructor(message, statusCode) { super(message); this.status = statusCode; }
  }
  async function api(path, body, { signal, png = false, retrySession = true } = {}) {
    const controller = signal ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), 30000) : null;
    try {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      mode: 'same-origin', credentials: 'same-origin', cache: 'no-store', signal: signal || controller.signal,
      headers: { 'X-Atelier-Token': state.token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 403 && body !== undefined && retrySession) {
      const fresh = await fetch('/api/designer/bootstrap', { mode: 'same-origin', credentials: 'same-origin', cache: 'no-store', signal: signal || controller.signal });
      if (fresh.ok) {
        const boot = await fresh.json();
        if (/^[a-f0-9]{64}$/.test(boot.token) && boot.token !== state.token) {
          state.token = boot.token;
          return await api(path, body, { signal, png, retrySession: false });
        }
      }
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.error || error.message || `Erreur HTTP ${response.status}.`, response.status);
    }
    if (png) {
      if (!response.headers.get('Content-Type')?.startsWith('image/png')) throw new Error('Apercu PNG indisponible.');
      return await response.blob();
    }
    return await response.json();
    } finally { clearTimeout(timeout); }
  }
  function normalize(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    const base = state.defaults || {};
    const profile = {};
    for (const key of Object.keys(TEXT_LIMITS)) profile[key] = typeof input[key] === 'string' ? input[key] : base[key] || '';
    for (const key of ['element', 'race', 'weapon', 'faction']) profile[key] = input[key] ?? base[key] ?? '';
    for (const key of ['atk', 'defense']) profile[key] = Array.isArray(input[key]) && input[key].length === 6 ? [...input[key]] : [...(base[key] || [0, 0, 0, 0, 0, 0])];
    for (const key of ['positions', 'magic', 'barriers']) profile[key] = Array.isArray(input[key]) ? [...new Set(input[key])] : [...(base[key] || (key === 'positions' ? [3] : []))];
    profile.upload = UUID.test(input.upload || '') ? input.upload : null;
    profile.crop = {};
    for (const key of ['zoom', 'x', 'y']) {
      const value = input.crop?.[key];
      profile.crop[key] = typeof value === 'number' && Number.isFinite(value) ? clamp(value, key === 'zoom' ? 1 : -1, key === 'zoom' ? 3 : 1) : key === 'zoom' ? 1 : 0;
    }
    cleanModes(profile);
    return profile;
  }
  function cleanModes(profile) {
    for (const [mode, side] of [['magic', 'atk'], ['barriers', 'defense']]) {
      profile[mode] = profile.element === 'NONE' ? [] : profile[mode].filter(die => Number.isInteger(die) && die >= 1 && die <= 6 && typeof profile[side][6 - die] === 'number').sort((a, b) => b - a);
    }
  }
  function effects(side) { return state.options?.effects?.[side] || []; }
  function validate(final = false) {
    const p = state.profile, errors = [];
    if (!p) return [{ field: '', message: 'Atelier en cours de connexion.' }];
    for (const [key, max] of Object.entries(TEXT_LIMITS)) {
      if (typeof p[key] !== 'string' || p[key].length > max || /[<>\x00-\x1f\x7f\u2028\u2029]/.test(p[key])) errors.push({ field: key, message: `Texte invalide : ${key} (${max} caracteres maximum).` });
    }
    if (final) for (const [key, title] of [['name', 'nom'], ['title', 'titre'], ['job', 'metier']]) {
      if (!p[key].trim()) errors.push({ field: key, message: 'Renseignez le ' + title + ' de votre carte.' });
    }
    for (const [key, optionKey] of [['element', 'elements'], ['race', 'races'], ['weapon', 'weapons'], ['faction', 'factions']]) {
      if (!state.options[optionKey].some(option => option.value === p[key])) errors.push({ field: key, message: 'Choix invalide : ' + key + '.' });
    }
    for (const side of ['atk', 'defense']) p[side].forEach((value, i) => {
      if (!(typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 999) && !effects(side).some(effect => effect.value === value && value !== 'number')) errors.push({ field: `${side}-${i}`, message: `${side === 'atk' ? 'ATK' : 'DEF'} D${6 - i} : entier de 0 a 999 ou effet requis.` });
    });
    if (!p.positions.length || p.positions.some(v => !Number.isInteger(v) || v < 1 || v > 5)) errors.push({ field: 'positions', message: 'Choisissez au moins une position.' });
    if (final && p.atk.includes('guard') && !p.positions.some(position => position === 1 || position === 5)) errors.push({ field: 'positions', message: 'Le Bouclier demande P1 ou P5 (Support).' });
    if (final && p.atk.includes('revive') && !p.positions.includes(5)) errors.push({ field: 'positions', message: 'Le Reraise demande P5 (Support).' });
    if (p.upload !== null && !UUID.test(p.upload)) errors.push({ field: 'upload', message: 'Illustration invalide.' });
    return errors;
  }
  function persist() {
    if (!state.profile) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ version: 1, profile: state.profile, saved: state.saved, draft: state.draft, asset: state.asset, pending: state.pending, intent: state.intent, result: state.result }));
    } catch {
      if (!state.storageFailed) toast('Stockage local indisponible. Enregistrez votre brouillon dans l\u2019atelier.');
      state.storageFailed = true;
    }
  }
  function updateControls() {
    const busy = locked(), errors = validate();
    $('editor-fields').disabled = !state.initialized || busy;
    $('save-draft').disabled = !state.initialized || busy || state.saving || state.uploading || !!errors.length;
    $('create-card').disabled = !state.initialized || !state.ready || !state.previewValid || busy || state.uploading || state.saving || !!errors.length;
    $('new-card').disabled = !state.initialized || busy || state.uploading || state.saving;
    $('drawer-new').disabled = $('new-card').disabled;
    $('import-art').disabled = state.uploading;
    $('crop-controls').disabled = !state.profile?.upload || !state.asset?.width;
    $('card-pan').hidden = !state.profile?.upload || !state.asset?.width || state.tab !== 'image' || busy || state.previewKind === 'published';
    document.querySelectorAll('.crystal-button,.position-chip').forEach(button => { button.disabled = busy || !state.initialized; });
    $('save-state').textContent = state.saving ? 'Enregistrement...' : dirty() ? (state.storageFailed ? 'Non enregistre' : 'Modifications conservees localement') : state.draft ? 'Brouillon enregistre' : 'Carte vierge';
    $('validation-message').textContent = errors[0]?.message || state.previewError || '';
    $('validation-message').title = errors[0]?.message || state.previewError || '';
    document.querySelectorAll('[data-invalid-field],.field input,.field select,.field textarea').forEach(el => {
      const field = el.dataset.invalidField || el.id.replace('field-', '');
      el.setAttribute('aria-invalid', String(errors.some(error => error.field === field)));
    });
    $('retry-connection').hidden = !(state.intent && !state.submitting) && state.ready;
  }
  function label(key, value) { return state.options?.[key]?.find(option => option.value === value)?.label || value || ''; }
  function updateSummary() {
    const p = state.profile;
    $('card-name').textContent = p.name.trim() || 'Carte sans nom';
    $('card-name').title = p.name;
    $('card-subtitle').textContent = p.title || '\u00a0';
    $('card-subtitle').title = p.title;
    $('card-element').textContent = label('elements', p.element);
    $('crystal-name').textContent = label('elements', p.element);
    $('description-count').textContent = p.description.length + ' / 320';
    for (const [field, options] of [['race', 'races'], ['weapon', 'weapons'], ['faction', 'factions']]) $('fact-' + field).textContent = label(options, p[field]);
    document.querySelectorAll('.crystal-button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === String(p.element))));
    document.querySelectorAll('.position-chip').forEach(button => button.setAttribute('aria-pressed', String(p.positions.includes(Number(button.dataset.position)))));
    const values = p[state.side];
    $('combat-total').textContent = values.filter(v => typeof v === 'number').reduce((sum, v) => sum + v, 0) + ' points au total';
    const count = p[state.side === 'atk' ? 'magic' : 'barriers'].length;
    $('combat-mode').textContent = count + (state.side === 'atk' ? ' faces magiques' : ' barrieres');
  }
  function changed() {
    if (!state.profile) return;
    state.result = null;
    $('published-links').hidden = true;
    if (state.previewKind === 'published') state.previewKind = 'preview';
    updateSummary(); updateControls(); persist(); queuePreview();
  }
  function fillOptions() {
    for (const [field, key] of [['element', 'elements'], ['race', 'races'], ['weapon', 'weapons'], ['faction', 'factions']]) {
      const select = $('field-' + field);
      select.replaceChildren(...state.options[key].map(option => new Option(option.label, option.value)));
    }
    $('crystals').replaceChildren();
    const crystalIcons = { NONE: 'circle-slash', ELECTRO: 'zap', HYDRO: 'droplets', AERO: 'wind', PYRO: 'flame', CRYO: 'snowflake', LUXO: 'sun', MINERO: 'mountain', HERBO: 'sprout', GEO: 'mountain-snow', HEMATO: 'droplet', NECRO: 'skull', RAINBOW: 'gem' };
    for (const option of state.options.elements) {
      const button = make('button', 'crystal-button');
      button.dataset.value = option.value;
      button.title = option.label; button.setAttribute('aria-label', option.label);
      if (CSS.supports('color', option.color || '')) button.style.setProperty('--swatch', option.color);
      button.append(icon(crystalIcons[option.value] || 'gem'));
      button.addEventListener('click', () => { state.profile.element = option.value; cleanModes(state.profile); $('field-element').value = option.value; renderStats(); changed(); });
      $('crystals').append(button);
    }
    for (const id of ['positions', 'combat-positions']) {
      $(id).replaceChildren();
      for (let position = 1; position <= 5; position++) {
        const button = make('button', 'position-chip', String(position));
        button.dataset.position = position; button.title = 'Position ' + position;
        button.setAttribute('aria-label', 'Position ' + position);
        button.addEventListener('click', () => {
          const values = state.profile.positions;
          state.profile.positions = values.includes(position) ? values.filter(v => v !== position) : [...values, position].sort((a, b) => a - b);
          changed();
        });
        $(id).append(button);
      }
    }
    icons();
  }
  function renderStats() {
    const side = state.side, attack = side === 'atk', mode = attack ? 'magic' : 'barriers';
    $('side-atk').setAttribute('aria-pressed', String(attack));
    $('side-defense').setAttribute('aria-pressed', String(!attack));
    $('mode-heading').textContent = attack ? 'Magie' : 'Barriere';
    $('stat-rows').replaceChildren();
    state.profile[side].forEach((value, index) => {
      // Native profiles run from D6 to D1; mode arrays contain die values, not indexes.
      const die = 6 - index, numeric = typeof value === 'number' || value === null;
      const row = make('div', 'stat-row');
      const face = make('span', 'die-face', String(die)); face.title = 'De ' + die;
      const type = make('select'); type.setAttribute('aria-label', `${attack ? 'ATK' : 'DEF'} D${die}, type`);
      type.append(new Option('Valeur', 'number'));
      for (const effect of effects(side)) if (effect.value !== 'number') type.append(new Option(effect.label, effect.value));
      type.value = numeric ? 'number' : value;
      const number = make('input'); number.type = 'number'; number.min = '0'; number.max = '999'; number.step = '1'; number.inputMode = 'numeric';
      number.value = numeric && value !== null ? value : ''; number.disabled = !numeric;
      number.hidden = !numeric;
      const effectSymbol = make('span', 'effect-symbol'); effectSymbol.hidden = numeric;
      const selectedEffect = effects(side).find(effect => effect.value === value);
      effectSymbol.title = selectedEffect?.label || '';
      effectSymbol.append(icon(selectedEffect?.icon || 'circle'));
      number.dataset.invalidField = `${side}-${index}`;
      number.setAttribute('aria-label', `${attack ? 'ATK' : 'DEF'} D${die}, valeur`);
      const toggle = make('label', 'mode-toggle');
      const checkbox = make('input'); checkbox.type = 'checkbox'; checkbox.checked = state.profile[mode].includes(die);
      checkbox.disabled = !numeric || state.profile.element === 'NONE';
      const modeLabel = attack ? 'Attaque magique' : 'Barriere';
      checkbox.setAttribute('aria-label', `D${die}, ${modeLabel}`);
      toggle.title = checkbox.disabled ? (state.profile.element === 'NONE' ? 'Indisponible sans cristal' : 'Reserve aux valeurs numeriques') : modeLabel;
      const symbol = make('span'); symbol.append(icon(attack ? 'sparkles' : 'shield-check')); toggle.append(checkbox, symbol);
      type.addEventListener('change', () => {
        state.profile[side][index] = type.value === 'number' ? 0 : type.value;
        cleanModes(state.profile); renderStats(); changed();
        $('stat-rows').children[index].querySelector('select').focus();
      });
      number.addEventListener('input', () => { state.profile[side][index] = number.value === '' ? null : number.valueAsNumber; changed(); });
      checkbox.addEventListener('change', () => {
        state.profile[mode] = state.profile[mode].filter(v => v !== die);
        if (checkbox.checked) state.profile[mode].push(die);
        state.profile[mode].sort((a, b) => b - a); changed();
      });
      row.append(face, type, number, effectSymbol, toggle); $('stat-rows').append(row);
    });
    icons();
  }
  function fillEditor() {
    for (const key of [...Object.keys(TEXT_LIMITS), 'race', 'weapon', 'faction', 'element']) $('field-' + key).value = state.profile[key];
    renderStats(); renderCrop(); updateSummary(); updateControls();
  }
  function setTab(name) {
    state.tab = name;
    document.querySelectorAll('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === name;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      $('panel-' + button.dataset.tab).hidden = !selected;
    });
    if (state.profile) { renderCrop(); updateControls(); }
    requestAnimationFrame(renderCrop);
  }
  function pane(name) {
    $('atelier').dataset.pane = name;
    document.querySelectorAll('[data-pane][data-pane]:not(#atelier)').forEach(button => {
      if (button.dataset.pane === name) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    requestAnimationFrame(() => { sizeCard(); renderCrop(); });
  }
  function sizeCard() {
    const stage = $('card-stage'), css = getComputedStyle(stage);
    const width = stage.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    const height = stage.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
    if (width <= 0 || height <= 0) return;
    const w = Math.min(width, height * 897 / 1497);
    $('card-shell').style.width = w + 'px'; $('card-shell').style.height = w * 1497 / 897 + 'px';
  }
  function previewStatus(message, kind = '') {
    $('preview-label').textContent = message; $('preview-label').dataset.status = kind;
    $('retry-preview').hidden = kind !== 'error';
  }
  function cancelPreview() {
    clearTimeout(state.previewTimer);
    state.previewController?.abort(); state.previewSequence++;
  }
  function queuePreview(delay = 230) {
    cancelPreview();
    if (!state.initialized || locked()) return;
    state.previewValid = false; state.previewError = ''; updateControls();
    if (!state.ready) { previewStatus('Atelier en preparation', 'busy'); return; }
    if (validate().length) { previewStatus('Apercu en attente de correction', 'error'); return; }
    previewStatus('Composition en cours', 'busy');
    state.previewTimer = setTimeout(renderPreview, delay);
  }
  async function loadImage(url) {
    const img = new Image(); img.src = url;
    await img.decode();
    return img;
  }
  function replacePreview(url, kind) {
    const previous = state.previewUrl;
    state.previewUrl = url; state.previewKind = kind;
    $('card-image').src = url; $('card-image').hidden = false; $('card-placeholder').hidden = true;
    $('card-image').alt = 'Carte ' + (state.profile.name || 'sans nom'); $('zoom-card').disabled = false;
    if (previous?.startsWith('blob:') && previous !== url) URL.revokeObjectURL(previous);
    if ($('viewer').open && $('viewer').dataset.source === 'preview') $('viewer-image').src = url;
  }
  async function renderPreview(attempt = 0) {
    const sequence = state.previewSequence, snapshot = clone(state.profile);
    const controller = new AbortController(); state.previewController = controller;
    let url;
    const timeout = setTimeout(() => controller.abort('timeout'), 45000);
    try {
      const blob = await api('/api/designer/preview', snapshot, { signal: controller.signal, png: true });
      url = URL.createObjectURL(blob); await loadImage(url);
      if (sequence !== state.previewSequence) { URL.revokeObjectURL(url); return; }
      replacePreview(url, 'preview'); previewStatus('Apercu a jour');
      state.previewValid = true; state.previewError = ''; updateControls();
    } catch (error) {
      if (url) URL.revokeObjectURL(url);
      if (sequence !== state.previewSequence) return;
      if (error instanceof ApiError && error.status === 429 && attempt < 3) {
        previewStatus('Apercu en attente', 'busy');
        state.previewTimer = setTimeout(() => renderPreview(attempt + 1), 700 * (attempt + 1));
        return;
      }
      previewStatus(controller.signal.reason === 'timeout' ? 'Apercu trop long. Reessayer.' : 'Apercu indisponible', 'error');
      $('preview-label').title = error.message || 'Delai depasse';
      state.previewError = error.message || 'Apercu indisponible.'; state.previewValid = false; updateControls();
    } finally { clearTimeout(timeout); }
  }
  function cropGeometry() {
    const asset = state.asset, crop = state.profile?.crop;
    if (!asset?.width || !asset.height || !crop) return null;
    const scale = Math.max(VIEW.width / asset.width, VIEW.height / asset.height) * crop.zoom;
    const width = asset.width * scale, height = asset.height * scale;
    return { width, height, rangeX: Math.max(0, (width - VIEW.width) / 2), rangeY: Math.max(0, (height - VIEW.height) / 2) };
  }
  function renderCrop() {
    if (!state.profile) return;
    const crop = state.profile.crop, geometry = cropGeometry();
    for (const key of ['zoom', 'x', 'y']) $('crop-' + key).value = crop[key];
    $('zoom-value').textContent = crop.zoom.toFixed(2) + '\u00d7';
    $('import-label').textContent = state.uploading ? 'Import en cours...' : state.profile.upload ? 'Remplacer l\u2019illustration' : 'Importer une illustration';
    $('image-meta').textContent = geometry ? `${state.asset.width} \u00d7 ${state.asset.height} px` : 'PNG, JPEG, WebP';
    $('crop-image').hidden = !geometry; $('crop-empty').hidden = !!geometry;
    $('crop-controls').disabled = !geometry;
    if (!geometry) return;
    const ratio = $('crop-viewport').clientWidth / VIEW.width;
    const image = $('crop-image');
    if (image.src !== state.asset.url) image.src = state.asset.url;
    image.style.width = geometry.width * ratio + 'px'; image.style.height = geometry.height * ratio + 'px';
    image.style.left = (-geometry.rangeX + crop.x * geometry.rangeX) * ratio + 'px';
    image.style.top = (-geometry.rangeY + crop.y * geometry.rangeY) * ratio + 'px';
    $('crop-x').disabled = geometry.rangeX < 0.01; $('crop-y').disabled = geometry.rangeY < 0.01;
  }
  function installPan(surface) {
    let drag = null;
    surface.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !cropGeometry() || locked() || state.uploading) return;
      const bounds = surface.getBoundingClientRect();
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, crop: clone(state.profile.crop), geometry: cropGeometry(), scale: bounds.width / VIEW.width };
      surface.setPointerCapture(event.pointerId); surface.classList.add('dragging'); surface.focus(); event.preventDefault();
    });
    surface.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const { geometry, scale, crop } = drag;
      state.profile.crop.x = geometry.rangeX ? clamp(crop.x + (event.clientX - drag.startX) / scale / geometry.rangeX, -1, 1) : 0;
      state.profile.crop.y = geometry.rangeY ? clamp(crop.y + (event.clientY - drag.startY) / scale / geometry.rangeY, -1, 1) : 0;
      renderCrop(); changed();
    });
    const finish = () => { if (!drag) return; drag = null; surface.classList.remove('dragging'); queuePreview(0); };
    surface.addEventListener('pointerup', finish); surface.addEventListener('pointercancel', finish); surface.addEventListener('lostpointercapture', finish);
    surface.addEventListener('keydown', event => {
      const direction = { ArrowLeft: ['x', -1], ArrowRight: ['x', 1], ArrowUp: ['y', -1], ArrowDown: ['y', 1] }[event.key];
      const geometry = cropGeometry();
      if (!direction || !geometry || locked()) return;
      event.preventDefault(); const [axis, sign] = direction;
      if (!geometry[axis === 'x' ? 'rangeX' : 'rangeY']) return;
      state.profile.crop[axis] = clamp(state.profile.crop[axis] + sign * (event.shiftKey ? 0.15 : 0.03), -1, 1); renderCrop(); changed();
    });
  }
  async function restoreAsset(asset) {
    if (!state.profile.upload) { state.asset = null; renderCrop(); return; }
    const id = state.profile.upload, epoch = state.epoch;
    const url = safeUrl(asset?.id === id ? asset.url : `/media/upload/${id}.png`);
    try {
      const image = await loadImage(url);
      if (epoch !== state.epoch || id !== state.profile.upload) return;
      state.asset = { id, url, width: image.naturalWidth, height: image.naturalHeight };
      renderCrop(); updateControls(); persist();
    } catch {
      if (epoch === state.epoch) toast('Illustration inaccessible. Vous pouvez la remplacer.');
    }
  }
  async function upload(file) {
    if (!file || state.uploading || locked()) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast('Choisissez un PNG, JPEG ou WebP.'); return; }
    if (file.size > 8000000) { toast('L\u2019illustration doit peser au maximum 8 Mo.'); return; }
    const sequence = ++state.uploadSequence, epoch = state.epoch;
    state.uploading = true; renderCrop(); updateControls();
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(new Error('Lecture de l\u2019image impossible.')); reader.readAsDataURL(file);
      });
      const asset = await api('/api/uploads', { base64 });
      if (!UUID.test(asset.id) || !safeUrl(asset.url)) throw new Error('Reponse d\u2019import invalide.');
      const image = await loadImage(safeUrl(asset.url));
      if (sequence !== state.uploadSequence || epoch !== state.epoch) return;
      state.asset = { id: asset.id, url: safeUrl(asset.url), width: image.naturalWidth, height: image.naturalHeight };
      state.profile.upload = asset.id; state.profile.crop = { zoom: 1, x: 0, y: 0 };
      changed(); toast('Illustration importee.');
    } catch (error) { toast(error.message); }
    finally { state.uploading = false; renderCrop(); updateControls(); }
  }
  function askLeave(action) {
    if (locked() || state.saving || state.uploading) { toast('Attendez la fin de l\u2019operation en cours.'); return; }
    if (!dirty()) { action(); return; }
    state.leaveAction = action; $('leave-dialog').showModal();
  }
  function selectProfile(profile, draft = null, asset = null) {
    state.epoch++; state.profile = normalize(profile); state.draft = draft ? { id: draft.id, revision: draft.revision } : null;
    state.asset = null; state.result = null; state.saved = signature();
    $('published-links').hidden = true;
    fillEditor(); persist(); restoreAsset(asset); queuePreview(0); pane('preview');
    status(state.ready ? 'Atelier pret' : 'Creation indisponible', state.ready ? 'Nouvelle carte V4' : 'Service de creation non disponible', state.ready ? '' : 'error');
  }
  function newCard() { askLeave(() => { $('library-dialog').close(); selectProfile(state.defaults); }); }
  async function saveDraft() {
    if (state.saving || locked() || validate().length) return;
    const snapshot = clone(state.profile), stamp = signature(), epoch = state.epoch;
    state.saving = true; updateControls();
    try {
      const draft = await api('/api/designer/drafts', { ...(state.draft || {}), profile: snapshot });
      if (!draft.id || !Number.isInteger(draft.revision) || !draft.profile) throw new Error('Reponse de brouillon invalide.');
      if (state.epoch === epoch) {
        state.draft = { id: draft.id, revision: draft.revision };
        // Keep edits made while the request was in flight; advance the saved revision only.
        if (signature() === stamp) { state.profile = normalize(draft.profile); fillEditor(); state.saved = signature(); queuePreview(); }
        else state.saved = JSON.stringify(normalize(draft.profile));
        persist();
      }
      state.drafts = [draft, ...state.drafts.filter(item => item.id !== draft.id)];
      toast('Brouillon enregistre.'); renderLibrary();
    } catch (error) { toast(error.message); }
    finally { state.saving = false; updateControls(); }
  }
  async function refreshDrafts() {
    try {
      const drafts = await api('/api/designer/drafts');
      if (!Array.isArray(drafts)) throw new Error('Liste des brouillons invalide.');
      state.drafts = drafts; state.draftError = ''; renderLibrary();
    } catch (error) { state.draftError = error.message; renderLibrary(); }
  }
  function openLibrary(mode = 'catalogue') {
    state.mode = mode; state.page = 0;
    if (!$('library-dialog').open) $('library-dialog').showModal();
    renderLibrary(); requestAnimationFrame(sizeLibrary);
    if (mode === 'drafts') refreshDrafts();
  }
  function sizeLibrary() {
    if (!$('library-dialog').open) return;
    const size = Math.max(1, Math.floor($('library-list').clientHeight / 104));
    if (size !== state.pageSize) { state.pageSize = size; renderLibrary(); }
  }
  function openViewer(url, name, source = 'catalogue') {
    if (!url) return;
    $('viewer').dataset.source = source; $('viewer-name').textContent = name || 'Carte';
    $('viewer-image').src = url; $('viewer-image').alt = 'Carte ' + name; $('viewer-error').hidden = true;
    if (!$('viewer').open) $('viewer').showModal();
  }
  function renderLibrary() {
    $('library-catalogue').setAttribute('aria-pressed', String(state.mode === 'catalogue'));
    $('library-drafts').setAttribute('aria-pressed', String(state.mode === 'drafts'));
    const query = $('library-search').value.trim().toLocaleLowerCase('fr');
    const source = state.mode === 'catalogue' ? state.catalogue : state.drafts;
    const list = source.filter(item => {
      const p = item.profile || item;
      return `${p.name} ${p.title} ${p.element}`.toLocaleLowerCase('fr').includes(query);
    });
    const pages = Math.max(1, Math.ceil(list.length / state.pageSize)); state.page = Math.min(state.page, pages - 1);
    $('library-list').replaceChildren();
    for (const item of list.slice(state.page * state.pageSize, (state.page + 1) * state.pageSize)) {
      const isDraft = state.mode === 'drafts';
      const profile = isDraft ? item.profile : item, button = make('button', 'library-item');
      const url = safeUrl(item.pngUrl);
      if (url) { const img = make('img'); img.src = url; img.alt = ''; img.loading = 'lazy'; button.append(img); }
      else { const badge = make('span', 'draft-icon'); badge.append(icon('file-pen-line')); button.append(badge); }
      const info = make('span'); info.append(make('strong', '', profile.name || 'Carte sans nom'), make('small', '', profile.title || label('elements', profile.element)), make('small', '', item.revision ? 'Revision ' + item.revision : label('elements', profile.element)));
      button.append(info, icon(isDraft ? 'arrow-right' : 'maximize-2'));
      button.addEventListener('click', () => {
        if (isDraft) askLeave(() => { $('library-dialog').close(); selectProfile(item.profile, item); });
        else openViewer(url, item.name);
      });
      $('library-list').append(button);
    }
    if (!list.length) $('library-list').append(make('p', 'empty', state.mode === 'drafts' && state.draftError ? state.draftError : state.mode === 'drafts' ? 'Aucun brouillon.' : 'Aucune carte.'));
    $('library-page').textContent = `${state.page + 1} / ${pages}`;
    $('library-prev').disabled = state.page === 0; $('library-next').disabled = state.page === pages - 1;
    icons();
  }
  async function createCard() {
    if (locked() || !state.ready || state.uploading || state.saving) return;
    const errors = validate(true);
    if (errors.length) {
      $('validation-message').textContent = errors[0].message; toast(errors[0].message);
      if (['name', 'title', 'job'].includes(errors[0].field)) { setTab('identity'); pane('editor'); $('field-' + errors[0].field).setAttribute('aria-invalid', 'true'); $('field-' + errors[0].field).focus(); }
      if (errors[0].field === 'positions') { setTab('combat'); pane('editor'); $('combat-positions').querySelector('button').focus(); }
      $('validation-message').textContent = errors[0].message;
      return;
    }
    state.intent = { requestId: crypto.randomUUID(), profile: clone(state.profile) };
    persist(); await submitIntent();
  }
  async function submitIntent() {
    if (!state.intent || state.submitting) return;
    state.submitting = true; cancelPreview(); updateControls();
    status('Creation en cours', 'Envoi de la carte', 'busy');
    try {
      const job = await api('/api/designer/create', state.intent);
      if (!job.id || !['queued', 'rendering', 'verified', 'published', 'failed'].includes(job.state)) throw new Error('Reponse de creation incomplete.');
      state.pending = { id: job.id, profile: clone(state.intent.profile) }; state.intent = null;
      persist(); pollJob();
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) state.intent = null;
      status('Creation non confirmee', error.message + (state.intent ? ' Reessayer la connexion.' : ''), 'error');
      toast(error.message); persist();
    } finally { state.submitting = false; updateControls(); }
  }
  async function showPublished(result, snapshot) {
    cancelPreview();
    state.result = { result, signature: JSON.stringify(snapshot) };
    const pngUrl = safeUrl(result.pngUrl), psdUrl = safeUrl(result.psdUrl);
    $('published-links').hidden = false;
    for (const [id, url] of [['result-open', pngUrl], ['result-png', pngUrl], ['result-psd', psdUrl]]) {
      $(id).hidden = !url; if (url) $(id).href = url; else $(id).removeAttribute('href');
    }
    state.previewKind = 'published'; updateControls();
    previewStatus('PNG natif publie'); status('Carte publiee', result.name || snapshot.name);
    pane('preview'); persist();
    const sequence = state.previewSequence;
    try {
      if (!pngUrl) throw new Error('PNG natif absent.');
      await loadImage(pngUrl);
      if (sequence !== state.previewSequence) return;
      replacePreview(pngUrl, 'published');
    } catch (error) {
      if (sequence === state.previewSequence) { previewStatus('PNG publie indisponible', 'error'); toast(error.message); }
    }
  }
  async function pollJob() {
    clearTimeout(state.pollTimer);
    const pending = state.pending;
    if (!pending) return;
    try {
      const job = await api('/api/designer/jobs/' + encodeURIComponent(pending.id));
      if (state.pending?.id !== pending.id) return;
      const messages = { queued: 'Carte en file', rendering: 'Composition de la carte', verified: 'Carte verifiee', published: 'Carte publiee', failed: 'Creation interrompue' };
      if (!messages[job.state]) throw new Error('Etat de creation inconnu.');
      status(messages[job.state], job.error || job.message || '', job.state === 'failed' ? 'error' : 'busy');
      if (job.state === 'published') {
        if (!job.result?.id || !safeUrl(job.result.pngUrl)) throw new Error('Publication terminee, resultat en attente.');
        state.pending = null; state.saved = signature();
        if (!state.catalogue.some(card => card.id === job.result.id)) state.catalogue.unshift({ ...job.result, title: pending.profile.title, element: pending.profile.element });
        // Notify only the embedding V4 game, never another origin or a V3 database.
        if (embedded && window.parent !== window) window.parent.postMessage({ type: 'kalistar:card-published', id: job.result.id }, location.origin);
        await showPublished(job.result, pending.profile); renderLibrary(); updateControls(); persist();
        return;
      }
      if (job.state === 'failed') {
        state.pending = null; updateControls(); persist(); toast(job.error || job.message || 'La creation a echoue.');
        return;
      }
    } catch (error) {
      status('Suivi temporairement indisponible', error.message, 'error');
    }
    if (state.pending?.id === pending.id) state.pollTimer = setTimeout(pollJob, 2000);
  }
  async function init() {
    if (init.running) return;
    init.running = true; $('retry-connection').hidden = true;
    try {
      const boot = await api('/api/designer/bootstrap');
      if (!boot.token || !boot.options || !boot.defaults) throw new Error('Configuration de l\u2019atelier incomplete.');
      for (const key of ['elements', 'races', 'weapons', 'factions']) if (!Array.isArray(boot.options[key]) || !boot.options[key].length) throw new Error('Options absentes : ' + key);
      for (const side of ['atk', 'defense']) if (!Array.isArray(boot.options.effects?.[side])) throw new Error('Effets absents : ' + side);
      state.token = boot.token; state.options = boot.options; state.ready = boot.ready === true;
      state.catalogue = Array.isArray(boot.catalogue) ? boot.catalogue : [];
      const first = !state.initialized;
      state.defaults = normalize({ ...boot.defaults, name: '', upload: null, crop: { zoom: 1, x: 0, y: 0 } });
      state.initialized = true; fillOptions();
      if (first) {
        let cached;
        try { cached = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch { /* Local storage is optional. */ }
        state.profile = normalize(cached?.version === 1 ? cached.profile : state.defaults);
        state.saved = typeof cached?.saved === 'string' ? cached.saved : signature();
        state.draft = cached?.draft?.id && Number.isInteger(cached.draft.revision) ? { id: cached.draft.id, revision: cached.draft.revision } : null;
        state.pending = cached?.pending?.id && cached.pending.profile ? { id: cached.pending.id, profile: normalize(cached.pending.profile) } : null;
        state.intent = !state.pending && UUID.test(cached?.intent?.requestId || '') ? { requestId: cached.intent.requestId, profile: normalize(cached.intent.profile) } : null;
        state.result = cached?.result?.result && cached.result.signature === signature() ? cached.result : null;
        restoreAsset(cached?.asset);
      }
      fillEditor(); persist(); refreshDrafts();
      if (state.pending) { status('Reprise du suivi', '', 'busy'); pollJob(); }
      else if (state.intent) status('Creation a confirmer', 'Reprendre avec le meme identifiant de requete.', 'error');
      else if (state.result) showPublished(state.result.result, state.profile);
      else { status(state.ready ? 'Atelier pret' : 'Creation indisponible', boot.error || 'Nouvelle carte V4', state.ready ? '' : 'error'); queuePreview(0); }
      updateControls();
    } catch (error) {
      state.ready = false; status('Atelier indisponible', error.message, 'error'); $('retry-connection').hidden = false; toast(error.message);
    } finally { init.running = false; }
  }

  for (const key of Object.keys(TEXT_LIMITS)) $('field-' + key).addEventListener('input', event => {
    state.profile[key] = event.target.value.replace(/[\r\n\t]+/g, ' '); changed();
  });
  for (const key of ['race', 'weapon', 'faction', 'element']) $('field-' + key).addEventListener('change', event => {
    const optionsKey = { race: 'races', weapon: 'weapons', faction: 'factions', element: 'elements' }[key];
    state.profile[key] = state.options[optionsKey].find(option => String(option.value) === event.target.value)?.value;
    if (key === 'element') { cleanModes(state.profile); renderStats(); }
    changed();
  });
  document.querySelectorAll('[data-tab]').forEach((button, index, buttons) => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
    button.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % buttons.length, ArrowLeft: (index + buttons.length - 1) % buttons.length, Home: 0, End: buttons.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault(); setTab(buttons[next].dataset.tab); buttons[next].focus();
    });
  });
  document.querySelectorAll('.mobile-nav [data-pane]').forEach(button => button.addEventListener('click', () => pane(button.dataset.pane)));
  for (const side of ['atk', 'defense']) $('side-' + side).addEventListener('click', () => { state.side = side; renderStats(); updateSummary(); updateControls(); });
  for (const key of ['zoom', 'x', 'y']) $('crop-' + key).addEventListener('input', event => { state.profile.crop[key] = Number(event.target.value); renderCrop(); changed(); });
  installPan($('crop-viewport')); installPan($('card-pan'));
  $('import-art').addEventListener('click', () => $('art-upload').click());
  $('art-upload').addEventListener('change', event => { upload(event.target.files[0]); event.target.value = ''; });
  $('reset-crop').addEventListener('click', () => { state.profile.crop = { zoom: 1, x: 0, y: 0 }; renderCrop(); changed(); });
  $('remove-art').addEventListener('click', () => { state.profile.upload = null; state.profile.crop = { zoom: 1, x: 0, y: 0 }; state.asset = null; renderCrop(); changed(); });
  $('save-draft').addEventListener('click', saveDraft); $('create-card').addEventListener('click', createCard);
  $('new-card').addEventListener('click', newCard); $('drawer-new').addEventListener('click', newCard);
  $('open-library').addEventListener('click', () => openLibrary()); $('mobile-library').addEventListener('click', () => openLibrary());
  $('open-drafts').addEventListener('click', () => openLibrary('drafts'));
  for (const mode of ['catalogue', 'drafts']) $('library-' + mode).addEventListener('click', () => openLibrary(mode));
  $('library-search').addEventListener('input', () => { state.page = 0; renderLibrary(); });
  $('library-prev').addEventListener('click', () => { state.page--; renderLibrary(); }); $('library-next').addEventListener('click', () => { state.page++; renderLibrary(); });
  $('zoom-card').addEventListener('click', () => openViewer(state.previewUrl, state.profile.name || 'Carte sans nom', 'preview'));
  $('viewer-image').addEventListener('error', () => { $('viewer-error').hidden = false; });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  $('cancel-leave').addEventListener('click', () => { state.leaveAction = null; $('leave-dialog').close(); });
  $('confirm-leave').addEventListener('click', () => { const action = state.leaveAction; state.leaveAction = null; $('leave-dialog').close(); action?.(); });
  $('retry-preview').addEventListener('click', () => state.result ? showPublished(state.result.result, state.profile) : queuePreview(0));
  $('retry-connection').addEventListener('click', () => state.intent ? submitIntent() : init());
  window.addEventListener('beforeunload', event => { if (dirty() || state.pending || state.intent || state.uploading) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('pagehide', persist);
  const resize = new ResizeObserver(() => { sizeCard(); renderCrop(); sizeLibrary(); });
  resize.observe($('card-stage')); resize.observe($('crop-viewport')); resize.observe($('library-list'));
  icons(); init();
})();
