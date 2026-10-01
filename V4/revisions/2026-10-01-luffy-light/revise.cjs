'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs'),T=require('../../collaborations/nier-pilot-01/typography.cjs');
const {fs,path,read,write,assert,hash,sharp,ROOT}=L,home=__dirname,file=n=>path.join(home,n),id='49800101';
const names=['profile.json','card.png','card.psd','verification.json','illustration.png','creation.json'];
const oldDir=path.join(ROOT,'V4/creations/'+id),work=file('work'),original=file('originals');
const digest=files=>Object.fromEntries(files.map(f=>[path.relative(ROOT,f).replaceAll('\\','/'),fs.readFileSync(f)]).map(([f,b])=>[f,L.crypto.createHash('sha256').update(b).digest('hex')]));
async function stable(){await L.protectedCheck();await R.verifyAssets();}
async function match(hashes){for(const [f,h]of Object.entries(hashes))assert.equal(await hash(path.join(ROOT,f)),h,f);}
async function locked(action){const lock=path.join(L.DATA,'render.lock'),owner=L.crypto.randomUUID();let fd;try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({id:owner,kind:'luffy-light'}));return await action();}finally{if(fd!==undefined){fs.closeSync(fd);if(read(lock).id===owner)fs.unlinkSync(lock);}}}
async function prepare(){return locked(async()=>{
 await stable();assert(!fs.existsSync(file('inputs.json')),'Never overwrite the original snapshot');
 const cat=D.catalogue(),entry=cat.cards.find(c=>c.id===id),p=read(path.join(oldDir,'profile.json'));assert.deepEqual(entry.profile,p);
 const nativeDir=path.dirname(path.join(ROOT,entry.nativeRevision.proof));
 fs.mkdirSync(path.join(original,'render'),{recursive:true});fs.mkdirSync(path.join(work,'render'),{recursive:true});
 async function preserve(src,dst){if(fs.existsSync(dst))assert.equal(await hash(dst),await hash(src),'Existing original differs');else fs.copyFileSync(src,dst,fs.constants.COPYFILE_EXCL);}
 for(const n of names)await preserve(path.join(oldDir,n),path.join(original,n));
 for(const n of ['native.json','composition.json'])await preserve(path.join(nativeDir,'render',n),path.join(original,'render',n));
 if(fs.existsSync(file('before-entry.json')))assert.deepEqual(read(file('before-entry.json')),entry);else write(file('before-entry.json'),entry);
 const elem=D.options().elements.find(e=>e.value==='LUXO'),next={...p,element:'LUXO',magic:[4],barriers:[],defense:[...p.defense.slice(0,5),'retry'],sentry:true,color:elem.color.replace('#',''),hue:elem.hue};
 assert.deepEqual(next.atk,p.atk);assert.deepEqual(next.defense.slice(0,5),p.defense.slice(0,5));
 write(path.join(work,'profile.json'),next);fs.copyFileSync(path.join(original,'illustration.png'),path.join(work,'illustration.png'));
 const donor=D.validate({...Object.fromEntries(D.FIELDS.filter(k=>k in next).map(k=>[k,next[k]])),faction:'Chroma'},{final:true});donor.positions=next.positions;
 const layers=await R.components(donor,{id,positionsText:true});
 layers[0]={...layers[0],input:await sharp(path.join(original,'illustration.png')).resize(R.ART.width,R.ART.height,{fit:'cover'}).png().toBuffer()};
 await require('../../expansions/2026-10-01-one-piece/banner.cjs').replace(layers,next);
 const components=layers.filter(l=>!l.name.startsWith('POSITION SLOT ')),plan={layers:[]};
 for(const [i,l]of components.entries()){const f='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(path.join(work,'render',f));plan.layers.push({file:f,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});}
 write(path.join(work,'render/composition.json'),plan);await sharp(await R.composite(components)).png().toFile(path.join(work,'render/expected-components.png'));
 await sharp(await R.composite(layers)).composite(await T.preview(next,R)).png().toFile(path.join(work,'preview.png'));
 const inputs=['revise.cjs','compose.jsx','render.ps1'].map(file).concat(names.map(n=>path.join(oldDir,n)),names.map(n=>path.join(original,n)),['native.json','composition.json'].map(n=>path.join(original,'render',n)),[path.join(work,'profile.json'),path.join(work,'illustration.png'),path.join(work,'render/composition.json'),path.join(work,'render/expected-components.png')],plan.layers.map(l=>path.join(work,'render',l.file)));
 write(file('inputs.json'),digest(inputs));await stable();return {prepared:id,artworkPreserved:true,numericFacesPreservedExceptRemovedD1:true};
});}
async function render(){return locked(async()=>{await stable();await match(read(file('inputs.json')));assert.equal(process.env.KALISTAR_LUFFY_PS,'2026-10-01');const output=await R.command('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));await match(read(file('inputs.json')));return {output};});}
async function verify(){return locked(async()=>{
 await stable();await match(read(file('inputs.json')));const p=read(path.join(work,'profile.json')),proof=await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(work,p),n=read(path.join(work,'render/native.json')),old=read(path.join(original,'render/native.json'));T.verify(n);
 const before=old.layers.filter(l=>l.kind==='LayerKind.TEXT'&&l.name!=='DEF D1 - valeur'),after=n.layers.filter(l=>l.kind==='LayerKind.TEXT');assert.equal(after.length,before.length);
 for(const a of before){const b=after.find(l=>l.name===a.name);assert(b);for(const f of ['text','font','sizePt','ink','bounds','opacity','blend','visible'])assert.deepEqual(b[f],a[f],a.name+'.'+f);}
 const oldPlan=read(path.join(original,'render/composition.json')),newPlan=read(path.join(work,'render/composition.json'));
 const allowed=new Uint8Array(897*1497);
 const mark=(r,pad=0)=>{const [l,t,rr,bb]=r;for(let y=Math.max(0,Math.floor(t-pad));y<Math.min(1497,Math.ceil(bb+pad));y++)for(let x=Math.max(0,Math.floor(l-pad));x<Math.min(897,Math.ceil(rr+pad));x++)allowed[y*897+x]=1;};
 for(const c of oldPlan.layers.concat(newPlan.layers))if(/^(ATK |DEF D1|CRISTAL |BRANCHES )/.test(c.name))mark([c.left,c.top,c.left+c.width,c.top+c.height],2);
 for(const name of ['JOB','RACE','DEF D1 - valeur']){const l=old.layers.find(l=>l.name===name);mark(l.bounds,3);}
 const a=await sharp(path.join(original,'card.png')).ensureAlpha().raw().toBuffer(),b=await sharp(path.join(work,'card.png')).ensureAlpha().raw().toBuffer();let outside=0,changed=0;
 for(let i=0;i<allowed.length;i++)if(!a.subarray(i*4,i*4+4).equals(b.subarray(i*4,i*4+4))){changed++;if(!allowed[i])outside++;}
 assert.equal(outside,0,'Unexpected pixels outside crystal/ATK backgrounds/DEF D1 and element label colors');
 assert.equal(await hash(path.join(work,'illustration.png')),await hash(path.join(original,'illustration.png')));
 write(path.join(work,'verification.json'),{...proof,typography:true,revision:{outside,changed,allRemainingNativeTextUnchanged:true,artworkPreserved:true}});
 await sharp(path.join(work,'card.png')).resize({width:300}).png().toFile(path.join(work,'small.png'));return {id,outside,changed,barcode:proof.barcode.passed};
});}
async function publish(){return locked(async()=>{
 await stable();await match(read(file('inputs.json')));assert.equal(process.env.KALISTAR_LUFFY_PUBLISH,'2026-10-01');
 const cat=D.catalogue(),entry=cat.cards.find(c=>c.id===id);assert.deepEqual(entry,read(file('before-entry.json')));
 const p=read(path.join(work,'profile.json')),v=read(path.join(work,'verification.json'));assert(v.passed&&v.revision.outside===0);assert.equal(v.profileHash,await hash(path.join(work,'profile.json')));
 for(const n of ['card.png','card.psd'])assert.equal(v.hashes[n],await hash(path.join(work,n)));
 write(file('catalogue-before-publication.json'),cat);
 const originalHashes=Object.fromEntries(names.map(n=>[n,read(file('inputs.json'))['V4/creations/'+id+'/'+n]]));
 for(const n of ['profile.json','card.png','card.psd','verification.json']){const temp=path.join(oldDir,n+'.luffy-next');fs.copyFileSync(path.join(work,n),temp,fs.constants.COPYFILE_EXCL);fs.renameSync(temp,path.join(oldDir,n));}
 const publishedHashes=Object.fromEntries(await Promise.all(['profile.json','card.png','card.psd','verification.json'].map(async n=>[n,await hash(path.join(oldDir,n))])));
 const next={...cat,cards:cat.cards.map(c=>c.id===id?{...c,element:p.element,profile:p,nativeRevision:{id:'2026-10-01-luffy-light',proof:'V4/revisions/2026-10-01-luffy-light/work/verification.json',originalHashes,hashes:publishedHashes,publishedAt:new Date().toISOString()}}:c)};
 write(D.CATALOGUE,next);write(file('published.json'),{id,revision:'2026-10-01-luffy-light',profileHash:v.profileHash,previous:entry.nativeRevision,hashes:v.hashes});return {published:id};
});}
module.exports={prepare,render,verify,publish};if(require.main===module){const action=process.argv[2];assert(Object.hasOwn(module.exports,action));module.exports[action]().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});}
