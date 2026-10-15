'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateRegistry}=require('./runtime-media.cjs');
const valid={source:'V4/site/assets/a.webp',bytes:50,sha256:'a'.repeat(64)};
test('media registry accepts stable paths, positive sizes and SHA-256',()=>{
  assert.doesNotThrow(()=>validateRegistry({schemaVersion:1,files:[valid]}));
  for(const change of [{source:'../../secret'},{source:'V4/../../secret'},{source:'V4\\a'},{bytes:0},{sha256:'bad'}])assert.throws(()=>validateRegistry({schemaVersion:1,files:[{...valid,...change}]}));
  assert.throws(()=>validateRegistry({schemaVersion:1,files:[valid,valid]}));
  assert.throws(()=>validateRegistry({schemaVersion:2,files:[valid]}));
});
test('published registry contains no PSD, private path or unvalidated local draft',()=>{
  const data=validateRegistry(require('./runtime-media.json'));
  assert.ok(data.files.length>1000);
  assert.ok(data.files.every(f=>!/(?:\.psd$|\/work\/|cryptown-oath-sword-scene-v1)/i.test(f.source)));
  assert.ok(data.files.some(f=>f.source==='V4/creations/49902501/card.png'));
});
