'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs'), M = require('./model.cjs');
const {fs,path,assert,read,hash,ROOT} = L;
const home = __dirname, file = n => path.join(home,n), absolute = f => L.inside(ROOT,f);
const policy = () => read(file('allowed-changes.json'));
function immutableEntry(entry, p) {
  const result = structuredClone(entry);
  if (p.statsIds.includes(entry.id)) for (const field of p.mutableProfileFields) delete result.profile[field];
  if (p.statsIds.includes(entry.id) || p.framingIds.includes(entry.id)) for (const field of p.mutableEntryFields) delete result[field];
  return result;
}
function checkCatalogue(current,before,p) {
  const own = current.cards.filter(c=>c.id===M.ID); assert(own.length <= 1);
  assert.deepEqual(current.cards.filter(c=>c.id!==M.ID).map(c=>immutableEntry(c,p)),
    before.cards.map(c=>immutableEntry(c,p)), 'Unrelated catalogue change');
}
async function preservation() {
  const p = policy(), b = read(absolute(p.baseline));
  assert.equal(b.catalogue.cards.length,174); assert.equal(Object.keys(b.files).length,818);
  assert.equal(b.catalogue.referenceId,L.baseline().id);
  assert(!p.statsIds.includes('40000042') && !p.framingIds.includes('40000042'));
  checkCatalogue(D.catalogue(),b.catalogue,p);
  const planned = require(absolute(p.statsPlan));
  assert.deepEqual([...p.statsIds].sort(),planned.map(c=>c.id).sort(), 'Whitelist must match explicit stats plan');
  let unchangedFiles = 0, allowedFiles = 0;
  for (const [name,want] of Object.entries(b.files)) {
    const match = /^V4\/creations\/(\d+)\/([^/]+)$/.exec(name), id = match?.[1], leaf = match?.[2];
    const mutable = match && p.mutableFiles.includes(leaf) && (p.statsIds.includes(id) || (p.framingIds.includes(id) && leaf !== 'profile.json'));
    if (mutable) { allowedFiles++; continue; }
    assert.equal(await hash(absolute(name)),want,'Preserved baseline changed: ' + name); unchangedFiles++;
  }
  for (const id of p.statsIds) {
    const old = b.catalogue.cards.find(c=>c.id===id).profile, target = planned.find(c=>c.id===id);
    const actual = read(absolute('V4/creations/'+id+'/profile.json'));
    for (const side of ['atk','defense']) {
      assert([old[side],target[side]].some(v=>JSON.stringify(v)===JSON.stringify(actual[side])), 'Unplanned stats: '+id+'.'+side);
    }
    const strip = v => {const c=structuredClone(v);for(const field of p.mutableProfileFields)delete c[field];return c;};
    assert.deepEqual(strip(actual),strip(old),'Unrelated profile mutation: '+id);
  }
  assert.deepEqual(read(absolute('V4/donnees/arenes-collaborations.json')),b.arenas);
  return { baselineCards:174, baselineFiles:818, unchangedFiles, allowedFiles, statsIds:p.statsIds, framingIds:p.framingIds };
}
async function dependencies() {
  for (const [name,want] of Object.entries(read(file('dependencies.json')))) assert.equal(await hash(absolute(name)),want,'Frozen source changed: '+name);
}
async function preparation(proof=false) {
  await dependencies(); await preservation();
  const out = file('cards/'+M.KEY), prepFile = path.join(out,'preparation.json'), p = read(prepFile);
  assert.equal(p.referenceId,L.baseline().id);
  for (const [name,want] of Object.entries(p.inputs)) assert.equal(await hash(absolute(name)),want,'Preparation changed: '+name);
  if (proof) assert.equal(read(path.join(out,'verification.json')).preparationHash,await hash(prepFile));
  return p;
}
module.exports = {policy,immutableEntry,checkCatalogue,preservation,dependencies,preparation};
