'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {parseTree,parseBatch,pointer,verifiedMedia,isMetadata,isRuntimeTree,gitHash} = require('./prepare-release.cjs');
test('frozen metadata includes every local startup dependency of the builder', () => {
  const root = path.resolve(__dirname, '../..'), seen = new Set();
  function visit(module) {
    if (seen.has(module.filename)) return;
    seen.add(module.filename);
    const relative = path.relative(root, module.filename).split(path.sep).join('/');
    assert.ok(isMetadata(relative), 'Missing frozen build dependency: ' + relative);
    for (const child of module.children) visit(child);
  }
  visit(require.cache[require.resolve('./build.cjs')]);
  assert.ok(seen.has(require.resolve('../atelier/arena-catalog.cjs')));
  for (const file of ['V4/atelier/server.cjs', 'work/private.json', 'V4/creations/example/card.psd']) {
    assert.equal(isMetadata(file), false, 'Not publication metadata: ' + file);
  }
});
test('frozen publication accepts only regular Git files', () => {
  const oid='a'.repeat(40);
  assert.deepEqual(parseTree(Buffer.from(`100644 blob ${oid}\tV4/site/a.js\0`)),[{path:'V4/site/a.js',oid}]);
  for (const mode of ['120000','160000']) assert.throws(() => parseTree(Buffer.from(`${mode} blob ${oid}\tlink\0`)),/regular/);
});
test('Git batch parsing preserves bytes and validates complete object framing', () => {
  const bytes=Buffer.from('Kalistar\r\n'),oid=gitHash(bytes),entries=[{path:'a',oid}];
  const batch=Buffer.concat([Buffer.from(`${oid} blob ${bytes.length}\n`),bytes,Buffer.from('\n')]);
  assert.deepEqual(parseBatch(batch,entries).get('a'),bytes);
  assert.throws(() => parseBatch(batch.subarray(0,-1),entries),/Invalid/);
  assert.throws(() => parseBatch(Buffer.concat([batch,Buffer.from('x')]),entries),/Unexpected/);
});
test('local LFS media must match both size and SHA; cache is a verified fallback', t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-frozen-test-'));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  const bytes=Buffer.from('image-test'),oid=crypto.createHash('sha256').update(bytes).digest('hex');
  const committed=Buffer.from(`version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${bytes.length}\n`);
  assert.deepEqual(pointer(committed),{oid,bytes:bytes.length});
  const entry={path:'image.png'},objects=path.join(root,'objects');
  assert.throws(() => verifiedMedia(entry,committed,root,objects),/no network fallback/);
  fs.writeFileSync(path.join(root,entry.path),Buffer.from('bad--image'));
  assert.throws(() => verifiedMedia(entry,committed,root,objects),/missing/);
  const cached=path.join(objects,oid.slice(0,2),oid.slice(2,4),oid);
  fs.mkdirSync(path.dirname(cached),{recursive:true});fs.writeFileSync(cached,bytes);
  assert.deepEqual(verifiedMedia(entry,committed,root,objects),bytes);
  fs.writeFileSync(path.join(root,entry.path),bytes);
  assert.deepEqual(verifiedMedia(entry,committed,root,objects),bytes);
  assert.deepEqual(verifiedMedia(entry,Buffer.from('text'),root,objects),Buffer.from('text'));
});
test('public media trees do not include native sources or old full card directories', () => {
  for (const file of ['V4/site/assets/a.webp','V3/site/assets/logo.png','V3/assets/armes/a.svg']) assert.ok(isRuntimeTree(file));
  for (const file of ['V3/site/assets/cards/a.png','V4/creations/1/card.psd','V4/propositions/draft.png','work/private.png']) assert.ok(!isRuntimeTree(file));
});
