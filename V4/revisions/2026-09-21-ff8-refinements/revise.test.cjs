'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRevision, main, KEYS, ART_KEYS, ART } = require('./revise.cjs');
const Z = require('./zell.cjs');
const S = require('./seifer.cjs');
const { fixture, digest, NAMES } = require('../../collaborations/ff8-set-01/test-fixture.cjs');

async function setup() {
  const f = fixture(), { ROOT, DATA } = f.L;
  const home = path.join(ROOT, 'V4/revisions/2026-09-21-ff8-refinements'), local = name => path.join(home, name);
  const setFile = path.join(f.home, 'set.json'), initialSet = f.read(setFile);
  initialSet.cards.find(c => c.key === 'zell').element = 'PYRO';
  const seifer = initialSet.cards.find(c => c.key === 'seifer'); seifer.description = S.OLD_FIRST + seifer.description.slice(seifer.description.indexOf('.') + 1);
  f.put(setFile, initialSet);
  const weapons = require('../../../V3/donnees/armes.json');
  const model = require('../../collaborations/ff8-set-01/model.cjs');
  f.put(path.join(f.source('zell'), 'profile.json'), model.profile(initialSet.cards.find(c => c.key === 'zell'), f.D, weapons)); f.verify('zell');
  f.put(path.join(f.source('seifer'), 'profile.json'), model.profile(seifer, f.D, weapons)); f.verify('seifer');
  f.put(path.join(ROOT, 'V3/donnees/armes.json'), weapons);
  // Start from a published set in memory, regardless of the live catalogue's size.
  const cat = f.D.catalogue(); cat.cards = cat.cards.filter(c => c.profile?.collaboration !== 'FF8'); f.put(f.D.CATALOGUE, cat);
  await f.publisher.publish();
  for (const c of f.D.catalogue().cards) {
    for (const file of [c.png, c.psd].filter(Boolean)) if (!f.files.has(path.join(ROOT, file))) f.seed(path.join(ROOT, file), 'UNCHANGED ' + file);
    if (c.kind === 'created') for (const name of [...NAMES, 'creation.json']) {
      const file = path.join(ROOT, 'V4/creations', c.id, name); if (!f.files.has(file)) f.seed(file, 'UNCHANGED ' + file);
    }
  }
  for (const name of ['revise.cjs', 'replace.jsx', 'zell.cjs', 'seifer.cjs']) f.seed(local(name), fs.readFileSync(path.join(__dirname, name)));
  for (const file of ['V4/scripts/stable/common.jsx', 'V4/scripts/stable/elements-common.jsx', 'V4/scripts/stable/registered.jsx', 'V4/revisions/2026-09-18-branches/bridge.ps1', 'V4/atelier/barcode.py']) f.seed(path.join(ROOT, file), 'SCRIPT ' + file);
  f.put(path.join(DATA, 'references.json'), { id: f.L.baseline().id });
  const manifest = structuredClone(require('../../atelier/designer-assets/manifest.json'));
  manifest.elements.NONE = f.read(path.join(f.bank, 'manifest.json')).elements.NONE;
  f.put(path.join(f.bank, 'manifest.json'), manifest);
  const zellPlan = { layers: [
    { file: 'component-00.png', name: 'ILLUSTRATION - cadrage', ...ART },
    { file: 'component-01.png', name: 'CADRE V4 - structure validee', left: 0, top: 0, width: 897, height: 1497 },
    ...[1, 2, 3, 4, 5, 6].map(die => ({ file: 'component-0' + (die + 1) + '.png', name: 'ATK D' + die + ' - fond physique', ...geometry(manifest.stats.atk.PYRO[die].physical) })),
    { file: 'component-08.png', name: 'BRANCHES PYRO - couleur du cristal', ...geometry(manifest.elements.PYRO.branch) },
    { file: 'component-09.png', name: 'CRISTAL PYRO', ...geometry(manifest.elements.PYRO.crystal) }
  ] };
  for (const r of Z.replacements(zellPlan, manifest)) f.put(path.join(f.bank, r.asset), { format: 'png', width: r.next.width, height: r.next.height, revised: r.next.name });
  for (const { key } of initialSet.cards) {
    const source = name => path.join(f.source(key), name);
    if (ART_KEYS.includes(key)) f.put(local('art/' + key + '.png'), { format: 'png', width: 1024, height: 1280, key, revision: 'new illustration' });
    f.mem.copyFileSync(source('illustration.png'), path.join(f.home, 'illustrations', key + '.png'));
    let layers = [{ id: 1, name: 'ILLUSTRATION - cadrage', kind: 'LayerKind.SMARTOBJECT', visible: true, bounds: [80, 156, 817, 1077] },
      { id: 2, name: 'NOM', kind: 'LayerKind.TEXT', visible: true, text: key, font: 'Original', sizePt: 16 }];
    if (key === 'seifer') layers.push({ id: 3, name: 'DESCRIPTION', kind: 'LayerKind.TEXT', visible: true, text: wrap(seifer.description), font: 'Original', sizePt: 16, bounds: [190, 1268, 707, 1369], ink: [190, 1268, 707, 1369] });
    if (key === 'zell') layers = [...zellPlan.layers.map((l, i) => ({ id: i + 1, name: l.name, path: l.name, kind: 'LayerKind.SMARTOBJECT', visible: true, bounds: [l.left, l.top, l.left + l.width, l.top + l.height] })),
      ...['NOM', 'JOB', 'RACE'].map((name, i) => ({ id: 20 + i, name, path: name, kind: 'LayerKind.TEXT', visible: true, text: name, font: 'Original', sizePt: 16, bounds: [200 + 200 * i, 1160, 210 + 200 * i, 1180] }))];
    f.put(source('render/native.json'), { width: 897, height: 1497, resolution: 300, expected: [{ name: 'NOM', value: key }], layers });
    f.put(source('render/composition.json'), { layers: [{ file: 'component-00.png', name: 'ILLUSTRATION - cadrage', ...ART },
      { file: 'component-01.png', name: 'CADRE V4 - structure validee', left: 0, top: 0, width: 897, height: 1497 }] });
    if (key === 'zell') f.put(source('render/composition.json'), zellPlan);
    for (const name of ['render/component-00.png', 'render/component-01.png', 'render/expected-components.png', 'render/without-text.png', 'render/reopened.png', 'preview.png', 'small-preview.png']) f.mem.copyFileSync(source('card.png'), source(name));
    if (key === 'zell') for (const l of zellPlan.layers) f.put(source('render/' + l.file), { format: 'png', width: l.width, height: l.height, key });
    const inputs = [path.join(f.home, 'set.json'), path.join(f.home, 'illustrations', key + '.png'),
      ...['profile.json', 'illustration.png', 'render/composition.json', 'render/component-00.png', 'render/component-01.png', 'render/expected-components.png'].map(source)];
    if (key === 'zell') inputs.push(...zellPlan.layers.slice(2).map(l => source('render/' + l.file)));
    const hashes = files => Object.fromEntries(files.map(file => [file, digest(f.mem.readFileSync(file))]));
    f.put(source('preparation.json'), { referenceId: f.L.baseline().id, snapshot: hashes([path.join(DATA, 'references.json')]), inputs: hashes(inputs), none: null });
  }
  f.put(path.join(f.home, 'verification.json'), { passed: true, cards: 12, results: f.read(path.join(f.home, 'set.json')).cards.map(c => ({ ...f.read(path.join(f.source(c.key), 'verification.json')), key: c.key })) });
  const sharp = input => {
    let m = Buffer.isBuffer(input) ? JSON.parse(input.toString()) : f.read(input);
    const chain = { metadata: async () => m, png: () => chain, extract: () => chain,
      resize(width, height) { m = { ...m, width: typeof width === 'object' ? width.width : width, height: height || m.height }; return chain; },
      toFile: async file => f.put(file, m) };
    return chain;
  };
  const commands = [];
  const R = { verifyAssets: async () => {}, previewText: async () => Array.from({ length: 4 }, () => ({ top: 1251 })), composite: async () => f.encode({ format: 'png', width: 897, height: 1497, revised: true }),
    command: async (exe, args) => {
      commands.push(exe);
      if (exe !== 'powershell.exe') return JSON.stringify({ passed: true, expected: args.at(-1) });
      for (const c of f.read(local('render-request.json')).cards) {
        const work = name => path.join(c.work, name), source = name => path.join(f.source(c.key), name);
        f.mem.copyFileSync(source('card.png'), work('before-card.png'));
        f.mem.copyFileSync(source('card.png'), work('before-without-art.png'));
        f.mem.copyFileSync(source('card.png'), work('after-without-art.png'));
        f.put(work('card.png'), { format: 'png', width: 897, height: 1497, revised: c.key });
        f.seed(work('card.psd'), 'IN-MEMORY REOPENED PSD ' + c.key);
        f.mem.copyFileSync(work('card.png'), work('reopened.png'));
        f.mem.copyFileSync(work('expected-components.png'), work('without-text.png'));
        const { layers } = f.read(source('render/native.json'));
        if (c.key === 'zell') {
          const element = f.read(work('element.json'));
          const after = layers.map(l => {
            const r = element.replacements.find(r => r.old.name === l.name); if (!r) return l;
            const v = r.next; return { ...l, id: l.id + 100, name: v.name, path: v.name, bounds: [v.left, v.top, v.left + v.width, v.top + v.height] };
          });
          for (const name of ['before-without-changes.png', 'after-without-changes.png', 'before-art-only.png', 'after-art-only.png']) f.mem.copyFileSync(source('card.png'), work(name));
          f.put(work('native.json'), { width: 897, height: 1497, resolution: 300, before: layers, after, layers: after,
            colorsBefore: { NOM: 'FFFFFF', JOB: 'FF704A', RACE: 'FF704A' }, colorsAfter: { NOM: 'FFFFFF', JOB: 'F5DC32', RACE: 'F5DC32' }, colorsReopened: { NOM: 'FFFFFF', JOB: 'F5DC32', RACE: 'F5DC32' } });
        } else if (c.key === 'seifer') {
          const narrative = f.read(work('narrative.json'));
          const after = layers.map(l => l.name !== 'DESCRIPTION' ? l : { ...l, text: wrap(narrative.description), bounds: [170, 1268, 727, 1369], ink: [170, 1268, 727, 1369] });
          for (const name of ['before-without-art-description.png', 'after-without-art-description.png']) f.mem.copyFileSync(source('card.png'), work(name));
          const colors = { NOM: 'FFFFFF', DESCRIPTION: 'EDEEEB' };
          f.put(work('native.json'), { width: 897, height: 1497, resolution: 300, before: layers, after, layers: after, colorsBefore: colors, colorsAfter: colors, colorsReopened: colors });
        } else f.put(work('native.json'), { width: 897, height: 1497, resolution: 300, before: layers, after: layers, layers });
      }
      return 'MOCK PHOTOSHOP ONLY';
    } };
  f.L.sharp = sharp; f.L.protectedCheck = async () => {};
  f.L.diff = async (a, b, rectangles) => ({ changed: digest(f.mem.readFileSync(a)) === digest(f.mem.readFileSync(b)) ? 0 : 25, outside: rectangles ? 0 : undefined });
  f.L.PYTHON = 'MOCK BARCODE';
  const revision = createRevision({ L: f.L, R, D: f.D, home,
    zell: { ...Z, verifyPixels: async () => ({ outside: { changed: 10, outside: 0 }, withoutChanges: { changed: 0 }, artwork: { changed: 0 }, from: 'PYRO', to: 'ELECTRO' }) },
    createBuilder: ({ L }) => ({ components: async (source, plan) => {
      assert.equal(plan.layers[0].width, 737);
      assert.equal(L.read(path.join(source, 'render/expected-components.png')).revised, true);
      return { fixedDifferences: 0, severePixels: 0, changed: 0 };
    } }) });
  const original = new Map([...f.files].filter(([file]) => !file.startsWith(home + path.sep)).map(([file, bytes]) => [file, Buffer.from(bytes)]));
  const assertOriginal = () => {
    for (const [file, bytes] of original) assert.deepEqual(f.files.get(file), bytes, file);
    for (const file of f.files.keys()) if (!file.startsWith(home + path.sep)) assert.ok(original.has(file), 'Unexpected global file: ' + file);
  };
  return { ...f, R, revision, local, revisionHome: home, original, assertOriginal, commands };
}
function geometry({ left, top, width, height }) { return { left, top, width, height }; }
function wrap(text) {
  const lines = []; let line = '';
  for (const word of text.split(' ')) { if (line && (line + ' ' + word).length > 60) { lines.push(line); line = word; } else line = line ? line + ' ' + word : word; }
  return [...lines, line].join('\r');
}
async function ready() { const f = await setup(); await f.revision.prepare(); await f.revision.render(); await f.revision.verify(); return f; }

