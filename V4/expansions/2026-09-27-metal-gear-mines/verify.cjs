'use strict';
const assert=require('node:assert/strict');
const L=require('../../atelier/lib.cjs'), D=require('../../atelier/designer-core.cjs');
const typography=require('./typography-mgs.cjs'), M=require('./model.cjs');
async function main(args=process.argv.slice(2)) {
  assert.equal(args.length,0,'Verification finale integrale uniquement.');
  const set=M.validateSet(L.read(L.path.join(__dirname,'set.json')));
  const rulesHash=await L.hash(L.path.join(__dirname,'typography-mgs.cjs'));
  const result=await require('./build.cjs').createBuilder({typography}).verify();
  const guard=require('./preservation.cjs').createGuard(L,D,__dirname);
  for (const spec of set.cards) {
    const dir=L.path.join(__dirname,'cards',spec.key), native=L.read(L.path.join(dir,'render/native.json'));
    typography.verify(native);
    const lines=native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r');
    assert.ok(lines.length<=4 && lines.every(line=>!/^\s*[;:!?.,]/.test(line)), 'Ponctuation orpheline : '+spec.key);
    const file=L.path.join(dir,'verification.json'), proof=L.read(file);
    proof.typographyAudit={passed:true,rulesHash,orphanPunctuation:false,
      ...(spec.key==='liquid-snake'?{exception:'37 px visible ink for the Q descender at unchanged Times New Roman 10 pt; exact approved [303,111,596,148] geometry.',sharedVerifierUnchanged:true}:{})};
    L.write(file,proof);
  }
  assert.equal(await L.hash(L.path.join(__dirname,'typography-mgs.cjs')),rulesHash);
  guard.publication();await L.protectedCheck();
  return {...result,typography:true,orphanPunctuation:false,localTypographyRulesHash:rulesHash};
}
module.exports={main};
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
