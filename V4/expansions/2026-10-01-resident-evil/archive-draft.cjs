'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const home=__dirname,out=path.join(home,'draft01'),file=path.join(home,'set.json');
assert(!fs.existsSync(out),'Do not overwrite draft evidence');fs.mkdirSync(out);
const before='Chris se place devant ses compagnons dans les couloirs du manoir. Son arme reste ferme malgre l\'incomprehension : il cherche les disparus de Bravo et refuse que les survivants deviennent les prochaines victimes.';
const bytes=fs.readFileSync(file),text=bytes.toString('utf8'),set=JSON.parse(text),after=set.cards.find(c=>c.key==='chris1').description;
assert.equal(after.length,173);const original=Buffer.from(text.replace(JSON.stringify(after),JSON.stringify(before)),'utf8');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.writeFileSync(path.join(out,'set.failed-reconstructed.json'),original);
fs.writeFileSync(path.join(out,'set.corrected.json'),bytes);
const evidence=[];
for(const c of set.cards.slice(0,10)){
 const dir=path.join(home,'cards',c.key),dest=path.join(out,c.key);fs.mkdirSync(dest);
 for(const relative of ['preparation.json','profile.json','render/native.json','render/composition.json','render/expected-components.png']){
  const source=path.join(dir,relative),target=path.join(dest,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);evidence.push({path:c.key+'/'+relative,sha256:hash(fs.readFileSync(source))});
 }
}
fs.writeFileSync(path.join(out,'revision.json'),JSON.stringify({reason:'Chris RE1 narrative exceeded unchanged native frame',error:'Photoshop Error 54: Recit hors cadre apres equilibrage',before,after,oldSetReconstructedSha256:hash(original),currentSetSha256:hash(bytes),oldSetStatus:'Reconstructed from exact original narrative; not a retained original byte archive',preparationStatus:'Original preparations were renewed before archive instruction arrived. Retained copies are corrected preparations; do not claim otherwise.',nativeEvidence:'First ten completed native reports retained; no rerender requested. Final unchanged strict verification must pass.',protectedLocksChanged:false,evidence},null,2)+'\n');
console.log(JSON.stringify({archived:true,originalReconstructed:true,evidenceFiles:evidence.length}));
