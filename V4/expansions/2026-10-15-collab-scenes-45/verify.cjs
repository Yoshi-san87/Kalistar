'use strict';
const L=require('../../atelier/lib.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs'),M=require('./model.cjs'),T=require('./typography.cjs');
const {fs,path,read,write,hash,assert,sharp,ROOT}=L,home=__dirname,set=M.validateSet(require('./set.json'));
async function main(){return B.locked(async()=>{
 const policy=read(path.join(home,'verification-policy.json'));
 for(const [file,sha]of Object.entries(policy.inputs))assert.equal(await hash(path.join(ROOT,file)),sha);
 await require('./build.cjs').stable();const results=[];
 for(const c of set.cards){
  const dir=path.join(home,'cards',c.key),p=read(path.join(dir,'profile.json')),native=read(path.join(dir,'render/native.json'));
  M.validateProfile(p,c);const typographyCheck=T.verify(native),proof=await B.verifyNative(dir,p);
  assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
  write(path.join(dir,'verification.json'),{...proof,typographyCheck,inputManifestHash:await hash(path.join(home,'before.json')),
   revisionManifestHash:await hash(path.join(home,'revisions/01-dagga-text/revision.json')),verificationPolicyHash:await hash(path.join(home,'verification-policy.json'))});
  await sharp(path.join(dir,'card.png')).resize({width:300}).png().toFile(path.join(dir,'small.png'));
  results.push({id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});console.log('Verified '+p.id+' '+p.name);
 }
 await require('./build.cjs').game();await require('./build.cjs').stable();write(path.join(home,'native-summary.json'),results);return results;
});}
main().then(r=>console.log('PASS '+r.length+' native cards')).catch(e=>{console.error(e);process.exitCode=1;});
