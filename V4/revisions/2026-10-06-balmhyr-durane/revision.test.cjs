'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const before=require('./before.json'),spec=require('./specs.cjs').cards[0],current=require('../../donnees/catalogue.json');
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
const root=path.resolve(__dirname,'../../..'),old=before.catalogue.cards.find(c=>c.id===spec.id);
const cohorts=new Set(before.catalogue.cards.map(c=>c.id));
const {entryBeforeRevision}=require('../2026-10-08-resident-evil-faces/historical-cohort.cjs');
const cohort=c=>c.cards.filter(c=>cohorts.has(c.id)).map(entryBeforeRevision);
function digest(file){
 const b=fs.readFileSync(file),pointer=b.length<1024&&b.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/);
 return pointer?pointer[1]:crypto.createHash('sha256').update(b).digest('hex');
}
test('Durane revision changes only artwork and narrative; all gameplay and model identities remain identical',async()=>{
 const entry=current.cards.filter(c=>c.id===spec.id);assert.equal(entry.length,1);
 const p=entry[0].profile;
 for(const field of Object.keys(old.profile))if(!['title','description','text','artworkSource','visual_revision'].includes(field))assert.deepEqual(p[field],old.profile[field],field);
 assert.equal(p.title,spec.title);assert.equal(p.description,spec.description);assert.equal(p.text,p.description);
 assert.equal(p.artworkSource,'V4/Illustrations/'+spec.art);assert.equal(p.visual_revision,'V4-2026-10-06-balmhyr-durane');
 assert.equal(entry[0].nativeRevision,'2026-10-06-balmhyr-durane');
 assert.deepEqual(Object.keys(p).sort(),Object.keys(old.profile).sort());
 const build=cards=>buildCatalog({published:cards.filter(c=>c.kind==='created')});
 const a=await build(before.catalogue.cards),b=await build(cohort(current));
 const card=b.cards.find(c=>c.id===spec.id),original=a.cards.find(c=>c.id===spec.id);
 assert.equal(card.title,spec.title);assert.equal(card.description,spec.description);
 assert.equal(card.text,spec.description);
 card.title=original.title;card.description=original.description;card.text=original.text;
 assert.deepEqual(b,a);
 assert.deepEqual(cohort(current).filter(c=>c.id!==spec.id),before.catalogue.cards.filter(c=>c.id!==spec.id));
});
test('Approved art, native typography, barcode, immutable backups and unchanged 2B are verifiable',()=>{
 const dir=path.join(root,'V4/creations',spec.id),proof=require('../../creations/49900802/verification.json');
 assert(proof.passed&&proof.barcode.passed&&proof.typography);
 assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.narrativeOnly.outside,0);
 assert.equal(digest(path.join(dir,'card.png')),proof.hashes['card.png']);
 assert.equal(digest(path.join(dir,'card.psd')),proof.hashes['card.psd']);
 assert.equal(digest(path.join(dir,'illustration.png')),digest(path.join(root,'V4/Illustrations',spec.art)));
 assert.equal(digest(path.join(dir,'illustration.png')),'ba957f73d18e93cbefe6d085bd3488f609bb2763b1905763b4995e5c6c3ff7cf');
 const archived=require('./before/V4/creations/49900802/profile.json');assert.deepEqual(archived,old.profile);
 for(const [name,backup]of Object.entries(before.backups))assert.equal(digest(path.join(root,backup.backup)),backup.sha256,name);
 for(const [name,sha]of Object.entries(before.files))if(name.startsWith('V4/creations/49900801/'))assert.equal(digest(path.join(root,name)),sha,'2B must remain byte-identical: '+name);
 const n=require('./cards/balmhyr/render/native.json');assert.equal(n.photoshop,'26.11.8');
 assert.deepEqual([n.width,n.height,n.resolution],[897,1497,300]);
 for(const [name,size,caps]of [['NOM',10,'TextCase.NORMAL'],['TITLE',7.68,'TextCase.ALLCAPS']]){
  const t=n.typography[name],layer=n.layers.find(l=>l.name===name);
  assert.equal(t.font,'TimesNewRomanPSMT');assert.equal(layer.font,t.font);
  assert(Math.abs(t.sizePt-size)<.001&&Math.abs(layer.sizePt-size)<.001);
  assert.equal(t.capitalization,caps);assert.equal(t.tracking,0);
 }
 assert.equal(n.layers.find(l=>l.name==='TITLE').text,spec.title);
 assert.equal(n.layers.find(l=>l.name==='DESCRIPTION').text.replace(/\r/g,' '),spec.description);
 assert.equal(require('./native-checks.json')[0].outside,0);
});
