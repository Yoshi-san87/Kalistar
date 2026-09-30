'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,assert,read,write}=L,home=__dirname;
const hash=f=>L.crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const old=read(path.join(home,'draft02/set.json')),current=read(path.join(home,'set.json'));
const unchanged=[];
for(const c of current.cards.slice(0,17)){
 const prefix='cards/'+c.key,prior=read(path.join(home,'draft02',c.key,'preparation.json')),next=read(path.join(home,prefix,'preparation.json'));
 for(const [f,h] of Object.entries(prior.inputs))if(!f.endsWith('/set.json'))assert.equal(next.inputs[f],h,'Unchanged prepared input '+f);
 assert.deepEqual(read(path.join(home,'draft02',c.key,'profile.json')),read(path.join(home,prefix,'profile.json')));
 assert.equal(hash(path.join(home,'draft02',c.key,'render/native.json')),hash(path.join(home,prefix,'render/native.json')));
 unchanged.push(c.key);
}
const changes=current.cards.filter(c=>c.description!==old.cards.find(o=>o.key===c.key).description).map(c=>({key:c.key,before:old.cards.find(o=>o.key===c.key).description,after:c.description,length:c.description.length}));
write(path.join(home,'draft02/revision.json'),{reason:'Mr X native narrative overflow; shorten remaining eight unpublished narratives',oldSetSha256:hash(path.join(home,'draft02/set.json')),newSetSha256:hash(path.join(home,'set.json')),originalDraftRetained:true,oldPreparationsRetained:true,changes,unchangedCompletedNativeCards:unchanged,unchangedInputsExceptSet:true,protectedLocksChanged:false,strictFinalVerificationRequired:true});
console.log(JSON.stringify({changes:changes.length,unchangedNative:unchanged.length}));
