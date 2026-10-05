'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const B = require('./build.cjs'), M = require('./model.cjs'), T = require('../../collaborations/nier-pilot-01/typography.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT} = L, f = n => path.join(__dirname,n);
const PS = '26.11.8';
async function stable() { await L.protectedCheck(); await R.verifyAssets(); B.guard.assertExisting(); }
async function locked(fn) {
  const file=path.join(L.DATA,'render.lock'),id=L.crypto.randomUUID(); let fd;
  try {fd=fs.openSync(file,'wx');fs.writeFileSync(fd,JSON.stringify({id,pid:process.pid,kind:M.SET+'-runtime-26118'}));return await fn();}
  finally {if(fd!==undefined){fs.closeSync(fd);if(read(file).id===id)fs.unlinkSync(file);}}
}
async function inputs() {
  const proof=read(f('runtime-26118.inputs.json'));
  assert.equal(proof.photoshop,PS);
  for(const [name,h] of Object.entries(proof.hashes)) assert.equal(await hash(path.join(ROOT,name)),h,'Runtime input changed: '+name);
  await stable(); return proof;
}
async function command(action) {
  return R.command('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
    ['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',f('runtime-26118.ps1'),'-Action',action],f('runtime-26118.log'));
}
async function freeze() {
  assert(!fs.existsSync(f('runtime-26118.inputs.json')),'Never replace runtime evidence');
  await stable();
  const references=L.baseline().cards.filter(c=>['momo','taulio','valazar'].includes(c.key)).map(c=>({key:c.key,psd:c.psd,png:c.png}));
  assert.equal(references.length,3);
  const paths=['runtime-26118.cjs','runtime-26118.ps1','calibration-26118.jsx','compose.jsx','dependencies.json'].map(f)
    .concat(references.flatMap(c=>[path.join(ROOT,c.psd),path.join(ROOT,c.png)]));
  const hashes={}; for(const p of paths) hashes[B.guard.relative(p)]=await hash(p);
  write(f('runtime-26118.inputs.json'),{photoshop:PS,references,hashes,reason:'Installed runtime patch update; original 26.11.7 attempt and locks preserved.'});
  fs.mkdirSync(f('runtime-proof'),{recursive:true}); return {references:references.length};
}
async function calibration() {return locked(async()=>{
  const proof=await inputs(); await command('calibration');
  const results=[];
  for(const c of proof.references) {
    const comparison=await L.diff(path.join(ROOT,c.png),f('runtime-proof/'+c.key+'.png'));
    assert.equal(comparison.changed,0,c.key+' runtime pixel regression');
    results.push({key:c.key,comparison});
  }
  await inputs(); write(f('runtime-26118.calibration.json'),{passed:true,photoshop:PS,results});
  return {passed:true,references:results.length,changedPixels:0};
});}
async function render() {return locked(async()=>{
  await inputs(); assert.equal(read(f('runtime-26118.calibration.json')).passed,true);
  for(const c of require('./set.json').cards) B.guard.preparation(c.key);
  const output=await command('compose');
  await inputs(); return {photoshop:PS,output};
});}
async function verify() {return locked(async()=>{
  await inputs(); const checks=[];
  for(const c of M.validateSet(read(f('set.json'))).cards) {
    B.guard.preparation(c.key);
    const out=f('cards/'+c.key),p=read(path.join(out,'profile.json'));M.validateProfile(p,c);
    const proof=await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(out,p);
    const native=read(path.join(out,'render/native.json'));
    assert.equal(native.photoshop,PS); T.verify(native);
    assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
    write(path.join(out,'verification.json'),{...proof,photoshop:PS,typography:true,
      preparationHash:B.guard.digest(path.join(out,'preparation.json')),
      runtimeCalibrationHash:await hash(f('runtime-26118.calibration.json'))});
    await sharp(path.join(out,'card.png')).resize({width:300}).png().toFile(path.join(out,'small.png'));
    checks.push({id:c.id,photoshop:PS,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
  }
  await B.game();await inputs();write(f('native-checks.json'),checks);return checks;
});}
module.exports={freeze,calibration,render,verify};
if(require.main===module){const action=process.argv[2];assert(Object.hasOwn(module.exports,action));module.exports[action]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});}
