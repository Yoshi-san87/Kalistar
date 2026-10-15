'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L,home=__dirname;
const ID='49901717',REV='2026-10-09-fei-long-final',ART='V4/propositions/2026-10-09-street-fighter/images/fei-long-v3.png';
const file=n=>path.join(home,n),work=n=>file('work/'+n),old=n=>file('originals/'+n),prod=n=>path.join(ROOT,'V4/creations',ID,n),cat=path.join(ROOT,'V4/donnees/catalogue.json');
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/'),names=['profile.json','illustration.png','card.psd','card.png','verification.json','creation.json'];
async function hashes(files){const o={};for(const f of files)o[rel(f)]=await hash(f);return o;}
async function match(entries){for(const [f,h]of Object.entries(entries))assert.equal(await hash(path.join(ROOT,f)),h,'Changed input '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
async function prepare(){
 assert(!fs.existsSync(file('before.json')));await stable();const entry=read(cat).cards.find(c=>c.id===ID);assert(entry&&!entry.nativeRevision);
 const source=path.join(ROOT,entry.publicationSource,'cards/fei-long');
 fs.mkdirSync(work('render'),{recursive:true});fs.mkdirSync(old('render'),{recursive:true});
 for(const n of names)fs.copyFileSync(prod(n),old(n),fs.constants.COPYFILE_EXCL);
 for(const n of ['native.json','composition.json'])fs.copyFileSync(path.join(source,'render',n),old('render/'+n),fs.constants.COPYFILE_EXCL);
 write(work('profile.json'),{...entry.profile,artworkSource:ART});fs.copyFileSync(path.join(ROOT,ART),work('illustration.png'),fs.constants.COPYFILE_EXCL);
 const composition=read(path.join(source,'render/composition.json')),layers=[];
 for(const layer of composition.layers){
  const input=layer.name==='ILLUSTRATION - cadrage'?await sharp(work('illustration.png')).resize(R.ART.width,R.ART.height,{fit:'cover',position:'north'}).png().toBuffer():path.join(source,'render',layer.file);
  await sharp(input).png().toFile(work('render/'+layer.file));layers.push({...layer,input:work('render/'+layer.file)});
 }
 write(work('render/composition.json'),composition);await sharp(await R.composite(layers)).png().toFile(work('render/expected-components.png'));
 const inputs=['revise.cjs','compose.jsx','render.ps1'].map(file).concat(path.join(ROOT,ART),work('profile.json'),work('illustration.png'),fs.readdirSync(work('render')).map(n=>work('render/'+n)));
 write(file('before.json'),{entry,inputs:await hashes(inputs),backups:await hashes(names.map(old).concat(old('render/native.json'),old('render/composition.json'))),observed:await hashes(names.map(prod))});return {id:ID};
}
async function guard(){await stable();const b=read(file('before.json'));for(const k of ['inputs','backups','observed'])await match(b[k]);assert.deepEqual(read(cat).cards.find(c=>c.id===ID),b.entry);return b;}
async function render(){return B.locked(async()=>{await guard();assert(!fs.existsSync(work('card.psd')));const out=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));await guard();return out;});}
async function verify(){
 await guard();const p=read(work('profile.json')),previous=read(old('profile.json'));assert.deepEqual({...p,artworkSource:previous.artworkSource},previous);
 const proof=await B.verifyNative(work(''),p),scope=await L.diff(old('card.png'),work('card.png'),[[80,156,817,1077]]);
 assert(scope.changed>0);assert.equal(scope.outside,0,'Only illustration may change');
 const v={...proof,revision:REV,scope,gameplayUnchanged:true,inputManifestHash:await hash(file('before.json'))};write(work('verification.json'),v);
 await sharp(work('card.png')).resize({width:300}).png().toFile(work('small.png'));
 write(file('verified.json'),await hashes(names.filter(n=>n!=='creation.json').map(work).concat(work('render/native.json'),work('render/reopened.png'))));return {id:ID,scope};
}
async function publish(){return B.locked(async()=>{
 const frozen=await guard();await match(read(file('verified.json')));assert(!fs.existsSync(file('published.json')));
 const before=read(cat),next=structuredClone(before),entry=next.cards.find(c=>c.id===ID),meta=read(old('creation.json'));
 entry.profile=read(work('profile.json'));entry.nativeRevision={id:REV,key:'fei-long',proof:rel(work('verification.json')),changedFields:['illustration','artworkSource'],previous:null};meta.nativeRevision=entry.nativeRevision;
 for(const n of names.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(work(n));write(work('creation.json'),meta);
 before.cards.forEach((c,i)=>{if(c.id!==ID)assert.deepEqual(c,next.cards[i]);});
 fs.copyFileSync(cat,file('catalogue-before-publication.json'),fs.constants.COPYFILE_EXCL);write(file('publication-catalogue.json'),next);
 const writes=names.map(n=>({stage:work(n),target:prod(n),backup:old(n),before:frozen.observed[rel(prod(n))]}));writes.push({stage:file('publication-catalogue.json'),target:cat,backup:file('catalogue-before-publication.json'),before:await hash(cat)});
 for(const w of writes)w.after=await hash(w.stage);const done=[];write(file('transaction.json'),{state:'publishing',writes});
 try{for(const w of writes){assert.equal(await hash(w.target),w.before);fs.copyFileSync(w.stage,w.target);done.push(w);assert.equal(await hash(w.target),w.after);}
 await stable();await match(frozen.inputs);await match(frozen.backups);write(file('published.json'),{id:ID,revision:REV,gameplayUnchanged:true});write(file('transaction.json'),{state:'published',writes});return {id:ID};
 }catch(e){for(const w of done.reverse()){assert.equal(await hash(w.target),w.after);fs.copyFileSync(w.backup,w.target);}write(file('transaction.json'),{state:'rolled-back',error:String(e)});throw e;}
});}
module.exports={prepare,render,verify,publish};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