test('default is read-only; four art targets plus Zell, and JSX parses without Photoshop', async () => {
  const f = await setup(), count = f.ops.length;
  assert.deepEqual(ART_KEYS, ['seifer', 'squall', 'ward', 'irvine']); assert.equal(KEYS.length, 5);
  assert.deepEqual((await main([], f.revision)).missing, []); assert.equal(f.ops.length, count); f.assertOriginal();
  assert.deepEqual(f.commands, []);
  new vm.Script(fs.readFileSync(path.join(__dirname, 'replace.jsx'), 'utf8').replace(/^#.*$/gm, ''));
  await assert.rejects(main(['publish', 'extra'], f.revision), /Usage/);
});
test('prepare/render/verify only stage; publication updates Zell and exactly the intended preparation inputs', async () => {
  const f = await ready(); f.assertOriginal();
  const proof = f.read(f.local('verified.json')), before = f.read(f.local('before.json'));
  assert.equal(proof.publication.reused, 12); assert.equal(Object.keys(proof.setChange.preparationChanges).length, 12);
  assert.equal(before.changes.at(-1).target, f.D.CATALOGUE);
  await f.revision.publish(); assert.equal((await f.publisher.preflight()).reused, 12);
  const oldSet = JSON.parse(f.original.get(path.join(f.home, 'set.json'))), nextSet = f.read(path.join(f.home, 'set.json'));
  oldSet.cards.find(c => c.key === 'zell').element = 'ELECTRO';
  const oldStory = oldSet.cards.find(c => c.key === 'seifer').description;
  const nextStory = S.FIRST + oldStory.slice(S.OLD_FIRST.length);
  oldSet.cards.find(c => c.key === 'seifer').description = nextStory; assert.deepEqual(nextSet, oldSet);
  for (const spec of nextSet.cards) {
    const source = name => path.join(f.source(spec.key), name), p = f.read(source('profile.json'));
    const prep = f.read(source('preparation.json')), oldPrep = JSON.parse(f.original.get(source('preparation.json')));
    assert.deepEqual(prep.snapshot, oldPrep.snapshot); assert.deepEqual(Object.keys(prep.inputs), Object.keys(oldPrep.inputs));
    for (const [file, expected] of Object.entries(prep.inputs)) assert.equal(await f.L.hash(file), expected);
    const changed = Object.keys(prep.inputs).filter(file => prep.inputs[file] !== oldPrep.inputs[file]);
    assert.equal(changed.length, spec.key === 'zell' ? 13 : spec.key === 'seifer' ? 6 : ART_KEYS.includes(spec.key) ? 5 : 1);
    const previous = JSON.parse(f.original.get(source('profile.json')));
    if (spec.key === 'zell') { previous.element = 'ELECTRO'; previous.color = 'F5DC32'; previous.hue = 53; }
    if (spec.key === 'seifer') { previous.description = nextStory; previous.text = nextStory; }
    assert.deepEqual(p, previous);
    if (KEYS.includes(spec.key)) {
      const target = f.target(p.id), creation = f.read(path.join(target, 'creation.json'));
      const old = JSON.parse(f.original.get(path.join(target, 'creation.json')));
      for (const field of ['job', 'modelId', 'setId', 'key', 'createdAt']) assert.deepEqual(creation[field], old[field]);
      for (const name of NAMES) {
        assert.equal(creation.hashes[name], await f.L.hash(source(name)));
        assert.deepEqual(f.mem.readFileSync(source(name)), f.mem.readFileSync(path.join(target, name)));
      }
    }
  }
  const oldCat = JSON.parse(f.original.get(f.D.CATALOGUE)), z = oldCat.cards.find(c => c.profile?.characterId === 'zell-ff8');
  z.element = 'ELECTRO'; z.profile = f.read(path.join(f.source('zell'), 'profile.json'));
  oldCat.cards.find(c => c.profile?.characterId === 'seifer-ff8').profile = f.read(path.join(f.source('seifer'), 'profile.json'));
  assert.deepEqual(f.read(f.D.CATALOGUE), oldCat);
  const narrativeProof = f.read(path.join(f.source('seifer'), 'verification.json'));
  assert.equal(narrativeProof.illustrationOnly, undefined);
  assert.equal(narrativeProof.artAndNarrative.description, nextStory);
  assert.deepEqual(narrativeProof.artAndNarrative.descriptionRectangles, [[190, 1268, 707, 1369], [170, 1268, 727, 1369]]);
  assert.equal(narrativeProof.artAndNarrative.withoutArtAndDescription.changed, 0);
  const targets = new Set(before.changes.map(c => c.target));
  for (const [file, bytes] of f.original) if (!targets.has(file)) assert.deepEqual(f.mem.readFileSync(file), bytes, file);
  for (const file of ['illustration.png', 'render/component-00.png']) assert.deepEqual(f.mem.readFileSync(path.join(f.source('zell'), file)), f.original.get(path.join(f.source('zell'), file)));
  assert.equal((await f.revision.publish()).unchanged, true);
  await f.revision.rollback(); f.assertOriginal(); assert.equal((await f.publisher.preflight()).reused, 12);
});
test('Seifer exact first sentence leaves the suffix untouched, 210 characters and four preview lines', async () => {
  const f = await setup(), set = f.read(path.join(f.home, 'set.json')), profile = f.read(path.join(f.source('seifer'), 'profile.json'));
  const change = S.nextData(set, profile);
  assert.equal(change.description, '\u00c0 Balamb, Seifer pose les pieds sur son pupitre, sourire insolent.' + profile.description.slice(S.OLD_FIRST.length));
  assert.equal(change.description.length, 210);
  assert.deepEqual(change.profile, { ...profile, description: change.description, text: change.description });
  await S.preview(change, require('../../atelier/designer-core.cjs'), require('../../atelier/designer-render.cjs'));
  await assert.rejects(S.preview(change, f.D, { previewText: async () => Array.from({ length: 5 }, () => ({ top: 1251 })) }), /quatre lignes/);
});
for (const field of ['font', 'text', 'bounds', 'color', 'other-layer', 'mask']) test('Seifer refuses unapproved narrative ' + field + ' changes', async () => {
  const f = await setup(); await f.revision.prepare(); await f.revision.render();
  const file = f.local('work/seifer/native.json'), n = f.read(file), desc = n.after.find(l => l.name === 'DESCRIPTION');
  if (field === 'font') desc.sizePt++;
  if (field === 'text') desc.text += ' Non autorise.';
  if (field === 'bounds') desc.bounds[0] = 0;
  if (field === 'color') n.colorsAfter.DESCRIPTION = '000000';
  if (field === 'other-layer') n.after.find(l => l.name === 'NOM').text = 'OTHER';
  if (field === 'mask') {
    const diff = f.L.diff;
    f.L.diff = async (a, b, rects) => rects && b.includes('seifer') ? { changed: 50, outside: 1 } : diff(a, b, rects);
  }
  f.put(file, n); await assert.rejects(f.revision.verify()); f.assertOriginal();
});
test('stale input in an untouched preparation is never blessed by set hash migration', async () => {
  const f = await setup(), file = path.join(f.source('quistis'), 'render/component-01.png'); f.seed(file, 'UNRELATED EDIT');
  await assert.rejects(f.revision.prepare(), /Empreinte/); f.seed(file, f.original.get(file)); f.assertOriginal();
});
test('foreign lock, tampered staging and an unrelated profile block publication', async () => {
  const f = await setup(); f.put(f.lock, { id: 'native-other' });
  await assert.rejects(f.revision.prepare(), /EEXIST/); assert.equal(f.read(f.lock).id, 'native-other'); f.files.delete(f.lock);
  await f.revision.prepare(); await f.revision.render(); await f.revision.verify();
  const target = f.read(f.local('before.json')).changes[0].stage, saved = f.mem.readFileSync(target);
  f.seed(target, 'TAMPER'); await assert.rejects(f.revision.publish(), /Empreinte/); f.seed(target, saved);
  const unrelated = path.join(f.source('kiros'), 'profile.json'); f.seed(unrelated, 'CHANGED'); await assert.rejects(f.revision.publish(), /Empreinte/);
  f.seed(unrelated, f.original.get(unrelated)); f.assertOriginal();
});
for (const phase of ['middle', 'catalogue']) test('rollback restores all profiles, preparations and index after ' + phase + ' failure', async () => {
  const f = await ready(), targets = new Set(f.read(f.local('before.json')).changes.map(c => c.target)); let count = 0, failed = false;
  f.fault(e => { if (e.op === 'rename' && targets.has(e.to) && !failed && (phase === 'catalogue' ? e.to === f.D.CATALOGUE : ++count === 20)) { failed = true; throw Error('INJECTED'); } });
  await assert.rejects(f.revision.publish(), /INJECTED/); f.fault(() => {}); f.assertOriginal();
  assert.equal(f.read(f.local('transaction.json')).state, 'rolled-back');
  assert.equal((await f.publisher.preflight()).reused, 12);
});
test('interrupted rollback recovers from journal; later independent edits are refused', async () => {
  const f = await ready(), targets = new Set(f.read(f.local('before.json')).changes.map(c => c.target)); let count = 0;
  f.fault(e => { if (e.op === 'rename' && targets.has(e.to) && ++count >= 20) throw Error('DISK FAILURE'); });
  await assert.rejects(f.revision.publish(), AggregateError); f.fault(() => {}); await f.revision.rollback(); f.assertOriginal();
  await f.revision.publish(); f.seed(path.join(f.source('zell'), 'profile.json'), 'EXTERNAL');
  await assert.rejects(f.revision.rollback()); assert.equal(f.mem.readFileSync(path.join(f.source('zell'), 'profile.json'), 'utf8'), 'EXTERNAL');
});
for (const failure of ['art-frame', 'roundtrip', 'zell-text', 'zell-position', 'zell-color', 'barcode']) test('native gate rejects ' + failure, async () => {
  const f = await setup(); await f.revision.prepare(); await f.revision.render();
  if (failure === 'art-frame' || failure === 'roundtrip') {
    const diff = f.L.diff;
    f.L.diff = async (a, b, rects) => b.endsWith(failure === 'art-frame' ? 'after-without-art.png' : 'reopened.png') ? { changed: 1 } : diff(a, b, rects);
  } else if (failure === 'barcode') f.R.command = async () => JSON.stringify({ passed: false });
  else {
    const file = f.local('work/zell/native.json'), n = f.read(file);
    if (failure === 'zell-text') n.after.find(l => l.name === 'JOB').text = 'NEW JOB';
    if (failure === 'zell-position') n.after.find(l => l.name === 'CRISTAL ELECTRO').bounds[0]++;
    if (failure === 'zell-color') n.colorsReopened.JOB = 'FF704A';
    f.put(file, n);
  }
  await assert.rejects(f.revision.verify()); f.assertOriginal(); assert.ok(!f.mem.existsSync(f.local('verified.json')));
});
test('pixel mask permits only actual component deltas, rejects changes elsewhere and refuses altered isolated art', async () => {
  const mask = new Uint8Array(Z.WIDTH * Z.HEIGHT), spec = { left: 10, top: 20, width: 1, height: 1 };
  const pixel = value => ({ data: Buffer.from([value, 0, 0, 255]), info: { width: 1, height: 1, channels: 4 } });
  Z.paintDifference(mask, spec, spec, pixel(10), pixel(11)); assert.equal(mask.reduce((a, b) => a + b, 0), 1);
  const frame = () => ({ data: Buffer.alloc(Z.WIDTH * Z.HEIGHT * 4), info: { width: Z.WIDTH, height: Z.HEIGHT, channels: 4 } });
  const a = frame(), b = frame(); b.data[(20 * Z.WIDTH + 10) * 4] = 1;
  assert.equal(Z.compareMasked(a, b, mask).outside, 0); b.data[0] = 1; assert.throws(() => Z.compareMasked(a, b, mask), /hors composants/); b.data[0] = 0;
  const card = { source: '/source', work: '/work' }, change = { replacements: [{ old: { ...spec, file: 'old.png' }, next: { ...spec, file: 'new.png' } }] };
  const n = { before: ['JOB', 'RACE'].map(name => ({ name, kind: 'LayerKind.TEXT', bounds: [100, 100, 110, 110] })) };
  const images = new Map([['/source/render/old.png', pixel(10)], ['/work/new.png', pixel(11)], ['/source/card.png', a], ['/work/card.png', b]]);
  let changedArt = false;
  const L = { path: path.posix, sharp: file => ({ ensureAlpha() { return this; }, raw() { return this; }, async toBuffer() { return images.get(file); } }), diff: async (x, y) => ({ changed: changedArt && y.endsWith('after-art-only.png') ? 1 : 0 }) };
  assert.equal((await Z.verifyPixels(L, card, change, n, file => file)).artwork.changed, 0);
  changedArt = true; await assert.rejects(Z.verifyPixels(L, card, change, n, file => file), /Illustration Zell/);
});
