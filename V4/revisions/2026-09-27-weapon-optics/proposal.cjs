'use strict';
const L = require('../../atelier/lib.cjs');
const A = require('./audit.cjs');
const { path, ROOT, read, write, sharp, assert, hash } = L;
const REVISION = '2026-09-27-weapon-optics';
const CHANGED = ['Faucille', 'Tome'];
const UNCHANGED = Object.keys(L.read(path.join(ROOT, 'V4/atelier/designer-assets/manifest.json')).weapons).filter(n => !CHANGED.includes(n));
const COMPACT = ['Gun', 'Fouet', 'Instrument', 'Poing', 'Tome', 'Orbe', 'Fl\u00e9au'];

function proposalFor(row, points) {
  if (!CHANGED.includes(row.name)) return { changed: false, reason: 'Audited; retained under conservative outliers-only scope', bounds: row.bounds, size: [row.width, row.height] };
  const blend = row.name === 'Faucille' ? .08 : COMPACT.includes(row.name) ? .35 : .15;
  const anchor = row.midpoint.map((n, i) => n * (1 - blend) + row.centroid[i] * blend);
  const radius = row.name === 'Tome' ? 38 : row.name === 'Faucille' ? 43 : row.name === 'Fl\u00e9au' ? 39 : 42;
  const extent = Math.max(...points.map(([x, y]) => Math.hypot(x - anchor[0], y - anchor[1])));
  const scale = radius / extent;
  const size = [row.width * scale, row.height * scale];
  assert.ok(scale >= .65 && scale <= 1.3, 'Proposal needs individual review: ' + row.name);
  return { changed: true, proxyOnly: true, centroidWeight: blend, anchor, nominalRadius: radius, scale,
    size: size.map(n => +n.toFixed(2)), relativeChangePercent: +((scale - 1) * 100).toFixed(1),
    finalFullAlphaRadiusLimit: 44, minimumBreathingRoom: 3.5,
    reason: row.name === 'Tome' ? 'Dense page block reduced for balanced visual weight' : row.name === 'Faucille' ? 'Larger thin silhouette, balanced head and long handle; no contour clipping' : 'Consistent breathing room and individually balanced optical anchor' };
}

async function build() {
  const audit = read(path.join(__dirname, 'audit/measurements.json'));
  assert.equal(audit.referenceId, L.baseline().id, 'Re-audit changed references');
  assert.equal(audit.manifestHash, await hash(path.join(ROOT, 'V4/atelier/designer-assets/manifest.json')));
  assert.equal(audit.catalogueHash, await hash(path.join(ROOT, 'V4/donnees/catalogue.json')));
  const manifest = read(path.join(ROOT, 'V4/atelier/designer-assets/manifest.json'));
  const rows = [];
  for (const row of audit.rows) {
    const b = manifest.weapons[row.name];
    const p = await sharp(path.join(ROOT, row.source)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const measured = A.measure(p.data, p.info.width, p.info.height, b.left, b.top);
    rows.push({ name: row.name, before: { size: [row.width, row.height], radius: row.radius, whiteArea: row.area },
      proposed: proposalFor(row, measured.contour), cards: row.cards });
  }
  const changed = rows.filter(r => r.proposed.changed), cards = changed.flatMap(r => r.cards);
  const result = { revision: REVISION, status: 'awaiting-parent-GO', productionModified: false, photoshopStarted: false,
    referenceId: audit.referenceId, referenceCount: audit.referenceCount, catalogueCount: audit.cardCount,
    affectedWeapons: changed.length, affectedCards: cards.length, approvedCards: cards.filter(c => c.kind === 'approved').length,
    createdCards: cards.filter(c => c.kind === 'created').length, unchangedWeapons: UNCHANGED,
    nativeInspectionRequired: true, preliminaryNumbersOnly: true,
    overlapWithArtworkRevision: cards.filter(c => ['41124231', '49055457', '47414613'].includes(c.id)),
    sequence: ['Parent approves scope and grants exclusive Photoshop slot', 'Recheck source hashes and snapshot originals',
      'Inspect exact motif alpha and smart-object contents without modifying sources', 'Native calibration and visual small-size review; reject clipped contours',
      'Stage and verify affected native PSDs, PNGs, banks and metadata', 'Compare outside circular weapon masks and all protected native layers; exact reopen; barcode 4/4',
      'Explicit transactional reference migration, retaining old protections and original backups',
      'Run actual native regression of all current references', 'Release new manifest/reference hash to parent before new-card freeze'], rows };
  write(path.join(__dirname, 'proposal.json'), result);
  console.log({ affectedWeapons: result.affectedWeapons, affectedCards: result.affectedCards, references: result.referenceCount,
    approved: result.approvedCards, created: result.createdCards, rows: rows.map(r => ({ name: r.name, before: r.before.size, proposed: r.proposed.size, percent: r.proposed.relativeChangePercent, cards: r.cards.length })) });
  return result;
}
if (require.main === module) build().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { REVISION, CHANGED, UNCHANGED, proposalFor, build };
