'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs'),M=require('./model.cjs');
const {previousEntry}=require('../../revisions/2026-10-09-homme-mystere/compatibility.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,home=__dirname,file=n=>path.join(home,n);
const set=()=>M.validateSet(read(file('set.json'))),card=(key,n='')=>file('cards/'+key+'/'+n);
async function stable(){
 await L.protectedCheck();await R.verifyAssets();const b=read(file('before.json'));
 for(const [f,h]of Object.entries(b.inputs))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen input changed: '+f);
 const now=read(D.CATALOGUE);
 for(const c of b.catalogue.cards)assert.deepEqual(previousEntry(now.cards.find(n=>n.id===c.id)),c,'Existing entry changed: '+c.id);
}
async function render(keys){return B.locked(async()=>{
 await stable();assert(keys.length&&keys.length<=4);assert.equal(new Set(keys).size,keys.length);
 for(const key of keys){assert(set().cards.some(c=>c.key===key));for(const n of ['card.psd','card.png','render/native.json'])assert(!fs.existsSync(card(key,n)),'Preserve output '+key+'/'+n);}
 const request=file('resume-request.json');write(request,{keys});const requestHash=await hash(request);
 const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('resume.ps1')],file('completion-'+keys[0]+'.log'));
 assert.equal(await hash(request),requestHash);await stable();
 write(file('completion-'+keys[0]+'.json'),{keys,inputManifestHash:await hash(file('before.json')),requestHash,result});return result;
});}
async function verify(){return B.locked(async()=>{
 await stable();const checks=[];
 for(const c of set().cards){
  const p=read(card(c.key,'profile.json'));M.validateProfile(p,c);
  const proof=await B.verifyNative(card(c.key),p),native=read(card(c.key,'render/native.json'));
  const typographyCheck=require('../2026-10-06-fifteen-faces/accent-typography.cjs').verify(native);
  if(!typographyCheck.accented)require('../../collaborations/nier-pilot-01/typography.cjs').verify(native);
  assert.equal(native.photoshop,'26.11.8');assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
  write(card(c.key,'verification.json'),{...proof,typographyCheck,inputManifestHash:await hash(file('before.json'))});
  await sharp(card(c.key,'card.png')).resize({width:300}).png().toFile(card(c.key,'small.png'));
  checks.push({id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
 }
 await stable();write(file('native-checks.json'),checks);return checks;
});}
async function publish(){
 await stable();const publisher=require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L,D,model:M,home});
 const result=await publisher.publish();await stable();write(file('published.json'),result);return result;
}
module.exports={stable,render,verify,publish};
if(require.main===module)module.exports[process.argv[2]](process.argv.slice(3)).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
