'use strict';
const L = require('../../atelier/lib.cjs');
const { fs, path, read, write, hash, sharp, ROOT, assert } = L;
async function main() {
  const set = read(path.join(__dirname, 'set.json')), sources = [];
  for (const c of set.cards) {
    const selected = L.inside(__dirname, c.art);
    const source = c.supplied ? L.inside(ROOT, c.supplied) :
      'C:/Users/guill/.codex/generated_images/01a0e2da-59b4-7882-8485-55a1e114026a/exec-1b95eb82-6843-4d82-9825-57ae84414334.png';
    if (!fs.existsSync(selected)) fs.copyFileSync(source, selected, fs.constants.COPYFILE_EXCL);
    assert.equal(await hash(source), await hash(selected));
    const m = await sharp(selected).metadata();
    const entry = { key: c.key, modelId: c.id, origin: c.supplied ? 'user-supplied-exact' : 'built-in-imagegen',
      source, selected: c.art, sha256: await hash(selected), width: m.width, height: m.height,
      illustrationEdited: !c.supplied, regeneratedCard: false };
    if (!c.supplied) {
      entry.request = 'art/auron-request.json'; entry.requestSha256 = await hash(path.join(__dirname, entry.request));
      entry.references = [];
      for (const file of read(path.join(__dirname, entry.request)).referenced_image_paths)
        entry.references.push({ path: file, sha256: await hash(file) });
      entry.research = 'art/REFERENCES.md';
    }
    sources.push(entry);
  }
  const file = path.join(__dirname, 'art/provenance.json');
  const result = { revision: set.revision, sources };
  if (fs.existsSync(file)) assert.deepEqual(read(file), result); else write(file, result);
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
