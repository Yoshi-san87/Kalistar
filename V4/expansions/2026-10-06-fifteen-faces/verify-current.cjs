'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('./build.cjs'),M=require('./model.cjs'),T=require('./accent-typography.cjs');
const legacy=require('../../collaborations/nier-pilot-01/typography.cjs');
const {fs,path,read,write,assert,sharp}=L;
async function stable(){await L.protectedCheck();await R.verifyAssets();B.guard.assertExisting();}
async function main(){
 const lock=path.join(L.DATA,'render.lock'),id=L.crypto.randomUUID();let fd;
 try{
  fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({id,pid:process.pid,kind:M.SET+'-verify'}));
  await stable();const checks=[];
  for(const c of M.validateSet(read(path.join(__dirname,'set.json'))).cards){
   B.guard.preparation(c.key);const out=path.join(__dirname,'cards',c.key),p=read(path.join(out,'profile.json'));
   M.validateProfile(p,c);
   const proof=await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(out,p);
   const n=read(path.join(out,'render/native.json')),typography=T.verify(n);
   if(!typography.accented)legacy.verify(n);
   assert.equal(n.photoshop,'26.11.8');assert(n.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
   write(path.join(out,'verification.json'),{...proof,preparationHash:B.guard.digest(path.join(out,'preparation.json')),typography:true,typographyCheck:typography,verifierHash:B.guard.digest(__filename),typographyVerifierHash:B.guard.digest(path.join(__dirname,'accent-typography.cjs'))});
   await sharp(path.join(out,'card.png')).resize({width:300}).png().toFile(path.join(out,'small.png'));
   checks.push({id:c.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed,nameInkHeight:typography.nameInk[3]-typography.nameInk[1],accented:typography.accented});
  }
  await B.game();await stable();write(path.join(__dirname,'native-checks.json'),checks);console.log(JSON.stringify(checks,null,2));
 }finally{if(fd!==undefined){fs.closeSync(fd);if(read(lock).id===id)fs.unlinkSync(lock);}}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
