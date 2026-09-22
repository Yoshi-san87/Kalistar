(() => {
  'use strict';
  // Presentation only: no random draws or writes to the combat state.
  const views = new Map(), images = new Map(), silhouettes = new WeakMap(), pending = new Set();
  const motion = matchMedia('(prefers-reduced-motion:reduce)');
  const rows = [774, 676, 577, 475, 371, 147], TAU = Math.PI * 2;
  let generation = 0, idleFrame = 0, lastPaint = 0;

  function art(src) {
    if (!images.has(src)) { const image = new Image(); image.src = src; images.set(src, image); }
    return images.get(src);
  }
  function weaponBounds(image) {
    if (!silhouettes.has(image)) {
      // Fit the painted silhouette, not the transparent margins of the source icon.
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 8) {
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
      }
      silhouettes.set(image, right >= left ? [left, top, right - left + 1, bottom - top + 1] : [0, 0, canvas.width, canvas.height]);
    }
    return silhouettes.get(image);
  }
  function card(v) {
    return document.querySelector(`.formation[data-player="${v.host.dataset.player}"] .slot[data-position="${v.host.dataset.slot}"] .slot-card`);
  }
  function position(v, face) {
    const attack = v.host.dataset.role === 'ATK';
    return { x: ((attack ? (face === 6 ? 142 : 156) : (face === 6 ? 755 : 741)) - 50) / 797, y: (rows[face - 1] - 50) / 1388 };
  }
  function point(v, face) {
    const r = card(v)?.getBoundingClientRect();
    if (!r) return null;
    const p = position(v, face);
    return { x: r.left + r.width * p.x, y: r.top + r.height * p.y };
  }
  function center(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function mark(v, face) {
    const c = card(v);
    if (!c) return;
    let n = c.querySelector('.ritual-result');
    if (!n) { n = document.createElement('span'); n.className = 'ritual-result'; n.setAttribute('aria-hidden', 'true'); c.append(n); }
    const p = position(v, face);
    n.style.left = p.x * 100 + '%'; n.style.top = p.y * 100 + '%';
    n.style.setProperty('--ritual-tint', v.color); n.dataset.face = face;
    return n;
  }
  function gemPath(ctx) {
    ctx.beginPath(); ctx.moveTo(0, -57); ctx.lineTo(29, -15); ctx.lineTo(0, 50); ctx.lineTo(-29, -15); ctx.closePath();
  }
  function drop(ctx, x, y, size) {
    ctx.beginPath(); ctx.moveTo(x, y - size * 2);
    ctx.bezierCurveTo(x + size * 2, y, x + size, y + size, x, y + size);
    ctx.bezierCurveTo(x - size, y + size, x - size * 2, y, x, y - size * 2); ctx.fill();
  }
  function sparks(ctx, t, color, strength, count = 9) {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const p = (t * .24 + i * .618) % 1, x = Math.sin(i * 2.4) * (34 + p * 12);
      ctx.globalAlpha = Math.sin(p * Math.PI) * .75 * strength;
      ctx.beginPath(); ctx.arc(x, 47 - p * 106, 1 + (i % 3) * .3, 0, TAU); ctx.fill();
    }
  }
  function aura(v, t, strength) {
    const ctx = v.ctx, element = v.host.dataset.element;
    t *= 1.25;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = strength;
    ctx.fillStyle = v.halo; ctx.fillRect(-65, -72, 130, 140);
    // Render outside the painted gem: motion belongs to its element, not its silhouette.
    ctx.beginPath(); ctx.rect(-80, -77, 160, 160);
    ctx.moveTo(0, -54); ctx.lineTo(27, -15); ctx.lineTo(0, 47); ctx.lineTo(-27, -15); ctx.closePath(); ctx.clip('evenodd');
    ctx.strokeStyle = v.color; ctx.fillStyle = v.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (element === 'PYRO') {
      for (let i = 0; i < 9; i++) {
        const x = (i - 4) * 8, base = 39 - Math.abs(x) * .75;
        const length = 32 + (1 + Math.sin(t * 3.3 + i * 2.1)) * 17;
        const sway = Math.sin(t * 2.7 + i) * 7;
        ctx.globalAlpha = strength * (.72 + Math.sin(t * 2 + i) * .12);
        const flame = ctx.createLinearGradient(x, base, x, base - length);
        flame.addColorStop(0, '#ff552700'); flame.addColorStop(.28, '#ec531e');
        flame.addColorStop(.65, '#ffa631'); flame.addColorStop(1, '#fff2b8'); ctx.fillStyle = flame;
        ctx.beginPath(); ctx.moveTo(x - 8, base);
        ctx.bezierCurveTo(x - 16, base - length * .45, x + sway + 5, base - length * .6, x + sway, base - length);
        ctx.bezierCurveTo(x + sway + 15, base - length * .45, x + 10, base - length * .3, x + 8, base);
        ctx.closePath(); ctx.fill();
      }
      sparks(ctx, t, '#ffbf6c', strength, 10);
    } else if (element === 'ELECTRO') {
      for (let side = -1; side <= 1; side += 2) for (let strand = 0; strand < 2; strand++) {
        const pulse = .48 + .22 * Math.sin(t * 7 + strand * 3 + side);
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const y = -57 + i * 9, edge = y < -15 ? (y + 57) / 42 * 29 : (50 - y) / 65 * 29;
          const jag = Math.sin(i * 9 + t * 13 + strand * 5) * Math.sin(i * 2.8 - t * 8) * 7;
          const x = side * (Math.max(0, edge) + 5 + strand * 6 + jag);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.globalAlpha = strength * pulse; ctx.strokeStyle = '#eab92c'; ctx.lineWidth = 5; ctx.stroke();
        ctx.globalAlpha = strength * (.65 + pulse * .3); ctx.strokeStyle = '#fff5bb'; ctx.lineWidth = 2.1; ctx.stroke();
      }
      sparks(ctx, t * 1.6, '#fff6c8', strength, 6);
    } else if (element === 'AERO' || element === 'HYDRO' || element === 'NECRO') {
      for (let i = 0; i < 4; i++) {
        const p = (t * (element === 'NECRO' ? .13 : .22) + i / 4) % 1;
        ctx.globalAlpha = strength * Math.sin(p * Math.PI) * .65;
        ctx.lineWidth = element === 'NECRO' ? 4 : 1.8;
        ctx.beginPath(); ctx.ellipse(Math.sin(p * TAU) * 4, 49 - p * 97, 32 + Math.sin(p * Math.PI) * 10, 7 + p * 6, -.15, p * 3, p * 3 + Math.PI * 1.65); ctx.stroke();
      }
      if (element === 'HYDRO') for (let i = 0; i < 7; i++) {
        const p = (t * .24 + i / 7) % 1;
        ctx.globalAlpha = strength * Math.sin(p * Math.PI) * .8;
        drop(ctx, Math.sin(i * 2.4) * 42, 49 - p * 108, 2.7);
      }
    } else if (['CRYO', 'MINERO', 'GEO', 'HERBO', 'HEMATO'].includes(element)) {
      for (let i = 0; i < 10; i++) {
        const p = (t * .14 + i * .618) % 1, x = Math.sin(i * 2.4 + p * .7) * 42, y = 50 - p * 108;
        ctx.save(); ctx.globalAlpha = strength * Math.sin(p * Math.PI) * .85;
        ctx.translate(x, y); ctx.rotate(Math.sin(t + i) * .4 + i); ctx.lineWidth = 1.2;
        if (element === 'HEMATO') drop(ctx, 0, 0, 2.5);
        else if (element === 'HERBO') {
          ctx.beginPath(); ctx.moveTo(-4, 3); ctx.quadraticCurveTo(-5, -6, 4, -4); ctx.quadraticCurveTo(5, 3, -4, 3); ctx.fill();
        } else {
          const size = element === 'CRYO' ? 3.4 : 3;
          ctx.beginPath(); ctx.moveTo(0, -size * 1.7); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath();
          if (element === 'CRYO') ctx.stroke(); else ctx.fill();
        }
        ctx.restore();
      }
      if (element === 'GEO' || element === 'MINERO') {
        ctx.globalAlpha = strength * .35; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 54, 37 + Math.sin(t * 2) * 3, 8, 0, 0, TAU); ctx.stroke();
      }
    } else {
      // Light and prismatic crystals: drifting rays rather than a rotating sprite.
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU, pulse = (1 + Math.sin(t * 2 + i * 1.9)) / 2;
        ctx.globalAlpha = strength * (.18 + pulse * .45);
        ctx.strokeStyle = element === 'RAINBOW' ? `hsl(${i * 36 + Math.sin(t) * 20} 85% 78%)` : '#fff0bf';
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 48);
        ctx.lineTo(Math.cos(a) * (36 + pulse * 12), Math.sin(a) * (52 + pulse * 12)); ctx.stroke();
      }
      sparks(ctx, t, '#fff7dd', strength, 7);
    }
    ctx.restore();
  }
  function draw(v, time = 0, energy = 0, gemOpacity = v.spent ? 0 : 1) {
    const ctx = v.ctx, active = v.host.dataset.selected === 'true';
    ctx.clearRect(0, 0, 160, 160); ctx.save(); ctx.translate(80, 77);
    ctx.globalAlpha = active && !v.spent ? .65 : .25; ctx.strokeStyle = v.spent ? '#93aaa5' : v.color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 57, 41, 10, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = (active ? 1 : .35) * gemOpacity;
    ctx.save();
    if (active && v.host.dataset.element === 'NONE' && v.weapon?.complete && v.weapon.naturalWidth) {
      const [x, y, w, h] = weaponBounds(v.weapon), scale = Math.min(82 / w, 106 / h);
      ctx.shadowColor = '#000b'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
      ctx.drawImage(v.weapon, x, y, w, h, -w * scale / 2, -4 - h * scale / 2, w * scale, h * scale);
    } else if (!active || v.host.dataset.element !== 'NONE') {
      gemPath(ctx); ctx.clip();
      if (active && v.image?.complete && v.image.naturalWidth) ctx.drawImage(v.image, -89, -118, 178, 178);
      else {
        const g = ctx.createLinearGradient(-28, 0, 28, 0);
        g.addColorStop(0, '#344340'); g.addColorStop(.5, '#b4c4bb'); g.addColorStop(1, '#52635c');
        ctx.fillStyle = g; ctx.fillRect(-30, -58, 60, 110);
      }
    }
    ctx.restore();
    if (energy && active && v.host.dataset.element !== 'NONE') aura(v, time, energy);
    ctx.restore();
  }

  function drawBurst(v, t) {
    draw(v, 0, 0, Math.max(0, 1 - t * 5));
    if (v.host.dataset.element === 'NONE') return;
    const ctx = v.ctx, spread = 1 - Math.pow(1 - t, 3), fade = Math.pow(1 - t, 1.5);
    ctx.save(); ctx.translate(80, 77); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * .7; ctx.fillStyle = v.halo; ctx.fillRect(-65, -72, 130, 140);
    ctx.lineWidth = 1.5; ctx.strokeStyle = v.color; ctx.globalAlpha = fade * .6;
    ctx.beginPath(); ctx.ellipse(0, 0, 8 + spread * 48, 12 + spread * 46, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const angle = i * 2.4, radius = 10 + spread * (35 + i % 3 * 6), size = (2 + i % 3) * (1 - t * .6);
      ctx.save(); ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.rotate(angle + t * (i % 2 ? 1 : -1)); ctx.globalAlpha = fade;
      ctx.fillStyle = i % 3 ? v.color : '#fff3d8';
      ctx.beginPath(); ctx.moveTo(0, -size * 1.8); ctx.lineTo(size, size); ctx.lineTo(-size * .6, size * .5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawWaiting(v, now = performance.now()) {
    const seconds = motion.matches ? 0 : (now - v.started) / 1000;
    draw(v, seconds, v.waiting ? (motion.matches ? .5 : .96 + Math.sin(seconds * 2.5) * .04) : 0);
  }
  function stopFrame() { cancelAnimationFrame(idleFrame); idleFrame = 0; }
  function idleTick(now) {
    idleFrame = 0;
    if (document.hidden || motion.matches) return;
    const waiting = [...views.values()].filter(v => v.waiting && !v.revealing && v.host.isConnected);
    if (!waiting.length) return;
    // One shared 30 fps loop, also on high-refresh-rate phones.
    if (now - lastPaint >= 1000 / 30) { waiting.forEach(v => drawWaiting(v, now)); lastPaint = now; }
    idleFrame = requestAnimationFrame(idleTick);
  }
  function syncIdle() {
    stopFrame();
    for (const v of views.values()) if (v.waiting && !v.revealing && v.host.isConnected) drawWaiting(v);
    if (!document.hidden && !motion.matches && [...views.values()].some(v => v.waiting && !v.revealing && v.host.isConnected)) idleFrame = requestAnimationFrame(idleTick);
  }
  function stopWaiting() {
    stopFrame();
    for (const v of views.values()) {
      v.waiting = false; v.host.classList.remove('is-engaging'); draw(v);
    }
  }
  function animate(duration, signal, fn) {
    const token = generation;
    return new Promise(resolve => {
      let frame, timer, done = false;
      const finish = ok => {
        if (done) return;
        done = true; cancelAnimationFrame(frame); clearTimeout(timer);
        signal?.removeEventListener('abort', abort); pending.delete(abort); resolve(ok);
      };
      const abort = () => finish(false);
      pending.add(abort); signal?.addEventListener('abort', abort, { once: true });
      const start = performance.now();
      function tick(now) {
        if (signal?.aborted || token !== generation) { finish(false); return; }
        const t = Math.min(1, (now - start) / duration); fn(t);
        if (t === 1) finish(true); else frame = requestAnimationFrame(tick);
      }
      timer = setTimeout(() => { if (token === generation && !signal?.aborted) { fn(1); finish(true); } else finish(false); }, duration + 200);
      tick(start);
    });
  }
  async function flight(from, to, color, signal, duration = 260) {
    if (!from || !to) return true;
    const n = document.createElement('span'); n.className = 'ritual-flight';
    n.style.setProperty('--ritual-tint', color); document.body.append(n);
    try {
      return await animate(duration, signal, t => {
        const e = 1 - Math.pow(1 - t, 2);
        n.style.left = (from.x + (to.x - from.x) * e) + 'px';
        n.style.top = (from.y + (to.y - from.y) * e - Math.sin(Math.PI * t) * 18) + 'px';
        n.style.opacity = String(Math.sin(Math.PI * t));
      });
    } finally { n.remove(); }
  }
  function cancel() {
    generation++; stopWaiting();
    for (const stop of [...pending]) stop();
    views.clear();
  }
  function mount(hosts) {
    const previous = new Map([...views].map(([side, v]) => [side, { crystal: v.host.dataset.crystal, started: v.started }]));
    cancel();
    const phase = document.querySelector('.duel-console')?.dataset.phase;
    for (const host of hosts) {
      const canvas = document.createElement('canvas'), ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.height = 160 * ratio; canvas.setAttribute('aria-hidden', 'true');
      host.replaceChildren(canvas); host.classList.add('elemental-stage');
      const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
      const color = host.dataset.color || '#b8c7bc';
      const halo = ctx.createRadialGradient(0, -2, 20, 0, -2, 66);
      halo.addColorStop(0, color + '00'); halo.addColorStop(.5, color + '36'); halo.addColorStop(1, color + '00');
      const prior = previous.get(Number(host.dataset.player)), sameCrystal = prior?.crystal === host.dataset.crystal;
      const awaitingRoll = phase === 'attack' || host.dataset.role === 'DEF' && ['kalistel', 'defense'].includes(phase);
      const v = { host, canvas, ctx, color, halo, image: host.dataset.crystal ? art(host.dataset.crystal) : null,
        weapon: host.dataset.weapon ? art(host.dataset.weapon) : null,
        started: sameCrystal ? prior.started : performance.now(), spent: !!Number(host.dataset.result) && !awaitingRoll,
        waiting: awaitingRoll && host.dataset.selected === 'true' && host.dataset.element !== 'NONE' };
      host.dataset.spent = String(v.spent);
      views.set(Number(host.dataset.player), v);
      if (!sameCrystal) host.classList.add('crystal-change');
      host.classList.toggle('is-engaging', v.waiting); drawWaiting(v);
      for (const image of [v.image, v.weapon]) if (image && !image.complete) image.addEventListener('load', () => {
        if (views.get(Number(host.dataset.player)) === v && !host.classList.contains('is-awakening')) drawWaiting(v);
      }, { once: true });
      const value = Number(host.dataset.result); if (value) mark(v, value);
    }
    syncIdle();
  }
  async function play(side, value, reduced, signal) {
    const v = views.get(side);
    if (!v || signal?.aborted) return false;
    // Only this participant releases its energy; the other keeps waiting.
    v.revealing = true;
    v.spent = false; v.host.dataset.spent = 'false';
    const token = generation, alive = () => token === generation && v.host.isConnected && !signal?.aborted;
    v.host.classList.add('is-awakening');
    try {
      if (!reduced) {
        const time = (performance.now() - v.started) / 1000;
        if (!await animate(370, signal, t => draw(v, time + t * .37, .96 + t * .04))) return false;
        v.waiting = false; v.spent = true; v.host.dataset.spent = 'true';
        v.host.classList.remove('is-engaging'); v.host.classList.add('is-releasing');
        const released = await Promise.all([
          animate(300, signal, t => drawBurst(v, t)),
          flight(center(v.host), point(v, 6), v.color, signal, 300)
        ]);
        v.host.classList.remove('is-releasing');
        if (!released.every(Boolean)) return false;
        const order = [6, 5, 4, 3, 2, 1, value];
        if (!await animate(480, signal, t => mark(v, order[Math.min(6, Math.floor((1 - Math.pow(1 - t, 1.6)) * 7))]))) return false;
      }
      if (!alive()) return false;
      v.waiting = false; v.spent = true; v.host.dataset.spent = 'true'; v.host.classList.remove('is-engaging');
      mark(v, value)?.classList.add('settled'); v.host.dataset.front = String(value);
      v.host.setAttribute('aria-label', `${v.host.dataset.role} \u00b7 r\u00e9sultat ${value}`); draw(v);
      return true;
    } finally {
      v.revealing = false; v.host.classList.remove('is-awakening', 'is-releasing');
      if (token === generation) { drawWaiting(v); syncIdle(); }
    }
  }
  window.KalistarDice = { mount, play, cancel };
  document.addEventListener('visibilitychange', syncIdle);
  motion.addEventListener('change', syncIdle);
  window.addEventListener('pagehide', cancel);
  window.addEventListener('pageshow', event => { if (event.persisted) mount(document.querySelectorAll('#app:not([hidden]) .dice-stage')); });
})();
