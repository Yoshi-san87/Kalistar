'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),qa=path.join(__dirname,'qa');
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:16*1024*1024});
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));
assert(report.passed);assert.equal(git(['rev-parse','HEAD']).toString().trim(),report.parent);
assert.equal(git(['remote','get-url','origin']).toString().trim(),'https://github.com/Yoshi-san87/Kalistar.git');
const files=git(['diff','--cached','--name-only']).toString().trim().split(/\r?\n/),allowed=new Set(report.files),checked=[];
for(const file of files){
  if(file.startsWith('V4/releases/2026-10-13-v4.6.51/')||file.startsWith('V4/revisions/2026-10-13-froz-grivka-equipment/qa/'))continue;
  assert(allowed.has(file),'Unverified staged file '+file);
  const bytes=git(['show',':'+file]),snapshot=fs.readFileSync(path.join(report.snapshot,file));
  const pointer=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(bytes.toString());
  if(pointer&&snapshot.length>1024)assert.equal(pointer[1],digest(snapshot),file);
  else assert(bytes.equals(snapshot),'Different staged content '+file);
  checked.push({file,sha256:pointer?pointer[1]:digest(bytes)});
}
const browser=JSON.parse(fs.readFileSync(path.join(root,'V4/revisions/2026-10-13-froz-grivka-equipment/qa/results.json'),'utf8'));
assert(browser.passed);assert.equal(browser.results.length,30);
// The local browser build must be the exact runtime verified in the Git snapshot.
const local=JSON.parse(fs.readFileSync(path.join(root,'V4/deploy/dist/release.json'),'utf8'));
const isolated=JSON.parse(fs.readFileSync(path.join(report.snapshot,'V4/deploy/dist/release.json'),'utf8'));
for(const asset of isolated.assets)assert.deepEqual(local.assets.find(a=>a.path===asset.path),asset,'Browser/publication mismatch '+asset.path);
// One untracked retired Cryptown scene exists only in the local build. The
// active art manifest explicitly selects v2; every published byte matches QA.
const extraLocal=local.assets.filter(a=>!isolated.assets.some(b=>a.path===b.path));
assert.deepEqual(extraLocal.map(a=>a.path),['jeu/assets/weapon-cards/cryptown-oath-sword-scene-v1.webp']);
assert.equal(require('../../site/weapon-art.js').entries['cryptown-oath-sword'].scene,'cryptown-oath-sword-scene-v2.webp');
const result={passed:true,parent:report.parent,tests:report.tests,browserCases:browser.results.length,checked,unpublishedUnusedLocalAssets:extraLocal,tree:git(['write-tree']).toString().trim()};
fs.writeFileSync(path.join(qa,'staging.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,tests:report.tests,browserCases:browser.results.length,checked:checked.length}));
