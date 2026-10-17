'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const before=require('./before.json'),catalogue=require('../../revisions/2026-10-17-nestown-manteau-rempart/compatibility.cjs').previousCatalogue(require('../../donnees/catalogue.json')),p=require('../../creations/49902301/profile.json'),proof=require('./work/verification.json');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
test('User correction changes only Vaerok job, with one identity and unchanged stats',()=>{
 assert.equal(p.job,'MERCENAIRE');assert.deepEqual({...p,job:before.entry.profile.job},before.entry.profile);
 const entry=catalogue.cards.find(c=>c.id===p.id);assert.deepEqual(entry.profile,p);
 assert.equal(entry.nativeRevision.id,'2026-10-12-vaerok-mercenaire');assert.deepEqual(entry.nativeRevision.changedFields,['job']);
 assert.equal(catalogue.cards.filter(c=>c.profile?.characterId===p.characterId).length,1);
 for(const old of require('./catalogue-before-publication.json').cards)if(old.id!==p.id)assert.deepEqual(catalogue.cards.find(c=>c.id===old.id),old);
});
test('Only JOB pixels and native text changed; card, art and barcode remain valid',()=>{
 assert(proof.passed&&proof.jobOnly&&proof.barcode.passed);assert(proof.scope.changed>0);assert.equal(proof.scope.outside,0);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.fixedDifferences,0);
 const digest=n=>{const b=fs.readFileSync(path.resolve(__dirname,'../../creations/49902301',n)),m=b.length<1024&&/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(b.toString());return m?m[1]:crypto.createHash('sha256').update(b).digest('hex');};
 assert.equal(digest('card.png'),proof.hashes['card.png']);assert.equal(digest('card.psd'),proof.hashes['card.psd']);
 assert.equal(digest('illustration.png'),before.observed['V4/creations/49902301/illustration.png']);
 const n=require('./work/render/native.json'),old=require('./originals/render/native.json'),job=n.layers.find(l=>l.name==='JOB');
 assert.equal(job.kind,'LayerKind.TEXT');assert.equal(job.text,'MERCENAIRE');assert(job.ink[2]-job.ink[0]<=170);
 for(const l of old.layers)if(l.name!=='JOB')assert.deepEqual(n.layers.find(v=>v.name===l.name),l);
});
test('Playable catalogue exposes Mercenaire and existing match remains restorable',async()=>{
 const data=await buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')}),E=createEngine(data),deck=require('../../expansions/2026-10-12-froz-vaerok/fixtures.cjs').deck;
 assert.equal(E.byId[p.id].job,'MERCENAIRE');assert.deepEqual(E.validatePlayableDeck(deck),[]);
 const s=E.newGame(deck,deck,{seed:'FROZ-MERCENAIRE',deckCoverage:2,kalistel:false});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
 assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
});
